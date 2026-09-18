"use client";
import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useCart } from "@/lib/store/cart";
import { useUi } from "@/lib/store/ui";
import { useLanguage } from "@/lib/store/language";
import { useTranslations } from "@/components/layout/StoreCopyProvider";
import { formatNpr } from "@/lib/utils/money";
import { buildDossierPages, type DossierPageId } from "@/lib/commerce/product-dossier";
import { DEFAULT_PRODUCT_FEATURES } from "@/config/defaults";
import { QuantitySelector } from "./QuantitySelector";
import { ProductVariantSelector } from "./ProductVariantSelector";
import { ProductDossier } from "./ProductDossier";
import type { DeliveryMethod, PaymentMethod, Product, SurfaceEntry, UsageStep } from "@/types";

export function BagIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14l1 14H4L5 7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M8 8V6a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}

export function FeaturedProduct({ product, paymentMethods, deliveryMethods, surfaces, steps, usageNote }: { product: Product; paymentMethods: PaymentMethod[]; deliveryMethods: DeliveryMethod[]; surfaces: SurfaceEntry[]; steps: UsageStep[]; usageNote: string | null }) {
  const t = useTranslations();
  const { lang } = useLanguage();
  const active = product.active ? product.variants.filter(v => v.active && v.priceMinor > 0) : [];
  const preferred = active.find(v => v.isDefault && v.stock > 0) ?? active.find(v => v.stock > 0) ?? active[0];
  const [selected, setSelected] = useState("");
  const [quantity, setQuantity] = useState(1);
  const variant = active.find(v => v.id === selected) ?? preferred;
  const add = useCart(s => s.add);
  const openCart = useUi(s => s.openCart);
  const openCheckout = useUi(s => s.openCheckout);
  const available = Boolean(variant && variant.stock > 0);
  const actualQuantity = variant ? Math.min(quantity, Math.max(1, variant.stock)) : 1;
  const name = lang === "ne" ? t.product.name : product.name;

  const dossierId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [requestedPage, setRequestedPage] = useState<DossierPageId>("features");
  const pages = buildDossierPages({ featureCount: DEFAULT_PRODUCT_FEATURES.length, variants: active, surfaceTypes: product.surfaceTypes, surfaces, steps, usageNote });
  // The store may publish a section after the customer has opened the panel, so
  // the shown page is derived rather than trusted.
  const page = pages.includes(requestedPage) ? requestedPage : pages[0];

  function chooseVariant(id: string) { setSelected(id); setQuantity(1); }
  function closeDetail() { setDetailOpen(false); triggerRef.current?.focus(); }
  function onStageKeyDown(event: KeyboardEvent<HTMLDivElement>) { if (event.key === "Escape" && detailOpen) closeDetail(); }

  function purchase(checkout: boolean) {
    if (!variant || !available) return;
    add({ productId: product.id, variantId: variant.id, name, variantLabel: variant.label, image: product.images[0], unitPriceMinor: variant.priceMinor }, actualQuantity);
    if (checkout) openCheckout(); else openCart();
  }
  return <section id="product" className="shine-product section-space" aria-labelledby="product-heading"><div className="shell shine-product-grid">
    <div className="shine-product-stage" data-detail={detailOpen ? "open" : "closed"} onKeyDown={onStageKeyDown}>
      <span className="shine-stage-top" aria-hidden="true">Super Shine</span>
      <span className="shine-stage-glow" aria-hidden="true" />
      <div className="shine-bottle-shift">
        <div className="shine-bottle"><Image src={product.images[0]} alt={name} fill sizes="(max-width: 767px) 72vw, 34vw" quality={90} className="object-contain" /></div>
        <span className="shine-bottle-sweep" aria-hidden="true" />
      </div>
      {pages.length > 0 && <>
        <button ref={triggerRef} type="button" className="shine-stage-trigger" aria-expanded={detailOpen} aria-controls={dossierId} onClick={() => (detailOpen ? closeDetail() : setDetailOpen(true))}>
          <span className="sr-only">{detailOpen ? t.product.detail.close : t.product.detail.open}</span>
          <span className="shine-stage-cue" aria-hidden="true"><span className="shine-stage-cue-ring" />{t.product.detail.cue}</span>
        </button>
        <ProductDossier open={detailOpen} pages={pages} page={page} onPageChange={setRequestedPage} onClose={closeDetail} variants={active} selectedVariantId={variant?.id ?? ""} onSelectVariant={chooseVariant} surfaceTypes={product.surfaceTypes} surfaces={surfaces} steps={steps} usageNote={usageNote} panelId={dossierId} />
      </>}
      <span className="shine-stage-bottom">{lang === "ne" ? "तामा र पित्तलका लागि" : "Copper & brass. Beautiful again."}</span>
    </div>
    <div className="shine-product-copy"><h2 id="product-heading">{name}</h2><p className="shine-description">{lang === "ne" ? t.product.description : product.description}</p>
      <div className="shine-purchase-panel">
        {variant ? <>
          <ProductVariantSelector variants={active} selectedId={variant.id} onSelect={chooseVariant} />
          <div className="shine-price-row"><div><small>{t.product.totalPrice}</small><p className="shine-price">{formatNpr(variant.priceMinor)}</p></div><span className="shine-stock">{available ? t.product.inStock : t.product.outOfStock}</span></div>
          <div className="shine-purchase-actions"><QuantitySelector value={actualQuantity} onChange={setQuantity} max={Math.max(1, Math.min(variant.stock, 99))} disabled={!available} label={t.product.quantity} /><button type="button" className="shine-buy" disabled={!available} onClick={() => purchase(true)}><BagIcon /><span>{available ? t.product.buyNow : t.product.outOfStock}</span>{available && <span className="shine-buy-total">{formatNpr(variant.priceMinor * actualQuantity)}</span>}</button></div>
          <button type="button" className="shine-add-cart" disabled={!available} onClick={() => purchase(false)}>{t.product.addToCart}<span aria-hidden="true"> +</span></button>
        </> : <div className="shine-coming-soon"><p>{lang === "ne" ? "साइज र मूल्य छिट्टै उपलब्ध हुनेछ।" : "Sizes and pricing coming soon."}</p><p>{lang === "ne" ? "उपलब्ध भएपछि यहीँबाट अर्डर गर्न सक्नुहुन्छ।" : "You’ll be able to choose your bottle and order right here."}</p><button className="shine-buy" disabled><BagIcon />{t.product.buyNow}</button></div>}
        <div className="shine-purchase-notes">
          {paymentMethods.some(m => m.enabled && m.kind === "cod") && <span>✓ {t.product.codBadge}</span>}
          {deliveryMethods.some(m => m.enabled) && <span>✓ {t.product.deliveryBadge}</span>}
          <Link href="/track">{lang === "ne" ? "अर्डरको अवस्था हेर्नुहोस्" : "Track an order"}<span aria-hidden="true"> ↗</span></Link>
        </div>
      </div>
    </div>
  </div></section>;
}
