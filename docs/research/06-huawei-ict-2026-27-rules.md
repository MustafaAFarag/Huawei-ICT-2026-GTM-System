# 06. Huawei ICT Competition 2026-27 Innovation rules (latest found)

Research date: 2026-10-13. Web research only. This report corrects parts of `05-huawei-ict-competition-and-cloud.md`.

Tags: **Verified** = I read the primary Huawei page or PDF myself (URL and quote given). **Unverified** = secondary source, search snippet, or my inference (reason given).

How I got the primary files: Huawei's servers block plain `curl` and web fetch (HTTP 403). A real browser session could load the Huawei Talent portal. I read it live on 2026-10-13 and downloaded the 2026-27 Manual and Roadshow PDFs from it. The portal is a JavaScript app, so the URLs below load in a normal browser, not in a fetch tool.

## Summary (answers to questions 1-5)

1. **Huawei technology is NOT optional in the 2026-27 official text. It is required, but the bar is low.**
   - The 2026-27 Manual says: "participants need to use Huawei's AI technologies in combination with other technologies".
   - The Egypt/North Africa and MECA topic page says: "All entries must be deployed on Huawei Cloud and use at least one Huawei Cloud service". The examples are ECS, RDS and DCS (Redis). MindSpore, CANN and ModelArts are not named for the 2026-27 topic.
   - So the team's claim "Huawei tech is a bonus" is not supported. A small, real use of Huawei Cloud (host the app on ECS plus RDS) meets the stated rule. Azure-only does not.
   - The wording did loosen in 2025-26 ("Huawei's AI technologies **or** combine them with other technologies"). That may be the source of the "optional" idea. It tightened again in 2026-27 for the regional topic.
2. **Phase 1 deliverables.** The portal lists two templates for our region: Template 1 "Entry Information Form" and Template 2 "Presentation Slides (Regional Stage)". The Manual says teams submit "technical documents, code files, and a demonstration video". A 2025-26 Morocco/North Africa guide says the first phase needs the Entry Information Form in **Word** format, with slides, design documents and demo video "(if applicable)". This partly supports the team: phase 1 is mainly a form. But I found no page limit, no PDF rule, and the templates need a login. The team's "demo is optional in phase 1" is plausible but **Unverified** for 2026-27.
3. **Dates.** Global Final: Shenzhen, May 2027 (Verified). Regional Final: Feb-Apr 2027, including MECA and Northern Africa (Verified). National Final: Nov-Dec 2026 (Verified). Registration closes 2026-11-30 on the Practice tab for all regions. On the **Innovation** tab, Northern Africa and MECA show **no deadline yet**. Southern Africa shows 2026-12-24, Latin America 2026-12-31, Europe 2027-01-31, China 2026-11-30. Egypt is most likely in the **Northern Africa** region (**Unverified** for Innovation; Verified for the Practice track in 2025-26).
4. **Rubric.** I found no official 2026-27 rubric. The 2023-24 rubric (30/25/15/15/15) is Verified. A 2025-26 North Africa guide shows a different, simpler rubric: **Innovation 60%, Application Value 40%** (Unverified, secondary). Weights have probably changed. Ask Huawei.
5. **Cloud credits.** 2023-24: vouchers go to teams that "successfully registered and passed review", before design submission (Verified). 2026-27: "Huawei Cloud resources are provided to help teams deploy entries on the cloud and conduct online demonstrations" and "Cloud resource vouchers" is a listed benefit (Verified). No amount and no timing are given. "Only after passing phase 1" is **Unverified**.

## Q1. Is Huawei technology mandatory, recommended or scored?

### 2026-27 (11th edition): required wording, low bar

