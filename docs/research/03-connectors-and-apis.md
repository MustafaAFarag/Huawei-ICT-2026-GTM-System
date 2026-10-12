# 03 - Connector and API feasibility (Revenue Workspace)

Research date: 2026-10-12. Method: web research only (docs, pricing pages, press, legal commentary). No credit-spending call was made on any provider. No provider account was touched.

Legend. **V** = Verified on the cited page (source IDs in the Sources list, all fetched 2026-10-12 unless a date is given). **U** = Unverified or estimate (third-party blog, conflicting sources, or inferred). Prices are USD, excluding tax, and change often; re-check before budgeting. Many comparison blogs are written by competitors, so I used them only for U claims.

## 1. Executive findings

| # | Finding | Status |
|---|---|---|
| 1 | Nearly every tool in the meeting has an official or vendor-run MCP server now (Apollo, Clay, Crunchbase, Crustdata, PredictLeads, Prospeo, Lusha, FullEnrich, lemlist, HeyReach, Dripify, PhantomBuster, Apify, Buffer, HubSpot, Zoho, Twenty). The "one shared connector layer" problem is credentials, quotas, spend caps and audit, not protocol access. | V (S1, S6, S21, S38, S40, S41, S51; others observed as connectors in this Claude session) |
| 2 | LinkedIn has no public API for prospect data. Every "LinkedIn data" vendor either scrapes, runs the user's own session, or is a restricted LinkedIn partner. LinkedIn has sued and won against hiQ (2022), Proxycurl (shut down July 2025) and ProAPIs (consent judgment Sept 2026). | V (S29-S32) |
| 3 | WhatsApp is a template-and-opt-in channel. Cold WhatsApp outreach to people who have not opted in violates Meta policy and risks the number. It cannot be a cold-outbound channel in the demo. | V (S18) |
| 4 | Egypt's PDPL executive regulations (Nov 2025) add consent and a direct-marketing permit; one source puts the end of the grace period at 31 Oct 2026, before the demo. B2B treatment is unresolved. | V for regulation existence (S50); U for dates and B2B scope |
| 5 | Clay can be an enrichment backend only on Growth ($446-495/mo) or Enterprise, and its public API tables are read-only. It is a poor "backend", a fine optional connector. | V (S25) |
| 6 | Twenty exposes REST + GraphQL, webhooks (HMAC), OAuth, an MCP server and an Apps SDK on all paid plans. But Twenty "Connections" support OAuth2 only, so API-key providers need our own credential store. | V (S4-S9) |
| 7 | LinkedIn personal-profile posting is self-serve via `w_member_social` (150 requests per member per day). Company-page management needs an approved Community Management API app. Reading member post analytics needs `r_member_social`, which is closed. | V (S43) |

## 2. Data and signal providers

