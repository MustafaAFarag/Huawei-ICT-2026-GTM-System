# 07 - Pricing and Freemium (Revenue Workspace)

Research date: 2026-10-13. Web research only. No account was created, no credit was spent, nothing was bought.

**Legend.**
- **Verified (V)** = I read it on the vendor's own page. URL in the Sources list. All pages were read on 2026-10-13 (or late 2026-10-12 UTC). Some pages were read through a fetch tool that summarises the page, and a few were read in a browser. Either way I list the vendor page as the source.
- **Unverified (U)** = third-party blog, search snippet, vendor page I could not render, or my own estimate or inference.
- Prices are USD per month unless stated. They exclude tax. They change often. Re-check before any pricing slide.
- Pricing already covered in `02-competitors-and-positioning.md` and `03-connectors-and-apis.md` is not repeated in full. I only add what is new (free-tier limits, credit rules, caps). Where I re-read a page and it changed my earlier view, I say so.

---

## 0. Summary (read first)

1. **Supabase model, in one line.** Free = hard limits, no overage, no card, auto-pause after 1 week idle. Pro = $25 base + usage, spend cap on by default. Team = $599. Enterprise = custom. **V.**
2. **Why Supabase pauses free projects.** Each project is its own Postgres instance with its own compute cost **V**. Our product will likely be multi-tenant, so a hard pause is not needed. Archive after long inactivity instead (proposal).
3. **Free tiers in this market limit credits and records, not time.** Apollo Free = 900 credits per seat per year. Clay Free = 100 data credits per month. Attio Free = 3 seats, 50,000 records. HubSpot Free = 2 users, 1,000 contacts. **V.**
4. **Hybrid wins.** Nearly every tool above uses seat price plus a pooled credit meter for AI and data. Top-ups cost a premium (Clay +30%, HubSpot $0.01 per credit **U**). Bring-your-own-key (BYOK) is the standard escape valve (Clay: BYOK costs one Action, zero Data Credits **V**).
5. **Conversion data is thin.** The best public number is a March 2026 survey of 200 B2B products: median free-to-paid 8%, and "very few products actually" reach it. **V** that the report says this; self-reported, co-produced by a vendor. No vendor in my list publishes its own free-to-paid rate.
6. **Agency model.** GoHighLevel ($497 SaaS Mode, rebilling with markup) and Smartlead ($29 per white-label client workspace) are the references. **V.** Free view-only seats for clients (Vercel Viewer seats are unlimited on Pro) are a cheap trust feature. **V.**
7. **Spend caps differ a lot.** Supabase: on by default, Pro only, blocks usage, no per-item budget. Vercel: default $200 budget, optional auto-pause. HubSpot: account cap, per-feature caps, alerts at 75/85/90%. Neon: no hard cap on paid plans. **V.** We should ship all three layers (section 4).
8. **Payments.** Stripe's own country list (51 countries) includes the UAE but **not Egypt or Saudi Arabia**. **V.** Paddle's country table lists Egypt, Saudi Arabia and the UAE as supported sales countries, but I could not confirm that an Egypt- or KSA-based company can be a Paddle seller. **U.**
9. **Local-currency pricing exists.** Canva's pricing page showed EGP prices (Pro EGP 1,920 per year, Business EGP 3,400 per person per year). **V.** I could not find any local SaaS vendor publishing SAR or EGP price lists I could read (searches listed in section 8).
10. **Proposal (section 6).** Free $0, Solo $19-24, Team $32-39 per seat, Agency $149-249 plus per-client workspaces, Enterprise from about $1,000. Every limit is tied to a cost driver. **Proposal only, not market-tested.**

---

## 1. Reference vendors and their models

### 1.1 Developer freemium (the "Supabase model")

| Vendor | Free | Paid | How cost is controlled | Tag |
|---|---|---|---|---|
| **Supabase** | $0. 2 active projects (across all orgs you own or admin). 500 MB DB, 1 GB files, 5 GB egress, 50,000 MAU, 500,000 edge function calls, 200 realtime connections. Community support only. Log retention 1 day. **Free projects pause after 1 week of inactivity**; paused projects do not count toward the 2-project limit and can be restored. No compute credit. | **Pro from $25**: 100,000 MAU, 8 GB DB per project, 100 GB files, 250 GB egress, then usage rates (e.g. egress $0.09/GB, MAU $0.00325). Includes $10 compute credit (one Micro instance); each extra project pays full compute. Never paused. Email support. **Team from $599**: adds SOC 2, ISO 27001, priority support, 14-day backups, 28-day logs. **Enterprise**: custom, 24x7 support, SLA. | **Spend cap**: Pro only, on by default; when on, going over a quota blocks that item until next cycle and you are not charged. It does **not** cover compute, branching compute, read replicas, custom domain, IPv4, extra IOPS, log drains, PITR, MFA phone. No per-item budgets or cost alerts yet. Plans cannot be mixed in one org, so Free and Pro projects need separate orgs. | V |
| **Neon** | $0, no card, permanent. 100 CU-hours per project, 1 GB per project (20 GB per account), 100 projects, 10 branches, autoscale to 2 CU, scale to zero after 5 min (cannot be turned off). **Hitting a limit suspends compute until the next billing period.** | **Launch**: usage only, $0.106 per CU-hour, $0.35 per GB-month, no monthly minimum. **Scale**: $0.222 per CU-hour, 1,000 projects. (The page I read did not show a Business plan.) | No hard spend cap on paid plans. Email alerts at 80% and 100%. Cap autoscaling per compute. | V |
| **Vercel** | **Hobby $0, "personal, non-commercial use"**. Capped at included usage, extra usage cannot be bought. 1 developer seat. | **Pro $20** per developer seat plus $20 included credit. Viewer seats unlimited. Pay as you go, "uncapped" after the credit. Enterprise custom. | **On-demand budget: default $200 for new teams.** Alerts by email, web and SMS. At 100% you can optionally auto-pause all projects (hard limit). | V |

