import { describe, expect, it } from "vitest";
import { buildDossierPages, stepDossierPage, type DossierPageId } from "./product-dossier";
import type { ProductVariant, SurfaceEntry, UsageStep } from "@/types";

const variant = (id: string): ProductVariant => ({ id, label: "Small", volume: "200 ml", sku: `SKU-${id}`, priceMinor: 40000, compareAtPriceMinor: null, stock: 5, active: true, sortOrder: 1 });
const surface = (id: string): SurfaceEntry => ({ id, name: "Brass", body: "Thalis and dishes.", image: "/a.png", sortOrder: 1 });
const step = (id: string): UsageStep => ({ id, title: "Apply", body: "As directed.", sortOrder: 1 });

const full = { featureCount: 4, variants: [variant("small")], surfaceTypes: ["Copper"], surfaces: [surface("brass")], steps: [step("apply")], usageNote: "Test a small area first." };

describe("product dossier pages", () => {
  it("offers every page in reading order when the store has all the content", () => {
    expect(buildDossierPages(full)).toEqual(["features", "sizes", "surfaces", "usage", "care"]);
  });

  it("drops a page rather than paging the customer onto a blank one", () => {
    expect(buildDossierPages({ ...full, variants: [] })).not.toContain("sizes");
    expect(buildDossierPages({ ...full, steps: [] })).not.toContain("usage");
    expect(buildDossierPages({ ...full, featureCount: 0 })).not.toContain("features");
  });

  it("keeps the surfaces page when either the metal list or the surface entries survive", () => {
    expect(buildDossierPages({ ...full, surfaces: [] })).toContain("surfaces");
    expect(buildDossierPages({ ...full, surfaceTypes: [] })).toContain("surfaces");
    expect(buildDossierPages({ ...full, surfaces: [], surfaceTypes: [] })).not.toContain("surfaces");
  });

  it("treats a blank or missing care note as no care page", () => {
    expect(buildDossierPages({ ...full, usageNote: "   " })).not.toContain("care");
    expect(buildDossierPages({ ...full, usageNote: null })).not.toContain("care");
  });

  it("returns nothing to open when the store has no content at all", () => {
    expect(buildDossierPages({ featureCount: 0, variants: [], surfaceTypes: [], surfaces: [], steps: [], usageNote: null })).toEqual([]);
  });
});

describe("dossier paging", () => {
  const pages: DossierPageId[] = ["features", "sizes", "care"];

  it("moves forward and back through the available pages", () => {
    expect(stepDossierPage(pages, "features", 1)).toBe("sizes");
    expect(stepDossierPage(pages, "care", -1)).toBe("sizes");
  });

  it("wraps at both ends so the arrows never dead-end", () => {
    expect(stepDossierPage(pages, "care", 1)).toBe("features");
    expect(stepDossierPage(pages, "features", -1)).toBe("care");
  });

  it("recovers to the first page when the current one is no longer offered", () => {
    expect(stepDossierPage(pages, "usage", 1)).toBe("features");
  });

  it("has nowhere to go when there are no pages", () => {
    expect(stepDossierPage([], "features", 1)).toBeNull();
  });
});
