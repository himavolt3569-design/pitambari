"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from "react";
import { useLanguage } from "@/lib/store/language";
import { useTranslations } from "@/components/layout/StoreCopyProvider";
import { formatNpr } from "@/lib/utils/money";
import { stepDossierPage, type DossierPageId } from "@/lib/commerce/product-dossier";
import { DEFAULT_PRODUCT_FEATURES } from "@/config/defaults";
import type { ProductVariant, SurfaceEntry, UsageStep } from "@/types";

/** Stroke marks for the four claims printed on the label. */
const FEATURE_MARKS: Record<string, React.ReactNode> = {
  quality: <><circle cx="12" cy="9.5" r="5.5" /><path d="m8.6 14.4-1.1 6.6 4.5-2.4 4.5 2.4-1.1-6.6" /></>,
  quick: <path d="M13.2 2.5 4.5 14h6.6l-1.3 7.5L19.5 10h-6.6l.3-7.5Z" />,
  lasting: <><path d="M12 2.8 13.9 9l6.1 1.9-6.1 2L12 19.2l-1.9-6.3L4 10.9 10.1 9 12 2.8Z" /><path d="M19 17.5v3.5M17.2 19.2h3.6" /></>,
  gentle: <path d="M8.5 11.5v-6a1.5 1.5 0 0 1 3 0v5.5m0-5.5V4a1.5 1.5 0 0 1 3 0v7m0-5.2a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7 6 6 0 0 1-6-6v-3.5a1.5 1.5 0 0 1 3 0" />,
};

export interface ProductDossierProps {
  open: boolean;
  pages: DossierPageId[];
  page: DossierPageId;
  onPageChange: (page: DossierPageId) => void;
  onClose: () => void;
  /** Already filtered to what is sellable. */
  variants: ProductVariant[];
  selectedVariantId: string;
  onSelectVariant: (id: string) => void;
  surfaceTypes: string[];
  surfaces: SurfaceEntry[];
  steps: UsageStep[];
  usageNote: string | null;
  panelId: string;
}

/**
 * The detail panel that expands inside the product stage. It only ever shows
 * content the store has already published, so nothing here is invented copy:
 * the four feature titles are quotations of the bottle's own front label.
 */
