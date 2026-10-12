# 04 - MENA/GCC market, regulation and Arabic AI content quality

Research date: 2026-10-12. Scope: Egypt, KSA, UAE. Method: web search and page fetches only; no paid tools, no enrichment, nothing sent.

**This is not legal advice.** Everything in section 2 comes from law-firm summaries and regulator-adjacent pages, not from the Official Gazette or the statutes themselves. Have a Saudi, a UAE and an Egyptian lawyer confirm before launch.

Tags: **[V]** = Verified against a page I opened (source number in brackets, URL in the Sources list). **[U]** = Unverified or an estimate, with the reason given. Where only a search snippet or a secondary blog supported a claim, I tag it [U].

---

## 0. Bottom line (read this first)

1. **The "Arabic wins" thesis is only partly supported.** Frontier models do understand Arabic dialects better than they write them, but the one 2026 independent-ish test on Saudi dialect (Claude Opus 5, Gemini 3.7, GPT-5.6, Kimi K3) found all four scored below 55%, mostly through flattened register and misread context rather than hallucination [V: S20]. That means Arabic copy is a *draft-quality plus human review* feature, not a "set and forget" differentiator.
2. **Regulation is the bigger threat than language.** Egypt's enforcement date for its personal-data law is about three weeks away (31 Oct / 1 Nov 2026) and it requires a licence for electronic direct marketing [V: S8, S9]. In Saudi Arabia, current Article 28 already requires consent before promotional messages to anyone with no prior interaction; a consultation opened on 6 Oct 2026 would add proof-of-consent duties and a data-localisation requirement [V: S6; corrected by the lead reviewer on 2026-10-12 after re-reading S6]. Automated LinkedIn outreach and cold WhatsApp both breach platform terms regardless of local law [V: S25, S13].
3. **Recommended scope:** Arabic *content generation* (human-reviewed) with an English UI; **Egyptian Arabic first, Saudi (Najdi/Hijazi-neutral "white" Khaleeji) second**; no full RTL UI before the December demo; do not scrape LinkedIn for style examples; use the customer's own posts and a small licensed or hand-written seed set as few-shot examples.
4. **The English-only decision should not be reopened wholesale**, but "English only" is wrong for Egypt and for Saudi owner-operators. It is probably fine for UAE and for Gulf tech/fintech founders on LinkedIn. I found *no* quantitative study of Arabic vs English vs mixed use in B2B; that part rests on the GTM expert's claim and indirect evidence [U].

---

## 1. Market

### 1.1 Size of the target population

| Country | Business population (latest I found) | Freelancers / solo | Confidence |
|---|---|---|---|
| KSA | ~1.7M active SME commercial records (Q2 2025); ~1.3M actual enterprises (records overstate; one firm can hold several) [V: S1, Qoyod via S1] | 430,739 freelance work documents issued (NTP 2025 report, via Qoyod) vs a ministerial *projection* of up to 2.2M freelancers in 2025; the two measure different things [U: secondary, S2] | Medium |
| UAE | >1.2M companies (Sept 2025 ministerial statement), another report says 1.4M at end-2025; SMEs ~95% of companies; 557k SMEs at end-2022 [V: S3 snippet-level, mixed definitions] | No reliable freelancer count found | Medium-low |
| Egypt | 3.7M establishments in 2017 CAPMAS census, 53% unregistered, 91.7% micro [V: S4 (OECD)]; no current official MSME count found | ~850,000 digital freelancers per ITIDA at WorkShift Summit 2026 [U: reported by a trade site, S5] | Low |

Skeptical reading: these are *all businesses*, not buyers of a GTM tool. A ≤10-person firm that will pay for an AI outbound workspace is a small slice, and Egypt's data is nine years old with half the base informal. Do not put a TAM number in the competition deck without a bottom-up filter (has a website, has a LinkedIn presence, sells B2B, has a founder who does outbound). I found no data for that filter.

### 1.2 Startup funding trend (a proxy for "founder-led teams with budget")

| Period | Figure | Source / note |
|---|---|---|
| FY2025 (Wamda, published 19 Jan 2026) | MENA $7.5B across 647 startups, +225% YoY. KSA $5B (211 deals), UAE $2B (218 startups), Egypt $263M (89 deals; value down, deal count up) | [V: S7]. Includes mega-rounds and, I suspect, debt; a LinkedIn post attributed to MAGNiTT gave $3.4B and 581 deals, so methodology differs [U: S7 search snippet only] |
| H1 2026 (Wamda) | $1.7B, 242 rounds; -18% in value and -28% in deal count vs H1 2025 ($2.1B). UAE $1.2B/83 deals | [V: S10 search result text; page not opened] -> treat as [U] on detail |
| H1 2026 (MAGNiTT) | $1.35B, -22% YoY, deals -41% to 214; top 10 deals = 58% of funding | [U: search snippet, S10] |
| Q3 2026 (Wamda monthly headlines) | Jul $173M, Aug $375M, Sep $1.1B (a few large deals) | [U: headlines only, my sum ~$1.6B is my own arithmetic] |

Reading: money is concentrated in KSA and UAE mega-rounds; **deal counts are falling in 2026** (-28% to -41%), and an Arab News headline links the dip to regional conflict. For a product aimed at small founder-led teams, the relevant signal is fewer funded early-stage startups, not record capital. Egypt is a volume market with tiny cheques ($263M for 89 deals in 2025).

### 1.3 Channels

**LinkedIn members (registered, not active), DataReportal Digital 2026, data to Oct 2025** [V: S11-S13]

| Country | Members | Ad reach as % of population | Female share of ad audience |
|---|---|---|---|
| Egypt | 15.0M | 12.6% (20.1% of 18+) | 32.0% |
| KSA | 12.0M | 34.6% (48.0% of 18+) | 24.7% |
| UAE | 10.0M | 87.6% (inflated by expats; 107.5% of 18+) | 31.0% |

NapoleonCat gives KSA ~10.95M in 2026 [V: S14], consistent in order of magnitude. DataReportal itself warns this is registered members, not monthly actives. Egypt has the most members but the lowest penetration and the lowest ability to pay.