What to learn:
- Free is **permanent, no card, hard-limited**. Paid is **base fee plus metered overage**. (V, all three.)
- Vercel bans commercial use on Free. That is a conversion lever and a legal line. Our users are founders doing real outbound, so a "non-commercial only" rule would kill our own free tier. Do not copy.
- Supabase's pause exists because compute is per project (V). Our cost driver is AI and data credits, not idle compute. So the free-tier guard should be a credit cap, not a pause.
- Supabase's jump from $25 to $599 is the well-known complaint (single blog, **U**). Our Team tier should not be a cliff.

### 1.2 GTM and sales tools

| Vendor | Free tier | Paid shape | Credits and AI | Seat rules | Tag |
|---|---|---|---|---|---|
| **Clay** | Free: **500 Actions/mo and 100 Data Credits/mo**. Claygent on all plans. | Launch from $60/mo (15K actions) up; headline $167-185 (page conflicts). Growth from $205/mo (40K actions); headline $446-495. Enterprise custom. | Two meters: Data Credits (from $0.05 each) and Actions (under $0.01 each). Top-up at a **30% premium**. Rollover up to about 2x monthly (page conflicts: "15% of annual credits"). **BYOK on all plans: one Action per run, no Data Credit.** | Users and tables unlimited on every plan. | V |
| **Apollo** | Free: **900 credits per seat per year, granted monthly (about 75/mo)**. AI assistant 5-chat limit, 2 sequences, 20 company website visitors/mo, 100 CRM enrichments/mo, Gmail only. | Basic **$49**/seat/mo annual, 30,000 credits per seat per year. Professional **$79**, 48,000. Organization **$119**, 72,000, **minimum 3 seats**. Custom for more. 14-day trials. Annual saves 24%. | Credits pooled across the team, expire unused. Add-on credits bought by slider, renew each cycle. Per-credit price not shown. | Per seat. | V (browser read). This corrects 02, which said the page showed no prices. |
| **Instantly** | No free plan. "Start free", no card. Limits not stated. | Outreach Growth $47 (5,000 emails, 1,000 uploaded contacts). Bundles: Starter $94, Scale $194, Agency $555 (500,000 emails, 100,000 contacts). Page shows conflicting prices for the same tier. | "Instantly credits" for the lead database (1,500 to 10,000/mo on bundles). "Use your own LLM API key" appears in the Starter feature list. | Seat count not stated. Unlimited email accounts on Growth and Hypergrowth. | V |
| **Smartlead** | Free trial, no card, length not stated. | Base $39 ($32 annual): 2,000 leads, 6,000 sends. Pro $94: 30,000 leads, 90,000 sends. Unlimited Smart $174. Prime $379: 500,000 sends. | AI credits not mentioned. | **White-label $29 per client workspace per month, from Pro. Prime includes 3 workspaces.** Unlimited email accounts on all plans. | V |
| **lemlist** | 14-day trial, no card, 200 credits. No free plan. | Email $69 ($55 annual): unlimited users, 50,000 emails. Multichannel $109 ($87 annual): per user, 5 senders per user. | Enrichment add-on $20 for 2,000 credits (400 emails or 100 phones). Credits roll over while subscribed. Charged only on a successful result. WhatsApp automation is an add-on. | "Pricing is based on the number of users". Agency or white-label not mentioned. | V |
| **HubSpot** | Free CRM: **up to 2 users, 1,000 contacts**, no expiry. | Starter from **$15** per seat (new-customer discount, can change). Pro about $90-100 plus $1,500 onboarding; Enterprise about $150 plus $3,500 (third-party blogs). | HubSpot Credits: pool per month, reset monthly, no rollover (V). Included credits Starter 500 / Pro 5,000 / Enterprise 10,000 and **$0.01 per extra credit** (search snippet, U). Prospecting Agent about 100 credits per lead (snippet, U; 02 shows $1 per lead on the HubSpot page). | Core vs view-only seat rules: **not found.** | Free and Starter V; the rest U |
| **GoHighLevel** | 14-day trial. | Starter $97 (3 sub-accounts). Unlimited $297. **Agency Pro $497 (SaaS Mode)**. White-label mobile app add-on $497/mo. | Telecom and AI billed by usage. Unlimited: rebill at cost. Pro: rebill **with markup**. AI Employee $50 or $97 per sub-account. Agency wallet auto-recharges the agency's card. | Contacts and users unlimited. Sub-accounts are the unit. | V |
| **Attio** | Free: **3 seats, 50,000 records, 3 objects**. | Plus $44 ($35 annual), up to 10 seats, 250,000 records. Pro $99 ($79 annual), unlimited seats, 1M records. Up to 80% off for eligible startups. | Seat credits (Ask Attio): 100 / 500 / 1,000 / 2,500 per user. Workspace credits (AI + workflows): 250 / 1,500 / 10,000. Top-ups from $85 per 5,000. | Per seat. | V |
| **Twenty** (our base) | **No free cloud plan.** 30-day trial, no card. Self-host free. | Pro $9 per seat (annual), Organization $19, Enterprise from $50K/yr. | Pro: 50 workflow credits per year, 50 API calls/min. | Unlimited seats. | V (matches 02) |
| **Folk** | **No free plan.** 2-week trial, no card. | Standard $24 annual / $30 monthly per member. Premium $48 / $60. | Per member per month: 500 / 1,000 enrichment credits; 2,000 / 5,000 AI "magic field" credits; sends 2,000 / 5,000 messages. | **Billing is per workspace**, so multiple workspaces cost extra. | V |
| **Close** | 14-day trial, $5 credit for calling and enrichment. | Solo **$9** (1 user), Essentials $35, Growth $99, Scale $139 per user (page does not say monthly or annual). | AI credits per user per month: 500 / 1,000 / 1,500 / 2,000, pooled up to 10x on higher plans. Calls and SMS passed through at cost. | **Extra organizations $50 per org per month**; Growth and Scale include one free secondary org. | V |

### 1.3 AI and design tools

