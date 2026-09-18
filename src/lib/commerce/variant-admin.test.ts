import { describe, expect, it } from "vitest";
import { variantSchema, validateVariantSave, skuTaken } from "./variant-admin";

const draft = { productId: "pitambari", variantId: "small", label: "Small pack", volume: "Owner-defined size", sku: "PIT-SMALL", priceRupees: 12.5, stock: 4, active: true, isDefault: true, sortOrder: 0 };

describe("admin variant publication", () => {
  it("rejects active variants without a positive price", () => {
    expect(variantSchema.safeParse({ ...draft, priceRupees: 0 }).success).toBe(false);
    expect(variantSchema.safeParse({ ...draft, active: false, priceRupees: 0 }).success).toBe(true);
  });
  it("rejects sub-paisa prices, path IDs and missing SKU", () => {
    expect(variantSchema.safeParse({ ...draft, priceRupees: 0.001 }).success).toBe(false);
    expect(variantSchema.safeParse({ ...draft, variantId: "a/b" }).success).toBe(false);
    expect(variantSchema.safeParse({ ...draft, sku: " " }).success).toBe(false);
  });
  it("requires creation explicitly and prevents overwriting an existing size", () => {
    expect(() => validateVariantSave(draft, [], false)).toThrow(/no longer exists/);
    expect(() => validateVariantSave(draft, [{ id: "small", sku: "PIT-SMALL" }], true)).toThrow(/already exists/);
  });
  it("rejects duplicate SKUs and allows editing the same SKU", () => {
    expect(() => validateVariantSave(draft, [{ id: "large", sku: "pit-small" }], true)).toThrow(/SKU/);
    expect(() => validateVariantSave(draft, [{ id: "small", sku: "PIT-SMALL" }], false)).not.toThrow();
    expect(() => validateVariantSave(draft, [], true)).not.toThrow();
  });
  it("names the offending field, so a rejected save does not read as a dead button", () => {
    const messageFor = (patch: Partial<typeof draft>) => {
      const result = variantSchema.safeParse({ ...draft, ...patch });
      return result.success ? "" : result.error.issues.map(issue => issue.message).join(" ");
    };
    expect(messageFor({ sku: "" })).toMatch(/SKU/);
    expect(messageFor({ label: "" })).toMatch(/Size/);
    expect(messageFor({ volume: "" })).toMatch(/Pack size/);
    expect(messageFor({ priceRupees: 0 })).toMatch(/Price/);
    // Zod's own wording explains nothing to whoever is standing at the form.
    expect(messageFor({ sku: "" })).not.toMatch(/Too small|expected string/i);
  });
  it("blames only the SKU box for a clash, and never the row's own SKU", () => {
    const others = [{ id: "large", sku: "PIT-LARGE" }, { id: "small", sku: "PIT-SMALL" }];
    // Editing a row keeps its own SKU: it must not collide with itself.
    expect(skuTaken("PIT-SMALL", "small", others)).toBe(false);
    expect(skuTaken("pit-large", "small", others)).toBe(true);
    expect(skuTaken("  PIT-LARGE  ", "small", others)).toBe(true);
    expect(skuTaken("PIT-NEW", "small", others)).toBe(false);
    // A brand new row has no id in the list yet.
    expect(skuTaken("PIT-LARGE", "fresh", others)).toBe(true);
    expect(skuTaken("PIT-FRESH", "fresh", others)).toBe(false);
  });
  it("reports every empty field at once rather than one per save", () => {
    const result = variantSchema.safeParse({ ...draft, label: "", volume: "", sku: "" });
    expect(result.success).toBe(false);
    const messages = result.success ? [] : result.error.issues.map(issue => issue.message);
    expect(messages.join(" ")).toMatch(/Size/);
    expect(messages.join(" ")).toMatch(/Pack size/);
    expect(messages.join(" ")).toMatch(/SKU/);
  });
});
