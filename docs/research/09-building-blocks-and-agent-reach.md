# 09 - Building blocks to gather, and Agent-Reach for LinkedIn

Research date: 2026-10-13. Method: read primary sources (GitHub READMEs, LICENSE files, release feeds, the GitHub API, official docs). I cloned `Panniantong/agent-reach` and `nexu-io/open-design` into `/tmp/claude-1000/` and only read files. I ran no downloaded code. This report does not repeat `03-connectors-and-apis.md`. It reuses its facts on LinkedIn lawsuits and PDPL by reference.

Legend. **Verified** = I read the primary source (URL given or listed in Sources). **Unverified** = secondary source, vendor blog, search snippet, or my own inference. Star counts and dates come from the GitHub API or release feeds on 2026-10-13. They move daily.

---

## 0. Answers first

1. **Agent-Reach does not crawl LinkedIn.** It is an installer, router and health-check tool. For LinkedIn it points the agent at a separate project, `stickerdaniel/linkedin-mcp-server`. That project drives a real browser with the user's own LinkedIn session. **Verified.**
2. **Do not use it as a bulk crawler stored in our database.** It breaks LinkedIn User Agreement section 8.2, risks the user's account, and creates personal-data duties under Egypt and Saudi PDPL. All three recent LinkedIn suits (hiQ, Proxycurl, ProAPIs) were about this fact pattern.
3. **Where it can help:** a dev-time tool on our own laptops, non-LinkedIn sources (web, RSS, YouTube, GitHub), and at most an opt-in "power user" local mode. In that mode it runs on the user's machine, with the user's own account, one profile per click, with a warning.
4. **Licence trap for the base pieces we already chose.** Twenty is AGPLv3 with an "Application Exception". We can build proprietary apps on its API and SDK. If we modify Twenty itself, AGPL section 13 applies and we must publish our changes. **Verified** (Twenty LICENSE).
5. **Safe to embed or ship (permissive):** Activepieces core (MIT), Umami (MIT), Crawl4AI (Apache-2.0), Reacher (MIT), Chatwoot core (MIT), Langfuse core (MIT), Postal (MIT), Playwright MCP (Apache-2.0), browser-use (MIT), OpenDesign (Apache-2.0). Each has paid or enterprise folders to avoid.
6. **Do not build the product on n8n.** Its Sustainable Use License limits use to "your own internal business purposes". A multi-tenant SaaS needs a commercial deal. **Verified** (n8n LICENSE.md).
7. **There is no mature open-source Clay.** The best is YALC (MIT, 318 stars, a CLI with no UI). We build the waterfall ourselves.
8. **OpenDesign is a single-user local daemon, not a multi-tenant service.** Exports: HTML, PDF, PPTX, ZIP, Markdown, MP4. It has an MCP server and an HTTP API behind one token. We must wrap it per tenant.

---

# Part A - Agent-Reach deep dive

## A1. What it is

- Repo: https://github.com/Panniantong/agent-reach (README mostly in Chinese; English at `docs/README_en.md`). **Verified.**
- Self-description: "Give your AI Agent eyes to see the entire internet." It is a "capability layer". It does the selection, install, health check (`agent-reach doctor`) and routing. It says plainly that it does not do the reading itself: "reading is done by the agent calling upstream tools directly, there is no wrapper layer". **Verified** (README, "Design philosophy").
- How you install it: you paste a prompt into your coding agent ("install Agent Reach from this install.md URL"). The agent runs `pip install` from the GitHub archive (the README warns not to install the same-named PyPI package), then runs `agent-reach install`. The default only checks the environment. `--system` is needed to install tools or write config. It also copies a `SKILL.md` into the agent's skills folder. **Verified** (README, `docs/install.md`).
- Form factor: Python CLI plus an agent skill. There is a tiny MCP server, but it exposes one tool, `get_status`, which only reports which channels work. It is not an MCP gateway to the platforms. **Verified** (`agent_reach/integrations/mcp_server.py`).
- Credentials are stored in `~/.agent-reach/config.yaml` with file mode 600. **Verified** (README).

## A2. Platforms and how each is accessed

All of this is from the README channel table, `agent_reach/channels/*.py` and `docs/install.md`. **Verified.**

| Platform | Access method | Needs user login or cookie |
|---|---|---|
| Web pages | Jina Reader (`r.jina.ai`, third-party service) | No |
| YouTube | yt-dlp (subtitles, search) | No |
| RSS | feedparser | No |
| Web search | Exa through `mcporter` (MCP) | No key |
| GitHub | official `gh` CLI | Optional |
| Twitter/X | twitter-cli, then OpenCLI, then bird | Yes: cookies exported with Cookie-Editor |
| Reddit | OpenCLI (browser session) or rdt-cli | Yes |
| Facebook, Instagram | OpenCLI, which reuses the desktop Chrome login | Yes |
| Xiaohongshu | OpenCLI, then xiaohongshu-mcp, then xhs-cli | Yes |
| Bilibili | bili-cli, then OpenCLI | Mostly no |
| Boss Zhipin (jobs) | boss-agent-cli over Chrome DevTools Protocol | Yes (manual login in a dedicated Chrome) |
| V2EX, Xueqiu, Xiaoyuzhou podcast | direct HTTP APIs / cookies / Whisper | Varies |
| **LinkedIn** | **`mcp-server-linkedin`** (browser automation), with Jina Reader as the public-page fallback | **Yes** |

Most channels are China-focused (Xiaohongshu, Bilibili, Boss, Xueqiu, V2EX, Xiaoyuzhou). The one that matters for us is the LinkedIn row.

## A3. LinkedIn, precisely

