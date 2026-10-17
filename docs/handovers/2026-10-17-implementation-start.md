# Handoff: start implementing the agreed Caravan design and v3.2 features

## Resume instruction

Start implementing in the application what was agreed and designed on 17 October 2026:
- the Figma redesign (pages 00–11);
- the v3.2 account follow-up flow (page 12);
- the PRD v3.2 amendments A1–A8;
- the Route C logo.

**None of these exists in the application yet.** Application source has not changed since the design work started.

Before writing code:

1. Read `TASKS.md` and this file.
2. State the goal, the definition of "done" and the stop condition for the first slice (see the proposed slices below).
3. Ask the owner once which implementer lane and account to use, unless they have already named one. Global rule: the owner names the lane. Do not default to one.
   - The main session plans, briefs single tasks, reviews diffs and merges.
   - Use one brief per task, each in its own worktree and branch. Remove each worktree after it is merged.
4. New behaviour gets tests from a black-box tester (`blackbox-tests` skill / `hub-tester` agent). Give the tester the spec and acceptance criteria, never the diff.

Workspace: `/mnt/ssd/Personal Projects/Huawei ICT 2026/gtm-command-center` (pnpm 12.10.1 monorepo: `apps/api`, `apps/web`, `apps/worker`, `packages/backend`, `contracts`, `database`, `ui`).

## What is settled (do not reopen)

- **Positioning (D22).** The category is small B2B services firms selling across borders. The first cohort is founder-led Egypt HR-services firms selling into the GCC, trigger-defined, with at most five BD people. The public verb is "follow up", not "outreach". The switch rule is in research 16.
- **Product boundary.**
  - Caravan does not discover companies, enrich contacts live or send. The live guards in `providers.ts` and `workflows.ts` stay.
  - Spending runs within reserved caps. Sending waits for human approval. Do not add per-action cost confirmations.
- **Logo.** Route C. Source of truth is `docs/brand/route-c/` (17 SVGs, `spec.json`, `README.md` with the animation timings). Do not redraw it.
- **Design.** The Figma file `XQYMm6aLF8AVUAFje7CpuK` is the reference. The logo is already applied to all of its pages.

## Read these first

1. `docs/prd/REVENUE_WORKSPACE_PRD_v3.md` (v3.2): D22; requirements PK-01, EXP-01, STU-09; and the amended SCR-01/02, PB-01, GAP-04/07/12, CMP-01/02/05 and SEQ-08. Also read §10 measures and the §11 plan.
2. `docs/research/16-positioning-debate-and-prd-amendments.md`: the A1–A8 table with exact acceptance tests, the switch rule and the code locations.
3. `docs/design/figma-redesign-delivery.md`: what each Figma page covers, including the v3.2 section.
4. `docs/brand/route-c/README.md`: logo geometry, files and animation.
5. `docs/research/14-caravan-business-implementation-audit.md`: code-backed gaps.

## Figma references

- [Cover](https://www.figma.com/design/XQYMm6aLF8AVUAFje7CpuK?node-id=15-6321).
- [Walkthrough](https://www.figma.com/proto/XQYMm6aLF8AVUAFje7CpuK?node-id=17-12&starting-point-node-id=17-12&scaling=contain).
- [Page 12, v3.2 account follow-up](https://www.figma.com/design/XQYMm6aLF8AVUAFje7CpuK?node-id=32-11) and [its walkthrough](https://www.figma.com/proto/XQYMm6aLF8AVUAFje7CpuK?node-id=40-9917&starting-point-node-id=40-9917&scaling=contain).
- [Page 13, logo](https://www.figma.com/design/XQYMm6aLF8AVUAFje7CpuK/?node-id=52-14). Component IDs are in `.local/logo-gen/figma/state.json`.

Local screenshots, useful when no Figma connector is available:
- `.local/figma-v32/` for the v3.2 flow.
- `.local/logo-gen/figma/` for the logo page.
- `.local/logo-gen/figma/apply/` for 209 frames showing the logo in place.
- `.local/figma-redesign/` for the original redesign.

Figma access:
- **This Skylink session's claude.ai Figma connector now reports that it needs authentication.**
- Lara's connector worked on 17 October. Run it with `CLAUDE_CONFIG_DIR=$HOME/.claude-lara claude -p ...` directly; the relay disables connectors.
- Load the `figma-house-rules` skill before any Figma call.

## Bugs already found (fix early; acceptance tests in research 16)

- **A3:** the review schema silently defaults the country to `EG` and allows only EG/SA/AE (`workspace.ts:683`, `policy.ts:129`). All six GCC countries must be representable, and any country without a reviewed rule stays blocked.
- **A4:** `reviewProspect` cancels simulated sequences, and simulated events then leak into the funnel. The scorecard does not filter by state, batch or date (`gtm-service.ts:305`).
- **A1:** `score` ignores Arabic titles ("CEO" scores 100, "الرئيس التنفيذي" scores 70) and fixes the size band at 1–200 staff (`policy.ts:45`).
- **A8 code part:** the kit HTML (`gtm-service.ts`, around line 425) still has the old "every cost" wording.

## Proposed slices (one brief each, in order; confirm with the owner)

| # | Slice | Done when |
| --- | --- | --- |
| 1 | Logo in the app: favicon, sidebar and header wordmark, sign-in lockup, Arabic lockup in RTL, reversed version in dark mode | Visible in `pnpm dev` in light, dark and Arabic; Playwright screenshots checked; `prefers-reduced-motion` respected if animated |
| 2 | A3 country fix + A8 kit wording + rename the "Find accounts" starter to "Rank my accounts" | Research 16 A3/A8 tests pass; existing tests green |
| 3 | A1 workspace rubric + Arabic role parity | A1 acceptance tests pass |
| 4 | A2 workflow packs as data (HR pack + generic fallback) | A generic workspace gets no payroll questions; HR pack tests unchanged |
| 5 | A4 batch/provenance/scorecard | Simulated events excluded by default; stage counts are distinct prospects; filter by batch and date |
| 6 | A5 approved-batch export and outcome import | Export holds only approved, basis-cleared drafts with digests; imported outcomes marked `imported` |
| 7 | A6 capability profile (EN/AR, RTL) | Built from approved proof only; holdout badge |
| 8+ | UI redesign per Figma, page by page: shell/sidebar, Home, Accounts, Review, Campaigns, Brand & company, Deliverables, Settings | Each page matches its Figma frames at desktop, phone and Arabic; four UI states (loading, empty, error, success) present |

Split slices 3–8 further if one brief would touch more than a few files.

## Constraints

- Do not push, deploy or contact prospects unless the owner asks. Synthetic data only.
- Do not use paid project-model generation without the owner's approval.
- Azure is the project's Azure for Students subscription only: `AZURE_CONFIG_DIR=$PWD/.local/azure-cli`. Never use the ctcHealth company subscription.
- Before any push, the repo uses `packageManager: pnpm@12.10.1`. Warn once about Vercel/Corepack and Docker images (global pnpm migration rule).
- Preserve these unrelated local files:
  - edits to `samples/email-ar.csv` and `samples/email-en.csv`;
  - the untracked `strobi-avatar.zip`;
  - the untracked `Really Good Product Launch , we do something like it.mp4`.
- Keep private GTM source contacts and identities out of committed files.
- The Arabic logo "كارافان" still needs native review, and the name needs a trademark search before public use. Neither blocks local implementation.

## Commits at handoff

All local; nothing is pushed. The latest is `e45d55b`. The design and logo work is `28f793d`..`e45d55b`.
