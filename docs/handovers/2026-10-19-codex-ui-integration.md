# Caravan v3.2 — continue UI integration (19 October 2026)

Read `TASKS.md` first. Continue the full authorized task; do not stop at this handover.

## Goal and execution rules

Finish all seven exported-Figma pages and the account-follow-up flow, run typecheck/build/backend/E2E + EN/AR responsive walkthrough, then merge `feat/v32` into local `main` and clean merged inactive worktrees. No push, deployment, prospect contact, paid project-model/provider calls, or loss of unrelated sample CSV/ZIP/MP4 files.

User's latest rules: frontier Sol/Opus only plans/audits; native same-account Codex Skylink Luna6 `gpt-6-luna` at `xhigh` implements/researches/tests, at most2 workers/account. No debate/second-opinion rounds. Tests for new behavior use an implementation-blind `blackbox-tests` worker. Workers take at most3 screenshots at the end; use text state checks otherwise. Save a short handover and continue in a new thread after each merged slice. User authorized continuing with Codex instead of Claude and explicitly required preserving Claude processes.

Settled designs: `.local/figma-frames/index.json` (109 exported PNGs), `.local/ui-brief-common.md`. Figma limits were hit; no new Figma work or fresh design generation needed. Backend-supported UI only; report unsupported frame controls honestly. Read `apps/web/AGENTS.md` and bundled framework docs before UI changes. `.env` has live model settings: always source the fixture gate environment.

## Saved implementation

Integration branch at this handover: `feat/v32`, Home merge `5cff268` (plus the handover commit). Campaigns merge `efafafd` includes event-based replyCandidates and truthful save/count/provenance fixes. Wave1 A1–A8 already integrated.

| Page | Branch / commit | Checkout under `.codex/worktrees/` | State |
|---|---|---|---|
| U1 Home/chat | merged `5cff268` from `c62456c` | removed, sample copies archived | typecheck green; combined browser gate pending |
| U2 Accounts | `v32/u2-takeover` / `b5133e4` | `u2-accounts-takeover` | saved Claude source, needs integration/browser gate |
| U3 Review | `v32/u3-takeover` / `5814561` | `u3-review-takeover` | ready; merges current Campaigns, visible selection, direct export navigation, nullable asset detach;42 focused tests green |
| U4 Campaigns | merged `efafafd` | Codex correction checkout removed |37 focused tests green; in current backend262 gate |
| U5 Brand/company | `v32/u5-takeover` / `3d95ab5` | `u5-brand-takeover` | ready; accurate assignment badges, user-facing pack copy, inherited BrandBook placement preserved |
| U6 Deliverables | `v32/u6-deliverables` / `fec47d6` | `u6-deliverables` | ready, but unconditional profile Holdout test badges in library/canvas still need accurate state after integration |
| U7 Settings | `v32/u7-settings` / `ee9dfcd` | `u7-settings` | ready;7 historical runtime controls passed, combined browser gate pending |

Main independently reran serialized workspace typecheck on U1/U5/U6/U7 successfully on19Oct. U3 worker typecheck passed; main reviewed its diff and ran independent tests. No native worker remains active at handoff.

Original `.claude/worktrees/` remain untouched: U2 `agent-abf5ffed2c5d6ac6d` / b5133e4; U3 `agent-a42eca2b0b0df5e96` /8b11c85 (stale lock); U4 `agent-a166656e6368fd502` /01165c9; U5 `agent-a3b03f5aa5e0aba8e` /8960539. Inventory found no live process referencing these checkouts and no late source changes: U3 and U5 manifest hashes still match `.local/takeover/{u3,u5}/manifest.json`. Never kill an original Claude process. Preserve uncommitted copies before removing any inactive merged checkout. Sample archives from removed Codex U1/U4 checkouts are under `.local/takeover/preserved-*`.

## Verification evidence and known limits

