# Revenue Workspace — Product Requirements v2

> **Superseded on 13 October 2026 by [PRD v3](REVENUE_WORKSPACE_PRD_v3.md)**, which records the product owner's decisions on the proposals below.

**Status:** proposed for review. **Date:** 12 October 2026. **Supersedes:** [PRD v1](REVENUE_WORKSPACE_PRD_v1.md) (6 October 2026) for direction, scope, segment, language and cloud. **Inputs:** the Lara meeting transcript (`Lara Meeting transcript.txt`), its English explanation (`Lara Meeting - Analysis - English.pdf`) and five research reports in [`docs/research/`](../research/README.md). **Current authorization:** documentation only.

Decisions marked **Proposed** reopen v1 decisions because the meeting and the research brought new facts. They need the product owner's confirmation before build work starts. Sections of v1 that v2 does not change stay in force (§10).

## 0. Summary

Revenue Workspace is one shared, governed workspace where a small B2B team in Egypt and the Gulf runs the whole outbound process that Lara described: ICP and offers, signals, scoring, enrichment, research, personalized messages, multichannel sequences and the CRM record of what happened. Today a skilled GTM person builds this alone from 6–8 paid tools wired to Claude or Claude Code with personal connectors and scheduled tasks. Each person's setup is private, unaudited and hard to hand over. Revenue Workspace turns that setup into **shared, versioned "plays"** that every team member runs the same way, with team-level connectors, spend caps, approvals, suppression and compliance checks.

Four things change from v1:

1. **Focus.** The December build covers the outbound loop only. Sales, marketing and paid-media modules from v1 move after the competition.
2. **Language.** English interface, but messages and posts in **Egyptian Arabic, Saudi/Gulf Arabic (beta), business Arabic and English**. Every Arabic message is human-approved.
3. **Users.** Founder-led B2B teams (1–10 people) and small B2B agencies in Egypt, KSA and UAE. Solopreneurs are the free entry tier, not the revenue base.
4. **Cloud.** The judged demo runs on **Huawei Cloud** (ModelArts Studio MaaS for the LLM, OBS for files, ECS/CCE for compute). Azure is for development only.

## 1. Decision log

| # | Topic | v1 decision | v2 decision | Why | Status |
| --- | --- | --- | --- | --- | --- |
| D1 | Language | English only; no Arabic output | English UI. Content in Egyptian Arabic (first), Saudi/Gulf "white" Arabic (beta), business Arabic (formal fallback) and English. Per-contact language/dialect field. Arabic UI later through Twenty's native RTL (2.40.0) | Meeting: "if we get the Arabic right, we win" (00:43:50). Research 04: English-only fails Egyptian owner-operators and Saudi SMEs. Twenty now mirrors RTL natively | **Proposed** |
| D2 | Users | Agencies and consultancies; in-house teams | Founder-led B2B teams 1–10 people and small B2B agencies/lead-gen freelancers (2–20) in Egypt, KSA, UAE. Solopreneurs = free tier. Accelerators = distribution channel | Meeting (00:37:30–00:38:09): solopreneurs and founder-led teams under 10. Research 02: solopreneurs have the lowest budget and highest churn; agencies have real team and multi-client needs | **Proposed** |
| D3 | Scope before the demo | P0–P4 (112 features: CRM, GTM, sales, marketing, paid, portal) in 8 weeks | Outbound loop + governance + Arabic + one lead-magnet asset. Founder content module is a stretch goal. Everything else after the competition | Meeting: "let's start with outbound" (00:35:46); nobody does outbound well, inbound already has tools. 112 features in 8 weeks is not credible for a 3-student team | **Proposed** |
| D4 | Cloud | All phases and the December demo on Azure; Huawei only after qualifying and receiving credits | Judged demo path on Huawei Cloud from the first submission. Azure for CI, dev and fallback only | Research 05: the Innovation brief says entries "must use Huawei AI-related technologies" and Huawei tech is scored (25 points, 2023–24). Vouchers went to approved teams after registration, not after a stage | **Proposed** (confirm 2026–27 rules) |
| D5 | Core thesis | AI-assisted all-in-one revenue workspace | "Shared playbook + governed connector layer" for outbound. Integration alone is not the product | Research 02/03: almost every tool now ships an MCP server; Twenty has MCP and agents. Governance, team memory and MENA compliance are what personal automations lack | **Proposed** |
| D6 | LinkedIn | Dripify CSV / API adapter (P1–P4) | Draft-and-copy for messages; human sends. Own-profile posting via LinkedIn `w_member_social`. No scraping, no browser automation in the core product | LinkedIn bans scraping and automation and has won against hiQ, Proxycurl and ProAPIs (research 03/04) | **Proposed** |
| D7 | WhatsApp | Manual task in MVP; API later | Opt-in only, after a reply or a form; never cold. Out of the demo | Meta policy: opt-in plus approved templates; ~$0.06 per marketing message (unverified); meeting: "WhatsApp is expensive" (00:32:59) | Settled in meeting |
| D8 | Sending autonomy | Approval-bound actions | Unchanged and stricter: AI researches and drafts; a human approves; a sending platform sends at capped volume. No autonomous AI SDR | 11x churn case; no evidence that full autonomy beats review; domain and LinkedIn risk (research 01) | Settled (v1 + research) |
| D9 | Data providers | Product adapters | Bring-your-own-key per workspace. We do not resell data credits | Avoids credit-reseller margin risk; matches how teams already pay for Apollo/Lusha (research 02) | **Proposed** |
| D10 | Competition data | Synthetic fixtures | Synthetic or consented data only in every competition artifact | Competition rule: designs must not infringe privacy; Egypt PDPL enforcement 31 Oct 2026 | Settled |
| D11 | Assistant | Custom persistent popup on Twenty (host-shell patch likely) | Same behaviour, but first spike Twenty's native AI chat, skills and MCP (2.0–2.40) with a Huawei MaaS model before building a custom shell | Twenty now ships AI chat, record references and skills; a custom shell may be unnecessary | **Proposed** |
| D12 | OpenDesign assets | Four assets in P1 (brief, one-pager, report, networking card) | One asset in the demo: a lead magnet (one-page market insight or audit) plus the account brief. Others later | Meeting: lead magnets open conversations in trust-heavy markets (00:20:58–00:21:49) | **Proposed** |

