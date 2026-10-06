# GTM Campaign Command Center

> **Current product direction:** [Revenue Workspace PRD v1](docs/prd/REVENUE_WORKSPACE_PRD_v1.md) defines the expanded English-only Twenty-based product, persistent AI assistant with OpenDesign, phased delivery and Azure-to-Huawei migration. The implementation details below describe the earlier local prototype; this PRD task changes documentation only.

## Current documentation task — Revenue Workspace PRD

- [x] Write the expanded English-only PRD with 106 feature requirements and acceptance criteria.
- [x] Define persistent assistant context/navigation/actions, Twenty reuse and OpenDesign integration.
- [x] Define phase gates and Azure month-one / Huawei month-two migration.
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