| Vendor | Free | Paid | AI cost model | Tag |
|---|---|---|---|---|
| **Canva** | Free (EGP 0). Smaller stock library (4.7M vs 141M items), 5 custom short links. | Pro EGP 1,920 per year (one person). Business (formerly Teams) EGP 3,400 per person per year. Prices shown in **EGP** on the page I loaded. | One **shared AI allowance** across Standard, Premium and Ultra AI tools, each using the allowance at a different rate. **AI Pass add-on**: 40x Pro or 20x Business AI. | V (EGP prices, browser). Exact AI quotas **U**. Teams renamed Business; $25 per person per month, no seat minimum is from blogs, **U**. |
| **Gamma** | Free: **400 credits at signup (one-time)**, 10 slides per prompt, no API. | Plus **$9** per seat/mo annual (1,000 monthly credits, 100 slides per prompt, **removes Gamma branding**). Pro $18 (4,000 credits, API, custom domains). Ultra $90 (20,000 credits). | Credits per month; premium models and video burn more. | V |
| **Notion** | Free and Plus: AI is a limited trial. | Plus $10, Business $20 per member per month. | Custom Agents: "free to try, then **$10 per 1,000 monthly Notion credits**". | V |
| **Zapier** | 100 tasks/mo, two-step Zaps only, 1 seat. | Pro $19.99 (annual, 750 tasks) to $3,389 (2M tasks). Team from $69, 25 seats. | **Overage**: 1.25x base rate on annual plans, **2.5x on monthly**; usage stops at 3x your tier. Toggle off = hard stop. Annual saves 33%. Prices in USD, converted at payment time. | V |
| **Make** | Free: 1,000 credits/mo. | Core, Pro, Teams on credits. Extra credits in bundles of 1,000 or 10,000. 50% off Business for under-20-employee start-ups. | **When credits run out, scenarios stop running** (webhooks are queued). Auto-purchase of 10,000 credits is optional. | Rules V. Plan prices not rendered; blogs say $9 / $16 / $29 annual **U**. |
| **n8n** | No free cloud plan. Trial 1,000 executions. Community Edition self-host. | Starter 20 EUR (2,500 executions), Pro 50 EUR (10,000), Business 667 EUR (self-host only). | Billed per **workflow execution**, not per step. 50% off Business for under-20 employees. | V |

### 1.4 MENA price examples

| Example | What I found | Tag |
|---|---|---|
| Canva Egypt | Prices shown in EGP (above). The page seems to localise by visitor location. | V |
| Zoho CRM | Currency selector includes EGP, SAR and AED, but the default list is in INR and "local taxes" are added on top. Free edition: 3 users forever. | V |
| Gamma, Zapier | Show USD. Gamma: "Prices are subject to tax depending on your location". Zapier converts USD at payment time. | V |
| Paddle | Country table lists Egypt, Saudi Arabia and the UAE as "tax preference: Inclusive", so consumer prices there are shown tax-inclusive. | V |
| Foodics, Salla, Qoyod (local SaaS) | Pages did not give readable currency-labelled price lists (see section 8). | not found |
| PPP (purchasing-power) discounts | Attio's up to 80% startup discount, Make and n8n 50% start-up programmes are verified. A documented PPP programme for Egypt or KSA: **not found.** | partly V |

---

## 2. Free-tier patterns

### 2.1 What is limited

| Limit type | Who does it | Note |
|---|---|---|
| **Records / contacts** | HubSpot 1,000 contacts; Attio 50,000 records; Smartlead leads per plan | Cheap for vendor; used as a soft upsell. V |
| **Seats** | HubSpot 2 users; Attio 3; Zoho 3; Zapier 1; Vercel Hobby 1 | Collaboration is a classic paywall. V |
| **Credits (data/AI)** | Clay 100 data credits/mo; Apollo 900/yr; Gamma 400 one-time; Make 1,000/mo | This is where real cost sits. V |
| **Sends** | Instantly/Smartlead have no free tier; Apollo Free is Gmail-only | Sending is gated because of deliverability and abuse risk. V |
| **AI runs** | Apollo AI assistant 5 chats; Notion AI trial; Zapier Copilot daily limit | V |
| **Projects / workspaces** | Supabase 2 active projects; Neon 100 projects; Folk and Close charge extra workspaces/orgs | V |
| **Watermark / branding** | Gamma Plus "removes Gamma branding" (so Free has it) | V (inferred from the Plus line) |
| **Inactivity pause** | Supabase 1 week; Neon scale-to-zero after 5 min (compute only) | Driven by per-project compute. V |
| **Commercial-use ban** | Vercel Hobby | V |
| **Time-limited trial instead of free** | Twenty 30 days, Folk 2 weeks, Close 14 days, lemlist 14 days, n8n | The no-free group is large. V |

Key observation: **half of the GTM tools do not offer a free plan at all** (Twenty, Folk, lemlist, Instantly, Smartlead, Close, n8n). The ones that do (Apollo, Clay, HubSpot, Attio, Unify per 02) are all data or CRM platforms where free users also create network or data value.

### 2.2 What converts free to paid

Published data, with quality marks:

| Claim | Source | Tag |
|---|---|---|
| Median free-to-paid across **200 B2B software products** is **8%**; "very few products actually have an 8% conversion rate". Survey run January 2026, published 18 March 2026 by Kyle Poyar with ProductLed, on ChartMogul's site. Respondents are self-selected and self-reported. | ChartMogul report | V that the report says it. Self-reported, vendor co-produced. |
| Trials that require a card convert at about 30%, more than 5x trials without a card. Organic signups convert best; paid traffic worst. Changing plans, limits and trial mechanics mattered more than changing price. | Same report | V that the report says it. |
| In the report's illustration, per 1,000 visitors: freemium 90 signups -> 5 payers; free trial 45 -> 4; card-required trial 35 -> 11. | Same report | V (illustration, not a measured sample). |
| Freemium average 3.7%; trials median 18.5%; "OpenView 2022: median B2B freemium 2-5%"; self-serve 6-8% vs sales-assisted 10-15%. | Blog summaries from search | **U**, underlying data not seen |
| Company-disclosed rates for Slack, Dropbox, Zoom, Calendly, Notion | Search found none | not found |
| Any vendor in section 1 publishing its own conversion rate | Not found | not found |

