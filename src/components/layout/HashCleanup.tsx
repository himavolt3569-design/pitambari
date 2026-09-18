"use client";
import { useEffect } from "react";

/**
 * Every in-page CTA is a plain anchor (#product, #results, #faq, #top ...), so
 * the browser parks that fragment in the address bar and leaves it there. A
 * reload then re-resolves it and skips the hero entirely, and any URL copied
 * after a CTA click does the same thing to whoever it is shared with.
 *
 * Strip the fragment once the scroll it started has settled. The jump still
 * happens, the smooth scroll still runs to completion, and the address bar
 * goes back to "/".
 */
export function HashCleanup() {
  useEffect(() => {
    // The skip link is assistive navigation, not a CTA: leave it be.
    const KEEP = "#main";
    let timer: number | undefined;

    const strip = () => {
      const { hash, pathname, search } = window.location;
      if (!hash || hash === KEEP) return;
      // Next patches replaceState and merges its own router state back in, so
      // passing null here keeps client navigation intact.
      window.history.replaceState(null, "", pathname + search);
    };

    // Debounced: a smooth scroll fires continuously, and rewriting the URL
    // mid-flight loses the fragment the browser is still aiming at.
    const settle = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(strip, 150);
    };

    const onScroll = () => { if (window.location.hash) settle(); };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", settle);

    // A direct hit on "/#product" gets the same treatment, but only after load:
    // until then images and fonts are still pushing the layout around and the
    // browser keeps re-aiming at the anchor.
    if (window.location.hash) {
      if (document.readyState === "complete") settle();
      else window.addEventListener("load", settle, { once: true });
    }

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", settle);
      window.removeEventListener("load", settle);
    };
  }, []);

  return null;
}