19Oct main fresh owned DB `revenue_resume_20261019`: migrate passed, full current backend suite262/262 in29files passed (`/tmp/resume-backend-tests.log`). U3 focused scorecard/candidate/detach suite42/42 passed (`/tmp/resume-review-regressions.log`). The five new detach tests ran red against the old implementation (3pass/2fail) and green against U3. When U3 is integrated the full count should include those five additional tests.

Main post-Home-merge serialized workspace typecheck passed (`/tmp/resume-integrated-typecheck.log`). Temporary logs from18Oct are absent; do not cite them as newly verified evidence. Historical U7 runtime artifact recorded7 successful Settings checks; its E2E run was incomplete/failing.

Four provisional E2E tests are uncommitted in `.codex/worktrees/v32-ui-tests/e2e/v32-ui.spec.ts`. They were authored blind but never run against the combined UI. A fresh blind Luna tester must adapt selectors/response assumptions using browser/API and existing tests, never implementation. Add Review no-match/filter and failed-reply-label persistence checks if missing. Candidate test duplicate in that checkout is already tracked on main; detach test duplicate is tracked on U3. Do not overwrite the corrected tests with stale copies.

Old browser findings to rerun, not assume fixed: import revision expected changed1 but got0; recurring review timed out; deliverable remained queued; canvas missing before browser closed. Dead/misconfigured queue worker can explain queued/schedule failures but not synchronous import revisions. For import failures inspect row outcomes and Twenty health first; upstream CRM timeout is a hypothesis, not a confirmed code defect. Do not weaken assertions.

## Local services and safe next steps

Main restarted only this project's existing local PostgreSQL/Redis/mailpit/Twenty/Twenty-worker/OpenDesign-a/b containers. PostgreSQL, Redis, mailpit and Twenty were healthy. No app API/web/queue worker session is intentionally left running. Port3100 belongs to CTCHealth: do not touch it. Prefer new app ports3140/4140.

Source `.local/gate-env.sh revenue_resume_20261019` in every app/test session; it sets fixture model/provider modes and DB-derived queue. Set API_PORT4140, API_URL=http://127.0.0.1:4140, WEB_ORIGIN/BETTER_AUTH_URL=http://localhost:3140, WORKER_PORT=0. Root `AGENTS.md` records worker health-port isolation. Keep API/web/worker in separate foreground exec sessions and retain their session IDs. Avoid old gate/stack helpers: they reset databases/stop ports or background children that may be reaped. Do not drop existing data. Fresh owned test database creation/migrations are permitted.

Next: integrate U2,U3,U5,U6,U7 one bounded slice at a time; retain all Campaigns/Home features and all Arabic keys when resolving conflicts. Main has completed the frontier diff audit; fix any concrete new defects only. Seed the owned fixture DB after services are ready; run full typecheck/build/test/E2E and the12-step account follow-up flow in EN/AR, light/dark, desktop/phone using text checks and at most3 final screenshots per worker. Then local-main merge and cleanup. pnpm12.10.1 warning was already given once before local merges; no host Corepack config was claimed fixed. No push/deploy.


## Continuation checkpoint — Accounts and Review integrated

Root `feat/v32` now includes Accounts merge8048a95 and Review merge (worker integrationb2b9009). Both sequential fixture typechecks passed. Accounts sample copies were hash-verified into `.local/takeover/preserved-u2-accounts-takeover/`; merged inactive Codex Accounts and Review checkouts were removed. Original Claude checkouts remain untouched.

U6 correction3fd16ac is ready: badges use actual recorded profile assignments, otherwise “Holdout available.” Native Luna is integrating Brand in its existing checkout; fresh blind Luna is adapting prepared UI tests using only runtime/API on3140. API session22103, worker13695, web36281 use owned DB/queue `revenue_resume_20261019`, fixture modes, WORKER_PORT=0. Seed succeeded; current synthetic workspace names include Basma Advisory and Qimam People. Root samples/ZIP/MP4 remain untouched. User confirmed unattended completion through local main merge; no push/deploy.
