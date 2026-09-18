"use client";
import type { Benefit } from "@/types";
import { useLanguage } from "@/lib/store/language";
import { useTranslations } from "@/components/layout/StoreCopyProvider";
export function BenefitsSection({ benefits }: { benefits: Benefit[] }) {
  const { lang } = useLanguage(); const t = useTranslations();
  return <section id="benefits" className="shine-benefits" aria-label={t.benefits.headline}><div className="shell"><ul>{benefits.map((b, i) => <li key={b.id}>
    <svg viewBox="0 0 40 40" aria-hidden="true">{i === 0 ? <><ellipse cx="20" cy="20" rx="14" ry="10"/><ellipse cx="20" cy="20" rx="9" ry="6"/><path d="M6 20v5c0 6 28 6 28 0v-5"/></> : i === 1 ? <><path d="M15 8h10v7l4 6v13H11V21l4-6V8Z"/><path d="M16 5h8M12 24h16"/></> : <><path d="m7 12 18-5 8 21-19 5-7-21Z"/><path d="m12 15 13-4M15 26l12-4"/></>}</svg>
    <div><h2>{lang === "ne" ? t.benefits.items[b.id]?.title || b.title : b.title}</h2><p>{lang === "ne" ? t.benefits.items[b.id]?.body || b.body : b.body}</p></div>
  </li>)}</ul></div></section>;
}
