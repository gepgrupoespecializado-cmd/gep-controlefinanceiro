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
import type { Json } from "@/integrations/supabase/types";
import { iniciarNumeracao, pararNumeracao, proximoNumero } from "@/data/numbering";
import {
  contarRelacional,
  resetRelacional,
  sincronizarRelacional,
} from "@/data/remote/relational-sync";
import {
  compararSnapshots,
  lerRelacional,
  type Divergencia,
} from "@/data/remote/relational-read";
import {
  avaliarFaseC,
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

export type OrgContext = {
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
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { orgId: null, userId: null, nome: null, email: null, role: null };

  const [{ data: membro }, { data: profile }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .order("created_at")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("organization_id, nome, email")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const nome = profile?.nome ?? (user.user_metadata?.["name"] as string | undefined) ?? null;
  const email = profile?.email ?? user.email ?? null;
  // A auditoria passa a registrar quem está usando a conta.
  setUsuarioAtual(nome ?? email);

  return {
    orgId: membro?.organization_id ?? profile?.organization_id ?? null,
    userId: user.id,
    nome,
    email,
    role: (membro?.role as OrgContext["role"]) ?? null,
  };
}

async function push(orgId: string, db: DB) {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id ?? null;
  let blocoOk = false;
  // Fase C: o bloco JSON fica congelado como último backup e não recebe mais
  // gravações. Nas fases A e B ele continua sendo atualizado normalmente.
  if (faseAtual !== "C") {
    const { error } = await supabase.from("app_data").upsert(
      {
        organization_id: orgId,
        payload: db as unknown as Json,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" },
    );
    if (error) console.warn("Não foi possível salvar na nuvem.", error.message);
    blocoOk = !error;
  }
  // Espelho nas tabelas próprias.
  await sincronizarRelacional(orgId, db, userId);
  if (blocoOk && faseAtual === "B") dualWriteValidado = true;
}

function scheduleSave(db: DB) {
  if (!currentOrg) return;
  pending = db;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), 1200);
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
    if (document.visibilityState === "hidden") void flush();
  });
  window.addEventListener("pagehide", () => void flush());
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
  const local = lerLocal();
  registrarMarca(orgId);
  if (local) replaceDB(local);
  await ligarSync(orgId, getDBSnapshot());
}

/** Começa a empresa vazia, preservando o conteúdo do dispositivo. */
export async function descartarMigracao(orgId: string) {
  registrarMarca(orgId);
  resetDB();
  await ligarSync(orgId, getDBSnapshot());
}

async function ligarSync(orgId: string, db: DB) {
  currentOrg = orgId;
  await push(orgId, db);
  await iniciarNumeracao({
    orcamento: db.proximoOrcamento ?? 1,
    relatorio: db.proximoRelatorio ?? 1,
  });
  setNumeroProvider(proximoNumero);
  setPersistListener(scheduleSave);
  bindFlushHandlers();
}

/* ---------- Origem da leitura (Etapa 03 — Fase B) ---------- */

/** Como o estado desta empresa foi carregado na sessão atual. */
export type OrigemLeitura = "relacional" | "bloco_json";

let origemLeitura: OrigemLeitura = "bloco_json";

export function getOrigemLeitura(): OrigemLeitura {
  return origemLeitura;
}

async function lerVersaoDados(orgId: string): Promise<Fase> {
  const { data, error } = await supabase
    .from("organization_settings")
    .select("data_version")
    .eq("organization_id", orgId)
    .maybeSingle();
  if (error) return "A";
  return normalizarFase(data?.data_version);
}

/**
 * Conferência antes de virar a chave: só marca a empresa como Fase B quando o
 * estado reconstruído das tabelas bate com o bloco JSON.
 */
