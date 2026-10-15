# 11. Real outbound workflow teardown (anonymised) and public MENA context

Research date: 15 October 2026. **Method:** structure-only reading of 39 files a working GTM team exported from one real engagement (kept in the git-ignored `GTM Files/` folder), plus web searches for public MENA context. **No names, emails, phone numbers, LinkedIn URLs or company names from the files appear in this report or anywhere in the repository.** The source company is called "the HR-services firm"; its targets are described only by type. Claims are tagged **[V]** (verified in the files or on the opened page) or **[U]** (unverified, vendor or secondary).

## 1. What the files are

The firm sells outsourced HR operations (HCM/payroll), offshoring from Cairo, recruitment and organisational development/training to Saudi fintechs, banks and SMEs. The 39 files cover one season of outbound work. **[V]**

| Artefact type | Count | What it does in the process |
| --- | --- | --- |
| Account-based campaign sheet for banks | 1 (78 contacts × 48 columns) | ABM tier 1–3, research summary, company and person triggers, pain hypothesis, 4 LinkedIn + 3 email + 1 WhatsApp drafts, follow-up logic, evidence links, confidence score, firmographics |
| Lead validation workbook | 1 (160 leads) | Rank, tier A/B/B2/C/C2, service angle, language (Arabic + English or English), signal score, CRM status, last call outcome, "in sender?", email verification, owner (4 SDRs), Keep/Drop |
| CRM import files (accounts, contacts, joined) | 13, mostly re-exported copies "(1)…(5)" | Account type, lifecycle, billing currency, services, industry (38 values), HR-maturity priority P1a/P1b/P2, hiring evidence, decision-maker vs billing role |
| CRM de-duplication workbook | 1 | "Already in CRM" sheet vs "to import" sheets |
| Partnership campaign workbook | 5 copies | 50 personalised partner leads, Day 0/2/7/16 messages, scorecard connect → accepted → reply → meeting → agreed |
| SME research pilot pack | 5 copies | Launch gate (blockers), batches, personas, EN/AR templates, interview guide, questionnaire, capture sheet (headcount band, HR set-up, 8 pain scores, maturity 0–4), scorecard |
| Account triage | 1 (77 accounts) | Bucket Client / Partner / Drop / Existing client, priority Hot/Warm/Low, service angle, rationale |
| Event follow-up list and messages | 2 | Segments A–F + HOLD, register (Founder or Leader voice), status READY / NEEDS RESEARCH |
| Decision-maker map | 1 (79 rows) | HR / CEO-Founder / Unresolved per account |
| Outreach playbooks v3 and v4 | 2 | Cadence, message structure, segment templates, reference rotation, compliance notes |
| Sender automation glue | 2 | A three-module Make.com scenario that loads one segment into Smartlead, plus instructions |
| Rendered assets | 3 | 150 HTML emails (50 leads × 3), a landing page, a mobile business card |

## 2. The process chain the files reveal

```
ICP research → segments (A–F, partners, existing clients) → scoring and tiers
  → triage bucket (client / partner / drop / existing) → decision-maker mapping
  → enrichment and email verification → angle by persona and HR maturity
  → register by recipient title → personalised multi-channel cadence
  → sender load (Make → Smartlead) and LinkedIn tool → call tasks
  → scorecard and Keep/Drop review → CRM write-back
```

Observed rules that a product must reproduce: **[V]**

1. **Two scoring systems run side by side.** Lead tier (A/B/B2/C/C2, C2 the largest at 86 of 160) and ABM tier 1–3 for banks; a third "HR maturity" priority (P1a no HR staff, P1b 1–3 HR staff, P2 established HR) decides the offer angle, not the priority.
2. **Triage is more than a score.** Accounts are bucketed Client / Partner / Drop / Existing client with a written rationale. 32 of 77 were dropped; 6 were partners. Existing clients are excluded from cold sequences and handled as a reference or expansion ask.
3. **Register follows the recipient.** v4 of the playbook fixed v3 by choosing "Founder voice" for CEO/founder recipients and "Leader voice" for HR/people leaders, instead of forcing one tone.
4. **Cadence differs by segment value.** All segments: LinkedIn connect (day 0), LinkedIn DM (day 3–4 after accept), email (7), LinkedIn bump (10), email (14), email close (30). Only the two highest-value segments get a phone call plus a CRM task on day 20.
5. **Claims are policed by hand.** Event references must be company-level ("the company was at the event"), never "great meeting you". References are rotated mechanically by row number in three fixed sets, and reference use needs the existing client's consent.
6. **Every email carries an opt-out line** (added in v4; v3 had none).
7. **Contacts with missing research are held**, not sent ("NEEDS RESEARCH", "HOLD", 4 companies and 3 missing LinkedIn URLs).
8. **Language is a per-lead field** (Arabic + English vs English only).
9. **Success is measured as a funnel**: connect → accepted → reply → meeting → agreed, not opens.
10. **Pilots have a launch gate**: a checklist of blockers must be cleared before any message goes out.

## 3. Where the work is manual, and what we automate

