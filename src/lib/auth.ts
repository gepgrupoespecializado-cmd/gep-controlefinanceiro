import { supabase } from "@/integrations/supabase/client";

const PUBLICAS = new Set([
  "/login",
  "/reset-password",
  "/termos-de-uso",
  "/politica-de-privacidade",
]);

export function isPublicRoute(pathname: string): boolean {
  return PUBLICAS.has(pathname);
}

export async function getSessionUser() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

export async function signInWithPassword(email: string, senha: string) {
  return supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
}

export async function signUpWithPassword(email: string, senha: string, nome: string) {
  return supabase.auth.signUp({
    email: email.trim(),
    password: senha,
    options: {
      emailRedirectTo: `${window.location.origin}/login`,
      data: { name: nome },
    },
  });
}

export async function enviarRecuperacao(email: string) {
  return supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

export function mensagemAmigavel(msg: string | undefined): string {
  const m = (msg ?? "").toLowerCase();
  if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Este e-mail já possui conta. Faça login.";
  if (m.includes("weak") || m.includes("pwned"))
    return "Esta senha é muito comum e insegura. Escolha outra senha.";
  if (m.includes("should be at least") || m.includes("password"))
    return "A senha precisa ter no mínimo 6 caracteres.";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde alguns minutos.";
  if (!m) return "Não foi possível concluir. Tente novamente.";
  return "Não foi possível concluir. Tente novamente.";
}
