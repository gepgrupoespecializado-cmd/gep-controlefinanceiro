import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const listInput = z.object({
  search: z.string().max(200).default(""),
  status: z.enum(["todos", "pendente", "ativo", "bloqueado"]).default("todos"),
  page: z.number().int().min(0).default(0),
});

const statusInput = z.object({
  userId: z.string().uuid(),
  status: z.enum(["ativo", "bloqueado"]),
  observacao: z.string().max(500).optional().default(""),
});

const preReleaseInput = z.object({
  email: z.string().trim().email().max(320),
  observacao: z.string().max(500).optional().default(""),
});

const removePreReleaseInput = z.object({
  email: z.string().trim().email().max(320),
});

async function requireAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
  action: string,
) {
  const { authorizeCurrentOwner } = await import("@/lib/access-control.server");
  if (!(await authorizeCurrentOwner(supabase, userId, action))) {
    throw new Error("Acesso negado.");
  }
}

export const bootstrapOwnerAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { bootstrapOwnerForCurrentUser } = await import("@/lib/access-control.server");
    await bootstrapOwnerForCurrentUser(context.supabase, context.userId);
    return { ok: true };
  });

export const getMyAccessState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadMyAccessState } = await import("@/lib/access-control.server");
    return loadMyAccessState(context.supabase, context.userId);
  });

export const checkAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { authorizeCurrentOwner } = await import("@/lib/access-control.server");
    return { isAdmin: await authorizeCurrentOwner(context.supabase, context.userId, "check_admin_route") };
  });

export const getAdminAccessData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(listInput)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId, "list_accesses");
    const { getConfiguredOwnerId } = await import("@/lib/access-control.server");
    const ownerId = getConfiguredOwnerId();
    if (!ownerId) throw new Error("Painel administrativo não configurado.");

    const pageSize = 50;
    let usersQuery = context.supabase
      .from("acessos")
      .select("user_id,email,status,created_at,liberado_em,observacao", { count: "exact" })
      .neq("user_id", ownerId)
      .order("created_at", { ascending: false })
      .range(data.page * pageSize, data.page * pageSize + pageSize - 1);

    if (data.status !== "todos") usersQuery = usersQuery.eq("status", data.status);
    if (data.search.trim()) usersQuery = usersQuery.ilike("email", "%" + data.search.trim() + "%");

    const [usersResult, preReleasedResult] = await Promise.all([
      usersQuery,
      context.supabase
        .from("emails_pre_liberados")
        .select("email,criado_em")
        .order("criado_em", { ascending: false })
        .limit(50),
    ]);
    if (usersResult.error || preReleasedResult.error) {
      throw new Error("Não foi possível carregar a lista de acessos.");
    }
    return {
      users: usersResult.data ?? [],
      total: usersResult.count ?? 0,
      page: data.page,
      pageSize,
      preReleasedEmails: preReleasedResult.data ?? [],
    };
  });

export const setUserAccessStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(statusInput)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId, "change_access_status");
    const { error, data: changed } = await context.supabase.rpc("admin_set_access_status", {
      _target_user_id: data.userId,
      _status: data.status,
      _observacao: data.observacao.trim() || null,
    });
    if (error || changed !== true) throw new Error("Não foi possível alterar esse acesso.");
    return { ok: true as const };
  });

export const preReleaseEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(preReleaseInput)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId, "pre_release_email");
    const { error, data: result } = await context.supabase.rpc("admin_preliberar_email", {
      _email: data.email.trim().toLowerCase(),
      _observacao: data.observacao.trim() || null,
    });
    if (error || (result !== "pre_liberado" && result !== "liberado")) {
      throw new Error("Não foi possível pré-liberar esse e-mail.");
    }
    return { result };
  });

export const removePreReleasedEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(removePreReleaseInput)
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId, "remove_pre_release_email");
    const { error, data: removed } = await context.supabase.rpc("admin_remover_email_pre_liberado", {
      _email: data.email.trim().toLowerCase(),
    });
    if (error || removed !== true) throw new Error("Não foi possível remover a pré-liberação.");
    return { ok: true as const };
  });