async function avaliarPromocao(orgId: string, payload: Partial<DB>) {
  try {
    const { db } = await lerRelacional(orgId);
    const divergencias = compararSnapshots(db, payload);
    if (divergencias.length) {
      console.warn("Leitura relacional ainda divergente; mantendo o bloco JSON.", divergencias);
      return { promovido: false, divergencias };
    }
    const { error } = await supabase
      .from("organization_settings")
      .update({ data_version: "B" })
      .eq("organization_id", orgId);
    if (error) {
      console.warn("Não foi possível registrar a nova forma de leitura.", error.message);
      return { promovido: false, divergencias };
    }
    return { promovido: true, divergencias };
  } catch (erro) {
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
): Promise<Partial<DB> | null> {
  try {
    const { db } = await lerRelacional(orgId);
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
    console.warn("Falha ao carregar os dados das tabelas; usando o bloco de segurança.", erro);
    return null;
  }
}

function ativarSync(orgId: string) {
  currentOrg = orgId;
  setNumeroProvider(proximoNumero);
  setPersistListener(scheduleSave);
  bindFlushHandlers();
  if (typeof window !== "undefined") localStorage.setItem(ORG_MARK_KEY, orgId);
}

/* ---------- Entrada principal ---------- */

export type SyncResult = { status: "pronto" } | { status: "migracao_pendente" };

/** Carrega os dados da empresa e passa a sincronizar as alterações. */
export async function initOrgSync(orgId: string): Promise<SyncResult> {
  if (currentOrg === orgId) return { status: "pronto" };
  ensureHydrated();

  const [{ data, error }, versao] = await Promise.all([
    supabase.from("app_data").select("payload").eq("organization_id", orgId).maybeSingle(),
    lerVersaoDados(orgId),
  ]);

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
    relacional = await carregarRelacional(orgId, payload);
  } else if (versao === "C") {
    // Em C o bloco JSON está congelado: não serve de comparação, apenas de
    // recuperação caso a leitura das tabelas falhe.
    relacional = await carregarRelacional(orgId, null);
    if (!relacional) {
      console.warn("Leitura das tabelas falhou na fase C; voltando para a gravação dupla.");
      const { revertido } = await reverterParaB(orgId);
      faseAtual = revertido ? "B" : "C";
    }
  }

  if (relacional) {
    origemLeitura = "relacional";
    replaceDB(relacional);
    ativarSync(orgId);
    await iniciarNumeracao({
      orcamento: getDBSnapshot().proximoOrcamento ?? 1,
      relatorio: getDBSnapshot().proximoRelatorio ?? 1,
    });
    // Em B mantém o bloco JSON espelhado; em C só as tabelas são atualizadas.
    void (async () => {
      await flushImediato(orgId);
      if (faseAtual === "B") await avaliarPromocaoC(orgId, payload);
    })();
    return { status: "pronto" };
  }

  // A nuvem sempre vence quando já existe conteúdo da empresa.
  if (temPayload) {
    replaceDB(payload);
    ativarSync(orgId);
    await iniciarNumeracao({
      orcamento: getDBSnapshot().proximoOrcamento ?? 1,
      relatorio: getDBSnapshot().proximoRelatorio ?? 1,
    });
    // Cópia inicial/atualização das tabelas próprias (idempotente) e, quando
    // tudo confere, passagem para a leitura relacional na próxima entrada.
    void (async () => {
      await backfillRelacional(orgId);
      if (versao === "A") await avaliarPromocao(orgId, getDBSnapshot());
    })();
    return { status: "pronto" };
  }

  const marca = marcaMigracao();
  const resumo = resumoLocal();

  // Dispositivo já migrado para outra empresa: começa limpo, sem misturar contas.
  if (marca && marca.orgId !== orgId) {
    await descartarMigracao(orgId);
    return { status: "pronto" };
  }

  // Nada relevante no dispositivo: começa vazio.
  if (resumo.total === 0) {
    await descartarMigracao(orgId);
    return { status: "pronto" };
  }

  // Existe conteúdo local ainda não enviado: exige confirmação do usuário.
  if (!marca) return { status: "migracao_pendente" };

  await confirmarMigracao(orgId);
  return { status: "pronto" };
}

async function flushImediato(orgId: string) {
  await push(orgId, getDBSnapshot());
}

/**
 * Cópia inicial do bloco JSON para as tabelas próprias.
 * Pode ser executada quantas vezes for necessário: nada é duplicado.
 */
export async function backfillRelacional(orgId: string) {
  const { data } = await supabase.auth.getUser();
  resetRelacional();
  await sincronizarRelacional(orgId, getDBSnapshot(), data.user?.id ?? null);
  return contarRelacional(orgId);
}

/** Conferência manual: compara tabelas e bloco JSON sem alterar nada. */
export async function conferirRelacional(orgId: string) {
  const { data } = await supabase
    .from("app_data")
    .select("payload")
    .eq("organization_id", orgId)
    .maybeSingle();
  const { db, contagens } = await lerRelacional(orgId);
  return {
    contagens,
    divergencias: compararSnapshots(db, (data?.payload ?? {}) as Partial<DB>),
  };
}

export async function stopOrgSync() {
  await flush();
  setPersistListener(null);
  setNumeroProvider(null);
  pararNumeracao();
  resetRelacional();
  setUsuarioAtual(null);
  currentOrg = null;
  pending = null;
}