What the pages themselves show as upgrade triggers (my reading of the limits, **inference**, not vendor-stated):
1. **Credit exhaustion on the core loop.** Apollo Free gives about 75 credits a month, which is less than one day of real prospecting.
2. **Collaboration.** Seats, shared workspaces, real-time editing sit behind paid plans (Canva real-time collaboration on Business is from blogs, U).
3. **Branding removal** (Gamma Plus).
4. **Channel unlock.** Sending from non-Gmail mailboxes (Apollo paid) and sequences.
5. **Governance.** Backups, logs, SOC 2, SSO behind Team or Enterprise (Supabase Team).

Implication for us: with 8% as an optimistic median and our segment weak on budget (02, section 4.5), plan for **2-4%** of free users paying and keep free-user cost low enough that this is still profitable. That 2-4% is my own planning number, **U**.

---

## 3. Seat-based, usage-based, or hybrid

| Model | Examples | Pros | Cons |
|---|---|---|---|
| **Seat only** | Folk, Close base, Twenty, Notion | Simple to explain | AI costs leak: one heavy user can cost more than the seat. Close and Folk added credit pools to fix this. |
| **Usage / credits only** | Neon, Zapier, Make, n8n (executions) | Cost tracks value; no seat games | Bill shock; users avoid using the product |
| **Hybrid: seat + pooled credits** | Attio (seat + workspace credits), Apollo (credits per seat per year), Close, Folk, HubSpot (seat + credits), Clay | Predictable base plus fair AI cost | Credit units are confusing; needs a clear "what 1 credit buys" table |
| **Base + usage with cap** | Supabase Pro, Vercel Pro | Good for infra | Needs a cap UI |
| **Per workspace / per sub-account** | GHL, Smartlead white-label, Close extra orgs, Folk | Natural for agencies | Needs a workspace model from day one |

All **V** from the pages above.

### How AI cost reaches the customer

| Pattern | Who | Detail |
|---|---|---|
| Monthly credit pool per seat, unused credits lost | Close (500-2,000 per user), Folk, Attio (seat credits), HubSpot | V (HubSpot "do not roll over") |
| Shared workspace pool plus per-seat pool | Attio | V |
| Top-up at a premium | Clay +30%; Attio $85 per 5,000; HubSpot $0.01 per credit (U); Notion $10 per 1,000 | V except HubSpot |
| Overage penalty to push annual | Zapier 1.25x annual vs 2.5x monthly | V |
| Hard stop at zero | Make, Neon Free, Supabase with cap | V |
| **BYOK** (user pays the model provider, we charge platform fee) | Clay: 1 Action, 0 Data Credit, on all plans incl. Free. Instantly lists "Use your own LLM API key" | V |
| Premium models cost more credits | Gamma Ultra; Canva Standard/Premium/Ultra rates | V |
| Outcome pricing | HubSpot Prospecting Agent about $1 per lead (02) | V per 02 |
| Add-on for heavy users | Canva AI Pass | V |

Rule for us: **sell credits at about 2-3x raw model and data cost, offer BYOK for data providers and models, and show a "cost per action" table inside the product.** 2-3x is a planning figure, **U**.

---

## 4. Agency, white-label and cost controls

### 4.1 Agency and client workspaces

| Vendor | Mechanism | Numbers | Tag |
|---|---|---|---|
| **GoHighLevel** | Sub-accounts per client. Unlimited plan: unlimited sub-accounts, rebilling at cost. **Agency Pro: SaaS Mode** (sell the software as your own product, accounts auto-created, rebilling with markup). White-label web app login; white-label mobile app add-on. | $97 (3 sub-accounts), $297, $497 | V |
| **Smartlead** | White-label **$29 per client workspace** per month from Pro; Prime includes 3. | | V |
| **Instantly** | Agency bundle: 500,000 emails, 100,000 contacts. | $555 | V |
| **HeyReach** | Agency 25 senders $799-999; Unlimited $2,399-2,999. | | V per 03 |
| **Close** | Extra org $50 per month. | | V |
| **Folk** | Billing per workspace. | | V |
| **Vercel** | Unlimited free **Viewer** seats on Pro. | | V |
| **lemlist** | Agency not mentioned on page. | | V (absence) |

Pattern: agencies pay a platform fee that includes a few clients, then **a per-client fee well below what the agency charges** (Smartlead $29, Close $50). Clients get view-only access. Rebilling with markup (GHL) is the strongest lock-in because the agency's own revenue runs through the tool.

### 4.2 Spend caps and cost controls

| Control | Who | Behaviour | Tag |
|---|---|---|---|
| Hard quota block, no overage | Supabase Free and Pro with cap; Neon Free; Vercel Hobby; Make; Zapier toggle off | Protects customer; may break production | V |
| Spend cap default on | Supabase Pro | Blocks usage items; compute and add-ons excluded | V |
| Default budget plus optional auto-pause | Vercel Pro ($200 default) | Alerts by email, web, SMS | V |
| Account cap plus per-feature caps plus alerts at 75/85/90% | HubSpot | Features pause when the cap is reached; per-tool caps cannot exceed the account cap | V |
| Alerts only | Neon Launch/Scale (80% and 100%) | No cap | V |
| Overage ceiling | Zapier stops at 3x the plan | | V |
| Auto-recharge wallet | GHL agency wallet | Card on file charged when balance is low | V |
| Auto-upgrade of capacity pack | HubSpot default; pay-as-you-go default for purchases from 16 Sept 2026 (snippet) | | V for auto-upgrade, U for the new default |
| Fair Use Policy | Supabase | Heavy repeated overage can be restricted | V |

Controls we should ship (proposal):
1. **Plan quota** per credit type (AI, enrichment, sends). Hard stop on Free. On paid, overage only after the owner opts in.
2. **Workspace spend cap**, default ON, default value = 2x plan price per month, owner can raise it. Alerts at 50%, 80%, 100%.
3. **Per-member and per-feature caps** (HubSpot pattern), for example "AI deep research max 50 runs per member per month".
4. **Pre-flight estimate** before any batch enrich or batch draft ("this will use about 340 credits; you have 410"). Matches the architecture rule in 03, section on cost caps.
5. **Prepaid wallet for overage** instead of post-paid invoicing. It protects us from failed cards (Egypt card limits, section 5) and chargebacks.
6. **Vendor-side circuit breakers**: daily and monthly spend limit per provider key (Anthropic, Apollo, etc.), per-workspace rate limits, a global kill switch, and a Free-tier cost ceiling per user (target at most about $2 per month, section 6).
7. **BYOK keys are the user's spend.** Show their estimate but do not cap their provider account.

