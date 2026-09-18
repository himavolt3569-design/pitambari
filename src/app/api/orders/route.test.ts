import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression cover for the claim handling in the order route.
 *
 * The bug these exist for: the route released the idempotency key in its catch
 * block regardless of who owned the claim, so a second tap that was correctly
 * refused with a 409 deleted the first tap's in-flight lock, and the third tap
 * sailed through and placed a duplicate order.
 */

const state = vi.hoisted(() => ({
  cookie: undefined as string | undefined,
  claim: null as { value: unknown; customerKey: string | null } | null,
  claimThrows: false,
  createThrows: false,
  released: [] as string[],
  claimedWith: [] as string[],
  createdWith: [] as Record<string, unknown>[],
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (state.cookie ? { value: state.cookie } : undefined) }),
  headers: async () => ({ get: () => "test-agent" }),
}));

// Declared inside the factory: vi.mock is hoisted above any top-level binding.
vi.mock("@/lib/utils/request-guard", () => {
  class GuardError extends Error {
    constructor(message: string, readonly status: number) { super(message); }
  }
  return {
    GuardError,
    assertSameOrigin: async () => {},
    clientIp: async () => "203.0.113.9",
    rateLimit: async () => {},
    claimIdempotency: async (_key: string, customerKey: string) => {
      state.claimedWith.push(customerKey);
      if (state.claimThrows) {
        throw new GuardError("This order is already being processed.", 409);
      }
      return state.claim ? { replayed: true, ...state.claim } : null;
    },
    releaseIdempotency: async (key: string) => { state.released.push(key); },
  };
});

vi.mock("@/lib/commerce/orders", () => ({
  createOrder: async (_input: unknown, meta: Record<string, unknown>) => {
    state.createdWith.push(meta);
    if (state.createThrows) throw new Error("stock check exploded");
    return { orderId: "order1", orderNumber: "SHINE-2609-0001", grandTotalMinor: 12300 };
  },
}));

import { POST } from "./route";

const KEY_A = "a".repeat(43);
const KEY_B = "b".repeat(43);
const IDEM = "3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607";

const request = () => new Request("http://localhost/api/orders", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    items: [{ productId: "p1", variantId: "v1", quantity: 1 }],
    address: {
      fullName: "Sita Rai",
      mobile: "9801234567",
      province: "Bagmati",
      district: "Kathmandu",
      municipality: "Kathmandu",
      area: "Thamel",
    },
    deliveryMethodId: "d1",
    paymentMethodId: "pm1",
    idempotencyKey: IDEM,
  }),
});

const cookieHeader = (res: Response) => res.headers.get("set-cookie") ?? "";

describe("order idempotency", () => {
  beforeEach(() => {
    state.cookie = undefined;
    state.claim = null;
    state.claimThrows = false;
    state.createThrows = false;
    state.released = [];
    state.claimedWith = [];
    state.createdWith = [];
  });

  it("places the order and hands the browser its customer key", async () => {
    const res = await POST(request());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true, order: { orderNumber: "SHINE-2609-0001" } });
    expect(cookieHeader(res)).toContain("__tmg_customer=");
    // The key is completed inside the order transaction, not afterwards.
    expect(state.createdWith[0]?.idempotencyKey).toBe(IDEM);
    expect(state.released).toEqual([]);
  });

  it("does not release a claim owned by a concurrent request", async () => {
    state.claimThrows = true;
    const res = await POST(request());
    expect(res.status).toBe(409);
    // The whole point: the other request's lock survives this one being refused.
    expect(state.released).toEqual([]);
  });

  it("releases its own claim when the order could not be created", async () => {
    state.createThrows = true;
    const res = await POST(request());
    expect(res.status).toBe(500);
    expect(state.released).toEqual([IDEM]);
  });

  it("replays the original order without creating a second", async () => {
    state.cookie = KEY_A;
    state.claim = { value: { orderId: "order1", orderNumber: "SHINE-2609-0001" }, customerKey: KEY_A };
    const res = await POST(request());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ replayed: true });
    expect(state.createdWith).toEqual([]);
    expect(state.released).toEqual([]);
  });

  it("restores the customer key when the first response was lost", async () => {
    state.cookie = undefined;
    state.claim = { value: { orderId: "order1" }, customerKey: KEY_A };
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(cookieHeader(res)).toContain(`__tmg_customer=${KEY_A}`);
  });

  it("refuses a replay asked for by a different browser", async () => {
    state.cookie = KEY_B;
    state.claim = { value: { orderId: "order1" }, customerKey: KEY_A };
    const res = await POST(request());
    expect(res.status).toBe(404);
    expect(state.released).toEqual([]);
  });
});
