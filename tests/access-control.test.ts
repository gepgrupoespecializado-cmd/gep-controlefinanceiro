import { describe, expect, test } from "bun:test";
import { canOpenAdmin, isConfiguredOwner, isWaitingForAccess, type MyAccessState } from "../src/lib/access-control";

describe("access control decisions", () => {
  test("pending and blocked accounts are held at the access screen", () => {
    expect(isWaitingForAccess({ status: "pendente", isAdmin: false })).toBe(true);
    expect(isWaitingForAccess({ status: "bloqueado", isAdmin: false })).toBe(true);
  });

  test("active accounts can use the app but not the admin panel", () => {
    const state: MyAccessState = { status: "ativo", isAdmin: false };
    expect(isWaitingForAccess(state)).toBe(false);
    expect(canOpenAdmin(state)).toBe(false);
  });

  test("only the exact configured authenticated UUID matches the owner", () => {
    const ownerId = "550e8400-e29b-41d4-a716-446655440000";
    expect(isConfiguredOwner(ownerId, ownerId)).toBe(true);
    expect(isConfiguredOwner(ownerId.toUpperCase(), ownerId)).toBe(true);
    expect(isConfiguredOwner(undefined, ownerId)).toBe(false);
    expect(isConfiguredOwner("", ownerId)).toBe(false);
    expect(isConfiguredOwner("550e8400-e29b-41d4-a716-446655440001", ownerId)).toBe(false);
  });

  test("admin access is independent from an e-mail or browser-supplied role", () => {
    expect(canOpenAdmin({ status: "ativo", isAdmin: false })).toBe(false);
    expect(canOpenAdmin({ status: "pendente", isAdmin: false })).toBe(false);
    expect(canOpenAdmin({ status: "ativo", isAdmin: true })).toBe(true);
  });
});
