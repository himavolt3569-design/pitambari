"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "@/components/layout/StoreCopyProvider";
import { useLanguage } from "@/lib/store/language";
import { useUi } from "@/lib/store/ui";
import { formatNpr } from "@/lib/utils/money";
import { BagIcon } from "./FeaturedProduct";
import type { Product } from "@/types";
export function MobilePurchase({ product }: { product: Product }) {
  const [visible, setVisible] = useState(false); const surface = useUi(s => s.surface);
  const t = useTranslations(); const { lang } = useLanguage();
  const variants = product.active ? product.variants.filter(v => v.active && v.stock > 0 && v.priceMinor > 0) : [];
  const cheapest = variants.length ? Math.min(...variants.map(v => v.priceMinor)) : null;
  useEffect(() => { const el = document.getElementById("product"); if (!el) return; const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0.05 }); observer.observe(el); return () => observer.disconnect(); }, []);
  if (!visible || surface) return null;
  return <div className="shine-mobile-purchase"><div><strong>Super Shine</strong><small>{cheapest === null ? (lang === "ne" ? "छिट्टै उपलब्ध" : "Coming soon") : `${lang === "ne" ? "देखि " : "From "}${formatNpr(cheapest)}`}</small></div><a href="#product" className="shine-buy"><BagIcon />{t.nav.buyNow}</a></div>;
}
