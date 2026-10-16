# Output quality and prompt engineering — 16 October 2026

Goal: inspect what the system actually writes, improve grounded usefulness, and preserve reproducible before/after evidence. The active Azure deployment remains GPT-5.4 mini; no model/account migration was made.

## Sources and decisions

- [OpenAI GPT-5.4 guidance](https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.4) describes smaller-model prompts as needing explicit order, edge cases and packaging. Our action flow now separates reading saved records, proposing new work and reporting actual state. This is a targeted change to the existing model, not a model upgrade.
- [OpenAI prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering) recommends versioning and evaluations. Prompt files retain declared versions plus content hashes, and the draft evaluation saves complete synthetic outputs. Language is specified at the nearest drafting call site as well as in the shared rules.
- [Anthropic: writing tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) emphasizes distinct tool purposes, useful returned context and held-out evaluation. Tools now distinguish saved search from rescoring, return evidence URLs, disclose 100-record batches and expose saved draft copy/run states. Unit checks verify tenant scope and pagination.
- [Anthropic: context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) argues for relevant context rather than indiscriminate accumulation. The current UI context is structured and marked as data; evidence and draft text stay untrusted. Existing bounded history and step caps remain.
- [Anthropic: agent evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) distinguishes state outcomes, transcripts and several grader types. Our new copy check combines channel/citation/language assertions, full-text inspection and a model review. The model judge sometimes rated entirely English Arabic outputs highly; a deterministic language gate now overrides that score while retaining the raw rating. This is why the judge is diagnostic, not acceptance.
- The owner-supplied [system-prompt collection](https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools) was inspected as a third-party index. Individual prompts' provenance/current production use is unverified; the repository labels itself GPL-3.0. No prompt text was copied into our Apache-2.0 product. Opening its selected Open Source prompts folder through the web tool returned `Internal Error`; first-party guidance above informed our own original changes.

## What actual outputs revealed

The previous drafting prompt explicitly suggested “we are both building for the same customers” for founders. The model repeated that unsupported relationship. It also sometimes wrote Arabic requests in English, copied English job titles/business terms, inserted missing sender-name placeholders and narrated internal communication checks as part of the call. Public event attendance was sometimes treated as a reason permitting contact.

The new contract limits claims to approved observations and capabilities; an angle or title cannot establish pain. A vacancy establishes a vacancy, not overload; a company event listing establishes company participation, not a personal meeting or consent. Each channel must cite a supplied reviewed fact. Every Arabic channel must contain Arabic, including the spoken call. The product adds its own localized pre-call reminder; that reminder is separate from the spoken script. It never treats a public fact as permission.

## Recorded comparison

These are synthetic development results, not campaign-effectiveness or native-dialect acceptance. The 12 cases cover hiring, event and sparse evidence across English, Egyptian Arabic, Gulf Arabic and standard Arabic. The baseline text was captured before changes and regraded with the final same criteria version `2026-10-16.4`.

| Check                                                            | Baseline | Latest candidate |
| ---------------------------------------------------------------- | -------- | ---------------- |
| Draft format, citations and language checks                      | 4/12     | 12/12            |
| Same-model grounding review, mean /5                             | 3.17     | 4.67             |
| Same-model relevance review, mean /5                             | 3.33     | 4.00             |
| Language review after deterministic wrong-language gate, mean /5 | 2.75     | 4.83             |
| Existing agent workflow suite                                    | 29/30    | 30/30            |
| Agent median duration                                            | 2,435 ms | 1,447 ms         |
| Agent Arabic model review, mean /5                               | 4.0      | 3.4              |

The chat Arabic review regressed in this sample even as tool choice and draft output improved. Do not advertise a universal quality gain. Chat still copies some English role labels and needs native-speaker calibration. Durations reflect these particular runs, not a controlled performance benchmark. The intermediate copy candidates are retained, including the 11/12 run that still left “Payroll Specialist” in Egyptian copy.

Evidence: [draft baseline](../../evaluation/agent/results/drafts-2026-10-16-baseline.json), [latest drafts](../../evaluation/agent/results/drafts-2026-10-16-candidate-v6.json), [agent baseline](../../evaluation/agent/results/agent-2026-10-16-baseline.json), [agent final](../../evaluation/agent/results/agent-2026-10-16-final.json). `draft-eval.ts` supports `--regrade` to reuse captured text and preserves its original prompt versions. `agent-eval.ts` accepts `EVAL_REPORT_PATH` and exits nonzero on failed cases.