| Manual work seen in the files | Evidence | Product answer | PRD ID |
| --- | --- | --- | --- |
| Re-exporting the same import 5–6 times ("(1)…(5)") | 13 near-identical CRM import files | One versioned record set; imports diff against the previous version | GAP-01 |
| De-duplicating against the CRM in a spreadsheet | "Already in CRM" sheet | Duplicate check before import, by domain + email + name, with merge preview | GAP-02 |
| Keep/Drop decisions in a column | 160-row validation sheet | Triage queue with buckets, rationale and owner | GAP-03 |
| Choosing angle and register by hand | Playbook v4 changes 1 and 4 | Angle engine: segment × persona × HR maturity → angle and register | GAP-04 |
| Make.com scenario to load Smartlead | 3-module scenario JSON | Native sender push with the approved copy and lead list | GAP-05 |
| Launch gate checklist in a sheet | Pilot pack "Launch gate" | Per-campaign launch gate that blocks queueing until cleared | GAP-06 |
| Scorecard tracked in a sheet, playbook asks for CRM write-back | Partnership scorecard; playbook §10 last line | Funnel scorecard written from sequence events to the CRM | GAP-07 |
| Call outcomes typed into a column | "Last call outcome" | Voice-logged call outcome, transcribed and structured | GAP-08 |
| Reference rotation "by row number mod 3" | Playbook §0 | Reference library with consent flag and automatic rotation | GAP-09 |
| Confidence score written by hand | "Confidence Score High/Med/Low" | Per-message confidence from evidence count, freshness and register fit | GAP-10 |
| Founders hand a new SDR nothing | Meeting transcript; 4 SDR owners in one sheet | SDR onboarding kit generated from ICP, offers and plays | GAP-11 |
| Discovery interviews and pain scoring in a sheet | Pilot pack interview guide, questionnaire, 8 pain scores | Discovery-pilot play with capture form and maturity score | GAP-12 |

## 4. Public MENA context

| Claim | Status | Source |
| --- | --- | --- |
| Riyadh SDR postings consistently list prospecting, qualification, multi-channel outreach (calls, email, LinkedIn, sometimes WhatsApp), CRM logging and lead/appointment targets; tools named include HubSpot, Apollo, Sales Navigator and Salesforce | [V] for the listings opened through search; not a dataset | [GulfTalent SDR listing](https://www.gulftalent.com/saudi-arabia/jobs/sales-development-representative-629053), [Paymob SDR](https://jobs.global.vc/companies/paymob/jobs/70224771-sales-development-representative), [Sabbar SDR](https://sabbar.com/en/jobs/c-riyadh-r-sales-development-rep/id-1550d892-eeb6-442a-b81d-77830f00f8e2), [FoundIt Gulf](https://www.founditgulf.com/job/sales-development-specialist-join-solutions-saudi-arabia-62702636) |
| Many Riyadh SDR roles are junior (0–2 years) or open to people with no experience; some are restricted to Saudi nationals | [V] for those listings | Same as above |
| MENA venture funding H1 2026: about USD 1.35B (−22%) across 214 deals (−41%); UAE and KSA take 85% of fintech funding; AI took about half of funding | [U] secondary coverage of MAGNiTT; full reports not opened | [MAGNiTT H1 2026 review](https://www.magnitt.com/research/mena-venture-capital-the-h1-2026-review-51047), [Arab News](https://arabnews.com/node/2650728/amp), [MAGNiTT AI news](https://www.magnitt.com/news/ai-companies-captured-half-of-mena-s-venture-funding-in-h1-2026-from-just-a-quarter-of-all-deals-54044) |
| Saudi funding fell sharply in H1 2026 while deal count fell less | [U] MAGNiTT headline only | [MAGNiTT KSA H1 2026](https://www.magnitt.com/research/h1-2026-saudi-arabia-venture-capital-report-51049) |
| 2026 Nitaqat reforms removed the Yellow band, raised the salary threshold to SAR 4,000 and expanded profession-level quotas; compliance now depends on clean workforce records | [U] law-firm and press summaries | [Enterprise AM](https://enterpriseam.com/ksa/2026/06/25/the-2026-nitaqat-reforms-are-exposing-a-workforce-data-problem/), [Sovereign Group](https://www.sovereigngroup.com/?p=517510) |
| Saudi HR outsourcing grows about 6.6% a year to 2030; multi-process HR services grow fastest | [U] staffing-vendor report | [Communicate](https://communicateonline.me/news/innovations-group-unveils-workforce-2030-report-to-decode-saudi-arabias-evolving-talent-landscape/) |
| Hiring and headcount growth are widely used as outbound trigger signals; the timing windows quoted (60–120 days) have no independent evidence | [U] vendor guides | [Autobound](https://autobound.ai/blog/hiring-signals-b2b-sales-guide), [River Editor](https://rivereditor.com/blogs/buying-signals-outbound-sales-2026), [Valley](https://www.joinvalley.co/blog/signal-based-outbound-linkedin-buying-signals-for-b2b) |
| No public MENA dataset of SDR hiring volume, compensation or outbound process was found | [V] absence in searches on 15 October 2026 | Searched: web (US index), GulfTalent, Sabbar, FoundIt Gulf, MAGNiTT. Bayt was not returned by the search tool |

**What this means for the product.** The real workflow and the job market agree: the work is multi-channel, CRM-centred and done by junior people with little enablement. Funding concentration in UAE/KSA fintech and AI supports the "funding or hiring signal" play for those segments; Nitaqat changes create a concrete, dated hook for HR-services sellers in KSA. Signal "lift" numbers remain vendor claims and must not appear in competition material.

## 5. Synthetic demo set derived from this teardown

The structure above drives `scripts/seed-demo.ts`: eight workspaces (every plan tier plus the agency client model) and a prospect universe of about 150 accounts and 300 contacts across KSA, UAE and Egypt. The generator uses invented Arabic and English names, `.example` domains and `+20/+966/+971 55 5…` numbers, a fixed random seed, and a test that fails if any value from `GTM Files/` appears in the generated data. See PRD v3.1 §7.14 for the features this teardown added.