## 2. The process we are productizing (from the meeting)

Lara's process, in order. Timestamps refer to the transcript.

| # | Stage | What the GTM person does today | Tools named | Pain the meeting named |
| --- | --- | --- | --- | --- |
| 1 | ICP | Market research, look at the closest competitor's announced clients, define 3–4 segments (00:05:14–00:06:26) | ChatGPT/Claude deep research | Most firms have no ICP book or sales playbook (00:07:52) |
| 2 | Offer per ICP and persona | Same service, different entry: CEO = "we take HR off your hands"; HR manager = "we take part of your load" (00:00:22–00:01:45) | Docs | Offers are not written down per persona |
| 3 | Signals and micro-segments | Hiring, funding, headcount growth, job change, keyword posts ("expansion", "recommend an offshore team") (00:06:42–00:07:46) | Crunchbase, Crustdata, Clay; custom scraping with PhantomBuster, Apify, Bright Data | Ready-made tools miss custom signals; scraping is imprecise; best results mix both (00:11:51–00:12:04) |
| 4 | Scoring and tiers | Score out of 100 from ICP rules; under 50 disqualified; A/B/C tiers (00:16:34–00:17:21) | Spreadsheets/Clay | Done by hand per person |
| 5 | Waterfall enrichment | Cheapest provider first, then the next, until verified (00:17:28–00:19:17) | Apollo, Lusha, FullEnrich, Surfe, Clay; Mawsool for GCC | GCC coverage "very, very bad"; phones are the most expensive; Mawsool expensive and unconvincing |
| 6 | Research per prospect | Find a recent, specific fact to open with (00:19:21–00:20:15) | LLM deep research | Generic messages get no replies |
| 7 | Lead magnet | Free, useful asset that shows the quality of the work; interest = need signal (00:20:58–00:21:49) | Docs/design tools | Trust-heavy markets (Saudi) resist first touches |
| 8 | Multichannel sequence | Email → LinkedIn invite → follow-up email → LinkedIn → call (00:03:50–00:04:44) | Smartlead/Instantly on warmed domains (2–3 mailboxes each), HeyReach/Dripify, calls | Company domain gets blocked; warm-up and mailbox setup (00:23:27–00:24:48) |
| 9 | CRM and learning | Record replies, next steps, what worked | HubSpot, Zoho, GoHighLevel | Data spread across tools |
| — | Glue | Each tool connected to Claude / Claude Code with connectors and scheduled tasks (00:15:24–00:15:38) | Claude, Claude Code, MCP | Every person builds their own; "we should build this into the product instead of making people do the overhead" (00:15:38–00:15:44) |