- Official Manual, "Huawei ICT Competition 2026–2027 Manual-20260827.pdf", page 4, Innovation Competition. **Verified**.
  - Quote: "In accordance with the task requirements, participants need to use Huawei's AI technologies in combination with other technologies such as generative AI, big data, cloud computing, mobile Internet, and IoT to develop solutions that address real-world needs. These solutions need to demonstrate innovative application scenarios, commercial potential, and complete technical architectures. Alternatively, they can complete tasks such as AI training, inference, and agent development for specific industry scenarios."
  - Link: Roadshow and Manual are the two PDFs on https://e.huawei.com/en/talent/ict-academy/#/ict-contest ("Huawei ICT Competition Brochure" and "Huawei ICT Competition Roadshow PPT").
- Official Roadshow slides, slide 24 "11th Huawei ICT Competition—Innovation Competition Rules". **Verified**.
  - Quote: "participants need to use Huawei's AI technologies in combination with other technologies such as general AI, big data, cloud computing, mobile Internet, and IoT ... Alternatively, participants can develop AI agents and plugins such as operators, Model Context Protocol (MCP), and skills for industry-specific scenarios."
  - Also: "Technical areas: General AI, agents, computing, storage, ModelEngine, and ModelEngine Nexent. Topic 1: Creating Innovative AI Applications Powered by Huawei Cloud".
- Regional topic page for **Northern Africa** and for **Middle East & Central Asia** (same text). **Verified**. URLs:
  - https://e.huawei.com/en/talent/#/ict/innovation-details?zoneCode=026902&zoneId=98269713&compId=85132021&divisionName=Northern%20Africa&type=C002
  - https://e.huawei.com/en/talent/#/ict/innovation-details?zoneCode=077587&zoneId=98269714&compId=85132021&divisionName=%20Middle%20East%20%26%20Central%20Asia&type=C002
  - Topic: "Creating Innovative AI Applications Powered by Huawei Cloud".
  - Tool Requirements: "All entries must be deployed on Huawei Cloud and use at least one Huawei Cloud service while complying with local laws and regulations. Available services include, but are not limited to, Elastic Cloud Server (ECS), Relational Database Service (RDS), and Distributed Cache Service (DCS) for Redis."
  - Presentation Format: "Deploy the app on the cloud and showcase its core functions and interaction flow on a visual demo page." and "Demonstrate the value of Huawei Cloud products in requirement understanding, code generation, project building, bug fixing, and deployment. Participants are encouraged to show their practices in turning ideas into applications."
  - Open Source Requirements: "Entries shortlisted for the Regional Competition and Global Final must be open-sourced on communities like Gitee or GitHub."
  - Application domains (Northern Africa): "Entertainment/Office/Industry/Lifestyle apps, etc." (MECA): "Consumer lifestyle/entertainment, intelligent home/office/campus, industry verticals transformation, etc."
- Public portal summary text, same page, still shows the older looser sentence. **Verified**: "Participants need to use Huawei's AI technologies or combine them with other technologies like big data, cloud computing, mobile Internet, and IoT". The Manual and the regional topic page are newer and stricter. Use those.

What this means: Huawei Cloud use is a hard rule for the regional topic. MindSpore, ModelArts, CANN, Ascend and HarmonyOS are **not** named in the 2026-27 topic. An app on ECS + RDS + DCS on Huawei Cloud passes. Whether the **score** rewards deeper Huawei use in 2026-27 is not published (see Q4).

### Wording by season