| Provider | Public API / webhooks | MCP | Auth | Pricing / credit model | Rate limits | ToS / reliability notes | MENA / GCC evidence |
|---|---|---|---|---|---|---|---|
| **Crunchbase** | REST API (full API needs Enterprise/Applications licence; "Basic" API has ~3 endpoints) U (S51 aggregators) | Official MCP launched 2026-07-21; works in Claude/ChatGPT; pricing via sales V (S51) | API user key U | Not published, sales-led V/U | ~200 calls/min U | Enterprise licence terms; no resale of data U | Funding data is global but thin for MENA SMEs U (no test found) |
| **Crustdata** | REST v2 (v1 retired); watchers/webhooks; person/company/job/social-post search V (S1, tool docs) | Official connector observed; docs page silent on MCP | API key (Bearer) U | Credits. Search 0.03/result; person enrich 1+ up to 9; contact enrich 1-5.5 (Enterprise only); company enrich 2; job search 0.03; social post 0.5; live LinkedIn-sourced enrich 7; purchased credits valid 12 months V (S1). Entry price conflicts ($49 vs $500/mo) U | 10-45 req/min by endpoint class V (S1) | "Live" endpoints fetch LinkedIn-derived data: same legal exposure as any LinkedIn scrape (see section 3). Contact enrich is Enterprise-only | No MENA-specific evidence found |
| **PredictLeads** | REST + webhooks (job openings, news events, financing events, technology detections, connections) V (S51) | Official hosted MCP (OAuth2 or headers) V (S51) | OAuth2 or HTTP headers V | Free tier "100 calls/mo" and pay-as-you-go; tiers $0.04 to $0.002/credit; enterprise from ~$6k/yr U (S51 via Prospeo review) | Documented on a "Request Limits" page; values not read | Website-sourced signals (jobs, news, tech), so no LinkedIn ToS issue on its face U | Coverage 120M+ companies, mostly web-visible; MENA depth unknown U |
| **Apollo** | REST API + webhooks V (S2) | Official MCP (OAuth2), separate rate limits, no limit headers V (S2, S3) | API key / OAuth | Pricing page says "API access is available on Custom plans" V (S3); blogs say Basic $49-59, Pro $79-99, Org $119-149 per seat with API on higher tiers U. Per-endpoint credit rates published ~July 2026: enrich 1-9, email waterfall 1-4, phone waterfall 8-25 U (S2 search summary) | Per team. Search: 200/min, 6,000/hr, 50,000/day on paid plans; enrichment 1,000/min; Free 50/min, 600/day V (S2) | Data accuracy contested (independent claims 65-88% email accuracy; vendor claims 91%) U | "Solid" UAE/KSA enterprise, weaker free-zone, Oman, Kuwait, Bahrain, direct dials weaker. Competitor-written, no test data U (S51 SyncGTM) |
| **Lusha** | REST (person enrichment, prospecting, signals), webhooks V (S22) | Official MCP docs; large tool set observed | API key | Free 40 credits/mo; Starter $49.90/mo (400 credits); Pro $69.90 (600); Premium $399.90 (3,400); email = 1 credit, phone = 5; one credit pool across app, API, MCP V (S22). Prices are monthly-billing figures | Free/Starter 40/min and 100/day; Pro 50/min and 1,500/day; Premium/Scale 300/min V (S22 blog) | Daily caps make it unsuitable as a bulk first-pass | "Inconsistent" mobile hit rates outside UAE; free-zone gaps U (S51) |
| **FullEnrich** | REST v2, async bulk enrich + webhook (HMAC-SHA1, 5 retries), search, reverse email V (S21) | Official (`mcp.fullenrich.com/mcp`, OAuth in browser) V | API key; Bearer | Pro $55/mo for 1,000 credits (~$0.055); work email 1 credit, mobile 10, personal email 3; charged only when verified data is found; rollover 3 months (monthly) V (S21) | 60 calls/min shared; 100 contacts per bulk call; 100 concurrent enrichments V (S21) | Aggregator of many sources; 30-90 s per contact V | No MENA evidence found |
| **Surfe** | REST (people/company search, enrich); credit-gated V (S24) | None found | API key | Separate email and mobile credit pools; search = ceil(results/10) search credits; enrich by email = 10 search credits; failed lookups free V (S24). Plan prices $39-89/user U | 10 req/s, burst 20 V (S24) | LinkedIn-centric (Chrome extension origin) U | No MENA evidence found |
| **Prospeo** | REST: enrich person/company, bulk (50), search (200M+ contacts, 30M+ companies), account info V (S23) | Official MCP V (tool list; docs section) | API key | Email 1 credit, mobile 10 credits U; plan prices conflict ($37-49 Starter) U; Public API on Starter and above U | Per-plan; numbers not read | Sells verified emails; no known LinkedIn suit | No MENA evidence found |
| **Clay** | Webhooks in, HTTP-API action out (Growth+). Public API + CLI available on all plans (beta); tables read-only; table sync is Enterprise V (S25) | Official connector observed (search, enrich, run functions) | API key (`clay api-keys create`) V | Free $0; Launch $167-185/mo (15k actions, 3k credits); Growth $446-495/mo (40k actions, 6k credits); Enterprise custom (median ~$30k/yr U). No charge when no result V (S25) | Not stated | Clay itself brokers 200+ vendors; caution on resale terms of the underlying data U | Depends on the vendors chosen |
| **Mawsool** | Not found | Not found | n/a | Not found | n/a | `mawsool.com` is a domain-for-sale page (V). Only evidence: Oct 2024 interview claiming ~1B contacts, 97% accuracy, daily refresh, IT/tech focus (vendor claim) | Only GCC/MENA-native claim in the list, but unverified and no API. Treat as a sales-led CSV/list source, not a connector |
| **Bright Data** | REST: Web Scraper API, Unlocker, datasets | Official MCP; 5,000 free requests/mo U (S28) | API key | ~$1.50 per 1,000 records PAYG, $1.00 at $1,999/mo; datasets ~$250 per 100k records U | Not read | Won Meta v. Bright Data on contract grounds for logged-out scraping (Jan 2024) V (S33). That does not cover LinkedIn: LinkedIn's contract and fake-account theories succeeded against hiQ and ProAPIs | n/a |
| **Apify** | REST v2, webhooks, schedules V (S26) | Official MCP V | Bearer token | Free $5 usage; Starter $19; Scale $199; Business $999; CU $0.20/0.16/0.13; Actor prices set by authors V (S26) | 250,000 req/min global; 60 req/s per resource; 400/s for running actors V (S26) | Store Actors are third-party; LinkedIn Actors carry the scraping risk; Apify disclaims | Depends on Actor |
| **PhantomBuster** | REST; run agents, fetch output V (S27) | Official MCP; warns about account safety | API key | Start $69 (20 h, 5 slots), Grow $159 (80 h, 15), Scale $439 (300 h, 50); annual about 19% cheaper; free and trial limited to 10 rows per export/API call V (S27, July 2026) | Not read | Runs on the user's LinkedIn session; ban risk sits with the user's account | n/a |

Notes. Apollo's own pricing page and its blog-reported tiers disagree on which plan includes API; treat "which paid plan unlocks the API" as open until a trial account confirms (U). Crustdata's contact-enrich endpoints being Enterprise-only (V) matters because its self-serve plan cannot return emails.

## 3. LinkedIn data: legality and risk

| Topic | What is known | Status |
|---|---|---|
| Official API for prospect data | None self-serve. LinkedIn products are Consumer (sign-in, share), Marketing, Sales (partner), Talent, etc. Sales Navigator APIs sit in restricted partner programs | V (S29-S43; developer.linkedin.com overview) |
| User Agreement | 8.2 bans scripts/robots/crawlers/browser plugins to scrape (8.2.2), bots or automated methods including to message or add contacts (8.2.13), circumventing limits (8.2.3), and using data obtained through third parties/aggregators (8.2.4) | V (S29) |
| hiQ v. LinkedIn | Ninth Circuit CFAA ruling favoured scraping public pages, but in Nov 2022 the district court granted LinkedIn summary judgment on breach of the User Agreement. Dec 2022 consent judgment: $500,000, permanent injunction, data and code deletion. Stipulated facts, little precedential value | V (S30) |
| Proxycurl | LinkedIn sued Nubela on 2025-01-24 (N.D. Cal. 3:25-cv-00828). Proxycurl shut down 2025-07-04. Sources differ on whether it ended by settlement or injunction | V for suit and shutdown (S31); U for resolution form |
| ProAPIs | LinkedIn sued Oct 2025 (5:25-cv-08393). Consent judgment around 16-21 Sept 2026 bans scraping via fake accounts/bots, bans sale of the data, requires certified deletion. Alleged scale: a rotating pool of 1M+ fake accounts | V (S32), exact date U |
| Meta v. Bright Data | Jan 2024 summary judgment for Bright Data: scraping while logged out did not breach Meta's terms. Do not generalise to LinkedIn | V (S33) |
| Account-ban risk | No LinkedIn-published numbers. Folk limits: roughly 100 invites/week on free accounts, 150-250 on Sales Navigator; Unipile suggests 80-100/day and about 200/week for paid accounts, ~100 profile views/day, with 422 on over-limit invites. A "~40% of accounts restricted" figure is an unverifiable vendor statistic | Limits U (S20, S31); LinkedIn does not publish them |
| Who bears the risk | Unipile and PhantomBuster state the customer chooses volume and bears account consequences. Unipile: "independent technical intermediary", not affiliated with LinkedIn | V (S20) |