export function ProductDossier({
  open, pages, page, onPageChange, onClose,
  variants, selectedVariantId, onSelectVariant,
  surfaceTypes, surfaces, steps, usageNote, panelId,
}: ProductDossierProps) {
  const t = useTranslations();
  const { lang } = useLanguage();
  const detail = t.product.detail;
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus enters the panel on open so the keyboard follows the eye. Returning
  // focus to the bottle is the trigger's job, since it owns that element.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  function move(delta: number) {
    const next = stepDossierPage(pages, page, delta);
    if (next) onPageChange(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") { event.stopPropagation(); onClose(); return; }
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
  }

  const tabId = (id: DossierPageId) => `${panelId}-tab-${id}`;

  return (
    <div
      ref={panelRef}
      id={panelId}
      className="shine-dossier"
      tabIndex={-1}
      // `inert` takes the shut panel out of the tab order and the accessibility
      // tree at once. The slide-out uses a delayed `visibility` transition, and
      // focus must not wait on an animation that may never run.
      inert={!open}
      aria-hidden={!open}
      onKeyDown={onKeyDown}
    >
      <div className="shine-dossier-head">
        <p className="shine-dossier-title" id={`${panelId}-title`}>{detail.pages[page]}</p>
        <button type="button" className="shine-dossier-close" onClick={onClose} aria-label={detail.close}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>

      <div
        className="shine-dossier-body"
        role="tabpanel"
        id={`${panelId}-panel-${page}`}
        aria-labelledby={tabId(page)}
        key={page}
      >
        {page === "features" && <>
          <ul className="shine-dossier-features">
            {DEFAULT_PRODUCT_FEATURES.map((feature, i) => {
              const copy = detail.features[feature.id];
              return (
                <li key={feature.id} style={{ "--i": i } as CSSProperties}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">{FEATURE_MARKS[feature.id]}</svg>
                  <h4>{copy?.title || feature.title}</h4>
                  <p>{copy?.body || feature.body}</p>
                </li>
              );
            })}
          </ul>
          <p className="shine-dossier-note">{detail.labelNote}</p>
        </>}

        {page === "sizes" && <>
          <ul className="shine-dossier-sizes">
            {variants.map((variant, i) => {
              const soldOut = variant.stock <= 0;
              const label = (lang === "ne" && t.product.variants[variant.id]) || variant.label;
              return (
                <li key={variant.id} style={{ "--i": i } as CSSProperties}>
                  <button
                    type="button"
                    onClick={() => onSelectVariant(variant.id)}
                    disabled={soldOut}
                    aria-pressed={variant.id === selectedVariantId}
                  >
                    <span className="shine-dossier-size-name">{label}</span>
                    <span className="shine-dossier-size-volume">{variant.volume}</span>
                    <span className="shine-dossier-size-price tabular">{formatNpr(variant.priceMinor)}</span>
                    <span className="shine-dossier-size-stock" data-stocked={!soldOut}>
                      {soldOut ? t.product.outOfStock : t.product.inStock}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="shine-dossier-note">{variants.length ? detail.sizesNote : detail.sizesEmpty}</p>
        </>}

        {page === "surfaces" && <>
          {surfaceTypes.length > 0 && (
            <ul className="shine-dossier-chips">
              {surfaceTypes.map((metal, i) => (
                <li key={metal} style={{ "--i": i } as CSSProperties}>
                  {(lang === "ne" && t.surfaces.items[metal.toLowerCase()]?.name) || metal}
                </li>
              ))}
            </ul>
          )}
          <ul className="shine-dossier-surfaces">
            {surfaces.map((surface, i) => (
              <li key={surface.id} style={{ "--i": i + 1 } as CSSProperties}>
                {surface.image && (
                  <span className="shine-dossier-thumb">
                    <Image src={surface.image} alt="" fill sizes="72px" className="object-cover" />
                  </span>
                )}
                <div>
                  <h4>{(lang === "ne" && t.surfaces.items[surface.id]?.name) || surface.name}</h4>
                  <p>{(lang === "ne" && t.surfaces.items[surface.id]?.body) || surface.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="shine-dossier-note">{detail.surfacesNote}</p>
        </>}

        {page === "usage" && (
          <ol className="shine-dossier-steps">
            {steps.map((step, i) => (
              <li key={step.id} style={{ "--i": i } as CSSProperties}>
                <span className="shine-dossier-step-number tabular">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h4>{(lang === "ne" && t.howToUse.items[step.id]?.title) || step.title}</h4>
                  <p>{(lang === "ne" && t.howToUse.items[step.id]?.body) || step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        )}

        {page === "care" && (
          <div className="shine-dossier-care" style={{ "--i": 0 } as CSSProperties}>
            <p>{(lang === "ne" && t.howToUse.usageNote) || usageNote}</p>
            <Link href="#faq" className="shine-text-link" onClick={onClose}>
              {detail.faqLink}<span aria-hidden="true"> ↗</span>
            </Link>
          </div>
        )}
      </div>

      <div className="shine-dossier-pager">
        <button type="button" onClick={() => move(-1)} aria-label={detail.prev} aria-controls={panelId}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 5-7 7 7 7" /></svg>
        </button>
        <div role="tablist" aria-labelledby={`${panelId}-title`} className="shine-dossier-dots">
          {pages.map(id => (
            <button
              key={id}
              type="button"
              role="tab"
              id={tabId(id)}
              aria-selected={id === page}
              aria-controls={`${panelId}-panel-${id}`}
              tabIndex={id === page ? 0 : -1}
              onClick={() => onPageChange(id)}
            >
              <span className="sr-only">{detail.pages[id]}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => move(1)} aria-label={detail.next} aria-controls={panelId}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 5 7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}
