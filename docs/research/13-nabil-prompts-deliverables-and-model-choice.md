# 13 — Nabil prompts, deliverable formats and model choice (17 October 2026)

## Question

Does a stronger Azure model (gpt-6.1-sol) produce better assistant replies and deliverables than gpt-5.4-mini, and is the difference worth its latency and cost? Evaluation budget: USD 10, with a hard stop at USD 9.

## Prompt sources (patterns, not text)

The [x1xhlol system-prompts collection](https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools) is an unverified third-party collection of leaked prompts. We read two files there for structure only and wrote our own text:

- `Manus Agent Tools & Prompt/Agent loop.txt`: an explicit loop (understand, select a tool, observe, iterate, deliver, stand by), one tool step at a time, and results delivered as attachments instead of pasted text. This became Nabil's `<agent_loop>`. One action proposal per turn already matched our governance.
- `Anthropic/Claude Fable 5.txt`: standalone deliverables go in an artifact while short answers stay inline, prose is the default with minimal formatting, and citations go to original sources. This became the `<deliverables>` and `<response>` formatting rules: never paste a deliverable into chat, tables only for comparing records, and sources cited as linked domain plus date.

We could not confirm that either file is the real or current prompt of the product it is attributed to.

## What changed

- `system.md` 2026-10-17.1: Nabil identity and character, the agent loop, a deliverable catalogue (format defaults and brand-level vs per-account), and Markdown discipline. The action boundary, evidence and untrusted-data blocks are kept unchanged.
- New per-format prompts (`format-email`, `format-carousel`, `format-flipbook`, version .2). The model returns content JSON only; trusted templates own all markup (Gmail/Outlook rules, 1080×1350 slides, A4 pages, RTL).
- The .1 → .2 revision followed the judge's notes: every factual claim about the market or outcomes must come from a reviewed fact, the service may be described only as the approved offer describes it, each point is stated once, and one Arabic register is used.
- `checkContent` rejects numbers that do not appear in reviewed sources. It allows counting words up to 12, and numbers the person typed as the topic ("past 50 staff"), but not rates, money or multipliers.

## Results (synthetic workspaces)

| Run | Model | Pass | Copy | Grounding | Structure | Language | Median latency | USD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Deliverables, prompts .1 | mini | 9/10 (1 unsupported number) | 3.33 | 2.33 | 4.67 | 4.44 | ~3.5 s | 0.068 |
| Deliverables, prompts .2 | mini | 10/10, lint-clean | 3.5 | 4.1 | 4.7 | 4.4 | ~3 s | 0.060 |
| Deliverables, prompts .2 | sol | 10/10, lint-clean | 3.7 | **5.0** | **5.0** | **4.8** | 12–38 s | 0.141 |
| Agent, 30 cases | mini | 30/30, Arabic 3.4 | | | | | 3.3 s (p95 5.5 s) | 0.351 |
| Agent, 30 cases | sol (Responses API) | 30/30, Arabic 4.2 | | | | | 5.9 s (p95 22 s) | 0.950 |
| Drafts, 12 held-out | mini | 12/12; grounding 4.42, relevance 4.17, language 4.58 | | | | | | not metered (est. < 0.10) |
| Drafts, 12 held-out | sol | 12/12; grounding 5, relevance 5, language 5 | | | | | | not metered (est. < 0.40) |

Notes on the table:
- Metered spend: USD 1.60 (`evaluation/agent/results/spend-2026-10-17.json`). Including the unmetered draft runs, the estimate is under USD 2.20.
- The deliverable judge was gpt-6.1-sol for both models. It gives 1 for any unsupported claim.
- The draft-eval judge is the model under test (same-model judge), so its Sol scores favour Sol.
- Sol's flipbooks took 35–38 s, so the gateway timeout for long outputs was raised to 120 s.

## Decision

- **Deliverables (emails, carousels, flipbooks) use gpt-6.1-sol** through `AI_DELIVERABLE_MODEL=gpt-6-1-sol`. Grounding is the risk that matters for outbound material, a deliverable already takes a background run of several seconds, and the cost is about USD 0.014 per deliverable.
- **Chat stays on gpt-5.4-mini.** Sol passed the same 30 cases with better Arabic (4.2 vs 3.4), but its p95 latency of 22 s is too slow for a conversational reply, and it costs about 2.7× more per turn. Switching is one setting: `AI_CHAT_DEPLOYMENT=gpt-6-1-sol` with `AI_CHAT_API=responses`. Azure rejects function tools with reasoning on gpt-6.1-sol chat completions, so Sol requires the Responses API.
- **Claude Opus 5.5 was not evaluated.** It deploys only on an AIServices (Foundry) resource. The project-only resource `aif-gtm-command-center-demo` was created, but the deployment failed with `InvalidModelProviderData: ModelProviderData is required for Anthropic model deployments ... industry, organizationName, and countryCode`. Supplying organisation details to the Marketplace offer is the owner's decision.

## Limits

These are synthetic cases, an LLM judge and no native Arabic reviewer. The results show grounding and structure compliance, not campaign effectiveness.