What is safe enough for a product:
1. Use the user's own account actions through a vendor that keeps LinkedIn-compliant paces (HeyReach, Dripify, Unipile), with explicit consent and an in-product risk notice. This still breaches the User Agreement on its face (V, 8.2.13); the practical risk is account restriction, not litigation against the end user (U).
2. Avoid reselling scraped LinkedIn profile data, fake accounts, or scraped bulk exports. These are the fact patterns in the three lawsuits.
3. Prefer sources that do not touch LinkedIn: company-website signals (PredictLeads), funding (Crunchbase), job boards, the company's own posts that the founder exports or pastes in, and first-party consent data.
4. Never auto-run LinkedIn actions from the AI assistant without a human approval gate and a per-account daily cap.

## 4. Channels

### 4.1 Email, LinkedIn and automation platforms

| Provider | API | MCP | Auth | Pricing (checked 2026-10-12) | Rate limits | Notes |
|---|---|---|---|---|---|---|
| **Smartlead** | REST + webhooks | Not found officially | API key | Base $39 (6k sends), Pro $94, Unlimited Smart $174 (warmup free), Prime $379; pre-warmed mailboxes from $9/mailbox via SmartSenders; "Full API access" explicitly named under SmartDelivery Pro; plan-level API gating unclear V/U (S34) | Standard 60/min and 1,000/hr, burst 10/s; Pro 120/min, 3,000/hr, 20/s; three endpoints at 10 per 60 s V (S34). A separate Smartlead page says one limit of 60/60 s, so docs disagree | Mature API; the most common "own the infrastructure" choice |
| **Instantly (API v2)** | REST v2 + webhooks (campaign, email, lead, meeting events) V (S35) | MCP integration documented V (S35) | Bearer API key with scopes V | Outreach Growth $47 ($37.6 annual), Hypergrowth $97, Light Speed $358; unlimited email accounts on Growth/Hypergrowth V (S35). API plan gating not stated U | 100 req/s and 6,000 req/min, per workspace across all keys; 10x increase announced March 2026 V (S35) | Highest limits of the group; GET /emails reportedly tighter U |
| **lemlist** | REST (143 ops U), 76 webhook events U | Official MCP, wide tool set incl. domains, mailboxes, waterfalls | API key / OAuth | Entry plans disputed ($32-55/user) U | 20 requests per 2 s per API key V (S36) | Also does LinkedIn, WhatsApp, SMS, calls U; built-in enrichment waterfall |
| **HeyReach** | Public API + webhooks (create/get/update/delete) V (S37) | Official MCP URL in docs V | `X-API-KEY` | Growth $47-79 per sender per month; Agency 25 senders $799-999, 50 senders $1,119-1,399; Unlimited $2,399-2,999; API, webhooks and MCP included on all published plans V (S37) | Page not located; "300/min" figure not confirmed | Cloud LinkedIn sender-rotation; ban risk per account |
| **Dripify** | Open API, key in Settings > Integrations, Advanced and Pro plans only. Read campaigns, stats, leads; add leads to campaigns. Message send is "coming soon" V (S38). Docs at api.dripify.com | Help centre lists an MCP server article; connector observed with list/search/upload-leads tools V | `X-Api-Key` | $39-99 per user per month by plan (competitor-sourced) U | 60/min, 5,000/day U (competitor-sourced) | Read-mostly, so it can only feed leads in and pull stats out |
| **Unipile** | Unified REST: LinkedIn, WhatsApp, Instagram, Telegram, Gmail/Outlook/IMAP, calendars; hosted white-label auth V (S19) | Not found | API key | EUR 49/mo up to 10 connected accounts, then EUR 5/4/3.5/3 per account by tier; post-paid on peak accounts; 7-day trial V (S19) | No Unipile cap; provider caps pass through V (S19, S20) | See section 3: LinkedIn and unofficial WhatsApp link modes put ban risk on the user. Official WhatsApp Cloud API is separate |
| **GoHighLevel** | REST v2 + OAuth, private integration tokens | Not verified | OAuth / PIT | Not researched (marketing-automation suite) | Per marketplace app per location/company: 100 burst/10 s, 200,000/day (OAuth public API) V (S39) | Useful only if a customer already runs GHL; not core |

### 4.2 WhatsApp Business Platform (Cloud API)

