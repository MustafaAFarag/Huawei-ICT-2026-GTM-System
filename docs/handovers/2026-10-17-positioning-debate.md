# Handoff: Caravan positioning and PRD debate

## Resume instruction

Continue the Caravan positioning/PRD debate with **Claude Opus 5.5, High effort, Lara account**, as explicitly requested by the owner. Challenge the existing recommendation rather than simply endorse it. Conduct an independent first round, an evidence-backed rebuttal, and a second round before consolidating recommendations. **No debate round has run yet.**

This is strategy/documentation work. Keep application and Figma changes on hold. Do not push, deploy, contact prospects, activate providers or spend on project model generation. The user will start a new session themselves; do not create one on their behalf.

Workspace: `/mnt/ssd/Personal Projects/Huawei ICT 2026/gtm-command-center`

## Where we are

Caravan is an AI GTM workspace; Nabil is its assistant. The owner wants more than a generic creative assistant: account/lead work, personalised outreach, follow-ups and organised CRM outcomes, supported by branded deliverables.

The owner asked for an assessment against Alex Hormozi and the supplied Anthropic Founder’s Playbook, then requested an ICP decision from the private GTM files and web research because interviews with five buyers are unavailable and time is pressing. **Do not make interviews a prerequisite for choosing a first positioning.** Distinguish desk-research confidence from measured demand.

The current recommendation is a hypothesis: **Egypt-based HR-outsourcing/payroll providers selling into the GCC, with a small business-development team**. Proposed 1–5 BD users is an operational filter, not a measured market fact. Buyer: founder/managing director/BD head. User: SDR/BD executive/coordinator. Their prospects are employers; the banks/fintechs in the supplied lists are not automatically Caravan’s software ICP.

Current suggested positioning: “Caravan helps HR-service sales teams turn prospect lists into researched Arabic/English outreach, organised follow-ups and a visible client pipeline.” Recruitment-only agencies are adjacent for employer acquisition; general outbound agencies are a possible later segment/channel. This recommendation is expressly open to challenge in the debate.

## Read these first

1. `TASKS.md`, especially the active debate section.
2. `docs/research/14-caravan-business-implementation-audit.md`: code-backed business/implementation gaps.
3. `docs/research/15-initial-icp-evidence-case.md` and `15-public-icp-examples.csv`: fresh evidence, segment comparison, six independently researched public examples, confidence limits.
4. `docs/prd/REVENUE_WORKSPACE_PRD_v3.md`: active v3.1 specification; summary, §4 buyers/tiers, §5 pillars/plays, §7 requirements, §9 moat/pushback, §10 measures and final implementation checkpoints.
5. `docs/research/11-real-workflow-teardown.md`: anonymised real operating process.
6. `docs/design/figma-redesign-delivery.md`: proposed designs versus implemented behavior.

Private evidence: `GTM Files/`. Keep contact records, source names and identities out of committed reports. Ignored local aggregates: `.local/icp-research/private-structure.json`. The supplied book is `/home/mustafa/Downloads/Personal Projects/Anthorpic Founder's Playbook.pdf`; extracted text is `.local/business-audit/founders-playbook.txt`.

The complete prepared round-one delegate brief is `.local/positioning-debate/round1-brief.txt`. The main agent’s provisional counterarguments are `.local/positioning-debate/main-opening-notes.md`. These are ignored local files; the instructions here are sufficient if they are unavailable in another checkout.

## Evidence already established

- Current private folder: 40 files, 39 distinct file hashes, including 21 CSVs and 12 workbooks. Versions/campaign packs represent one engagement context, not 40 customer observations.
- The 160-row validation workbook contains four owner labels, 106 Arabic+English rows, 54 English rows, 63 stored `no_answer`, 15 `follow_up`, 22 `send_profile`, and 24 sender-campaign membership labels. Validation-decision cells are empty. These are source labels, not independently verified campaign outcomes or market-wide statistics.
- ABM sheet: 78 rows ×48 fields. Research, qualification, persona/angle, message variants, owner handoffs, follow-up and CRM reconciliation are core work. A source categorisation CSV has overflow fields and parses 78 rows; the older report’s 77 should not be repeated as an independently verified entity count.
- Public evidence: OUTSOURCY’s own careers page describes HRO/EOR SDR prospect research, multi-channel outreach, meetings and CRM. Tawzef, ERAMOVA, SSC and others show the regional service category. These firms are public prospect examples, not Caravan customers or confirmed buyers.
- Recruit CRM’s TXT International case is dated 2023. Smartlead’s Corebits case shows an agency using client separation/integrations. Apollo’s March 2026 staffing guide competes directly on client prospecting/enrichment/sequencing. Vendor success claims do not establish Caravan ROI.
- Four local read-only diagnostic assertions passed: industry changes do not change the generic score; English CEO scores100 versus equivalent Arabic title70; non-HR sellers still receive HR discovery questions; live enrichment rejects before provider calls. Five existing discovery/copy tests passed. These checks establish implementation behavior, not customer demand.

