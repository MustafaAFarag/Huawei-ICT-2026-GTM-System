# 10. User pain, "out of the box" patterns, design assets, agencies and MENA voice

Research date: 2026-10-13. Method: web search and page fetches only. No credit-spending tools were used. Written for the product owner of the outbound GTM workspace (Egypt, KSA, UAE; English first, Arabic content too).

Read first: `01-gtm-process-and-ai.md` and `02-competitors-and-positioning.md`. This report does not repeat their pricing and benchmark tables.

## 0. How to read this report

**Tags.**
- **Verified** means I opened the page (or the tool returned its text) and the claim is there. The URL is given.
- **Verified (secondhand quote)** means I read a page that quotes a third party (for example a G2 review inside a competitor's blog). The quote exists on that page. I did not read the original.
- **Unverified** means a search-result snippet, a page I could not open, or my own inference.
- **Vendor claim** means the seller of the product published it. A vendor claim can still be Verified as "the vendor says this".

**What I could not reach. This limits the whole report.**
- **Reddit.** All Reddit access is blocked for this tool. Search with `reddit.com` returned "domains are not accessible", page fetch failed, and `old.reddit.com` redirected to a login page. I did not log in. **So there are no Reddit quotes here.** r/sales, r/coldemail, r/B2BSales, r/agency, r/GoHighLevel, r/n8n and r/clay are all missing.
- **G2 and Capterra.** Both return HTTP 403 (Cloudflare challenge). I did not try to bypass it. G2 text appears only as quotes inside other pages.
- **Facebook groups, X, YouTube comments, Arabic LinkedIn.** Not reachable or returned nothing useful.
- **What I used instead.** Trustpilot (readable, dated, with star ratings), the n8n community forum (Discourse, public JSON), Hacker News (Algolia API), a few readable LinkedIn posts, vendor help pages, and the GoHighLevel and HubSpot idea boards.
- **Bias warnings.** Trustpilot skews to angry or invited reviewers. Some vendors invite reviews (GoHighLevel's 4.9 from 15,200 reviews is very likely invited). A low score does not prove a bad product. I use Trustpilot for **themes and phrasing**, not for ratings.
- **Fetch tool note.** Page text passed through a summariser. Quotes are short and as returned. Treat exact wording as "close to source". Re-open the link before using a quote in a slide.

---

## 1. Bottom line

1. **The "non-technical users" premise is strongly supported.** Across Clay, Make, n8n, HubSpot, Apollo, Smartlead and Instantly, the same complaint repeats: it takes too long to learn, credits burn while learning, and things break after setup.
2. **Credit and usage billing is the loudest cost complaint.** Clay, Apollo, Zapier, Instantly and Gamma all show "credits vanished or expired" reviews.
3. **Setup and deliverability are where beginners lose weeks.** "23 days trying to get started" and "13 days for the inboxes to warm up" are in 2026 reviews.
4. **Out of the box in 2026 means "describe the goal in chat, review a draft, approve".** Clay Sculptor, Apollo AI Assistant and lemlist lemAgent all work this way. All three keep a human approval step. No source gave independent time-to-first-value numbers. All time claims are vendor claims.
5. **Design assets: demand is plausible, impact is unproven.** I found **no independent study** showing that one-pagers, mini-audits, carousels or personalised pages raise replies or meetings in B2B outbound. The only side-by-side test I could read is tiny, vendor-hosted and mixed (section 4). The product owner's view that design assets should be a big part is a **bet**, not a finding. Build it with a built-in A/B holdout.
6. **Agencies have real, documented pain.** Per-client credential handover, "show the client what ran", reporting, and white-label limits. Evidence is strongest from the n8n forum (2026) and vendor help pages.
7. **MENA voice is thin but one signal is hard.** GoHighLevel's Arabic request has **308 votes** and has been open since January 2023. WhatsApp-first selling is asserted everywhere but only by vendors.

---

## 2. Pain themes from user voice (task 1)

Each theme has 2-3 quotes. Quotes are short. Links go to the page I read.

### 2.1 Learning curve

| Quote | Where | Tag |
|---|---|---|
| "There is a real learning curve to using Clay efficiently" (5 stars, Sep 15 2026) | [Clay, Trustpilot](https://www.trustpilot.com/review/clay.com) | Verified |
| "Extremely difficult to use, not intuitive at all" (1 star, Sep 28 2026) | [Clay, Trustpilot](https://www.trustpilot.com/review/clay.com) | Verified |
| "Clay is built for RevOps engineers, not salespeople." (G2 reviewer, quoted by a Clay competitor) | [Amplemarket blog](https://www.amplemarket.com/blog/how-much-does-clay-really-cost) | Verified (secondhand quote). Competitor chose the quote. |
| "There are 100s of modules but which one is which?" (1 star, Apr 29 2026) | [Make, Trustpilot](https://www.trustpilot.com/review/make.com) | Verified |
| "It's a complex platform folks - be aware - it will take your time if you're new to it." (1 star, Oct 7 2026) | [HubSpot, Trustpilot](https://www.trustpilot.com/review/hubspot.com) | Verified |
| "i could not get anything to work so i booked a few training sessions" (5 stars, Dec 18 2025) | [n8n, Trustpilot](https://www.trustpilot.com/review/n8n.io) | Verified |
| "not because n8n is hard, but because most tutorials assume you already know what a webhook is" (forum post, Jun 16 2026) | [n8n community](https://community.n8n.io/t/299629.json) | Verified. The poster sells a template, so mild bias. |
| A new outbound founder said Apollo and ZoomInfo were "too powerful" for what they needed (paraphrase) | [Ask HN: Alternatives to Clay](https://hn.algolia.com/api/v1/items/45791605) (Nov 2 2025) | Verified |

Pattern: people do not say the tools are bad. They say the tools assume a builder's mindset. Several 5-star reviews still mention the curve.

### 2.2 Credit and usage costs

| Quote | Where | Tag |
|---|---|---|
| "eating credits for no reason" (1 star, Mar 10 2026) | [Clay, Trustpilot](https://www.trustpilot.com/review/clay.com) | Verified |
| "I burned 2,000 credits in my first week just learning how the tool works." (G2 reviewer) | [Amplemarket blog](https://www.amplemarket.com/blog/how-much-does-clay-really-cost) | Verified (secondhand quote) |
| "The credits don't roll over and they are expensive as hell." (1 star, Oct 2 2026) | [Apollo, Trustpilot](https://www.trustpilot.com/review/apollo.io) | Verified |
| "I am getting a limit, EVEN THOUGH I still have credits." (1 star, Oct 6 2026) | [Apollo, Trustpilot](https://www.trustpilot.com/review/apollo.io) | Verified |
| "it burned through my monthly task allowance in less than 48 hours without warning" (1 star, Aug 7 2026) | [Zapier, Trustpilot](https://www.trustpilot.com/review/zapier.com) | Verified |
| "platform credits that expire before you can even use them" (1 star, Sep 19 2026) | [Instantly, Trustpilot](https://www.trustpilot.com/review/instantly.ai) | Verified |
| Poster says Clay "is becoming too expensive" and wants cheap, easy tools (paraphrase) | [Ask HN](https://hn.algolia.com/api/v1/items/45791605) | Verified |

Counterpoint: one Clay 5-star review says "They are also pretty generous with credit refunds" ([Trustpilot](https://www.trustpilot.com/review/clay.com), Sep 19 2026). A fair refund path is a trust feature.

### 2.3 Tool switching and sprawl

| Quote or point | Where | Tag |
|---|---|---|
| An agency builder has a client whose automations span n8n, Zapier and scripts: "No single place to point them at." (Jul 15 2026) | [n8n community](https://community.n8n.io/t/303361.json) | Verified |
| A GTM engineer says Clay's weak point is the building experience: complex workflows make tables "painful to manage". He uses Claude as the "design + orchestration layer" in front of Clay. | [LinkedIn, Jacob Tuwiner](https://www.linkedin.com/posts/jacob-tuwiner_ive-been-thinking-a-lot-lately-about-how-activity-7444743683482075136-R_MV) (about 6 months old) | Verified |
| A founder lists a 5-tool stack (Apollo, NeverBounce, Instantly or Smartlead, a warm-up service, a spreadsheet) and a commenter calls it a coordination problem | [Indie Hackers thread](https://www.indiehackers.com/post/the-cold-email-problem-nobody-talks-about-cfe9e6df69) | **Unverified**. Page returned 403. I only saw the search-tool summary. |

`01-gtm-process-and-ai.md` already notes that no measured survey of "tool sprawl" exists. This table is anecdotal too.

### 2.4 Data quality

| Quote | Where | Tag |
|---|---|---|
| "can mistake in data so we have cross check data" (3 stars, Sep 25 2026) | [Apollo, Trustpilot](https://www.trustpilot.com/review/apollo.io) | Verified |
| "Overpriced with terrible data." (1 star, Apr 24 2026) | [Clay, Trustpilot](https://www.trustpilot.com/review/clay.com) | Verified |
| Without waterfall enrichment a list may end up "about 50% enriched instead of 90-95%" (one HN commenter's claim, paraphrase) | [Ask HN](https://hn.algolia.com/api/v1/items/45791605) | Verified as said. The number is one person's claim. |
| A Capterra reviewer's con: mobile numbers for EMEA | Search-tool summary of Capterra | **Unverified**. Capterra blocked. |

GCC-specific data quality has no independent test (see `02`).

### 2.5 Deliverability

| Quote | Where | Tag |
|---|---|---|
| "It has bounced soo many emails that it hurt my Email Reputation." (3 stars, Oct 24 2025) | [Smartlead, Trustpilot](https://www.trustpilot.com/review/smartlead.ai) | Verified |
| "Domain and mailbox setups are a big mess too" (1 star, Sep 13 2026) | [Smartlead, Trustpilot](https://www.trustpilot.com/review/smartlead.ai) | Verified |
| "my first campaign wasn't sending" (1 star, Sep 14 2026) | [Instantly, Trustpilot](https://www.trustpilot.com/review/instantly.ai) | Verified |

### 2.6 Setup time

| Quote | Where | Tag |
|---|---|---|
| "We have now wasted 23 days trying to get started." (1 star, Aug 15 2026) | [Smartlead, Trustpilot](https://www.trustpilot.com/review/smartlead.ai) | Verified |
| "After waiting 13 days for the inboxes to warm up" (1 star, Sep 25 2026) | [Instantly, Trustpilot](https://www.trustpilot.com/review/instantly.ai) | Verified |
| Re-linking credentials after handover is "the most time-consuming handover step". OAuth redirect URIs are the worst because clients have "never touched that before." (forum answer, Jun 23 2026) | [n8n community](https://community.n8n.io/t/300599.json) | Verified |
| Trustpilot's AI summary for GoHighLevel: onboarding "could sometimes feel frustrating, slow, or entirely disorganized." This is a summary, not a review. | [GoHighLevel, Trustpilot](https://www.trustpilot.com/review/gohighlevel.com) | Verified (summary) |

Instantly's own guide says DFY inbox provisioning is often under 24 hours, but warm-up still takes 2 to 4 weeks ([Instantly blog](https://instantly.ai/blog/done-for-you-email-accounts/)). Vendor claim. It matches the reviews: the wait is warm-up, not clicks.

### 2.7 Templates missing (blank-page problem)

I found **few direct complaints** saying "no templates". The evidence is mostly behaviour: vendors ship huge template libraries because blank canvases lose users.

| Evidence | Where | Tag |
|---|---|---|
| n8n lists **13,200** workflow templates. Categories are AI, Sales, IT Ops, Marketing, Document Ops, Other, Support. There is no lead-gen category. | [n8n workflows](https://n8n.io/workflows/) | Verified |
| A forum poster asks what a non-technical small-business buyer should see first "so that importing and setting up the workflow feels safe" | [n8n community search](https://community.n8n.io/search.json?q=non-technical%20order%3Alatest_topic) (topic 295124) | Verified (blurb only) |
| Clay's Sculptor "doesn't create complete workflows in one request" and does not support Message Drafting or the Clay Sequencer | [Clay University: Sculptor](https://university.clay.com/docs/sculptor) | Verified |
| Gamma user: "I cannot use in a corporate environment these AI-created pictures." He also cannot upload his company's PowerPoint template. | [Gamma ideas board](https://ideas.gamma.app/ideas/p/gamma-review-strong-start-but-limited-long-term-value-for-paying-users) | Verified. Post date not shown. |

### 2.8 Broken automations

| Quote | Where | Tag |
|---|---|---|
| "Whenever they introduce new feature everything breaks." (1 star, May 21 2026) | [Make, Trustpilot](https://www.trustpilot.com/review/make.com) | Verified |
| "it worked for a few months and then it stops working" (1 star, May 15 2026) | [Make, Trustpilot](https://www.trustpilot.com/review/make.com) | Verified |
| "simple zaps either don't trigger at all, or trigger endless zaps at a time" (1 star, Oct 21 2025) | [Zapier, Trustpilot](https://www.trustpilot.com/review/zapier.com) | Verified |
| "It is very hard to debug problems since it's all UI." (1 star, Sep 3 2025) | [n8n, Trustpilot](https://www.trustpilot.com/review/n8n.io) | Verified |
| For non-technical owners a one-time handoff "tends to break when APIs change, tokens expire, or settings get edited by accident". Practitioners recommend 14-30 days of warranty then a paid monthly package with "silent-failure review" and "credential checks". | [n8n community](https://community.n8n.io/t/300786.json) (Jun 24 2026) | Verified |

### 2.9 Generic AI output

| Quote or point | Where | Tag |
|---|---|---|
| "Every output looks the same" (1 star, Jun 8 2026) and "cookie cutter platform" (1 star, Jun 27 2026) | [Gamma, Trustpilot](https://www.trustpilot.com/review/gamma.app) | Verified |
| "most presentations end up looking very similar." (paying Gamma user) | [Gamma ideas board](https://ideas.gamma.app/ideas/p/gamma-review-strong-start-but-limited-long-term-value-for-paying-users) | Verified |
| "The Breeze Assistant is by far the most difficult AI to use." (3 stars, Aug 25 2026) | [HubSpot, Trustpilot](https://www.trustpilot.com/review/hubspot.com) | Verified |
| In a sales community a marketing head said video outreach feels "Desperate"; a reply: "Better content doesn't fix carpet bombing - it's still carpet bombing." | [RevGenius thread](https://community.revgenius.com/x/chat-general/n6wi307mlj0c/how-to-navigate-internal-resistance-to-using-perso) | Verified. About video, but the point applies to any asset at volume. |
| Vendor blogs claim AI emails reply at 4.1% vs 5.2% for human (100,000 paired emails) and spam rates of 7.8% vs 2.9% | Search-tool summary of [firstsales](https://firstsales.io/blog/ai-vs-human-cold-email-reply-rates/) and others | **Unverified** and vendor claims. I did not open the pages. Another source I did open says its reply-rate decline data is "aggregated platform data from individual vendors, not independent research" ([CegTec](https://www.cegtec.net/en/knowledge/cold-email-reply-rate-sinkflug/)). |

### 2.10 Extra theme: billing traps and weak support

Not on your list, but it repeats in almost every tool and hits non-technical users hardest. They pay, cannot fix the problem alone, then cannot reach a human.

- "I missed cancelling components of my contract by a week, and it auto-renewed" ([HubSpot, Trustpilot](https://www.trustpilot.com/review/hubspot.com), Sep 15 2026). Verified.
- "Billing issues are so difficult to resolve" ([Apollo, Trustpilot](https://www.trustpilot.com/review/apollo.io), Oct 11 2026). Verified.
- "Support claim it's their policy they don't refund" ([Instantly, Trustpilot](https://www.trustpilot.com/review/instantly.ai), Sep 16 2026). Verified.
- "their best answer was 'ask your LLM for help debugging'" ([Clay, Trustpilot](https://www.trustpilot.com/review/clay.com), Mar 5 2026). Verified.
- "They hide behind AI bots" ([HubSpot, Trustpilot](https://www.trustpilot.com/review/hubspot.com), Aug 18 2026). Verified.

Design lesson: pair every automated flow with a visible human path (chat with a person, cancel button, refund rule).

---

## 3. What "out of the box" looks like in 2026 (task 2)

### 3.1 Product-by-product

| Product | Out-of-the-box mechanism | What the evidence says | Tag |
|---|---|---|---|
| **Clay** | Sculptor: open a text box on the homepage or "Chat with Sculptor" inside a table. Describe the table, review the proposed workflow, click Continue, table is created. Changes to an existing table go to **Sandbox mode** first. "Credits Estimation" tracks spend. Limits: sources are Find Companies, Find People, Find Jobs, Google Maps, CSV, Web Search; no CRM integration; no export; no complete workflow in one request. Template Library is Clay-made only. | Clay's own docs. A Clay 5-star Trustpilot review praises a "live chat where a real, friendly human dives into your workflows". | Verified ([docs](https://university.clay.com/docs/sculptor), [Trustpilot](https://www.trustpilot.com/review/clay.com)). The claim that users cannot add their own templates to the Template Library is from a search summary: **Unverified**. |
| **Apollo** | AI Assistant (announced Mar 4 2026): plain-language goals become workflows across prospecting, enrichment, outreach, reporting. Uses saved company and product context. "Designed for human oversight." Free intro offer on Basic, Pro, Org (up to 5 chats on free plans). Workflows can be built with the assistant, a template, or from scratch. | Vendor says "nearly 20,000 weekly active users", beta users saw "2.3x more meetings", and a JumpCloud rep "saves me about an hour per prospecting session". | Verified as vendor claims ([press release](https://www.apollo.io/newsroom/announcements/apollo-launches-ai-assistant-powering-end-to-end-agentic-workflows-in-the-first-ai-native-all-in-one-gtm-platform)). Workflow-creation options and "18+ templates" (2024): **Unverified** (help centre returned 403, snippet only). Builder Studio (Sep 30 2026): **Unverified**. |
| **lemlist** | lemAgent: chat in four steps (goal, targets, brief, review and launch). "Nothing launches without your approval." Saved ICPs and team memories are shared. | Vendor claim: "most campaigns are ready in under 15 minutes" (5-10 minutes of conversation). The page does not link lemAgent to its Playbooks or templates. This session's connector list also shows lemlist tools for domain purchase, DNS and mailbox provisioning. | Verified as vendor claim ([lemAgent page](https://lemlist.com/product/lemagent)). Tool names: Verified (session tool list). Behaviour of those tools: not tested. |
| **HubSpot Breeze** | Prospecting Agent monitors signals and drafts outreach with review. About $1 per recommended lead (see `02`). | Guides say the bottleneck is clean CRM data and a clear ICP, not the agent. Users complain the assistant is "the most difficult AI to use". | Tier and cost details conflict across blogs: **Unverified**. Trustpilot quote: Verified. |
| **GoHighLevel** | Snapshots copy funnels, automations, pipelines, calendars, templates to a client sub-account. SaaS Mode auto-creates the sub-account, applies the snapshot and emails login after the client pays. Marketplace has 1,000+ listings (affiliate site claim). | Not transferred: contacts, integrations (Stripe, Twilio, AI tools), custom domains, phone numbers, email sending records, users. Per-client manual steps: connect domain, A2P registration, fill Custom Values, re-authenticate integrations. "Link & Load defaults to Overwrite." Trustpilot reviews praise named support staff walking people through the platform. | Snapshot facts: Verified ([GHL Experts guide](https://ghlexperts.com/guides/how-to-create-and-deploy-gohighlevel-snapshot), third-party guide). Marketplace count: **Unverified**. Trustpilot praise: Verified, but score likely invited. |
| **Instantly** | Done-for-you pre-warmed Google inboxes: SPF, DKIM, DMARC set, warm-up done. $15 per domain per year and $10 per account per month. Orders in batches of 5. **Instantly keeps domain ownership**; accounts only work inside Instantly. | The help page lists the lock-in plainly. Reviews still say "my first campaign wasn't sending". | Verified ([help page](https://help.instantly.ai/en/articles/9969215)). |
| **n8n** | 13,200 templates; MCP so an AI app can "build and update n8n workflows". | Non-technical owners still stall at basics (webhooks, credentials). | Verified ([n8n](https://n8n.io/workflows/), [forum](https://community.n8n.io/t/299629.json)). |

### 3.2 What users praise (and the limits of this evidence)

I found **no independent time-to-first-value measurement** for any product. What I can say:

1. **Chat to draft to approve.** All three AI assistants (Clay, Apollo, lemlist) use the same shape, and all keep a human approval step. **Inference** that this pattern is now table stakes.
2. **Safe preview.** Clay's Sandbox mode and credit estimate answer the "I burned 2,000 credits learning" complaint. **Inference**.
3. **Saved business context reused everywhere.** Apollo ("saved company and product context") and lemlist ("saved ICPs") both do this. Vendor docs only.
4. **Pre-built infrastructure.** Instantly's DFY inboxes remove DNS and domain work. The price is lock-in. Verified.
5. **A human who helps.** The warmest Trustpilot praise for Clay and GoHighLevel is about people, not features. Verified quotes in section 2.10 and 3.1.
6. **Templates that fully set up.** GoHighLevel snapshots show the limit: a template that leaves 4 manual steps per client (domain, A2P, values, re-auth) still hurts. Verified.

Your product should aim past all of these: one chat, one approval, and **no per-client re-linking**.

---

## 4. Lead magnets and design assets (task 3)

### 4.1 Evidence that assets improve replies or meetings

I separated the evidence by type. **No row below is an independent B2B outbound study of design assets.**

**A. Peer-reviewed or academic work. Not B2B sales outreach, and mostly about surveys and marketing email.**

| Study | Result | Tag |
|---|---|---|
| Chounta and Nolte, CHI 2022, "The CAT Effect": personalised greeting and a picture of the surveyor's cat added to survey invitations | "CATs have a positive impact on response rates"; no sample size in the abstract | Verified ([arXiv abstract](https://arxiv.org/abs/2203.04211)). Survey invitations, not sales. |
| Edwards et al., Cochrane review: personalisation odds ratio 1.24 (12 trials, 48,910 people); a picture in the invitation 3.05 | Questionnaire response, not sales | **Unverified**. Seen only through [OutreachBloom](https://outreachbloom.com/cold-email-personalization); Cochrane page returned 403. |
| Trespalacios and Perkins 2016 (1,598 recipients): extra merge fields beyond first name had no effect | | **Unverified** (secondary, same page) |
| Sahni, Wheeler and Chintagunta 2018 (Marketing Science): adding the recipient's name raised leads from 0.39% to 0.51% | Marketing email | **Unverified** (secondary); INFORMS page returned 403 |
| A 2025 wine-retailer field test (27,500 allocated) found AI and human emails could not be told apart | | **Unverified** (secondary) |

The page that collects these (OutreachBloom) is itself an outbound agency's marketing post. It says only 4 of 9 studies link to a primary source. Read the primary papers before citing any of them.

**B. The one side-by-side outbound test I could read.**

- HeyReach "GenPage" playbook, two LinkedIn campaigns, 863 leads contacted in total. One arm sent each prospect a personalised landing page. The other used standard pages. The **standard arm got more total and positive replies**. 9 meetings came from 69 conversations, 6 in the personalised arm, so 3 in the other (the control figure is inferred). The page calls this "twice as many meetings". The two campaigns also had different message copy, and the page's summary numbers do not fully match its breakdown.
- Tag: Verified ([HeyReach playbook](https://www.heyreach.io/outbound-playbooks/genpage-campaign)). **Vendor page, tiny sample, confounded.** 6 vs 3 meetings proves nothing statistically.

**C. Vendor claims (all Unverified as effects).**

| Claim | Source | Notes |
|---|---|---|
| AI-personalised video gets "2x to 4x" the replies of text; "up to 5x" for reps using video | [Sendspark](https://blog.sendspark.com/cold-email-vs-video-email-replies) | No source, sample or method for headline numbers. A 2018 HubSpot rep's 197 videos got a 28% response, one rep, no control. |
| Personalised images lift replies "46%" | lemlist, as quoted by [AIToolsBakery](https://aitoolsbakery.com/blog/lemlist-review/) | That page calls it the vendor's own number, gives no test details. A search summary of the same page claimed a 2.8% to 4.1% independent test. **The page itself does not contain it. Do not use that figure.** |
| A lemlist agency page claims 17% reply on visually personalised sequences vs 3-5% flat text | Search-tool summary | **Unverified**, source not found. |
| Personalised landing pages gave "3x more conversions" (Leadcat), "30% meeting rate" pre-event (a GenPage customer) | Via GenPage marketing, search summary | Vendor testimonials. |

**D. Practitioner voice.**
- RevGenius thread on personalised video: "Video in cold outreach works..." (Mike C.), but also "I received a video message once and was very underwhelmed" in the thread (Ruben Q.), and "intent > scale" (Kamal K.). Verified ([thread](https://community.revgenius.com/x/chat-general/n6wi307mlj0c/how-to-navigate-internal-resistance-to-using-perso)). Mixed, no data.
- A LinkedIn sales leader says personalised video once got "like 15% reply rate" and he has since moved away. Seen only in a search snippet. **Unverified**.

**Reading the evidence.**
- Personalisation helps a little in academic email tests. More merge fields do not keep helping.
- Nobody has shown that one-pagers, audits or carousels beat plain text in cold B2B outreach.
- Time cost is real. A HeyGen vendor post says recording individual videos burned "15 hours per rep" (vendor claim, **Unverified**).
- So position assets as **proof, follow-up and credibility**, and ship a holdout test (asset vs no asset) so each user learns for themselves. This also matches `01`, which already recommends built-in A/B.

### 4.2 Tools people use, and the gaps

| Tool | Use in outbound | Gaps found | Tag |
|---|---|---|---|
| **Canva** | One-pagers, carousels, PDFs. Autofill API generates designs from a brand template and data. | Autofill needs Canva Pro, Teams or Enterprise on the acting user; "Usage limits will be introduced in the future." Canva supports `ar`, `ar-EG`, `ar-SA`, `ar-AE` locales for apps. Editor-level RTL quality: not found. Trustpilot is 4.0 from 7,732 reviews; complaints are renewal and refunds, not Arabic. | Autofill: Verified ([Canva docs](https://www.canva.dev/docs/connect/api-reference/autofills/)). Locales: snippet only. Trustpilot: Verified ([page](https://www.trustpilot.com/review/canva.com)). |
| **Gamma** | Quick decks and one-pagers | Trustpilot 1.6 from 125 reviews, 74% one-star. "Every output looks the same." "I asked them to only change one slide, and they changed all???" "trying to get anything A4 is impossible." Cannot upload corporate templates (staff plan to add). | Verified ([Trustpilot](https://www.trustpilot.com/review/gamma.app), [ideas board](https://ideas.gamma.app/ideas/p/gamma-review-strong-start-but-limited-long-term-value-for-paying-users)) |
| **Tofu** | B2B marketing content per account and persona using brand guidelines | G2 4.5 from 15 reviews; no public pricing found. Enterprise ABM focus. | **Unverified** (search snippets) |
| **Loom, Sendspark, Vidyard** | Recorded or AI video | Recording per prospect is slow; CRM sync gated by plan (Vidyard Teams or Enterprise); video can trigger spam filters. | **Unverified** (vendor comparison blogs) |
| **lemlist images** | Personalised image in email | One practitioner says first-name-in-image is no better than text personalisation; images can hurt deliverability on weak domains. | **Unverified** (search summary) |

Related connectors in this environment (Verified, tool list): Canva, Moda, Tofu Ads (LinkedIn single-image and carousel ads and Google Display only; "never create, stage, launch or modify campaigns"), Foliyo (publishes HTML pages with PIN access and personal recipient links). A Gamma connector is listed but needs sign-in. This shows design-by-API is feasible today, but none is an outbound-asset engine.

**Gaps to fill (inference from the above):**
1. One brand kit applied to every asset, taken from the user's website.
2. Per-prospect data merged into fixed layouts (not free-form AI images).
3. Real A4 and Letter PDF export, editable after generation, change one slide without changing all.
4. Arabic and English from the same template with real RTL layout.
5. Asset tied to the prospect record and to reply tracking, so impact is measurable.

Arabic RTL risk: community threads report broken Arabic PDF export in Adobe Express and an AI image/document tool that writes Arabic text correctly but lays out the page left-to-right ([OpenAI forum](https://community.openai.com/t/systematic-rtl-layout-issue-in-arabic-image-document-generation/1379790), [Adobe community](https://community.adobe.com/t5/adobe-express-bugs/arabic-is-not-supported-when-export-as-pdf/m-p/14643315)). **Unverified** (snippets). Test every template in Arabic before shipping.

---

## 5. Agency workflow (task 4)

### 5.1 How small agencies run several clients (documented)

| Mechanic | Evidence | Tag |
|---|---|---|
| **Instantly workspaces and white-label portal.** Separate workspace per client. Portal needs Hyper Growth or Light Speed. Agency adds a CNAME, uploads a logo, adds client emails, and **copies and sends the invite link manually** (Instantly sends none). **One portal per workspace.** **Clients with Campaigns access see all campaigns in the workspace.** Clients need no subscription. | [Instantly help](https://help.instantly.ai/en/articles/8678006-agency-white-labeling) | Verified |
| **Smartlead white-label** at $29 per client workspace | `02` (Smartlead pricing page) | Verified in `02` |
| **GoHighLevel snapshots and SaaS Mode** (Agency Pro $497 per `02`) | Section 3.1 | Verified |
| **Automation agencies (n8n)** hand over per-client credentials, run support retainers, and report with screenshots | n8n forum threads below | Verified |

### 5.2 Pain points (with evidence)

1. **Credential handover.** "Credentials don't export with the workflow, so the client must recreate and re-link them." Non-technical clients "can't realistically generate and enter their own credentials, so the agency usually ends up handling it." ([n8n 300599](https://community.n8n.io/t/300599.json), Jun 23 2026; [n8n search blurbs](https://community.n8n.io/search.json?q=non-technical%20order%3Alatest_topic)). Verified.
2. **Showing clients what ran.** "Right now my answer is screenshots of execution logs pasted into an email." (Jul 15 2026) ([n8n 303361](https://community.n8n.io/t/303361.json)). One suggestion: a weekly client note with "12 leads reached the CRM, 1 was rejected, and 1 expected delivery is still unresolved." Verified.
3. **Support after delivery.** Practitioners say 14-30 days of warranty then a monthly package. One claims capacity of "8-10 clients if workflows run independently, or 3-4 if they need ongoing support." Verified as said ([n8n 300599](https://community.n8n.io/t/300599.json), [300786](https://community.n8n.io/t/300786.json)). One person's number.
4. **Manual reporting.** An HN commenter says an email/CRM agency friend "spent hours each campaign building reports" until they were automated ([HN 40327392](https://hn.algolia.com/api/v1/items/40327392) via Algolia search). Verified (one anecdote).
5. **Per-client setup that cannot be copied.** GoHighLevel snapshots miss domains, A2P registration, integrations and sending records, so each client needs four manual steps. Verified.
6. **Client isolation limits.** Instantly cannot restrict a client to one campaign, so agencies use separate workspaces. Verified.
7. **Vendor-blog claims** (Unverified, sellers of agency tools): switching between many logins wastes hours; per-seat and per-mailbox costs grow with each client; a bad list from one client can hurt others on shared infrastructure ([Mailpro](https://www.mailpro.com/blog/email-marketing-for-agencies-managing-multiple-client-accounts), [Instantly](https://instantly.ai/blog/best-cold-email-software-for-agencies-2026/) and others from search).

### 5.3 Gaps

I found **no survey of small outbound agencies** about onboarding, reporting or churn. Closest: a SparkToro and Paddy Moogan survey of 612 agency owners (66% name existing or past clients as the top referral source), seen only as a secondary summary — **Unverified**, and not about outbound. Interview 5-10 lead-gen agencies before building the agency tier.

---

## 6. MENA-specific voice (task 5)

### 6.1 Arabic and RTL gaps in tools

| Evidence | Tag |
|---|---|
| GoHighLevel "Arabic language support" request: opened Jan 29 2023, status **Under review**, **308 votes**. A staff post (Feb 27 2026) says HighLevel is "researching" RTL via customer conversations and a short form. Commenters: "We need it too much to serve our clients inside our country" (Feb 27 2026); "We hope that Arabic will be added, given that the Arab market is eager for these tools." (May 3 2026). Latest comment Oct 4 2026. A third party claims to translate the sub-account UI into Arabic with RTL (the commenter's own claim). | Verified ([GHL ideas](https://ideas.gohighlevel.com/language-internationalization/p/arabic-language-support)) |
| GoHighLevel general RTL request: first posted Sep 23 2020, 98 votes. "We are 23 countries waiting for this update!" (Nov 24 2021). "We need this ASAP" (Oct 22 2024). Warren Marland (Feb 12 2026) says lack of RTL limits business expansion. | Verified ([GHL ideas](https://ideas.gohighlevel.com/saas/p/support-for-rtl-right-to-left-text-direction)) |
| HubSpot: staff said RTL rich text is live in Marketing Hub, CMS Hub and Knowledge Base, but CRM and Sales Hub email use a separate third-party text editor. A user said their Dubai office cannot use HubSpot without RTL. Staff post is undated. | **Unverified**. Page returned 403; snippet only ([HubSpot Ideas](https://community.hubspot.com/t5/HubSpot-Ideas/RTL-right-to-left-amp-amp-rich-text-functionality/idc-p/243752)). |
| Gulf Arabic output audits are sold on Upwork because "most Arabic AI outputs fail Gulf users — not because the grammar is wrong, but because the dialect, tone, and cultural register are wrong." | **Unverified** (freelancer listing, seller's claim, snippet) |
| An agency (upGrowth) says Egyptian Arabic used to sell to Saudi buyers "signals 'we don't actually understand you.'" and that aggressive urgency reads as low-status in the Gulf | **Unverified** (agency marketing, snippet) |
| Saudi-dialect rubric benchmark: no frontier model above 55% | Verified in `02` ([arXiv 2608.29990](https://arxiv.org/abs/2608.29990)) |

### 6.2 WhatsApp-first selling

- Rework (a sales-software vendor) says WhatsApp works in "WhatsApp-primary markets, such as Brazil, Indonesia, and parts of MENA", mainly when **buyers start the conversation**, for SMB deals under about $25K with cycles under 60 days. It says cold seller-initiated WhatsApp to people who did not opt in does not work. Its thresholds are "the author's judgment". Verified as vendor view ([Rework](https://resources.rework.com/insights/conversational-growth/whatsapp-in-b2b-sales-motion)).
- "73% of UAE B2B buyers prefer WhatsApp for vendor follow-up" is attributed to a "2024 McKinsey B2B Pulse" by a vendor blog. **Unverified.** I could not find it at McKinsey. Do not use it.
- Several Gulf agency blogs say cold email without opt-in is non-compliant under PDPL and that WhatsApp is for conversation while email is for consideration. **Unverified** (vendor blogs; legal point also open in `01`).
- Local vendors sell WhatsApp CRMs with Arabic and EGP/SAR billing (for example Go4whatsup, which also claims PDPL and ZATCA compliance). **Unverified** (vendor page, snippet).
- Arabic-language freelancer marketplaces (Khamsat) sell scraped Saudi email and WhatsApp lists, and one buyer complained the emails were undeliverable and old. **Unverified** (search summary). It shows demand for lists, and the legal risk in `01`.

### 6.3 What I could not find

No first-hand posts from Egyptian, Saudi or Emirati non-technical sellers about Clay, Apollo, HubSpot or GoHighLevel. Facebook groups, X and Arabic LinkedIn were not reachable. A search for Egyptian founders on LinkedIn returned only a vendor (StartupKit Pro) saying startup tools are "mostly English-only". **MENA user voice is a gap. Fill it with 10 interviews, plus a manual read of Arabic Facebook groups by a native speaker, before putting MENA claims on a slide.**

---

## 7. Outputs

### (a) Top 10 jobs-to-be-done, ranked by evidence strength

Strength: **High** = many independent quotes across tools. **Medium** = several quotes or one strong source. **Low** = vendor claims or inference only.

| # | Job | Evidence | Strength |
|---|---|---|---|
| 1 | Get my first outbound campaign live without learning a tool | Learning-curve quotes for Clay, Make, n8n, HubSpot; "23 days trying to get started"; HN founder finds Apollo "too powerful" (sections 2.1, 2.6) | **High** |
| 2 | Know what it will cost before I click, and never lose paid credits | Clay, Apollo, Zapier, Instantly, Gamma reviews; Clay "eating credits"; Sandbox and estimate as vendor answers (2.2, 3.1) | **High** |
| 3 | Keep automations working and be told, in plain words, when something breaks | Make, Zapier, n8n quotes; "silent-failure review" in agency threads (2.8, 5.2) | **High** (for generic automation); **Medium** for outbound specifically |
| 4 | Set up email domains and inboxes correctly and safely | Smartlead, Instantly reviews; Instantly's own DFY guide; warm-up takes 2-4 weeks (2.5, 2.6) | **Medium-High** |
| 5 | Get a clean list that fits my market, with honest gaps | Apollo and Clay data quotes; HN waterfall point; GCC coverage claims are vendor-only (2.4) | **Medium** |
| 6 | Hand work to a client and show them what happened | n8n forum Jun-Jul 2026 threads; Instantly portal limits; GHL snapshot manual steps (5) | **Medium** |
| 7 | Write messages and assets that sound human, on-brand and local | Gamma "Every output looks the same"; RevGenius "carpet bombing"; Saudi benchmark; AI-vs-human data is vendor-only (2.9, 6.1) | **Medium** |
| 8 | Work in Arabic: UI, RTL layout, assets | GHL 308 votes and 98 votes; HubSpot RTL editor (snippet); no outbound-specific complaint data (6.1) | **Medium** for demand; **Low** for impact |
| 9 | Reach people on WhatsApp in a compliant way | Vendor blogs only; one "buyer-initiated" caveat; McKinsey figure unconfirmed (6.2) | **Low** |
| 10 | Produce proof assets fast (one-pager, case study, carousel, audit) | Tool-gap evidence (Gamma, Canva, Autofill limits); **no independent proof they raise replies** (4.1) | **Low** for impact; **Medium** as a pain (tool switching and re-doing layouts) |

Note for the product owner: your stated priority (#10) has the weakest impact evidence in the list. That does not make it wrong. It means: ship it, but measure it, and lead with #1-#4 in the pitch.

### (b) Plays to ship out of the box

Rules for all plays (from the evidence): human approval before anything is sent; show cost before spend; Arabic and English from the same play; plain-language run log; reply rate measured per delivered email, not opens (see `01`); holdout option on every asset play.

| # | Play | Trigger | Steps | Assets produced | Replaces |
|---|---|---|---|---|---|
| 1 | **First campaign in one chat** | New workspace | Paste website URL. AI drafts company context, ICP, offer. User picks channel. Pull 50 leads with the user's own keys. Draft 3-step sequence (en/ar). Run pre-flight (play 2). Approve. | ICP card, offer one-pager, sequence | Clay Sculptor, lemAgent, Apollo Assistant |
| 2 | **Inbox and domain pre-flight** | User connects a domain or mailbox | Check SPF, DKIM, DMARC. Suggest mailbox count. Set daily caps. Show a warm-up calendar. Block launch until checks pass. Integrate with existing senders; do not rebuild warm-up (per `02`). | Health report, launch checklist | MXToolbox, DFY vendors, manual checklists |
| 3 | **Funding or hiring signal outreach** | New funding round or job post for a target account | Detect signal. Find the contact. Draft a "saw your news" message with one idea. Queue for approval. | Signal brief, 1-page "idea for you" PDF | Clay signals, Unify, news alerts |
| 4 | **Mini-audit outreach** | List with websites or Google Maps links (strong for Egypt/KSA SMEs) | Fetch the site. Score 5 simple checks. Generate a 1-page audit. Send a short message with the page link. | Audit one-pager (en/ar), personalised page link | Manual audits, Loom, Canva |
| 5 | **Lead magnet in a day** | User picks an offer | Draft a checklist or short report from the user's expertise. Make a gated page. Auto-send the file. Add 3 follow-up messages. | PDF, landing page, 3 LinkedIn posts | Gamma, Canva, a page builder, a mail tool |
| 6 | **Case study builder** | Deal won or happy-client message | Short interview form or pasted chat. Draft story with numbers the user confirms. Build layouts. | Case study one-pager, carousel, social post | Docs plus Canva |
| 7 | **Weekly LinkedIn carousel** | Weekly schedule | Pick a topic from the user's offers. Draft 8 slides. Render in brand. Queue for posting. | Carousel PDF, caption | Canva, ChatGPT, a scheduler |
| 8 | **Opt-in WhatsApp follow-up** | New contact from a meeting, event or inbound form | Log consent. Send an approved template message. Remind on no reply. Hand off to human on reply. | WhatsApp card, consent log | Spreadsheet plus WhatsApp inbox tools |
| 9 | **Reply handler** | Any inbound reply | Classify (interested, not now, wrong person, unsubscribe). Draft a reply and slot suggestions. Update the contact. | Draft reply, updated record | Inbox plus manual triage |
| 10 | **Meeting-booked proposal** | Meeting scheduled | Research brief on the company. Build a 1-page proposal. Draft the confirmation email. | Brief, proposal one-pager | Docs, Gamma |
| 11 | **Revive cold leads** | 60-90 days with no reply | Pick a new angle. Make a short new asset. Send once. Then stop. | Angle note, short one-pager | Manual follow-up lists |
| 12 | **Agency client onboarding kit** | New client added | Intake form (offer, ICP, proof, calendar). Pull brand colours and logo from their site. Create a client workspace from a template. Connect mailbox with one guided OAuth flow. | Brand kit, ICP doc, week-one plan, client workspace | GHL snapshot, Notion, forms |
| 13 | **Weekly client report** | Weekly | Pull sends, replies, meetings (not opens). Write a plain-language note with exceptions. Share a branded link or PDF. | Report PDF and link | Sheets, Looker, screenshots |
| 14 | **Missing-data fallback (GCC)** | A lead has no email or phone | Try the user's sources in order and stop at the first hit. Show a coverage score. If still empty, create a manual task (LinkedIn or WhatsApp). | Coverage report, task | Waterfall tables, spreadsheets |

I left out an "AI SDR runs everything" play on purpose. The verified evidence in `01` (11x and others) argues against full autonomy.

### (c) Design-asset templates to ship first

Order is by how many plays use them. Each is a fixed layout filled by data, not a free-form AI image. Evidence for this choice: Gamma users complain that outputs look the same and that edits change everything (section 2.9).

1. **Offer one-pager (A4 PDF, en/ar).** Used by plays 1, 3, 10, 11.
2. **Mini-audit report (1 page + optional 3-page).** Score, 3 findings, 1 recommendation. Plays 4, 11.
3. **Case study (1 page + carousel version).** Plays 6, 7.
4. **Checklist lead magnet (2-4 pages) with a matching gated page.** Play 5.
5. **LinkedIn carousel (1080x1350, 8-10 slides, 3 layouts).** Play 7.
6. **Per-prospect landing page with a personal link.** Plays 3, 4. Add view tracking. Foliyo-style recipient links show this is buildable.
7. **Short proposal (3-5 pages).** Play 10.
8. **WhatsApp card (1080x1080 and 9:16).** Play 8.
9. **Weekly client report cover and summary.** Play 13.
10. **Email header image or screenshot with name and logo.** Lowest priority: the only evidence is vendor claims and a deliverability warning.

Template rules:
- One brand kit from the user's URL, applied automatically.
- Arabic and English are two real layouts (RTL), not a mirrored copy. Test Arabic PDF export on every template before it ships.
- Export A4, Letter, PNG and PDF. Let the user edit one element without regenerating everything.
- Each asset is stored on the prospect record. Each asset play has an "asset vs no asset" holdout.

---

## 8. Open items and next steps

1. **Reddit, G2, Capterra, Facebook, X and YouTube comments were not read.** A person with browser access should read r/coldemail, r/clay, r/GoHighLevel, r/n8n and G2 "cons" and add 2-3 quotes per theme.
2. **Run 10 interviews** (5 Cairo, 5 Riyadh or Dubai) with non-technical founders and small agency owners. Test jobs 1-4 and 10 first.
3. **Check four Unverified items before they go on a slide:** Apollo workflow and template facts, HubSpot's RTL staff statement, the McKinsey 73% WhatsApp figure, and the Cochrane and Sahni numbers.
4. **Do not cite** the "2.8% to 4.1% lemlist image test" (not on the page I opened), the "73% McKinsey" figure, or the Indie Hackers quotes (page blocked).
5. **Open question for the product owner:** if impact evidence for assets stays absent, is the pitch "assets that prove your offer and speed up follow-up", with measured lift shown inside the product?

---

## 9. Sources (pages I read, grouped)

User voice and reviews
- Clay Trustpilot: https://www.trustpilot.com/review/clay.com
- Apollo Trustpilot: https://www.trustpilot.com/review/apollo.io
- HubSpot Trustpilot: https://www.trustpilot.com/review/hubspot.com
- GoHighLevel Trustpilot: https://www.trustpilot.com/review/gohighlevel.com
- Instantly Trustpilot: https://www.trustpilot.com/review/instantly.ai
- lemlist Trustpilot: https://www.trustpilot.com/review/lemlist.com
- Smartlead Trustpilot: https://www.trustpilot.com/review/smartlead.ai
- Make Trustpilot: https://www.trustpilot.com/review/make.com
- n8n Trustpilot: https://www.trustpilot.com/review/n8n.io
- Zapier Trustpilot: https://www.trustpilot.com/review/zapier.com
- Gamma Trustpilot: https://www.trustpilot.com/review/gamma.app
- Canva Trustpilot: https://www.trustpilot.com/review/canva.com
- Amplemarket (competitor) quoting G2: https://www.amplemarket.com/blog/how-much-does-clay-really-cost
- Ask HN, Alternatives to Clay: https://hn.algolia.com/api/v1/items/45791605
- n8n forum threads: https://community.n8n.io/t/303361.json , https://community.n8n.io/t/300599.json , https://community.n8n.io/t/300786.json , https://community.n8n.io/t/299629.json , search: https://community.n8n.io/search.json?q=non-technical%20order%3Alatest_topic
- LinkedIn, Jacob Tuwiner: https://www.linkedin.com/posts/jacob-tuwiner_ive-been-thinking-a-lot-lately-about-how-activity-7444743683482075136-R_MV
- RevGenius thread: https://community.revgenius.com/x/chat-general/n6wi307mlj0c/how-to-navigate-internal-resistance-to-using-perso
- Gamma ideas board: https://ideas.gamma.app/ideas/p/gamma-review-strong-start-but-limited-long-term-value-for-paying-users

Out-of-the-box products (vendor)
- Clay Sculptor docs: https://university.clay.com/docs/sculptor
- Apollo AI Assistant release: https://www.apollo.io/newsroom/announcements/apollo-launches-ai-assistant-powering-end-to-end-agentic-workflows-in-the-first-ai-native-all-in-one-gtm-platform
- lemAgent: https://lemlist.com/product/lemagent
- GoHighLevel snapshots guide (third party): https://ghlexperts.com/guides/how-to-create-and-deploy-gohighlevel-snapshot
- Instantly DFY help: https://help.instantly.ai/en/articles/9969215
- Instantly DFY blog: https://instantly.ai/blog/done-for-you-email-accounts/
- Instantly white-label help: https://help.instantly.ai/en/articles/8678006-agency-white-labeling
- n8n templates: https://n8n.io/workflows/
- Canva Autofill API: https://www.canva.dev/docs/connect/api-reference/autofills/

Assets and studies
- HeyReach GenPage test (vendor): https://www.heyreach.io/outbound-playbooks/genpage-campaign
- Sendspark video blog (vendor): https://blog.sendspark.com/cold-email-vs-video-email-replies
- AIToolsBakery lemlist review: https://aitoolsbakery.com/blog/lemlist-review/
- OutreachBloom study roundup (agency): https://outreachbloom.com/cold-email-personalization
- Chounta and Nolte, arXiv: https://arxiv.org/abs/2203.04211
- CegTec reply-rate article: https://www.cegtec.net/en/knowledge/cold-email-reply-rate-sinkflug/

MENA
- GoHighLevel Arabic request: https://ideas.gohighlevel.com/language-internationalization/p/arabic-language-support
- GoHighLevel RTL request: https://ideas.gohighlevel.com/saas/p/support-for-rtl-right-to-left-text-direction
- Rework WhatsApp in B2B (vendor): https://resources.rework.com/insights/conversational-growth/whatsapp-in-b2b-sales-motion

Search snippets only (Unverified, page not opened or blocked)
- HubSpot RTL thread: https://community.hubspot.com/t5/HubSpot-Ideas/RTL-right-to-left-amp-amp-rich-text-functionality/idc-p/243752
- Indie Hackers threads: https://www.indiehackers.com/post/the-cold-email-problem-nobody-talks-about-cfe9e6df69 , https://www.indiehackers.com/post/cold-email-hacking-my-journey-in-cold-outreach-and-what-i-learned-d8085b12cb
- OpenAI forum Arabic RTL: https://community.openai.com/t/systematic-rtl-layout-issue-in-arabic-image-document-generation/1379790
- Adobe Express Arabic PDF: https://community.adobe.com/t5/adobe-express-bugs/arabic-is-not-supported-when-export-as-pdf/m-p/14643315
- Agency tool blogs: https://www.mailpro.com/blog/email-marketing-for-agencies-managing-multiple-client-accounts , https://instantly.ai/blog/best-cold-email-software-for-agencies-2026/
- firstsales AI vs human: https://firstsales.io/blog/ai-vs-human-cold-email-reply-rates/