---

## 5. Payment collection and tax (Egypt, KSA, UAE)

### 5.1 Processors

| Option | Status found | Tag |
|---|---|---|
| **Stripe** | Stripe's global page (51 countries and regions) lists the **United Arab Emirates**. **Egypt and Saudi Arabia are not listed.** India and Indonesia are "Preview"; Nigeria, Ghana, Kenya, South Africa and Cote d'Ivoire go through Paystack ("Extended network"). Egyptians reportedly use Stripe through a US entity and US bank account (doola guide; Shopify community thread says Stripe Atlas looked unavailable for Egypt). | List V. Workarounds U. |
| **Stripe Managed Payments** (Stripe as merchant of record) | April 2026 changelog: works on Checkout Sessions and Payment Links, handles indirect tax in 80+ countries, for digital products incl. SaaS. Seller eligibility rules not read. Third parties report an extra 3.5%. | Existence V (snippet of changelog). Fee and eligibility U. |
| **Paddle** (merchant of record) | Pricing page: **5% + 50 cents** per Checkout transaction, no monthly fees. It collects and files tax. Its supported-countries table lists **Egypt, Saudi Arabia and the UAE** (supported, sales allowed, tax preference "Inclusive"). The page does not say whether a business based in those countries can be a seller or how payouts work. | Fee V. Country table V (as sales countries). Seller eligibility U. |
| **Lemon Squeezy** (Stripe-owned MoR) | Reported 5% + 50 cents, 190+ countries tax remittance, bought by Stripe in July 2024. Egypt and KSA seller support: not found. | U |
| **Paymob** | Egypt: the pricing page shows "2.75% + 3 EGP per transaction" as standard pricing (it does not say for which method). "No monthly or subscription fees". Weekly settlement to bank. No KSA or UAE fees on the page. Licensing: Central Bank of Egypt payment-facilitator 2018; UAE operations from 2022 and a UAE central bank retail payment licence in 2025; Saudi PTSP certification May 2023. Official recurring product for KSA/UAE: not found (UAE reported as acceptance only, 2024). | Fee line V. Licences and recurring U. |
| **Tap Payments** | Home page: "Serving 9 countries across MENA", lists Billing products, **no prices**. A competitor's comparison says Tap no longer accepts new Egyptian merchants. | Page V. Egypt claim U. |
| **HyperPay** | Riyadh HQ. Available in UAE, Jordan, Oman, Qatar, Iraq, Lebanon, Bahrain; the FAQ says it serves Egypt. Dedicated **recurring billing** service. mada pre-authorisation listed. Prices only by contacting sales. | V |
| **Moyasar** (KSA) | Startups page: tokenised recurring billing incl. **Apple Pay and mada recurring**, webhooks for renewals. **Fees only from sales.** Refunds: mada 24 hours to 3 business days, credit cards 7-14 business days. | V |

Practical path (proposal, **U** on eligibility):
- **Demo and competition (Dec 2026):** no real billing. Show plans and a fake checkout.
- **Phase 1, first paying users:** one merchant of record (Paddle first choice) for USD cards worldwide. Before relying on it, ask Paddle sales in writing whether an Egypt-based or KSA-based seller entity is accepted and in which currency it is paid out. Fallback is a UAE company with Stripe.
- **Phase 2, local rails:** Paymob for EGP (wallets, local cards, Fawry-type methods; confirm recurring), Moyasar or HyperPay for SAR with mada and Apple Pay recurring. Local gateways make you responsible for VAT and invoices.
- **Egypt card risk.** Egyptian bank limits on international card spending have changed several times since 2022 (a 2023 report cites an FX card cap of about EGP 7,750 per month; some banks have since raised limits to about USD 5,000). I found no current central-bank circular. Recurring USD charges on Egyptian cards can fail. **U.** This is why a local EGP option and prepaid wallets matter.
- Bill in local currency where possible. Canva shows EGP prices **V**. Zapier converts USD at payment time **V**, so the local amount floats. A payments vendor advises round EGP price points and a minimum around 50 EGP per charge (**U**, vendor blog).

### 5.2 VAT (all **U**: secondary tax-advice sites, not ZATCA, FTA or ETA)

| Country | Rate | Foreign (non-resident) SaaS vendor, sells to **businesses** | Sells to **consumers** | Notes |
|---|---|---|---|---|
| Saudi Arabia | 15% | Customer normally self-accounts under reverse charge (cited VAT Implementing Regulations Art. 47) | Registration with ZATCA, directly or via tax representative; sources conflict on whether there is a threshold | The ZATCA page I tried returned "not found". |
| UAE | 5% | Reverse charge by VAT-registered customer; the AED 375,000 threshold applies to UAE residents, not foreign suppliers | Foreign suppliers to consumers may need to register from the first sale | Self-invoicing duty for some reverse-charge supplies reportedly removed from 1 Jan 2026 (single source, verify). |
| Egypt | 14% (reported unchanged by Law 157 of 2025) | Reverse charge by the VAT-registered Egyptian customer | Simplified registration with the Egyptian Tax Authority (Decree 160 of 2023); **sources conflict**: no threshold vs EGP 500,000 | B2B e-invoicing required for taxpayers since 2023 (single source). |

How the vendors handle it (V): Gamma "Prices are subject to tax depending on your location". Zoho adds "local taxes" on top of list. Paddle shows these three countries as tax-inclusive. A merchant of record removes the filing work but costs 5% + 50 cents. If we sell through local gateways, we need our own registration, tax invoices and (Egypt) e-invoices. Get a local tax adviser before launch. Our own company is probably in Egypt, so Egyptian VAT on domestic sales is a separate question I did not research. **Open item.**

---

## 6. Proposed tier table (PROPOSAL, not market-tested)

**This section is a proposal.** Prices, limits and costs are my estimates (**U**) built from the verified vendor numbers above. They need testing with 5-10 founders in Cairo and Riyadh (02, section 6) and a real cost log from the demo.