Useful opened sources (reverify temporal assertions):

- https://out-sourcy.com/current-jobs/
- https://www.tawzef.com/en/blogs/outsourced-hr-solutions
- https://era-mova.com/
- https://www.ssc-hr.com/services
- https://recruitcrm.io/blogs/case_studies/txt-international-unified-recruitment-with-recruit-crm/
- https://www.smartlead.ai/case-study/case-study-aamir-bajwa
- https://www.apollo.io/insights/best-tools-for-recruiting-and-staffing-agencies
- https://staffinghub.com/reports/2026-state-of-staffing-benchmarking-report/ (summary only; no MENA representative sample claim)
- https://www.acquisition.com/files/pick-your-niche-checklist.pdf
- https://www.acquisition.com/files/pricing-value-checklist.pdf

## Important implementation facts to verify in debate

| Area | Evidence |
| --- | --- |
| Account discovery | `packages/backend/src/agent/tools.ts`: `search_accounts` reads saved records; it is not an external prospect database |
| Qualification | `packages/backend/src/policy.ts:45`: universal weights; no workspace ICP/rubric argument; English-only role matching affects score |
| Contact enrichment | `packages/backend/src/providers.ts:257`: live mode intentionally rejects; fixture returns simulated data |
| Delivery | `packages/backend/src/workflows.ts:768`: live submission intentionally rejects; fixture sequences and manual call/LinkedIn tasks exist |
| Website onboarding | `workflows.ts:692` and `public-web.ts`: page-text/brand suggestions, not the complete proposed brand-book extraction/generation pipeline |
| Discovery | `packages/backend/src/discovery-guide.ts` and `gtm-service.ts`: HR-specific questions/capture |
| Outcomes | `gtm-service.ts:306`, `events.ts`: workspace-wide funnel exists; cohort/positive intent/revenue/provenance depth is incomplete |
| Campaign structure | Prisma schema has `PlayVersion`, `Asset` and per-prospect `Sequence`; no top-level `Campaign` model. Verify implications rather than presume a rewrite |
| First-use emphasis | `apps/web/src/components/chat/Home.tsx`: seven starters, five asset formats; Plays UI exposes individual tool steps |
| Current action policy | `agent/prompts/system.md`: generation starts immediately within caps; outbound still needs human review |

Existing approvals, evidence/source separation, budget reservations, durable jobs, suppression and real CRM/generation foundations are strengths. Do not call them missing. Do not “fix” the provider boundary by deleting its guard.

Specific PRD mapping: PB-01 ICP, PB-03 approved offer/proof, SCR-01/02 scoring, ENR-01 waterfall, SEQ-02 sender, SEQ-06 reply inbox, GAP-04 angle engine, GAP-05 sender push and GAP-07 funnel already specify much of the intended functionality. Distinguish **missing implementation**, **weak acceptance criteria**, **new product requirement**, and **unvalidated business assumption**.

The PRD’s AI-01 still says a spending tool produces a quote, never a run. That conflicts with the owner’s later explicit immediate-action instruction and actual system prompt. Preserve human sending approval, but do not reintroduce per-action cost confirmations. Some status documents predate later changes; source and later owner instructions take precedence.

## Debate contract

Round 1: independent, read-only challenge, about 1200–1800 words. Request:

1. Strongest argument against the current HRO/payroll ICP, including overfitting one engagement.
2. Three materially different positioning options: buyer, costly recurring job, promise, alternative, credible wedge; rank and recommend one.
3. Five highest-impact PRD gaps with exact IDs/files and classifications.
4. Smallest coherent workflow and a short feature list with testable acceptance criteria.
5. Features/claims to defer, table stakes versus a plausible accumulating moat.
6. Three objections for the main agent to answer. Separate evidence from inference.

Main agent: independently check claims and produce a rebuttal. Distinguish the **product category**, **first distribution cohort**, and **vertical-specific workflow packs**. A narrow first market need not make every future schema HR-specific. Retain a useful Asset Studio, while asking whether profiles/proposals matter more than more creative formats for this job.