A second track was discussed: content for founders (brand guidelines, deep research on what works in their market, scheduled posts; 00:27:03–00:28:32). It is a stretch goal in v2 (§5.12).

## 3. Users, buyer and positioning

### 3.1 Segments

| Segment | Role in v2 | Why |
| --- | --- | --- |
| Founder-led B2B teams, 1–10 people, Egypt/KSA/UAE | Primary user | Founder still does sales; no playbook; cannot afford a $260–400/month tool stack (research 01 estimate) |
| Small B2B agencies and lead-gen freelancers, 2–20 people | Primary paying buyer (to validate) | Multi-client work is real team use; outbound is their daily job; they pass costs to clients (research 02) |
| Solopreneurs, pre-product-market-fit | Free/entry tier | Strong pain but lowest budget, highest churn, unstable ICP (research 02) |
| Accelerators and VCs | Distribution channel | Access to founder cohorts; small volumes, so not a revenue base |
| Saudi/UAE SMEs, 10–50 people | Later | Bigger budgets but longer cycles, PDPL exposure and incumbent CRMs |

### 3.2 Positioning (draft)

"For small B2B teams selling in Egypt and the Gulf, Revenue Workspace is the shared outbound workspace that turns one expert's playbook into plays the whole team runs: it finds the right accounts, writes first messages in the buyer's own dialect for a human to approve, and keeps every signal, message, cost and reply in one CRM — inside local data-protection rules."

### 3.3 What is defensible and what is not