| Item | Finding | Status |
|---|---|---|
| Pricing model | Per delivered template message since 2025-07-01. Categories: marketing, utility, authentication. Rate depends on category and recipient country code. Customer-service window = 24 h from the user's last message; utility templates sent inside it are free; click-to-WhatsApp entry-point window = 72 h free | V (S11) |
| Planned change | Third-party sources (ycloud, chatmi) say that from 2026-10-01 service messages inside the 24 h window and utility messages inside it become billable, with 1,000 free service messages per number per month. Meta's pages I fetched still describe free service messages. Conflict: do not budget on either until you read the live rate card | U (S14) |
| Egypt | Calling code 20. Meta lowered utility/authentication on 2025-10-01 and marketing on 2026-01-01 V (S11, S12). Third-party Oct 2026 USD: marketing 0.0644, utility/auth/service 0.0036 per message U (S15) | rates U |
| Saudi Arabia | Billed in SAR since 2026-04-01; marketing raised 2026-04-01 and again Oct 2026. Third-party: marketing about USD 0.0576 (from 0.0501), utility/auth about 0.0107 U (S14) | rates U |
| UAE | Billed in AED since 2026-04-01; marketing raised 2025-10-01 and Oct 2026. Third-party: marketing about USD 0.0576 (from 0.0499), utility about 0.0157 U (S14) | rates U |
| Cross-check | A Salesforce rate card (effective 2026-05-01) shows credit multipliers per country (marketing/utility): Egypt 79.51/4.45, Saudi 56.18/13.21, UAE 61.61/19.39. Ratios roughly agree in direction with the blogs; units are credits, not USD | V for the multipliers (S13), no USD conversion |
| Opt-in | Business may message only people who gave their number and "opt-in permission ... confirming that they wish to receive subsequent messages". Outside 24 h only approved templates. Separate opt-in per message category recommended | V (S18) |
| Enforcement | Meta may limit sending or remove access after negative feedback; users can block and report; serious violations can ban the whole organisation from WhatsApp | V (S18) |
| Template approval | Automatic review, "can take up to 24 hours"; status can change later with quality feedback; paused/disabled templates cannot be sent; per-user marketing caps apply | V (S17) |
| Sending limits | New portfolios start at 250 unique recipients per rolling 24 h. 2,000 after business verification or 2,000 delivered high-quality messages in 30 days; auto-scaling to 10,000, 100,000, unlimited | V (S16) |

Verdict: WhatsApp belongs after first reply or explicit opt-in (inbound, forms, events), not in the cold sequence. Unofficial QR-linked WhatsApp via aggregators is a ban risk (U, not verified in vendor docs).

## 5. Mailbox infrastructure for cold email

| Option | Cost | Notes | Status |
|---|---|---|---|
| Google Workspace Business Starter | ~$7/user/mo annual, $8.40 monthly | Best reputation; account suspension risk for unsolicited volume; annual commit, can't reduce seats until renewal | U (S49 blogs) |
| Microsoft 365 | Not priced in sources I fetched | Microsoft's consumer-domain rules (Outlook.com, Hotmail, Live; 5,000+ messages/day from 2025-05-05) require SPF, DKIM, DMARC; they do not cover Microsoft 365 enterprise tenants | V for scope (S48, vendors); price U |
| Zapmail | $39/$99/$299 base plans, effective ~$2.99-3.90/mailbox; Google mailboxes, pre-warmed | Reseller of Google; SmartSenders at $9/mailbox runs on it | U (S34, S49) |
| Mailforge | $2-3/mailbox, 10-mailbox minimum, $14 domains | SMTP on shared IPs, not Google/Microsoft | U |
| Maildoso | ~$1.90-2.50 per mailbox, lower at volume | Warm-up not included | U |
| InboxKit | $2.50/mailbox for Google/M365/Azure, DNS and warm-up bundled | Only one listed with M365 | U |
| Warm-up tools | Instantly: bundled. Smartlead: free on Smart/Prime. MailReach ~$19.50-25/mailbox; Warmbox ~$15; Mailivery $29 flat | Prices vary by source | U (S34, S35, S49) |
| Gmail bulk-sender rules | For 5,000+ messages/day to Gmail (since Feb 2024): SPF + DKIM + DMARC, TLS, one-click unsubscribe, keep spam rate under 0.30% (target under 0.10%) | | V (S48 Google) |

Rule of thumb for our sizing (planning estimate, U): 2-3 mailboxes per domain, 20-40 cold sends per mailbox per day, 3-5 domains for the demo. That is about 15 mailboxes, roughly $40-100 per month on a reseller (plus domains) or ~$105-125 per month on direct Google Workspace.

## 6. CRM and extension targets

| CRM | API | Webhooks | MCP / AI | Auth | Limits | Notes |
|---|---|---|---|---|---|---|
| **Twenty** | REST + GraphQL for core data, plus Metadata API for schema; batch up to 60 records; upsert via GraphQL V (S5) | Record create/update/delete for all objects (including custom), HMAC SHA256 with timestamp; no retry policy documented, no event filtering yet V (S7) | Native MCP at `{workspace}/mcp`, OAuth (dynamic client registration) or API key; cloud and self-hosted; meta-tools `get_tool_catalog`, `learn_tools`, `execute_tool` V (S6). AI agents inside workflows, role-bound V (S10) | API key (Bearer, role-scoped), OAuth2 (PKCE, client credentials) V | 100 requests/min on API doc page V (S5); pricing page says Pro 50/min, Organization 100/min V (S4) | Apps SDK (`twenty-sdk`): objects, fields, logic functions (HTTP, cron, DB triggers), front components, skills, agents. Maturity not stated V (S8). Connections: OAuth2 only, workspace-shared or user-private, server refreshes tokens; storage encryption not described V (S9). Pro $9, Org $19/user/mo, Enterprise from $50k/yr; open-source core self-hostable; licence not confirmed on pages read V/U (S4) |
| **HubSpot** | REST, rich objects | Yes | Official remote MCP (`mcp.hubspot.com`), OAuth 2.1; read/write contacts, companies, deals, tickets, plus activities; GA in 2026 (date U) V (S40) | OAuth / private apps | Private apps: Free/Starter 100 per 10 s per app, 250k/day; Pro 190 per 10 s, 625k/day; Enterprise 190, 1M/day; public OAuth apps 110 per 10 s per account V (S40) | Best-documented; most demos will assume HubSpot |
| **Zoho CRM** | REST v8; credit-based daily budget (Enterprise 50,000 + 1,000 per user, cap 10M); concurrency Free 5, Standard 50, Professional 100, Enterprise 200, Ultimate 300 V/U (S41) | Yes | Four built-in MCP servers (Data Insights read-only, Data Operations, Module Customization, Workflow). OAuth. MCP calls use API credits V (S41) | OAuth | See left | Egypt/Gulf SMEs use it; Zoho One bundle common |
| **Odoo** | JSON-2 API is the replacement for XML-RPC/JSON-RPC, which are deprecated; removal postponed (Odoo 22 / Online 21.1) per docs V/U (S42) | Automated actions | No official MCP found | API key | Not read | Popular in Egypt; Odoo Online may limit external API by plan U |

