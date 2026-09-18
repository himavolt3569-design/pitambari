import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  customer: "a".repeat(43),
  order: {} as Record<string, unknown>,
  proof: {} as Record<string, unknown>,
  events: [] as unknown[],
  transactions: 0,
  looseWrites: 0,
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: state.customer }) }) }));
vi.mock("@/lib/utils/request-guard", () => ({
  assertSameOrigin: async () => {}, clientIp: async () => "test", rateLimit: async () => {},
  GuardError: class extends Error { constructor(message: string, public status: number) { super(message); } },
}));
vi.mock("@/lib/firebase/admin", () => {
  const ref = (collection: string, id: string) => ({ collection, id,
    get: async () => ({ exists: true, data: () => collection === "orders" ? state.order : state.proof }),
    update: async (data: object) => {
      state.looseWrites += 1;
      return Object.assign(state.order, data);
    },
    txUpdate: (data: object) => Object.assign(state.order, data),
  });
  return {
    FirebaseUnavailableError: class extends Error {},
    requireDb: () => ({
      collection: (name: string) => ({ doc: (id = "event") => ref(name, id), add: async (data: unknown) => state.events.push(data) }),
      runTransaction: async (fn: (tx: object) => Promise<unknown>) => {
        state.transactions += 1;
        return fn({
          get: (r: ReturnType<typeof ref>) => r.get(),
          update: (r: ReturnType<typeof ref>, data: object) => r.txUpdate(data),
          set: (_r: unknown, data: unknown) => state.events.push(data),
        });
      },
    }),
  };
});

import { POST } from "./route";

const request = (proofPath?: string) => new Request("http://localhost/api/payments/proof", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ orderId: "order1", orderNumber: "SHINE-2609-0001", reference: "BANK-42", proofPath }),
});

describe("manual payment ownership and upload contract", () => {
  beforeEach(() => {
    state.customer = "a".repeat(43);
    state.order = { orderNumber: "SHINE-2609-0001", customerKey: state.customer, paymentStatus: "pending", orderStatus: "pending", paymentKind: "qr" };
    state.proof = { orderId: "order1", contentType: "image/png" };
    state.events = [];
    state.transactions = 0;
    state.looseWrites = 0;
  });
  it("accepts the private URL returned by upload and records it for staff", async () => {
    const response = await POST(request("/api/media/proof_upload1"));
    expect(response.status).toBe(200);
    expect(state.order.paymentProofPath).toBe("/api/media/proof_upload1");
    expect(state.order.paymentStatus).toBe("pending_verification");
    expect(state.events).toHaveLength(1);
  });
  it("settles the claim in one transaction, never a read then a write", async () => {
    // Staff pressing Mark paid mid-request must not be overwritten, which
    // only holds while the status check and the update share a transaction.
    await POST(request("/api/media/proof_upload1"));
    expect(state.transactions).toBe(1);
    expect(state.looseWrites).toBe(0);
  });
  it("rejects another browser even if it knows order ID and number", async () => {
    state.customer = "b".repeat(43);
    expect((await POST(request())).status).toBe(404);
    expect(state.order.paymentStatus).toBe("pending");
  });
  it("rejects a real screenshot belonging to another order", async () => {
    state.proof.orderId = "order2";
    expect((await POST(request("/api/media/proof_upload1"))).status).toBe(400);
    expect(state.order.paymentStatus).toBe("pending");
  });
  it("does not reopen a payment already verified by staff", async () => {
    state.order.paymentStatus = "paid";
    expect((await POST(request())).status).toBe(200);
    expect(state.order.paymentStatus).toBe("paid");
    expect(state.events).toHaveLength(0);
  });
});
