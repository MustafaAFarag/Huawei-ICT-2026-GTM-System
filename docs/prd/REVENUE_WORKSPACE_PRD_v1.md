# Revenue Workspace — Product Requirements v1

**Status:** proposed build specification for review. **Date:** 6 October 2026. **Working name:** Revenue Workspace. **Planning horizon:** two months, delivered in tested phases. **Language:** English only. **Current authorization:** documentation only.

This PRD supersedes the earlier GTM-only, bilingual, standalone-demo and Huawei-first directions for future development. It covers the complete product roadmap: CRM, GTM, sales, marketing, campaigns, relationships, design assets, AI assistance, automation and reporting. The existing local demonstrator remains historical evidence of some workflow behaviors; it does not establish native Twenty, OpenDesign, provider or cloud readiness.

## 1. Product purpose and users

Build one AI-assisted revenue workspace on Twenty. A user can research an account, qualify a lead, prepare a campaign, generate branded material, conduct follow-up, manage a deal and report results without repeatedly reconstructing commercial context in separate tools.

The bottom-right assistant is a persistent working companion. It follows the user's current page and selection, explains records with their sources, navigates the application, and executes permitted actions. Its Design mode uses OpenDesign to produce and revise assets in the same conversation. Twenty supplies the CRM foundation and the product design system.

Initial users are agencies and consultancies managing B2B campaigns and client relationships, including a campaign/partnership lead such as Lara. The product also supports an in-house sales and marketing team. Expansion adds general sales and marketing workflows to the same record model; it does not create separate GTM, design and CRM products.

| Role | Primary job | Required access |
| --- | --- | --- |
| Agency/workspace owner | Configure clients, services, users and integrations | Authorized client workspaces and administrative settings |
| Campaign operator | Research, segment, draft and prepare outreach | Assigned accounts, campaigns, tasks and channel preparation |
| Sales representative | Qualify leads, manage opportunities and follow up | Assigned contacts, deals, communications and activities |
| Marketing lead | Plan campaigns, content, events and reporting | Campaign audiences, briefs, calendars, assets and analytics |
| Designer/reviewer | Create assets and approve factual/brand claims | Assigned briefs, sources, versions and review decisions |
| Analyst | Track funnel outcomes and report to clients | Permitted reporting data; no automatic send privileges |
| Client viewer | Review agreed deliverables and results | Explicitly shared records/assets; broader portal in a later phase |

Buyer demand, willingness to pay and performance improvement remain hypotheses. Customer acquisition is not a prerequisite to writing or building the phased demonstration.

## 2. Locked product decisions

1. **English only.** Interface, assistant replies, generated messages, documents, labels, help and acceptance tests use English. No language switch, translated interface or RTL build is planned. Imported source material retains its original text and provenance; it is not silently translated or rejected solely for language.
2. **Twenty is the application foundation.** Reuse its accounts/companies, contacts, opportunities, tasks, notes, views, permissions and available communications capabilities. New product modules sit within its navigation and record experience.
3. **One product design system, derived from Twenty.** Reuse Twenty components, tokens, typography, spacing, interaction states, accessibility and light/dark behavior. Branding is a documented token/component adaptation. Client asset brand kits may differ, but they do not create competing CRM interface systems.
4. **CRM logic can be customized.** Use supported objects, fields, views, workflows, apps, APIs and front components first. Make scoped core changes when a required behavior cannot be achieved through those interfaces. Core changes must have tests, a documented upstream patch and an upgrade strategy; a complete parallel CRM is not the default.
5. **Persistent actionable assistant.** Its launcher stays at the bottom right throughout authenticated application pages. Conversation and work continue across route changes. Collapsing the popup does not discard its context or jobs.
6. **OpenDesign inside the assistant.** A Design mode and expandable preview/editor expose the existing engine. Integrate its actual tools, jobs, templates and artifacts; do not implement a replacement design engine.
7. **Azure during month one; Huawei during month two.** Azure credit availability is user-reported. Build on Azure first. Begin the Huawei migration at the month-one boundary when credits arrive; credit timing and regional service availability are operational dependencies. Huawei is the intended destination, not the initial primary platform.
8. **All discussed features are in this PRD.** A feature's phase establishes its delivery order. Inclusion does not mean all phases will be finished in eight weeks. A phase completes only after its acceptance gate passes; unfinished work carries forward visibly.
9. **Commercial actions are real only when reconciled.** A generated document, exported CSV, paused draft, provider submission and confirmed delivery are different states. Fixtures are always identified as simulated.
10. **Source-backed AI and authoritative rules.** AI researches, proposes, drafts, designs and helps act. Permissions, deduplication, exclusions, approved versions, send readiness and reconciliation remain enforced by the application.

## 3. Reuse and customization architecture

### 3.1 Twenty

Use a self-hosted Twenty deployment as the system of record and primary web experience. Inventory the selected release before development and record what is native, configurable, an extension, a targeted core change or an external integration. Existing implementations must be tested before their capability is counted as complete.

