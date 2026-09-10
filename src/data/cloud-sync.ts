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
import { resetRelacional, sincronizarRelacional } from "@/data/remote/relational-sync";
import {
  ensureHydrated,
  getDBSnapshot,
  replaceDB,
  resetDB,
  setNumeroProvider,
  setPersistListener,
  type DB,
} from "@/lib/store";

const LOCAL_KEY = "gep_db_v3";
const BACKUP_KEY = "gep_db_v3_backup";
const MIGRADO_KEY = "gep_db_migrado";
const ORG_MARK_KEY = "gep_db_org";

let currentOrg: string | null = null;
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

  return {
    orgId: membro?.organization_id ?? profile?.organization_id ?? null,
    userId: user.id,
    nome: profile?.nome ?? (user.user_metadata?.["name"] as string | undefined) ?? null,
    email: profile?.email ?? user.email ?? null,
    role: (membro?.role as OrgContext["role"]) ?? null,
  };
}

async function push(orgId: string, db: DB) {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id ?? null;
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
  // Etapa 03 — Fase A: espelho nas tabelas próprias. O bloco acima continua
  // sendo a fonte de leitura, então uma falha aqui não afeta o aplicativo.
  await sincronizarRelacional(orgId, db, userId);
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

/* ---------- Entrada principal ---------- */

export type SyncResult = { status: "pronto" } | { status: "migracao_pendente" };

/** Carrega os dados da empresa e passa a sincronizar as alterações. */
export async function initOrgSync(orgId: string): Promise<SyncResult> {
  if (currentOrg === orgId) return { status: "pronto" };
  ensureHydrated();

  const { data, error } = await supabase
    .from("app_data")
    .select("payload")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) console.warn("Não foi possível carregar os dados da nuvem.", error.message);

  const payload = (data?.payload ?? null) as Partial<DB> | null;

  // A nuvem sempre vence quando já existe conteúdo da empresa.
  if (payload && Object.keys(payload).length > 0) {
    replaceDB(payload);
    currentOrg = orgId;
    await iniciarNumeracao({
      orcamento: getDBSnapshot().proximoOrcamento ?? 1,
      relatorio: getDBSnapshot().proximoRelatorio ?? 1,
    });
    setNumeroProvider(proximoNumero);
    setPersistListener(scheduleSave);
    bindFlushHandlers();
    if (typeof window !== "undefined") localStorage.setItem(ORG_MARK_KEY, orgId);
    // Cópia inicial/atualização das tabelas próprias (idempotente).
    void backfillRelacional(orgId);
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
