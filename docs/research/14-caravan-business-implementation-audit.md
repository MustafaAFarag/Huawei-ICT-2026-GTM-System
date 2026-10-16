# Caravan: business promise versus implementation

17 October 2026. Audit only. No application or Figma changes, paid generation, outreach, deployment or push.

Caravan has useful working foundations for organising imported prospects, reviewing evidence, producing outreach and saving work to CRM. Its strongest commercial promise—helping a particular kind of business start more qualified sales conversations—still depends on unfinished data, delivery and outcome integrations. Expanding the creative surface before validating that promise increases the risk of becoming a broad assistant customers can replace.

This is a judgement about the inspected implementation and available evidence, not proof that customers will reject the product. A competition prototype can reasonably simulate providers. A commercial promise must describe those boundaries accurately.

## Reading and evidence

- Supplied PDF: *The Founder’s Playbook: Building an AI-Native Startup*, all 36 pages extracted locally with `pdftotext -layout`. Relevant sections: problem validation, pp. 9–14; focused MVP and scope, pp. 16–18; measurement and repeat usage, pp. 19–20; repeatable growth and economics, p. 22; domain depth, learning and integrations, pp. 26–30. Original: `/home/mustafa/Downloads/Personal Projects/Anthorpic Founder's Playbook.pdf`.
- Alex Hormozi / Acquisition.com: [market selection checklist](https://www.acquisition.com/files/pick-your-niche-checklist.pdf), [pricing and value checklist](https://www.acquisition.com/files/pricing-value-checklist.pdf), [Offers training](https://www.acquisition.com/training/offers) and [Leads training](https://www.acquisition.com/training/leads). These are primary materials. Training indexes were inspected; this audit does not claim to have watched all embedded videos or read all three books.
- Current source, schema, prompts, relevant tests, [PRD v3.1](../prd/REVENUE_WORKSPACE_PRD_v3.md), [recorded verification](../VALIDATION.md), [workflow teardown](11-real-workflow-teardown.md) and [Figma delivery boundaries](../design/figma-redesign-delivery.md). Code takes precedence where older status documents differ.
- Four additional read-only behavioral checks in ignored `.local/business-audit/verify.ts`; five existing tests passed in the discovery-guide and draft-quality suites. No database calls or external requests in the additional checks.

Hormozi’s useful lens here is to choose a reachable buyer with a painful problem and purchasing power, then improve the result, confidence, speed and ease of the offer. Those are business heuristics; they do not establish that this market wants Caravan. I would not mechanically apply the worksheet’s premium-pricing advice before measuring willingness to pay and delivery cost.

The playbook’s most relevant warning is that a working prototype and broad feature list do not establish customer demand. Its later discussion also describes general AI tools coordinating prospect research, outreach and CRM work (p. 13): orchestration alone is therefore a competitive claim to test.

## Prioritised findings

Priority describes the consequence for selling the promised workflow, not a security severity.

| Priority | Finding | Consequence |
| --- | --- | --- |
| P0 | Lead sourcing and live execution do not yet fulfil the broad promise | We cannot demonstrate a complete real customer-acquisition loop |
| P0 | Qualification is generic and has an Arabic-title defect | The shortlist can be wrong even when generation is fluent |
| P0 business evidence | Repeat use and willingness to pay are not established by the repository evidence | Further features may optimise an unvalidated proposition |
| P1 | Broad buyer positioning conflicts with HR-specific implementation | Different customers receive the same underlying assumptions |
| P1 | First-use choices and play steps expose too much orchestration | A non-technical customer still needs to know the process |
| P1 | Outcomes and learning stop short of commercial attribution | More replies or assets cannot yet demonstrate better sales results |
| P1 | Credits are enforced, but commercial delivery cost remains unproven | Current plan allowances cannot yet establish sustainable margins |

### 1. The beginning and end of the lead workflow remain incomplete

**Observed:** `search_accounts` explicitly searches saved prospect records, not an external prospect universe ([tools.ts](../../packages/backend/src/agent/tools.ts), line 111). Signal collection queries hiring/funding for a known company domain ([providers.ts](../../packages/backend/src/providers.ts), line 157). Live contact enrichment throws `No licensed contact enrichment sandbox is configured...` before calling any provider (line 257). Queueing in live mode throws `Live sender activation requires a verified sandbox. This release does not submit outbound messages.` ([workflows.ts](../../packages/backend/src/workflows.ts), line 768). Fixture mode creates simulated sequences; LinkedIn/call steps become manual CRM tasks.

**Interpretation:** “Find accounts” on Home can mean something much broader to a new buyer than selecting existing imported records. Generating a draft is useful, but it does not establish lead discovery, delivery or a sales conversation. The commercial promise currently outruns those boundaries.

**Next:** For the first pilot, use a clearly identified customer-owned list and supported contact data, then connect one delivery and reply path. An explicit manual handoff with reconciled results is a valid first slice. Do not unlock the live branch by removing its guard. Label discovery, import, research, enrichment and delivery separately.

### 2. Qualification does not express the customer’s actual buying criteria

**Observed:** [policy.ts](../../packages/backend/src/policy.ts), line 45, assigns the same four weights to every workspace: an English title pattern, employee range, website presence and hiring/funding. The function takes only a prospect snapshot; it does not consume the workspace ICP, approved offer or a workspace-specific rubric. Industry is not part of the calculation. The score is also used to block downstream work, so this affects execution as well as display.

**Local reproduction:** A synthetic CEO with 40 employees, a website and hiring receives **100** whether its industry is fintech or an unrelated sector. Replacing `CEO` with `الرئيس التنفيذي` gives **70**, because the role expression matches English titles only. No business context changed.

**Next:** Define explicit per-workspace/segment qualification rules, bilingual role normalisation, exclusions and explanations. Keep an explainable baseline; test it against seller-reviewed examples before treating ranks as qualified opportunities. Fix the Arabic-title inconsistency regardless of which market is selected.

### 3. Buyer validation has not caught up with implementation breadth

**Observed:** The PRD targets solopreneurs, founder-led teams, agencies and later SMEs across several countries ([PRD §4](../prd/REVENUE_WORKSPACE_PRD_v3.md)). The project has real operator-workflow evidence from a meeting and 39 exported files ([research 11](11-real-workflow-teardown.md)). That establishes operational pain and process detail. The inspected evidence does not establish a cohort of independent paying customers, repeated product use or retention. Synthetic workspaces and technical eval scores answer different questions.

**Interpretation:** We have a researched hypothesis and functioning product parts. We cannot infer product-market fit from shipped pages, passing tests or convincing demo records. Buyer evidence may exist outside this repository; it was not available to this audit.

**Next:** Choose one initial buyer cohort and interview five operators about their last real campaign: time spent, failures, existing spend, who approves purchases and what would justify switching. Ask for a real pilot and a payment decision. Compliments and hypothetical purchase intent do not count as repeat demand.

### 4. The product is broad in positioning but HR-specific underneath

**Observed:** [discovery-guide.ts](../../packages/backend/src/discovery-guide.ts), line 17, asks about HR, payroll and employee onboarding regardless of the seller’s business. The capture contract requires `hrSetup` ([gtm-service.ts](../../packages/backend/src/gtm-service.ts), line 432). `inferMaturity` infers a maturity band from company headcount ([gtm.ts](../../packages/contracts/src/gtm.ts), line 18), while the real workflow described HR staffing/setup as a different variable. A headcount guess cannot establish that operating fact.

**Next:** Separate three things: **Caravan’s buyer**, **that buyer’s prospects**, and **the service being sold**. An HR-services firm using Caravan is our customer; its target company’s HR director is that customer’s prospect. A narrow HR-services campaign product is a plausible starting hypothesis because we have process evidence there. It is not a validated market choice. If broader use remains the goal, make industry-specific questions/rules explicit packs and keep inferred attributes labelled until confirmed.

### 5. The user still has to orchestrate too much

**Observed:** [Home.tsx](../../apps/web/src/components/chat/Home.tsx), line 20, offers seven starters, five of them asset formats. The entry question asks what Nabil should prepare. [Plays.tsx](../../apps/web/src/components/screens/Plays.tsx) exposes individual scoring, enrichment, drafting and asset steps. The assistant prompt starts one action per turn ([system.md](../../packages/backend/src/agent/prompts/system.md)); schedules produce step reviews rather than a complete autonomous campaign chain. Website onboarding currently extracts proposed page text and a simple brand suggestion ([workflows.ts](../../packages/backend/src/workflows.ts), line 692). Company setup still expects the user to supply ICP and an approved offer ([ContextForm.tsx](../../apps/web/src/components/screens/ContextForm.tsx)).

**Interpretation:** Chat improves access, but a blank composer does not teach a new seller which job matters next. A format catalogue highlights the part that overlaps general creative assistants. The deeper visual Brand book routes in Figma remain proposed UI, not implemented extraction/generation.

**Next:** Keep chat as the entry, but anchor the initial path to one goal: choose audience → clarify offer → import/confirm a small list → review relevant research and drafts → hand off/send through the chosen channel → track follow-ups. Carry campaign state across those steps. Ask for a format when it helps that task. Retain the approved Asset Studio direction; prioritise its expansion using observed sales-workflow needs. Do not reintroduce a confirmation on every already-authorised generation action.

### 6. Reporting exists, but the learning loop is incomplete

**Observed:** [gtm-service.ts](../../packages/backend/src/gtm-service.ts), line 306, already reports prepared/delivered/replied/meeting/agreed and compares asset versus holdout sequences. This is a useful foundation, not an absent analytics feature. However, it aggregates the workspace without a campaign/date cohort, counts any reply rather than a qualified positive reply, and derives meetings/agreement from confirmed call logs. Sequence counts and distinct prospect outcomes use different units. [events.ts](../../packages/backend/src/events.ts) stores delivery/reply event kinds, not inbound reply content, intent, opportunity amount or won/lost reasons. Simulated provenance is recorded in audit/state, but the `ProviderEvent` model has no explicit live/simulated field for filtering a future mixed dataset.

**Next:** Connect each campaign version to target segment, offer, draft, asset, contact and channel; capture deduplicated delivery/reply events plus reviewed positive/negative intent, meetings held, opportunities and outcomes. Use explicit provenance and time windows. Track activation and repeat campaign use for Caravan itself. Start with simple comparisons and manual outcome capture; do not build automatic model optimisation before reliable labels exist. A fixed count of 100 deliveries is not, by itself, statistical evidence of lift.

### 7. Pricing is ahead of verified unit economics

**Observed:** Plan prices/allowances and action credits exist ([contracts](../../packages/contracts/src/index.ts), line 181). Budget reservations, member caps and refunds are real safeguards ([metering.ts](../../packages/backend/src/agent/metering.ts)). The generation gateway tracks tokens in a process-local map ([model.ts](../../packages/backend/src/model.ts), line 4); usage tables primarily settle internal credits. The inspected path does not establish a persistent per-workspace currency cost ledger covering model/provider calls, retries, rendering and support. Recorded verification explicitly leaves actual currency cost unresolved. Checkout remains a demo boundary.

**Next:** Preserve the agreed tier design while treating willingness to pay and margins as hypotheses. For pilots, record actual supplier costs, operator/support time, successful work units and what customers agree to pay. A hosted checkout is not required to ask for a paid pilot, but settlement needs a supported payment route. More expensive pricing or more generous free usage would both be guesses today.

## What to keep, and what could become defensible

Keep the evidence/source distinction, versioned approvals, durable jobs, cancellation, spend limits, opt-out/suppression handling, CRM records and bilingual rendering. They make a real campaign workflow more trustworthy. Reusing Twenty/OpenDesign is reasonable; rebuilding them would not establish demand.

The defensible direction is accumulated expertise for a specific customer: useful qualification rules, accepted/rejected outreach edits, native-language evaluation, reliably recorded sales outcomes and integrations customers repeatedly use. Those become an advantage only when they produce better work for actual users. More prompts, another format and a larger synthetic dataset do not establish a moat. Deeper workflow integration should earn retention through utility and preserve customer data portability.

## Proposed next sequence and decision gates

These are recommendations, not authorised implementation changes or industry benchmarks.

1. **Choose one cohort and job.** Interview five suitable buyers; document problem frequency, current workaround, purchase authority and strongest reasons not to switch. Use existing HR-services process access if those operators are available, but test willingness to pay.
2. **Run three assisted pilots.** Each brings its own appropriate prospect list and one real offer. Use one channel and a small reviewed batch. Record manual handoffs honestly. Any outreach/provider activation is a separate operational step, not part of this audit.
3. **Measure value and effort.** Predefine a target such as the existing PRD’s ≤30 minutes to first approved draft batch, record founder assistance, and measure delivery, reviewed positive replies, meetings and cost with explicit denominators. Do not promise a number of sales or meetings.
4. **Look for repeat behaviour.** Follow the same users over four weeks. Record whether they run another batch, what blocks them and whether they pay. A small pilot supports a next-build decision; it cannot establish market-wide conversion rates or product-market fit.
5. **Build the bottleneck shown by pilots.** Prioritise accurate qualification and one complete delivery/reply loop over new format breadth. Test whether an asset improves the chosen workflow before making it routine. If users value list cleanup and preparation most, position that honestly. If they need new prospect discovery, that provider path becomes a real requirement.

An honest description of the current slice is: **“Turn your existing prospect list into researched, reviewed outreach and organised follow-ups.”** The intended next promise is helping the chosen customer generate qualified conversations. Proof of that outcome should drive the roadmap.

## Verification and limits

- Source-backed behavioral audit, not a fresh production/browser/security audit. No full backend/browser rerun was needed for documentation-only changes.
- `MODEL_MODE=fixture pnpm exec tsx .local/business-audit/verify.ts`: **4/4** assertions pass, demonstrating the current industry-invariant score, Arabic title penalty, HR questions for a non-HR seller and live-enrichment rejection. They verify observed limitations, not desirable acceptance criteria.
- `MODEL_MODE=fixture pnpm --filter @revenue/api exec vitest run ../../packages/backend/test/discovery-guide.test.ts ../../packages/backend/test/draft-quality.test.ts`: **5/5** existing tests pass. They check current grounding/rendering rules, not customer demand or commercial outcomes.
- No independent customer interviews, live data coverage measurement, payment validation or sending-provider pilot ran. None is inferred from a passing test. Existing claims of live AI generation are distinguished from live lead/contact/sender providers.
- Primary-source retrieval limits: the web tool rejected the 74 MB Hormozi journal with `(400) Content length is too large: 74467012`; the cold/warm outreach download URLs returned `is not accessible via this tool`. No conclusions are attributed to their unread contents. The two accessible official checklists and course indexes support the Hormozi framing used here.
- The supplied playbook is vendor-authored guidance, not independent evidence of Caravan’s market demand. Its startup failure percentages and survey thresholds were not used as proof or decision gates.
