/**
 * Sincronização dos dados locais com a nuvem, isolados por empresa (Etapa 02).
 *
 * O aplicativo continua operando sobre o estado local síncrono; esta camada
 * apenas carrega o conteúdo da empresa autenticada e devolve as alterações
 * para o backend, protegidas por RLS.
 *
 * Nada é apagado do dispositivo nesta etapa: a importação dos dados locais
 * só acontece com confirmação explícita do usuário e guarda uma cópia.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import type { Json } from "@/integrations/supabase/types";
import { iniciarNumeracao, pararNumeracao, proximoNumero } from "@/data/numbering";
import {
  contarRelacional,
  resetRelacional,
  sincronizarRelacional,
} from "@/data/remote/relational-sync";
import { compararSnapshots, lerRelacional, type Divergencia } from "@/data/remote/relational-read";
import {
  avaliarFaseC,
  dualWriteComprovado,
  normalizarFase,
  promoverParaC,
  reverterParaB,
  type Fase,
} from "@/data/remote/phase";
import {
  ensureHydrated,
  getDBSnapshot,
  replaceDB,
  resetDB,
  setNumeroProvider,
  setPersistListener,
  setUsuarioAtual,
  type DB,
} from "@/lib/store";

const LOCAL_KEY = "gep_db_v3";
const BACKUP_KEY = "gep_db_v3_backup";
const MIGRADO_KEY = "gep_db_migrado";
const ORG_MARK_KEY = "gep_db_org";

let currentOrg: string | null = null;
let faseAtual: Fase = "A";
let dualWriteValidado = false;
let pending: DB | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let flushBound = false;

// Shared generation is checked synchronously, even before another tab receives
// its storage/auth event. No tokens or private payloads are stored in this marker.
const SESSION_KEY = "gep_sync_session_v1";
type SessionMark = {
  generation: string;
  identity: string | null;
  blocked: string | null;
  orgId: string | null;
};
let sessionMark: SessionMark | null = null;
let sessionUser: Session["user"] | null = null;
let controller = new AbortController();
let sessionWatching = false;
let sessionRevision = 0;
let scopeOrg: string | null = null;
let clearQueries: (() => void) | undefined;

export class SessionChangedError extends Error {
  constructor() {
    super("A sessão mudou; a operação anterior foi descartada.");
    this.name = "SessionChangedError";
  }
}

export type SyncScope = {
  signal: AbortSignal;
  userId: string;
  orgId: string | null;
  isCurrent: () => boolean;
  assertCurrent: () => void;
};

function readSessionMark(): SessionMark | null {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as SessionMark) : null;
}

function clearSyncState(clearStore: boolean) {
  controller.abort();
  controller = new AbortController();
  sessionRevision++;
  if (timer) clearTimeout(timer);
  timer = null;
  pending = null;
  currentOrg = null;
  scopeOrg = null;
  setPersistListener(null);
  setNumeroProvider(null);
  pararNumeracao();
  resetRelacional();
  setUsuarioAtual(null);
  faseAtual = "A";
  dualWriteValidado = false;
  origemLeitura = "bloco_json";
  clearQueries?.();
  if (clearStore) resetDB();
}

function adoptSessionMark(next: SessionMark) {
  if (sessionMark?.generation === next.generation) return;
  const hadSession = sessionMark !== null;
  sessionMark = next;
  sessionUser = null;
  // Preserve genuinely unmigrated local data only on the first authenticated
  // initialization. Logout and every subsequent identity change clear the store.
  clearSyncState(hadSession || next.identity === null);
  scopeOrg = next.orgId;
}

function sessionIdentity(session: Session): string {
  // This labels a lifecycle, not an authorization decision. RLS remains server-side.
  const payload = JSON.parse(
    atob(session.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
  );
  return `${session.user.id}:${payload.session_id ?? payload.iat}`;
}

function acceptSession(session: Session | null, allowChange = false) {
  const shared = readSessionMark();
  const identity = session ? sessionIdentity(session) : null;
  if (identity && shared?.blocked === identity) {
    adoptSessionMark(shared);
    return;
  }
  if (shared && shared.identity !== identity && !allowChange) {
    adoptSessionMark(shared);
    return;
  }
  let next = shared;
  if (!next || next.identity !== identity) {
    next = {
      generation: crypto.randomUUID(),
      identity,
      orgId: null,
      blocked: identity ? null : (shared?.identity ?? shared?.blocked ?? null),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  }
  adoptSessionMark(next);
  sessionUser = session?.user ?? null;
}

/** Install before any loader awaits; the React auth effect mounts too late. */
export function watchSessionIsolation(onClearQueries?: () => void) {
  if (onClearQueries) clearQueries = onClearQueries;
  if (sessionWatching || typeof window === "undefined") return;
  sessionWatching = true;
  window.addEventListener("storage", (event) => {
    if (event.key !== SESSION_KEY && event.key !== null) return;
    const next = readSessionMark();
    if (next) adoptSessionMark(next);
    else stopOrgSync();
  });
  supabase.auth.onAuthStateChange((event, session) => {
    // Synchronous only: never acquire the auth lock from this callback.
    acceptSession(session, event === "SIGNED_IN" || event === "SIGNED_OUT");
  });
}

