# Revenue Workspace — Product Requirements v3

**Status:** current. **Date:** 13 October 2026. **Supersedes:** [PRD v2](archive/REVENUE_WORKSPACE_PRD_v2.md) (12 October 2026) and [PRD v1](archive/REVENUE_WORKSPACE_PRD_v1.md) (6 October 2026). **Inputs:** the product owner's answers of 13 October 2026, the Lara meeting transcript, and ten research reports in [`docs/research/`](../research/README.md). **Current authorization:** local implementation, installation, verification and focused commits; no push, deployment or live outreach.

v3 records the product owner's decisions on the v2 proposals and adds the business model, the "one place" component plan, the out-of-the-box plays and the Asset Studio. This document is about the product; competition rules live in [research 06](../research/06-huawei-ict-2026-27-rules.md). Every feature from v1 and v2 stays in the catalogue (§7 and Appendix A) so the team can pull work forward if it finishes early.

## 0. Summary

Revenue Workspace is **one place where non-technical go-to-market (GTM) people run outbound end to end**: find the right accounts, research them, write the first messages, make the assets that open conversations, run the sequence and keep every result in a CRM. Today a skilled "GTM engineer" builds this alone from 6–8 paid tools wired to Claude, Clay or n8n with personal connectors. Most founders, sales people and small agencies cannot do that: they do not clone GitHub repos or wire APIs. Many of the parts already exist, but they are scattered. We **gather them, tune them and deliver them in one product**, with three things on top:

1. **Plays out of the box.** Ready-made, versioned workflows ("first campaign in one chat", "funding-signal outreach", "mini-audit outreach", "weekly client report"). A user starts from a play, not from a blank canvas.
2. **An AI assistant that runs the plays.** The user describes the goal in chat; the assistant sets up the play, shows the cost before spending, drafts, and asks for approval before anything is sent.
3. **An Asset Studio built on OpenDesign.** Branded one-pagers, mini-audits, case studies, lead magnets, carousels, proposals and client reports, in English and Arabic, generated from CRM data and attached to the prospect record.

Underneath sit the parts that personal automations lack: team connectors and vault, spend caps, approvals, suppression, audit, and Egypt/Saudi/UAE compliance gates.

**Language:** English is the default for the interface and content. Arabic content (Egyptian first, Gulf as beta, business Arabic) is a first-class option and the main advantage when we pitch in MENA later. **Business model:** freemium, like Supabase: a useful free tier with hard limits, then Solo, Team, Agency and Enterprise plans with pooled credits and spend caps. **Cloud:** Azure is a placeholder because it is the only cloud where we have credits. We use it to test the demo with real services. Huawei Cloud comes only if we pass the December phase; then we migrate. Every provider-specific service sits behind an adapter so the move is configuration, not code. **Source:** the code will be open source.

## 1. Decision log (settled 13 October 2026)

All decisions below are settled by the product owner. Do not reopen a settled decision without new facts.

| # | Topic | Decision | Source / reason |
| --- | --- | --- | --- |
| D1 | Language | English is the main language: default UI, default generated content, competition material. Arabic content (Egyptian, Gulf beta, business Arabic) is supported in drafts and assets. Arabic UI later through Twenty's native RTL | Owner. Judges are international; Arabic is the MENA startup pitch. GoHighLevel's Arabic request has 308 votes open since 2023 (research 10) |
| D2 | Users and business model | Freemium. Free tier for solopreneurs with hard limits; paid tiers for founder-led teams (1–10) and small agencies. Tier table in §4 | Owner ("learn the Supabase model"). Research 07 |
| D3 | Scope | Keep the full feature catalogue (§7, Appendix A). Build the outbound loop first; pull later features forward if time allows | Owner |
| D4 | Cloud | **Azure is a placeholder** for the December demo, so the demo runs on real services; we have credits only there. If we pass the December phase, we receive Huawei Cloud resources and migrate (§8.3). The December submission is a PDF only; the demo is a bonus and we do not submit the repository | Owner, 13 Oct |
| D5 | Thesis | "Gather, tune and deliver in one place" for non-technical GTM users: plays + assistant + Asset Studio + governed connectors | Owner. Research 08 (8 tools per team, 42% overwhelmed), research 10 (learning curve and setup time are the top complaints) |
| D6 | Asset Studio | OpenDesign is a major pillar, not a side feature. Ship a template library (§5.4) | Owner. Research 09 (OpenDesign 0.24.1, Apache-2.0, 116 templates, brand-from-URL) |
| D7 | LinkedIn | In the product: manual LinkedIn tasks with copy-ready text, own-profile posting (`w_member_social`), licensed data providers and customer CSV exports. No crawling in the product or the demo. A lower-risk method for deeper LinkedIn data is decided when we reach it (§7.7, §9 item 1) | Owner, 13 Oct. Research 09 |
| D8 | WhatsApp | Opt-in only, after a reply or a form; official Cloud API; never cold | Settled in the meeting |
| D9 | Autonomy | AI researches and drafts; a human approves; a sender platform sends at capped volume. No autonomous AI SDR | Settled. Research 01 (11x case) |
| D10 | Compliance gates | Lawful basis, country channel rules, opt-out, suppression and residency flags are in the product | Owner confirmed |
| D11 | Credits and keys | Hybrid: each paid plan includes pooled AI and enrichment credits; bring-your-own-key (BYOK) for data providers removes the data-credit charge. Tier prices in §4.2 are used now and hardened with the business model later | Owner, 13 Oct. Research 07 |
| D12 | Competition data | Synthetic or consented data only in every competition artifact | Settled |
| D13 | Assistant | Spike Twenty's native AI chat, skills and MCP before building a custom shell | Settled from v2 |
| D14 | Evidence | Build the business case from public market data (§3). Do not quote unverified figures (for example "6,000 / 130 GTM engineers") | Owner: no follow-ups with Lara; use internet research |
| D15 | Huawei technology | Huawei services are the post-December target: ModelArts Studio (MaaS) for the model, ECS/CCE, RDS, DCS and OBS (§8.3). Not used before December | Owner, 13 Oct |
| D16 | Team eligibility | Confirmed by the owner. Not an open question | Owner |
| D17 | Open source | The project is open source: the code is public on GitHub; revenue comes from the hosted service, credits and agency features (open core, like Supabase and Twenty). Our licence (Apache-2.0 or AGPL) is chosen before the repository goes public. Keep secrets and customer data out of the repository from day one | Owner, 13 Oct |

## 2. Delivery context

The product is built for the market first; the Huawei ICT Competition (Innovation) is the first milestone. What matters for the product:

- **December:** we send a PDF of the idea (problem, users, solution, business model, market, moat, roadmap). An architecture plan and a demo website are bonuses; we want both, and the demo runs on real services on Azure. We do not submit the repository.
- **If we pass:** we receive Huawei Cloud resources, migrate (§8.3) and build phase **N** toward the regional stage.
- **What judges reward:** assume the 2023–24 rubric unless a newer one is published: Creativity 30, Technical complexity 25, Social value 15, Functional completeness 15, Presentation 15. For the product this means: lead with what is new (plays for non-technical users, Arabic content, MENA compliance), show real technical depth (scoring, cost-controlled waterfall, governed agent tools, Arabic evaluation), state the social value (Arabic-speaking small businesses get a sales capability that today needs an English-first expert stack), and make every shown flow complete.
- **Evidence:** every number in the PDF comes from the "safe numbers" list in [research 08 §7](../research/08-market-data.md), with the publisher named. Data in every artifact is synthetic or consented.

## 3. Problem and evidence

Use these numbers in competition material only as written here, with the caution. Full list: [research 08 §7](../research/08-market-data.md).

| Claim | Number | Source | Caution |
| --- | --- | --- | --- |
| Sales reps spend most time not selling | 40% of the week selling, 60% on other tasks | Salesforce State of Sales, 7th ed. (n = 4,050, 22 countries, Aug–Sep 2025) | Vendor survey; no Middle East sample |
| Tool sprawl | Teams use 8 tools on average; 42% of reps feel overwhelmed by tool count | Same | Same |
| Demand for one place | 84% of teams without an all-in-one platform plan to consolidate | Same | Incumbents see the same demand |
| Skills gap | Only 43% of sales and marketing teams in large US firms have formal AI training | Zapier / Centiment, Mar 2026 | Vendor; large US firms only. SMB gap must be confirmed by interviews |
| MENA software demand | MENA software spending USD 20.4B in 2026 (+13.9%) | Gartner forecast via Arab News | Quote as "Gartner forecast" |
| SMEs in the target markets | KSA: about 1.7M active SME commercial records, 8.4M employees (Monsha'at 2025). UAE: more than 1.2M companies, about 95% SMEs (Ministry of Economy, Sep 2025). Egypt: 96.3M internet users | Government sources | Records are not firms |
| AI familiarity | 45.2% of Saudi internet users use AI tools | CST Saudi Internet Report 2025 | Consumer use |
| Arabic gap | Arabic is 0.6% of websites | W3Techs, 12 Oct 2026 | Site language only; no demand data for Arabic business tools |
| AI SDR market | USD 4.1B (2025) to 15.0B (2030) | MarketsandMarkets, Jul 2025 | Analyst forecast; publishers differ widely |

**User pain** (research 10, public reviews and forums; Reddit and G2 were not reachable): the top jobs are (1) get a first campaign live without learning a tool, (2) know the cost before clicking and never lose paid credits, (3) keep automations working and be told in plain words when they break, (4) set up domains and inboxes safely. Arabic and RTL support is a medium-strength need. Design assets are a plausible need with **no independent evidence of reply lift**, so every asset play ships with a holdout (§9 item 3).

**Outbound reality** (research 01): typical cold email reply rate is about 1%; top decile 2.6–3.9%. Signal and personalization "lift" figures are vendor claims.

## 4. Users and business model

### 4.1 Segments

| Segment | Plan | Why |
| --- | --- | --- |
| Solopreneurs and first-time founders | Free, then Solo | Strong pain, lowest budget, high churn; free tier is the acquisition funnel |
| Founder-led B2B teams, 1–10 people, Egypt/KSA/UAE | Solo or Team | Founder still sells; no playbook; cannot afford a $260–400/month tool stack |
| Small B2B agencies and lead-gen freelancers, 2–20 people | Agency | Multi-client work, reporting and handover are documented pains (research 10 §5) |
| Accelerators and VCs | Channel (startup discount code) | Access to founder cohorts |
| SMEs with 10–50 people | Team / Enterprise later | Bigger budgets, longer cycles |

### 4.2 Tiers (in use now; hardened later with the business model and a real cost log)

Modelled on Supabase (hard-limited free tier, base fee plus usage, spend cap on by default) and on GTM tools that combine seats with a pooled credit meter. Details and cost reasoning: [research 07 §6](../research/07-pricing-and-freemium.md).

| | Free | Solo | Team | Agency | Enterprise |
| --- | --- | --- | --- | --- | --- |
| Price (USD/month) | $0 | $24 monthly / $19 annual | $39 per seat monthly / $32 annual, 3–10 seats | $199 monthly / $159 annual base (test $149–249) | From about $1,000 |
| Seats | 1 | 1 | 3–10 + free view-only | 5 + free client viewers | 10+, SSO |
| Workspaces | 1 | 1 | 1 | 5 client workspaces; +$25 each | Custom |
| Records | 1,000 | 10,000 | 50,000 | 25,000 per client | Custom |
| AI credits / month | 100 | 400 | 600 per seat, pooled | 5,000 pooled | Custom |
| Enrichment credits / month | 25 (BYOK unlimited) | 100 (BYOK unlimited) | 150 per seat, pooled | 1,500 pooled | Custom |
| Sending | 1 sequence, 100 sends/month from own mailbox | 5 sequences, 2,000 sends | 20 sequences per seat, 5,000 sends per seat | 10,000 sends per client | Custom |
| Plays | Starter plays | All plays | All plays + team plays | All + client templates ("snapshots") | Custom plays |
| Asset Studio exports / month | 5, with "Made with" mark | 50 | 200 per seat, shared brand kit | 200 per client, client brand kits | Custom |
| Arabic and English | Yes | Yes | Yes | Yes | Yes |
| Controls | Hard stop at quota; archive after 60 days idle | Spend cap on by default; prepaid packs | Roles, per-member caps, approvals, audit | Per-client caps, client rebilling, white-label reports | SSO, SLA, residency, invoicing |

Rules: do not gate Arabic; gate volume. Show the credit cost of each action before it runs. Credits reset monthly; prepaid packs cost more and do not expire. No cliff between tiers (each step under 2.5×). Startup code: 50% off Solo or Team for 6 months for partner accelerators.

**Payments:** Stripe lists the UAE but not Egypt or Saudi Arabia (research 07, verified). For the competition: no real billing, plans and a mock checkout only. First paying users: a merchant of record (Paddle first; confirm in writing that an Egypt- or KSA-based seller is accepted) or a UAE entity with Stripe. Later: Paymob (EGP) and Moyasar or HyperPay (SAR, mada recurring). VAT (KSA 15%, UAE 5%, Egypt 14%) needs a tax adviser before launch.

## 5. Product: one place

### 5.1 Pillars

| Pillar | What the user sees | What we gather and tune | What we build |
| --- | --- | --- | --- |
| Plays | A library of ready workflows; "start from a play" | Patterns from Clay templates, lemlist playbooks, GoHighLevel snapshots | Play engine, versioning, MENA templates, holdouts |
| Assistant | Chat that sets up and runs plays, explains scores and sources, asks for approval | Twenty AI chat, skills and MCP (spike first) | Task-level product tools, approval and cost gates |
| Asset Studio | Branded assets from CRM data, edited in chat, saved on the record | OpenDesign engine, templates, brand-from-URL | Per-tenant wrapper, our outreach templates, Arabic layouts, PDF/PNG render |
| Data and signals | Accounts, contacts and signals with honest coverage | Licensed providers (BYOK), PredictLeads/Crustdata, Crawl4AI for public web | Waterfall, caching, cost caps, coverage report |
| Sending | Sequences across email, LinkedIn tasks and call tasks | Instantly or Smartlead for email; customer's own mailboxes | Sequence state, reconciliation, deliverability pre-flight |
| CRM | One record of everything | Twenty CRM (as an app on its API/SDK; no fork) | Product objects, play records, audit |
| Governance | Team vault, budgets, approvals, suppression, compliance | — | All of it (§7.9–7.10) |

### 5.2 Out-of-the-box plays

Every play: human approval before sending, cost shown before spending, English and Arabic from the same play, a plain-language run log, results measured as replies per delivered message, holdout option on every asset play. Source: research 10 §7(b).

| # | Play | Trigger | Output | Phase |
| --- | --- | --- | --- | --- |
| P1 | First campaign in one chat | New workspace | ICP card, offer one-pager, 3-step sequence | D |
| P2 | Inbox and domain pre-flight | Mailbox or domain connected | Health report, caps, warm-up calendar, launch block until checks pass | D |
| P3 | Funding or hiring signal outreach | New funding round or job post at a target account | Signal brief, "idea for you" one-pager, drafts | D |
| P4 | Mini-audit outreach | List with websites (strong for Egyptian and Saudi SMEs) | One-page audit (en/ar), personal page link, drafts | D |
| P5 | Lead magnet in a day | User picks an offer | Checklist or short report PDF, gated page, 3 posts | D+ |
| P6 | Case study builder | Deal won or happy-client message | Case study one-pager, carousel, post | D+ |
| P7 | Weekly LinkedIn carousel | Weekly schedule | Carousel PDF and caption (posted by the user or via `w_member_social`) | N |
| P8 | Opt-in WhatsApp follow-up | Contact from a meeting, event or form | Consent log, approved template message | N |
| P9 | Reply handler | Inbound reply | Classification, draft reply, record update | D+ |
| P10 | Meeting-booked proposal | Meeting scheduled | Research brief, one-page proposal, confirmation email | N |
| P11 | Revive cold leads | 60–90 days without reply | New angle, short asset, one touch, then stop | N |
| P12 | Agency client onboarding kit | New client | Intake, brand kit from URL, client workspace from template, guided mailbox connection | N |
| P13 | Weekly client report | Weekly | Sends, replies, meetings (no opens); plain-language note; branded PDF/link | N |
| P14 | Missing-data fallback (GCC) | Lead without email or phone | Provider order, coverage score, manual LinkedIn/WhatsApp task | D+ |

Plays from the meeting's process (§6) are the engine underneath: segment, signals, scoring rubric, personas and offers, enrichment policy, research brief, message framework, sequence and guardrails are parts of every play.

### 5.3 Assistant behaviour

The assistant follows the v1 action contract (v1 §4: context, action levels, typed tools, durable jobs). It calls only product tools (`find_signals`, `score_accounts`, `enrich_contacts`, `draft_messages`, `make_asset`, `queue_sequence`), never raw provider tools. It explains every score and fact with its source, shows the cost estimate before any spend, and stops for approval at the defined action levels. Retrieved web text is untrusted and cannot trigger tools.

### 5.4 Asset Studio (OpenDesign)

OpenDesign 0.24.1 (Apache-2.0) is a single-user local daemon with an HTTP API, a stdio MCP server, 116 templates, 151 design systems and brand-from-URL. Exports: HTML, PDF, PPTX, ZIP, Markdown, MP4 (no PNG). It has no multi-tenant mode (research 09 §B10). We run it as an internal service behind our own auth, one workspace volume per tenant, through its BYOK model path so no coding-agent CLI is spawned. Our templates are added as OpenDesign skills, not as a fork. PNG and A4 PDF are rendered by headless browser.

Templates to ship, in order (research 10 §7(c)): offer one-pager; mini-audit report; case study (page + carousel); checklist lead magnet with gated page; LinkedIn carousel (1080×1350); per-prospect landing page with view tracking; short proposal; WhatsApp card; weekly client report; email header image. Rules: one brand kit per workspace or client, pulled from the website; English and Arabic are two real layouts (RTL tested), not a mirrored copy; every figure on an asset links to a source; the asset is stored on the prospect or account record; the user can change one element without regenerating the whole asset.

## 6. The process we productize (from the meeting)

Lara's outbound process, with transcript timestamps, as recorded in v2:

| # | Stage | What the GTM person does today | Tools named | Pain |
| --- | --- | --- | --- | --- |
| 1 | ICP | Market research; closest competitor's announced clients; 3–4 segments (00:05:14–00:06:26) | ChatGPT/Claude deep research | Most firms have no ICP book or playbook (00:07:52) |
| 2 | Offer per persona | Same service, different entry per role (00:00:22–00:01:45) | Docs | Offers not written down per persona |
| 3 | Signals | Hiring, funding, headcount growth, job change, keyword posts (00:06:42–00:07:46) | Crunchbase, Crustdata, Clay, PhantomBuster, Apify, Bright Data | Ready tools miss custom signals; scraping is imprecise |
| 4 | Scoring | Score out of 100; under 50 disqualified; A/B/C tiers (00:16:34–00:17:21) | Spreadsheets, Clay | Done by hand |
| 5 | Waterfall enrichment | Cheapest provider first until verified (00:17:28–00:19:17) | Apollo, Lusha, FullEnrich, Surfe, Clay, Mawsool | Poor GCC coverage; phones expensive |
| 6 | Research per prospect | A recent, specific fact to open with (00:19:21–00:20:15) | LLM research | Generic messages get no replies |
| 7 | Lead magnet | Free useful asset that proves quality (00:20:58–00:21:49) | Docs, design tools | Trust-heavy markets resist first touches |
| 8 | Multichannel sequence | Email → LinkedIn invite → email → LinkedIn → call (00:03:50–00:04:44) | Smartlead/Instantly, HeyReach/Dripify | Domain blocks; warm-up and mailbox setup |
| 9 | CRM and learning | Record replies and next steps | HubSpot, Zoho, GoHighLevel | Data spread across tools |
| — | Glue | Each tool wired to Claude/Claude Code with connectors and scheduled tasks (00:15:24–00:15:44) | Claude, MCP | Every person builds their own |

## 7. Requirements

Phase codes: **D** = December demo website (Azure). **D+** = stretch before December. **N** = only if we pass December (Huawei migration and the regional build). **L** = later (startup roadmap). Requirement IDs from v2 are kept; new v3 IDs are marked *(new)*. Appendix A lists every v1 feature with its v3 phase.

### 7.1 Onboarding and plays

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| ONB-01 *(new)* | Website-URL onboarding: AI drafts company context, ICP, offers and brand kit with cited sources | D | Draft separates facts (cited) from hypotheses; user edits before saving; brand kit applies to the first asset |
| ONB-02 *(new)* | Guided connections in plain language (mailbox OAuth, BYOK provider keys, sender platform) with a health check | D | A non-technical tester connects a mailbox and one provider in under 10 minutes without documentation |
| PLAY-01 *(new)* | Play library with the plays in §5.2; start from a play | D (P1–P4), D+ (P5, P6, P9, P14), N (rest) | A new workspace reaches an approved draft from a play in ≤ 30 minutes |
| PB-01 | ICP builder: segments with firmographic filters stored as Twenty records | D | Segment saves, versions and shows which plays use it |
| PB-03 | Offer variants per persona with approved claims and proof | D | A draft cannot use a claim outside the approved list (server-side check) |
| PB-04 | Play builder with versioning; running work keeps its version | D | A new version does not silently change approved drafts |
| PB-06 | Playbook export (PDF) — the sales playbook most firms lack | D+ | Export contains ICP, personas, offers, rubric and sequence |
| PLAY-02 *(new)* | Plain-language run log and failure alerts ("this step failed because…, do this") | D | Every failed step shows cause and next action; no silent failure |
| PLAY-03 *(new)* | Scheduled plays replace personal scheduled tasks | D | A weekly run appears in the review queue without user action and survives restart |

### 7.2 Signals and sourcing

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| SIG-01 | CSV/XLSX import (including Sales Navigator and LinkedIn connection exports by the customer) with row-level outcomes | D | Every row imported, matched, excluded, rejected or held; re-import does not duplicate |
| SIG-02 | Company signals through one provider (PredictLeads or Crustdata) behind a connector | D | Each signal stores provider, date, URL and confidence |
| SIG-03 | Custom keyword signals from public sources (news, careers pages, job boards) via Crawl4AI | D+ | Match stores source URL and excerpt |
| SIG-04 | Funding signals (Crunchbase or a regional tracker) | N | Round, date, amount and source; missing data stays unknown |
| SIG-05 | Website mini-audit checks for play P4 (speed, mobile, contact paths, Arabic version, social proof) | D | Each check stores the evidence it used |

### 7.3 Scoring and enrichment

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| SCR-01 | Deterministic rubric scoring (0–100) with per-rule explanation | D | Same input, same score; missing field shows "unknown" |
| SCR-02 | Tier cut-offs; disqualification before enrichment spend | D | Disqualified accounts never reach enrichment |
| SCR-03 | AI-suggested rule changes from won/lost outcomes | L | Shows the data; activation needs approval |
| ENR-01 | Waterfall: cache/CRM → provider 1 → 2 → 3; stop on verified result, provider limit or cost cap | D | Order, stop reason and cost per field logged |
| ENR-02 | Pre-flight cost estimate; caps per run, per member, per workspace per month | D | A run above the cap does not start; estimate vs actual shown |
| ENR-03 | Caching (emails 90 days, phones 30, misses 14) | D | Repeat request inside TTL costs nothing |
| ENR-04 | Phones only for tier A by default | D | Enforced server-side |
| ENR-05 | MENA coverage report per provider and country | N | Built from ≥ 200 test records; shows failures |
| ENR-06 | Fixture providers with the same interface for the demo | D | Fixture results labelled simulated everywhere |
| ENR-07 *(new)* | Email verification with a paid verifier first and Reacher (MIT, self-hosted) as fallback | D+ | Verification result and source stored |

### 7.4 Research, messages and Arabic

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| RES-01 | Per-prospect research brief with dated citations; facts, hypotheses, unknowns separated | D | An uncited "fact" blocks approval |
| RES-02 | Public company sources and user-provided data only | D | Banned sources are never called |
| RES-03 | Retrieved text is untrusted | D | Prompt-injection cases do not change actions |
| MSG-01 | Drafts per channel (email, LinkedIn note, call script) from the play's framework | D | Length and structure rules per channel respected |
| MSG-02 *(new)* | Voice and tone profile from the customer's own website and posts; few-shot examples with recorded origin | D+ | No scraped third-party posts in the example store |
| ARB-01 | Language per contact: English (default), Egyptian, Gulf (beta), business Arabic | D | Field on the Twenty person record; change re-drafts after confirmation |
| ARB-02 | Dialect-conditioned generation with few-shot examples | D | Each example has an origin |
| ARB-03 | Automatic checks: dialect consistency, MSA leakage, English switching, bidi rendering, banned phrases, opt-out line | D+ | Failing check shows a reason; reviewer can override with a note |
| ARB-04 | Every Arabic message needs human approval | D | No path sends an unapproved Arabic message |
| ARB-05 | Arabic evaluation harness (rubric, golden set, native reviewers, calibrated LLM pre-filter) | N | Results per dialect, with and without few-shot |
| ARB-06 | Gulf output labelled beta until reviewed by native Gulf reviewers | N | Unreviewed Gulf drafts need an explicit override |
| ARB-07 | Arabic UI via Twenty RTL and translated strings | L | Core pages mirror correctly |

### 7.5 Sequences and sending

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| SEQ-01 | Steps, delays, stop rules; reply or opt-out stops later touches across all plays | D | Fixture reply cancels pending steps |
| SEQ-02 | Email through one sender platform (Instantly or Smartlead); we do not build mailbox infrastructure | D (sandbox/fixture) | Submitted, accepted, sent, failed, replied are separate reconciled states |
| SEQ-03 | Deliverability pre-flight (play P2): SPF/DKIM/DMARC, one-click unsubscribe, bounce < 2%, complaints < 0.1%, ~30 sends per mailbox per day, warm-up age | D | A failing check blocks launch |
| SEQ-04 | LinkedIn steps as manual tasks: copy-ready text, profile link, done/skip | D | No automated LinkedIn action in the product |
| SEQ-05 | Call steps as tasks with script and allowed hours per country | D | Out-of-hours tasks flagged |
| SEQ-06 | Reply inbox and classification (play P9) with human confirmation | D+ | Opt-out applies immediately |
| SEQ-07 | WhatsApp only to opted-in contacts via the official Cloud API (play P8) | N | Send blocked without opt-in and approved template |
| SEQ-08 | Holdout groups per play and per asset (asset vs no asset) | D+ | Reply-per-delivered with sample size; no lift claim below minimum sample |

### 7.6 Asset Studio

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| STU-01 *(new)* | OpenDesign service wrapper: own auth, one volume per tenant, BYOK model path, pinned release, no CLI spawn | D | Tenant A cannot read tenant B's projects; engine version recorded per asset |
| STU-02 *(new)* | Brand kit from website URL (logo, colours, fonts) as a per-workspace `DESIGN.md` | D | First asset uses the kit; user can correct it |
| STU-03 *(new)* | Templates 1–2 (offer one-pager, mini-audit) in English and Arabic | D | Every figure links to a source; Arabic PDF renders RTL correctly |
| STU-04 *(new)* | Templates 3–6 (case study, checklist lead magnet + gated page, LinkedIn carousel, per-prospect page with view tracking) | D+ (3–4), N (5–6) | Same as STU-03 |
| STU-05 *(new)* | Templates 7–10 (proposal, WhatsApp card, client report, email header) | N | Same as STU-03 |
| STU-06 *(new)* | Edit in chat: change one element without regenerating the rest; versions and lineage; changed facts reopen review | D+ | Revision creates a new version; approved original identifiable |
| STU-07 *(new)* | Export A4/Letter PDF, PNG (headless render), PPTX where OpenDesign supports it | D (PDF), D+ (PNG), N (PPTX) | Export matches preview |
| STU-08 *(new)* | Asset stored on the prospect/account record and linked to the play and message | D | Asset opens from the record |
| DES-02 | Account research brief export | D | Matches the approved research record |

### 7.7 LinkedIn access

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| LI-01 *(new)* | Manual LinkedIn tasks with copy-ready text (SEQ-04) | D | No automated action |
| LI-02 *(new)* | Customer-uploaded LinkedIn data (connections export, Sales Navigator CSV) through SIG-01 | D | Source labelled; consent basis recorded |
| LI-03 *(new)* | Own-profile posting via official `w_member_social` (plays P6, P7) | N | Founder's OAuth; 150 requests/member/day respected |
| LI-04 *(new)* | Licensed people data (Crustdata, Apollo, etc.) through BYOK | D+ | Provider and date stored per field |
| LI-05 *(new)* | Local power-user connector (Agent-Reach / `linkedin-mcp-server`): runs only on the user's computer with the user's own session; one profile per click; no search harvesting, no background crawl, no automated messages; warning screen; daily cap; kill switch; pinned version | L — the lower-risk method is chosen when we need deeper LinkedIn data; licensed providers (LI-04) first | Cookie never leaves the user's machine; only user-chosen fields are saved, with source and deletion path |
| LI-06 *(new)* | Internal team use of Agent-Reach for non-LinkedIn research (web, RSS, YouTube, GitHub) on team laptops | Now (internal) | Not part of the product or the demo |

### 7.8 Assistant

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| AST-01 | Spike: Twenty native AI chat + skills + MCP with our Azure model endpoint vs a custom persistent popup | D (first week) | Written decision covering context, navigation, typed actions, custom LLM endpoint |
| AST-02 | Assistant runs plays step by step, explains scores and sources, asks for approval | D | Full play run from chat; no send without approval |
| AST-03 | Cost shown before every spending action | D | Estimate appears before confirmation |
| AST-04 *(new)* | "Make me an asset" in chat calls the Asset Studio and returns a preview | D | Preview and record link appear in the chat |

### 7.9 Governance and team

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| GOV-01 | Connector registry: provider, auth, owner, quotas, cost model, risk label, allowed actions | D | Admin sees status, last success/error, remaining quota |
| GOV-02 | Per-workspace vault; BYOK; keys never reach the model, browser or logs | D | Secret scan finds no key in prompts, logs or exports |
| GOV-03 | One product MCP server with task-level tools | D | Every tool call checks role, budget and approval |
| GOV-04 | Rate limiting per provider and credential | D | Burst tests stay inside provider limits |
| GOV-05 | One contact, one owner, one active sequence across the workspace | D | Second enrolment needs a handoff |
| GOV-06 | Roles: owner, operator, reviewer, viewer | D | Restricted roles cannot approve sends or change budgets |
| GOV-07 | Audit log of tool calls, approvals, costs and sends | D | A send traces to play version, draft version, approver and cost |
| GOV-08 | Agency mode: client workspaces, per-client brand kit, budget, playbook, free client viewers, client templates | N | Data and assistant history never cross clients |
| GOV-09 *(new)* | LLM tracing and cost per tenant with Langfuse (self-hosted, MIT core) | D+ | Each run records model, prompt version, tokens, cost |

### 7.10 Compliance (Egypt, KSA, UAE, EU)

Not legal advice; a local lawyer reviews before any live outbound.

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| CMP-01 | Per-contact lawful basis, data source, consent timestamp | D | Contact without a basis is held for gated channels |
| CMP-02 | Country channel rules as data: KSA and Egypt consent or documented relationship for marketing; Egypt marketing-licence field; UAE consent-first; EU blocked by default | D | Blocked send shows the rule |
| CMP-03 | Opt-out in every message; global suppression that survives re-import | D | Suppressed contact stays suppressed |
| CMP-04 | Data-residency flag per workspace | D+ | Storage region recorded |
| CMP-05 | Data-subject export and delete across records, assets, caches | N | Deletion test removes linked data and blocks re-import |

### 7.11 Billing and metering

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| BILL-01 *(new)* | Plan limits as data (§4.2): seats, records, AI credits, enrichment credits, sends, exports, storage | D | Changing a limit needs no code change |
| BILL-02 *(new)* | Usage meter per action with a published cost table in the app | D | Each spend writes a ledger entry with action, units, plan and cost |
| BILL-03 *(new)* | Spend controls: hard stop on Free; workspace cap on by default; per-member caps; alerts at 75/90/100% | D | No run exceeds a cap in tests |
| BILL-04 *(new)* | Plans page and mock checkout for the demo | D | Clearly labelled as not live |
| BILL-05 *(new)* | Real billing through a merchant of record, then local gateways (Paymob, Moyasar/HyperPay); prepaid packs; annual plans | L | Tax and seller eligibility confirmed in writing first |
| BILL-06 *(new)* | Agency client rebilling and white-label reports | L | Client invoice matches usage ledger |
| BILL-07 *(new)* | Free-workspace archive after 60 days idle, one-click restore | N | Restore returns all data |

### 7.12 Founder content (second track)

| ID | Requirement | Phase | Acceptance |
| --- | --- | --- | --- |
| CON-01 | Brand voice profile from the founder's own posts and website | D+ | Cites its examples |
| CON-02 | Post drafts in the founder's voice and language, human-approved | N | Same Arabic checks as ARB-03 |
| CON-03 | Scheduling and posting via `w_member_social` | N | Founder OAuth; limits respected |
| CON-04 | Content calendar and performance import | L | Metrics carry source and date |

### 7.13 Later modules (full catalogue)

Every v1 module stays in the product roadmap. Detailed rows and acceptance criteria are in [v1 §5](archive/REVENUE_WORKSPACE_PRD_v1.md); their v3 phases are in Appendix A.

| Module | v1 IDs | v3 phase |
| --- | --- | --- |
| CRM core (workspaces, companies, people, tasks, dedupe, exclusions, roles) | CRM-01–10, UI-01, UI-03 | D for what plays need; N for pipelines and custom objects |
| Sales (qualification, deals, meeting prep, proposals, quotes, forecasts, renewals) | SALE-01–12 | N (SALE-01, 03, 05, 06, 07, 09), L (rest) |
| Marketing (briefs, segments, nurture, social, landing pages, events, paid, attribution) | MKT-01–15 | N (MKT-04, 06, 07), L (rest) |
| Integrations (external CRMs, Make/webhooks, forms, GA4, Clarity) | INT-06–16 | N (INT-06, 11–13), L (rest) |
| Operations (rules, review queues, jobs, backups, client portal, monitoring) | OPS-01–09 | D (OPS-03, 04, 06, 09), N (OPS-01, 02, 05, 07), L (OPS-08) |
| AI evaluation (ranking, retrieval, assistant safety, adaptation, commercial experiments) | EVAL-01–05 | D (EVAL-03), N (EVAL-02, ARB-05), L (EVAL-01, 04, 05) |

## 8. Architecture

### 8.1 Components

| Layer | Component | Licence | Decision |
| --- | --- | --- | --- |
| CRM and data model | Twenty | AGPLv3 with the Twenty Application Exception; SDK and app toolkit MIT; files marked `@license Enterprise` are commercial | Build as a Twenty app or separate service on its API/SDK. **Do not modify or fork Twenty**: changes to Twenty itself must be published under AGPL |
| Asset Studio | OpenDesign 0.24.x | Apache-2.0 | Integrate unmodified behind our wrapper; add our own skills |
| Product services | Play engine, waterfall, sequence state, compliance, metering, product MCP server | Ours | Build |
| Automation connectors | Activepieces pieces | MIT outside EE folders | Reuse pieces later (N); confirm the EE boundary first. **Not n8n**: its licence allows internal business use only |
| Public-web research | Crawl4AI | Apache-2.0 | Integrate |
| Email verification fallback | Reacher | MIT | Integrate (D+) |
| LLM tracing | Langfuse | MIT core | Integrate (D+) |
| Link and page analytics | Umami | MIT | Integrate (N) |
| Inbox and WhatsApp | Chatwoot | MIT core | Integrate (N) |
| Email sending | Instantly or Smartlead (customer's mailboxes) | Commercial | Integrate via API; we do not run shared sending IPs |

Do not use: n8n as an embedded engine; Windmill, Firecrawl, Plausible, Listmonk, DocuSeal or Documenso as modified hosted forks (AGPL); any scraper or auto-updating (`@latest`) code with access to customer credentials; shared-IP sending or warm-up networks; open-source "Clay clones" as a base. Reasons: [research 09](../research/09-building-blocks-and-agent-reach.md).

### 8.2 Azure placeholder (until December)

**Owner update, 14 October:** keep the application on localhost while testing. Prepare one cost-efficient Linux server with Terraform, a separate project resource group and a Reader-only GitHub connection. No staging/production split, availability zones, application deployment or model provisioning yet. The managed services below remain an expansion option; the current target uses Docker PostgreSQL/Redis and persistent local file/vault adapters on the server disk. See [Azure preparation](../AZURE_DEPLOYMENT.md).

| Function | Azure service |
| --- | --- |
| LLM for assistant, research and drafts | Azure AI Foundry model endpoint behind our OpenAI-compatible gateway |
| App, workers, Twenty, OpenDesign | Azure Container Apps or AKS, same images as development |
| Database and cache | Azure Database for PostgreSQL, Azure Cache for Redis |
| Files and assets | Azure Blob Storage (Twenty S3-compatible storage settings through an adapter) |
| Secrets | Azure Key Vault |

### 8.3 Huawei Cloud (after passing December)

We receive Huawei Cloud resources only if we pass the December phase. Then every row below replaces its Azure placeholder.

| Function | Huawei service | Portability rule |
| --- | --- | --- |
| LLM | ModelArts Studio (MaaS): DeepSeek, Qwen or GLM through the same OpenAI-compatible gateway | Provider switch is one configuration change; Arabic evaluation reruns on the new model |
| Compute | CCE or ECS | Same container images |
| Database and cache | RDS for PostgreSQL, DCS (Redis) | Backup and restore test before cut-over |
| Files | OBS | S3-compatible adapter |
| Secrets | DEW / KMS | Same vault interface |
| Evaluation and any fine-tuning | ModelArts notebooks and jobs | Results record model, region and date |

The December architecture plan shows the Azure placeholder, the Huawei target and the cut-over steps from v1 §8.2. Every provider-specific service sits behind an adapter (model gateway, S3-compatible storage, Postgres, Redis, vault) so the switch is configuration, not code.

## 9. Moat and pushback

The product owner asked for pushback. Points where the evidence disagrees, and what we do about each:

1. **Do we need LinkedIn? Yes as a channel, no as a scraper.** LinkedIn is where B2B buyers in Egypt and the Gulf are reachable, and Lara's sequence uses it twice (invite and follow-up). The product needs three LinkedIn things: (a) manual steps with copy-ready text, (b) posting from the founder's own profile through the official API (plays P6, P7), and (c) people and company data, which licensed providers (Crustdata, Apollo, etc.) and customer exports already give without touching LinkedIn. None of these needs crawling. Agent-Reach routes LinkedIn to `stickerdaniel/linkedin-mcp-server`, which drives the user's logged-in browser and can send messages; its own FAQ says accounts "can be restricted or banned". Run on our servers with customers' cookies, it repeats the hiQ, Proxycurl and ProAPIs fact pattern and adds PDPL duties. So: nothing LinkedIn-automated before December; when we need deeper LinkedIn data, compare the lower-risk options in §7.7 (licensed providers first, then a local one-profile-per-click connector).
2. **"Gather in one place" is not a moat by itself.** GoHighLevel owns "all-in-one", and every vendor ships MCP connectors. Salesforce's own survey says 84% of teams want to consolidate, so incumbents chase the same demand. Our moat must be what accumulates: the play library tuned for MENA, Arabic evaluation data, compliance rules as data, asset templates that work in Arabic, and reply outcomes per play.
3. **Design assets are a bet.** No independent study shows that one-pagers, audits or carousels raise B2B replies; the only side-by-side test found was small, vendor-run and mixed. Keep the Asset Studio as a major pillar (D6), but ship every asset play with an asset-vs-no-asset holdout and lead the pitch with the stronger pains (first campaign without learning a tool, cost control, safe setup).
4. **Free tiers cost money and convert poorly.** The best public figure is a median 8% free-to-paid (self-reported, vendor co-produced); plan for 2–4%. The free tier must hard-stop at quota and cost under about $2–3 per active user per month worst case.
5. **Payments are hard from Egypt and KSA.** Stripe does not list either country. Billing is mocked in the demo; seller eligibility must be confirmed before launch.
6. **Licences can bite.** Twenty is AGPL: build on its API/SDK, never fork it. n8n cannot be embedded in a multi-tenant SaaS.
7. **English default lowers the Arabic advantage in the competition.** Show Arabic as a toggle in the demo (one Egyptian draft and one Arabic asset), and keep the Arabic evaluation for phase N and the MENA pitch.
8. **Cold outbound is legally constrained.** Egypt enforces its PDPL from 31 October 2026, with a licence and consent for electronic direct marketing; Saudi Article 28 already requires consent for marketing to people with no prior interaction. Plays lead with warm paths, lead magnets and consent; cold email is one play type behind country gates.
9. **Full catalogue vs focus.** Keeping every feature in the catalogue is fine; building them in parallel is not. Phase D stays the outbound loop with four plays and two templates; pull from D+ only when D passes its acceptance tests.

## 10. Success measures

| Measure | Target for the demo |
| --- | --- |
| Time from empty workspace to first approved drafts with play P1 | ≤ 30 minutes, recorded rehearsal |
| Non-technical tester connects mailbox and one provider | ≤ 10 minutes without documentation |
| Asset from template to approved PDF | ≤ 5 minutes |
| Unapproved sends, duplicate contacts, runs over cap | 0 (blocking) |
| Arabic draft acceptance by native reviewers | Reported per dialect in phase N |
| Reply per delivered (real, consented pilots only) | Reported with sample size; no lift claim from fixtures |

## 11. Plan

The December deadline is a date in December; the plan aims to finish by 30 November.

| Window | Work | Exit gate |
| --- | --- | --- |
| 13–19 Oct | Assistant spike (AST-01); Twenty + OpenDesign running on Azure; data model for plays, signals, assets and the usage ledger; 5–10 founder/agency interviews start | Spike decision written; both engines run on Azure |
| 20 Oct – 9 Nov | ONB-01/02, plays P1–P2, scoring, waterfall (fixtures + one sandbox), research, English/Egyptian drafts, approvals, compliance gates, metering and caps; idea PDF first draft | Play P1 runs end to end on fixtures |
| 10–30 Nov | Plays P3–P4, Asset Studio (STU-01–03, 07–08), sequence via sandbox sender, LinkedIn/call tasks, audit, plans page | Demo website on Azure shows one play and two assets with gates |
| 1 Dec – deadline | Idea PDF final, architecture plan, demo polish and recording; D+ items if time | PDF sent |
| If we pass | Huawei migration (§8.3), phase N plays and templates, agency mode, Arabic evaluation, WhatsApp opt-in, public repository (D17) | Regional stage |

## 12. Open questions

1. Interview list: which 5–10 founders and agencies (Cairo, Riyadh/Dubai) can we talk to before the PDF is written?
2. Which sender (Instantly or Smartlead) and which signal provider (PredictLeads or Crustdata) gives us a sandbox?
3. Who reviews Gulf Arabic in phase N?
4. Is a legal opinion on Egypt PDPL B2B direct marketing available (university, ITIDA or a mentor) before any live pilot?

## 13. Sources

Research reports: [01 GTM process and AI](../research/01-gtm-process-and-ai.md), [02 competitors](../research/02-competitors-and-positioning.md), [03 connectors](../research/03-connectors-and-apis.md), [04 MENA regulation and Arabic AI](../research/04-mena-market-regulation-arabic-ai.md), [05 Huawei competition and cloud](../research/05-huawei-ict-competition-and-cloud.md), [06 Huawei 2026–27 rules](../research/06-huawei-ict-2026-27-rules.md), [07 pricing and freemium](../research/07-pricing-and-freemium.md), [08 market data](../research/08-market-data.md), [09 building blocks and Agent-Reach](../research/09-building-blocks-and-agent-reach.md), [10 user pain and out-of-the-box](../research/10-user-pain-and-out-of-box.md). Lead-reviewer spot checks: [research README](../research/README.md). Meeting: `Lara Meeting transcript.txt`.

## Appendix A. v1 feature catalogue with v3 phases

| v1 ID | Feature | v3 phase / v3 ID |
| --- | --- | --- |
| CRM-01 | Agency/client workspaces | D (single workspace), N (GOV-08 agency) |
| CRM-02 | Companies and contacts with relationships | D |
| CRM-03 | Lead ownership and routing | D (GOV-05), N (routing rules) |
| CRM-04 | Opportunity pipelines | N |
| CRM-05 | Tasks, reminders, notes, timelines | D |
| CRM-06 | Tags, segments, saved views, bulk selection | D (segments via PB-01), N (rest) |
| CRM-07 | Validation, deduplication, reviewed merge | D |
| CRM-08 | Relationship history, existing clients, exclusions | D |
| CRM-09 | Custom objects and fields | D (product objects), N (user-defined) |
| CRM-10 | Roles, record access, client sharing | D (GOV-06), N (client sharing) |
| UI-01 | Twenty-derived design system | D |
| UI-02 | English-only experience | Replaced by D1 (English default, Arabic content, Arabic UI later) |
| UI-03 | Loading, empty, error, partial states | D |
| AI-01–02 | Persistent assistant and live context | D (subject to AST-01) |
| AI-03 | Cited workspace knowledge | D |
| AI-04 | In-app navigation | D |
| AI-05 | Typed actions | D (GOV-03) |
| AI-06 | Multi-step plans and batch execution | D (plays) |
| AI-07 | Proactive next-action suggestions | N |
| AI-08 | Client knowledge and campaign memory | D (play versions), N (memory) |
| AI-09 | Design mode with OpenDesign | D (AST-04, STU) |
| AI-10 | Durable jobs, receipts, cancellation | D |
| AI-11 | Tool policies, approval scopes, spend limits | D (BILL-03, GOV) |
| AI-12 | Stale context and untrusted instructions | D (RES-03) |
| AI-13 | Model and prompt versions, usage observability | D+ (GOV-09) |
| AI-14 | Plain-English rule editing | L |
| AI-15 | Analytics explanations | L |
| GTM-01 | Import and reconciliation | D (SIG-01) |
| GTM-02 | Offer catalogue, ICP, proof | D (PB-01, PB-03) |
| GTM-03 | Document/playbook upload and retrieval | D+ |
| GTM-04 | Research with citations | D (RES-01) |
| GTM-05 | Account–role–offer ranking | D (SCR-01) |
| GTM-06 | ABM plans and account briefs | D (DES-02), N |
| GTM-07 | Enrichment with provenance and budget | D (ENR) |
| GTM-08 | Personalized outreach and voice | D (MSG-01), D+ (MSG-02) |
| GTM-09 | Sequence branches and schedules | D (SEQ-01) |
| GTM-10 | Campaign versioning and approval invalidation | D (PB-04) |
| GTM-11 | Campaign QA, collisions, exclusions | D (GOV-05, CMP-03) |
| GTM-12 | Sender readiness and holds | D (SEQ-03) |
| GTM-13 | Export and readiness views | D |
| GTM-14 | Partnerships | L |
| GTM-15 | Event attendee follow-up | N |
| GTM-16 | Research refresh and evidence expiry | N |
| SALE-01 | Qualification and conversion | N |
| SALE-02 | Deal stages and ownership | N |
| SALE-03 | Next steps and overdue follow-up | N |
| SALE-04 | Interaction history and handoff | N |
| SALE-05 | Communications view and reply triage | D+ (SEQ-06), N |
| SALE-06 | Meeting preparation and summaries | N (play P10) |
| SALE-07 | Proposals, decks, case studies | N (STU-04/05) |
| SALE-08 | Basic quotes | L |
| SALE-09 | Won/lost and handoff | N |
| SALE-10 | Pipeline health and forecasts | L |
| SALE-11 | Renewals and expansion | L |
| SALE-12 | Team playbooks | D (plays) |
| MKT-01 | Campaign briefs | L |
| MKT-02 | Segments and lists | N |
| MKT-03 | Multi-channel calendar | L |
| MKT-04 | Content briefs and copy | N (CON-02) |
| MKT-05 | Nurture and lifecycle email | L |
| MKT-06 | Social planning and publishing | N (play P7, CON-03) |
| MKT-07 | Landing pages and lead capture | N (STU-04) |
| MKT-08 | Events and webinars | L |
| MKT-09 | Partner and referral campaigns | L |
| MKT-10 | Paid campaign planning | L |
| MKT-11 | Paid/social publishing adapters | L |
| MKT-12 | UTM attribution and funnel reporting | N (Umami), L |
| MKT-13 | Experiments and variants | D+ (SEQ-08) |
| MKT-14 | Marketing operations dashboard | L |
| MKT-15 | Measurement plans | L |
| DES-01 | Brand profiles and design-system packages | D (STU-02) |
| DES-02 | Embedded Design mode | D (AST-04) |
| DES-03 | Account research brief | D (DES-02 v2) |
| DES-04 | ABM one-pager | D (STU-03) |
| DES-05 | Campaign summary and client report | N (play P13, STU-05) |
| DES-06 | Networking card with QR | L |
| DES-07 | Proposals and sales collateral | N (STU-05) |
| DES-08 | Social, ad, email, landing creatives | D+ / N (STU-04/05) |
| DES-09 | Conversational revisions and lineage | D+ (STU-06) |
| DES-10 | Exports and asset library | D (STU-07/08) |
| DES-11 | Brand, accessibility and chart checks | N |
| INT-01–02 | Smartlead preparation and launch | D (SEQ-02, sandbox), N (live with consent) |
| INT-03 | Dripify automation | Dropped (D7) |
| INT-04 | Call tasks | D (SEQ-05) |
| INT-05 | WhatsApp | N (SEQ-07) |
| INT-06 | Email and calendar sync | N |
| INT-07 | Enrichment providers | D (ENR) |
| INT-08 | External CRM connectors | L |
| INT-09 | Make/webhooks | L (Activepieces pieces) |
| INT-10 | Forms, events, social/ad connectors | L |
| INT-11 | Provider-event inbox and reconciliation | D (SEQ-02) |
| INT-12 | Credential health and rate limits | D (GOV-01, GOV-04) |
| INT-13 | Connector catalogue | D (GOV-01) |
| INT-14 | GA4 | L |
| INT-15 | Microsoft Clarity | L |
| INT-16 | Cross-source identifiers | L |
| OPS-01 | Versioned rules | N |
| OPS-02 | Review queues and notifications | D |
| OPS-03 | Durable jobs and idempotency | D |
| OPS-04 | Audit log | D (GOV-07) |
| OPS-05 | Settings and administration | D |
| OPS-06 | Usage, budgets, cost reporting | D (BILL-02/03) |
| OPS-07 | Backups, restore, deletion | N (CMP-05) |
| OPS-08 | Client reporting and portal | N (GOV-08), L (portal) |
| OPS-09 | Monitoring and incident recovery | D |
| EVAL-01 | Ranking experiment | L |
| EVAL-02 | Retrieval and grounded generation | N |
| EVAL-03 | Assistant safety tests | D |
| EVAL-04 | Model adaptation | L |
| EVAL-05 | Commercial experiments | L (needs real outcomes) |
