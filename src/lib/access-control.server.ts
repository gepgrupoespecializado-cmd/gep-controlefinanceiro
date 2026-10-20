import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isConfiguredOwner, type AccessStatus, type MyAccessState } from "@/lib/access-control";

type UserSupabaseClient = SupabaseClient<Database>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getConfiguredOwnerId(): string | null {
  const value = process.env.APP_OWNER_USER_ID?.trim();
  return value && UUID_PATTERN.test(value) ? value : null;
}

async function hasAdminRole(supabase: UserSupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  return !error && data === true;
}

async function bootstrapConfiguredOwner(
  supabase: UserSupabaseClient,
  userId: string,
): Promise<boolean> {
  const ownerId = getConfiguredOwnerId();
  if (!ownerId || !isConfiguredOwner(ownerId, userId)) return false;
  if (await hasAdminRole(supabase, userId)) return true;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("configure_app_owner", {
      _owner_user_id: ownerId,
    });
    if (error) {
      console.error("[admin-access] owner bootstrap failed", { code: error.code });
      return false;
    }
  } catch (error) {
    console.error("[admin-access] owner bootstrap unavailable", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return false;
  }

  return hasAdminRole(supabase, userId);
}

export async function bootstrapOwnerForCurrentUser(
  supabase: UserSupabaseClient,
  userId: string,
): Promise<void> {
  await bootstrapConfiguredOwner(supabase, userId);
}

export async function loadMyAccessState(
  supabase: UserSupabaseClient,
  userId: string,
): Promise<MyAccessState> {
  const { data, error } = await supabase.rpc("get_my_access_state");
  if (error) throw new Error("Não foi possível verificar seu acesso.");
  const row = Array.isArray(data) ? data[0] : data;
  const rawStatus = row?.status;
  const status: AccessStatus = rawStatus === "ativo" || rawStatus === "bloqueado" ? rawStatus : "pendente";
  const ownerId = getConfiguredOwnerId();
  return {
    status,
    isAdmin: isConfiguredOwner(ownerId, userId) && row?.is_admin === true,
  };
}

export async function authorizeCurrentOwner(
  supabase: UserSupabaseClient,
  userId: string,
  action: string,
): Promise<boolean> {
  const ownerId = getConfiguredOwnerId();
  if (!ownerId || !isConfiguredOwner(ownerId, userId)) {
    console.warn("[admin-access] denied", { action, userId });
    return false;
  }
  if (await bootstrapConfiguredOwner(supabase, userId)) return true;
  console.warn("[admin-access] owner role unavailable", { action, userId });
  return false;
}