export async function getIsolatedSession() {
  watchSessionIsolation();
  const revision = sessionRevision;
  const shared = localStorage.getItem(SESSION_KEY);
  const { data } = await supabase.auth.getSession();
  if (revision !== sessionRevision || shared !== localStorage.getItem(SESSION_KEY))
    throw new SessionChangedError();
  acceptSession(data.session);
  // An active shared identity with no matching local user is a transition,
  // not proof of logout. Never let that transient null redirect a newer login.
  if (sessionMark?.identity && !sessionUser) throw new SessionChangedError();
  const signal = controller.signal;
  const generation = sessionMark?.generation;
  const user = sessionUser;
  return {
    user,
    signal,
    assertCurrent() {
      if (
        signal.aborted ||
        generation !== readSessionMark()?.generation ||
        generation !== sessionMark?.generation ||
        user?.id !== sessionUser?.id
      )
        throw new SessionChangedError();
    },
  };
}

export async function getIsolatedUser() {
  return (await getIsolatedSession()).user;
}

export function captureSyncScope(orgId = scopeOrg): SyncScope {
  const signal = controller.signal;
  const generation = sessionMark?.generation;
  const userId = sessionUser?.id;
  const isCurrent = () => {
    try {
      return (
        !!userId &&
        !signal.aborted &&
        generation === readSessionMark()?.generation &&
        generation === sessionMark?.generation &&
        userId === sessionUser?.id &&
        orgId === scopeOrg
      );
    } catch {
      return false; // Fail closed when the cross-tab generation cannot be checked.
    }
  };
  const scope = {
    signal,
    userId: userId ?? "",
    orgId,
    isCurrent,
    assertCurrent: () => {
      if (!isCurrent()) throw new SessionChangedError();
    },
  };
  scope.assertCurrent();
  return scope;
}

function bindOrganization(orgId: string | null, scope: SyncScope) {
  scope.assertCurrent();
  if (scopeOrg !== orgId) {
    const user = sessionUser;
    const next = { ...sessionMark!, generation: crypto.randomUUID(), orgId };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    // First organization binding preserves only unassigned, unmigrated data.
    const preserveLocal = scopeOrg === null && !localStorage.getItem(ORG_MARK_KEY);
    sessionMark = next;
    clearSyncState(!preserveLocal);
    scopeOrg = orgId;
    sessionUser = user;
  }
}

function runInBackground(job: () => Promise<unknown>) {
  void job().catch((error) => {
    if (!(error instanceof SessionChangedError))
      console.warn("Falha na sincronização da sessão.", error);
  });
}

export type OrgContext = {
  scope?: SyncScope;
  orgId: string | null;
  userId: string | null;
  nome: string | null;
  email: string | null;
  role: "owner" | "admin" | "member" | null;
};

export type ResumoLocal = {
  clientes: number;
  servicos: number;
  orcamentos: number;
  agendamentos: number;
  lancamentos: number;
  relatorios: number;
  total: number;
};

export async function loadOrgContext(): Promise<OrgContext> {
  const scope = captureSyncScope();
  const { data: userData } = await supabase.auth.getUser();
  scope.assertCurrent();
  const user = userData.user;
  if (user && user.id !== scope.userId) throw new SessionChangedError();
  if (!user) return { orgId: null, userId: null, nome: null, email: null, role: null };

  const [{ data: membro }, { data: profile }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .order("created_at")
      .limit(1)
      .abortSignal(scope.signal)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("organization_id, nome, email")
      .eq("user_id", user.id)
      .abortSignal(scope.signal)
      .maybeSingle(),
  ]);

  scope.assertCurrent();
  bindOrganization(membro?.organization_id ?? profile?.organization_id ?? null, scope);
  const nome = profile?.nome ?? (user.user_metadata?.["name"] as string | undefined) ?? null;
  const email = profile?.email ?? user.email ?? null;
  // A auditoria passa a registrar quem está usando a conta.
  setUsuarioAtual(nome ?? email);

  return {
    scope: captureSyncScope(),
    orgId: membro?.organization_id ?? profile?.organization_id ?? null,
    userId: user.id,
    nome,
    email,
    role: (membro?.role as OrgContext["role"]) ?? null,
  };
}

