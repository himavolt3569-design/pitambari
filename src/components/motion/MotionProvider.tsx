"use client";
import { useEffect } from "react";

/** Product-led motion only. Nothing is hidden until GSAP has loaded. */
export function MotionProvider() {
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const context = gsap.context(() => {
          gsap.fromTo(".shine-hero-copy", { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: "power3.out", clearProps: "opacity,transform" });
          if (document.querySelector(".shine-hero-photo")) gsap.fromTo(".shine-hero-photo", { scale: 1.035 }, { scale: 1, duration: 1.6, ease: "power2.out" });
          if (document.querySelector(".shine-hero-bottle")) {
            gsap.fromTo(".shine-hero-bottle", { y: 90, scale: .8, rotation: -13, opacity: 0 }, { y: 0, scale: 1, rotation: -7, opacity: 1, duration: 1.2, delay: .15, ease: "power3.out" });
            gsap.to(".shine-hero-bottle img", { yPercent: -12, scale: 1.13, rotation: 10, ease: "none", scrollTrigger: { trigger: ".shine-hero", start: "top top", end: "bottom top", scrub: .7 } });
            gsap.fromTo(".shine-hero-comparison", { y: 35, opacity: 0 }, { y: 0, opacity: 1, duration: .9, delay: .5, ease: "power3.out" });
          }
          const mobile = window.matchMedia("(max-width: 767px)").matches;
          gsap.fromTo(".shine-bottle", { scale: .68, y: mobile ? 65 : 115, rotation: -15 }, {
            scale: mobile ? 1.08 : 1.16, y: mobile ? -10 : -28, rotation: 3,
            ease: "power2.out", scrollTrigger: { trigger: ".shine-product-stage", start: "top 88%", end: "center 48%", scrub: .65, invalidateOnRefresh: true },
          });
          gsap.fromTo(".shine-stage-top", { y: 20, opacity: .12 }, { y: -6, opacity: .35, ease: "none", scrollTrigger: { trigger: ".shine-product-stage", start: "top 88%", end: "center 48%", scrub: .65 } });
          // The detail cue arrives as the stage does. It is visible without this,
          // so the invitation survives a failed animation chunk.
          if (document.querySelector(".shine-stage-cue")) gsap.fromTo(".shine-stage-cue", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .6, ease: "power3.out", scrollTrigger: { trigger: ".shine-product-stage", start: "top 72%" } });
          gsap.fromTo(".shine-story-photo img", { scale: 1.12 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".shine-story", start: "top bottom", end: "bottom top", scrub: .8 } });
        });
        return () => context.revert();
      });
      const refresh = () => ScrollTrigger.refresh();
      window.addEventListener("load", refresh);
      document.fonts.ready.then(() => { if (!cancelled) refresh(); });
      cleanup = () => { window.removeEventListener("load", refresh); media.revert(); };
    }).catch(() => { /* The complete static page remains usable if animation chunks fail. */ });
    return () => { cancelled = true; cleanup?.(); };
  }, []);
  return null;
}
