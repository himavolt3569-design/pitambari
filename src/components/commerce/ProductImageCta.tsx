"use client";

import { useUi } from "@/lib/store/ui";
import { useTranslations } from "@/components/layout/StoreCopyProvider";
import { planPurchaseFocus, purchaseCtaLabel } from "@/lib/commerce/purchase-focus";

/**
 * A transparent button laid over a product image, following the same pattern as
 * the product stage trigger: the image keeps its own layout and its GSAP
 * timeline untouched, and the button supplies only the click target and the
 * accessible name.
 *
 * A picture of the product is an invitation to consider it, not an intent to
 * buy, so this carries the customer to the purchase panel rather than into the
 * checkout form. Nothing is added to the cart: the size has not been chosen
 * yet, and choosing one on the customer's behalf is how wrong orders happen.
 *
 * `subject` distinguishes repeated buttons for a screen reader — the surface
 * shots pass their own name, the bottle needs no qualifier.
 */
export function ProductImageCta({ subject }: { subject?: string }) {
  const t = useTranslations();
  const focusPurchase = useUi((s) => s.focusPurchase);

  function activate() {
    const target = document.getElementById("product");
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const plan = planPurchaseFocus({
      hasTarget: Boolean(target),
      reducedMotion,
    });
    if (!plan || !target) return;

    // `scroll-padding-top` on <html> already clears the sticky header, so the
    // panel is not left tucked underneath it.
    target.scrollIntoView({ behavior: plan.behavior, block: "start" });
    focusPurchase();
  }

  return (
    <button type="button" className="shine-image-cta" onClick={activate}>
      <span className="sr-only">
        {purchaseCtaLabel(t.product.imageCta, subject)}
      </span>
    </button>
  );
}