| Season | Wording | Status |
|---|---|---|
| 2023-24 (8th) | "Participants must use Huawei AI-related technologies, like MindSpore, CANN, and ModelArts" and "Teams must specify the Huawei technologies they use in their entries". Also scored: System/Technical complexity (25) "uses Huawei AI-related technologies and, in the presentation, specifies which ones are used". Source: https://erzurum.edu.tr/Content/duyuru/dosya/0c8ce51f-7ee5-4ace-aac5-a614a0b4ae2c.pdf | **Verified** (I re-read the PDF) |
| 2024-25 (9th) | Flyer: "using Huawei's AI-related technologies such as MindSpore, CANN, ModelArts or combining AI with relevant technologies such as IoT, Big Data, Cloud Computing and Mobile Internet". https://www.sf.bg.ac.rs/download/konkursi/Huawei/9th_ICT_Competition_EDM_2024.pdf. Global Final page: "comprehensively use AI (mandatory), cloud computing, IoT, big data, and other technologies". https://www.huawei.com/minisite/ict-competition-2024-2025-global/en/index.html | **Verified** (both read). Note: the Global page says AI is mandatory, and does not say Huawei-specific AI. |
| 2025-26 (10th) | Manual (Dec 2025): "Participants need to use Huawei's AI technologies or combine them with other technologies like big data, cloud computing, mobile Internet, and IoT". Wording moved from "must use" to "use ... or combine". | **Verified** (Manual PDF read) |
| 2025-26 regional topic | Morocco/North Africa guide: "Participants must use Huawei AI-related technologies specified in the competition topics, like MindSpore, CANN, and ModelArts". Topic: "Develop an innovative AI application based on MindSpore ... Entries must be developed using MindSpore". https://code212.uit.ac.ma/huwaei-ict-competition/ | **Unverified**: a university page copying the Huawei Digitech guide. Browser certificate warning on that site. |
| 2025-26 China | "Participating teams were required to use specified Huawei technologies, such as MindSpore, ModelArts, and Huawei Cloud" (Baidu Baike summary). | **Unverified** (Wikipedia-style site, China topics) |
| 2026-27 (11th) | See above: Huawei AI "in combination with" other tech; regional topic requires Huawei Cloud (at least one service). | **Verified** |

**When the wording changed:** 2023-24 to 2024-25: the "or combine AI with other tech" clause appeared. 2025-26: "must use" became "need to use ... or combine". 2026-27: the topic became a Huawei Cloud topic with a hard "deployed on Huawei Cloud, at least one service" rule, and generative AI, agents and MCP were added as allowed technology areas.

**Bottom line for the PRD:** the earlier report's "Huawei AI mandatory (MindSpore/ModelArts)" is now out of date for our region. The correct reading: Huawei **Cloud** is mandatory (one service minimum), Huawei AI services are encouraged by the Manual and may be scored. Azure OpenAI as the model is a risk: hosting, DB and cache must be on Huawei Cloud, and the Manual wants Huawei AI. A model served through ModelArts or MaaS is the safe choice, but that is my inference.

## Q2. Phases and deliverables

- **Structure.** Manual 2026-27: "The competition follows a three-level structure: National Competition, Regional Competition, and Global Final. Teams need to submit related technical documents, code files, and a demonstration video. They also need to deliver onsite presentations in the Regional and the Global Finals." **Verified**. The Roadshow names the levels "Preliminary, Regional Final, and Global Final", and says presentations and Q&A happen "in the National Final (Chinese mainland) and the Global Final". **Verified**. Outside China, a live presentation is therefore required from the Regional Final.
- **Templates on our regional page** (**Verified** names, files behind login so I could not read them):
  - "[Template 1] Innovation Competition - Entry Information Form - Area - Team Name"
  - "[Template 2] Innovation Competition Presentation Slides - Area - Team Name (Regional Stage)"
  - This suggests: first phase = Entry Information Form; Regional stage = slides. That matches the team's story, but the pages do not say it in words.