Published app interfaces cover custom data objects, logic functions, front components and navigation. Front components run in a constrained environment; a persistent global assistant may require a small host-shell change rather than treating a record side panel as a global popup. Validate the integration location in Phase 0. [Twenty app interfaces](https://docs.twenty.com/developers/extend/apps/getting-started/quick-start), [front-component constraints](https://docs.twenty.com/developers/extend/apps/layout/front-components)

Twenty's repository distinguishes AGPL core, packages with separate licenses, commercially marked enterprise files and an Application Exception for qualifying interface-based apps. Modifying AGPL core is a permitted engineering path with its applicable source/license obligations; it is not equivalent to the app exception. Track the exact license of reused files and dependencies, preserve notices, and do not assume enterprise features or trademark rights are granted. [Twenty license](https://github.com/twentyhq/twenty/blob/main/LICENSE)

### 3.2 OpenDesign

Run the actual OpenDesign engine behind the assistant's design adapter. Use its existing design-system packages, templates, project/artifact handling and supported revision/export tools. Product-owned work is the authenticated connection, approved campaign brief, client scope, job orchestration, assistant presentation and links back to CRM records.

The integration exposes compact progress and preview in the popup, with an expanded workspace for detailed editing. If the pinned version lacks a supported embeddable editor, present its previews/tools in the assistant and open its existing editor through authenticated project access. Do not promise an iframe integration until it is verified.

The root license is Apache-2.0. Its hosted plugin specification scopes v1 authentication to a single tenant and describes some infrastructure capabilities as planned; confirm shipped behavior at the chosen revision. Use separate client-scoped jobs/projects or isolated engine instances behind the application boundary. Do not rely on a shared daemon token to provide client authorization. [OpenDesign license](https://github.com/nexu-io/open-design/blob/main/LICENSE), [plugin and hosted-mode specification](https://github.com/nexu-io/open-design/blob/main/docs/plugins-spec.md), [design-system conventions](https://github.com/nexu-io/open-design/blob/main/docs/design-systems.md)

### 3.3 Product-owned services and data

| Component | Responsibility | Reuse boundary |
| --- | --- | --- |
| Twenty shell and CRM | Navigation, identity, CRM records, native views and components | Reuse and configure; targeted patches when necessary |
| Assistant orchestration | Conversation, live page context, tool selection, navigation and action plans | Connect to existing Twenty AI/MCP capabilities where sufficient; add only the missing product behavior |
| Evidence/knowledge service | Documents, approved services, citations, retrieval and freshness | Product-specific commercial context linked to Twenty |
| Campaign/action service | Versions, readiness, approval, channel jobs and outcome reconciliation | Reuse Twenty workflows/tasks; add durable campaign semantics |
| OpenDesign adapter | Approved briefs, scoped jobs, previews, revisions and artifact links | Existing OpenDesign engine; no duplicate renderer/editor architecture |
| Provider adapters | Email, LinkedIn, enrichment, calendars and optional automation bridges | Documented APIs/capabilities with explicit manual fallbacks |
| Reporting/evaluation | Actual funnel records, model comparisons, audit and export | Reuse available Twenty dashboards; add required calculations |

Persist durable business records in Twenty/PostgreSQL. Store documents and assets in object storage; maintain content hashes and metadata links in CRM. Use a compatible queue/cache for durable job orchestration according to the selected Twenty release. Isolate provider credentials from browser/assistant text. SQLite from the earlier demo is not the target production store.

## 4. Assistant experience and action contract

### 4.1 Persistent popup and live context

The launcher is visible at the bottom right on authenticated pages, including company, contact, opportunity, campaign, task, asset, report and settings views. The assistant can collapse, expand, resize and open a larger working panel; it must not cover a primary action or make the underlying page unusable. On narrow screens, expansion may use an overlay while preserving a reachable launcher.

“Always viewing” means live application context: current route, workspace, authorized record IDs, selection, filters, unsaved-change status and relevant visible content. Subscribe to route/selection changes. Retrieve additional records through permission-checked tools when needed. Show a compact context label, for example “Viewing: Acme / Opportunity”. Do not require the user to reattach a screenshot for normal in-app work. Continuous whole-screen recording, password-field capture and observation of other websites are not required.

The conversation remains available across pages within the current client scope. Switching clients visibly switches conversation/data scope. Pending jobs retain their original workspace and target records; they cannot silently apply to the newly selected client. A stale target or record version requires re-resolution before execution.

### 4.2 Interaction examples

| User request | Assistant behavior | Observable outcome |
| --- | --- | --- |
| “What needs attention in this campaign?” | Read the current campaign and explain holds with sources | Links to missing evidence, blocked recipients and sender checks |
| “Open Noura's company and show the sources.” | Navigate to the authorized company and select the evidence section | Route changes; popup and conversation remain present |
| “Create a follow-up task for tomorrow.” | Create the task in the current workspace using a typed tool | Task ID, due date, owner and undo/compensation where supported |
| “Move this deal to Proposal.” | Validate transition and required fields, then update | Before/after stage and activity entry; clear reason if blocked |
| “Create a one-pager using this client's brand.” | Open Design mode and pass approved CRM data to OpenDesign | Scoped job, progress, preview, source/version references |
| “Make the title shorter.” | Revise the selected artifact through OpenDesign | New artifact version; approved original remains identifiable |
| “Prepare outreach for these 50 leads.” | Check exclusions/readiness and prepare a bounded batch | Per-row outcomes; reviewed copy and pending handoffs |
| “Launch the approved sequence.” | Show the concrete audience, sender, schedule and approved version; enforce authorization | Provider submission followed by reconciliation; no false “sent” status |

### 4.3 Action levels

| Action level | Examples | Required behavior |
| --- | --- | --- |
| Read/navigation | Search, explain, open a page, select a record | Execute within the user's access; no redundant approval prompt |
| Reversible single-record change | Create task, update owner/stage, save a draft | Execute a clear authorized request; show result and available undo |
| Bulk/internal change | Assign a list, merge duplicates, enroll contacts | Show affected scope and exclusions; apply atomically or record each partial outcome; ambiguous merges require review |
| External commitment | Send messages, launch a campaign, publish content, incur provider spend | Concrete review of scope/version/account/cost where relevant; approval bound to that action, with configured role and budget limits |
| Destructive/admin change | Delete records, alter permissions, remove integration | Role-specific confirmation, dependency checks and backup/restore or documented irreversibility |

Configured, previously approved campaign schedules may execute without prompting for every touch. The approval identifies audience, copy version, channels, sender, schedule and spend limits. Changed scope or expired/invalid approval prevents execution. Generation alone never authorizes sending.

### 4.4 Tools and execution state

Tools use structured schemas and server-side authorization, not unrestricted browser clicks for primary application actions. Navigation commands use an application route registry. DOM interaction is a capability-limited fallback for an unsupported UI handoff and must report what it actually accomplished.

Each action has workspace, user/role, target IDs, expected record version, request/idempotency key, input/output references and timestamps. Long jobs persist across popup closure and reload. States distinguish proposed, running, awaiting review, awaiting external handoff, completed, failed and cancelled. Partial success returns exact record outcomes and safe retry instructions. An assistant message cannot override a hold enforced by the server.

## 5. Feature inventory and phase assignments

**Phase codes:** P0 foundation; P1 GTM; P2 sales; H Huawei migration; P3 marketing and broader campaigns; P4 advanced operations/integrations. “P1 → P3” means a limited first release followed by the explicitly described expansion. All rows below belong to the full PRD; none imply existing production readiness.

### 5.1 CRM, workspaces and the shared design system

| ID | Feature and required behavior | Phase | Acceptance |
| --- | --- | --- | --- |
| CRM-01 | Agency/client workspaces, authorized switcher and separate business data | P0 | A user cannot read or mutate an unauthorized client's records, assets, jobs or assistant history |
| CRM-02 | Companies/accounts and professional contacts with relationships | P0 | Import attaches a contact to the intended company and preserves source IDs without duplicating native records |
| CRM-03 | Lead ownership, team assignment and routing by documented criteria | P1 → P2 | A rule assigns the expected owner; an unassigned/ambiguous lead enters a visible queue |
| CRM-04 | Native opportunity pipelines with configurable stages and fields | P0 → P2 | Required-field/stage rules and ownership are enforced in UI, API and assistant tools |
| CRM-05 | Tasks, reminders, notes and shared activity timelines | P0 → P2 | Tasks persist, link to records, retain owners/dates and show completed versus overdue |
| CRM-06 | Tags, segments, saved views, filters, search and bulk selection | P1 → P3 | Saved views reproduce their criteria; selected record IDs are explicit for bulk actions |
| CRM-07 | Record validation, deduplication and reviewed merge | P1 → P2 | Conflicting identifiers cannot silently merge; an approved merge preserves relationships and provenance |
| CRM-08 | Relationship/service history, existing-client status and exclusions | P1 → P2 | An existing client or opt-out is excluded from incompatible acquisition campaigns across that workspace |
| CRM-09 | Custom objects/fields and schema changes | P0 → P4 | Product fields extend Twenty; migration/backfill tests preserve existing records |
| CRM-10 | Roles, record access, reviewer permissions and client sharing | P0 → P4 | Restricted users receive neither hidden fields nor assistant-mediated access to them; shared views have explicit scope |
| UI-01 | Twenty-derived tokens/components and documented product branding | P0 | A component/token inventory identifies reuse and adaptations; main pages have consistent states and accessible focus |
| UI-02 | English-only desktop/tablet/mobile experience | P0 onward | Every product surface and generated default output is English; no locale switch; primary flows work at target viewports |
| UI-03 | Loading, empty, error, success and partial-job states | P0 onward | Slow requests and failed jobs have actionable feedback; an empty CRM explains how to begin |

### 5.2 AI assistant

| ID | Feature and required behavior | Phase | Acceptance |
| --- | --- | --- | --- |
| AI-01 | Persistent bottom-right launcher, expandable popup and conversation continuity | P0 | Launcher survives route changes; collapse/reopen retains the current conversation and job state |
| AI-02 | Live page/selection context and visible context indicator | P0 | Selecting another record updates context; hidden or unauthorized fields are absent |
| AI-03 | Search, retrieve, explain and cite workspace knowledge | P1 | Factual answers link to the source/record and distinguish a hypothesis or unknown |
| AI-04 | In-app navigation and section selection | P0 → P1 | A request opens the expected route/record without losing the assistant session |
| AI-05 | Typed actions for CRM and campaign changes | P1 → P2 | A requested action validates permissions/version, creates a durable result and reports its actual state |
| AI-06 | Multi-step plans and bounded batch execution | P1 → P4 | User can inspect progress and affected scope, stop pending work and retry only failed steps |
| AI-07 | Proactive next-action suggestions tied to the current page | P1 → P3 | Suggestions cite the trigger and offer an action; no unapproved outreach is started |
| AI-08 | Reusable client knowledge, campaign memory and decision history | P1 | A settled exclusion/voice/offer correction carries into later drafts for that client |
| AI-09 | Assistant Design mode backed by OpenDesign | P1 | A design request invokes a real engine job, shows progress/preview and saves a linked artifact |
| AI-10 | Durable jobs, receipts, cancellation and supported undo | P1 → P4 | Closing the popup does not lose a job; cancellation prevents unstarted steps and explains any completed external effects |
| AI-11 | Workspace/user tool policies, approval scopes and spend limits | P0 → P2 | Repeated approval is unnecessary within a valid scope; scope/version/budget changes block the action |
| AI-12 | Context changes, stale records and untrusted retrieved instructions | P0 onward | A pending action cannot target a different client's record; retrieved text cannot grant tools or bypass exclusions |
| AI-13 | Model selection, prompt/version records and usage observability | P1 → P4 | Each run records model/configuration, sources, latency, cost and outcome without exposing secrets |
| AI-14 | Workflow automation assistance and plain-English rule editing | P4 | A proposed rule has a preview/test case; activation is distinct from rule generation |

### 5.3 GTM research, preparation and targeting

| ID | Feature and required behavior | Phase | Acceptance |
| --- | --- | --- | --- |
| GTM-01 | CSV/XLSX import, field mapping and per-row reconciliation | P1 | Every input row has an imported, matched, excluded, rejected or review outcome; retries do not duplicate enrollment |
| GTM-02 | Service/offer catalog, ICP, buyer-role hypotheses and approved proof | P1 | Recommendations reference an active offer version and its approved claim scope |
| GTM-03 | Document/playbook upload, parsing and client-scoped retrieval | P1 | Supported documents become searchable sources with origin, version and extraction status; a failed parse is visible |
| GTM-04 | Account/person research with dated citations and evidence review | P1 | Research records facts, hypotheses and unknowns; a public announcement is not rewritten as an internal-need fact |
| GTM-05 | Account–role–offer ranking with explanations | P1 | Ranked offers show role/evidence support; no supporting evidence produces a review hold rather than a fabricated score |
| GTM-06 | Enterprise ABM plans with account briefs and contact-specific rationale | P1 | The plan records the recipient, role hypothesis, evidence, offer, sequence and reviewer decision |
| GTM-07 | Professional enrichment with provenance, ambiguity, cache and budget | P1 → P4 | Missing data can be requested within a cap; ambiguous results are held; repeated requests reuse valid cached results |
| GTM-08 | English personalized outreach and reusable tone/voice guidelines | P1 | Drafts match the role/channel, use only approved claims and retain citations for review |
| GTM-09 | Sequence branches, delays, stop conditions and working schedules | P1 → P3 | All touches/branches are reviewable; opt-out/reply stops later touches; schedule/timezone is explicit |
| GTM-10 | Campaign versioning, review decisions and approval invalidation | P1 | Changing copy, audience, offer proof or sequence scope invalidates the applicable approval |
| GTM-11 | Deterministic campaign QA, collision checks and exclusions | P1 | Duplicates, existing clients, opt-outs, missing fields and overlapping campaigns have visible outcomes |
| GTM-12 | Sender readiness, channel-specific eligibility and domain-review holds | P1 | Missing email blocks email without blocking an eligible channel; sensitive sector/offshoring claims require explicit review |
| GTM-13 | Detailed export and visual readiness/prioritization views | P1 | Export rows match reviewed records; an export is labeled prepared and does not imply delivery |
| GTM-14 | Partnerships, relationship ownership and campaign coordination | P1 → P3 | Partnership contacts have a justified owner; a vendor's HR title is not automatically treated as partnership ownership |
| GTM-15 | Event attendee imports, networking follow-up and assignment | P3 | Source/event attribution survives import; existing contacts reconcile; follow-up has owner and due date |
| GTM-16 | Research refresh, source changes and evidence expiry | P3 → P4 | Changed/expired evidence reopens affected review without silently changing approved messages |

### 5.4 Sales and opportunity management

| ID | Feature and required behavior | Phase | Acceptance |
| --- | --- | --- | --- |
| SALE-01 | Lead qualification, disqualification and opportunity conversion | P2 | Conversion preserves contact/company/campaign history; disqualification has a reason |
| SALE-02 | Configurable deal stages, ownership, value and expected close date | P2 | A stage change obeys configured required fields and records its actor/time |
| SALE-03 | Next steps, activity planning, reminders and overdue follow-up | P2 | An active deal without a next step appears in the attention queue |
| SALE-04 | Account/contact interaction history and collision-free handoff | P2 | A new owner can see previous approved outreach/replies without duplicating pending touches |
| SALE-05 | Unified authorized communications view and reply triage | P2 | Supported replies link to the right contact/campaign/deal; uncertain matches enter review |
| SALE-06 | Meeting preparation, notes, summaries and proposed follow-up | P2 → P4 | Summary separates recorded facts from inferred next steps; proposed tasks can be reviewed/applied |
| SALE-07 | Reusable proposals, sales decks, capability statements and case-study assets | P2 | An approved offer/proof version populates an editable OpenDesign artifact linked to the opportunity |
| SALE-08 | Basic quotes: scope, line items, amounts and revision/approval | P2 → P4 | Totals match inputs; approved revision is identifiable; tax/legal/e-signature integrations are separate capabilities |
| SALE-09 | Won/lost outcomes, reasons and delivery/client handoff | P2 | Won/lost updates the funnel; won handoff produces assigned tasks and does not imply service delivery |
| SALE-10 | Pipeline health, weighted forecasts and sales reporting | P2 → P4 | Forecast math, stage assumptions and missing values are explicit; AI predictions require their own evaluation |
| SALE-11 | Renewals, expansion opportunities and existing-client account plans | P4 | Renewal/upsell is distinguished from acquisition; exclusions are applied according to the campaign purpose |
| SALE-12 | Team playbooks and repeatable discovery/follow-up workflows | P2 → P4 | Current playbook version appears in generated preparation; corrections propagate to new work |

### 5.5 Marketing and broader campaign operations

| ID | Feature and required behavior | Phase | Acceptance |
| --- | --- | --- | --- |
| MKT-01 | Campaign briefs: goals, audience, offer, owner, dates and success measures | P1 → P3 | Campaign has a measurable objective and named owner before activation |
| MKT-02 | Audience segmentation and saved dynamic/static lists | P3 | Segment membership is explainable; approvals bind the intended audience/snapshot policy |
| MKT-03 | Multi-channel campaign coordination and calendar | P3 | Touches/content/events share an approved campaign version and do not collide invisibly |
| MKT-04 | Content briefs, English copy generation, revision and review | P3 | Copy follows the brief and approved proof; draft, approved and published states are distinct |
| MKT-05 | Email nurture, re-engagement and lifecycle campaigns | P3 | Entry/exit conditions, consent/exclusions, schedules and reply stops pass fixture and integration tests |
| MKT-06 | Social content planning and supported publishing handoffs | P3 → P4 | Calendar and ready-to-publish assets exist first; unsupported networks receive explicit manual handoffs |
| MKT-07 | Landing-page briefs, design, forms and lead capture | P3 → P4 | Captured lead links to campaign/source and deduplicates; a design preview is not labeled a published page |
| MKT-08 | Events/webinars: promotion, attendance and follow-up | P3 → P4 | Attendee/import outcomes and attendance status drive reviewed follow-up rather than assumed participation |
| MKT-09 | Partnership/referral campaigns and co-marketing coordination | P3 | Partner, client, campaign owner and shared asset approvals are recorded |
| MKT-10 | Paid-campaign planning, creative variants, budget and reporting import | P4 | Approved budget/creative plan can be reviewed; imported spend/performance keeps provider/date provenance |
| MKT-11 | Supported paid/social publishing or launch adapters | P4 | Provider account/capabilities and explicit launch approval are verified; no adapter is simulated as live |
| MKT-12 | UTM/source attribution, funnel reporting and client summaries | P3 | Captured source, campaign, lead, opportunity and revenue links are traceable; unattributed records remain unknown |
| MKT-13 | Controlled experiments and creative/message variants | P4 | Variant assignment and exposure are recorded; fixture replies cannot establish commercial lift |
| MKT-14 | Marketing operations dashboard and priorities | P3 | Displays current readiness, blocked work, approvals, tasks and real campaign results with refresh timestamps |

### 5.6 Design system, OpenDesign and sales assets

| ID | Feature and required behavior | Phase | Acceptance |
| --- | --- | --- | --- |
| DES-01 | Client brand profiles and reusable OpenDesign design-system packages | P1 | Brand assets/tokens are versioned; UI design remains Twenty-derived; a client switch selects the correct asset brand |
| DES-02 | Embedded Design mode with job progress, preview and expanded editing | P1 | Assistant invokes the actual engine and retains artifact/project IDs across navigation and reload |
| DES-03 | Account research brief | P1 | Approved sources, dates, role and offer hypotheses appear in the exported brief |
| DES-04 | Prospect-facing ABM one-pager | P1 | Approved copy/proof and client branding populate the artifact; unsupported claims block release |
| DES-05 | Campaign summary and client report | P1 → P3 | All chart values reconcile with the campaign snapshot and distinguish simulated events |
| DES-06 | Digital networking card with deterministic QR destination | P1 | QR decodes to the stored approved URL; profile links are editable and versioned |
| DES-07 | Proposals, presentations and expanded sales collateral | P2 | Artifacts link to the deal, offer scope, source proof and approval version |
| DES-08 | Social/ad/email/landing-page creative templates | P3 → P4 | Supported output sizes/formats are capability-checked; variants retain campaign and brand references |
| DES-09 | Conversational revisions, editable source, lineage and approval invalidation | P1 → P4 | “Revise this asset” creates a traceable version; changed factual content reopens review |
| DES-10 | Supported exports, responsive previews and asset library | P1 → P3 | Export formats match actual engine capabilities; assets remain discoverable and client-scoped |
| DES-11 | Brand/accessibility/content checks and actual-input charts | P1 → P4 | Wrong logo/brand/source/chart data causes a visible hold; subjective critique is not presented as objective validation |

### 5.7 Channels, integrations and execution

| ID | Feature and required behavior | Phase | Acceptance |
| --- | --- | --- | --- |
| INT-01 | Smartlead email preparation, sequence/variable mapping and paused drafts | P1 | Fixture reconciliation passes; live paused draft requires a verified account and current API contract |
| INT-02 | Approved email launch, delivery/reply events and failure handling | P2 | Submitted, accepted, sent, failed and replied are separate reconciled states; retries cannot duplicate sends |
| INT-03 | Dripify personalized CSV/custom fields and capability-aware API adapter | P1 → P4 | Supported fields fit limits; unsupported account operations have a visible UI/manual handoff |
| INT-04 | Calls: approved scripts, assigned tasks, outcomes and notes | P1 → P2 | Task/script/version/owner are linked; a recorded task is not a completed call |
| INT-05 | WhatsApp prepared copy/manual tasks; authorized business API expansion | P1 → P4 | MVP is an explicit manual handoff; later automation requires supported account/templates/policies |
| INT-06 | Email and calendar synchronization through native Twenty capabilities | P2 | Supported account consent, sync and record linkage pass tests against the selected release |
| INT-07 | Professional data/enrichment providers | P1 → P4 | Results include provider/time/provenance, confidence/ambiguity and budget usage |
| INT-08 | Salesforce/Odoo/other CRM imports, then selective continuous sync | P1 → P4 | Initial mapped imports reconcile; later sync has system-of-record/conflict/deletion policies |
| INT-09 | Make/webhooks as optional integration bridges | P4 | Scenario creation/activation are distinct; bridge retries preserve action keys and client scope |
| INT-10 | Forms, events and supported social/ad platform connectors | P3 → P4 | Each connector has a tested capability matrix and ownership/credential mapping |
| INT-11 | Provider-event inbox, reconciliation ledger and visible handoffs | P1 onward | Duplicate/out-of-order events do not create duplicate actions or regress terminal state |
| INT-12 | Credential health, rate limits, reconnect and connector status | P1 → P4 | Expired credentials pause affected jobs; other eligible channels remain usable |

### 5.8 Automation, administration, reporting and AI evaluation

| ID | Feature and required behavior | Phase | Acceptance |
| --- | --- | --- | --- |
| OPS-01 | Versioned rules/workflows for routing, readiness and follow-up | P1 → P4 | Each rule has test inputs/expected outcomes; activation and rollback are recorded |
| OPS-02 | Review queues, approval delegation and notifications | P1 → P3 | Assigned reviewer sees pending work; reminders do not count as completed approval |
| OPS-03 | Durable jobs, schedules, retries, idempotency and reconciliation | P1 | Worker restart/retry/duplicate event produces one intended business effect |
| OPS-04 | Audit log and assistant action receipts | P0 onward | Actor, client, record version, approval and outcome reconstruct the change |
| OPS-05 | User/team settings, integrations, client brands and offer administration | P0 → P2 | Settings changes have role checks and appropriate downstream invalidation |
| OPS-06 | Usage, provider/model budgets, quotas and cost reporting | P1 → P4 | Jobs obey workspace caps; estimated and actual costs are distinct |
| OPS-07 | Backups, restore, retention, export and scoped deletion | P0 → H → P4 | Restore test reproduces records/assets; deletion handles linked assets and prevents unwanted reimport |
| OPS-08 | Client reporting/sharing; expanded client review portal | P3 → P4 | Shared output exposes only approved scope; portal access is revocable and tested |
| OPS-09 | Operational/model monitoring and incident recovery | P0 onward | Failures can be traced by job/correlation ID without exposing provider secrets |
| EVAL-01 | Account–role–offer ranking experiment | P1 → P4 | Rules baseline is frozen; independent held-out relevance results exist before an improvement claim |
| EVAL-02 | Retrieval and grounded-generation evaluation | P1 → P3 | Recall@5, factual support, role fit and reviewer edit effort use independent labels and source IDs |
| EVAL-03 | Assistant navigation/action correctness and adversarial tests | P0 onward | Wrong-client, stale-record, ambiguous request and retrieved-instruction cases cannot bypass application policy |
| EVAL-04 | Model adaptation/fine-tuning where useful | P4 | Compare frozen embeddings/reranker and bounded adaptation on company-held-out data; keep the stronger baseline |
| EVAL-05 | Commercial-performance experiments once real outcomes exist | P4 | Response/conversion claims use identified real cohorts and limitations, never synthetic provider fixtures |

## 6. Core records and consistency rules

| Record family | Required information and relationships |
| --- | --- |
| Native CRM | Company, person, opportunity, task, note/activity and workspace/user relationships; reuse Twenty IDs |
| Client commercial knowledge | Offer/version, ICP, buyer-role hypotheses, proof/claim scope, exclusions, playbook, voice and brand profile |
| Evidence/document | Source URL/file, origin/license where applicable, date, excerpt, extraction version, hash, review decision/reviewer and affected records |
| Campaign/audience/enrollment | Objective, owner, version, audience snapshot/criteria, contact/source-row IDs, channels, offer, drafts/branches/schedule, exclusions and readiness outcomes |
| Approval | Reviewer/role, target, copy/asset/audience/version hashes, scope, timestamp, expiry/invalidation reason |
| Execution/action/event | Idempotency key, provider IDs, actor/client, target/version, approved input, due time, submission/terminal state, event source and simulation flag |
| Design/project/asset | OpenDesign project/job/artifact IDs, brand/template/brief versions, source CRM records, editable source, export locations, lineage and review state |
| Assistant/session/context | User/client scope, conversation, current route/selection, tool calls, pending work, context version and durable receipts |
| Analytics/evaluation | Metric definition, actual input references, collection window, provenance, model/dataset revision, labels, split and limitations |

Cross-record rules: workspace scope is carried through every query/job/tool; original source rows remain traceable; provider IDs map back to intended CRM records; current approved version is checked at execution; replies/opt-outs cancel applicable future touches; unknown attribution stays unknown. A customer reference cannot substantiate a different service without reviewed proof.

A global company/account exclusion applies to affected contacts in the client workspace, rather than relying solely on an imported per-contact flag. Acquisition, expansion and partnership campaigns use explicit exclusion policies so an existing-client account is treated intentionally.

## 7. Phases and the two-month plan

Every phase has a demonstrable vertical workflow, a feature checklist, tests and an explicit handoff. Reuse native features before adding development tasks. Parallel development may occur when dependencies permit, but a failed gate does not become complete because the calendar advances.

| Phase | Target window/platform | Cumulative scope | Exit demonstration and gate |
| --- | --- | --- | --- |
| P0 — Foundation | Week 1 / Azure | Twenty baseline CRM, English-only design-system adaptation, roles/client scope, persistent context-aware assistant shell, navigation, backup/job architecture | Two client workspaces; assistant remains present across native routes; context/navigation/access tests pass; release/capability inventory recorded |
| P1 — GTM | Weeks 2–3 / Azure | Research/imports, offers/knowledge, evidence ranking, English drafts, reviewed sequences, QA, exports, manual channels, four OpenDesign assets and actionable assistant tools | One supported campaign and one exception campaign complete preparation; real OpenDesign integration works; retries/holds/approvals/source/asset checks pass |
| P2 — GTM + sales | Week 4 / Azure | Qualification, pipelines, tasks/communications, meetings, proposals/basic quotes, opportunity outcomes and first supported approved email execution | Reviewed lead → opportunity → proposal → follow-up → outcome; assistant acts on CRM; provider fixture suite and any claimed live integration pass |
| H — Huawei migration | Start of month 2 / target Week 5 | Move the completed Azure release, durable data/assets/jobs and required infrastructure to verified Huawei services | Restore/reconciliation/access/assistant/design/provider tests pass on Huawei; controlled cutover and rollback rehearsal; migration evidence saved |
| P3 — GTM + sales + marketing | Weeks 6–7 / Huawei after H | Marketing calendar/content, segments/nurture, events/partnerships, asset library, attribution and client reporting; phased form/social capabilities | A cross-channel campaign with content/assets, captured/assigned leads and traceable opportunity/report outcomes; each external capability separately verified |
| P4 — Expanded operations | Week 8 target, remaining work continues beyond week 8 | Advanced automations, additional providers/CRM sync, paid/social launch, renewals, portal, experiments, deeper evaluation/adaptation and expanded asset editing | Deliver tested feature groups individually; incomplete IDs remain visible in the roadmap; no blanket “all features done” claim |

The two-month target is a usable, rehearsed integrated product with clearly accepted phases. P0–P2 and migration planning are the first delivery priorities; H is conditional on available Huawei credits/services. P3/P4 progress depends on those gates and team capacity. All P4 requirements remain in scope even if their implementation continues after the two-month window.

If Huawei credits arrive late, continue the accepted release on Azure and retain its tested features. Keep H pending and report the revised cutover date; do not switch to an untested cloud environment solely to meet a date. Marketing development may continue on the same portable architecture while infrastructure work is resolved.

## 8. Azure first, Huawei second

### 8.1 Portability from day one

Containerize the pinned Twenty deployment and product workers. Keep PostgreSQL as the authoritative database; avoid changing the business record model during the cloud move. Use storage, queue, model and secret adapters with documented contracts. Provision through versioned infrastructure/configuration and reproducible schema migrations. Separate dev/test from the accepted demo or production-like environment.

These are candidate service mappings, not verified provisioning or interoperability claims:

| Capability | Month-one Azure candidate | Month-two Huawei candidate | Verification requirement |
| --- | --- | --- | --- |
| Application/worker compute | Azure VM/container deployment; managed containers if compatible | ECS/container deployment; managed alternative only when needed | Same images, CPU architecture, network/job behavior and persistent engine workspaces |
| PostgreSQL | Azure Database for PostgreSQL or managed-compatible deployment | Huawei RDS PostgreSQL or verified equivalent | Versions, required extensions, export/restore, identity and indexing parity |
| Queue/cache | Redis-compatible service supported by selected Twenty release | Compatible Huawei cache/queue or hosted equivalent | Persistence, TTL, acknowledgements, duplicate handling and worker compatibility |
| Documents/assets | Azure Blob Storage | Huawei OBS | Provider adapter, hashes, access policy, metadata, signed URLs and OpenDesign storage behavior |
| Secrets/identity | Azure secret management and application identity | Huawei secret/IAM equivalents | Least-privilege mappings, rotation, credential references and callback URLs |
| Model inference/evaluation | Azure-hosted or accessible model endpoints/compute using credits where eligible | Verified Huawei inference/ModelArts path or portable model runtime | Model availability, licenses, API adapters, quality/latency/cost and data access |
| Monitoring/backups | Azure-compatible logs, metrics and backup jobs | Huawei-compatible observability and backup jobs | Correlation IDs, alerts, retention, restore and cost dashboards |

### 8.2 Migration procedure and acceptance

1. Before the end of month one, inventory service versions, data volume, models, credentials, callback URLs, engine jobs and provider webhook routes. Verify Huawei credit activation, region, quotas and compatible services.
2. Deploy the same accepted application/worker images and schema to Huawei staging. Validate storage, database, queue, secrets, network access, OpenDesign and model adapters independently.
3. Copy a consistent database snapshot and documents/assets. Compare record counts, relationships, source IDs and asset hashes; rebuild or transfer indexes as appropriate. Do not treat a database-row count alone as proof of a complete migration.
4. Run the full accepted-phase suite and representative assistant/design/provider workflows on Huawei. If the inference provider/model changes, rerun affected AI quality and tool-contract checks; changing clouds does not establish model equivalence.
5. Set a bounded cutover window. Drain/pause source workers, freeze writes briefly or use a tested replication strategy, capture the final delta and switch application routes/callbacks. Only one environment may execute each live campaign schedule.
6. Reconcile queued/running jobs, approvals, timestamps, provider events and emails/replies across the boundary. Duplicate incoming events must remain idempotent. Communicate a tested interruption window before a live cutover.
7. Validate on the destination and rehearse rollback. Keep the Azure source recoverable for an agreed period; after destination writes occur, rollback must reconcile that delta rather than simply restoring a stale source snapshot.
8. Decommission Azure resources only after destination acceptance and explicit operational authorization. Record final monthly cost, retained backups and migration outcome.

Target migration checks: zero unexplained record/asset loss; unchanged client access boundaries; no duplicate outbound action; scheduled jobs and assistant sessions recover as designed; all accepted P0–P2 scenarios pass on the destination. Actual downtime/RPO/RTO targets are set from Phase 0 measurements and recorded before cutover; none are assumed from a cloud brand.

## 9. AI contribution and measurement

AI is a substantive product capability from P1: retrieval over client knowledge, supported offer ranking, English drafting, context-aware navigation/action planning, design orchestration and next-action suggestions. Model providers are replaceable behind the tool/retrieval contracts. Do not confuse a chatbot panel with completed action capability, or deterministic template smoke tests with a neural quality evaluation.

For the account–role–offer experiment, retain the proposed 80 company packs, three offers and two roles: 480 relevance judgments. Two independent reviewers use 0 unsupported, 1 plausible and 2 strongly supported labels and adjudicate disagreements. Split by company/group 56 train / 12 validation / 12 test; duplicated sources and related accounts cannot cross splits. Record reviewer expertise and agreement. Public or synthetic data may demonstrate mechanics; final scores must report dataset provenance and limitations.

Compare transparent rules, frozen multilingual embeddings, a pretrained multilingual reranker and bounded adaptation when data/compute justify it. Multilingual models may support imported source material even though the product itself is English-only. Report NDCG@3, relevant-offer ranking accuracy, latency, cost and errors. Keep the stronger baseline if adaptation fails on held-out data. Scores do not represent reply or purchase probabilities. A concrete candidate is [BAAI's multilingual reranker](https://huggingface.co/BAAI/bge-reranker-v2-m3); exact revision/license/runtime must be recorded before use.

| Evaluation area | Required measurement and evidence |
| --- | --- |
| Retrieval | Recall@5 against independently labeled relevant sources; source/split leakage checks |
| Grounded generation | Supported factual claims, role/channel fit, English quality and reviewer edit effort |
| Assistant context/navigation | Correct record/route selection, context refresh, stale-client rejection and task completion |
| Assistant actions | Tool-schema validity, authorization, action correctness, safe retries, approvals and audit receipts |
| OpenDesign integration | Correct brief/brand/version, successful editable output, chart/QR correctness and reviewer acceptance |
| Cloud migration | Workflow parity, reconciled durable data/jobs, latency/cost and model parity when changed |
| Commercial outcomes | Actual delivery/reply/meeting/opportunity results with attribution limits; fixture events excluded |

Set numerical release thresholds after the first frozen baseline and before the affected test run. Permission bypass, wrong-client mutation, duplicate send and unsupported factual release are blocking failures regardless of average quality. Every completed phase reports its measured results and unconfirmed capabilities honestly.

## 10. Acceptance scenarios and phase test gates

| Scenario | Required result | Earliest gate |
| --- | --- | --- |
| English-only product | No language selector/localized surface; all assistant/default generated outputs are English | P0/P1 |
| Assistant persistence | Navigate company → contact → campaign → opportunity; conversation and launcher persist | P0 |
| Live context and navigation | Select a new record; assistant identifies it and can open its related page | P0/P1 |
| Client boundary | Switch clients while a job is pending; job remains pinned to its original authorized client | P0 |
| Native reuse | Main flows use Twenty records/components; exceptions/core patches are listed and tested | P0 onward |
| Lead import replay | Duplicate Foodics-style rows and repeated imports reconcile; every source row has an outcome | P1 |
| Exclusions/readiness | Existing clients/opt-outs remain excluded; missing email holds email while eligible channels remain available | P1 |
| Role/evidence mismatch | A title or company announcement cannot substantiate an unsupported internal need/offer | P1 |
| Copy/audience/asset change | Applicable approval is invalidated; stale scheduled work cannot execute | P1 |
| Real OpenDesign path | Assistant creates/revises an artifact through the pinned engine; preview/version/editable output are linked | P1 |
| Asset correctness | Brief citations, actual chart values and QR destination match the approved snapshot | P1 |
| Reply/opt-out/retries | Later applicable touches stop; duplicate/out-of-order events do not duplicate actions | P1/P2 |
| Sales action | Assistant qualifies a lead, updates a deal and creates a follow-up task within permission | P2 |
| Provider outcome | Preparation, paused draft, submission and confirmed delivery are distinguishable | P1/P2 |
| Marketing lifecycle | Segment → content → reviewed nurture/event → captured lead → opportunity/report remains traceable | P3 |
| Cloud cutover | Data/assets/approvals/jobs reconcile on Huawei; replayed webhooks cannot trigger duplicate sends | H |
| AI benchmark | Independent labels, frozen baselines and held-out results accompany any improvement claim | EVAL phase |
| Failure recovery | Provider outage, source conflict, engine failure and worker restart produce visible, recoverable states | Every affected phase |

**Definition of done per phase:** all assigned first-release feature requirements pass their acceptance criteria; expansions assigned to later phases remain tracked separately; blocked or deferred first-release requirements keep the phase incomplete; local tests and integration checks pass; main UI and assistant flows are reviewed at desktop/tablet/mobile widths; source/permission/version/action checks pass; failure scenarios are exercised; documentation reflects actual capabilities; release commit and known limitations are recorded. After any authorized production deployment, run Playwright against the production URL for the changed flows. A simulated integration cannot satisfy a live capability gate.

Testing is proportional: native unchanged behavior receives targeted integration verification; new rules/actions and data mutations require meaningful tests. Each later phase reruns affected earlier guarantees rather than declaring regression safety from an unrelated historical test count.

## 11. Operating constraints and implementation guidance

- Reuse before rebuild. A feature's development ticket must state native reuse/configuration, extension, targeted patch or adapter and its evidence. Do not recreate Twenty's data grid, pipeline board, task manager, permission system or component library by default.
- Keep the assistant's tool authority within the user/workspace permissions, including during background jobs. Provider/API secrets never appear in page context, prompts, downloadable reports or logs.
- Approved briefs govern OpenDesign factual content. A generated visual does not create approved commercial proof. Client engine scope and object storage boundaries are tested explicitly.
- Use documented provider APIs for primary execution, with manual handoffs when capability is unavailable. Missing account access is a visible integration dependency, not permission to fabricate a live result.
- Include enrichment/research/model spend caps, timeouts and cancel/retry behavior. No mandatory fine-tuning spend before a comparison makes it useful.
- Consumer advertising, social and paid-channel capabilities enter through the defined P3/P4 modules; the initial evidence remains B2B-heavy. These broader capabilities have separate acceptance and demand hypotheses.
- This PRD does not add unrelated recruitment ATS, payroll, accounting ERP, ecommerce storefront or field-service products. Quote/payment/signature/provider extensions are separate capability decisions when the sales workflow requires them.
- Continue planning/building without requiring customer outreach; preserve a distinction between a working prototype, a supported live integration and evidence of commercial demand.

## 12. Dependencies, unresolved checks and current-state boundary

| Dependency/check | Current knowledge | Required resolution |
| --- | --- | --- |
| Product language, reuse and assistant direction | Explicit user decision | Settled in this PRD; no clarification needed |
| Exact Twenty/OpenDesign release | Prior demo has Twenty SDK source, no native install or real OpenDesign execution | Pin compatible releases; complete native/extension/license capability inventory in P0 |
| Global assistant integration | Required behavior; Twenty front components have a constrained host | P0 spike chooses extension/host-shell patch and tests global context/navigation |
| OpenDesign inline editor/tools | Engine embedding is desired; exact surface not verified | P0/P1 capability spike; use existing engine/editor with authenticated project access |
| Azure credits/resources | User reports available credits | Verify account/services/quota before provisioning; no balance is asserted here |
| Huawei credits/region | Expected after month one | Verify activation, available services and migration staging before H |
| Models/datasets/reviewers | Prior demo has rules/template code and synthetic unlabeled scaffold | Obtain reviewed evidence and independent labels; run actual baselines |
| Smartlead/Dripify/other accounts | Prior chats describe a stack, not session access | Verify authorized account capabilities, schema, sender and API limits |
| Original campaign artifacts | Requested earlier but not available in the implementation record | Audit when available; synthetic demo can proceed with visible origin |
| Team capacity and phase completion | Two-month horizon provided; throughput not measured | Size tickets after native reuse inventory; preserve complete roadmap with realistic gates |

This turn creates the PRD and documentation pointers only. It does not localize or delocalize the earlier demo, implement the popup, fork/install Twenty, integrate OpenDesign, provision/migrate clouds, send outreach or publish content. Prior prototype tests support only their reported local behaviors. They are not acceptance evidence for the new native product requirements.