**WhatsApp.** I could not find a current, rigorous adult-penetration figure for the three countries. The only country-level numbers were a 2022 Analysys Mason survey (KSA 69%, UAE 77% of respondents) and a vendor claim of 90% UAE [U: S15]. It is common knowledge that WhatsApp is the default business-chat tool in all three markets, but I cannot cite a number. Treat WhatsApp as the *reply and relationship* channel, not an outbound-prospecting channel (see section 2.5).

**Cold email and LinkedIn effectiveness in the region: no credible data found.** The only regional numbers are a vendor agency claim that bilingual messages plus WhatsApp plus local trust signals lift replies "2-3x" with no sample or method [U: S16]. Global cold-email reply averages (Woodpecker 3.43%, Lemlist "1-5% typical") are vendor data and say nothing about MENA [U: S16]. **We have no evidence that cold outreach performs better or worse in the Gulf; we only have cultural-guide consensus that it performs worse in Saudi.**

### 1.4 Trust and relationship culture

Government-affiliated trade guides and consultancies consistently say Saudis prefer to do business with people they know, that a personal introduction to a key person is "essential", that rapport precedes business, and that approval chains are hierarchical [V that the sources say this: S17; strength of evidence: guides and consultancy marketing, not research]. Vision 2030 sectors and startups are reported to be more direct [U]. Consequence for the product: the GTM expert is right directionally, and it argues for *warm paths* (referrals, shared-connection mentions, content that builds recognition, event follow-ups, lead magnets) as first-class features rather than a pure cold-sequence engine. This is a product-design inference, not a measured result.

### 1.5 Language of B2B communication

I searched for studies on Arabic vs English vs mixed use on LinkedIn or in B2B email by country and seniority and **found none**. What exists: opinion pieces calling English the UAE lingua franca, agency pages claiming Gulf-Arabic replies lift engagement without citing studies, and LinkedIn's Arabic UI launch (2014 era) [U: S18]. The GTM expert's observation that many Gulf professionals post in English or mixed Arabic-English is plausible and consistent with the above, but **unverified**. Concretely, we should not assume "Saudi = Arabic posts". A cheap fix: have the team hand-sample 100 profiles per target segment and count languages before the demo.

### 1.6 Contact-data coverage

Only vendor-authored comparison blogs (SyncGTM, Ocean Frogs) say global databases are thin outside UAE and South Africa, that Saudi SME and Arabic-name coverage is inconsistent and phone accuracy is the weak point [U: S19]. There are no independent benchmarks. This agrees with the GTM expert's claim but is not independently verified. Implication: for the demo, plan on user-supplied lists, website/social-sourced signals and CRM import rather than a purchased-database promise.

---

## 2. Regulation (not legal advice)

### 2.1 Saudi Arabia

| Item | Finding | Status |
|---|---|---|
| PDPL in force | Law in force 14 Sept 2023; one-year grace period ended 14 Sept 2024 | [V: S6] |
| Marketing | Implementing Regulations require consent for advertising and direct marketing processing and an easy opt-out at any time (articles numbered 28 and 29 in the 2025 draft-amendment commentary) | [V: S21, S6]; exact article numbers in the live text [U] |
| Legitimate interest | Regulations allow legitimate interest as a basis with a balancing test and an assessment; not available for sensitive data. **I found nothing saying it can support direct marketing, and the marketing articles require consent.** | [U: S22] |
| B2B exemption | **None found.** Named individuals' work emails/phones/LinkedIn profiles are personal data under the PDPL's general definition (my reading, [U]) | [U] |
| Draft amendments (consultation 6 Oct - 5 Nov 2026; effective 60 days after Gazette publication if adopted) | Consent before promotional messages to people with no prior interaction is **already required by current Article 28** (the draft keeps it); where a prior relationship is relied on, the controller must verify and keep evidence of valid consent; scope widens from "direct marketing messages" to *all processing for marketing purposes*; on withdrawal, stop *and* delete data generated by that processing; proposed data-localisation article; registration with the national controller register for controllers that transfer data abroad; 72-hour breach notice regardless of harm | [V: S6] (Clyde & Co, 8 Oct 2026). Still a draft. |
| Cross-border transfer | Transfer Regulations updated 1 Sept 2024: adequacy, or appropriate safeguards limited to SCCs, BCRs or accreditation certificates; risk assessment needed; sector overlays (banks need SAMA approval; IT service providers face extra restrictions) | [U: S23 search summary] |
| CST spam rules | CST Decision 493/1444 (March 2023) "Regulations for Curbing SPAM Messages & Calls": mainly telecom-network SMS/calls; promotional SMS need an "-AD" sender name and go through provider systems; quiet hours reported (10pm-9am; Ramadan variant); address-harvesting tools prohibited | [U: S24 secondary summaries; official text not read]. Applies to SMS and calls, not obviously to email or LinkedIn |

**Practical position for B2B in KSA today:** treat consent (or a documented prior relationship) as the lawful route for any promotional message addressed to a named individual, whatever the channel. The draft would codify that and extend it to the *enrichment and scoring* that precedes outreach. If adopted, a "scrape, enrich, score, then cold-email" pipeline for Saudi individuals becomes hard to defend, and any hosting outside the Kingdom may need registration or localisation. Because the product is multi-tenant SaaS, you would likely be a processor for the customer-controller, but you also run enrichment on your own initiative, which pushes toward controller status [U, my analysis].

### 2.2 UAE

