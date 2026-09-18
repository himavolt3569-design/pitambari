"use client";
import { useTranslations } from "@/components/layout/StoreCopyProvider";
import { BagIcon } from "@/components/commerce/FeaturedProduct";
export function FinalCTA() {
  const t = useTranslations();
  return <section className="shine-closing"><div className="shell"><h2>{t.cta.headline}</h2><a href="#product" className="shine-buy shine-buy-light"><BagIcon />{t.cta.button}</a></div></section>;
}
