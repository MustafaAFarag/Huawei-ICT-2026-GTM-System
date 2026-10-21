# Visual brand kits — handover (22 October 2026)

Start here next session. Plan: `docs/superpowers/plans/2026-10-21-visual-brand-kits.md`; progress: `TASKS.md` (top section).

## Done

- Kits for Sarafa Pay, Wasla Express, Ruwad Learning (d164fce) and private media storage/API (3c250f1).
- Immediate creation from Deliverables and the account assistant (ba7f486, 50532a2).
- Renderer **adb1fa3** (work/visual-brand-data): saved logo/gallery bytes embedded in carousels, flipbooks, profiles and one-pagers after model generation; email unchanged. brand-media 3/3 + brand-render 2/2 pass on API 4142.
- Integration branch **work/brand-kit-ui** (`.local/worktrees/brand-kit-ui`) merges data, renderer, immediate creation and all test branches (704cf20).

## In progress

- Brand kit UI (BrandBook gallery + "Update brand" dialog that saves only changed fields, account/Nabil brand-context labels, AR phone fallback) by a Sonnet worker on work/brand-kit-ui. Check `git log work/brand-kit-ui` for its commits; target `e2e/brand-kit-ui.spec.ts` 4/4.

## Next

1. Review the worker diff on work/brand-kit-ui; rerun brand-kit-ui + brand-media specs and web typecheck.
2. Full browser suite, production build, EN/AR desktop/phone check of Brand & company and a generated asset.
3. Merge work/brand-kit-ui into feat/visual-brand-foundations, then fast-forward local main; rebuild and restart web 3140.
4. Remove merged `.local/worktrees/*` checkouts (keep branches).

## Test stack (does not survive a reboot)

API 4142 + worker from `.local/worktrees/visual-brand-data` (queue `revenue-brand-foundation-20261022`, fixture models, WEB_ORIGIN 3172); web `next dev --port 3172` from the brand-kit-ui checkout with `API_URL=http://127.0.0.1:4142`. Render specs need `MODEL_MODE=fixture PROVIDER_MODE=fixture`; copy `.local/verification-20261022-brand-render/playwright.config.mjs` into the test checkout to avoid a duplicate @playwright/test load. App on 3140 runs live models (owner request, 21 Oct).
