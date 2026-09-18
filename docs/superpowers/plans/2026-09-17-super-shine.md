# Super Shine implementation plan

**Goal:** Adapt the complete reference application into a distinct Super Shine store with admin-owned catalogue and video.

**Architecture:** Reuse the existing Next.js/Firebase commerce boundaries. Replace product-specific defaults, translations, imagery and storefront composition. Add video configuration through the existing authenticated settings flow.

**Tech stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Firebase, Zustand, Vitest.

**Spec:** ../specs/2026-09-17-super-shine-design.md

## Constraints

- No copied live credentials or customer records.
- No preset prices or bottle sizes; superadmin creates them.
- Preserve server-authoritative pricing, stock transactions, manual payment verification and order lifecycle.
- Responsive layout, keyboard access and reduced-motion support.

## Deliverables

- [ ] Read and audit reference source by storefront, commerce and admin domains; save audit notes.
- [ ] Copy reusable source and configuration; replace brand defaults, translations, storage identifiers and assets.
- [ ] Implement catalogue readiness and admin variant creation with meaningful validation tests.
- [ ] Build photograph-led hero, unified purchase panel, comparisons, use instructions and mobile purchase shortcut.
- [ ] Add validated video sources, admin controls, player and CSP; test malformed and hostile URLs.
- [ ] Run existing tests, lint, types and production build; inspect desktop/mobile and verify interactions.
- [ ] Document local startup, Firebase setup, video choices and launch requirements.