async function push(orgId: string, db: DB, scope = captureSyncScope(orgId)) {
  scope.assertCurrent();
  const { data } = await supabase.auth.getUser();
  scope.assertCurrent();
  const userId = data.user?.id ?? null;
  if (userId !== scope.userId) throw new SessionChangedError();
  let blocoOk = false;
  // Fase C: o bloco JSON fica congelado como último backup e não recebe mais
  // gravações. Nas fases A e B ele continua sendo atualizado normalmente.
  if (faseAtual !== "C") {
    const { error } = await supabase
      .from("app_data")
      .upsert(
        {
          organization_id: orgId,
          payload: db as unknown as Json,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id" },
      )
      .abortSignal(scope.signal);
    scope.assertCurrent();
    if (error) console.warn("Não foi possível salvar na nuvem.", error.message);
    blocoOk = !error;
  }
  // Espelho nas tabelas próprias.
  await sincronizarRelacional(orgId, db, userId, scope);
  scope.assertCurrent();
  if (blocoOk && faseAtual === "B") dualWriteValidado = true;
}

function scheduleSave(db: DB, scope: SyncScope) {
  if (!currentOrg || !scope.isCurrent()) return;
  pending = db;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => runInBackground(() => flush()), 1200);
}

export async function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const org = currentOrg;
  const data = pending;
  pending = null;
  if (org && data) await push(org, data);
}

function bindFlushHandlers() {
  if (flushBound || typeof window === "undefined") return;
  flushBound = true;
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") runInBackground(() => flush());
  });
  window.addEventListener("pagehide", () => runInBackground(() => flush()));
}

/* ---------- Migração dos dados locais ---------- */

function lerLocal(): Partial<DB> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Partial<DB>) : null;
  } catch {
    return null;
  }
}

function contar(db: Partial<DB> | null): ResumoLocal {
  const n = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  const r = {
    clientes: n(db?.clientes),
    servicos: n(db?.servicos),
    orcamentos: n(db?.orcamentos),
    agendamentos: n(db?.agendamentos),
    lancamentos: n(db?.lancamentos),
    relatorios: n(db?.relatorios),
    total: 0,
  };
  r.total = r.clientes + r.servicos + r.orcamentos + r.agendamentos + r.lancamentos + r.relatorios;
  return r;
}

/** Resumo do que existe neste dispositivo e ainda não foi enviado. */
export function resumoLocal(): ResumoLocal {
  return contar(lerLocal());
}

function marcaMigracao(): { orgId: string; em: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(MIGRADO_KEY);
    return raw ? (JSON.parse(raw) as { orgId: string; em: string }) : null;
  } catch {
    return null;
  }
}

function registrarMarca(orgId: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw && !localStorage.getItem(BACKUP_KEY)) localStorage.setItem(BACKUP_KEY, raw);
    localStorage.setItem(MIGRADO_KEY, JSON.stringify({ orgId, em: new Date().toISOString() }));
    localStorage.setItem(ORG_MARK_KEY, orgId);
  } catch {
    // armazenamento indisponível
  }
}

/** Envia os dados deste dispositivo para a empresa e passa a sincronizar. */
export async function confirmarMigracao(orgId: string) {
  const scope = captureSyncScope(orgId);
  const local = lerLocal();
  registrarMarca(orgId);
  scope.assertCurrent();
  if (local) replaceDB(local);
  await ligarSync(orgId, getDBSnapshot());
  scope.assertCurrent();
}

/** Começa a empresa vazia, preservando o conteúdo do dispositivo. */
export async function descartarMigracao(orgId: string) {
  const scope = captureSyncScope(orgId);
  registrarMarca(orgId);
  resetDB();
  await ligarSync(orgId, getDBSnapshot());
  scope.assertCurrent();
}