- Agent-Reach's own LinkedIn code (`agent_reach/channels/linkedin.py`) is 60 lines. It only checks whether an MCP server named `linkedin` exists in the `mcporter` config. It does not call LinkedIn. Its doctor check returns at best `warn`, and says it "did not start the service to verify connectivity". **Verified.**
- Setup it prescribes: `uvx mcp-server-linkedin@latest --login`, then `mcporter config add linkedin --command uvx --arg mcp-server-linkedin@latest`. The login saves a session to `~/.linkedin-mcp/profile/`. **Verified** (`docs/install.md`).
- The underlying project: https://github.com/stickerdaniel/linkedin-mcp-server. **Verified.**
  - Apache-2.0, Python, 3,841 stars, 670 forks, 158 open issues, 40 contributors (API page count, anonymous included).
  - Latest release v4.27.0 on 2026-10-10. Eight releases in the last four weeks. Last push 2026-10-12.
  - Engine: FastMCP plus Patchright (a patched Playwright built to avoid bot detection). It runs a real Chromium with a persistent profile.
  - Auth: the user's own LinkedIn session. Two ways. (1) `--login` opens a browser window and the user signs in. (2) `--import-from-browser` (also an auto-import on first call, default on) reads the LinkedIn cookies from the user's everyday Chrome, Brave, Edge and so on, validates them, and copies them to its profile. So it can lift the `li_at` session cookie out of the user's normal browser.
  - It works as a real logged-in user, not as an API. The README says it "doesn't exploit undocumented APIs or bypass authentication".
  - Tools (20): read profiles (`get_person_profile`, experience, education, skills, posts), `get_my_profile`, `search_people`, `search_companies`, `get_company_profile`, `get_company_posts`, `get_company_employees`, `search_jobs`, `get_job_details`, `search_posts`, `get_feed`, `get_inbox`, `get_conversation`, `search_conversations`, **`connect_with_person`** (send or accept connection requests), **`send_message`** (send DMs, after confirmation), `get_sidebar_profiles`, `get_saved_jobs`, `close_session`.
  - So it can read, search, send connection requests and send messages. That last group is the highest ban risk.
  - Its README FAQ: "LinkedIn's User Agreement prohibits automated access, and accounts using automated tools can be restricted or banned. Use at your own risk." It also says the tool is for personal use only. Tool calls run one at a time in a queue, but the user "is responsible for the volume".
  - Related open issues show LinkedIn is pushing back: #957 "Detect and reduce LinkedIn 429s", #1263 "Say when LinkedIn throttled a call", #860 and #732 asking for configurable pacing and randomised delays. Closed PR #1147 "Stop on a restricted account" means the server now halts if LinkedIn restricts the account. **Verified** (GitHub issue titles).
  - It mentions two commercial sponsors, Cadenza (hosted LinkedIn MCP) and Unipile. This is a hint that the maintainers see hosted, compliance-wrapped access as the production path. **Verified** (README).
- Supply-chain note. The documented config uses `uvx mcp-server-linkedin@latest`, which auto-runs the newest release on every start. That code can read the user's LinkedIn cookies. Any product that shipped this would have to pin versions and review releases. **Verified** (config string); the risk reading is mine.
- Fallback "Jina Reader" for public profile pages: `curl r.jina.ai/https://linkedin.com/in/...`. That sends the target URL to a third party and fetches from outside the user's session. LinkedIn commonly blocks anonymous profile fetches. I did not test it. **Unverified** for reliability. It is still scraping under section 8.2.

## A4. Project health

All **Verified** unless noted (GitHub API, repo clone, release feed).

| Item | Value |
|---|---|
| Licence | MIT (LICENSE, copyright "Agent Eyes") |
| Stars / forks | 96,573 / 8,452 (repo created 2026-02-24) |
| Contributors | about 36 (API page count, anonymous included) |
| Language | Python (hatchling build). Version 1.5.0. Classifier "Beta". |
| Last commit / push | 2026-10-08 (HEAD of the clone); `pushed_at` 2026-10-08 |
| Releases | v1.1.0 (2026-02-25), 1.2.0 (02-26), 1.3.0 (03-04), 1.4.0 (03-31), 1.4.1 and 1.4.2 (06-10), 1.5.0 (06-11). Nothing tagged in the four months since. CHANGELOG has a long `[Unreleased]` block, so work continues on main without tags. |
| Open issues | 208 (GitHub count includes open PRs) |
| Ban/block issues | None about LinkedIn. Ban reports exist for other channels: #498 "Xiaohongshu ban warning came after 2 days" (open), #63 Twitter burner account banned (closed), #452 ban question (closed). Blocks: #642 Reddit WAF 403, #428 Jina Reader blocked by Cloudflare, #180 Bilibili 412. The README itself says to use a "dedicated small/burner account, never your main account" for cookie-based platforms. |
| Quality signals | Open issue #732 "Regression: doctor --json can hang indefinitely in v1.5.0". Issue #566 lists 8 problems from a 15-channel test. It is a fast-moving, one-maintainer-style project that also advertises paid agent consulting. |

The star count is very high for a project this young. I did not investigate star inflation. **Unverified** whether the stars are organic.

## A5. Risks

### A5.1 LinkedIn User Agreement section 8.2

Verified on https://www.linkedin.com/legal/user-agreement (effective 2025-11-03). Section 8.2 "Don'ts" says members must not:
- "Develop, support or use software, devices, scripts, robots or any other means or processes (such as crawlers, browser plugins and add-ons or any other technology) to scrape or copy the Services".
- "Copy, use, display or distribute any information (including content) obtained from the Services, whether directly or through third parties (such as search tools or data aggregators or brokers)".
- "Use bots or other unauthorized automated methods to access the Services, add or download contacts, send or redirect messages, create, comment on, like, share, or re-share posts".

Plain reading: a Patchright-driven browser, a browser plugin, and any storing of the copied data are each covered. Sending messages and connection requests by bot is covered too. The wording applies even when a human's own account is used.