| Item | Finding | Status |
|---|---|---|
| Federal PDPL | Federal Decree-Law 45/2021, in force since 2 Jan 2022 per secondary sources; UAE Data Office is the regulator; DIFC and ADGM have their own regimes | [U: S26] |
| Executive regulations | **Status unresolved.** One 2026 guide says still pending, another says issued with a 1 Jan 2027 compliance date; neither cites a primary UAE source. Check uaelegislation.gov.ae | [U: S26] |
| Marketing consent | Al Tamimi (via DataGuidance) says the PDPL permits processing only with consent except in narrow cases, none of which fit marketing; consumer-protection law also gives consumers a right to refuse marketing | [U: S27 snippet] |
| TDRA | Regulations on Unsolicited Electronic Communications cover all electronic communications to an electronic address; separate Mobile Spam Policy for SMS with UAE link | [U: S27 snippet] |
| Telemarketing | Cabinet Resolutions 56 and 57 of 2024, effective 27 Aug 2024: licensed companies including free zones; calls only 9:00-18:00; max one call a day and two a week if unanswered; local numbers registered under the commercial licence; DNCR; fines AED 50k / 75k / 150k. **Whether B2B calls are covered is not stated** in the source | [V: S28 (Clyde & Co, 18 Jul 2024)] |

**Practical position:** the UAE is the least clearly regulated for B2B cold email, but the law's text points to consent for marketing and there is no clear B2B carve-out in anything I read. Do the compliant thing (sender identity, working opt-out, suppression list) and do not claim legal certainty to customers.

### 2.3 Egypt

| Item | Finding | Status |
|---|---|---|
| Law 151/2020 and executive regulations | Executive regulations issued 1 Nov 2025 (Ministerial Decision 816/2025), not publicly released until 25 Dec 2025; one-year grace period; **enforcement from 31 Oct or 1 Nov 2026** (sources differ, with the late release creating possible argument for a later date) | [V: S8, S9] |
| Direct electronic marketing | **Requires a specific licence from the PDPC**, plus prior consent, sender identification, free opt-out; fee depends on whether marketing is for own offerings or on behalf of others; a "soft opt-in" for existing customers is recognised during the grace period | [V: S8, S9]; fee amounts and exact conditions [U] |
| Cross-border | Licence/authorisation needed for transfers abroad including cloud; destination protections must be at least equal; no adequacy list yet | [V: S9] |
| Foreign companies | Applies to organisations "operating in or targeting Egypt"; foreign entities must appoint a local representative | [V: S9] |
| Penalties | EGP 200,000 to EGP 5 million, criminal liability possible; breach notice to the PDPC in 72 hours | [V: S8] |

**Practical position:** Egypt is where the product is team-native and where the law is most concrete and most onerous. A customer doing bulk "electronic direct marketing" to Egyptian individuals will need a licence; as a SaaS vendor we should assume customers carry that duty but that our enrichment and hosting touch the cross-border rule. This is also an opportunity: a compliance module that records consent basis, licence number and opt-outs is a real feature, not overhead. It also means the demo should not process real Egyptian contacts in non-Egyptian regions without a documented position.

### 2.4 EU prospects (GDPR / ePrivacy)

Legitimate interest can support B2B direct marketing (Recital 47 treats direct marketing as a possible legitimate interest), but national ePrivacy laws decide whether the actual email may be sent: opt-out in some countries for corporate addresses (UK, France, Ireland and others per vendor summaries), opt-in in others (Spain, Italy, Netherlands), stricter in Germany; generic webmail addresses are treated as individuals [U: S29 vendor blogs, country lists conflict between sources]. You also owe a notice to the person (GDPR Art. 14), an easy right to object (Art. 21) and a suppression list. **Recommendation: default-block EU recipients from automated outbound sequences until a per-country rules table is reviewed by a lawyer.** The team's targets are MENA, so EU should be an edge case.

### 2.5 Channel rules the product must enforce

| Channel | What the platform says (verified) | Local-law overlay | What the product should do |
|---|---|---|---|
| Email | Provider rules (Google/Microsoft bulk-sender standards) not researched here | Consent/relationship expected in KSA (law), Egypt (licence + consent), UAE (consent per PDPL commentary) | Store lawful basis per contact; require sender identity, physical identity of the business and one-click opt-out; global suppression list; per-country gating; no sending to individuals with no basis in KSA/EG without an explicit override that records who accepted the risk |
| LinkedIn | User Agreement (effective 3 Nov 2025) bans scraping "by any means", bots and "unauthorized automated methods" including automated messaging, liking, commenting; bans copying data via aggregators or brokers [V: S25]. LinkedIn sued Proxycurl (Jan 2025): settlement, permanent injunction, data deletion; company shut down mid-2025 [V: S30]. hiQ settled in Dec 2022 with a $500,000 judgment, permanent injunction, and an order to destroy scraped data and derived algorithms [V: S31] | PDPL/EG law apply to the profile data too | **Draft-and-copy only:** the product writes the message, the human pastes and sends. No browser automation, no scraping, no third-party scraper APIs. Treat any Phantombuster/Apify-style automation as a customer-owned risk and keep it out of the core product and the demo |
| WhatsApp | Business policy (updated 23 Sept 2026): you may contact people only if they gave you their number and opted in to receive messages; conversations start only with approved templates; free-form replies only inside the 24-hour window; people can block/report and your limits are cut; "spam" can lead to restriction [V: S13] | CST/TDRA SMS rules and PDPL consent stack on top | Outbound WhatsApp only to opted-in contacts via the official Cloud API with approved templates; for cold prospects the product should offer a *click-to-chat link in email/LinkedIn copy* and not send WhatsApp unprompted. Keep WhatsApp "later" as the PRD says, and in fact consider dropping it from the demo scope |
| Phone | UAE: Cabinet Resolutions 56/57 hours and frequency limits [V: S28]; KSA: CST spam rules for calls [U] | | Calling is a task + script, never auto-dial; block outside 9:00-18:00 UAE and quiet hours elsewhere |

**What the product must enforce (summary):** lawful-basis field per contact; per-country channel gating; sender identity and opt-out in every message; global suppression list that survives CSV re-imports; data-source tracking (where did this email come from?); human approval before send; audit log; EU block; no LinkedIn automation; DSAR/delete workflow; data-residency flag per tenant (KSA/EG) given the localisation and licence trends.

---

## 3. Arabic AI content quality

### 3.1 What the benchmarks actually show

