# GTM Campaign Command Center

> **Current product direction:** [Revenue Workspace PRD v3](docs/prd/REVENUE_WORKSPACE_PRD_v3.md) (13 Oct 2026). v2 and v1 are kept as history.

## Current task — PRD v3 from owner decisions + second research round (started 2026-10-13)

Goal: apply the product owner's 13 Oct answers to the v2 proposals; research the latest Huawei rules, freemium pricing, market data, building blocks (incl. Agent-Reach) and non-technical user pain; write PRD v3 with the full feature catalogue.
Done when: reports 06–10 exist with sources; key claims spot-checked; PRD v3 written (decisions, competition rules, business model, plays, Asset Studio, architecture, pushback, plan, catalogue); pointers updated; committed locally.
Stop: documentation only. No code, provisioning, outreach, credit-spending calls or push.

- [x] Record owner decisions (memory + PRD v3 §1).
- [x] Research (5 Sonnet subagents): 06 Huawei 2026–27 rules, 07 pricing/freemium, 08 market data, 09 building blocks + Agent-Reach, 10 user pain + out-of-box.
- [x] Spot checks: 2026–27 Manual quote (PDF), Northern Africa topic page (browser), Agent-Reach / linkedin-mcp-server READMEs, n8n and Twenty licences, OpenDesign release.
- [x] Write PRD v3; supersede notes on v2 and report 05; README/STATUS/PRD README/research README pointers; `.playwright-mcp/` ignored.

Decisions settled 13 Oct (owner): English default + Arabic content; freemium; full catalogue kept, outbound loop first; Azure build; team eligibility confirmed; no Lara follow-ups; OpenDesign Asset Studio is a major pillar; compliance gates in.
New facts that change an owner decision: 2026–27 regional topic requires deployment on Huawei Cloud (≥1 service) and open-sourcing if shortlisted (PRD v3 D4, D15, D17, §2).
Proposed, awaiting owner: D7 (Agent-Reach not in product; internal/local opt-in only), D11 (hybrid credits + BYOK), D17 (open-core), tier prices in §4.2.
Next (needs the owner): confirm D7/D11/D17 and tiers; contact Huawei Egypt with the §12 questions; register the team; open a Huawei Cloud account; name 5–10 interviewees.

## Previous task — PRD v2 from Lara meeting + deep research (2026-10-12)

Goal: turn the Lara meeting (actual GTM process) and web research into an updated, challenged PRD.
Done when: five research reports exist in `docs/research/` with sources; PRD v2 written with the meeting's process, connector layer, AI role, pushback and changed decisions flagged for the user; v1 kept as history; README pointers updated; committed locally.
Stop: documentation only. No code, provisioning, outreach, credit-spending tool calls or push.

- [x] Read transcript, PRD v1 and meeting analysis PDF.
- [x] Research (5 Sonnet subagents): 01 GTM process + AI, 02 competitors, 03 connectors/APIs, 04 MENA market/regulation/Arabic AI, 05 Huawei ICT competition + cloud.
- [x] Verify research reports: spot-checked Huawei brief, Egypt PDPL, Saudi draft, Saudi benchmark, Twenty RTL. One correction made in report 04 (Saudi Art. 28 consent already in force).
- [x] Write `docs/prd/REVENUE_WORKSPACE_PRD_v2.md`; update PRD README, v1 supersede note, README/STATUS pointers; commit.

Next (needs the user): confirm D1–D12 in PRD v2 §1; answer §11 open questions (roster eligibility, Saudi reviewers, sandbox accounts, Lara follow-ups, legal opinion); get the 2026–27 rulebook and Egypt dates from Huawei Egypt.

Decisions reopened by the meeting and research (proposed in PRD v2 §1, need user confirmation): English-only → Arabic content + English UI; users → founder-led teams 1–10 and small agencies (solopreneurs = free tier); all-modules scope → outbound loop first; Azure demo → Huawei Cloud demo path (ModelArts MaaS, OBS, ECS).

## Previous documentation task — Revenue Workspace PRD v1

- [x] Write the expanded English-only PRD with 112 feature requirements and acceptance criteria.
- [x] Define persistent assistant context/navigation/actions, Twenty reuse and OpenDesign integration.
- [x] Define phase gates and all phases on Azure / conditional post-qualification Huawei migration.
- [x] Review feature coverage, Markdown tables, local links and documentation-only changes.
- [x] Complete documentation; no application changes, provisioning, deployment or outreach.

## Historical prototype work

Goal: implement the supplied Eight-week MVP plan in an isolated product directory.
Full done criteria: native Twenty workflow in two client workspaces; approved-evidence bilingual campaigns; four OpenDesign assets; reconciled exports/execution events; independent held-out AI evaluation on verified compute; rehearsed success and exception paths.
Stop: no deployment, live outreach or push without separate authorization.

## Implemented and verified local slice

- [x] Persistent client-scoped import/evidence/offer/campaign/action/event state machine.
- [x] Arabic/English review interface, client offers/brand editing, all three sequence touches visible for approval.
- [x] Four editable isolated HTML assets, deterministic QR, actual-record charts, bilingual CSV/XLSX and provider preparation fixtures.
- [x] Duplicate/exclusion/approval/collision/reply/failure acceptance coverage and own-diff review.
- [x] 48 local tests; 16 Playwright replay mutations; six tabs × two directions × desktop/phone; offline preview and Arabic Chromium print checks.
- [x] Twenty objects/relations/role/sidebar/native read-only overview source; TypeScript syntax and metadata structure checked.
- [x] Synthetic 80-pack / 480-empty-label scaffold, rules/embedding/reranker predictors and bounded training/evaluation entry points.
- [x] Sample deliverables, run guide and explicit implementation/verification limitations.

## Unfinished full-plan requirements

- [ ] Actual Twenty SDK build/install; native campaign mutation UI, existing contact/task mapping and workspace permission tests.
- [ ] OpenDesign release pin/runtime/full token guard.
- [ ] Curated company packs, independent reviewers/adjudication and held-out neural/retrieval/generation evaluation.
- [ ] ModelArts region/compute/model verification (Azure fallback if needed).
- [ ] Approved provider capability checks and paused live draft if an account becomes available.
- [ ] Running-server transport verification outside the socket-restricted environment.

Blockers: npm `EAI_AGAIN registry.npmjs.org`; Docker API permission denied; Node 22.23.3 vs Twenty's 24.5+ prerequisite; server socket `PermissionError: [Errno 1] Operation not permitted`; model weights, human labels and approved cloud/provider accounts unavailable.
Decisions: original synthetic fixture data; transparent ranking/template baselines; preserve source facts vs offer hypotheses; never report invented AI gains; provider events always simulated; stand-alone loopback demo is not production authentication or a deployed Twenty application. Bravo6 preserved.