### A5.2 Account risk for the user's own account

- LinkedIn publishes no ban numbers. The project README and Phantombuster's MCP both warn about restriction. `03-connectors-and-apis.md` section 3 already lists the folk limits; I do not repeat them.
- Extra risk specific to this tool: it uses Patchright (anti-detection patching), reads cookies out of the user's main browser, and runs headless on a server IP if deployed on one. A session that jumps from a home IP to a data-centre IP is a classic trigger. **Unverified** as a ban cause; it is standard anti-fraud logic.
- In April 2026 two class actions were filed against LinkedIn over its page scripts that scan the browser for extensions. LinkedIn's stated reason is to find tools that scrape or hurt stability. Meaning: LinkedIn does look for scraping extensions on the client side. **Verified** that suits were filed (Bloomberg Law, CyberInsider titles in search results); case status **Unverified**.

### A5.3 Legal history

Facts below that also appear in `03-connectors-and-apis.md` section 3 are summarised in one line; new facts are marked.

- **hiQ v. LinkedIn.** Ninth Circuit (2022) ruled narrowly on the CFAA for public pages. It did not make scraping LinkedIn safe. The district court then found hiQ breached the User Agreement (Nov 2022). Dec 2022 consent judgment: $500,000, permanent injunction, deletion of data and code. Net lesson: contract claims win even where the CFAA does not. **Verified** (Proskauer and NatLawReview, as cited in 03; Diario Judicial 2022 confirms the contract holding).
- **LinkedIn v. Nubela/Proxycurl** (N.D. Cal. 3:25-cv-00828, filed 2025-01-24). Six claims: breach of contract, fraud and deceit, CFAA, California UCL, Lanham Act, misappropriation. Alleged: hundreds of thousands of fake accounts, millions of profiles scraped, data resold. The founder wrote "Proxycurl and I have settled with LinkedIn" and gave no terms. The service closed July 2025. The new product, NinjaPear, says it holds "zero LinkedIn data". New detail vs. 03: terms are still undisclosed; one source says an injunction with data deletion was entered. **Unverified** (only one source; I found no docket entry). **Verified** for the suit, the settlement statement and the shutdown (Nubela blog).
- **LinkedIn v. ProAPIs** (filed Oct 2025, 5:25-cv-08393). Consent judgment in Sept 2026 banning scraping by bots and fake accounts, banning sale of the data, requiring certified deletion (see 03, sources S32).
- **2026 actions.** I found no new LinkedIn scraping suit filed in 2026 against an AI-agent tool or a browser-automation tool. **Unverified** (absence of results in two searches, not a docket search). The April 2026 class actions above run the other way: users suing LinkedIn.
- **Platform enforcement (not court).** A Nubela blog post (April 2026) says LinkedIn removed the Company Pages of Apollo.io and Seamless.ai in 2025. The author is a party with a stake. **Unverified.**
- Pattern across cases: LinkedIn sues companies that scrape at scale, use fake accounts, and resell data. It has not, as far as I found, sued individual users of a personal-use tool. The risk to a SaaS that stores scraped profiles for many customers is of the same kind as Proxycurl and ProAPIs.

### A5.4 Data protection (Egypt and Saudi)

03 section 4 covers PDPL at a high level. The new facts below were read on CMS Law pages.