async function ligarSync(orgId: string, db: DB) {
  const scope = captureSyncScope(orgId);
  currentOrg = orgId;
  await push(orgId, db, scope);
  scope.assertCurrent();
  await iniciarNumeracao(
    {
      orcamento: db.proximoOrcamento ?? 1,
      relatorio: db.proximoRelatorio ?? 1,
    },
    scope,
  );
  scope.assertCurrent();
  setNumeroProvider(proximoNumero);
  scope.assertCurrent();
  setPersistListener((db) => scheduleSave(db, scope));
  bindFlushHandlers();
}

/* ---------- Origem da leitura (Etapa 03 — Fase B) ---------- */

/** Como o estado desta empresa foi carregado na sessão atual. */
export type OrigemLeitura = "relacional" | "bloco_json";

let origemLeitura: OrigemLeitura = "bloco_json";

export function getOrigemLeitura(): OrigemLeitura {
  return origemLeitura;
}

async function lerVersaoDados(orgId: string, scope: SyncScope): Promise<Fase> {
  scope.assertCurrent();
  const { data, error } = await supabase
    .from("organization_settings")
    .select("data_version")
    .eq("organization_id", orgId)
    .abortSignal(scope.signal)
    .maybeSingle();
  scope.assertCurrent();
  if (error) return "A";
  return normalizarFase(data?.data_version);
}

/**
 * Conferência antes de virar a chave: só marca a empresa como Fase B quando o
 * estado reconstruído das tabelas bate com o bloco JSON.
 */
async function avaliarPromocao(orgId: string, payload: Partial<DB>, scope: SyncScope) {
  scope.assertCurrent();
  try {
    const { db } = await lerRelacional(orgId);
    scope.assertCurrent();
    const divergencias = compararSnapshots(db, payload);
    if (divergencias.length) {
      console.warn("Leitura relacional ainda divergente; mantendo o bloco JSON.", divergencias);
      return { promovido: false, divergencias };
    }
    const { error } = await supabase
      .from("organization_settings")
      .update({ data_version: "B" })
      .eq("organization_id", orgId)
      .abortSignal(scope.signal);
    scope.assertCurrent();
    if (error) {
      console.warn("Não foi possível registrar a nova forma de leitura.", error.message);
      return { promovido: false, divergencias };
    }
    return { promovido: true, divergencias };
  } catch (erro) {
    scope.assertCurrent();
    console.warn("Conferência da leitura relacional falhou; mantendo o bloco JSON.", erro);
    return { promovido: false, divergencias: [] as Divergencia[] };
  }
}

/**
 * Tenta montar o estado a partir das tabelas próprias.
 * Devolve null quando a leitura falha ou fica visivelmente incompleta perto do
 * bloco JSON — nesse caso quem chama usa o bloco JSON como alternativa.
 */
async function carregarRelacional(
  orgId: string,
  payload: Partial<DB> | null,
  scope: SyncScope,
): Promise<Partial<DB> | null> {
  scope.assertCurrent();
  try {
    const { db } = await lerRelacional(orgId);
    scope.assertCurrent();
    if (payload && Object.keys(payload).length > 0) {
      const divergencias = compararSnapshots(db, payload);
      if (divergencias.length) {
        console.warn(
          "Dados das tabelas diferem do bloco de segurança; usando o bloco de segurança.",
          divergencias,
        );
        return null;
      }
    }
    return db;
  } catch (erro) {
    scope.assertCurrent();
    console.warn("Falha ao carregar os dados das tabelas; usando o bloco de segurança.", erro);
    return null;
  }
}

function ativarSync(orgId: string, scope: SyncScope) {
  scope.assertCurrent();
  currentOrg = orgId;
  setNumeroProvider(proximoNumero);
  scope.assertCurrent();
  setPersistListener((db) => scheduleSave(db, scope));
  bindFlushHandlers();
  if (typeof window !== "undefined") localStorage.setItem(ORG_MARK_KEY, orgId);
}

/* ---------- Entrada principal ---------- */

export type SyncResult = { status: "pronto" } | { status: "migracao_pendente" };

