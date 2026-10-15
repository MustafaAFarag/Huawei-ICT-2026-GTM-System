# Research for PRD v2 and v3 (12–13 October 2026)

Ten web-research reports, written by separate research agents, feed [Revenue Workspace PRD v3](../prd/REVENUE_WORKSPACE_PRD_v3.md) (reports 01–05 also fed [v2](../prd/archive/REVENUE_WORKSPACE_PRD_v2.md)). Each claim is tagged Verified or Unverified with sources. No credit-spending tools were called and nothing was sent.

| Report | Question it answers |
| --- | --- |
| [01 — GTM process and AI](01-gtm-process-and-ai.md) | How outbound works in 2025–2026, real benchmarks, deliverability rules, AI SDR results, where AI helps |
| [02 — Competitors and positioning](02-competitors-and-positioning.md) | GoHighLevel, HubSpot, Apollo, Clay and MENA players; is the gap real; which segment to target |
| [03 — Connectors and APIs](03-connectors-and-apis.md) | API/MCP, pricing, limits and legal risk per provider; demo connector set; waterfall and connector architecture |
| [04 — MENA market, regulation, Arabic AI](04-mena-market-regulation-arabic-ai.md) | Market size, Egypt/KSA/UAE data-protection rules, Arabic dialect quality of current models, language decision |
| [05 — Huawei ICT Competition and cloud](05-huawei-ict-competition-and-cloud.md) | Season, rules, rubric, past winners, Huawei Cloud services, effect on the Azure decision (partly superseded by 06) |
| [06 — Huawei ICT 2026–27 rules](06-huawei-ict-2026-27-rules.md) | Latest Manual, regional topic, Huawei Cloud rule, dates, rubric, vouchers, past Egyptian winners |
| [07 — Pricing and freemium](07-pricing-and-freemium.md) | Supabase and GTM-tool pricing models, free-tier limits, credits, agency plans, spend caps, payments and VAT in Egypt/KSA/UAE, proposed tiers |
| [08 — Market data](08-market-data.md) | Market sizes, tool sprawl, skills gap, MENA SME and channel data, Arabic content share; numbers safe to use and numbers to avoid |
| [09 — Building blocks and Agent-Reach](09-building-blocks-and-agent-reach.md) | What Agent-Reach does for LinkedIn and its risks; open-source components to gather, with licence risk; OpenDesign current state |
| [10 — User pain and out-of-the-box](10-user-pain-and-out-of-box.md) | Non-technical user complaints, what "out of the box" means in 2026, evidence on design assets, agency pain, MENA voice; plays and templates to ship |
| [11 — Real workflow teardown](11-real-workflow-teardown.md) | (15 Oct, v3.1) What a real outbound engagement's files show about the process, where the work is manual, public MENA SDR/funding context, and the synthetic demo set derived from it |

## Lead-reviewer spot checks (12 October 2026)

The claims that change PRD decisions were re-checked against the primary page.

| Claim | Result | Source opened |
| --- | --- | --- |
| Innovation track requires Huawei AI tech; Creativity 30, Technical complexity 25; 3 students + 1 instructor from one university; demo video ~5 min / ≤3 min | Confirmed for the **2023–24** season. The 2026–27 rulebook is not public to automated fetches. | [2023–24 Innovation (AI Track) brief](https://erzurum.edu.tr/Content/duyuru/dosya/0c8ce51f-7ee5-4ace-aac5-a614a0b4ae2c.pdf), text extracted locally |
| Egypt PDPL: executive regulations 1 Nov 2025; enforcement 31 Oct 2026; electronic direct marketing needs a PDPC licence plus consent; cross-border transfer needs approval | Confirmed | [Clyde & Co, Jan 2026](https://www.clydeco.com/en/insights/2026/01/egypt-regulatory-update-on-data-privacy) |
| Saudi draft PDPL amendments, consultation 6 Oct – 5 Nov 2026 | Confirmed, with a **correction**: consent before marketing to people with no prior interaction is already required by current Article 28. The draft adds proof-of-consent duties and a data-localisation requirement. Report 04 was corrected. | [Clyde & Co, 8 Oct 2026](https://www.clydeco.com/en/insights/2026/10/sdaia-publishes-draft-amendments-to-the-pdpl) |
| Saudi dialect benchmark: Claude Opus 5, Gemini 3.7, GPT-5.6, Kimi K3 score 42.7–53.1% | Confirmed (31 prompts; small set; authors work at an annotation vendor) | [arXiv 2608.29990](https://arxiv.org/abs/2608.29990) |
| Twenty ships RTL for Arabic/Hebrew; MCP and AI agents | Confirmed: RTL in 2.40.0 (15 Sep 2026); MCP and agents in 2.0.0 (21 Apr 2026) | [Twenty releases](https://twenty.com/releases) |

## Lead-reviewer spot checks (13 October 2026)

| Claim | Result | Source opened |
| --- | --- | --- |
| 2026–27 Manual: participants "need to use Huawei's AI technologies in combination with other technologies" | Confirmed (text extracted from the downloaded Manual PDF) | Huawei ICT Competition 2026–2027 Manual-20260827.pdf, linked from the [Huawei Talent portal](https://e.huawei.com/en/talent/ict-academy/#/ict-contest) |
| Northern Africa topic: "All entries must be deployed on Huawei Cloud and use at least one Huawei Cloud service"; shortlisted entries "must be open-sourced"; templates "Entry Information Form" and "Presentation Slides (Regional Stage)" | Confirmed (page loaded in a browser) | [Northern Africa Innovation topic page](https://e.huawei.com/en/talent/#/ict/innovation-details?zoneCode=026902&zoneId=98269713&compId=85132021&divisionName=Northern%20Africa&type=C002) |
| Agent-Reach routes LinkedIn to `stickerdaniel/linkedin-mcp-server`; that server drives the user's logged-in browser, has `send_message` and `connect_with_person`, and warns of bans | Confirmed; Agent-Reach MIT, about 96.6k stars, last push 8 Oct 2026; linkedin-mcp-server Apache-2.0, about 3.8k stars | [Agent-Reach README](https://github.com/Panniantong/agent-reach), [linkedin-mcp-server README](https://github.com/stickerdaniel/linkedin-mcp-server) |
| n8n licence limits use to "your own internal business purposes"; Twenty is AGPLv3 with the Twenty Application Exception and MIT SDK packages | Confirmed | [n8n LICENSE.md](https://github.com/n8n-io/n8n/blob/master/LICENSE.md), [Twenty LICENSE](https://github.com/twentyhq/twenty/blob/main/LICENSE) |
| OpenDesign latest release 0.24.1, 24 Sep 2026 | Confirmed (GitHub API) | [OpenDesign releases](https://github.com/nexu-io/open-design/releases) |

Gaps in 13 October research: Reddit, G2, Capterra and Gartner pages were blocked for the research agents, so no Reddit quotes and no Gartner figures are verified. The 2026–27 rubric, first-phase format, Northern Africa Innovation deadline and voucher timing are not published. Paddle seller eligibility for Egypt/KSA and VAT rules come from secondary sources.

Still unverified and must not appear in competition material as fact: "6,000 GTM engineers worldwide / 130 in the Arab world"; any personalization or signal "lift" multiplier; MaaS availability in the Cairo or Riyadh regions; the 2026–27 rubric weights; WhatsApp rates for Egypt, KSA and UAE; the identity of the tools heard as "hire mina" and "fund gcc".
