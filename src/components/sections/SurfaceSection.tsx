"use client";
import Image from "next/image";
import type { SurfaceEntry } from "@/types";
import { useLanguage } from "@/lib/store/language";
import { useTranslations } from "@/components/layout/StoreCopyProvider";
export function SurfaceSection({ surfaces }: { surfaces: SurfaceEntry[] }) {
  const { lang } = useLanguage(); const t = useTranslations();
  if (!surfaces.length) return null;
  return <section id="surfaces" className="shine-surfaces section-space"><div className="shell"><div className="shine-section-heading"><h2>{t.surfaces.headline}</h2><p>{t.surfaces.body}</p></div><ul className="shine-metals">{surfaces.map(s => <li key={s.id}>
    {s.image && <div className="shine-metal-image"><Image src={s.image} alt={s.name} fill sizes="(max-width: 767px) 90vw, 44vw" className="object-cover" /></div>}
    <div><h3>{lang === "ne" ? t.surfaces.items[s.id]?.name || s.name : s.name}</h3><p>{lang === "ne" ? t.surfaces.items[s.id]?.body || s.body : s.body}</p></div>
  </li>)}</ul></div></section>;
}
