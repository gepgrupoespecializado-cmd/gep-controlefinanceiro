const AUTH_KEY = "gep_auth_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

let memoryAuthenticated = false;

type LocalSession = {
  token: string;
  createdAt: number;
  expiresAt: number;
};

function now() {
  return Date.now();
}

function newSession(): LocalSession {
  const createdAt = now();
  const token =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}${createdAt.toString(36)}`;

  return {
    token,
    createdAt,
    expiresAt: createdAt + SESSION_TTL_MS,
  };
}

export function isLocalAuthenticated(): boolean {
  if (memoryAuthenticated) return true;
  if (typeof window === "undefined") return false;

  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw) as Partial<LocalSession>;
    const valid = typeof session.token === "string" && Number(session.expiresAt) > now();
    if (!valid) {
      window.localStorage.removeItem(AUTH_KEY);
      return false;
    }
    memoryAuthenticated = true;
    return true;
  } catch {
    return memoryAuthenticated;
  }
}

export function startLocalSession(): boolean {
  memoryAuthenticated = true;
  if (typeof window === "undefined") return true;

  try {
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(newSession()));
  } catch {
    // Modo privado/armazenamento bloqueado: mantém sessão apenas em memória.
  }
  return true;
}

export function isPublicRoute(pathname: string): boolean {
  return pathname === "/login" || pathname === "/termos-de-uso" || pathname === "/politica-de-privacidade";
}