### 6.1 Unit cost assumptions

| Cost driver | Assumption | Basis |
|---|---|---|
| **AI draft or chat turn** (about 4,000 input and 1,000 output tokens) | Claude Sonnet 5.5 at $2 / $10 per million tokens = **about $0.018**. Claude Haiku 5.5 at $0.10 / $0.50 = **about $0.001**. | Anthropic pricing page, **V** for the per-token prices; token counts are my guess |
| **AI deep research run** (about 40,000 input, 4,000 output, Sonnet 5.5) | **about $0.12** before any web-search tool fees | Same, prices V, counts U |
| **1 AI credit** (our unit) | 1 credit = one short draft or chat turn. Deep research = 10 credits. Target cost basis **about $0.012 per credit** (mix of Haiku and Sonnet). | Proposal |
| **Enrichment credit** | FullEnrich about **$0.055**; Lusha about $0.117; Apollo Basic works out to about **$0.02** per credit ($588 a year for 30,000 credits). Work email about 1 credit; mobile 5-10 credits. | FullEnrich and Lusha from 03 (V); Apollo calculated from the Apollo page (V inputs, my division) |
| **Email sends** | Our relay cost is tiny: Amazon SES **$0.10 per 1,000**. The real cost is the user's own mailboxes (about $2-7 each, 20-40 sends/day each, per 03, U) and domain reputation. So sends are limited for **deliverability and abuse**, not cost. | SES V; mailbox cost U |
| **LinkedIn actions** | Cost is per connected sender: Unipile about 3.5-5 EUR per account (03), HeyReach $47-79 per sender (03). Ban risk is on the user (03). | V per 03 |
| **Storage** | Supabase-class: files **$0.0213 per GB-month**, DB $0.125 per GB, egress $0.09 per GB. **Storage is almost free**, so limits are for abuse control only. | Supabase page V |
| **Hosting per workspace** | Unknown; assume about $1-2 per active workspace per month on shared infrastructure. | U |
| **Payment fees** | Paddle 5% + 50 cents (V); local gateways about 2-3% (Paymob 2.75% + 3 EGP V). | |

Gross margin target: 70% or more on paid plans at **typical** use (about 40% of the quota), and at least 40% at **100%** of quota.

### 6.2 Tiers

Annual price = per month, billed yearly (about 20% off, like Attio and Folk). Local-currency price points (EGP, SAR, AED) should be rounded and reviewed each quarter.

| | **Free** | **Solo** | **Team** | **Agency** | **Enterprise** |
|---|---|---|---|---|---|
| **Price (USD/mo)** | $0 | **$24** monthly, **$19** annual | **$39** per seat monthly, **$32** annual (3-10 seats) | **$199** monthly, **$159** annual base. Range to test: $149-249 | Custom, from about $1,000/mo ($12K/yr) |
| **Seats** | 1 | 1 | 3-10, plus free view-only guests | 5 team seats; unlimited free view-only client seats | 10+, SSO |
| **Workspaces** | 1 | 1 | 1 | **5 client workspaces** included; extra **$25** each | Custom |
| **Records (contacts + companies)** | 1,000 | 10,000 | 50,000 | 25,000 per client workspace | Custom |
| **AI credits / month** | 100 | 400 | 600 per seat, pooled | 5,000 pooled across workspaces | Custom |
| **Enrichment credits / month** | 25 (or unlimited with BYOK) | 100 (BYOK unlimited) | 150 per seat, pooled | 1,500 pooled | Custom |
| **Sequences and sends** | 1 active sequence; 100 sends/mo from own Gmail or Outlook | 5 sequences; 2,000 sends/mo | 20 sequences per seat; 5,000 sends per seat/mo | 10,000 sends per client workspace/mo | Custom |
| **LinkedIn** | Manual tasks only (no automation) | Add-on: **$19 per sender** | Add-on $19 per sender, 1 sender included per 3 seats | Add-on $19 per sender; **client senders billed to client** | Custom |
| **Signals** | 1 watchlist, 10 accounts, weekly | 3 watchlists, 200 accounts, daily | 10 watchlists, 1,000 accounts | 5 watchlists per client workspace | Custom |
| **Design assets (exports/mo)** | 5, with "Made with Revenue Workspace" mark | 50, no mark | 200 per seat, shared brand kit | 200 per client, client brand kits | Custom |
| **Assistant** | 10 messages/day | Included in AI credits | Included in AI credits | Included in AI credits | Custom limits |
| **Storage** | 500 MB | 5 GB | 25 GB per seat | 10 GB per client | Custom |
| **Arabic and English drafting** | Yes, not gated | Yes | Yes | Yes | Yes |
| **Inactivity** | Archive after 60 days idle, data kept 12 months, one-click restore | Never archived | Never | Never | Never |
| **Controls** | Hard stop at quota | Spend cap on by default; optional overage wallet | Roles, per-member caps, approvals, audit log, shared templates | Per-client caps, rebilling with markup, white-label reports and client portal domain | SSO, SLA, data residency options, invoice and PO billing |
| **Overage** | None | Prepaid credit packs | Prepaid packs, about 1.3x list rate | Prepaid packs; client rebilling | Contract |

### 6.3 Why each limit (cost driver and anchor)

