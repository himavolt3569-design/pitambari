"use client";
import Image from "next/image";
import { useState } from "react";
import { useLanguage } from "@/lib/store/language";
import { useTranslations } from "@/components/layout/StoreCopyProvider";
import { HERO_IMAGE, PRODUCT_IMAGE } from "@/config/defaults";
import { BagIcon } from "@/components/commerce/FeaturedProduct";
import { normalizeVideoSource } from "@/lib/content/video";
import type { ComparisonEntry, SiteSettings } from "@/types";

export function HeroSection({ settings, productImage, productName, comparison }: { settings: SiteSettings; productImage?: string; productName?: string; comparison?: ComparisonEntry }) {
  const { lang } = useLanguage(); const t = useTranslations(); const [after, setAfter] = useState(true);
  const hero = lang === "ne" ? t.hero : settings.hero;
  const customImage = settings.hero.image && settings.hero.image !== HERO_IMAGE ? settings.hero.image : null;
  const videoReady = settings.video?.enabled && normalizeVideoSource(settings.video.sourceUrl);
  return <section id="top" className={`shine-hero ${customImage ? "shine-hero-custom" : "shine-hero-interactive"}`} aria-labelledby="hero-heading">
    {customImage && <div className="shine-hero-photo"><Image src={customImage} alt={productName || "Super Shine Pitambari Liquid"} fill priority sizes="100vw" quality={90} /></div>}
    <div className="shell shine-hero-shell"><div className="shine-hero-copy">
      <h1 id="hero-heading">{hero.headline.map((line, i) => <span key={i}>{line}</span>)}</h1>
      <p className="shine-hero-description">{hero.body}</p>
      <div className="shine-hero-actions"><a className="shine-buy" href="#product"><BagIcon /><span>{hero.primaryCta}</span></a><a href={videoReady ? "#video" : "#results"} className="shine-text-link">{videoReady ? (lang === "ne" ? "भिडियो हेर्नुहोस्" : "Watch it work") : hero.secondaryCta}<span aria-hidden="true">{videoReady ? "▷" : "↗"}</span></a></div>
    </div>
    {!customImage && <div className="shine-hero-scene">
      <div className="shine-hero-disc" aria-hidden="true" />
      <div className="shine-hero-bottle"><Image src={productImage || PRODUCT_IMAGE} alt={productName || "Super Shine Pitambari Liquid"} fill priority sizes="(max-width: 767px) 60vw, 28vw" quality={90} className="object-contain" /></div>
      {comparison && <div className="shine-hero-comparison">
        <div className="shine-hero-comparison-image"><Image key={after ? "after" : "before"} src={after ? comparison.afterImage : comparison.beforeImage} alt={`${comparison.label}: ${after ? "after" : "before"}`} fill sizes="(max-width: 767px) 37vw, 19vw" quality={90} className="object-cover" /></div>
        <div className="shine-hero-toggle" role="group" aria-label={lang === "ne" ? "पहिले र पछि हेर्नुहोस्" : "Preview before and after"}><button type="button" aria-pressed={!after} onClick={() => setAfter(false)}>{t.results.before}</button><button type="button" aria-pressed={after} onClick={() => setAfter(true)}>{t.results.after}</button></div>
      </div>}
    </div>}
    </div>
  </section>;
}
