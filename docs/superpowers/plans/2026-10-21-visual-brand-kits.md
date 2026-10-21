# Visual brand kits and immediate creation implementation plan

> For agentic workers: execute the bounded tasks below using native Codex Skylink Luna xhigh workers; controller plans, reviews and integrates. Preserve the owner's no-extra-review-round preference.

**Goal:** reuse actual brand media in generated content and remove the extra Send from explicit creation actions.

**Architecture:** extend existing brand JSON and Storage; embed images in trusted saved output; direct explicit creation through the existing chat controller with captured context and a synchronous guard.

**Tech stack:** existing TypeScript/React/Next, Zod, workspace Storage, trusted HTML renderers and Playwright.

**Spec:** ../specs/2026-10-21-visual-brand-kits-design.md

## Global constraints

Only Sarafa Pay, Wasla Express and Ruwad Learning receive generated demo kits. Preserve all other company data. No source image bytes in model prompts. Preserve email HTTPS-only image rules and manual composer behavior. Tests use fixture models, WORKER_PORT=0, and a unique queue; live sender providers stay disabled. No push/deploy/reset/global seed.

## Review focus

- Double clicks and navigation must not start duplicate or context-free turns.
- Saving a company name/color must retain saved gallery references.
- A media key cannot escape its workspace or storage directory.
- Saved PDF/PNG output must contain real image pixels without network access.
- Missing images and old brand JSON must still render useful content.

## Bounded tasks

- [ ] Generate assets: nine photo assets, three vector logos, and a prompt/provenance manifest under packages/backend/assets/brand-kits. Use built-in imagegen for photos; one Sarafa hero already exists under the controller's .local/generated-brand-kits. Optimize image files without altering composition.
- [ ] Add the brand media contract, preservation semantics and authorized image reads in packages/contracts/src/index.ts, packages/backend/src/workspace.ts and apps/api/src/main.ts, reusing packages/backend/src/storage.ts. Include a targeted idempotent three-kit importer and demo-data metadata; no Prisma migration/global seeding.
- [ ] Embed media only at rendering time in packages/backend/src/formats/shared.ts, formats/index.ts, formats/slides.ts, formats/flipbook.ts and asset-template.ts plus the workflow integration. Keep the AI content context small; preserve existing email behavior. Check standalone HTML, PDF and PNG.
- [ ] Fix the explicit creation handoff in workspace-context.tsx, page.tsx, screens/AssetStudio.tsx and chat controller/Launcher paths. Add the synchronous pending guard; keep manual/prefill-only uses distinct. Black-box tests precede implementation.
- [ ] Show the kit in BrandBook, Accounts/account detail and Launcher, using shared contract-derived types and existing UI styles/i18n. Separate client brand imagery from actual prospect identity; failed icons fall back cleanly.
- [ ] Run relevant behavior tests, workspace typecheck, production build and complete browser suite. Review actual generated artifacts plus EN/AR desktop/phone. Commit focused changes, merge locally and remove newly merged owned worktrees after preservation checks; keep branches.