| Limit | Cost driver | Why this number | Anchor from research |
|---|---|---|---|
| Free: 100 AI credits | AI tokens | Worst case 100 x $0.012 = **$1.20**. Even if all spent on research it is about $1.2 to $2. | Apollo Free 5 AI chats; Gamma Free 400 credits once |
| Free: 25 enrichment credits | Data vendors | 25 x $0.02-0.055 = **$0.50-1.40** worst case | Clay Free 100 data credits/mo; Apollo Free about 75/mo |
| Free: 100 sends from own mailbox | Deliverability and abuse (relay cost near zero) | Lets a founder run a real test sequence; stops spam farms | Apollo Free Gmail only, 2 sequences |
| Free: no LinkedIn automation | Per-sender cost and account-ban risk | Never pay for a sender for free users | HeyReach/Unipile pricing (03) |
| Free: 1,000 records | Hosting and abuse | Matches HubSpot Free 1,000 contacts; far below Attio 50,000 | HubSpot, Attio |
| Free: watermark on design exports | Brand reach; negligible cost | Gamma pattern: branding removal as upgrade reason | Gamma Plus |
| Free: archive, not pause | Idle storage only | Our cost is credits, not compute, so no need for Supabase's 1-week pause | Supabase pauses because compute is per project |
| **Free total cost ceiling** | | about **$2-3 per active free user per month** worst case, about $0.30-0.80 typical (U). At 2-4% conversion to $19-24, 1 payer funds about 25-50 free users on cost alone. | Conversion section 2.2 |
| Solo: 400 AI credits | AI tokens | 400 x $0.012 = **$4.80** worst case | Close Solo 500 credits at $9; Gamma Plus 1,000 credits at $9 |
| Solo: 100 enrichment credits plus BYOK | Data vendors | 100 x $0.02-0.055 = **$2-5.50** worst case. BYOK moves cost to the user | Clay BYOK |
| Solo: 2,000 sends | Deliverability | About 2-3 mailboxes at 30/day. Not a cost limit | Smartlead Base 6,000 sends for $39 |
| Solo: $19 LinkedIn sender add-on | Sender cost $3.5-79 | Priced above the cheapest provider (Unipile) and below HeyReach ($47-79) | 03 |
| Solo: price $19-24 | Margin: worst-case cost about $4.80 + $5.50 + $2 hosting + payment fees $1-2 = **about $13-15**, so about 40-45% margin at full use, 75%+ at typical use | | Unify Base $20 per seat; HubSpot Starter $15; Close Solo $9; Folk $24; Apollo Basic $49; Smartlead Base $39 |
| Team: $32-39 per seat | Pooled AI and data per seat; collaboration features | Between Unify $20 and Attio Plus $35-44; below Apollo $49-79 and Folk Premium $48 | Section 1.2 |
| Team: pooled credits | Heavy users share the pool | Fixes the "one user eats the seat" problem | Attio workspace credits; Close pool up to 10x |
| Team: 3-seat minimum (Apollo Organization also has a 3-seat minimum) | Support and onboarding cost | Avoids a $32 single seat that needs team features | Apollo |
| Agency: $159-199 base with 5 client workspaces | Per-client storage, signals and workspace hosting; support | About $32-40 per client workspace, in line with Smartlead $29 per client and Close $50 per org; much below GHL $297-497 | Smartlead, Close, GHL |
| Agency: extra workspace $25 | Hosting plus signal refresh | Slightly below Smartlead $29 | Smartlead |
| Agency: free client viewers | Almost zero cost; improves trust and retention | Vercel Viewer seats | Vercel |
| Agency: rebilling with markup | Revenue lock-in; agency pays us, bills client | GHL SaaS Mode pattern. Keep to client invoices rather than a full reseller (simpler tax) in v1 | GHL |
| Enterprise: from about $1,000 | SSO, SLA, residency, support | Twenty Enterprise from $50K/yr; Amplemarket Startup $600/mo (02) | Section 1.2 |
| Storage limits at all tiers | Storage cost is almost nothing ($0.02 per GB) | Used for abuse control and upsell clarity only | Supabase page |

### 6.4 Rules that go with the table

1. **Do not gate Arabic.** Arabic quality is the product's reason to exist (02). Gate volume, not language.
2. **Credits expire monthly** (like Apollo and HubSpot), with a packs-never-expire option that costs more. Simpler to forecast cost.
3. **Annual discount about 20%** (Attio, Folk), which also reduces card-failure churn in Egypt.
4. **Startup / accelerator code**: 50% off Solo or Team for 6 months for members of partner accelerators (Attio up to 80%, Make and n8n 50% are the precedent). Accelerators are the channel recommended in 02.
5. **Graduated paid tiers, no cliff.** Avoid a Supabase-style jump from $25 to $599. The step Solo -> Team -> Agency should each be less than 2.5x.
6. **Show real cost tables** for each credit action inside the app.
7. **Re-price after the demo cost log.** The table above is a hypothesis. Replace the unit costs with measured costs from the first 100 workspaces.

---

## 7. Open questions for the product owner

1. Is the first paid buyer the solopreneur or the small agency? 02 recommends agencies. If so, move more effort to the Agency tier and keep Free as acquisition.
2. Which legal entity will collect money (Egypt, UAE, other)? That decides Stripe, Paddle seller eligibility, VAT and local gateways.
3. Do we resell data credits or use BYOK only in v1? BYOK removes credit-margin risk but adds setup friction for solopreneurs.
4. Will LinkedIn automation ship at all in v1? The 03 report flags terms-of-service and account-ban risk.
5. EGP, SAR, AED price points: set by us, or converted from USD at checkout?

---

## 8. Searches and pages that found nothing (or failed)

| Item | Result |
|---|---|
| HubSpot Sales Hub / CRM pricing pages (3 URLs) | Fetched content was navigation only. Prices came from the HubSpot CRM product page (Free, Starter $15) and third-party snippets. Browser attempt abandoned (shared browser tab). Seat types (core vs view-only): **not found.** |
| HubSpot Credits allowance and per-credit price | Not on the knowledge-base article; only in search snippet (U) |
| Canva pricing via fetch tool | 403. Read in a browser instead. |
| Gamma pricing via fetch tool | 403. Read in a browser instead. |
| Make plan prices | Page rendered FAQ only. Prices **U** (blogs). |
| Apollo knowledge-base credit article | 403. Plan data read in a browser instead. |
| Apollo per-credit add-on price | Not shown on any page I read |
| Instantly: seat count and free-trial limits | Not stated on page |
| Smartlead: seats, trial length, AI credits | Not stated on page |
| Tap Payments pricing page | 404. Home page has no prices. |
| Moyasar pricing page | 404. Startups page says fees only from sales. |
| Paymob KSA and UAE fees and subscription products | Not on the page; no official announcement found |
| Paddle or Lemon Squeezy: eligible seller countries and payouts for Egypt or Saudi Arabia | Not found |
| Stripe Managed Payments seller eligibility | Not found |
| ZATCA VAT page | Returned "not found" |
| Official FTA and ETA VAT guidance | Not reached; VAT section rests on secondary sources |
| Local SaaS price lists in SAR/EGP (Salla, Foodics, Qoyod) | Salla page had no prices; Foodics page showed numbers with no currency label; Qoyod page content truncated |
| PPP / regional price programmes for Egypt and KSA by Notion, Figma, Canva | Not found (Canva localises to EGP, no PPP policy text found) |
| Founder payment-method preferences and card-decline rates in Egypt, KSA, UAE | Not found; only vendor marketing and an undated 2023-era payment mix |
| Current Central Bank of Egypt card-limit circular | Not found |
| Company-disclosed free-to-paid rates (Slack, Dropbox, Zoom, Calendly, Notion) | Not found |
| Supabase's own free-tier cost, conversion rate or founder statements | Not found |
| GoHighLevel SaaS Mode sub-account limits and wallet markup numbers | Not found |
| Willingness to pay of MENA solopreneurs | Not found (also not found in 02) |

