import type { ProductVariant, SurfaceEntry, UsageStep } from "@/types";

/**
 * The expandable product detail panel is assembled from content the store has
 * already published. A store that has not filled in a section simply does not
 * get that page, so the customer can never arrive at an empty one.
 */
export type DossierPageId = "features" | "sizes" | "surfaces" | "usage" | "care";

const READING_ORDER: DossierPageId[] = ["features", "sizes", "surfaces", "usage", "care"];

export interface DossierSource {
  featureCount: number;
  /** Already filtered to what is sellable by the caller. */
  variants: ProductVariant[];
  surfaceTypes: string[];
  surfaces: SurfaceEntry[];
  steps: UsageStep[];
  usageNote: string | null | undefined;
}

export function buildDossierPages(source: DossierSource): DossierPageId[] {
  const filled: Record<DossierPageId, boolean> = {
    features: source.featureCount > 0,
    sizes: source.variants.length > 0,
    surfaces: source.surfaceTypes.length > 0 || source.surfaces.length > 0,
    usage: source.steps.length > 0,
    care: Boolean(source.usageNote?.trim()),
  };
  return READING_ORDER.filter(page => filled[page]);
}

/** Wraps at both ends, so neither arrow ever becomes a dead button. */
export function stepDossierPage(pages: DossierPageId[], current: DossierPageId, delta: number): DossierPageId | null {
  if (pages.length === 0) return null;
  const index = pages.indexOf(current);
  if (index === -1) return pages[0];
  return pages[(index + delta + pages.length) % pages.length];
}