/** Carrega os dados da empresa e passa a sincronizar as alterações. */
export async function initOrgSync(orgId: string): Promise<SyncResult> {
  const scope = captureSyncScope(orgId);
  if (currentOrg === orgId) return { status: "pronto" };
  ensureHydrated();

  const [{ data, error }, versao] = await Promise.all([
    supabase
      .from("app_data")
      .select("payload")
      .eq("organization_id", orgId)
      .abortSignal(scope.signal)
      .maybeSingle(),
    lerVersaoDados(orgId, scope),
  ]);

  scope.assertCurrent();
  if (error) console.warn("Não foi possível carregar os dados da nuvem.", error.message);

  const payload = (data?.payload ?? null) as Partial<DB> | null;
  const temPayload = !!payload && Object.keys(payload).length > 0;

  // A fase vale para esta sessão; a validação de gravação dupla recomeça a cada
  // troca de empresa.
  faseAtual = versao;
  dualWriteValidado = false;
  origemLeitura = "bloco_json";

  // Fases B e C: o estado vem das tabelas próprias.
  let relacional: Partial<DB> | null = null;
  if (versao === "B") {
    // Em B o bloco JSON ainda é espelho fiel, então serve de conferência.
    relacional = await carregarRelacional(orgId, payload, scope);
    scope.assertCurrent();
  } else if (versao === "C") {
    // Em C o bloco JSON está congelado: não serve de comparação, apenas de
    // recuperação caso a leitura das tabelas falhe.
    relacional = await carregarRelacional(orgId, null, scope);
    scope.assertCurrent();
    if (!relacional) {
      console.warn("Leitura das tabelas falhou na fase C; voltando para a gravação dupla.");
      const { revertido } = await reverterParaB(orgId);
      scope.assertCurrent();
      faseAtual = revertido ? "B" : "C";
    }
  }

  if (relacional) {
    origemLeitura = "relacional";
    scope.assertCurrent();
    replaceDB(relacional);
    ativarSync(orgId, scope);
    await iniciarNumeracao(
      {
        orcamento: getDBSnapshot().proximoOrcamento ?? 1,
        relatorio: getDBSnapshot().proximoRelatorio ?? 1,
      },
      scope,
    );
    scope.assertCurrent();
    // Em B mantém o bloco JSON espelhado; em C só as tabelas são atualizadas.
    runInBackground(async () => {
      const marcoISO = new Date().toISOString();
      await flushImediato(orgId, scope);
      scope.assertCurrent();
      if (faseAtual === "B") await avaliarPromocaoC(orgId, marcoISO, scope);
    });
    return { status: "pronto" };
  }

  // A nuvem sempre vence quando já existe conteúdo da empresa.
  if (temPayload) {
    scope.assertCurrent();
    replaceDB(payload);
    ativarSync(orgId, scope);
    await iniciarNumeracao(
      {
        orcamento: getDBSnapshot().proximoOrcamento ?? 1,
        relatorio: getDBSnapshot().proximoRelatorio ?? 1,
      },
      scope,
    );
    scope.assertCurrent();
    // Cópia inicial/atualização das tabelas próprias (idempotente) e, quando
    // tudo confere, passagem para a leitura relacional na próxima entrada.
    runInBackground(async () => {
      await backfillRelacional(orgId);
      scope.assertCurrent();
      if (versao === "A") await avaliarPromocao(orgId, getDBSnapshot(), scope);
    });
    return { status: "pronto" };
  }

  const marca = marcaMigracao();
  const resumo = resumoLocal();

  // Dispositivo já migrado para outra empresa: começa limpo, sem misturar contas.
  if (marca && marca.orgId !== orgId) {
    await descartarMigracao(orgId);
    scope.assertCurrent();
    return { status: "pronto" };
  }

  // Nada relevante no dispositivo: começa vazio.
  if (resumo.total === 0) {
    await descartarMigracao(orgId);
    scope.assertCurrent();
    return { status: "pronto" };
  }

  // Existe conteúdo local ainda não enviado: exige confirmação do usuário.
  if (!marca) return { status: "migracao_pendente" };

  await confirmarMigracao(orgId);
  scope.assertCurrent();
  return { status: "pronto" };
}

async function flushImediato(orgId: string, scope: SyncScope) {
  scope.assertCurrent();
  await push(orgId, getDBSnapshot(), scope);
  scope.assertCurrent();
}

/** Bloco JSON recém-lido, usado como prova objetiva da gravação dupla. */
async function lerBlocoRemoto(orgId: string, scope: SyncScope) {
  scope.assertCurrent();
  const { data, error } = await supabase
    .from("app_data")
    .select("payload, updated_at")
    .eq("organization_id", orgId)
    .abortSignal(scope.signal)
    .maybeSingle();
  scope.assertCurrent();
  if (error || !data) return null;
  return {
    payload: (data.payload ?? {}) as Partial<DB>,
    updatedAt: (data.updated_at as string | null) ?? null,
  };
}

/**
 * Avaliação conservadora da virada B -> C.
 * A conferência usa o bloco JSON lido logo depois da gravação desta sessão, e
 * não a cópia carregada na entrada: assim a gravação dupla fica comprovada por
 * um fato guardado no banco, e não por uma marca que só existia na memória.
 */