| Study (date) | What it tested | Result that matters | Limits |
|---|---|---|---|
| AL-QASIDA, Findings of ACL 2025 (arXiv Dec 2024) | Nine LLMs incl. GPT-4o, Command-R(+), Llama 3.1, AceGPT 7B, SILMA 9B on eight dialects | Models understand dialect better than they write it; almost all dialectness scores (ADI2) below 50%; best Egyptian monolingual 61.4% (Llama 3.1); cross-lingual requests: majority of models under 20% even for Egyptian; post-training pushes to MSA; **five in-context examples per dialect improved dialectness in every task** [V: S32] | No Claude or Gemini; 2024-era models; human eval by only three annotators (two Egyptian, one Syrian) |
| AMIYA shared task, VarDial, 29 Mar 2026 | 45 systems from six teams (open models fine-tuned) in Moroccan, Egyptian, Palestinian, Syrian, Saudi | Failures: responses switch to English or mixed dialect on code/technical/structured prompts; dialect words without coherence; confident hallucinated idiom meanings; Saudi outputs were relatively fluent but failed on culturally idiomatic prompts [V: S33] | No frontier closed models; small human sample |
| Saudi-Dialect-ALLaM (arXiv 19 Aug 2025, single author) | LoRA-tuned ALLaM-7B on 5,466 *synthetic* Hijazi/Najdi pairs | Baseline 47.97% Saudi-classified outputs rises to 84.21% with a dialect tag; MSA leakage 32.63% to 6.21%; dataset and weights not released [V: S34] | Scored by an automatic dialect classifier (GLF as a proxy for Saudi), not native reviewers |
| "Beyond Fluency" Saudi rubric benchmark (arXiv 30 Aug 2026) | Claude Opus 5, Gemini 3.7, GPT-5.6, Kimi K3; 31 expert-authored prompts, 124 evaluations | Macro-averages 42.7%-53.1%, none above 55%; each model scored negative on at least one prompt; top error is "ambiguous framing" (37.3% of errors), hallucination only 11.2%; models distort register and flatten pragmatics [V: S20] | Tiny prompt set; authors work at an annotation vendor (conflict of interest); per-model scores not shown on the abstract page |
| Perle AI, Egyptian and Iraqi (arXiv 30 Jun 2026) | Three frontier models, 103 rubric items (70 Egyptian), five LLM judges | Models do better on Egyptian than Iraqi (but grader leniency differs); implicit cultural reasoning is the main failure; judges are lenient (+2.0 to +6.6 points); best judge GPT-5.4 deviates ~10 points from human scores [V: S35] | Same vendor; models unnamed in what I read |
| Leaderboards: OALL v2, BALSAM (arXiv Jul 2025) | Multiple-choice and task benchmarks (ArabicMMLU, AraTrust, etc.) | Falcon-H1 Arabic 34B ~75.4% on OALL; ALLaM top on ArabicMMLU (per a secondary blog dated 19 Jul 2026) [U: S36]. BALSAM: 78 tasks, 52K examples, LLM-judge correlates with humans on its tasks, leaderboard at benchmarks.ksaa.gov.sa (not opened) [V: S37 abstract] | **These measure comprehension and knowledge, not marketing-copy quality or dialect fidelity** |
| AraDiCE, COLING 2025 | Dialect and Gulf/Egypt/Levant culture | Arabic-specific models (Jais, AceGPT) beat multilingual ones on dialectal tasks, with persistent weakness in dialect generation [V: S38 abstract] | 2024-era models |

**What I could not find:** any head-to-head study of Claude vs GPT vs Gemini on *marketing copy* in Saudi or Egyptian dialect, with native reviewers. Anyone claiming "Claude is best at Gulf Arabic" is extrapolating. The pre-2026 studies largely predate current frontier models; the Aug 2026 Saudi benchmark is the only recent frontier test, and it is small. For the competition, we should run our own mini-evaluation (section 3.5) rather than cite anyone's ranking.

### 3.2 Failure modes (with evidence level)

| Failure | Evidence |
|---|---|
| Drift to MSA, or MSA-flavoured "newsreader" tone | Strong: AL-QASIDA, Saudi-Dialect-ALLaM (33% MSA leakage baseline), AMIYA intro |
| Dialect mixing within one text (e.g. Egyptian words in a Saudi post) | Strong: AMIYA (mixed dialect), Saudi appendix (phrases from non-Saudi varieties) |
| Switching to English on structured or technical prompts | Strong: AMIYA. Relevant to us: sales copy with product terms and URLs is exactly this case |
| Over-formality / flat register / lost pragmatics | Strong: "Beyond Fluency" (ambiguous framing top error) |
| Confident wrong idioms and cultural facts | Medium: AMIYA hallucinated idiom meanings; Perle AI implicit cultural reasoning |
| Religious or cultural missteps (greetings, Ramadan, Friday, salutation to women, "in sha Allah" overuse) | Plausible and widely discussed, but I did not find a measured study of marketing missteps [U]; a religious Q&A study exists on reliability and abstention [U: S39] |
| Code-switching (Arabic with English product terms) | Mixed: AMIYA and Jais 2 marketing claim support for it [U] |
| RTL rendering: bidi bugs in mixed Arabic/English, numerals, punctuation, brackets, URLs, @mentions, emoji; email clients and LinkedIn composer differences | Engineering knowledge, not researched here [U]. Use the team's rtl-bilingual-ui guidance. Ship a test corpus of mixed strings |

### 3.3 Which Arabic models are accessible