Implication: build our product's CRM adapter against Twenty first, with a thin `CrmPort` interface so HubSpot, Zoho and Odoo can follow.

## 7. Social posting

| Platform | Capability and access | Limits and pricing | Status |
|---|---|---|---|
| **LinkedIn - personal profiles (Share on LinkedIn)** | Self-serve "Share on LinkedIn" product grants `w_member_social`; `POST /v2/ugcPosts` for text, article, image, video; OAuth2 per member | 150 requests/member/day, 100,000/app/day | V (S43) |
| **LinkedIn - Community Management API** | Vetted product: development tier (500 requests/app, 100/member default after increase) then standard tier after screencast review; covers pages, analytics, comments, member post statistics. `r_member_social` (reading member posts) is closed to new requests | Free but approval-gated | V (S43) |
| **Buffer** | GraphQL API (`api.buffer.com`), personal API key only for your own account; post create/delete/retrieve, ideas, channels. OAuth for third-party apps "coming soon". Official MCP exists. Whether personal LinkedIn is supported through the API is not confirmed | Keys expire 7 days to 1 year U | V (S44) / U |
| **X (Twitter)** | Pay-per-use: create post $0.015, with URL $0.20, read $0.005/resource, user read $0.010; reads capped at 3M per month; no free tier mentioned on official page | Subject to change | V (S45); the $0.20 URL surcharge makes link-heavy founder posts expensive |
| **Instagram** | Content Publishing API: professional (Business/Creator) accounts, `instagram_business_content_publish`, 100 API-published posts per rolling 24 h (a page also cites 50 for carousels), app review needed for non-test users | Free | V for 100/24 h (S46); review time U |
| **Facebook Pages** | `POST /{page-id}/feed`; scheduling 10 min to 30 days ahead; needs `pages_manage_posts` plus engagement permissions | Free | V (S46) |

Recommendation: for the founder-content module, start with LinkedIn `w_member_social` (own app, per-founder OAuth) and optionally Buffer personal key as a fallback; leave X, Instagram and Facebook to later because of cost and app-review lead time (U, 2-4 weeks per third-party report).

## 8. Analytics connectors (limits only)

| Service | Auth | Limits | Notes | Status |
|---|---|---|---|---|
| GA4 Data API | OAuth / service account | Standard property: 200,000 tokens/day, 40,000/hour, 14,000/hour/project, 10 concurrent requests; realtime has the same quotas | Daily resets at midnight Pacific | V (S47) |
| Microsoft Clarity Data Export | Project JWT token (admin-generated) | 10 requests per project per day; last 1-3 days only; up to 3 dimensions; 1,000 rows, no pagination | Good for a daily snapshot, not for drill-down | V (S47) |

## 9. Regulatory notes that affect connector design (not legal advice)

| Jurisdiction | Finding | Status |
|---|---|---|
| Egypt | Executive regulations of Law 151/2020 issued 2025-11-01; cover consent, record-keeping, cross-border transfer and direct electronic marketing, which reportedly needs a separate licence/permit, prior explicit consent, upfront disclosure and easy opt-out. One firm gives a grace period ending 2026-10-31. The law applies to natural persons; whether a business work email counts, and whether B2B outreach is carved out, is not settled in sources read | Regulation V (S50); grace date and B2B scope U |
| Saudi Arabia | PDPL in force since Sept 2023 with a transition to Sept 2024; implementing regulations treat direct marketing as needing prior consent with sender identification, with limited exceptions | U (S50, secondary sources) |
| UAE | PDPL (Decree-Law 45/2021) plus Consumer Protection Law and Do-Not-Call rules; sources split between consent-based and legitimate-interest approaches for B2B | U |

Design response: store lawful-basis, source and opt-out per contact; hard-stop on unsubscribe; add a region toggle that blocks WhatsApp and calls without recorded consent.

## 10. Recommendations

### 10.1 Connector sets

| Tier | Connector | Why | Cost sketch (monthly, U) |
|---|---|---|---|
| **Demo (Dec 2026)** | Twenty (own API/MCP/webhooks) | Core CRM; already API-complete | self-host ~free, or Pro $9/user |
| | Signals: PredictLeads (jobs, news, funding) + Crustdata self-serve search (headcount, job changes) | Website- and dataset-based; keeps the demo away from live LinkedIn scraping | PredictLeads free or $40; Crustdata ~$49+ |
| | Enrichment waterfall: Apollo (or Apollo MCP) then Prospeo then FullEnrich | Cheap first, aggregator last; all have async or documented limits | $50-150 |
| | Email: Smartlead **or** Instantly v2 (pick one) | Both have real APIs and webhooks. Instantly has the highest rate limits; Smartlead gives free warm-up on higher tiers | $47-174 + ~15 mailboxes |
| | LinkedIn: HeyReach (sandbox account, 1-2 senders) behind a feature flag, or mock | Official MCP and API on all plans; but real use needs a consenting account | $47-79 per sender |
| | Posting: LinkedIn Share (`w_member_social`) | Self-serve; no approval wait | $0 |
| | Analytics: GA4 Data API + Clarity snapshot | Planned already | $0 |
| **Later** | Crunchbase (Enterprise), Lusha (phones), Surfe, Clay (optional), lemlist, Dripify, Unipile (white-label LinkedIn + WhatsApp + inbox), WhatsApp Cloud API (opt-in follow-ups), HubSpot/Zoho/Odoo adapters, Buffer, X, Meta, Community Management API, mailbox-reseller automation (Zapmail/InboxKit) | Cost, legal review or approval lead time | |

