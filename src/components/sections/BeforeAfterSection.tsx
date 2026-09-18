"use client";
import { useState } from "react";
import type { ComparisonEntry } from "@/types";
import { useTranslations } from "@/components/layout/StoreCopyProvider";
import { useLanguage } from "@/lib/store/language";
import { BeforeAfterSlider } from "./BeforeAfterSlider";

export function BeforeAfterSection({ comparisons }: { comparisons: ComparisonEntry[] }) {
  const t = useTranslations();
  const { lang } = useLanguage();
  const [selected, setSelected] = useState(comparisons[0]?.id);
  const entry = comparisons.find(c => c.id === selected) ?? comparisons[0];
  if (!entry) return null;
  return <section id="results" className="shine-results section-space" aria-labelledby="results-heading"><div className="shell shine-results-grid">
    <div className="shine-results-copy"><h2 id="results-heading">{t.results.headline}</h2><p>{t.results.body}</p>
      <div className="shine-comparison-choices" role="group" aria-label={lang === "ne" ? "वस्तु छान्नुहोस्" : "Choose a comparison"}>{comparisons.map(c => <button key={c.id} type="button" aria-pressed={c.id === entry.id} onClick={() => setSelected(c.id)}>{lang === "ne" ? t.results.items[c.id]?.label || c.label : c.label}<span aria-hidden="true">↗</span></button>)}</div>
      <p className="shine-drag-note"><span aria-hidden="true">↔</span>{lang === "ne" ? "स्लाइडर सार्नुहोस् वा एरो कुञ्जी प्रयोग गर्नुहोस्।" : "Move the handle. See both sides."}</p>
    </div>
    <div className="shine-result-frame"><BeforeAfterSlider key={entry.id} entry={entry} /></div>
  </div></section>;
}
