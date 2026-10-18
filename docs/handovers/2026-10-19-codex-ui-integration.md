# v3.2 UI integration — continuation after the merged page slice

## Goal and authorization

Finish the complete authorized task: verify v3.2 A1–A8 and exported Figma UI integration, fix confirmed defects, then merge `feat/v32` into **local main**. No push/deploy, paid project-model/provider calls, outreach, destructive data operations or loss of root sample CSV/ZIP/MP4. User confirmed: “continue, i will leave you unattended to finish all.” Ordinary local fixes/tests/commits/merges are authorized. This is a continuation, not a new review round.

User explicitly requires a short handover and a fresh thread after a merged slice. The combined U2/U3/U5/U6/U7 integration slice is finished; the prior controller has stopped checkout work and all native workers are completed. Continue the remaining verification through local-main merge unattended.

## Current root and saved work

Root checkout: `/mnt/ssd/Personal Projects/Huawei ICT 2026/gtm-command-center`, branch `feat/v32`, latest implementation/test commit **1b7f2f3** (plus this documentation checkpoint). All pages are integrated:

| Area | Root merge / evidence |
|---|---|
| U0 shell |8b11c85|
| U1 Home/chat |5cff268|
| U2 Accounts |8048a95; worker integrationc2c08c1|
| U3 Review |3a3fe24; worker integrationb2b9009; nullable detach + direct export navigation|
| U4 Campaigns |efafafd; event-derived reply candidates + truthful save/count/provenance|
| U5 Brand/company |42f8fcb; worker integration20b2958; truthful assignment counts/pack copy|
| U6 Deliverables |ac40dd9; worker integration72e9d35; correction3fd16ac uses actual profile assignments, otherwise “Holdout available”|
| U7 Settings |84c1db3; worker integration56ab583|

Original saved worker diffs were already frontier-audited. Current controller audited the holdout correction and integration deltas. Shared Arabic duplicate keys found by TypeScript were removed; corrected page components were preserved. No debates or extra second-opinion rounds. Do not invent a mandatory missing-bucket policy gate: backend Ready policy does not require a set bucket.

Figma source:109 exported PNGs in ignored `.local/figma-frames/index.json`; `.local/ui-brief-common.md` is historical and its reset/stop helpers/screenshots instructions are overridden below. No new design/Figma work needed. Read `apps/web/AGENTS.md` and bundled framework docs before UI changes.

## Verified gates and known failures

- Combined serialized workspace typecheck passed after all U7/page integrations. Worker command: source fixture gate, Prisma generate if needed, `pnpm -r --workspace-concurrency=1 --if-present typecheck`.
- Fresh full backend **267/267 tests in30files**, exit0; `/tmp/resume-final-backend.log` (82.48s). Use a DIFFERENT test `QUEUE_NAME` from any running app worker. First shared-queue attempt266/267 hit `Job ... could not be removed because it is locked by another worker`; `/tmp/resume-final-backend-attempt1.log`. Isolated test queue `revenue-final-backend-20261019` passed without source/test changes. Requirement added to root `AGENTS.md`.
- Browser gate is **not passing yet**. Latest blind test checkpointf878c00 was cherry-picked into root as **1b7f2f3**, adding `e2e/v32-ui.spec.ts`. No test worker remains active. Last focused A1–A3 run: **0pass/3timeouts** on stale navigation/role locators (120s), with cleanup PATCH timeouts after test timeout. Latest selector adaptations are unrun. Do not count them as a product pass or proven product defect.
- All newly imported rows in that run logged `state=imported`, `change=added`, and persisted non-null CRM person IDs. Fixture health200. Historical **import revision changed0** remains unresolved until the full original suite is rerun; if reproduced inspect full row outcomes and Twenty health before source changes. A dead queue worker cannot explain synchronous import.

## Blind tester continuation details

Use a FRESH native Luna tester, `fork_turns:none`, with `blackbox-tests`; give public acceptance/docs/runtime/tests only. Never implementation/diffs/src/app/lib/components. It may read existing tests and use real browser/API. Do not weaken assertions or change expected values merely to pass.

Current tests still need adaptation through runtime:

