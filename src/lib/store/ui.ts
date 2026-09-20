"use client";

import { create } from "zustand";

type Surface = "cart" | "checkout" | "menu" | null;

interface UiState {
  surface: Surface;
  /**
   * Bumped each time a product image sends someone to the purchase panel. The
   * panel watches a counter rather than a boolean so a second tap replays the
   * arrival cue instead of finding the flag already raised.
   */
  purchaseCue: number;
  openCart: () => void;
  openCheckout: () => void;
  openMenu: () => void;
  focusPurchase: () => void;
  close: () => void;
}

/** Only one overlay is ever open, which keeps focus management unambiguous. */
export const useUi = create<UiState>()((set) => ({
  surface: null,
  purchaseCue: 0,
  openCart: () => set({ surface: "cart" }),
  openCheckout: () => set({ surface: "checkout" }),
  openMenu: () => set({ surface: "menu" }),
  focusPurchase: () => set((s) => ({ purchaseCue: s.purchaseCue + 1 })),
  close: () => set({ surface: null }),
}));