### 10.2 Build vs buy

| Decision | Recommendation | Reason |
|---|---|---|
| Unipile vs direct integrations | Use Unipile for the later unified inbox (LinkedIn DMs + email + WhatsApp reads); for the demo use one sender tool (HeyReach). Do not build your own LinkedIn session handling | EUR 49/mo for 10 accounts is cheap; risk is the same either way; building your own protocol layer is a legal and maintenance trap |
| Clay as backend vs own waterfall | Own waterfall in our service; Clay as an optional import/export connector | Clay's useful API surface is gated (Growth/Enterprise), tables are read-only via API, credits are double-metered (credits + actions), and the team wants shared, auditable spend controls Clay's own budgets do not yet offer on the developer platform (V, S25) |
| Sequencer: build vs buy | Buy (Smartlead/Instantly); sequence logic in our product only decides who/when/what, the vendor sends | Deliverability is the hard part (domains, warm-up, DMARC); the vendors provide it |
| Mailboxes | Buy via reseller for the demo; own Google Workspace later | Cost vs reputation |
| CRM | Twenty native objects; adapters later | Twenty has what we need |

### 10.3 Waterfall enrichment design

1. **Normalise input** (LinkedIn URL or name + company domain). Check workspace cache and CRM first (free).
2. **Order** (cost per found email, cheapest first; phone is a separate, optional waterfall):
   Cache/CRM -> Apollo email (1-credit class) -> Prospeo (1 credit per verified email) -> FullEnrich (1 credit per found work email, built-in multi-source) -> stop with "not found". Phone only for Tier-1 accounts: FullEnrich (10 credits) -> Lusha (5 credits) -> Apollo phone (8-25).
3. **Stop conditions**: verified email with status valid; or max providers per contact (3); or per-contact cost cap (for example USD 0.25 email, USD 1.00 phone); or provider returns "catch-all/risky" with domain on an exclusion list.
4. **Verification**: accept provider-verified status; run an independent verifier only for catch-all or "unknown" results (not sourced in this research; U). Re-verify before send if older than 30 days.
5. **Caching**: key by (workspace, canonical person ID or email). TTL: 90 days for emails, 30 days for phones; negative results cached 14 days to avoid repeat spend. Store provider, timestamp, confidence and credit cost per field.
6. **Cost caps**: three levels - per run, per workspace per day, per workspace per month. Pre-flight estimate shown to the user; refuse to run when estimate exceeds the cap; credits are charged only on a hit for FullEnrich, Clay and Surfe (V, S21, S24, S25; not confirmed for Prospeo or Apollo), so log cost on result, not on request.
7. **Async handling**: FullEnrich is async (30-90 s per contact; webhook preferred over polling). Use a job queue with idempotency keys and a webhook receiver with HMAC checks.
8. **Compliance field**: record source and lawful basis per contact; skip countries or personas flagged "consent needed".
9. **Evaluation**: before trusting the order, test 200 real Egyptian and Saudi/UAE records through each provider and measure bounce rate and cost per valid email. No provider has independent MENA accuracy evidence (U).

### 10.4 Connector architecture