| Defensible (if we build the data) | Not defensible |
| --- | --- |
| Playbook-as-data: ICP, offers per persona, scoring rubric, signals and message frameworks stored as versioned team records, with outcomes fed back | "All-in-one" (GoHighLevel's brand) |
| Governance: team vault, spend caps, approvals, suppression across all members and channels, audit | Integrations or MCP wiring (every vendor ships connectors) |
| MENA compliance by design: lawful basis, country channel rules, Egypt marketing-licence field, opt-out, residency flag | "We write Arabic" with a prompt (models improve for everyone; Lahjty sells Arabic copy for $9) |
| Owned Arabic evaluation: native-reviewed corpus and rubric per dialect and sector, with reply data per variant | Waterfall enrichment, signal alerts, AI personalization (standard in Clay, Unify, lemlist) |
| Honest MENA data-coverage report per provider and country | Low price alone (Unify and Attio have free tiers) |

Closest competitors: GoHighLevel (agency all-in-one, $97–497), HubSpot Breeze Prospecting Agent (~$1 per lead), Unify (free tier), Clay ($185+), and MENA claimants Sulsaly, Mawsool, SalesMind AI and Edesy (vendor claims only). Details: [research 02](../research/02-competitors-and-positioning.md).

## 4. Product concept: plays

A **play** is a versioned, shared definition of one outbound motion. It replaces the private chain of prompts, connectors and scheduled tasks that one person keeps today.

| Play part | Content | Example (from the meeting) |
| --- | --- | --- |
| Segment | Firmographic filters | Fintech, 11–50 employees, Egypt/KSA |
| Signals | Required and optional triggers with lookback | Raised funding in last 12 months; hiring an HR generalist |
| Scoring rubric | Weighted rules out of 100; tier cut-offs | 11–25 employees = 20; funding = 25; HR hire = 30; <50 disqualify; A ≥ 80, B ≥ 65, C ≥ 50 |
| Personas and offers | Offer variant per buyer role, approved claims | CEO: outsource HR entirely. HR manager: take part of your workload |
| Enrichment policy | Provider order, fields, per-contact and per-run cost caps | Email only for B/C; phone only for A |
| Research brief | What to look for per prospect; banned sources | Recent event, launch, hire; no LinkedIn scraping |
| Message framework | Structure, tone, language/dialect, length per channel; few-shot examples | Egyptian Arabic for Egyptian founders; business Arabic for Saudi executives |
| Sequence | Steps, channels, delays, stop rules | Email → LinkedIn invite (manual) → email → LinkedIn note (manual) → call task |
| Guardrails | Approval policy, daily caps, country rules, suppression, holdout share | Every Arabic message reviewed; 10% holdout for learning |

A play run has states: draft → configured → running (sourcing, scoring, enriching, researching, drafting) → awaiting review → approved → handed to sender → reconciled. Plays can be **scheduled** (for example, "check signals every Monday"), which replaces personal scheduled tasks. A play template library ships with 3–4 MENA examples (HR services, software agency, fintech vendor, offshoring).

## 5. Requirements

Phase codes: **D** = December competition build; **D+** = stretch in the December build if D is done; **L** = later (after the competition). IDs are new in v2; §9 maps v1 IDs.

### 5.1 Playbook (ICP, offers, personas)

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| PB-01 | ICP builder: segments with firmographic filters, written as records in Twenty | D | A segment saves, versions and shows which plays use it |
| PB-02 | AI-assisted ICP draft from a website, a service description and named competitor clients, with cited sources | D | Draft separates facts (cited) from hypotheses; user edits before saving |
| PB-03 | Offer variants per persona with approved claims and proof | D | A draft cannot use a claim outside the approved list; the check is server-side |
| PB-04 | Play builder (§4) with versioning; changing a rubric or offer creates a new version | D | Running work keeps its version; a new version does not silently change approved drafts |
| PB-05 | Play template library (3–4 MENA examples) | D | A new workspace can start from a template in under 10 minutes |
| PB-06 | Playbook export (PDF/Markdown) — the "sales playbook" most firms lack | D+ | Export contains ICP, personas, offers, rubric and sequence of a play |

### 5.2 Signals and sourcing

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| SIG-01 | CSV/XLSX import of accounts and contacts with row-level outcomes (from v1 GTM-01) | D | Every row is imported, matched, excluded, rejected or held for review; re-import does not duplicate |
| SIG-02 | Website- and dataset-based signals through one provider (PredictLeads or Crustdata search) behind a connector | D | Each signal stores provider, date, URL and confidence |
| SIG-03 | Custom keyword signals from public company sources (news, careers pages, job boards) — no LinkedIn scraping | D+ | Keyword match stores the source URL and excerpt |
| SIG-04 | Funding signals (Crunchbase or a regional tracker) | L | Round, date, amount and source shown; missing data stays unknown |
| SIG-05 | Scheduled signal checks per play | D | Schedule runs on the server, survives restart and writes new candidates to a review list |

### 5.3 Scoring and tiers

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| SCR-01 | Deterministic rubric scoring (0–100) with per-rule explanation | D | Same input gives the same score; a missing field shows "unknown", never a silent 0 |
| SCR-02 | Tier cut-offs and disqualification before enrichment spend | D | Disqualified accounts never reach enrichment |
| SCR-03 | AI-assisted rule suggestions from won/lost outcomes | L | Suggestion shows the data behind it; activation needs approval |

### 5.4 Enrichment (waterfall)

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| ENR-01 | Waterfall: cache/CRM → provider 1 → 2 → 3; stop on verified result, max providers or cost cap | D | Order, stop reason and cost per field are logged |
| ENR-02 | Pre-flight cost estimate; caps per run, per workspace per day and per month | D | A run above the cap does not start; actual vs estimated cost is shown |
| ENR-03 | Caching (emails 90 days, phones 30 days, misses 14 days) | D | A repeat request inside the TTL costs nothing |
| ENR-04 | Phones only for tier A by default | D | Policy is visible in the play and enforced server-side |
| ENR-05 | MENA coverage report per provider and country (hit rate, bounce, cost per valid email) | D+ | Built from at least 200 test records; shows failures, not only hits |
| ENR-06 | Demo uses fixture providers with the same interface; live providers only with a consenting account | D | Fixture results are labelled simulated everywhere |

### 5.5 Research and personalization

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| RES-01 | Per-prospect research brief with dated citations; facts, hypotheses and unknowns separated (v1 GTM-04) | D | Every personal fact in a draft links to a source; an uncited "fact" blocks approval |
| RES-02 | Research runs on public company sources and user-provided data only | D | Banned sources (LinkedIn scraping, personal social accounts) are not called |
| RES-03 | Retrieved text is untrusted: it cannot trigger tools or change guardrails (v1 AI-12) | D | Prompt-injection test cases in research text do not change actions |

### 5.6 Messages and Arabic content

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| MSG-01 | Drafts per channel (email, LinkedIn note, call script) from the play's framework and the research brief | D | Draft respects length and structure rules per channel |
| ARB-01 | Language/dialect per contact: English, Egyptian, Saudi/Gulf (beta), business Arabic, mixed; default inferred, editable | D | Field exists on the Twenty person record; change re-drafts only after confirmation |
| ARB-02 | Dialect-conditioned generation with few-shot examples from the customer's own content plus a hand-written seed set | D | No scraped third-party posts in the example store; each example has an origin |
| ARB-03 | Automatic checks before review: dialect consistency, MSA leakage, English switching, bidi/RTL rendering of mixed strings, banned phrases, opt-out line present | D | Failing checks show a reason; reviewer can override with a note |
| ARB-04 | Every Arabic message needs human approval; approval records reviewer and dialect competence | D | No path sends an unapproved Arabic message |
| ARB-05 | Arabic evaluation harness: rubric (dialect fidelity, naturalness, register, cultural fit, factual/claim fidelity, channel format, compliance), golden set, native reviewers, LLM judge only as a calibrated pre-filter | D | Demo shows measured results for the chosen model(s), Egyptian vs Saudi, with and without few-shot |
| ARB-06 | Saudi review by external native reviewers; Saudi output labelled beta until reviewed | D | Unreviewed Saudi drafts cannot be approved by a non-Saudi reviewer without an explicit override |
| ARB-07 | Arabic UI through Twenty's native RTL plus translated product strings | L | Product surfaces mirror correctly; no mixed-direction layout bugs on core pages |

### 5.7 Sequences, sending and replies

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| SEQ-01 | Sequence steps with delays and stop rules; reply or opt-out stops later touches (v1 GTM-09) | D | Fixture reply cancels pending steps for that contact across all plays |
| SEQ-02 | Email sending through one sender platform (Instantly v2 or Smartlead) — we do not build mailbox infrastructure | D | Submitted, accepted, sent, failed, replied are separate reconciled states; demo uses a sandbox or fixture |
| SEQ-03 | Deliverability pre-flight: SPF/DKIM/DMARC, one-click unsubscribe, bounce < 2%, complaint target < 0.1%, ~30 sends per mailbox per day, warm-up age | D | A campaign with a failing check cannot launch |
| SEQ-04 | LinkedIn steps as manual tasks: copy-ready text, profile link, done/skip | D | No automated LinkedIn action exists in the product |
| SEQ-05 | Call steps as tasks with script and allowed calling hours per country | D | Tasks outside allowed hours are flagged |
| SEQ-06 | Reply inbox and classification (interested, not now, wrong person, opt-out) with human confirmation | D+ | Classification shown with confidence; opt-out applies immediately |
| SEQ-07 | WhatsApp follow-up only to opted-in contacts through the official Cloud API | L | Send blocked without recorded opt-in and an approved template |
| SEQ-08 | Holdout groups (signal vs no signal, personalized vs generic) per play | D+ | Results report reply-per-delivered with sample size; no lift claim below a minimum sample |

### 5.8 Lead magnets and assets (OpenDesign)

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| DES-01 | Lead magnet: one-page market insight or audit per segment, generated through OpenDesign from approved data (v1 DES-04 adapted) | D | Every figure on the asset links to a source; the asset links to the play and account |
| DES-02 | Account research brief export (v1 DES-03) | D | Brief matches the approved research record |
| DES-03 | Remaining v1 assets (campaign report, networking card, proposals) | L | As in v1 |

### 5.9 Governance, connectors and team

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| GOV-01 | Connector registry: provider, auth type, owner (workspace or user), quota windows, cost model, risk label, allowed actions, approval policy | D | Admin sees each connector's status, last success/error and remaining quota |
| GOV-02 | Per-workspace credential vault; keys never reach the model, the browser or logs; BYOK | D | Secret-scanning test finds no key in prompts, logs or exports |
| GOV-03 | One product MCP server with task-level tools (`find_signals`, `score_accounts`, `enrich_contacts`, `draft_messages`, `queue_sequence`) instead of proxying raw provider MCPs | D | The assistant cannot call a raw provider tool; every tool call checks role, budget and approval |
| GOV-04 | Rate limiting per provider and credential (token bucket, backoff, webhooks preferred) | D | Burst tests stay inside provider limits |
| GOV-05 | Team suppression and ownership: one contact, one owner, one active sequence across the workspace | D | A second member cannot enroll a contact already in an active sequence without a handoff |
| GOV-06 | Roles: owner, operator, reviewer, viewer; approval policies per action level (v1 §4.3) | D | Restricted roles cannot approve sends or change budgets |
| GOV-07 | Audit log of every tool call, approval, cost and send | D | A send can be traced to play version, draft version, approver and cost |
| GOV-08 | Agency mode: several client workspaces per agency, per-client brand, budget and playbook | L (validate first) | Data and assistant history never cross clients (v1 CRM-01) |

### 5.10 Compliance (Egypt, KSA, UAE, EU)

Not legal advice; a local lawyer must review before any live outbound.

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| CMP-01 | Per-contact lawful basis (consent, prior relationship, other), source of data and consent timestamp | D | A contact without a basis is held for country-gated channels |
| CMP-02 | Country channel rules: KSA and Egypt — consent or documented relationship required for marketing messages; Egypt — workspace marketing-licence field; UAE — consent-first default; EU — blocked by default | D | Rules are data, not code; a blocked send shows the rule that blocked it |
| CMP-03 | Opt-out in every message; global suppression list that survives re-imports | D | Re-importing a suppressed contact keeps it suppressed |
| CMP-04 | Data-residency flag per workspace (KSA draft localisation; Egypt cross-border approval) | D+ | Workspace shows where data is stored; region choice is recorded |
| CMP-05 | Data-subject request: export and delete a person across records, assets and caches | L | Deletion test removes linked data and prevents reimport |

### 5.11 Assistant

The v1 action contract (§4 of v1: context, action levels, typed tools, durable jobs) stays. v2 changes:

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| AST-01 | Spike: Twenty native AI chat + skills + MCP with a ModelArts MaaS model vs a custom persistent popup | D (week 1) | Written decision with evidence: context, navigation, typed actions, custom LLM endpoint |
| AST-02 | The assistant runs plays step by step, explains scores and sources, and asks for approval at the defined action levels | D | Full play run from chat with approvals; no send without approval |
| AST-03 | Scheduled plays replace personal scheduled tasks | D | A weekly play run appears in the review queue without user action |

### 5.12 Founder content module (second track)

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| CON-01 | Brand voice profile from the founder's own posts and website | D+ | Profile cites the examples it learned from |
| CON-02 | Post drafts in the founder's dialect and voice, with human approval | D+ | Same Arabic checks as ARB-03 |
| CON-03 | Scheduling and posting to the founder's own LinkedIn profile via `w_member_social` | L | Posting needs the founder's OAuth; 150 requests/member/day respected |
| CON-04 | Content calendar and performance import | L | Metrics carry source and date |

### 5.13 Huawei technology map (competition)

| Function | Huawei service | Phase | Acceptance |
| --- | --- | --- | --- |
| LLM for assistant, research summaries and Arabic drafts | ModelArts Studio (MaaS): DeepSeek / Qwen / GLM through an OpenAI-compatible gateway | D | The demo runs with Azure services switched off; provider switch is one configuration change |
| Files and generated assets | OBS (through Twenty's S3 storage settings) | D | Upload, download and asset links work against OBS |
| Application and workers | ECS/Flexus or CCE in the nearest region with MaaS | D | Same container images as development |
| Database and cache | RDS for PostgreSQL and DCS (Redis), or containers if vouchers do not cover them | D+ | Restore test passes |
| Evaluation runs | ModelArts notebooks/jobs for the Arabic evaluation and any fine-tuning experiment | D+ | Evaluation results record model, region and date |

The architecture diagram in the design document highlights each Huawei component and our own code separately from Twenty.

## 6. Success measures

| Measure | Target for the demo | Notes |
| --- | --- | --- |
| Time from empty workspace to first approved play run | ≤ 30 minutes with a template | Measured in a recorded rehearsal |
| Arabic draft acceptance by native reviewers | Reported per dialect; Egyptian target ≥ 70% "send with light edits" | Threshold set after the first frozen baseline (v1 §9 rule) |
| Duplicate or double-contact sends | 0 in the test suite | Blocking failure |
| Spend vs cap | 0 runs over cap | Blocking failure |
| Unapproved sends | 0 | Blocking failure |
| Reply per delivered (only with real, consented pilots) | Reported with sample size; no lift claim from fixtures | Benchmarks: ~1% typical cold email reply, 2.6–3.9% top decile (research 01) |

## 7. Plan to the competition

The 2026–27 season is open. Prior seasons judged a design submission (design document, PPT and a ~5-minute demo video) in January–February, then national/regional presentations (10 + 5 minutes) and a global final in Shenzhen. Egypt competes in the North Africa region. Exact 2026–27 Egypt dates are unconfirmed.

| Window | Work | Exit gate |
| --- | --- | --- |
| Week 0: 12–18 Oct | Get the 2026–27 rulebook and Egypt dates from Huawei Egypt / the ICT Academy; confirm team eligibility (3 students + 1 instructor, same university); open the Huawei Cloud account and ask for vouchers; ask Lara for her sources and tool URLs; start 5–10 founder/agency interviews; confirm D1–D12 | Answers recorded in TASKS.md |
| P0: 19 Oct – 1 Nov | Twenty pinned on Huawei ECS; MaaS gateway; OBS storage test; play and connector data model in Twenty; vault; assistant spike (AST-01); Arabic evaluation set-up | Twenty runs on Huawei with MaaS and OBS; spike decision written |
| P1: 2 – 29 Nov | Playbook, signals (one provider + CSV), scoring, waterfall (fixtures + one live sandbox), research, English/Egyptian/Saudi drafts, checks, approvals, compliance gates, sequence via one sender in sandbox, LinkedIn/call tasks, audit and caps | One full play run from template to reconciled fixture replies, on Huawei |
| P1.5: 30 Nov – 20 Dec | Lead magnet via OpenDesign, Arabic evaluation results, coverage report (if time), failure paths, polish, demo video script and recording | Recorded end-to-end demo with a failure path |
| Submission: Dec – Feb | Application form, design document with Huawei technology map, PPT, video (≤5 min preliminary), Q&A rehearsal | Submitted per official dates |
| After | v1 sales, marketing, analytics, agency mode, Arabic UI, content module | Separate approval |

## 8. Pushback on the current ideas

The product owner asked for pushback. These are the points where the evidence disagrees with the meeting or with v1.

1. **"A structured system for the whole team instead of personal automations" is weakest exactly where we aim it.** Firms of 1–10 people usually have one person doing outbound; 91% of companies with a GTM engineer have exactly one (secondhand data). A shared git repo with a Claude Code baseline is a free substitute for technical teams. The team value is real for agencies (many clients, many senders) and for founder + 1–2 juniors. Validate with interviews before betting the pitch on it.
2. **Arabic is a reason to buy, not a moat.** The newest frontier models score 42.7–53.1% on a Saudi dialect-and-culture benchmark, so quality is a real gap. But better base models help every competitor, and Sulsaly, Mawsool, SalesMind AI and Lahjty already claim Arabic. Our moat must be the owned evaluation corpus, the reviewer workflow and reply data per dialect.
3. **Pre-PMF solopreneurs are a poor revenue base.** Lowest budget, high churn (~9% monthly for micro-businesses in vendor benchmarks), unstable ICP, small volumes, and they compare us with free tiers. Keep them as the free tier; test agencies as the paying buyer.
4. **Scraping viral posts in Saudi and Egyptian dialect is a legal trap.** LinkedIn's User Agreement bans scraping; the hiQ judgment even ordered deletion of algorithms built from scraped data. Use the customer's own posts and a hand-written seed set; five examples measurably improved dialect output in AL-QASIDA.
5. **"Azure for the demo, Huawei later" probably costs points.** The Innovation brief says entries must use Huawei AI technology and must show it in the architecture diagram; technical complexity (25 points in 2023–24) rewards it. The first judged artifact is the demo video, so "we will migrate later" scores nothing.
6. **v1's 112 features in 8 weeks is not credible.** Judges score "functional completeness" of what is shown and require it to be "fully functional with no glaring issues". One complete outbound loop beats five half-built modules.
7. **Cold outbound in Egypt and KSA is legally constrained now.** Egypt enforces its PDPL from 31 October 2026 and requires a PDPC licence plus consent for electronic direct marketing. Saudi Article 28 already requires consent for marketing to people with no prior interaction, and the draft adds proof duties and data localisation. The product must lead with consent, relationships, lead magnets and warm paths; cold sequences are one play type with country gates.
8. **Do not quote "6,000 GTM engineers / 130 in the Arab world".** No source was found; measured title-holders are about 1,200–1,750 worldwide. A judge can falsify it in one search. Say "a small, fast-growing role; most firms have nobody in it."
9. **Signal and personalization "lift" numbers are vendor claims.** No controlled evidence was found. Build holdouts (SEQ-08) and report our own numbers.
10. **"GTM tool on Twenty" will read as a wrapper.** Creativity is 30 points and asks for "no well-known similar solution". Lead with what is new (Arabic dialect evaluation, MENA compliance gates, playbook-as-data), and frame social value as SME inclusion: Arabic-speaking small businesses getting a sales capability that today needs an English-first expert stack.
11. **Twenty can absorb our features.** It already has MCP, agents, workflows and RTL. Our value must sit in plays, governance, compliance and Arabic evaluation — not in CRM screens.
12. **Team eligibility may block the entry.** The 2023–24 rule requires three students and one instructor from the same university. Confirm who is on the roster before more build work.

## 9. v1 feature mapping

| v1 group | v2 treatment |
| --- | --- |
| CRM-01–10, UI-01–03 | Keep what plays need (workspaces, companies, people, tasks, roles, dedupe, exclusions). English-only rule in UI-02 replaced by D1. Pipelines and advanced CRM → L |
| AI-01–15 | Keep the action contract; AI-01/02 subject to AST-01 spike; AI-09 (Design mode) only for DES-01; AI-14/15 → L |
| GTM-01–16 | Folded into PB, SIG, SCR, ENR, RES, MSG, SEQ. GTM-14/15/16 (partnerships, events, evidence expiry) → L |
| SALE-01–12 | All → L |
| MKT-01–15 | All → L, except MKT-04 copy rules reused by CON-02 |
| DES-01–11 | DES-03/04 → v2 DES-01/02; others → L |
| INT-01–16 | INT-01/02 → SEQ-02 (Instantly or Smartlead, one only); INT-03 (Dripify automation) dropped by D6; INT-05 → SEQ-07 (L); INT-07 → ENR; INT-08 (external CRMs) → L; INT-13 → GOV-01; INT-14–16 (GA4, Clarity) → L |
| OPS-01–09 | OPS-03/04/06 → GOV-04/07, ENR-02; others keep their v1 phase intent, after the competition |
| EVAL-01–05 | EVAL-03 (assistant safety) stays D; ARB-05 is the new headline evaluation; EVAL-01/04 → L |

## 10. What stays from v1

These v1 sections remain the reference unless a v2 decision above changes them: §3 reuse architecture (Twenty, OpenDesign licensing notes), §4 assistant action contract and action levels, §6 core records and cross-record rules, §8.1 portability practices, §9 AI measurement discipline (frozen baselines, independent labels, no lift claims from fixtures) and §11 operating constraints. v1 §2 decision 1 (English only), §2 decision 7 (Azure-first), §7 (P0–P4 plan) and §8.2 (post-qualification migration) are replaced by D1, D4 and §7 above.

## 11. Open questions for the product owner

1. Confirm or reject D1–D12, especially D1 (Arabic content), D2 (agencies as buyer), D3 (outbound-only scope) and D4 (Huawei-first demo).
2. Who is on the competition roster? Are three members students at one university, with an instructor from it?
3. Who can review Saudi Arabic? Budget for 2–3 external Saudi reviewers?
4. Which sender (Instantly or Smartlead) and which signal provider (PredictLeads or Crustdata) will have a sandbox account?
5. Ask Lara: the source of "6,000 / 130", the URLs of the tools heard as "hire mina" and "fund gcc", real GCC reply rates by channel, and concrete cases where personal automations hurt a team.
6. Is a legal opinion on Egypt PDPL direct marketing (B2B) available through the university, ITIDA or a mentor before any live pilot?

## 12. Sources

Meeting: `Lara Meeting transcript.txt` (Arabic, ~49 minutes) and `Lara Meeting - Analysis - English.pdf`. Research and the lead reviewer's spot checks: [docs/research/README.md](../research/README.md). Key primary sources: [Huawei ICT Competition 2023–24 Innovation brief](https://erzurum.edu.tr/Content/duyuru/dosya/0c8ce51f-7ee5-4ace-aac5-a614a0b4ae2c.pdf), [Egypt PDPL executive regulations (Clyde & Co)](https://www.clydeco.com/en/insights/2026/01/egypt-regulatory-update-on-data-privacy), [Saudi PDPL draft amendments (Clyde & Co)](https://www.clydeco.com/en/insights/2026/10/sdaia-publishes-draft-amendments-to-the-pdpl), [Saudi dialect benchmark (arXiv 2608.29990)](https://arxiv.org/abs/2608.29990), [Twenty releases](https://twenty.com/releases), [LinkedIn User Agreement](https://www.linkedin.com/legal/user-agreement), [WhatsApp Business Policy](https://whatsappbusiness.com/policy/), [Google sender guidelines](https://support.google.com/a/answer/81126).