| Model | Access path found | Status |
|---|---|---|
| ALLaM-2-7B-Instruct (SDAIA/HUMAIN) | Listed on Microsoft Foundry (SDAIA publisher page); announced GA on Azure; 7B only on Azure in the report I saw; HUMAIN commercialises the family; larger sizes (13B, 70B) exist but no API found | [V: S40 for the Foundry listing]; licence and pricing [U] |
| Jais 30B Chat | On Azure model catalog since May 2024 | [U: S41, 2024 launch article; current listing not opened] |
| Jais 2 (8B and 70B) | Open weights on Hugging Face since 9 Dec 2025 plus a web app; no hosted API found | [V: S42] |
| Falcon-H1 Arabic (TII, 7B/34B) | Open weights on Hugging Face under the TII Falcon licence (Apache 2.0-based per one release; naming inconsistent) | [U: S43] |
| Fanar 2.0 (27B, QCRI) | API at api.fanar.qa plus open weights claimed (Apache 2.0 per an aggregator) | [U: S44]; next version reportedly Dec 2026 |
| SILMA 9B | Open weights; was in AL-QASIDA | [V: S32] |
| Huawei Cloud ModelArts Studio (MaaS) | Community LiteLLM post lists DeepSeek, Qwen and GLM models on an ap-southeast-1 endpoint; April 2026 Asia-Pacific launch coverage; Huawei's Riyadh region exists (opened Sept 2023) and Huawei markets a Pangu model with Arabic training, but **I could not confirm MaaS in Riyadh or any Arabic-specific model in the catalogue** | [U: S45, S46] |

Implications for the Huawei competition: (a) Claude, GPT and Gemini are not Huawei Cloud services; if the judges expect the AI layer to run on ModelArts, we will probably be using Qwen/DeepSeek-class models for Arabic, whose dialect quality I have no evidence about. (b) The Arabic-specific models are open weights and could be self-hosted on ModelArts GPU instances, but that is an unverified assumption I did not check; a 34B or 70B model is real infrastructure cost for a student project. (c) Decide early whether the demo path is "frontier API with a Huawei-Cloud-hosted app" or "everything on Huawei Cloud" and test Arabic quality on the model you will actually use.

### 3.4 Style-example sourcing: scraping LinkedIn is the wrong plan

- LinkedIn's User Agreement (effective 3 Nov 2025) prohibits scraping by any means, bots and unauthorized automated access, and copying data through aggregators without the owner's consent [V: S25]. Posts remain owned by their authors, who license them to LinkedIn, not to us [V: S25].
- LinkedIn enforces: Proxycurl was sued in Jan 2025 and ended in settlement, a permanent injunction, data deletion and shutdown; hiQ ended with a $500,000 judgment and a destroy-the-data order that included algorithms built from the scraped data [V: S30, S31]. Notably, the hiQ order reaches *derived models*, which is exactly what a fine-tuned or retrieval corpus of scraped posts would be.
- Personal data law also applies to named authors' posts (PDPL, Egypt law, GDPR if EU authors) [U, my analysis].
- Official API routes exist for *publishing* (self-serve posting to a personal profile; Company Page posting is partner-gated) but I found no sanctioned route for bulk reading others' posts [U: S47 vendor blogs].

**Safer alternatives, in order of preference:**
1. **The customer's own posts and emails** (connect/upload). Few-shot from the customer's own voice is also what the evidence favours: five examples measurably improved dialectness in AL-QASIDA [V: S32].
2. **Hand-written seed examples** by native reviewers per dialect and segment (50-100 short pieces). Costs a few days of paid reviewer time; fully owned.
3. **Licensed or permissioned material:** creators who opt in (an "inspiration library" where authors submit posts with consent), brand-owned content from willing pilot customers, and public-domain/openly licensed Arabic corpora for dialect (check each licence; many dialect corpora are academic and non-commercial) [U].
4. **Synthetic examples** generated and then native-reviewed, as Saudi-Dialect-ALLaM did, but note that paper's data was not human-validated [V: S34].
5. Viral-post analysis as *structure* (hook, length, line breaks) from manual curation of a few dozen posts, stored as short abstractions not verbatim copies. Manual curation of public posts for internal inspiration is a different risk from automated scraping, but still check the ToS with a lawyer [U].

### 3.5 How to evaluate Arabic copy