1. Workspace seed now has **Qimam People**, **Basma Advisory**, etc., not old Revenue Demo B. Inspect `/api/me`. Email is searchable but Accounts rows render company rather than email; checkpoint helper searches email and locates the unique API-verified company row. Reload/wait for selected workspace hydration after external API import.
2. Account detail uses **buttons**, including `Fit & policy` and `Discovery`; Accounts `Rubric` is also a button. Latest checkpoint fixes some role paths, unrun.
3. `Fit & policy` exposes `Save policy` and `Record basis evidence`. Evidence dialog labels: `Source (URL or note)`, `Date`, `Recorded by`, `Consent timestamp`; buttons `Save evidence`, `Cancel`. **savePolicy helper still uses stale `Save evidence and policy` and old success status.** Adapt without weakening persisted policy/evidence assertions.
4. Discovery opens via button `Discovery`, then `Capture answers from a discovery call` reveals Notes and `Save interview`.
5. Anonymous APIRequest contexts need **explicit empty storageState** because configured auth can otherwise be inherited. Preserve `/api/me`401 and rubric401 checks. No passing anonymous check was reached yet.

Still required: finish/run all four prepared acceptance cases (rubric persistence/reset/auth; generic discovery/Arabic phone; country/basis persistence; approved export/outcomes/scorecard), run all original16 E2E and adapt labels via runtime where necessary. Add/run Review search/filter no-match (no hidden selected draft/approval action), failed reply-label persistence (failure visible, unchanged API state), and truthful profile badges for none/recorded assignments. Then12-step account follow-up walkthrough in EN/AR, desktop/phone, light/dark. Use DOM/text geometry/state checks during work; maximum3 screenshots **at the end** per worker (zero captured so far).

## Runtime and safe execution

No app API/web/worker remains running from the prior controller: only its owned PIDs258475/258564/236858 were stopped after the tester drained. Ports3140/4140 confirmed free. Foreground session IDs from the old thread are no longer needed. Local Postgres/Redis/mailpit/Twenty/Twenty-worker/OpenDesign dependencies were running; check health read-only if needed.

Owned migrated/seeded fixture DB: **revenue_resume_20261019**. No reset/drop/seed required. Source `.local/gate-env.sh revenue_resume_20261019` in **every** API/web/worker/test/build session; it overrides live `.env` model/provider settings with fixture modes. Use API_PORT4140, API_URL=http://127.0.0.1:4140, WEB_ORIGIN/BETTER_AUTH_URL=http://localhost:3140, WORKER_PORT=0. API/web/worker must share the DB-derived app queue. Full backend tests need their own queue (above).

Use separate retained **foreground exec sessions** for API/web/worker. Old nohup helper children were reaped; old helpers may reset DBs/stop ports—avoid. **Port3100 belongs to CTCHealth; do not touch.** Build is still pending, so start with the fixture production build while web is stopped, then start the built web on3140 for browser verification. Run final typecheck if build generates changed route types. Fix real defects with Luna and recheck the affected gates. No unrelated test broadening.

## Workers and preservation

Frontier Sol/Opus only plan/audit. SAME ACCOUNT Codex Skylink native workers must use **gpt-6-luna xhigh**, maximum2 active; use native collaboration, never CLI/Hub substitution. Discover live T3 catalog before selecting models. One bounded task/checkout at a time. Tests for new behavior come from the blind tester. Preserve original Claude processes/checkouts; project inventory found none active, but unrelated projects may be active—never broad-kill.

All merged inactive Codex page checkouts and the saved test checkout have been removed; branches preserved. Modified sample copies and untracked old test duplicates were hash-verified into `.local/takeover/preserved-*` before removal. `git worktree list` now has root plus the original four `.claude/worktrees/`; keep those original source checkouts intact (including the locked U3 one). Root unrelated edits remain: `samples/email-ar.csv`, `samples/email-en.csv`, untracked `strobi-avatar.zip`, untracked `Really Good Product Launch , we do something like it.mp4`. Do not stage/delete them.

Before finishing: review own diff, verify actual production artifact and flows, update TASKS, merge to local main, preserve branches, remove any newly merged inactive Codex worktrees after archiving unrelated copies and run `git worktree list`/prune. pnpm12.10.1 deployment warning already given once; no host configuration claimed fixed. No push/deploy.