## Example: Egyptian founder outreach after a company event

The sole approved fact says the company was an exhibitor. No meeting, shared customer base or internal pain is evidenced. Names below are synthetic.

Before:

```text
Hi Huda,

We are both building for the same customers, and I wanted to reach out because Lumaro Pay was listed as a company exhibitor at the Cairo Business Forum.

We run an outsourced HR operations desk that handles payroll and employee onboarding for teams like yours.

Would it make sense to compare notes on whether that could be useful for Lumaro Pay?

Reply stop if you’d prefer not to hear from me again.
```

After:

```text
أهلًا Huda،

شفت إن Lumaro Pay كانت شركة عارضة في Cairo Business Forum يوم 2 أكتوبر 2026. لو في أي اهتمام بتخفيف شغل الرواتب وتهيئة الموظفين الجدد كخدمة خارجية، هل ده ممكن يكون مناسب لكم؟

رد بكلمة توقف لو مش حابب تواصل تاني.
```

## Output inspection and regression cases

The original [12-case unseen industry check](../../evaluation/agent/results/drafts-2026-10-16-heldout.json) covers security, logistics and software offers across the four languages and passed all hard checks. A later run exposed a recipient-name substitution even though the format checks passed. The product now requires the original first name in the email and rejects unsupported digit-based numbers, including Arabic/Persian digits. Equivalent English source number words and source dates are accepted; tests caught and repaired false rejections of “three” → “3” and “two” → “2”. These are limited checks, not semantic entailment. Written-out new claims and reuse of an allowed number with a different meaning still need review.

The [final cross-industry regression](../../evaluation/agent/results/drafts-2026-10-16-heldout-v4.json) passes 12/12; its diagnostic model means are grounding 4.25, relevance 3.92 and language 4.67. Because these cases were reused during the guard repair, this final result is **not an untouched held-out evaluation**. The stricter development run passes 12/12. Intermediate rejected runs remain saved rather than being hidden. The same-model judge sometimes mistakes caller-preparation notes for spoken copy and criticizes names that the contract correctly preserves; its scores are advisory.

The [live product draft check](../../verification/draft-smoke-local-final-2026-10-16.json) generated English and Egyptian Arabic drafts through fresh cost approvals, durable runs and the actual worker. Each took four credits; prompt/model versions and full copy are saved, both drafts remain unapproved and the sequence count is unchanged. The [live chat/voice check](../../verification/ai-smoke-local-overnight-2026-10-16.json) used six credits and created no runs. It includes the dated call-outcome proposal.

The call classifier was missing a workspace-local date and had no explicit distinction between a callback and an agreed meeting. On twelve synthetic notes, the [old prompt](../../evaluation/agent/results/calls-2026-10-16-baseline.json) passes 9/12 exact outcome/delay checks, the first revision passes 10/12, and the [final prompt](../../evaluation/agent/results/calls-2026-10-16-candidate-v2.json) passes 12/12. The fixed reference is Friday 16 October in Cairo: a Sunday callback is two days away; a booked Tuesday meeting is not an invented four-day callback delay. Summaries and delays are editable, with a manual no-AI fallback. Recorded delays do not schedule reminders.

Arabic Asset Studio output initially translated headings while leaving the observation and offer in English. The versioned asset prompt now translates the whole document, preserves original source links/counts and rejects untranslated full source sentences or new visible numbers. A real adversarial design edit requesting “60 percent savings for 50 clients” produced no such claims. The one available observation remains one, with full-width layout. The checks do not establish the meaning of every sentence.

[Before](../../verification/screens/asset-ar-before-2026-10-16.png) and [after](../../verification/screens/asset-ar-after-2026-10-16.png) previews show the actual generated synthetic asset; [the live run report](../../verification/asset-smoke-local-adversarial-2026-10-16.json) identifies its versions. The [Arabic research-brief PDF preview](../../verification/screens/research-brief-ar-2026-10-16.png) instead preserves original source wording on purpose: it is a deterministic internal record export with RTL labels, separate evidence categories and a record fingerprint.

## Remaining checks

The same model both writes and reviews copy, so judgments are correlated. This suite does not measure reply rates, Gulf-native fluency, every source-injection variant or broad industry coverage. Evidence IDs establish traceability, not semantic entailment of every sentence. Add independent reviewers and fresh cases before making quality or business claims. The long-form discovery guide uses a deterministic reviewed-context template, not an unmetered AI request.
