# 16. Positioning debate outcome and proposed PRD amendments

17 October 2026. Strategy and documentation only. This report records a two-round adversarial debate on Caravan's positioning, first cohort and PRD gaps, plus the main agent's verification of every disputed claim. **It proposes PRD amendments; it does not edit the PRD, the application or Figma.** No outreach, paid project-model calls, deployment or push.

## How the debate ran

| Round | Who | Output |
| --- | --- | --- |
| 1 | Independent reviewer: Claude Opus 5.5, High effort | Challenge of the HRO/payroll ICP, three positioning options, five PRD gaps, three objections |
| Rebuttal | Main agent: Claude Opus 5.5 | Each claim checked against code, the meeting transcript and re-fetched public sources |
| 2 | Fresh reviewer with no memory of round 1: Claude Opus 5.5, High effort, given the original brief, the round 1 brief and the rebuttal | Revised recommendation, withdrawn arguments, amendment list, remaining disagreements |

**Account deviation.** The owner asked for the Lara account. The T3 gate rejected it twice before any task started: `This account is at 87% of quota. Stop implementation on it and shift to an account under 80%.` The owner then chose a native Opus 5.5 High subagent on the Skylink account. Model and effort match the request. The reviewers are independent sessions but not an independent account or model family, so treat their agreement as weaker than a cross-model review.

The full round briefs and the rebuttal are in ignored local files (`.local/positioning-debate/`). They cite private-source structure, so they are not committed.

## Evidence base, stated honestly

- **One engagement.**
  - The GTM files (research 11) and the meeting transcript describe the same HR-services firm.
  - The speaker describes her company's Human Capital Management and offshoring services (transcript 00:00:36–00:00:59, transliterated English in Arabic script). These match the firm in research 11 §1.
  - So the practitioner's advice and the files are **one source, not two**. The only independent corroboration is public company pages and vendor material.
- **The operator is in-house.**
  - She speaks of "our company's" services, not a client's.
  - The person doing the Clay/Smartlead/Make/Claude glue work therefore works inside an HR-services seller.
- **Demand is unmeasured.** No evidence exists of willingness to pay, switching, retention or lift. Everything below is a desk-research decision under time pressure, not product-market fit.

## Decision: three layers

| Layer | Decision | Confidence |
| --- | --- | --- |
| **Product category** | AI GTM workspace for small B2B services firms selling across borders (Egypt to the Gulf first) | Moderate as a shape. Low for demand outside HR services |
| **First distribution cohort** | Founder-led, Egypt-based HR-services firms (HCM/payroll, EOR, offshoring) selling into the GCC: the founder still sells, and the firm has made or is making its first BD/SDR hires. It must have a sellable offer and at least one approved proof item | Desk-research hypothesis |
| **First workflow pack** | "HR-services account follow-up" (workflow below) | Grounded in one engagement's operating files |

**Category statement:**
> Caravan is an AI GTM workspace where small B2B services teams research, qualify, follow up and record named accounts in English and Arabic, with a person approving every send.

**Public positioning for the first cohort:**
> For founder-led HR-services firms selling into the Gulf: turn the accounts you already work into reviewed Arabic/English follow-ups and company profiles, with every outcome and every hold recorded in your CRM.