| Question | Recommendation |
|---|---|
| Expose connectors to the assistant via MCP? | Yes, but expose **one product MCP server** with task-level tools (`find_signals`, `enrich_contact`, `queue_sequence`, `post_draft`) instead of proxying every provider's MCP. Raw provider MCPs would each need their own credentials and expose unbounded credit-spending tools. Offer a "bring your own MCP" escape hatch for power users. Twenty's own MCP can be used for CRM reads and writes |
| Credentials | Per-workspace vault with envelope encryption (KMS), never returned to the model; scoped to provider+workspace; Twenty Connections cover only OAuth2 (V), so API-key providers need our store. Keep user-private vs workspace-shared visibility like Twenty's model |
| Rate limits | Central token bucket per (provider, credential) with provider-specific windows from sections 2-4 (for example lemlist 20 per 2 s, Apollo 200/min, FullEnrich 60/min, Instantly 100/s per workspace). Queue and retry with `Retry-After`/exponential backoff. Prefer webhooks over polling (FullEnrich asks for 5-10 minute gaps if polling) |
| Shared team use | Role-based tool permissions, spend caps per user and per workspace, immutable audit log (tool, args, cost, outcome, user, agent run), two-key approval for any send, connect or post action; dry-run by default |
| Prompt-injection | Enrichment and scraped data are untrusted input (Leadfeeder's own MCP warns of this). Never let record text trigger tool calls; separate "data" and "instruction" channels and gate side effects |
| Idempotency and replay | Idempotency key per send and enrich; store provider request IDs; reconcile via webhooks |
| Observability | Per-connector health, quota remaining, last error; surface in UI |
| Portability | Keep adapters behind ports; MCP server cloud-agnostic so it can be deployed on Huawei Cloud or elsewhere (Huawei cloud questions are in `05-huawei-ict-competition-and-cloud.md`, not researched here) |

## 11. Implications for our PRD

- Scope the December demo to: Twenty + one signal source + a 3-provider email waterfall + one sequencer + LinkedIn posting + GA4/Clarity. Mark LinkedIn outreach and WhatsApp as "design-complete, demo with mock or sandbox".
- Add a first-class "Connector registry" entity: provider, auth type, owner (workspace/user), quota windows, cost model, risk label (Low/Medium/High-ToS), allowed actions, and approval policy.
- Add a spend-governance module (budgets, pre-flight estimates, per-contact caps) as a visible demo feature; it is the clearest differentiator from "each person wires their own MCPs to Claude".
- Add compliance data model: lawful basis, source, consent timestamp, opt-out, region rules (Egypt direct-marketing permit, Saudi/UAE consent).
- Treat Twenty rate limits (50-100 requests/min) as a design constraint: batch writes (60 records per call) and cache reads.
- Make Egyptian/Saudi/UAE data-quality benchmarking an explicit milestone, since no provider has independent GCC accuracy data.

## 12. Pushback and risks

| Risk | Detail | Severity |
|---|---|---|
| LinkedIn automation | The User Agreement bans bots and scrapers; three LinkedIn lawsuits ended with injunctions or consent judgments. Selling or demoing LinkedIn automation to judges is a reputational and potentially legal risk for a Huawei competition entry. Use a clearly labelled sandbox | High |
| WhatsApp cold outreach | The meeting listed WhatsApp "later"; it must stay opt-in and template-based, or the number gets limited or banned | High |
| Egypt PDPL | Direct-marketing permit and consent requirements; grace-period end date reported as 2026-10-31. Need local legal opinion on B2B | High |
| Pricing instability | Apollo, Prospeo, Surfe, Dripify and Clay prices differ across sources and pages; Clay changed pricing in March 2026; X changed it again in 2026; WhatsApp rates changed in Oct 2026 and some billing changes are still unconfirmed | Medium |
| "MCP everywhere" overconfidence | Official MCP servers exist, but each charges credits per call and can send messages; a shared team assistant without governance can burn budget or damage domains | High |
| Twenty maturity | MCP and Apps pages did not state GA status; the "alpha" label came from a search summary (U); `Connections` are OAuth2-only; webhook retries undocumented | Medium |
| Clay dependence | Vendor-controlled, usage-metered, API tables read-only; the backend would be a black box in the demo | Medium |
| Cold email deliverability | Resold Google mailboxes and shared SMTP (Mailforge/Maildoso) carry reputation and ToS risk; Google can suspend accounts for unsolicited bulk; domain burn is plausible | Medium |
| Data accuracy in MENA | No independent test data for Egypt, KSA or UAE; GCC-native providers (Mawsool, DataCaptive, InfoBel PRO) were not verified and have no known APIs | Medium |
| Source quality | Many figures here come from competitor blogs; each U row needs a direct check before commitment | Medium |

## 13. Gaps not resolved (next steps)

- Confirm on a trial account which Apollo plan unlocks the API, and the real credit rates.
- Read Meta's live rate-card CSVs (USD for Egypt; SAR/AED for Saudi/UAE) and confirm whether service/utility messages become billable on 2026-10-01.
- Read Prospeo, Lusha and HeyReach rate-limit pages; Smartlead's pricing vs API gating; Surfe MCP status.
- Verify Twenty MCP maturity and the self-hosted licence terms in the repository.
- Run the 200-record MENA enrichment benchmark with free trial credits (spending credits was excluded from this research).
- Obtain a local legal opinion on PDPL direct-marketing rules for B2B in Egypt, KSA and UAE.

## Sources

IDs are cited in tables above. All accessed 2026-10-12; page dates given when the page showed one.

- S1 Crustdata pricing (API version 2025-11-01, undated): https://docs.crustdata.com/general/pricing
- S2 Apollo rate limits: https://docs.apollo.io/reference/rate-limits.md
- S3 Apollo pricing page: https://www.apollo.io/pricing
- S4 Twenty pricing: https://twenty.com/pricing
- S5 Twenty API: https://docs.twenty.com/developers/extend/api.md
- S6 Twenty MCP: https://docs.twenty.com/user-guide/ai/capabilities/mcp.md
- S7 Twenty webhooks: https://docs.twenty.com/developers/extend/webhooks.md
- S8 Twenty apps: https://docs.twenty.com/getting-started/core-concepts/apps.md
- S9 Twenty connections: https://docs.twenty.com/developers/extend/apps/logic/connections.md
- S10 Twenty AI and OAuth pages: https://docs.twenty.com/getting-started/core-concepts/ai.md ; https://docs.twenty.com/developers/extend/oauth.md ; https://docs.twenty.com/_llms/en/developers.txt
- S11 Meta WhatsApp pricing (legacy docs page): https://developers.facebook.com/docs/whatsapp/pricing/
- S12 Meta WhatsApp pricing (current docs): https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- S13 Salesforce WhatsApp rate card, effective 2026-05-01: https://www.salesforce.com/en-us/wp-content/uploads/sites/4/WhatsApp-Business-Messaging-Rate-Card-MM-Lite-May-1-2026.pdf
- S14 YCloud, WhatsApp pricing update effective 2026-10-01 (third party): https://www.ycloud.com/blog/whatsapp-api-message-pricing-update-effective-october-1-2026
- S15 Quali-D Egypt rates (third party, Oct 2026): https://quali-d.com/whatsapp-api-pricing
- S16 Meta messaging limits: https://developers.facebook.com/documentation/business-messaging/whatsapp/messaging-limits
- S17 Meta template overview: https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview
- S18 WhatsApp Business Messaging Policy: https://whatsappbusiness.com/policy/
- S19 Unipile pricing: https://www.unipile.com/pricing-api/
- S20 Unipile LinkedIn limits and positioning: https://www.unipile.com/linkedin-api-rate-limits/
- S21 FullEnrich: https://fullenrich.com/pricing ; https://docs.fullenrich.com/llms.txt ; https://docs.fullenrich.com/api/v2/general/ratelimit.md ; https://docs.fullenrich.com/api/v2/general/webhooks.md ; https://help.fullenrich.com/en/articles/14190120-mcp-server
- S22 Lusha pricing and API: https://www.lusha.com/pricing/ ; https://www.lusha.com/blog/lusha-api/ ; https://docs.lusha.com
- S23 Prospeo docs: https://prospeo.io/api-docs ; third-party pricing summaries (ColdIQ June 2026, Emelia Sept 2026) via search
- S24 Surfe credits and quotas: https://developers.surfe.com/credits-and-quotas ; https://support.surfe.com/hc/en-gb/articles/37470066294418-API-Limits-and-Behaviour-FAQs
- S25 Clay pricing and developer platform: https://www.clay.com/pricing ; https://university.clay.com/docs/clay-api-cli
- S26 Apify pricing and API: https://apify.com/pricing ; https://docs.apify.com/api/v2
- S27 PhantomBuster pricing explained (2026-07-21): https://phantombuster.com/blog/ai-automation/phantombuster-pricing-explained
- S28 Bright Data pricing and MCP (third party): https://docs.brightdata.com/mcp-server/faqs ; https://apiserpent.com/blog/brightdata-linkedin-pricing-explained
- S29 LinkedIn User Agreement: https://www.linkedin.com/legal/user-agreement
- S30 hiQ v. LinkedIn outcome: https://www.proskauer.com/blog/hiq-and-linkedin-reach-proposed-settlement-in-landmark-scraping-case ; https://www.natlawreview.com/article/linkedin-s-data-scraping-battle-hiq-labs-ends-proposed-judgment
- S31 Proxycurl shutdown: https://nubela.co/blog/goodbye-proxycurl/ ; https://www.unipile.com/proxycurl-alternative/
- S32 LinkedIn v. ProAPIs: https://digitalpolicyalert.org/event/43954-us-district-court-issued-final-judgment-in-linkedin-v-proapis-data-scraping-lawsuit ; https://sigmalawgroup.com/blog/2026-09-18-linkedin-proapis-scraping-consent-judgment/
- S33 Meta v. Bright Data: https://www.fbm.com/data-analytics/publications/major-decision-affects-law-of-scraping-and-online-data-collection-meta-platforms-v-bright-data/
- S34 Smartlead: https://www.smartlead.ai/pricing ; https://api.smartlead.ai/guides/rate-limits ; https://api.smartlead.ai/reference/rate-limits
- S35 Instantly: https://developer.instantly.ai/getting-started/rate-limit.md ; https://developer.instantly.ai/ ; https://instantly.ai/pricing
- S36 lemlist rate limits: https://developer.lemlist.com/api-reference/getting-started/rate-limits.md
- S37 HeyReach: https://help.heyreach.io/en/articles/14741630-heyreach-plans-and-pricing-what-s-included-and-how-to-choose ; https://docs.heyreach.io/llms.txt
- S38 Dripify: https://help.dripify.com/en/articles/16664719-open-api ; https://help.dripify.com/en/articles/16938124-product-update-september-2026 ; https://help.dripify.com/en/collections/19736828-integrations ; https://api.dripify.com/
- S39 GoHighLevel rate limits: https://marketplace.gohighlevel.com/docs/other/rate-limits.md
- S40 HubSpot: https://developers.hubspot.com/docs/api/usage-details ; https://developers.hubspot.com/docs/build-with-ai/remote-mcp-server ; https://developers.hubspot.com/changelog/remote-hubspot-mcp-server-is-now-generally-available
- S41 Zoho CRM: https://www.zoho.com/crm/developer/docs/mcp/overview.html ; https://prezohoweb.zoho.com/crm/developer/docs/api/v8/api-limits.html
- S42 Odoo external API: https://www.odoo.com/documentation/saas-19.4/developer/reference/external_rpc_api.html
- S43 LinkedIn posting: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview (page dated 2026-03-31) ; https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin ; https://developer.linkedin.com/
- S44 Buffer API: https://developers.buffer.com/guides/getting-started.html
- S45 X API pricing: https://docs.x.com/x-api/getting-started/pricing
- S46 Meta publishing: https://developers.facebook.com/documentation/instagram-platform/content-publishing ; https://developers.facebook.com/docs/pages-api/posts
- S47 GA4 and Clarity: https://developers.google.com/analytics/devguides/reporting/data/v1/quotas ; https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api (updated 2025-12-05)
- S48 Sender rules: https://support.google.com/a/answer/81126 ; Microsoft Outlook.com requirements via https://support.easydmarc.com/knowledge-base/outlooks-new-email-authentication-requirements-for-high-volume-senders-effective-may-2025 (third party; Microsoft primary post not read)
- S49 Mailbox and warm-up vendors (third party): https://sendkit.ai/zapmail-pricing ; https://sendkit.ai/inboxkit-pricing ; https://sendkit.ai/maildoso-pricing ; https://marketbetter.ai/blog/best-email-warmup-tools-2026/ ; https://www.emailvendorselection.com/google-workspace-pricing/
- S50 Data-protection law: https://www.tamimi.com/news/from-policy-to-practice-egypt-issues-executive-regulations-of-the-personal-data-protection-law ; https://cms.law/en/are/legal-updates/egypt-s-pdpl-executive-regulations-issued-one-year-compliance-countdown-begins ; https://www.forvismazars.com/eg/en/insights/news-and-publications/navigating-egypt-s-new-data-privacy-landscape ; https://turtl.tamimi.com/story/law-update-issue-367-saudi-arabia-and-competition/page/11
- S51 Data vendors, other: Crunchbase MCP press release (2026-07-21) https://about.crunchbase.com/press/press-releases/crunchbase-launches-mcp-to-bring-private-market-intelligence-into-ai-workflows ; Crunchbase API plans (third party) https://apis.io/plans/crunchbase-data/crunchbase-data-plans-pricing/ ; PredictLeads docs https://docs.predictleads.com ; PredictLeads pricing review https://prospeo.io/s/predictleads-pricing-reviews-pros-and-cons ; Mawsool interview (Oct 2024) https://sharikatmubasher.com/media-hub/news/21446603/abdelhadi-mawsool-database-includes-1-bn-contacts?lang=en ; Mawsool domain page https://mawsool.com ; GCC data providers (competitor-written, 2026-04-10) https://www.syncgtm.com/blog/best-b2b-database-gcc
- S52 Observation: connector tool lists for Apollo, Clay, Crunchbase, Crustdata, PredictLeads, Prospeo, Lusha, lemlist, HeyReach, Dripify, PhantomBuster, Apify and Buffer were present in this Claude session; no tool was called.