Round 2: a fresh task, containing the original context, round-one findings, main rebuttal and unresolved objections. Ask for revised recommendation, rejected arguments and remaining disagreement. Do not claim consensus if objections remain. Consolidate into a reviewable strategy/PRD-amendment document; app implementation remains separate.

Settled owner decisions: broad catalogue retained, outbound loop first; chat-first entry; Asset Studio as a major pillar; English default with Arabic content; Free/Solo/Team/Agency/Enterprise; open source; Azure demo and Huawei only if qualifying. Challenge conflicts with evidence explicitly; do not silently replace these decisions or edit prices.

## Exact delegation blocker

Requested skill: `/home/mustafa/claude-shared/skills/claude-lara-delegate/SKILL.md` (read its base `claude-delegate` skill too). Lara record confirmed `larawithclaude@gmail.com`; shared Claude CLI version `2.1.301`. Lane snapshot showed Lara3% five-hour /86% weekly, Personal3%/10%; these are historical snapshots, not current guarantees.

T3 catalog target: `providerInstanceId: "claude-lara"`, `model: "claude-opus-5-5"`, options `{effort: "high", fastMode: false}`. The main agent was Codex; this is cross-account/provider delegation.

Both attempted `delegate_task` calls were rejected **before creating a task**:

> This account is at 86% of quota. Stop implementation on it and shift to an account under 80%. Claude Personal keeps that same headroom so it can keep orchestrating.

Last recheck: `orchestrator_capabilities` advertised Lara runnable/no constraints, but the actual launch still rejected. Server version `0.0.45`, environment ID `cc2cf9ed-6fc9-4ca5-ad96-07e2e1ca67b4`. The selected environment-read tool exposed no quota-policy setting. **No task IDs, child threads or debate results exist.** The owner said the blocker should be off, then elected to start a fresh session. They did not authorise switching to Personal.

Follow the new session’s current instructions/tool availability. Recheck the actual gate if using T3. Do not silently substitute another account or bypass a rejected policy with the CLI. Use app-owned `delegate_task` for different provider instances when available. Every round gets its own task ID and request ID; include the full review history in each new round. Do not send continuation prompts to a delegated child’s backing thread ID. If continuing entirely as a direct debate in the other session, preserve the requested model/account and evidence boundaries.

## Workspace and delivery state

- Branch `main`. Recent local commits: `ec65079` initial ICP; `65e61e0` business audit; `28c463c` editorial cover; `5b8b685` connected Figma redesign. No push.
- Preserve unrelated dirty `samples/email-ar.csv`, `samples/email-en.csv` and untracked `strobi-avatar.zip`. Do not include them in commits.
- One root worktree only; no delegated worktrees or workers to clean up.
- T3 reported the previous Figma dev command cancelled on restart. No dev server was started for research/debate/handoff; do not assume the app is running.
- Node24.18.0 path for repo commands: `PATH=/home/mustafa/.local/share/mise/installs/node/24.18.0/bin:$PATH`. pnpm12.10.1; no app build needed for strategy docs.
- Documentation check: `python3 scripts/check_links.py`; also scoped `git diff --check`. Keep local commits focused, no push/deploy.

Figma work is already delivered: 92 screen/state designs plus a native connected walkthrough. First page is the editorial **00 The Cover**, root `15:6321`, file `XQYMm6aLF8AVUAFje7CpuK`.

- Cover: https://www.figma.com/design/XQYMm6aLF8AVUAFje7CpuK?node-id=15-6321
- Walkthrough: https://www.figma.com/proto/XQYMm6aLF8AVUAFje7CpuK?node-id=17-12&starting-point-node-id=17-12&scaling=contain

The cover is native editable text/artwork with the original Nabil portrait; its three entry links were preserved and bounds/render checked. The brand-book flows there are design proposals. No new brand extraction, generated imagery, live contact provider or live sender capability should be inferred from those screens.

## Outcome (17 October 2026, Claude Skylink session)

The debate ran. Lara was rejected again by the T3 quota gate (87%); the owner chose native Claude Opus 5.5 High subagents on the Skylink account as reviewers. Round 1, the main rebuttal and a fresh round 2 are complete. The result, with corrections to research 15, eight proposed PRD amendments and remaining disagreements, is in [research 16](../research/16-positioning-debate-and-prd-amendments.md). The PRD, application and Figma are unchanged.
