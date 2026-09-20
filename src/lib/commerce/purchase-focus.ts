/**
 * Product imagery across the page is a live entry into the purchase panel: a
 * tap on the bottle, the story photo or a surface shot carries the customer to
 * the place where size, price and quantity are actually chosen.
 *
 * The decision is kept here, away from the DOM, so the behaviour that matters
 * (never animate past a motion preference, never act without a destination)
 * can be tested without a browser.
 */

export interface PurchaseFocusPlan {
  behavior: ScrollBehavior;
}

/**
 * A missing product section is not an error: the storefront renders without it
 * when nothing is published, and a dead click is better than a thrown one.
 */
export function planPurchaseFocus({
  hasTarget,
  reducedMotion,
}: {
  hasTarget: boolean;
  reducedMotion: boolean;
}): PurchaseFocusPlan | null {
  if (!hasTarget) return null;
  return { behavior: reducedMotion ? "auto" : "smooth" };
}

/**
 * Several of these buttons sit on the same page, so a shared label would leave
 * a screen reader reading "See sizes and buy" four times with no way to tell
 * them apart. Surfaces pass their own name; the bottle needs no qualifier.
 *
 * Subjects come from the admin CMS and can be blank, which must not produce a
 * label that opens with a colon.
 */
export function purchaseCtaLabel(action: string, subject?: string): string {
  const named = subject?.trim();
  return named ? `${named}: ${action}` : action;
}