---

## 9. Sources (all read 2026-10-13 unless marked)

Vendor pages (V):
- Supabase pricing: https://supabase.com/pricing ; billing: https://supabase.com/docs/guides/platform/billing-on-supabase ; spend cap: https://supabase.com/docs/guides/platform/cost-control
- Vercel: https://vercel.com/pricing
- Neon: https://neon.com/pricing
- Clay: https://www.clay.com/pricing
- Apollo (browser read): https://www.apollo.io/pricing ; Apollo help article returned 403
- Instantly: https://instantly.ai/pricing
- Smartlead: https://www.smartlead.ai/pricing
- lemlist: https://www.lemlist.com/pricing
- HubSpot CRM product page: https://www.hubspot.com/products/crm ; credits article: https://knowledge.hubspot.com/account-management/understand-hubspot-credits-and-billing ; Prospecting Agent: https://knowledge.hubspot.com/prospecting/use-the-prospecting-agent
- GoHighLevel: https://www.gohighlevel.com/pricing ; rebilling help: https://help.gohighlevel.com/support/solutions/articles/155000001156-how-to-set-up-saas-mode
- Attio: https://attio.com/pricing
- Twenty: https://twenty.com/pricing
- Folk: https://www.folk.app/pricing
- Close: https://www.close.com/pricing
- Canva (browser read): https://www.canva.com/pricing/
- Gamma (browser read): https://gamma.app/pricing
- Notion: https://www.notion.com/pricing
- Zapier: https://zapier.com/pricing
- Make (FAQ only): https://www.make.com/en/pricing
- n8n: https://n8n.io/pricing
- Zoho CRM: https://www.zoho.com/crm/zohocrm-pricing.html
- Stripe countries: https://stripe.com/global
- Paddle fee: https://www.paddle.com/pricing ; countries: https://developer.paddle.com/concepts/sell/supported-countries-locales
- Paymob: https://paymob.com/en/pricing
- Tap: https://www.tap.company/
- HyperPay: https://www.hyperpay.com/
- Moyasar: https://moyasar.com/en/solutions/startups-and-freelancers/
- Anthropic API pricing: https://platform.claude.com/docs/en/about-claude/pricing
- Amazon SES: https://aws.amazon.com/ses/pricing/
- ChartMogul conversion report (vendor co-produced, survey): https://chartmogul.com/reports/saas-conversion-report-2/

Secondary (U, search results, not opened as full pages):
- Apollo prices cross-check (Zeliq, Landbase, Docket): https://www.zeliq.com/blog/apolloio-pricing
- HubSpot Sales Hub prices (blogs): https://blog.hubspot.com/sales/hubspot-sales-hub-pricing , https://zeeg.me/post/hubspot-pricing
- Make prices: https://www.jetadmin.io/blog/make-pricing/
- Canva Business price and AI quota claims: https://piktochart.com/blog/canva-pricing-2026-costs-raised/
- Freemium benchmarks: https://userpilot.com/blog/freemium-to-premium , https://www.getmonetizely.com/articles/freemium-vs-free-trial-choosing-the-right-customer-acquisition-model-for-saas-success
- Supabase free-tier commentary: https://www.cloudzero.com/blog/supabase-pricing/ , https://www.jetadmin.io/blog/supabase-review/amp/
- Stripe in Egypt and Saudi (workarounds): https://www.doola.com/stripe-guide/how-to-open-a-stripe-account-in-egypt/ , https://incorpuk.com/blog/open-stripe-account-in-saudi-arabia/ , https://community.shopify.com/t/can-i-integrate-stripe-atlas-with-my-store-from-egypt/246887
- Stripe Managed Payments: https://docs.stripe.com/changelog/dahlia/2026-04-22/managed-payments.md ; fee claim: https://dodopayments.com/blogs/stripe-managed-payments-fees-explained
- Lemon Squeezy: https://dodopayments.com/blogs/lemonsqueezy-review
- Paymob licences: https://techcrunch.com/2024/09/11/paymob-lands-another-22-million-and-is-profitable-in-egypt
- Tap no longer taking Egyptian merchants (competitor claim): https://dodopayments.com/blogs/tap-payments-alternatives
- Moyasar third-party connector: https://ecosire.com/apps/erpnext/erpnext-moyasar-gateway
- Egypt card limits: https://www.bank-abc.com/en/CountrySites/Egypt/AboutABC/Documents/Cards%20international%20limits.pdf , https://dodopayments.com/currency/egp
- VAT: Saudi https://www.dariba.co/non-resident-suppliers-and-vat-obligations/ , https://payproglobal.com/saas-sales-tax/saudi-arabia/ ; UAE https://trykintsugi.com/sales-tax-guides/middle-east/united-arab-emirates ; Egypt https://www.anrok.com/vat-software-digital-services/egypt , https://www.avalara.com/vatlive/en/country-guides/africa-and-middle-east/egypt-vat/egyptian-vat-rates.html , https://taxsummaries.pwc.com/egypt/corporate/other-taxes

Prior reports used (read first, not repeated): `02-competitors-and-positioning.md`, `03-connectors-and-apis.md`.
