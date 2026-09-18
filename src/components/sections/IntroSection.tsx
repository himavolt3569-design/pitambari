"use client";
import Image from "next/image";
import type { SiteSettings } from "@/types";
import { useLanguage } from "@/lib/store/language";
import { useTranslations } from "@/components/layout/StoreCopyProvider";
import { INTRO_IMAGE } from "@/config/defaults";
export function IntroSection({ settings }: { settings: SiteSettings }) {
  const { lang } = useLanguage(); const t = useTranslations(); const intro = lang === "ne" ? t.intro : settings.intro;
  return <section className="shine-story"><div className="shine-story-photo"><Image src={settings.intro.image || INTRO_IMAGE} alt="Super Shine Pitambari Liquid beside a hammered copper bowl in warm daylight" fill sizes="(max-width: 767px) 100vw, 50vw" className="object-cover" /></div><div className="shine-story-copy"><h2>{intro.headline}</h2><p>{intro.body}</p><a className="shine-text-link" href="#product">{t.cta.button}<span aria-hidden="true">↗</span></a></div></section>;
}