async function avaliarPromocaoC(orgId: string, marcoISO: string, scope: SyncScope) {
  scope.assertCurrent();
  let leituraRelacionalOk = false;
  let semDivergencias = false;
  let dualWriteObjetivo = false;
  try {
    const { db } = await lerRelacional(orgId);
    scope.assertCurrent();
    leituraRelacionalOk = true;
    const remoto = await lerBlocoRemoto(orgId, scope);
    scope.assertCurrent();
    const base = remoto && Object.keys(remoto.payload).length > 0 ? remoto.payload : null;
    semDivergencias = !!base && compararSnapshots(db, base).length === 0;
    dualWriteObjetivo = dualWriteComprovado({
      marcoISO,
      blocoAtualizadoEm: remoto?.updatedAt ?? null,
      semDivergencias,
    });
  } catch (erro) {
    scope.assertCurrent();
    console.warn("Conferência para a fase C não pôde ser concluída.", erro);
  }

  scope.assertCurrent();
  const resultado = await promoverParaC(orgId, {
    fase: faseAtual,
    leituraRelacionalOk,
    semDivergencias,
    sessaoRealRelacional: origemLeitura === "relacional",
    dualWriteValidado: dualWriteValidado || dualWriteObjetivo,
  });
  scope.assertCurrent();
  if (resultado.promovido) faseAtual = "C";
  else if (resultado.motivos.length) {
    console.info("Empresa mantida na gravação dupla.", resultado.motivos);
  }
  return resultado;
}

/** Volta a empresa para a gravação dupla e atualiza o bloco de segurança. */
export async function reverterFaseC(orgId: string) {
  const scope = captureSyncScope(orgId);
  const { revertido, motivo } = await reverterParaB(orgId);
  scope.assertCurrent();
  if (!revertido) return { revertido, motivo };
  faseAtual = "B";
  dualWriteValidado = false;
  // Bloco JSON volta a receber o estado atual imediatamente.
  await push(orgId, getDBSnapshot(), scope);
  scope.assertCurrent();
  return { revertido: true };
}

/** Fase registrada para a empresa carregada nesta sessão. */
export function getFaseAtual(): Fase {
  return faseAtual;
}

/** Avaliação da virada B -> C sem gravar nada. */
export function avaliarFaseAtual(cond: { leituraRelacionalOk: boolean; semDivergencias: boolean }) {
  return avaliarFaseC({
    fase: faseAtual,
    leituraRelacionalOk: cond.leituraRelacionalOk,
    semDivergencias: cond.semDivergencias,
    sessaoRealRelacional: origemLeitura === "relacional",
    dualWriteValidado,
  });
}

/**
 * Cópia inicial do bloco JSON para as tabelas próprias.
 * Pode ser executada quantas vezes for necessário: nada é duplicado.
 */
export async function backfillRelacional(orgId: string) {
  const scope = captureSyncScope(orgId);
  const { data } = await supabase.auth.getUser();
  scope.assertCurrent();
  if (data.user?.id !== scope.userId) throw new SessionChangedError();
  resetRelacional();
  await sincronizarRelacional(orgId, getDBSnapshot(), data.user?.id ?? null, scope);
  scope.assertCurrent();
  const counts = await contarRelacional(orgId, scope);
  scope.assertCurrent();
  return counts;
}

/** Conferência manual: compara tabelas e bloco JSON sem alterar nada. */
export async function conferirRelacional(orgId: string) {
  const scope = captureSyncScope(orgId);
  const { data } = await supabase
    .from("app_data")
    .select("payload")
    .eq("organization_id", orgId)
    .abortSignal(scope.signal)
    .maybeSingle();
  scope.assertCurrent();
  const { db, contagens } = await lerRelacional(orgId);
  scope.assertCurrent();
  return {
    contagens,
    divergencias: compararSnapshots(db, (data?.payload ?? {}) as Partial<DB>),
  };
}

/** Invalidate before ANY logout await, including failed/offline sign-out. */
export function stopOrgSync() {
  const shared = readSessionMark();
  const next: SessionMark = {
    generation: crypto.randomUUID(),
    identity: null,
    orgId: null,
    blocked: shared?.identity ?? shared?.blocked ?? null,
  };
  // Abort locally even if storage is unavailable. No pending data is flushed
  // under a potentially different identity during logout.
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  } finally {
    adoptSessionMark(next);
  }
}
