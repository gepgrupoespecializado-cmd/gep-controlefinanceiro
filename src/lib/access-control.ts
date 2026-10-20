export type AccessStatus = "pendente" | "ativo" | "bloqueado";

export type MyAccessState = {
  status: AccessStatus;
  isAdmin: boolean;
};

export const ACCESS_STATE_QUERY_KEY = ["security", "my-access-state"] as const;

export function isWaitingForAccess(state: MyAccessState | null | undefined): boolean {
  return !state || (state.status !== "ativo" && !state.isAdmin);
}

export function canOpenAdmin(state: MyAccessState | null | undefined): boolean {
  return state?.isAdmin === true;
}

export function isConfiguredOwner(configuredOwnerId: string | null | undefined, userId: string): boolean {
  const ownerId = configuredOwnerId?.trim().toLowerCase();
  return Boolean(ownerId && ownerId === userId.trim().toLowerCase());
}