- **Format and language.** 2023-24 (Verified): Application Form WORD, Design Scheme WORD, Presentation PPT, Demo VIDEO, all "Mandatory (by template)"; video about 5 min for preliminary, 3 min or less for final. 2025-26 Morocco guide (Unverified): "Submit the Template 1 Entry Information Form in Word Document format, along with other related files such as entry introduction slides, design documents, and demonstration videos (if applicable)". Content asked: background and value, innovation, dataset and data processing, key code snippets, "measurable indicators". For 2026-27 I found **no PDF rule and no page limit**. Template names are in English. Global Final language: "The presentation language is English" (2025-26 Global page, **Verified**: https://www.huawei.com/minisite/ict-competition-2025-2026-global/en/index.html). Regional language is **Unverified**.
- **Team rule 2026-27 (Verified, Manual):** "Each participating team must include one instructor and up to three students, all of whom must be full-time university students at the time of registration." Also: "each participant must not register in multiple regions or countries" and "It is prohibited to submit other competition entries without any improvements." Also: entries must not "infringe on others' privacy."
- **Judging of the demo.** The topic page wants a deployed app and a "visual demo page" (Q1). It does not say in which phase. The team's idea that the architecture plan and demo are only bonuses in phase 1 is **Unverified**. The safe plan is to treat a Huawei-Cloud-hosted demo as required by Regional stage and to have it ready early.
- **Open source.** Shortlisted entries for Regional and Global "must be open-sourced" (Verified, topic page). Plan for a public repo. This matters for a SaaS built on Twenty CRM.

## Q3. Dates for 2026-27

| Item | Date | Status |
|---|---|---|
| Registration and roadshow | Sept-Nov 2026 | **Verified** (Roadshow slide 21) |
| Registration deadline, Practice tab, all regions | 2026-11-30 | **Verified** (portal, 2026-10-13) |
| Registration deadline, **Innovation** tab | China 2026-11-30. Southern Africa 2026-12-24. Latin America 2026-12-31. Europe 2027-01-31. **Northern Africa, MECA, Asia Pacific: no deadline shown**. The detail link has `enrollmentDeadline=undefined`. | **Verified** (portal). Reading: not yet set. |
| National Final | Nov-Dec 2026 | **Verified** (Roadshow slide 21) |
| Regional Final | Feb-Apr 2027. Slide lists "MECA, Northern Africa, LATAM, Europe, Southern Africa, APAC". | **Verified** |
| Global Final | May 2027, Shenzhen ("The Huawei ICT Competition 2026–2027 Global Final will be held in Shenzhen in May, 2027") | **Verified** (Manual) |
| Registered so far, Innovation tab | MECA 48, Northern Africa 24 | **Verified** (portal counters) |

- **Which region is Egypt?** In 2025-26, Mansoura's Cloud-track team "qualifies for the Regional Stage ... representing the Arab Republic of Egypt in North Africa": https://engfac.mans.edu.eg/en/latest-news/9038-mansoura-university-s-faculty-of-engineering-team-from-the-huawei-academy-qualifies-for-the-regional-stage-of-the-huawei-ict-competition-2026 (**Verified**, Practice track). For Innovation, Egypt = Northern Africa is **Unverified**; confirm when you register, because the portal asks you to pick a region.
- **MECA example dates (Iraq, not Egypt).** A Tishk University page reports a preliminary exam in Iraq on 18-19 Nov 2026, a national final on 21 Dec 2026, a MECA regional exam in March 2027 and the global stage in May/June 2027 (seen only as a search snippet, the PDF returns 403 to me): **Unverified**, and it is for the Practice track.
- **Team's "first phase in December":** plausible. National Final is Nov-Dec 2026 and the Innovation deadline for our region is not published yet. **Unverified** for Egypt. In 2025-26, the Morocco guide gave a 30 January 2026 4 PM upload deadline for the Innovation preliminary (**Unverified**), so Egypt's first Innovation submission could fall in January 2027.

## Q4. Judging rubric and weights

- **2023-24 (Verified, re-read):** Creativity 30; System/Technical complexity 25; Social value 15; Functional completeness 15; Presentation 15. Total 100. Judges: "well-known professors in academia and Huawei R&D experts".
- **2024-25:** only the five criteria names were seen in a Huawei article, with no weights (carried from report 05). **Unverified**.
- **2025-26 preliminary (North Africa, Morocco guide, Unverified, secondary):**
  - Innovation (60%): "Innovative AI application (explore new scenarios or introduce a breakthrough in a traditional scenario); algorithmic advancement such as model structure optimization and training strategy innovation; differentiation from existing solutions".
  - Application Value (40%): "Clearly identify real-world problems and resolve them; commercial potential of solutions (scalability and replicability for real-world deployment); sound and feasible technical architecture".
  - This guide is for a MindSpore topic. It may not apply to the 2026-27 Huawei Cloud topic.
- **2026-27:** no rubric found in the Manual, Roadshow, or the public regional page. The two Manual lines "innovative application scenarios, commercial potential, and complete technical architectures" probably mirror what is scored. **Unverified inference.**
- **Did weights change from 30/25/15/15/15?** Yes for at least the 2025-26 preliminary (Innovation 60 / Application value 40, no separate social-value or presentation line). Social value is now folded into "Application Value" (real-world problem, commercial potential). Commercial potential is explicitly a scored item in two seasons. This helps a B2B SaaS idea. Technical depth (algorithm or model work) was weighted inside "Innovation" in 2025-26, so a thin wrapper around a hosted LLM may score low on that line. Inference.

## Q5. Huawei Cloud credits and vouchers

- **2026-27 portal, regional topic page (Verified):** "Cloud Service Resources: Huawei Cloud resources are provided to help teams deploy entries on the cloud and conduct online demonstrations." No amount. No date. No condition.
- **2026-27 Roadshow, slide 14 "Official Competition Benefits" (Verified):** "Full-process enablement" lists "Free registration", "Cloud resource vouchers", "Online live training", "Learning resources on iLearning (Shixizhi)", "Winner rewards", "Giving speeches at campus roadshows", "Visits to Huawei Xi Liu Bei Po Cun".
- **2023-24 (Verified):** resource distribution 1 Oct - 31 Dec, to "approved teams" after the registration review. Quote: "provide the contacts of each student team that successfully registered and passed review with Huawei resources, such as Huawei Cloud vouchers, enablement courses, materials, and tools". That is before the judged design submission.
- **2025-26 (Unverified):** Baidu Baike says "Huawei provided resource support to the teams, including Huawei Cloud vouchers and enablement courses."
- **Team's claim "resources only after passing the first phase":** not confirmed. Past rules tie vouchers to registration review, not to passing a judged round. The 2026-27 page does not say. Ask the Huawei Egypt Talent Manager. Also note the topic **requires** a Huawei Cloud deployment, so you will need your own Huawei Cloud account to build before any voucher arrives. **Unverified** for timing and amount.

## Q6. Past Innovation winners (Egypt and MENA)

Not found: a full list of Egyptian Innovation entries for 2023-24.

| Season | Project | What it is and tech | Status |
|---|---|---|---|
| 2025-26 Global | **Manetho** (Misr University for Science and Technology: Ibram Anwar, Beshoy Magdy Botros, Ahmed El-Khouly). Egypt's "first place" in Innovation. | AI app that translates hieroglyphs from a phone photo. Egyptian outlets: "Manetho app, an AI-powered translator specifically designed to decode ancient Egyptian hieroglyphs in real-time". Huawei tech used: **not stated**. Huawei's own Grand Prize list for Innovation has no Egyptian team. https://egyptinnovate.com/en/news/egyptian-talent-shines-at-huawei-ict-competition-global-finals ; https://techafricanews.com/2026/06/08/egypt-strengthens-position-as-digital-talent-hub-with-huawei-ict-competition-success/ ; Huawei list: https://www.huawei.com/en/news/2026/6/ict-competition-global | **Verified** (articles read). Tech: Unverified. The New Arab says the team built a custom AI model from scratch because mainstream models failed, with about 700 early users (250 Egyptologists). I could not load that page after the first fetch. |
| 2025-26 Global Grand Prize (Innovation) | Wuhan Univ. of Technology, Ahmadu Bello Univ. (Nigeria), NUS (Singapore), Fujian Normal Univ. | Projects not described on the Huawei page | **Verified** (list only) |
| 2025-26 Global | ARE MED Health OS (INP-HB, Cote d'Ivoire): reads dialect symptom descriptions, offline mode, WhatsApp voice. DermaLens (Indonesia): AI skin-disease screening. TouchBike (Brazil): tactile alerts for deaf cyclists. | Huawei judge's blog: ARE MED "uses Huawei's solutions and AI". https://blog.huawei.com/en/post/2026/7/1/huawei-ict-competition-ai-access-inclusion | **Verified** |
| 2024-25 Global | **Evana** (New Mansoura University, Egypt), second prize | AI-powered robotic surgical arm assistant "that harnesses the capabilities of Huawei Cloud". https://techafricanews.com/2025/05/29/egypt-shines-at-huawei-ict-global-final-with-top-awards-across-tracks/ | **Verified** |
| 2024-25 Global Grand Prize | Bulacan State (PH), Beijing Univ. of Technology, Cacak (Serbia), Errachidia (Morocco). Morocco's project NovaOR: AI predictive analytics for healthcare-facility management. | Carried from report 05 (Hespress). The TechAfrica page above confirms the four universities. | University names **Verified**. NovaOR detail **Unverified** |
| 2024-25 MECA regional | Qatar "Be My Sense" (won Innovation), Saudi "NABEEH" (first prize, Most Popular Team), Uzbekistan "Volta", Pakistan "PRISM" | Search summary of meatechwatch.com. That page returns 403 to me. | **Unverified** |

Pattern (my inference): winners are health, accessibility, culture and inclusion. I found no B2B SaaS, CRM or sales-tool winner. Where the tech is named it is Huawei Cloud (Evana), or "Huawei's solutions and AI" (ARE MED).

## What to ask Huawei Egypt this week

1. Which region is Egypt in for Innovation (Northern Africa or MECA), and what is the Innovation registration deadline? The portal shows none.
2. Is the first-phase submission the Entry Information Form only? Which format and page limit? Are slides, design document and demo video required, optional, or scored?
3. Does "at least one Huawei Cloud service" suffice, or is Huawei AI (ModelArts, MaaS, Pangu) scored extra? Is a model served from Azure allowed if hosting and DB are on Huawei Cloud?
4. What is the 2026-27 rubric and its weights? Is business value scored (B2B SaaS)?
5. When and how large are the Huawei Cloud vouchers? Is a voucher available before the first submission?
6. Is a faculty instructor from the same university required, and is an ICT Academy required for the Innovation track?

## Searched, not found

- Official 2026-27 Innovation rubric, weights, page limits, PDF or Word format requirement: not in the 2026-27 Manual (18 pages), the 2026-27 Roadshow (31 pages), or the public regional page. Templates need a Huawei login (download pages redirect to HUAWEI ID login).
- 2026-27 Egypt or Northern Africa national dates and registration announcement: no Egyptian university, Huawei Egypt, Ahram or Daily News Egypt page found (English and Arabic queries). Innovation tab shows no deadline for Northern Africa and MECA.
- The 2026-27 MECA guideline (https://engineering.tiu.edu.iq/computer/wp-content/uploads/2026/09/Guidelines-Iraq-2026-2027.pdf) and the 2025-26 version return 403 to curl, web fetch and the browser. Only search snippets were seen.
- Any 2025-26 or 2026-27 Egypt university page rehosting the Innovation brief: none found. The 2025-26 Innovation rubric came only from a Moroccan university page.
- A rule that makes Huawei technology a "bonus": no source says this for any season. Bonus points found were for English delivery (Chinese mainland teams) and for Huawei certificates in the Practice preliminary (HCIA 50, HCIP 100, HCIE 200, per a secondary snippet).
- 2023-24 Egyptian Innovation winners: not found.
- meatechwatch.com, newarab.com (after one load), zawya.com and Riara University pages did not load or were empty in my fetches.
- Huawei Talent "Planning & Progress", "Notifications", "Guides" and "Awards" tabs: clicking them did not change the content I could read (possibly login-gated).

## Notes

- Side effect: the browser tool wrote snapshot files to `.playwright-mcp/` in the project root. I did not edit any other project file and did not commit.
- Downloaded copies (not in the repo): `/tmp/claude-1000/huawei-rules/c/manual2627.pdf`, `/tmp/claude-1000/huawei-rules/c/roadshow2627.pdf`, `/tmp/claude-1000/huawei-rules/d/e.pdf` (2023-24 brief).
