/**
 * Sincronização dos dados locais com a nuvem, isolados por empresa (Etapa 02).
 *
 * O aplicativo continua operando sobre o estado local síncrono; esta camada
 * apenas carrega o conteúdo da empresa autenticada e devolve as alterações
 * para o backend, protegidas por RLS.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  ensureHydrated,
  getDBSnapshot,
  replaceDB,
  resetDB,
  setPersistListener,
  type DB,
} from "@/lib/store";

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
};

export async function loadOrgContext(): Promise<OrgContext> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { orgId: null, userId: null, nome: null, email: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, nome, email")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    orgId: profile?.organization_id ?? null,
    userId: user.id,
    nome: profile?.nome ?? (user.user_metadata?.["name"] as string | undefined) ?? null,
    email: profile?.email ?? user.email ?? null,
  };
}

async function push(orgId: string, db: DB) {
  const { data } = await supabase.auth.getUser();
  const { error } = await supabase.from("app_data").upsert(
    {
      organization_id: orgId,
      payload: db as unknown as Json,
      updated_by: data.user?.id ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );
  if (error) console.warn("Não foi possível salvar na nuvem.", error.message);
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

/** Carrega os dados da empresa e passa a sincronizar as alterações. */
export async function initOrgSync(orgId: string) {
  if (currentOrg === orgId) return;
  ensureHydrated();

  const { data, error } = await supabase
    .from("app_data")
    .select("payload")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (error) console.warn("Não foi possível carregar os dados da nuvem.", error.message);

  const payload = (data?.payload ?? null) as Partial<DB> | null;
  const marcada = typeof window !== "undefined" ? localStorage.getItem(ORG_MARK_KEY) : null;

  currentOrg = orgId;

  if (payload && Object.keys(payload).length > 0) {
    replaceDB(payload);
  } else if (marcada === null || marcada === orgId) {
    // Primeiro envio: aproveita os dados já existentes neste dispositivo.
    await push(orgId, getDBSnapshot());
  } else {
    // Conta diferente no mesmo dispositivo: começa limpo.
    resetDB();
    await push(orgId, getDBSnapshot());
  }

  if (typeof window !== "undefined") localStorage.setItem(ORG_MARK_KEY, orgId);
  setPersistListener(scheduleSave);
  bindFlushHandlers();
}

export async function stopOrgSync() {
  await flush();
  setPersistListener(null);
  currentOrg = null;
  pending = null;
}