- **Native reviewers are non-negotiable and must match the dialect.** The AL-QASIDA human study used two Egyptian and one Syrian rater; Perle AI saw different leniency between Egyptian and Iraqi graders, so even human scores are not interchangeable [V: S32, S35]. Our team is in Egypt: Egyptian review is in-house, Saudi review needs hired/outside Saudi (ideally Najdi and Hijazi) reviewers.
- **Rubric (score each 1-5, plus a pass/fail on hard gates):** dialect fidelity (target dialect only, no mixing, no MSA leakage); naturalness (would a native colleague write this?); register and honorifics for the relationship (cold vs warm); cultural/religious appropriateness (greetings, occasions, no inappropriate references); factual and idiom correctness; brand/offer fidelity (no invented claims); code-switching handled (product names in Latin, no broken bidi); length and format for channel; compliance (opt-out line, sender identity present).
- **LLM-as-judge is usable only as a pre-filter.** Evidence: PALM reports judge-vs-human Pearson 0.76 (ICC 0.78) but on correctness with small dialect subsets; a religious Q&A study found Arabic agreement lower than English; Perle AI found four of five judges systematically lenient (+2 to +6.6 points) and ~10-point average error even for the best judge, with cultural tasks hardest to grade [V for Perle: S35; U for the others: S39, search snippets]. So: calibrate any judge on ~100 native-scored items per dialect, report agreement (e.g. Krippendorff's alpha or quadratic kappa), keep human review on a rolling sample, and never use the judge to approve culturally loaded copy.
- **A 2-week mini-eval before the demo:** 30 prompts (cold email, LinkedIn post, WhatsApp follow-up) x 2 dialects x 3 to 4 candidate models x with/without 5 few-shot examples, scored blind by two native reviewers each. This answers "does Arabic actually win?" with our data and costs little.

---

## 4. Recommendation

### 4.1 Scope decision

| Option | Verdict |
|---|---|
| English-only | Weakest. Fails Egypt owner-operators and Saudi SME buyers, and contradicts the team's own differentiation story. But it remains the lowest-risk default for UAE and for English-posting Gulf professionals. |
| **Arabic content + English UI (recommended)** | Lets the product write Arabic outputs, handles RTL *content* correctly, and avoids the cost of a full RTL product shell. Aligns with the evidence that content quality is the hard, valuable part and the UI is a solved engineering problem later. |
| Full Arabic RTL UI | Not for the December demo. The buyers who need Arabic *content* mostly run their software in English; I found no evidence that UI language blocks adoption among founders; the cost is high (RTL components, translation, QA across the whole CRM). Revisit after pilot feedback. |

Design the Arabic feature as **"draft + native-style check + human approval"**, not autonomous sending. Add a per-contact language/dialect field ("Egyptian", "Saudi-white", "English", "mixed") that defaults from signals (profile language, company country, previous replies) and is editable.

### 4.2 Dialect order

1. **Egyptian Arabic first.** Reasons: team can review natively; evidence suggests models do relatively better on Egyptian than on Iraqi (with the grading caveat) and AL-QASIDA's best monolingual scores were on Egyptian [V: S35, S32]; Egypt has the largest LinkedIn base (15M) [V: S12]; Egyptian is widely understood across the Arab world. Weakness: lowest ability to pay and the strictest new data law.
2. **Saudi "white" Khaleeji, not Najdi vs Hijazi split, second.** Highest-value market and the likeliest "trust" gap, but the Aug 2026 benchmark says even the newest frontier models stay under 55% on Saudi dialect and cultural competence [V: S20]; we do not have native reviewers; and Saudi regulation is the most restrictive and getting tighter [V: S6]. Offer it as "beta, always reviewed".
3. **MSA-light "business Arabic" as the safe fallback** for formal outreach to senior Saudi and UAE executives, where dialect jokes backfire. **Emirati/Gulf generic** after Saudi. Levantine/Maghrebi: out of scope.

### 4.3 What to put in the PRD (see also section 5)

Compliance and channel gating are *product* features and likely a stronger story for a competition jury than "we write Arabic": they are visible, testable and tied to real 2026 deadlines (Egypt 31 Oct, Saudi consultation 5 Nov).

---

## 5. Implications for our PRD

1. **Replace "English only" with:** "English UI; content generation in English, Egyptian Arabic and Saudi/Gulf Arabic (beta); human approval required for every Arabic send." Add language/dialect as a CRM field in Twenty.
2. **Add a compliance layer to scope:** lawful-basis and consent fields, source-of-data field, per-country channel rules, suppression list, opt-out in every template, EU default-block, audit log, tenant data-residency flag. Mark "legal review" as a dependency, not a task we can close ourselves.
3. **Channel scope:** email (with consent/relationship checks), LinkedIn as draft-and-copy only, calls as tasks with time-window checks, WhatsApp only to opted-in contacts via the official API and dropped from the demo unless a pilot gives opt-in contacts.
4. **Remove scraping from the architecture:** no LinkedIn scraping, no third-party scraper APIs for posts; style examples come from the customer's own content plus a hand-written/licensed seed set. Keep "viral post analysis" as manual curation of structure.
5. **Signals and enrichment:** assume poor GCC contact coverage; support CSV/CRM import, user-entered contacts and website/job-post signals; show data provenance and confidence; don't promise phone numbers.
6. **Warm-path features:** referral/shared-connection prompts, lead-magnet and content-led sequences, "ask for introduction" templates; cold sequences become one of several play types, especially for Saudi.
7. **Model plan:** decide whether the Arabic model runs on Huawei Cloud (likely Qwen/DeepSeek via MaaS, or self-hosted Arabic open weights) or via a frontier API; run the mini-eval on the actual candidate; keep the model layer swappable; store prompts, few-shot sets and model version per generated message for audit.
8. **Evaluation:** budget native reviewers (Egyptian in-house; Saudi external); build a rubric-scored golden set of ~100 items per dialect; use an LLM judge only as a pre-filter after calibration.
9. **RTL:** correct bidi rendering for Arabic and mixed content in editor, preview, email HTML and exports from day one; defer RTL navigation chrome.
10. **Success metrics:** native-reviewer acceptance rate of Arabic drafts, edit distance before send, reply rates by language, opt-out/complaint rate by country.

---

## 6. Pushback / risks to our thesis

1. **"If we get Arabic right, we win" is untested and possibly wrong.** No source shows Arabic outreach converting better than English in B2B MENA. The only claim is a vendor's unsourced "2-3x" [U]. Gulf professionals frequently operate in English, and many founders (the target) are bilingual. Arabic may be *table stakes for trust in Saudi SMEs and Egyptian owner-operators*, not a moat against English-first tools that add a dialect prompt.
2. **The moat is thin.** Every frontier model can be prompted for Egyptian or Saudi dialect; five-shot examples help [V: S32]; open Arabic models are free. A competitor (or a customer with ChatGPT) can match our output quality with a good prompt and the customer's own samples. Differentiation has to come from workflow, compliance, data and warm-path features, not from "we write Arabic".
3. **Quality is not good enough to automate.** Frontier models scored under 55% on a Saudi dialect-and-culture rubric (Aug 2026) [V: S20]. A single tone-deaf or religiously clumsy message to a Saudi executive costs trust that the GTM expert says is hard to win. Automated Arabic sending is a reputational risk; reviewed drafting is defensible.
4. **Our team can validate Egyptian, not Saudi.** The dialect we value most commercially is the one we cannot check ourselves. This is a staffing risk and a demo risk.
5. **Regulation may kill the core pipeline in the Gulf.** If Saudi's draft is adopted, scoring and enrichment of individuals "for marketing purposes" need consent when there is no prior interaction [V: S6]. Egypt already requires a licence for electronic direct marketing [V: S8]. The UAE's status is unclear. The pipeline "signals, scoring, enrichment, cold outbound" is therefore weakest exactly where the product wants to differentiate. Honest framing: this is a warm-outbound and content product in KSA/EG, a cold-outbound product only in lower-risk contexts.
6. **LinkedIn is both the best channel and the least automatable.** ToS ban automation and scraping; LinkedIn litigates and wins [V: S25, S30, S31]. Any plan with LinkedIn auto-send is a demo trap.
7. **Contact data is poor in the region** [U: vendor blogs], so the "enrichment" step may produce little for the main targets; the demo may end up on hand-fed lists.
8. **The market is small and the funding signal is soft.** Deal counts in H1 2026 fell 28-41%, funding dependent on mega-rounds [U: S10], and Egypt's early-stage capital is tiny. Willingness to pay of ≤10-person Egyptian teams is unproven.
9. **Our evidence base has holes:** no regional cold-outreach effectiveness data, no language-use data, no WhatsApp penetration figure, UAE PDPL status unresolved, KSA CST details and article numbers from secondary sources, Huawei MaaS Arabic coverage unconfirmed. Several recommendations above are reasoned from analogy.
10. **Competition fit:** Judges may weigh Huawei Cloud use. If the best Arabic results need non-Huawei models, we have a tension to resolve now, not in December.

---

## Sources

Dates are publication or last-update dates where I could see them; "accessed 2026-10-12" otherwise.

- S1 Arabian Business, "Saudi startups raise $862m as 80,000 new SMEs launched in Q2 2025": https://www.arabianbusiness.com/culture-society/saudi-startups-raise-862m-as-80000-new-smes-launched-in-q2-2025 (2025; plus Qoyod SME report 2026: https://www.qoyod.com/wp-content/uploads/2026/06/qoyod-sme-report-2026-en.pdf, Jun 2026)
- S2 People Matters ME, freelancer projection: https://me.peoplemattersglobal.com/news/employment-landscape/freelance-workers-expected-to-increase-to-22-million-in-2025-mhsrds-ahmed-al-rajhi-44170 ; Qoyod freelance economy report (Aug 2026): https://www.qoyod.com/wp-content/uploads/2026/08/qoyod-freelance-economy-en.pdf
- S3 Gulf News / WAM on UAE SMEs: https://gulfnews.com/business/markets/uae-small-business-licences-jump-over-900-in-two-decades-1.500664805 ; https://www.wam.ae/en/article/hszrgtp9-557000-smes-operated-uae-end-2022-minister
- S4 OECD, SME and Entrepreneurship Policy in Egypt: https://www.oecd.org/en/publications/sme-and-entrepreneurship-policy-in-egypt_195d9c43-en/full-report/sme-and-entrepreneurship-performance-and-characteristics-in-egypt_a963c2a5.html
- S5 MEA Tech Watch, ITIDA freelancers: https://meatechwatch.com/?p=55000 (2026)
- S6 Clyde & Co, "SDAIA publishes draft amendments to the PDPL" (8 Oct 2026): https://www.clydeco.com/en/insights/2026/10/sdaia-publishes-draft-amendments-to-the-pdpl ; Clyde & Co on third consultation (May 2025): https://www.clydeco.com/en/insights/2025/05/saudi-arabia-new-pdp-law-consultation
- S7 Wamda, "Record year: MENA startups funding climbs to $7.5 billion in 2025" (19 Jan 2026): https://www.wamda.com/2026/01/record-year-mena-startups-funding-climbs-7-5-billion-n-2025
- S8 Clyde & Co, "Egypt regulatory update on data privacy" (Jan 2026): https://www.clydeco.com/en/insights/2026/01/egypt-regulatory-update-on-data-privacy
- S9 CMS, "Egypt's PDPL: executive regulations issued": https://cms.law/en/are/legal-updates/egypt-s-pdpl-executive-regulations-issued-one-year-compliance-countdown-begins (early 2026); Al Tamimi: https://www.tamimi.com/news/from-policy-to-practice-egypt-issues-executive-regulations-of-the-personal-data-protection-law (page redirected, not read)
- S10 Wamda H1 2026: https://www.wamda.com/index.php/2026/07/mena-startups-raise-1-7-billion-h1-2026-despite-regional-uncertainty ; Arab News H1 2026: https://www.arabnews.com/node/2651443/amp ; Arab News "Regional conflict drags MENA startup funding down 22%": https://arabnews.com/node/2650728/amp (search results only)
- S11 DataReportal Digital 2026 Saudi Arabia (data Oct 2025): https://datareportal.com/reports/digital-2026-saudi-arabia
- S12 DataReportal Digital 2026 Egypt (8 Nov 2025): https://datareportal.com/reports/digital-2026-egypt
- S13 DataReportal Digital 2026 UAE (5 Nov 2025): https://datareportal.com/reports/digital-2026-united-arab-emirates ; WhatsApp Business Policy (updated 23 Sept 2026): https://whatsappbusiness.com/policy/
- S14 NapoleonCat LinkedIn users in Saudi Arabia (2026): https://stats.napoleoncat.com/linkedin-users-in-saudi_arabia/2026/06/
- S15 Analysys Mason sample (2022): https://www.analysysmason.com/contentassets/245eaea0cc564ea2bd04916bfa9a71af/analysys_mason_ott_comms_middleeast_sample_oct2022_rdmv0.pdf ; Infobip WhatsApp stats: https://www.infobip.com/blog/whatsapp-statistics-2025-global-usage-market-overview
- S16 Cold-email benchmarks (vendor): https://lemlist.com/blog/cold-email-response-rate ; Leadra: https://leadra.it.com/blog/outreach-strategies-2026
- S17 Saudi business culture guides: https://www.iorworld.com/wp-content/uploads/2025/10/Saudi-Arabia-Cultural-Insights.pdf ; https://www.talaera.com/blog/working-with-saudi-arabian-clients ; https://culturalatlas.sbs.com.au/saudi-arabian-culture/saudi-arabian-culture-business-culture
- S18 Language-use commentary: https://thenationalnews.com/uae/linkedin-draws-a-million-users-in-uae-1.408248 ; https://gulfbusiness.com/?p=64185 (both old)
- S19 SyncGTM and Ocean Frogs (vendor): https://syncgtm.com/blog/best-b2b-databases-middle-east-africa (3 Apr 2026) ; https://www.oceanfrogs.com/gcc-accuracy
- S20 "Beyond Fluency: A Rubric-Based Benchmark for Evaluating Saudi Dialect and Cultural Competence in LLMs" (30 Aug 2026): https://arxiv.org/abs/2608.29990
- S21 Al Tamimi on SDAIA draft amendments (29 Apr 2025): https://www.tamimi.com/news/sdaias-draft-amendments-redefining-the-landscape-of-data-protection-compliance/ ; Clyde & Co Implementing Regulations (Sept 2023): https://www.clydeco.com/en/insights/2023/09/saudi-arabia-issues-implementing-regulations
- S22 Latham & Watkins: https://www.lw.com/en/insights/2023/12/Saudi-Arabias-data-protection-law-enters-into-force ; IAPP: https://iapp.org/news/a/saudi-arabia-publishes-final-personal-data-protection-law
- S23 SDAIA transfer regulations summaries: https://www.clydeco.com/en/insights/2024/09/saudi-arabia-s-personal-data-protection-law-become ; https://www.kslaw.com/Insights/Articles/international-personal-data-transfers-under-saudi-arabias-data-protection-law
- S24 CST anti-spam summaries: https://www.tamimi.com/law-update/april-2019/articles/congratulations-youre-a-winner-new-anti-spam-regulations-in-saudi-arabia/ ; https://taqnyat.sa/assets/download/compliance-en.pdf (secondary; CST consultation paper: https://www.cst.gov.sa/en/new/publicConsultation/Documents/PublicConsultationPaperV052English_updateV2.pdf)
- S25 LinkedIn User Agreement, effective 3 Nov 2025: https://www.linkedin.com/legal/user-agreement
- S26 UAE PDPL status (secondary, conflicting): https://cybersigmacs.com/knowledge-center/uae-pdpl/ ; https://www.businessdubai.ae/blogs/uae-pdpl-data-protection
- S27 DataGuidance/Al Tamimi UAE direct marketing: https://www.DataGuidance.com/opinion/uae-overview-direct-marketing-requirements (paywalled; snippet only)
- S28 Clyde & Co, "UAE tightens telemarketing regulations" (18 Jul 2024): https://www.clydeco.com/en/insights/2024/07/uae-tightens-telemarketing-regulations-what-you-ne
- S29 GDPR cold-email vendor guides: https://help.lemlist.com/en/articles/10213662-gdpr-and-cold-emailing-what-you-need-to-know ; https://www.marketone.com/articles/legitimate-interest-b2b-marketing
- S30 LinkedIn on Proxycurl: https://news.linkedin.com/2025/LinkedInWinsLegalBattleToProtectMemberData ; https://www.socialmediatoday.com/news/linkedin-wins-legal-case-data-scrapers-proxycurl/756101/
- S31 hiQ v. LinkedIn settlement (Dec 2022): https://newmedialaw.proskauer.com/2022/12/08/hiq-and-linkedin-reach-proposed-settlement-in-landmark-scraping-case/
- S32 AL-QASIDA (Findings ACL 2025; arXiv Dec 2024): https://arxiv.org/html/2412.04193v2
- S33 AMIYA shared task, VarDial 2026 (29 Mar 2026): https://aclanthology.org/2026.vardial-1.1.pdf
- S34 Saudi-Dialect-ALLaM (19 Aug 2025): https://arxiv.org/pdf/2508.13525
- S35 Perle AI, Benchmarking Frontier LLMs on Arabic Cultural and Sociolinguistic Knowledge (30 Jun 2026): https://arxiv.org/pdf/2607.00139
- S36 Annota8 Arabic LLM benchmark landscape (19 Jul 2026, vendor blog): https://annota8.ai/blog/arabic-llm-benchmark-landscape-2026.html
- S37 BALSAM (Jul 2025): https://arxiv.org/abs/2507.22603
- S38 AraDiCE (COLING 2025): https://arxiv.org/html/2409.11404v3
- S39 LLM-as-judge Arabic studies: PALM https://arxiv.org/pdf/2503.00151 ; religious Q&A https://arxiv.org/pdf/2508.08287 ; ArabCulture-Dialogue https://arxiv.org/pdf/2605.00119 (May 2026; text not readable, so not used for claims)
- S40 Microsoft Foundry, SDAIA publisher page: https://ai.azure.com/catalog/publishers/sdaia
- S41 Core42 JAIS 30B on Azure (May 2024): https://meatechwatch.com/2024/05/23/core42-and-microsoft-azure-launch-jais-30b-chat-advanced-arabic-ai-model/
- S42 MBZUAI, Jais 2 release (9 Dec 2025): https://mbzuai.ac.ae/news/inception-cerebras-and-mbzuai-release-jais-2-the-next-generation-of-the-worlds-leading-arabic-open-weight-llm/
- S43 TII Falcon-H1 Arabic press release (May 2025) and listing: https://www.businesswire.com/news/home/20250521832714/pl ; https://lmmarketcap.com/zh/model/falcon-h1-arabic-34b-instruct
- S44 Fanar 2.0: https://www.middleeastainews.com/p/qatars-national-ai-platforms-powerful ; https://huggingface.co/QCRI/Fanar-1-9B
- S45 Huawei Cloud MaaS community model list: https://github.com/BerriAI/litellm/issues/27860 ; APAC MaaS launch coverage: https://macaubusiness.com/correcting-and-replacing-huawei-cloud-introduces-token-service-in-asia-pacific/ (Apr 2026)
- S46 Huawei Cloud Saudi region: https://www.zawya.com/en/press-release/companies-news/huawei-cloud-introduces-ai-ready-infrastructure-in-saudi-arabia-pzb34303 ; https://gulfbusiness.com/how-huawei-is-fueling-saudi-arabias-digital-leap/
- S47 LinkedIn Community Management API: https://developer.linkedin.com/product-catalog/marketing/community-management-api (vendor blogs on tiers not relied on)

**Search gaps to close next:** (1) official SDAIA Implementing Regulations text (marketing and legitimate-interest articles); (2) UAE PDPL executive-regulation status from uaelegislation.gov.ae and TDRA's spam policy scope for B2B; (3) CST Decision 493/1444 official text; (4) Egypt PDPC licence conditions and fee schedule; (5) any 2025-2026 study on Arabic/English language use on LinkedIn in the Gulf; (6) Huawei Cloud MaaS official model catalogue for Riyadh/Middle East; (7) a native-reviewed head-to-head of Claude/GPT/Gemini on Egyptian and Saudi marketing copy (our own mini-eval).