**Egypt PDPL (Law 151 of 2020) and Executive Regulations.** **Verified** (https://cms.law/en/are/legal-updates/egypt-s-pdpl-executive-regulations-issued-one-year-compliance-countdown-begins):
- Regulations issued 2025-11-01 (Ministerial Decision 816/2025), made public 2025-12-25. One-year grace period, so enforcement is expected from 2026-11-01. That is about one month before the December 2026 demo.
- Consent must be explicit, informed, specific and freely given, with records of how and when. Sensitive data needs written consent, in Arabic.
- Electronic direct marketing needs prior consent, sender identification, a free opt-out, and a specific marketing licence from the Personal Data Protection Centre (PDPC).
- Transfers outside Egypt, "including cloud environments", need a licence or authorisation. Recipients must give protection at least equal to Egypt's. This matters if we host on a non-Egyptian cloud and store Egyptian residents' data.
- Controllers and processors need a general licence (about three years) with extra permits for transfer and marketing. A DPO is mandatory for legal entities.
- The article gave no fine amounts. I did not find them. **Unverified.**

**Saudi PDPL.** **Verified** (https://cms.law/en/are/legal-updates/one-year-anniversary-saudi-personal-data-protection-law):
- Data should be collected directly from the person. Indirect collection (scraping is indirect) or a new purpose needs its own legal basis.
- Opt-in consent before direct marketing. Clear opt-out. Sensitive data cannot be used for marketing.
- Fines up to SAR 5 million, doubled for repeat offences. Prison up to two years for unauthorised disclosure or misuse of sensitive data.
- Cross-border transfer is allowed only on conditions (adequacy, SDAIA-approved standard contractual clauses, risk assessment). SDAIA had not published an adequacy list at the time of the article.
- Registration on the National Data Governance Platform if the main activity is processing personal data.
- I did not find a clear exception for "publicly available" data. **Unverified** (checked CMS, Latham and DLA Piper summaries only; the statute text and SDAIA rules were not read).

What this means for scraped LinkedIn data: a database of scraped profiles is personal data collected indirectly, without notice, then used for marketing. Both laws point to consent and notice duties we could not meet. Storing it in a foreign cloud adds a transfer licence step in Egypt. I am not a lawyer. 03 already asks for a local legal opinion; this strengthens that need.

## A6. Safer patterns that give similar value

| Pattern | What it gives | Risk | Notes |
|---|---|---|---|
| **User pastes or shares one profile.** The user copies a profile URL or text into the app, or clicks "save to CRM" in their own browser. | One prospect, no bot, no cookie handling by us | Lowest. Human action, one record, user is the data source. | Best default. Ask for the LinkedIn URL and enrich from licensed data. |
| **Browser extension that reads the page the user is looking at** (single-profile, user-triggered, nothing is fetched in the background) | Name, title, company, recent posts for the profile on screen | Low to medium. Section 8.2 names "browser plugins" so it is still on the wrong side of the text. LinkedIn also looks for extensions (A5.2). | Needs per-click trigger, no auto-pagination, no stored cookie, a daily cap, a warning. Never ship a "scrape the search results" button. |
| **Official LinkedIn APIs** | `Sign In with LinkedIn` (OpenID): the user's own name and email. `w_member_social` (Share on LinkedIn): post as the member, 150 requests/member/day. Community Management API (approved apps only): pages, comments, analytics. Marketing/Lead Gen Forms: leads who filled your form. | None for terms. Slow approval for Community Management. | See 03 section 5. No self-serve API gives prospect data (V in 03). |
| **Customer-uploaded exports** | LinkedIn "Get a copy of your data" gives the member's own connections list. Customers can also upload Sales Navigator / Recruiter data they exported themselves. | Low for us (the customer is the data owner and source). Medium for the customer if they used a third-party export extension. | Sales Navigator has no native one-click lead-list CSV; people use Chrome extensions (SalesNav Exporter, NavBulk) that may breach section 8.2. **Unverified** (vendor blogs). The connections export path is described by several vendor guides, but I did not find LinkedIn's help page. **Unverified.** |
| **Licensed data providers** | Crustdata, Apollo, PredictLeads, Coresignal, and others (03 section 4). Search by company or title, get verified email and firmographics. | Moves legal risk to the provider but does not remove it. Proxycurl and ProAPIs were providers. | Pick providers that document sourcing, give a DPA, and offer a contractual indemnity. Coresignal markets itself as GDPR and CCPA compliant public-web data; its own pages do not say how LinkedIn data is collected. **Unverified.** PredictLeads is not LinkedIn-based (company websites, jobs, news), per 03. |
| **Non-LinkedIn signals** | Company websites, job boards, funding news, press, RSS | None for LinkedIn terms. Normal robots.txt and website terms apply. | Crawl4AI or Firecrawl (Part B) do this well. |

## A7. Recommendation

**Where Agent-Reach (or its LinkedIn backend) may be used**

1. As a developer tool on our own laptops, for our own research. Not in the product, not on our servers, and with a dedicated test account.
2. For non-LinkedIn sources in internal research: web pages, RSS, YouTube transcripts, GitHub, Exa search. Note that for the product itself we should call Crawl4AI, Firecrawl or Exa directly. Agent-Reach adds only an installer around them.
3. As an optional, off-by-default "Local power-user connector" much later. All of these must hold:
   - runs on the user's own computer, never on our cloud;
   - uses the user's own account and session; the cookie never leaves the machine and we never see it;
   - one profile per user click, no search-result harvesting, no background crawl, no auto-messaging;
   - a clear warning screen: this may breach LinkedIn's terms and may restrict your account; you accept the risk;
   - what is saved to our CRM is only the fields the user chooses to keep, with the source labelled and a deletion path;
   - a hard daily cap (for example 30 profiles) and a kill switch we control.
   Even with all of that, I would hold this feature until after the competition and after the legal opinion in 03.

**Where it must not be used**

- Bulk crawling of LinkedIn profiles, search results, company employee lists or posts into our multi-tenant database.
- Running the LinkedIn backend on our servers with customers' cookies. We would become the credential holder, the scraper and the data seller. That is the Proxycurl fact pattern.
- Automated connection requests or messages (`connect_with_person`, `send_message`) driven by our AI. 03 already says every LinkedIn action needs a human approval gate and a per-account cap.
- Any demo to the Huawei ICT judges that scrapes live LinkedIn. Use a clearly labelled sandbox or mock, as 03 recommends.
- Using `@latest` auto-update in anything we ship.

---

# Part B - Other building blocks

Stars and "last release" come from the GitHub API and the repo's `releases.atom` on 2026-10-13. Licences come from the LICENSE files (V) unless noted. "SaaS limit" = what the licence means if we offer the software to customers as a hosted service.

## B1. Workflow automation

| Tool | What it does | Licence and SaaS limit | Maturity | API / MCP | How we use it |
|---|---|---|---|---|---|
| **n8n** | Visual workflow builder, 400+ integrations, AI agent nodes | **Fair-code (Sustainable Use License).** "You may use or modify the software only for your own internal business purposes or for non-commercial or personal use." May only be given to others free of charge for non-commercial purposes. `.ee.` files need an Enterprise licence. **V** (LICENSE.md). Hosting it for our customers, or embedding it, needs a commercial licence. **U** on the price and terms of the "Embed" deal. | 207,144 stars. Release `n8n@2.43.4` on 2026-10-12 | Built-in instance-level MCP server plus an MCP Server Trigger node. **V** (docs.n8n.io) | **Do not embed.** Let customers connect their own n8n by webhook if they want. Use it internally for our own ops if needed. |
| **Activepieces** | Workflow builder with 280+ "pieces" (connectors) | **MIT** outside `packages/ee/` and the server `ee` folder; those are under a separate licence. **V** (LICENSE). Embedding and multi-tenant admin features may sit in the EE folders. **U**, check the folder list before committing. | 25,024 stars. Release 0.92.3 on 2026-10-12 | Every piece is exposed as an MCP server. **V** (README) | **Best candidate.** Reuse the MIT piece catalog as our connector library. Run it as the engine for customer workflows if the EE boundary allows it. Fallback: write our own thin runner and call pieces only. |
| **Windmill** | Scripts, flows and apps in Python, TS, Go, SQL; fast Rust worker | **AGPLv3** for backend and frontend, with proprietary "enterprise" snippets; Apache-2.0 for some files. **V** (LICENSE). AGPL: if we modify it and let users interact over a network, we must publish our changes. | 18,164 stars. Release v1.830.0 on 2026-10-09 | Official MCP gateway on each instance. **U** (docs page exists; the per-tool detail came from a third-party catalog) | Skip for the product. Fine as an internal tool on our own servers. |

Decision: standardise on Activepieces (MIT) as the optional automation layer and connector source. Treat n8n and Windmill as "customer brings their own" targets.

## B2. Email stack

| Tool | What it does | Licence and SaaS limit | Maturity | API / MCP | How we use it |
|---|---|---|---|---|---|
| **Listmonk** | Newsletter and mailing-list manager, one Go binary + Postgres | **AGPLv3** (**V**) | 23,765 stars. Stable v6.2.0 on 2026-07-20; nightly builds daily | REST API (**U**, standard feature; not read) | For opted-in newsletters only. It is not a cold-outreach sequencer. Optional later; run unmodified as its own service. |
| **Mautic** | Marketing automation: forms, scoring, campaigns, landing pages (PHP) | **GPL-3.0** (**V**, LICENSE.txt header). GPL has no network-use clause, but copying its code into our closed product would still be a problem. Confirm with counsel. | 10,752 stars. Community 7.2.1 on 2026-09-23 | REST API (**U**) | Do not embed. It overlaps with Twenty plus our own sequencer, and it is heavy to run. Use only as a reference for lead scoring and form tracking ideas. |
| **Postal** | Self-hosted mail server for sending, like SendGrid or Mailgun | **MIT** (**V**, GitHub API licence field) | 16,858 stars. v3.3.7 on 2026-06-03. Slower cadence | HTTP API and SMTP (**U** from the project description) | Optional sending backend for self-hosters. For cold email, deliverability depends on IP and domain reputation, which a shared Postal IP will ruin. Prefer the customer's own mailboxes (Google/Microsoft) or a reseller, per 03. |
| **Mailcow** | Full mail server suite (Postfix, Dovecot, SOGo) in Docker | **GPL-3.0** (**V**, API licence field) | 13,598 stars. Release 2026-10-06 | Has an API (**U**) | Later, if we offer "we provision mailboxes on your domain". High ops cost. Not before the demo. |

Decision: for the demo, send through the customer's connected Gmail/Microsoft mailbox or a sender tool from 03. Keep Postal and Mailcow on the "later" list.

## B3. Booking

**Cal.com changed.** `github.com/calcom/cal.com` now redirects to `calcom/cal.diy`. **V** (API redirect).
- **Cal.diy**: MIT, 48,971 stars, last release v6.2.0 on 2026-03-01, last push 2026-09-26. It is a fork of Cal.com with all enterprise code removed: no Teams, Organizations, Insights, Workflows or SSO. Its README warns: "strictly recommended for personal, non-production use", no hosted version. **V** (README).
- The commercial Cal.com (hosted or on-prem enterprise) is a paid product. An official hosted MCP at `mcp.cal.com/mcp` with OAuth 2.1 is described in Cal.com's docs, per a search result I did not open. **U.**
- Decision: **integrate, do not host.** Let each user attach their own Cal.com or Calendly link, or use Google/Microsoft calendar APIs. Do not run Cal.diy as a multi-tenant service. It lacks teams and is not meant for production.

## B4. Analytics

| Tool | Licence and SaaS limit | Maturity | API / MCP | Use |
|---|---|---|---|---|
| **Umami** | **MIT** (**V**) | 39,333 stars. v3.4.0 on 2026-09-17 | REST API. MCP endpoint built in, off by default (`MCP_ENABLED=1`). **V** (README) | **Best fit.** Cookie-free site analytics for the landing pages and links our users publish. One site per customer campaign, query it from our assistant by MCP. |
| **Plausible CE** | **AGPLv3** (**V**) | 29,380 stars. v3.2.1 on 2026-06-01 | Stats API and Events API (**U**) | Skip. Umami has the same job under MIT. |
| **PostHog** | **MIT** outside `ee/`; `ee/` is under a separate licence. **V** (LICENSE) | 40,244 stars. Releases daily (hobby installer) | Remote MCP at `https://mcp.posthog.com/mcp`. **V** (README) | For our own product analytics, use their cloud. Self-hosting is heavy (ClickHouse). Not for customers' sites. |

## B5. Web research and browser agents

| Tool | Licence and SaaS limit | Maturity | API / MCP | Use |
|---|---|---|---|---|
| **Firecrawl** | **AGPL-3.0**, with SDKs and some UI under MIT. The cloud version has extra features not in the open-source build. **V** (README) | 190,855 stars. v2.11.514 on 2026-10-12 | REST API, MCP (**V**, README) | Call their hosted API for research (no AGPL duty when we only call an API). Do not fork or host a modified copy. |
| **Crawl4AI** | **Apache-2.0** (**V**) | 85,388 stars. v0.9.4 on 2026-09-23 | Docker API, MCP (**V**, README) | **Default self-hosted crawler** for company sites, pricing pages, careers pages, news. Respect robots.txt and site terms. |
| **browser-use** | **MIT** (**V**) | 117,754 stars. 0.13.11 on 2026-10-07 | Python library; MCP (**V**, README comment and docs link) | For tasks needing real clicks on sites that allow it. Not for LinkedIn. Later. |
| **Playwright MCP** | **Apache-2.0** (**V**) | 38,067 stars. v0.0.83 on 2026-09-28 (pre-1.0) | It is an MCP server | Internal QA and demo recording. Not a customer-facing engine. |

## B6. Contracts and e-signature

| Tool | Licence and SaaS limit | Maturity | Use |
|---|---|---|---|
| **DocuSeal** | **AGPL-3.0 plus an added term**: the original DocuSeal attribution must be kept in interactive user interfaces. **V** (LICENSE and LICENSE_ADDITIONAL_TERMS). White-labelling needs a commercial deal (**U**). | 18,699 stars. 3.3.2 on 2026-10-05. Has an API (README mentions it) | Later phase. Integrate by API with an unmodified instance, or buy. |
| **Documenso** | **AGPL-3.0** community edition. Enterprise features (SSO, embed authoring, white-label) need a paid licence key. Docs also list "white-label product with proprietary changes" as Enterprise. The tiers are described inconsistently across its pages. **U** | 15,399 stars. v2.20.0 on 2026-09-29 | Same as DocuSeal. Not before the demo. Legal validity of e-signatures in Egypt and KSA is not checked here. **U** |

## B7. Inbox (Chatwoot)

- **Chatwoot**: MIT outside the `enterprise/` folder (**V**). 37,737 stars. v4.18.0 on 2026-09-18.
- Channels per README: live chat, email, Facebook, Instagram, Twitter, **WhatsApp**, Telegram, Line, SMS. **V** (README). Public REST API (**U**, standard feature; not read).
- Use: a candidate for the later "unified inbox" (email replies, WhatsApp opt-in follow-ups). Compare with Unipile in 03. WhatsApp rules from 03 still apply (templates and opt-in only). Multi-account (one Chatwoot account per tenant) is a Chatwoot concept, but I did not verify the isolation model. **U.** Decision: integrate later; keep our own thin inbox model so we can swap.

## B8. LLM observability (Langfuse)

- **MIT** outside `ee/`, `web/src/ee/`, `worker/src/ee/` (**V**). Copyright now ClickHouse, Inc. 35,713 stars. v4.57.0 on 2026-10-12.
- Native MCP server for prompts and observations, read and write by default, restrictable to read-only; works on cloud and self-hosted. **V** (langfuse.com docs).
- Use: trace every agent run and cost per tenant, and manage prompts. Self-host in our own region (data residency). Good fit for a data-protection story.

## B9. Enrichment, verification, sequencing, "Clay alternatives"

| Tool | Licence | Maturity | What it is | Verdict |
|---|---|---|---|---|
| **Reacher** (`check-if-email-exists`) | **MIT** for the source (**V**, README) | 10,149 stars. v0.11.9 on 2026-10-05 | Rust SMTP email verifier, HTTP backend | Good fallback verifier we can run ourselves. SMTP checks need outbound port 25 and a clean IP, which many clouds block. **U** on Huawei Cloud. Use paid verifiers as primary (03). |
| **truemail-go** | MIT | 137 stars. Last push 2024-08 | Go verifier | Too stale. |
| **YALC** (`Othmane-Khadri/YALC-the-GTM-operating-system`) | **MIT** (**V**) | 318 stars. Active 2026-08. CLI only, "no public Node API to import" | "Open-source Clay alternative": enrichment and workflows as markdown files, run on the user's machine with their own keys | Read for ideas. Cannot be embedded in a multi-tenant web product. The authors now sell a hosted "Yalc 2.0". |
| Other "Clay clones" | various | 0 to 72 stars | `beton-ai` (spreadsheet UI) is reported deprecated; `enrichment-kit` 33 stars; `gtm-waterfall-enrichment` 1 star | None are mature. A vendor blog (Pipe0) concludes there is no serious open-source Clay, because Clay's moat is negotiated data licences. **U** (vendor-written). I agree on the substance: the data is the product, not the spreadsheet. |
| **Warmbly** | **Apache-2.0** (**V**, API) | 415 stars. Active (push 2026-10-12). Young | Open-source cold email: multi-step campaigns, unified inbox, small CRM, warmup from "a pool of monitored mailboxes", REST API, webhooks, HubSpot/Slack/Zapier | The only fuller OSS sequencer I found. Too young to depend on. Warmup pools are a deliverability-gaming tactic that mailbox providers may penalise. **U** on effect. Study its sequencing and caps; do not adopt. |
| Other warm-up repos | MIT mostly | 0 stars | `inboxtrust`, `cold-email-deliverability-toolkit`, `Coldrig` | Not usable. |

Decision on enrichment: build a small waterfall service ourselves (try provider A, then B, then verify email, stop at first hit, log cost per tenant). Take provider list and rules from 03. Use Reacher as the last-resort verifier.

## B10. OpenDesign: current state

Source: README, `docs/`, `design-templates/`, repo clone at HEAD (commit date 2026-10-12). **Verified** unless noted.

- Repo: https://github.com/nexu-io/open-design. Apache-2.0 (LICENSE). 100,747 stars. Latest release **0.24.1** on 2026-09-24 ("World's First Design Plan"); 0.24.0 on 2026-09-22. Very active (push 2026-10-12). 1,157 open issues.
- What it is: a "collaborative design agent workspace". It does not ship its own agent. It runs a local daemon (Node 24, Express, SQLite) that launches whichever coding-agent CLI is on the machine (26 CLIs, including Claude Code and Codex) or a BYOK API proxy (Anthropic, OpenAI, Azure, Google, Ollama, any OpenAI-compatible endpoint). Desktop apps for macOS and Windows. **No prebuilt Linux app**; Linux runs from source or Docker. A paid OpenDesign Cloud / "Go" plan also exists, starting at $8 for the first month (README banner).
- **Templates:** 116 design templates and 165 skills in the repo. Includes `email-marketing` ("table-fallback-safe brand email"), `social-carousel` (3-card 1080x1080), `saas-landing`, `dashboard`, `magazine-poster`, `digital-eguide`, `docs-page`, `blog-post`, 15 deck templates and 36 deck themes. No LinkedIn-outreach, proposal or one-pager template by name; those would be new skills.
- **Brand kits:** every render reads a `DESIGN.md` brand contract. 151 design systems ship. Release 0.12.0 added "Brand-backed Design System": give a URL or screenshot and the agent writes a reusable `DESIGN.md`. This maps well to our "brand kit" onboarding step.
- **Exports:** HTML (single file), PDF (browser print), PPTX (agent-driven skill; 0.13.0 notes "screenshot-backed PPTX/PDF"), ZIP, Markdown, MP4 (HyperFrames). **PNG is not listed as an export format.** Images come from model providers (for example `gpt-image-2`). A PNG of a template would need a screenshot step. **U.**
- **MCP and API:** a stdio MCP server (`od mcp install <agent>`) that lets other agents read the live project files. The daemon has an HTTP API (`/api/projects/:id/files`, `/api/artifacts/save`, `/api/artifacts/lint`, `/api/chat` over SSE, and more). The Docker setup protects it with one `OD_API_TOKEN` (Bearer). A "run OD from your coding agent" flow exists, with Claude Code listed.
- **Multi-tenant / hosted mode:** **No.** `docs/spec.md` says "We do not implement auth / billing / orgs in MVP. Single-user, single-machine. Multi-user is post-v1 and optional." The roadmap file lists "Auth / multi-user" and "Collaborative mode" as future items. These docs may be older than the code; I did not read the daemon source. **U** on whether multi-user has landed since. The company's own hosted product (OpenDesign Cloud, with "Workspace Team", Stripe and a separate "Vela" backend, per a Chinese-language release runbook in `docs/deployment/`) is not in the open-source repo as far as I can tell. **U.**
- **Arabic / RTL:** the README is translated to Arabic. Some templates (`docs-page`, `blog-post`, `digital-eguide`) require an `rtl-and-bidi` skill and describe layouts that flip under `dir="rtl"`. Most templates do not mention RTL. **U** on real Arabic quality.
- Security note: it executes coding-agent CLIs that write files and run commands. In a multi-tenant product, each tenant's run must be sandboxed (container per run), or we use the BYOK proxy path that returns one HTML artifact and runs no CLI.

How we would use or tweak it: run it as an internal service behind our own auth. Use the BYOK path (our model, our key) so no CLI is spawned. One workspace volume per tenant. Pre-load our brand-kit `DESIGN.md` per tenant. Add a small set of our own skills (outreach one-pager, proposal PDF, LinkedIn banner, Arabic email) and render to PDF/PNG by headless browser. Keep our changes as separate skills and plugins so we are not forking the daemon.

---

# Gather list

Build vs integrate: **Build** = we write it. **Integrate** = we call or host it, unmodified. **Reuse** = take code or catalog under its licence. **Later** = not in the Dec 2026 demo.

| Component | Role in product | Licence risk | Decision |
|---|---|---|---|
| Twenty CRM | Core CRM, objects, MCP | **Medium.** AGPLv3. Apps via API/SDK can be proprietary (Application Exception). Modifying Twenty means publishing the changes (section 13). Files marked `@license Enterprise` are commercial. | **Integrate.** Do not fork. Build our features as a Twenty app or as a separate service on its API. |
| OpenDesign | Asset generation: decks, emails, carousels, PDFs, brand kits | **Low.** Apache-2.0 | **Integrate and extend with our own skills.** Wrap per tenant. It is single-user today. |
| Activepieces (core + pieces) | Automation engine and connector catalog | **Low to medium.** MIT outside the EE folders | **Reuse** pieces; **Integrate** engine if the EE boundary allows multi-tenant. |
| Umami | Page and link analytics for customer campaigns | **Low.** MIT | **Integrate.** |
| Langfuse | LLM traces, cost per tenant, prompts | **Low.** MIT outside `ee/` | **Integrate** (self-host in our region). |
| Crawl4AI | Public-web research crawler | **Low.** Apache-2.0 | **Integrate.** Our default crawler. |
| Reacher | Self-hosted email verification fallback | **Low.** MIT | **Integrate** as fallback. Paid verifiers first. |
| Chatwoot | Unified inbox, WhatsApp opt-in channel | **Low to medium.** MIT outside `enterprise/` | **Integrate (later).** |
| Postal | Optional sending backend | **Low.** MIT | **Later.** Deliverability risk, not licence risk. |
| Playwright MCP | QA and demo automation | **Low.** Apache-2.0 | **Use internally.** |
| browser-use | Interactive browsing agent | **Low.** MIT | **Later**, non-LinkedIn only. |
| Firecrawl | Hosted web extraction API | **Medium if self-hosted** (AGPL). Low as a paid API. | **Integrate hosted API** only if Crawl4AI falls short. |
| PostHog | Our own product analytics | **Low.** MIT outside `ee/` | **Integrate their cloud.** Not for customer sites. |
| Cal.com / Cal.diy | Booking links | **Medium.** Cal.diy is MIT but unfit for production and has no teams. Commercial Cal.com is paid. | **Integrate** the customer's own booking link. Do not host. |
| DocuSeal / Documenso | Contracts, e-sign | **Medium to high.** AGPL, plus attribution (DocuSeal) or paid white-label | **Later.** Integrate by API or buy. |
| Listmonk | Opt-in newsletters | **Medium.** AGPLv3 | **Later**, unmodified separate service. |
| Mautic | Marketing automation | **Medium.** GPL-3.0, heavy | **Reference only.** |
| Mailcow | Mailbox hosting | **Medium.** GPL-3.0, ops heavy | **Later.** |
| Enrichment waterfall | Provider chain with cost caps | None (ours) | **Build.** No OSS option is mature. |
| Sequencer and send engine | Multi-step email on customer mailboxes | None (ours) | **Build** on Gmail/Graph APIs plus the sender tools in 03. Study Warmbly for ideas. |
| Consent and suppression store | PDPL compliance: consent log, opt-out, deletion | None (ours) | **Build.** Required by Egypt and Saudi PDPL. |
| LinkedIn data | Prospect and signal input | **High** if scraped | **Integrate licensed providers and official APIs only** (A6). No scraper in the product. |

## Do not use

| Item | Reason |
|---|---|
| Agent-Reach + `mcp-server-linkedin` as a server-side crawler | Breaks LinkedIn section 8.2. Puts customers' session cookies on our servers. Stores scraped personal data (PDPL). Matches the Proxycurl and ProAPIs fact pattern. |
| `mcp-server-linkedin@latest` (or any auto-updating scraper) inside the product | Unpinned code with access to login cookies is a supply-chain risk. |
| Automated `send_message` / `connect_with_person` by our AI | Highest ban risk. Section 8.2 names bot messaging. |
| n8n as the embedded engine | Licence allows internal business use only. |
| Windmill as the embedded engine | AGPL plus proprietary enterprise parts. Activepieces is cleaner. |
| Cal.diy as our hosted booking service | Its own README says personal, non-production use; no teams or orgs. |
| Forking Twenty or Firecrawl and hosting the fork | AGPL: we would have to publish our changes. |
| Shared-IP Postal or any shared sender for cold email | One bad tenant ruins reputation for all. |
| Warmup pools / "warmup networks" (Warmbly-style) as a core feature | Gaming deliverability. Young projects, 415 stars or fewer. |
| YALC, beton-ai and other "Clay clones" as a base | CLI-only or abandoned. No data. |
| Plausible CE (when Umami exists) | AGPL for the same job. |

---

## Open items

- Legal opinion on PDPL scope for B2B contact data in Egypt and KSA (already open in 03). The new fact is the Egypt grace period ending around 2026-11-01 and the cross-border transfer licence for cloud hosting.
- Read the Activepieces `packages/ee` licence and confirm whether embedding and multi-tenant projects need it.
- Read the OpenDesign daemon source to check whether any multi-user auth exists beyond `OD_API_TOKEN`.
- Confirm n8n Embed terms and price only if we later want n8n inside the product.
- Confirm LinkedIn's help page for "Get a copy of your data" before telling users to rely on it.
- Check star inflation on Agent-Reach (96.5k stars in 7 months) if it ever becomes a dependency.

## Sources

Primary (read):
- Agent-Reach repo, clone at HEAD 94f06c1 (2026-10-08): README.md, CHANGELOG.md, pyproject.toml, LICENSE, SECURITY.md, `docs/install.md`, `agent_reach/channels/linkedin.py`, `agent_reach/integrations/mcp_server.py`, `agent_reach/skill/references/career.md` - https://github.com/Panniantong/agent-reach
- GitHub API for repo metadata, releases and issue searches (2026-10-13) - https://api.github.com/repos/Panniantong/Agent-Reach and the other repos in the tables
- linkedin-mcp-server README (raw) - https://github.com/stickerdaniel/linkedin-mcp-server
- LinkedIn User Agreement, effective 2025-11-03 - https://www.linkedin.com/legal/user-agreement
- CMS Law, Egypt PDPL executive regulations - https://cms.law/en/are/legal-updates/egypt-s-pdpl-executive-regulations-issued-one-year-compliance-countdown-begins
- CMS Law, Saudi PDPL - https://cms.law/en/are/legal-updates/one-year-anniversary-saudi-personal-data-protection-law
- Nubela blog on Proxycurl settlement (party to the case) - https://nubela.co/blog/is-scraping-linkedin-legal-in-2026/
- Diario Judicial, hiQ contract ruling (2022) - https://www.diariojudicial.com/news-93576-el-scraping-de-datos-va-a-juicio
- LICENSE files (raw.githubusercontent.com): n8n-io/n8n `LICENSE.md`; activepieces/activepieces; windmill-labs/windmill; twentyhq/twenty; PostHog/posthog; chatwoot/chatwoot; langfuse/langfuse; mautic/mautic `LICENSE.txt`; docusealco/docuseal (+ `LICENSE_ADDITIONAL_TERMS`); documenso/documenso; calcom/cal.diy; firecrawl/firecrawl; nexu-io/open-design
- READMEs: listmonk, postal, umami, plausible, firecrawl, crawl4ai, browser-use, playwright-mcp, chatwoot, reacher, warmbly, YALC, calcom/cal.diy, open-design (and clone of open-design: `docs/spec.md`, `docs/roadmap.md`, `design-templates/`)
- n8n instance-level MCP docs - https://docs.n8n.io/advanced-ai/mcp/accessing-n8n-mcp-server/
- Langfuse MCP docs - https://langfuse.com/docs/api-and-data-platform/features/mcp-server
- Release feeds: `https://github.com/<owner>/<repo>/releases.atom` for each repo

Secondary or search-snippet only (treated as Unverified):
- Bloomberg Law and CyberInsider on the April 2026 class actions against LinkedIn - https://news.bloomberglaw.com/litigation/linkedin-hit-with-two-suits-over-browser-extension-tracking
- Windmill MCP (catalog and docs page) - https://www.windmill.dev/docs/core_concepts/mcp
- Cal.com MCP docs - https://cal.com/docs/mcp-server
- Documenso licensing pages - https://docs.documenso.com/docs/policies/enterprise-edition
- Pipe0 on open-source Clay alternatives - https://pipe0.com/blog/open-source-clay-alternative
- Coresignal compliance claims - https://coresignal.com/about-us/
- Sales Navigator export vendor guides (Cleverly, Bardeen, Expandi)
