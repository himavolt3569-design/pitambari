import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ admin: false }));
vi.mock("@/lib/auth/session", () => ({ getAdminUser: async () => state.admin ? { uid: "admin" } : null }));
vi.mock("@/lib/data/media", () => ({ getMediaFromFirestore: async () => ({ buffer: Buffer.from("image"), contentType: "image/png" }) }));
import { GET } from "./route";
import { NextRequest } from "next/server";
beforeEach(() => { state.admin = false; });
it("does not expose payment screenshots to an anonymous caller", async () => {
  const result = await GET(new NextRequest("http://localhost/api/media/proof_one"), { params: Promise.resolve({ id: "proof_one" }) });
  expect(result.status).toBe(404);
  expect(result.headers.get("cache-control")).toContain("no-store");
});
it("serves a screenshot to staff without public caching", async () => {
  state.admin = true;
  const result = await GET(new NextRequest("http://localhost/api/media/proof_one"), { params: Promise.resolve({ id: "proof_one" }) });
  expect(result.status).toBe(200);
  expect(result.headers.get("cache-control")).toContain("no-store");
});
it("keeps product images public", async () => {
  const result = await GET(new NextRequest("http://localhost/api/media/product_one"), { params: Promise.resolve({ id: "product_one" }) });
  expect(result.status).toBe(200);
  expect(result.headers.get("cache-control")).toContain("public");
});
