import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cover for the revocation check on admin sessions.
 *
 * The bug these exist for: the session cookie was verified locally with
 * checkRevoked off, so signing out elsewhere, disabling the account, or
 * revoking the superAdmin claim left the old cookie working for up to the five
 * days it was issued for.
 */

const state = vi.hoisted(() => ({
  cookie: "session-cookie" as string | undefined,
  claims: { superAdmin: true } as Record<string, unknown>,
  revoked: false,
  calls: [] as boolean[],
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (state.cookie ? { value: state.cookie } : undefined) }),
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: () => ({
    verifySessionCookie: async (_cookie: string, checkRevoked: boolean) => {
      state.calls.push(checkRevoked);
      // Firebase only reports a revoked or disabled account when asked to check.
      if (checkRevoked && state.revoked) {
        throw new Error("auth/session-cookie-revoked");
      }
      return { uid: "admin1", email: "a@example.com", ...state.claims };
    },
  }),
  requireAuth: () => { throw new Error("not used here"); },
}));

const loadSession = async () => {
  vi.resetModules();
  return import("./session");
};

describe("getAdminUser", () => {
  beforeEach(() => {
    state.cookie = "session-cookie";
    state.claims = { superAdmin: true };
    state.revoked = false;
    state.calls = [];
  });

  it("asks Firebase to check the revocation list", async () => {
    const { getAdminUser } = await loadSession();
    await getAdminUser();
    expect(state.calls).toEqual([true]);
  });

  it("returns the admin for a live session", async () => {
    const { getAdminUser } = await loadSession();
    await expect(getAdminUser()).resolves.toMatchObject({ uid: "admin1" });
  });

  it("refuses a session revoked after sign-out or demotion", async () => {
    state.revoked = true;
    const { getAdminUser } = await loadSession();
    await expect(getAdminUser()).resolves.toBeNull();
  });

  it("refuses an account without the superAdmin claim", async () => {
    state.claims = {};
    const { getAdminUser } = await loadSession();
    await expect(getAdminUser()).resolves.toBeNull();
  });

  it("refuses a browser with no session cookie", async () => {
    state.cookie = undefined;
    const { getAdminUser } = await loadSession();
    await expect(getAdminUser()).resolves.toBeNull();
    expect(state.calls).toEqual([]);
  });
});
