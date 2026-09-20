import { describe, expect, it } from "vitest";
import { planPurchaseFocus, purchaseCtaLabel } from "./purchase-focus";

describe("planPurchaseFocus", () => {
  it("does nothing when the product section is absent", () => {
    expect(planPurchaseFocus({ hasTarget: false, reducedMotion: false })).toBeNull();
  });

  it("glides to the product section by default", () => {
    expect(planPurchaseFocus({ hasTarget: true, reducedMotion: false }))
      .toEqual({ behavior: "smooth" });
  });

  it("jumps without animation when reduced motion is preferred", () => {
    expect(planPurchaseFocus({ hasTarget: true, reducedMotion: true }))
      .toEqual({ behavior: "auto" });
  });
});

describe("purchaseCtaLabel", () => {
  it("uses the action alone when there is no subject", () => {
    expect(purchaseCtaLabel("See sizes and buy")).toBe("See sizes and buy");
  });

  it("names the subject so repeated images are distinguishable", () => {
    expect(purchaseCtaLabel("See sizes and buy", "Marble"))
      .toBe("Marble: See sizes and buy");
  });

  it("ignores a blank subject rather than emitting a stray separator", () => {
    expect(purchaseCtaLabel("See sizes and buy", "   ")).toBe("See sizes and buy");
  });
});