This replaces research 15's sentence ("turn prospect lists into researched Arabic/English outreach…") as the recommended public line. The main verb changes from "outreach" to "follow up" for three reasons:
- PRD §9 item 8 already says plays lead with warm paths and cold email sits behind country gates.
- Egypt's PDPL reaches full enforcement on **31 October 2026**, with licences and consent required for direct electronic marketing ([Clyde & Co, 21 January 2026](https://www.clydeco.com/en/insights/2026/01/egypt-regulatory-update-on-data-privacy)).
- Saudi draft amendments to Arts 28/29 are in consultation **6 October–5 November 2026**. They would require verifying valid consent where a prior relationship is relied on ([Clyde & Co, 8 October 2026](https://www.clydeco.com/en/insights/2026/10/sdaia-publishes-draft-amendments-to-the-pdpl)).

Neither source addresses B2B contacts. This is not legal advice.

**Settled decisions are unchanged.** The broad catalogue, outbound loop first, chat-first entry, Asset Studio as a major pillar, English default with Arabic content, the five tiers, open source and Azure/Huawei all stand. The cohort matches PRD D2's existing paid segment ("founder-led teams (1–10)"). The wording change keeps the outbound loop; it only stops leading with cold sending.

## Why the cohort is defined by a trigger, not a headcount

- **The practitioner's advice.** Asked who Caravan should target, she advised solopreneurs and founder-led teams of under about ten people, early in their GTM process and before product-market fit (transcript 00:37:26–00:38:07). Research 15 did not cite this. She also cautioned that she may be speaking only from her own work (00:38:26).
- **What the debate kept:** founder-led.
- **What it rejected:**
  - **Pre-PMF:** PB-03 blocks drafts that lack approved proof, so a pre-PMF founder cannot finish the first workflow.
  - **Total headcount under 10:** an HR-outsourcing firm's headcount includes its deployed workforce (research 15, ICP card).
- **Buying triggers** come from her own list of signals for Caravan's buyers (00:07:30–00:07:46): posting about GTM, hiring a first GTM engineer, or hiring an SDR with lead-generation duties.
- **Upper guard:** at most 5 people doing BD. The source engagement had four owner labels; a "first 1–3 hires" rule would exclude the very engagement the evidence comes from.

## Corrections to earlier research

| Earlier claim | Correction | Evidence |
| --- | --- | --- |
| Research 15: OUTSOURCY "publishes an HRO/EOR SDR workflow"; first research priority | Downgrade to **workflow evidence only**. On 17 October the page listed 15 roles: teachers, retail in Libya, a media buyer, a payroll specialist and the SDR role "posted 5 months ago" for GCC, Europe and Africa. The page may list vacancies OUTSOURCY recruits for clients; it does not settle whether the SDR role is its own | [Careers page](https://out-sourcy.com/current-jobs/), fetched 17 October 2026 |
| Round 1: the transcript never mentions HR | Withdrawn. A keyword count missed transliterated terms (6 occurrences) | Transcript 00:00:36–00:00:59 |
| Round 1: the tooling pain belongs to an external agency operator | Withdrawn. The operator is in-house | As above |
| Round 1: legal gating is missing, and exposure sits at the centre of the offer | Gating is built. `COUNTRY_RULES` / `channelHolds` (`packages/backend/src/policy.ts:129`) require a basis per country, a consent timestamp and the Egypt marketing licence. Defects listed in A3 below | Code |
| Rebuttal: a prospect-level batch foreign key gives a cohort | Rejected. `Prospect` is unique per `sourceKey` and re-imports are diffed, so a prospect-level key would relabel earlier campaigns. Tag `Sequence` instead | `schema.prisma` |
| Rebuttal: `Sequence.state = "simulated"` is enough provenance | Rejected. `reviewProspect` sets every open sequence, including simulated ones, to `cancelled`, and `scorecard` does not filter by state | `workspace.ts:706–712`, `gtm-service.ts:305` |

## The first workflow ("HR-services account follow-up")

1. Onboard from the website: page text and brand hints only, as implemented (`workflows.ts:692`). Confirm the offer and one approved proof item (PB-03).
2. Import a batch of 50–200 rows with diffing and duplicate holds (SIG-01, GAP-01/02, implemented).
3. Triage into client / partner / drop / existing (GAP-03, implemented).
4. Split by **evidenced** lawful basis. Rows without one stay visibly held, with the rule shown.
5. Per account: a cited research brief (RES-01), angle and register (GAP-04), an EN/AR draft, and a capability profile *(new, A6)*.
6. A person approves. Generation runs immediately within credit caps; sending always waits for approval.
7. Export the approved, basis-cleared items to the customer's own sender, then re-import outcomes *(new, A5)*. LinkedIn and calls stay manual tasks.
8. Scorecard for that batch *(new, A4)*.

**Fiction until built:**
- New-account discovery: `search_accounts` reads saved records only (`agent/tools.ts`).
- Live enrichment (`providers.ts:257`) and live sending (`workflows.ts:768`). Both guards stay.
- The Figma brand-book extraction screens.
- Any reply, meeting or conversion lift.

**Demo note.** D12 requires synthetic data. The share of synthetic contacts with a recorded basis (`demo-data.ts`) is a demo setting. A batch where most rows are held, each with its reason, is an honest and readable story.

## Proposed PRD amendments

Change types: **MI** missing implementation · **WAC** weak acceptance criteria · **NPR** new product requirement · **UBA** unvalidated business assumption · **DOC** document fix.

| # | PRD ID / section | Type | Change | Acceptance test | Phase |
| --- | --- | --- | --- | --- | --- |
| A1 | SCR-01/02, PB-01 (`policy.ts:45`) | MI + WAC | Scoring reads a workspace rubric (pack default) instead of fixed weights. Role matching works for Arabic titles. Today `inferPersona` matches Arabic and `score` does not; it also fixes the size band at 1–200 staff | The same prospect ranks differently under two rubrics. "CEO" and "الرئيس التنفيذي" get equal points. A 5,000-employee account scores by the workspace's rubric, not a fixed band. Each rule still explains itself. Disqualified prospects never reach enrichment | D |
| A2 | New PK-01 "workflow packs as data" (affects GAP-04, GAP-12, `contracts/src/gtm.ts:17`, `discovery-guide.ts`, `gtm-service.ts:432`) | NPR | A pack supplies discovery questions, the maturity dimension and its bands, angle-matrix keys and rubric defaults. Ship one HR-services pack and one generic B2B-services fallback. No plugin system or marketplace. GAP-04's criterion names "the pack's maturity dimension", not "HR-maturity" | A generic-services workspace is never asked about payroll and never needs `hrSetup`. The HR pack passes the existing tests unchanged. Inferred maturity stays labelled "inferred" until confirmed | D |
| A3 | CMP-01/02 (§7.10; `workspace.ts:683`, `policy.ts:129`) | MI | Record basis evidence (type, source, date, recorder). Require the country to be set explicitly: today the review schema silently defaults it to `EG` and allows only EG/SA/AE. All six GCC countries must be representable; any without a reviewed rule stays blocked | Re-reviewing an SA prospect without a country never turns it into EG. A KW prospect is held as "country blocked". A `relationship` basis without evidence is held | D |
| A4 | GAP-07, SEQ-08, §10 (`gtm-service.ts:305`) | MI + WAC | Tag `Sequence` with batch and play version (no Campaign model). Add provenance (`live` / `simulated` / `imported`) to `ProviderEvent`. Every stage counts distinct prospects. "Positive reply" is a label a person confirms. §10 gains activation and repeat-batch measures for Caravan itself | Simulated events stay excluded by default even after `reviewProspect` cancels their sequences. The scorecard filters by batch and date. Stage counts reconcile to distinct prospects | D |
| A5 | New EXP-01 "approved-batch export and outcome import" (complements GAP-05, SEQ-02) | NPR | An honest D-phase bridge to the customer's existing sender while live submission stays guarded | The export holds only approved drafts for basis-cleared contacts, each with its approval digest. Re-imported outcomes are marked `imported` and appear under that batch. The live guard is unchanged | D |
| A6 | STU-05, §5.4: capability-profile template | NPR; lift is a UBA | A brand-level company/capability profile (EN/AR) reusing the A4/flipbook renderers, plus an optional account-tailored cover. Grounded by the 22 stored `send_profile` labels; lift unproven | Built only from approved proof. Arabic renders RTL. Attaches to the account and the draft. Ships with an asset-vs-no-asset holdout (SEQ-08) | D+ |
| A7 | §4.1 segments, §0 summary | UBA | Add the first-cohort row with its trigger-based definition, labelled "desk-research hypothesis", plus the switch rule below | The row exists with the label and the switch rule. Nothing claims measured demand | D |
| A8 | AI-01, D19, §0 item 2, §4.2 rules, kit HTML (`gtm-service.ts` ~425), §9 item 8 | DOC | Remove "a spending tool produces a quote, never a run", "never execute without a `SpendApproval`" and "approves every message and every cost". State instead: spending runs within reserved caps; sending waits for human approval. Add the Egypt and Saudi dates to §9 item 8 | Searches for "never a run" and "every cost before it runs" find nothing. Send-approval wording remains. §9 item 8 cites 31 October 2026 and 6 October–5 November 2026 | D |

**Lower-cost UI changes inside the settled decisions** (no catalogue removal):
- Rename the "Find accounts" starter to "Rank my accounts" until a discovery provider exists.
- For the HR pack, put Draft follow-up, Company profile and Rank accounts first in the Home row. Carousels stay in the catalogue.

## Switch rule for the first-cohort message

"Category broad, message narrow" is a distribution bet, so its exit is written down in advance. The owner sets these thresholds; they are decision rules, not forecasts. Switch the public message to the generic B2B-services line if any of these holds:

- **(a)** Of the first 10 HR-services firms that reach a demo or trial, fewer than 3 supply an approved offer, one proof item and a 50–200-row account list within 7 days.
- **(b)** Sign-ups or replies from services firms outside HR outnumber HR firms by 2:1.
- **(c)** Product check before December: run the de-identified acceptance scenario under the HR pack and the generic pack. If both produce identical questions, angles and ranks, the HR message has no product backing. Fix the pack or broaden the message.

## Remaining disagreements

No full consensus is claimed.

1. **Cohort boundary.** Narrowed but open. Round 2 prefers "first 1–3 BD hires"; the main agent keeps an upper guard of 5 BD people so the source engagement's own shape qualifies. Only switch-rule test (a) can settle this.
2. **Deleting derived data when consent is withdrawn** (Saudi draft Art. 29). The main agent defers to round 2: do not build to a draft. CMP-05 stays at N and is reviewed after the consultation closes on 5 November 2026. Resolved for now.
3. **Evidence weight.** Both reviewers and the main agent are Opus 5.5 instances, and every cohort view rests on one engagement plus public pages. Treat the decision as reversible.

## Verification

- **Main agent, 17 October 2026:**
  - Read `policy.ts` (score, `COUNTRY_RULES`, `channelHolds`), `contracts/src/gtm.ts`, `gtm-service.ts` (discovery schema, scorecard, kit HTML), `workspace.ts` (`reviewProspect`), `providers.ts`, `workflows.ts`, the Prisma schema, `Home.tsx`, `agent/prompts/system.md` and the PRD requirement rows.
  - Re-fetched the OUTSOURCY page and both Clyde & Co alerts.
  - Searched the transcript for transliterated terms and read the cited passages.
- **Not confirmed:**
  - How B2B contacts are treated under either PDPL.
  - Whether OUTSOURCY's SDR role is its own vacancy.
  - Any budget, switching intent or Gulf data coverage.
- No application tests were run; this is documentation only.
