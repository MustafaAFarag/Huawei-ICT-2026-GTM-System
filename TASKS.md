## Next — implementation start (handoff 17 October 2026)

Design, positioning (PRD v3.2) and logo are done; none is in the app yet. Start a new session from `docs/handovers/2026-10-17-implementation-start.md`: proposed slices 1–8+ (logo in app first, then the A3/A8 fixes, A1, A2, A4, A5, A6, then the UI redesign page by page). Ask the owner which implementer lane to use.

---

## Current — Caravan logo concepts (17 October 2026)

Goal: 3–5 logo concepts plus a recommendation. Done: five concepts generated, small-size test, brand board for the recommended one. Stop: concepts only; no app, Figma or repo asset changes yet.

- [x] Research (two Sonnet 5.5 High subagents): logo process, AI-logo clichés, bilingual lockups, image-model prompting, IP limits.
- [x] Deployed `gpt-image-2-5-sunburst` (gpt-image-2.5-sunburst, GlobalStandard, capacity 1) on project resource `aoai-gtm-command-center-demo` (Azure for Students). 6 calls, 18,932 output image tokens; about USD 0.60 at the published USD 30 per 1M rate (Azure price unconfirmed).
- [x] Five concepts × 2 variants and one brand board in ignored `.local/logo-gen/out/`; labelled sheet `.local/logo-gen/concepts-labelled.png`. Owner chose A "Route C" (17 Oct): the mark doubles as the C in the "Caravan" wordmark and suits animation. Raw AI output; final mark must be redrawn as vector in Figma before use (copyright and consistency).
- [x] Vector logo system. The Claude Personal Figma task failed before doing any work: `Claude API rate limit reached. Try again later.` Main agent built it instead as exact SVG geometry: `docs/brand/route-c/` (17 SVGs, spec, generator, animated preview). Checked renders, favicon at 16/32 px, mono knockouts and the intro animation in a headless browser.
- [x] Figma page "13 Logo · Route C" (node 52:14): components and 7 frames built, verified as native vectors, geometry matches spec.json, IDs in `.local/logo-gen/figma/state.json`.
- [x] Applied Route C to Figma pages 00–12 (Lara, 17 Oct, 316 turns, USD 9.66): 28 direct swaps, which reach 207 logo spots through the shared sidebar components. Used wordmark Colour and Reversed, lockup-arabic, lockup-horizontal (sign-in) and lockup-bilingual (cover). Qimam People customer logos skipped on purpose. 209 PNGs in `.local/logo-gen/figma/apply/`, log in `apply-state.json`. Spot-checked the cover, sign-in, home, dark, Arabic and Arabic phone frames.
- [ ] Next: native Arabic review; trademark search.

Blocker (17 Oct): Lara headless run (Opus 5.5 High, connectors enabled, no relay because the relay disables connectors) stopped before any Figma call. Its claude.ai Figma connector reports "require authentication", and OAuth cannot run non-interactively. Fix: open `claude-lara` interactively and authorise Figma (`/mcp`), then rerun `.local/logo-gen/lara/brief.txt`. No Figma or repo changes were made; cost USD 0.65.

Rerun after the owner re-authorised Figma: built page "13 Logo · Route C" with 7 frames (wordmark, construction, lockups, colour/mono, app icon and favicons, animation storyboard, usage), and PNGs are in `.local/logo-gen/figma/`. The run then hit `You've hit your session limit · resets 3:40pm (Africa/Cairo)` after 93 turns (reported cost USD 5.85). `state.json` was not written. The 17 SVGs went through Figma's upload endpoint with `scaleMode=FILL`, so whether the logo is native vectors or SVG image fills is unverified. Next: after the reset, confirm vector nodes, write state.json, check the geometry numerically.

Verification pass (17 Oct, Lara, 11 turns, USD 1.40, no Figma changes): 0 image fills; all logo and icon components are VECTOR groups. On `logo/mark` Colour `63:744`: stroke 14, waypoint centres (38.371, 18.05), (16, 50), (38.371, 81.95), terminal (76.046, 71.855) Ø21, all equal to spec.json. Overflow: 3 non-clipping cases. One is a round stroke cap in 00 Components (4.7 px); two are deliberate 13g "don't" examples (stretch 11.3 px, shadow 7.8 px). `state.json` written.

---

## Current — Figma v3.2 account follow-up flow (17 October 2026)

Goal: add the agreed v3.2 purpose, pages and flow (PRD D22, PK-01, SCR-01, CMP-01/02, GAP-07, EXP-01, STU-09) to Figma file `XQYMm6aLF8AVUAFje7CpuK`.
Done: new design page with 12 screens plus states, phone and Arabic views; connected walkthrough start "Account follow-up (v3.2)"; cover purpose updated; bounds/link checks and screenshots reviewed.
Stop: design only. No app code, push or deploy; synthetic data; existing frames kept.

- [x] Claude Personal Opus 5.5 High builds in Figma (this Skylink session has no Figma connector; owner chose Personal). 17 design frames plus 12 walkthrough copies; 115 and 104 links, 0 invalid.
- [x] Main agent reviews screenshots and links, then updates `docs/design/figma-redesign-delivery.md` and commits locally. Fix round 1: stale cover copy, duplicate label, account consistency. Fix round 2: clipped Arabic profile footer.

---

## Current — Lara Opus positioning and PRD debate (17 October 2026)

Goal: debate Caravan’s positioning, initial ICP and PRD/feature gaps with the explicitly requested Lara Claude Opus 5.5 at High effort.
Done: independent challenge, evidence-backed rebuttal and second review; documented final recommendation, unresolved objections and scoped PRD/feature amendments with acceptance criteria.
Stop: strategy/documentation only. No application/Figma changes, outreach, paid project-model calls, deployment or push; no private source contacts in reports. Preserve unrelated CSV edits and avatar archive.

- [x] Round 1: independently challenge the current ICP, differentiation and PRD. Brief in ignored `.local/positioning-debate/round1-result.md`; recommends B2B service exporters as category with HR-services first.
- [x] Rebut and verify disputed implementation/market claims; send the original context and disagreements in a fresh second-round task. Rebuttal in `.local/positioning-debate/main-rebuttal.md`: transcript does name HR services (transliterated), operator is in-house; legal country gates already exist; practitioner advised founder-led teams under ten. Round 2 (fresh reviewer) accepted most points, rejected two schema proposals and found the `EG` country default.
- [x] Consolidate positioning, evidence confidence, PRD amendments and feature priorities in `docs/research/16-positioning-debate-and-prd-amendments.md`; validate documentation and commit locally. Owner approved all; A1–A8 applied as PRD v3.2 (D22, PK-01, EXP-01, STU-09, amended SCR-01/PB-01/GAP-04/07/12/CMP-01/02/05/SEQ-08, cost wording). No app code changed; the SDR-kit "every cost" text in `gtm-service.ts` is left for implementation.

Outcome: category = small B2B services firms selling across borders; first cohort = founder-led Egypt HR-services firms selling into the GCC, trigger-defined (first BD/SDR hires), at most five BD people; public verb "follow up", not "outreach". Open: cohort boundary (1–3 hires vs up to 5); derived-data deletion deferred to N until the Saudi consultation closes 5 November 2026. Reviewers were Opus on the Skylink account, not Lara.

Blocker: T3 rejected the first `delegate_task` before creating a task: `This account is at 86% of quota. Stop implementation on it and shift to an account under 80%.` Requested target was `claude-lara`, `claude-opus-5-5`, effort `high`. No child task ID was created. Asked the owner to choose Claude Personal (10% weekly used) or wait for Lara; do not bypass the gate or substitute an account silently. The round-one brief is prepared.

Recheck after owner reported the blocker should be off: capabilities advertise Lara as runnable with no constraints, but an actual `delegate_task` retry still returns the same 86% quota rejection. No task was started by that retry either.

Resumed in a Claude Skylink Opus session (17 October 2026). Lara retry rejected again before task creation: `This account is at 87% of quota. Stop implementation on it and shift to an account under 80%.` Owner decision: run the reviewer as a native Claude Opus 5.5 High subagent on the Skylink account instead. Same model and effort; not an independent account. Round 1 started on that basis.

Handoff requested by owner: stop here; owner will start the debate in a new session. Full context, next steps and evidence are in `docs/handovers/2026-10-17-positioning-debate.md`. No new session was launched and no debate consensus is claimed.

---

## Current — evidence-led initial ICP (17 October 2026)

Goal: choose Caravan’s strongest initial ideal customer profile using the supplied GTM workflow files and current public market/customer evidence without depending on unavailable buyer interviews.
Done: explicit primary buyer, user, job, qualification/exclusion rules, comparison with alternatives, cited public examples and honest evidence/confidence boundaries; no invented Caravan customers or purchasing intent.
Stop: research/documentation only. No outreach, account creation, paid calls, app/Figma changes, deployment or push. Keep private contact data and source identities out of committed research.

- [x] Re-examine private source structures and anonymised workflow patterns: 40 files, 160-row validation workbook, four owner labels, 106 bilingual records and documented follow-up/profile states. Preserve original source files and contact privacy.
- [x] Verify public customer adoption, relevant service providers, workflows and buyer constraints. First-party regional SDR responsibilities, service catalogues and labelled vendor case studies support the recommendation; exact budgets/purchase intent remain unknown.
- [x] Recommend the initial ICP, positioning and implementation priorities in `docs/research/15-initial-icp-evidence-case.md`, with six public company examples in the companion CSV. Check links/CSV and review the documentation diff before local commit.

Recommendation: initial focus on Egypt-based HRO/payroll providers selling to GCC employers with a small BD team. Recruitment-only agencies are adjacent for employer acquisition; general outbound agencies are a later channel/segment. This is a research-backed starting decision, not an assertion of Caravan customers or product-market fit; no interview dependency blocks the decision.

---

## Current — Caravan business and implementation audit (17 October 2026)

Goal: compare the implemented product with the supplied Anthropic Founder’s Playbook and primary Alex Hormozi material; identify what obstructs a clear customer promise and a measurable lead-to-sales workflow.
Done: source-backed, prioritised findings with implementation evidence, current-versus-proposed boundaries and a practical validation plan.
Stop: audit/documentation only. No application/Figma changes, live outreach, paid model calls, deployment or push.

- [x] Read the supplied 36-page PDF and primary Hormozi offer/niche checklists and training indexes; disclose inaccessible downloads and unwatched embedded videos.
- [x] Trace current onboarding, targeting, research, outreach, replies, outcomes and reporting in source and tests. Four local read-only checks reproduce the current scoring/domain/enrichment limits; five existing discovery/copy tests pass.
- [x] Review findings against counterevidence; publish source-backed priorities, current/proposed boundaries and pilot decision gates in `docs/research/14-caravan-business-implementation-audit.md`.

Decision: recommendations only; existing tiers, chat/Asset Studio direction and outbound safeguards remain unchanged. Operator workflow evidence exists, but paid demand, retention and live acquisition outcomes were not established by the inspected material. No claim that evidence outside the repository does not exist.

---

## Current — Figma redesign and Brand book flows (17 October 2026)

Goal: recreate and improve the app's pages in an editable Figma draft, with a coherent chat-first workflow, clearer hierarchy and a Brand book flow for generation, PDF/PPTX upload or website extraction.
Done: page/state inventory, current UI evidence, connected redesigned screens and key task flows in a reviewable Figma draft; desktop, narrow and Arabic layout rules included.
Stop: hold application code changes. No push, deployment or implementation of the new Brand book feature during this design pass.

- [x] Audit eight main screens, six Settings sections, account detail/tabs, a saved flipbook and narrow/Arabic views; map create/review/outreach journeys. Preparation in `docs/design/figma-redesign-brief.md`; current-state captures/measurements in `.local/figma-audit/`.
- [x] Restore Figma tools and create a new draft: https://www.figma.com/design/XQYMm6aLF8AVUAFje7CpuK . Foundations, light/dark variables and reusable components created.
- [x] Design the app shell and all eight existing main destinations, account/import details, six Settings sections, Brand book setup/review and every deliverable format. 92 screen/state layouts, plus organized foundations and a linked walkthrough.
- [x] Review hierarchy, scrolling, overlays, responsiveness and RTL. Native-layer bounds checks pass on all 92 walkthrough frames; no invalid navigation targets. Six explicit journeys pass, including all three brand entry paths. Key desktop, phone, Arabic and dark views visually inspected. Delivery links and limitations in `docs/design/figma-redesign-delivery.md`.
- [x] Restyle the introduction as `00 The Cover`: editorial masthead, serif cover story, warm paper palette and editable brand-book artwork. Preserve all three walkthrough links; check native-layer bounds and visually inspect the final cover. Application code remains on hold.

Decisions: retain Caravan/Nabil and chat as the main entry. Brand book accepts a website, PDF/PPTX or a short generation brief; extracted/proposed identity is reviewable before use.
Access: restored after reconnection. Owner requested a new draft. File `XQYMm6aLF8AVUAFje7CpuK` belongs to the single connected Student plan. Design scripts/state live in ignored `.local/figma-redesign/`; application code stays unchanged. Inter is available; IBM Plex Sans Arabic is unavailable in Figma, so the draft uses an explicitly documented Noto Sans Arabic fallback.
Evidence: populated demonstration workspace has 170 accounts, 12 drafts and 32 deliverables. Accounts content measured 10,632px and review 12,940px at 1440×900; phone review 13,821px at 390×844, without document horizontal overflow. Delivered paginated lists, focused review, task views and the visual identity board in Figma. The walkthrough has 1,143 navigation actions and four start points; UI is native text/vectors/components. Its only raster content is the existing Nabil avatar. No application source changes, paid model generations, push or deployment. The prototype simulates core journeys; forms, filtering and downloads are illustrative.

---

## Current — immediate assistant actions and unobtrusive progress (16 October 2026)

Goal: finish the interrupted auto-run change, replace the blocking run panel with progress in chat, and contain long deliverable headings.
Done: reviewed local diff, backend governance checks, typecheck and browser verification in EN/AR at desktop/tablet/phone widths; focused local commit.
Stop: no push, deployment or live outbound. Preserve sample CSV edits and avatar archive.

- [x] Complete backend auto-run and consistent prompts; preserve caps and outbound review.
- [x] Connect run events, inline progress and result opening; remove the obstructing run panel.
- [x] Fix canvas title sizing, composer context truncation and email grid sizing; verify EN/AR, dark/light at 1440/820/390px and the sibling Accounts route.
- [x] Local typecheck; full backend suite 96/96, followed by 7/7 targeted assistant checks including a new cap rejection case; 7 browser scenarios pass, with a final 2/2 rerun for immediate execution and responsive deliverables. Reviewed the diff and phone screenshots; focused local commit.

Decisions: assistant actions start immediately through existing credit reservations; sending still requires reviewed drafts and launch gates. Progress is attached to saved chat messages and refreshes after reload. No live model spend or external changes.
Verification note: the first full test run had the old budget fixture fail because queued work now reserves credits, plus scheduling errors `Transaction failed due to a write conflict or a deadlock` and `Scheduled review not found.` Reset the isolated budget fixture and reran with the local maintenance worker stopped: 96/96 passed. Restarted the local app in fixture mode. Logs/captures: `.local/immediate-*.log`, `.local/ui-refinement/immediate-*.png`.


---

## Current — Caravan + Nabil: chat-first shell, artifacts, new deliverables (started 16 October 2026)

Goal: rename to Caravan; chat-first home with the Nabil assistant (Strobi avatar), threads, floating launcher, artifact canvas; HTML email (Outlook/Gmail), Instagram/LinkedIn carousels and flipbook deliverables; rewritten prompts evaluated on a stronger Azure model; Linear-style density pass.
Done: typecheck, backend tests and new Playwright scenarios pass in EN/AR, desktop/phone, dark/light; live eval compares gpt-5-4-mini with Sol inside USD 10; focused local commit per phase.
Stop: no push, deploy or real outbound; Azure changes limited to new model deployments on this project's resources; paid eval stops at USD 9 estimated. Preserve `samples/*.csv` edits.

- [x] Phase 1: brand rename, Nabil avatar, threads, Claude-style shell, chat-first home, floating launcher. Thread tests 4/4; live EN thread + launcher checked in browser.
- [x] Phase 2: conversation UI, streaming Markdown (memoized blocks), composer, step rows, copy/retry/thumbs, deliverable cards.
- [x] Phase 3: artifact canvas (document/email/slides/flipbook viewers, versions, approve, exports) and Linear-style Deliverables list with format tabs.
- [x] Phase 4: format registry; Gmail/Outlook emails (both audits clean), Instagram ZIP, LinkedIn PDF, flipbook; gmail-safe-email skill; 8 format tests. Live IG carousel generated, approved and exported in browser.
- [x] Phase 5: Nabil system prompt + per-format prompts; gpt-6-1-sol deployed; deliverables Sol 10/10 grounding 5.0 vs mini 4.1; agent 30/30 both; metered USD 1.60 (research 13).
- [x] Phase 6: density pass (metric strip + play list, Settings sub-nav, account detail tabs, collapsible import, flat sections, DESIGN.md §10).
- [x] Verification: typecheck; 87/87 backend tests (fixture); 15/15 Playwright (3 new Nabil scenarios: thread persistence + safe Markdown, launcher context/Esc/expand/RTL position, canvas carousel/email/flipbook); EN/AR, desktop/phone, dark/light captures in `verification/caravan-*.png`.

Decisions: product Caravan, assistant Nabil (owner, 16 Oct). Deliverables on gpt-6-1-sol, chat on gpt-5-4-mini (research 13). Model writes content JSON; trusted templates own markup. Workspace switch keeps the current screen.
Open: owner email/carousel examples to tune templates; Free-plan "Made with Caravan" mark not yet on new formats; no Stop-button e2e (needs a slow stream); native Arabic review. Keep `@revenue/*` scope and `revenue-*` storage keys. Build email/carousel templates from researched defaults; owner sends examples later.
Blockers: Claude Opus 5.5 needs Anthropic Marketplace organisation details (industry, organisation name, country) on the new Foundry resource `aif-gtm-command-center-demo`; owner decision. Exact error in research 13.

---

## Current — assistant actions, readable chat and bilingual output (16 October 2026)

Goal: fix screenshot-reported chat/layout/bidi defects and let the assistant navigate records and revise the viewed one-pager visibly.
Done: safe Markdown in saved/streaming chat; viewport-bound side panels; isolated mixed-script names and PDF text; scoped assistant navigation with visible target feedback; existing-asset revisions through the cost review, saved as a new unapproved asset; EN/AR browser and PDF checks; focused reviewed local commits.
Stop: no push, deployment, real outbound, destructive changes or unrelated sample edits.

- [x] Readable Markdown and compact, bounded EN/AR shell/account layout.
- [x] Mixed-script PDF/preview fixes and bilingual labels/names.
- [x] Context-aware assistant tools for navigation, saved draft lookup and asset revision.
- [x] Local backend/browser/live-model checks, output inspection and self-review: 75 backend checks, 14 browser scenarios, final focused 5-browser/5-backend reruns, typecheck and a real six-credit Arabic asset revision pass. Focused local commit prepared; no push or deployment.

Decisions: preserve the existing visual design. Show real allowlisted product actions with a brief cursor/highlight; avoid unrestricted browser execution. AI asset edits create a separate unapproved version and keep existing cost/source/role controls.
Blockers: none currently.

---

## Completed — two-hour output quality and PRD continuation (16 October 2026)

Owner instruction: work unattended until scheduled laptop shutdown in two hours; research prompt engineering, inspect outputs, adjust prompts and implement useful remaining features. Start 23:12 UTC; target wrap-up 00:55 UTC (shutdown margin).
Goal: improve measured assistant/draft output quality and close locally verifiable PRD gaps.
Done: sourced research notes; before/after live outputs with prompt versions; completed feature slices tested locally in EN/AR; reviewed focused commits; current app and handoff available before shutdown.
Stop: no push, deployment, real outreach, new cloud infrastructure or changes to unrelated resources. Preserve sample CSV edits and existing data. Keep current Azure model/account. Mark incomplete requirements honestly.

- [x] Research first-party OpenAI/Anthropic prompt, tool and evaluation guidance; linked collection inspected as an unverified third-party index. Research and full synthetic before/after outputs recorded in research 12.
- [x] Capture baseline and improve prompts/tool context: agent 29/30 → 30/30; draft hard checks 4/12 → 12/12. Added grounded source links, explicit 100-ID batches, saved-draft/run reads and enforced channel contracts. Chat Arabic judge mean regressed 4.0 → 3.4 in this sample; native review remains open.
- [x] Build bilingual discovery interview guide/questionnaire export: role-specific questions, reviewed source context, JSON preview and EN/AR PDFs; 15 targeted checks and browser flow pass. Fixed the language selector accessible name found by Playwright.
- [x] Expose import history and per-file row outcomes: filename versions, added/changed/unchanged counts, field diffs, legacy entries, pagination and tenant isolation. Four service tests and both continuation browser flows pass; additive migration applied locally.
- [x] Add recurring play reviews: persisted schedules, due review queue, fresh human cost review, one execution key per occurrence, pause/resume/dismiss, role revocation and restart catch-up. Five service checks and all three continuation browser scenarios pass. Scheduled work pauses for cost approval; it does not automatically run paid steps.
- [x] Add approved PNG export with source-change guards, content-addressed cache, bounded/coalesced rendering and download feedback. Two PNG service tests pass; all 53 backend tests and all 10 browser scenarios pass on this checkpoint.
- [x] Evaluate 12 unseen non-HR drafting cases: 12/12 automated checks pass. Translate whole Arabic assets, require original source links, reject new visible numeric claims, and record prompt/model versions on runs. Real Arabic output and adversarial invented-results edit inspected.
- [x] Improve call logging: workspace-local dates, versioned classification prompt, editable summary/delay, manual no-AI fallback and stale-suggestion protection. Confirmed opt-outs persist and cancel active sequences before CRM calls; CRM failure remains visible. Backend checks pass; live classification 9/12 baseline → 12/12 revised prompt on synthetic cases.
- [x] Add a bilingual account research brief export (DES-02): dated reviewed facts, hypotheses and unknowns separated, original wording preserved, safe PDFs and unsaved-edit holds. Targeted tests and browser checks pass.
- [x] Final checks: typecheck, 67 backend tests, 12 browser scenarios, HTTP permissions and engine isolation pass. Fresh live chat/voice and EN/AR saved drafts pass; Arabic assets/PDFs and EN desktop/AR phone captures inspected. PRD/status/research/runbook updated; final diff/secret/link review and focused commits complete. Development processes stopped; restart instructions saved.

Decisions: prioritize working behavior and factual output over cosmetic refinement. Provider sandbox activation stays blocked by missing external accounts. Native Arabic acceptance remains human work.

---

## Current — verified local review instance (16 October 2026)

Goal: resume the interrupted run, leave the current app running locally, verify its main flows and finish the saved validation notes.
Done: localhost:3100 serves the current source; sign-in and local workflow checks pass; preserved cloud evidence/backup checked; current status and limitations recorded; reviewed local commits.
Stop: no push, new deployment, live outreach, deletion of existing data or changes to unrelated resources.

- [x] Start web/API/worker against preserved local database and engines; localhost:3100, live AI and fixture outbound.
- [x] Verify local workflows, service health, typecheck, 33 backend tests, 7 browser tests, HTTP roles and engine isolation. Local live chat/voice smoke passes; no unapproved runs.
- [x] Inspect saved production evidence and interrupted backup completion: public browser 4/4, live AI smoke pass, agent eval 30/30; backup checksums/catalogues/archive and restart log pass.
- [x] Update validation/status, review diffs and commit completed work. EN desktop and AR phone captures pass without overflow or page errors.

---

## Completed — unattended run: PRD v3.1 features, Azure deployment, evals (started 15 October 2026, evening)

Owner instruction (15 Oct): work unattended; deploy on Azure, build the PRD features, test, evaluate and verify.
Goal: ship the D-phase v3.1 features (GAP-02/03/04/06/13/14, then D+ GAP-07/10/09/11/12/01), deploy the app to the single Azure server, and verify it in production with Playwright and the eval suites.
Done: features implemented with tests; typecheck, unit and e2e suites pass locally; app reachable on Azure over HTTPS with demo data; Playwright and AI smoke pass against the production URL; docs and PRD status updated; focused local commits.
Stop: nothing leaves for the remote repository, no live outbound sending, no changes to Amr's resources, no destructive DB operations outside the project; keep spend inside the USD 50 budget alert; stop and record if Azure capacity or credits block the VM.

- [x] Features: dedupe, triage, angle/register, launch gate, owners, event-claim check.
- [x] Features D+: scorecard, confidence score, references, SDR kit, discovery pilot, import diffs. Limits: duplicate field merge, automatic kit delivery and generated interview guides remain open.
- [x] Azure deploy: VM via Terraform, images, compose, TLS, seed.
- [x] Production verification: 4 public Playwright scenarios, EN/AR AI/voice smoke and final 30-case agent eval pass; off-server backup intact.
- [x] Docs, PRD status, commits; public results and local live review verified on 16 October.

---

## Active — Raycast design, MENA demo data, real AI harness and voice (started 15 October 2026)

Goal: replace the ad-hoc UI with a Raycast-based design system, learn the real GTM process from `GTM Files/` (structure only) and seed 8 synthetic demo workspaces covering every tier, extend the PRD, and run the assistant and voice dictation on real Azure models.
Done: new design in EN/AR, desktop/phone, dark/light and PDF; deterministic seed with no real PII; PRD v3.1; streamed governed assistant on Azure; Whisper EN/AR dictation; tests pass; screenshots and live smoke results recorded.
Stop: no push, deployment, live outbound sending, or changes to Amr's other Azure resources.

- [x] Phase 0: real GTM files and meeting files ignored.
- [x] Phase 1: Raycast DESIGN.md copied, product design system, tokens, component split, Arabic UI/RTL, print template; 3 e2e pass; 52 screenshots reviewed.
- [x] Phase 2: research 11 teardown, deterministic 8-workspace seed (169 accounts, 324 contacts, 149 people in Twenty A), no-leak test, PRD v3.1.
- [x] Phase 3: Azure OpenAI (GPT-5.4 mini, GPT-4o transcribe, Whisper, TTS test) via separate Terraform root; own harness with versioned prompts, governed tools, streaming, metering; voice dictation and voice call outcomes; OpenDesign BYOK on Azure with edit instructions and brand-from-URL; agent eval 28/30, WER eval. Twenty-side MCP client not available in 2.46 (AI-06 open).
- [x] Verification: 21 unit/integration, 6 e2e, live chat/voice/asset smoke, Terraform validate/plan/apply, own diff review, commits.

Decisions: Raycast style (owner, 15 Oct). Own harness on Vercel AI SDK Core. Azure provisioning and real inference approved by owner; credits confirmed by Amr (replaces the earlier $100 assumption). Real files read for structure only.

---

## Active preparation — isolated Azure connection and Terraform (14 October 2026)

Goal: prepare this project's Azure connection and a single-server Terraform target while verifying the complete application on localhost.
Done: local governance/CRM/engine/browser checks pass; Terraform validates; isolated OIDC settings are configured or exact access blockers recorded; cloud/model prerequisites have verified/unverified status; reviewed changes committed locally.
Stop: no GitHub push, application deployment, model provisioning, paid inference or live outbound. Never modify/delete resources used by Amr's other projects.

- [x] Isolated Azure/GitHub CLI authentication; verified session creation, zero calls, no connections/deployments or resource references; removed only the two session-created Foundry resources. Existing three resources and shared groups preserved.
- [x] Project-only group and Reader OIDC identity configured for `azure-demo`, main branch only; metadata variables verified; subscription/model/policy/quota inventory recorded. Default company CLI sessions preserved.
- [x] Restarted preserved local services; 13 governance and 3 packaged browser tests, type checks, Twenty build/CRM isolation, OpenDesign and HTTP role checks passed. Sampled memory peak 2.81 GiB; dashboard/job acknowledgement p95 19/26 ms.
- [x] Single-server Terraform and server Compose prepared; pinned Terraform/AzureRM and lockfile; two safety tests and Azure read-only plan (9 additions, no changes/deletions) passed. Old deployment workflow retired.
- [x] Region/model/credit readiness and operations documented; own diff reviewed; local/static checks passed. Final Terraform checks passed; prepared for the local feature commit.

Decisions: assume $100 credit (remaining balance unverified); localhost now, one 2 vCPU/8 GiB x86 server later, one environment; no Front Door by default; use separate project resources and never reuse Amr's Terraform state storage. Keep provider/model modes fixture. Tenant `3f5648ce-ad7c-46b5-8dfb-ddcbf48520af`; subscription `55336c1c-af74-4164-b687-a7b7c3ec740c`. Preserve unrelated sample CSV edits and default company CLI sessions.
Historical blockers (14 Oct): selected Sweden Central D2as v6 has no listed SKU restrictions and 10 family/total vCPUs available; actual allocation remains untested. Remaining credit/offer eligibility and live models remain unverified. GitHub OIDC execution waits for an explicitly authorized push.

---

## Previous implementation — Revenue Workspace (13 October 2026)

Goal: implement the approved Next.js/NestJS December release from PRD v3.
Done: a verified local fixture release with four plays, governed assistant/tools, isolated Twenty/OpenDesign, durable jobs and bilingual assets; local browser/integration checks pass and the Azure deployment package is reviewed. Real providers/models and Azure validation remain external gates.
Stop: before push, Azure deployment, live outbound or unapproved external spending.

- [x] Foundation: archive links, licences, pinned Node/pnpm, installed dependencies, PostgreSQL migration and local services.
- [x] Native integration and assistant spike documentation complete; App installs in both workspaces pass. Workspace A app install and real CRM CRUD/retry pass; two-workspace CRM isolation passes. OpenDesign auth/file isolation and Next.js UI primitives pass; real BYOK model call waits for credentials.
- [x] Backend/workers, workspace policy, persisted cost approvals and atomic reservations; thirteen real PostgreSQL/Redis governance and recovery tests pass.
- [x] Product screens, persistent fixture assistant and Asset Studio: all four plays, bilingual drafts/PDFs, native CRM links, approval invalidation, cancellation and isolation pass against the packaged application.
- [x] Local release verification and deployment package: three packaged Playwright tests, mapped XLSX retries, delayed workspace switching, HTTP permission checks and non-root migration checks pass. API/web/worker containers are healthy; Bicep compiles and manual workflow syntax/output references pass. Product backup restore rehearsed. Packaged fixture dashboard p95 30 ms; job acknowledgement p95 76 ms.
- [ ] External activation: validate Azure networking/storage/restore, real model/BYOK generation, and remaining live-provider submission/webhook/billing contracts when accounts and deployment authorization are available.

Decisions: Next.js owns the UI; NestJS owns product policy; Twenty owns CRM records; OpenDesign is isolated per workspace; our code Apache-2.0. pnpm 12.10.1. Preserve the Python prototype and unrelated sample edits.
External blockers: Azure access, sender/provider sandboxes, reviewer/legal inputs before live pilots.
Environment: Node 24.18.0 is already installed through mise; system default is Node 22. Docker and npm registry access work. Earlier documentation's sandbox errors no longer describe this environment.

---

# GTM Campaign Command Center

> **Current product direction:** [Revenue Workspace PRD v3](docs/prd/REVENUE_WORKSPACE_PRD_v3.md) (13 Oct 2026). v2 and v1 are kept as history.

## Current task — PRD v3 from owner decisions + second research round (started 2026-10-13)

Goal: apply the product owner's 13 Oct answers to the v2 proposals; research the latest Huawei rules, freemium pricing, market data, building blocks (incl. Agent-Reach) and non-technical user pain; write PRD v3 with the full feature catalogue.
Done when: reports 06–10 exist with sources; key claims spot-checked; PRD v3 written (decisions, competition rules, business model, plays, Asset Studio, architecture, pushback, plan, catalogue); pointers updated; committed locally.
Stop: documentation only. No code, provisioning, outreach, credit-spending calls or push.

- [x] Record owner decisions (memory + PRD v3 §1).
- [x] Research (5 Sonnet subagents): 06 Huawei 2026–27 rules, 07 pricing/freemium, 08 market data, 09 building blocks + Agent-Reach, 10 user pain + out-of-box.
- [x] Spot checks: 2026–27 Manual quote (PDF), Northern Africa topic page (browser), Agent-Reach / linkedin-mcp-server READMEs, n8n and Twenty licences, OpenDesign release.
- [x] Write PRD v3; supersede notes on v2 and report 05; README/STATUS/PRD README/research README pointers; `.playwright-mcp/` ignored.

- [x] Owner follow-up (13 Oct): Azure is the December demo placeholder, Huawei only if we pass; December = PDF only; project is open source; pricing used now; LinkedIn needs no crawling before December; assume 2023–24 rubric. PRD v3 updated and competition-rules detail moved out of the PRD (kept in research 06).

Decisions settled 13 Oct (owner): English default + Arabic content; freemium with §4.2 tiers in use; full catalogue kept, outbound loop first; Azure placeholder until December, Huawei migration only if we pass; open source (open core); LinkedIn as channel with no crawling, lower-risk data method chosen later; team eligibility confirmed; no Lara follow-ups; OpenDesign Asset Studio is a major pillar; compliance gates in.
Next (needs the owner): build instruction to start the 13–19 Oct items in PRD v3 §11; names for 5–10 interviews; sandbox accounts (sender, signal provider).

## Previous task — PRD v2 from Lara meeting + deep research (2026-10-12)

Goal: turn the Lara meeting (actual GTM process) and web research into an updated, challenged PRD.
Done when: five research reports exist in `docs/research/` with sources; PRD v2 written with the meeting's process, connector layer, AI role, pushback and changed decisions flagged for the user; v1 kept as history; README pointers updated; committed locally.
Stop: documentation only. No code, provisioning, outreach, credit-spending tool calls or push.

- [x] Read transcript, PRD v1 and meeting analysis PDF.
- [x] Research (5 Sonnet subagents): 01 GTM process + AI, 02 competitors, 03 connectors/APIs, 04 MENA market/regulation/Arabic AI, 05 Huawei ICT competition + cloud.
- [x] Verify research reports: spot-checked Huawei brief, Egypt PDPL, Saudi draft, Saudi benchmark, Twenty RTL. One correction made in report 04 (Saudi Art. 28 consent already in force).
- [x] Write `docs/prd/archive/REVENUE_WORKSPACE_PRD_v2.md`; update PRD README, v1 supersede note, README/STATUS pointers; commit.

Next (needs the user): confirm D1–D12 in PRD v2 §1; answer §11 open questions (roster eligibility, Saudi reviewers, sandbox accounts, Lara follow-ups, legal opinion); get the 2026–27 rulebook and Egypt dates from Huawei Egypt.

Decisions reopened by the meeting and research (proposed in PRD v2 §1, need user confirmation): English-only → Arabic content + English UI; users → founder-led teams 1–10 and small agencies (solopreneurs = free tier); all-modules scope → outbound loop first; Azure demo → Huawei Cloud demo path (ModelArts MaaS, OBS, ECS).

## Previous documentation task — Revenue Workspace PRD v1

- [x] Write the expanded English-only PRD with 112 feature requirements and acceptance criteria.
- [x] Define persistent assistant context/navigation/actions, Twenty reuse and OpenDesign integration.
- [x] Define phase gates and all phases on Azure / conditional post-qualification Huawei migration.
- [x] Review feature coverage, Markdown tables, local links and documentation-only changes.
- [x] Complete documentation; no application changes, provisioning, deployment or outreach.

## Historical prototype work

Goal: implement the supplied Eight-week MVP plan in an isolated product directory.
Full done criteria: native Twenty workflow in two client workspaces; approved-evidence bilingual campaigns; four OpenDesign assets; reconciled exports/execution events; independent held-out AI evaluation on verified compute; rehearsed success and exception paths.
Stop: no deployment, live outreach or push without separate authorization.

## Implemented and verified local slice

- [x] Persistent client-scoped import/evidence/offer/campaign/action/event state machine.
- [x] Arabic/English review interface, client offers/brand editing, all three sequence touches visible for approval.
- [x] Four editable isolated HTML assets, deterministic QR, actual-record charts, bilingual CSV/XLSX and provider preparation fixtures.
- [x] Duplicate/exclusion/approval/collision/reply/failure acceptance coverage and own-diff review.
- [x] 48 local tests; 16 Playwright replay mutations; six tabs × two directions × desktop/phone; offline preview and Arabic Chromium print checks.
- [x] Twenty objects/relations/role/sidebar/native read-only overview source; TypeScript syntax and metadata structure checked.
- [x] Synthetic 80-pack / 480-empty-label scaffold, rules/embedding/reranker predictors and bounded training/evaluation entry points.
- [x] Sample deliverables, run guide and explicit implementation/verification limitations.

## Unfinished full-plan requirements

- [ ] Actual Twenty SDK build/install; native campaign mutation UI, existing contact/task mapping and workspace permission tests.
- [ ] OpenDesign release pin/runtime/full token guard.
- [ ] Curated company packs, independent reviewers/adjudication and held-out neural/retrieval/generation evaluation.
- [ ] ModelArts region/compute/model verification (Azure fallback if needed).
- [ ] Approved provider capability checks and paused live draft if an account becomes available.
- [ ] Running-server transport verification outside the socket-restricted environment.

Blockers: npm `EAI_AGAIN registry.npmjs.org`; Docker API permission denied; Node 22.23.3 vs Twenty's 24.5+ prerequisite; server socket `PermissionError: [Errno 1] Operation not permitted`; model weights, human labels and approved cloud/provider accounts unavailable.
Decisions: original synthetic fixture data; transparent ranking/template baselines; preserve source facts vs offer hypotheses; never report invented AI gains; provider events always simulated; stand-alone loopback demo is not production authentication or a deployed Twenty application. Bravo6 preserved.

### Resume — 15 October, Codex

- [x] Recovered feature commit and unfinished UI; baseline typecheck and 30 tests pass.
- [x] Completed account triage/owner/duplicate views, discovery capture, draft confidence and copy checks.
- [x] Added launch checklist, event scorecard and segment discovery summary, consented reference editing and SDR PDF download.
- [x] Enforced blocking copy checks at the approval API, in addition to queue-time checks.
- [x] Regression tests, bilingual responsive browser verification and review; final local 33 backend/7 browser checks pass.
- [x] Container build and Azure deployment assessment; project deployed and public checks pass; no repository push.

Decision: preserve the settled Raycast visual direction and unrelated sample CSV edits. New panels use existing workspace loading/error/success handling, with cancellation guards for async reads.

- [x] Added opt-in balanced contact assignment with per-member contact caps; tested cap exhaustion before CRM calls.
- [x] Reviewed EN/AR desktop and phone captures; mechanical UI detector returned no findings.
- [x] Terraform validates and both boundary tests pass; reviewed 10-addition project-only plan adds daily 22:00 UTC shutdown. Apply started; local state stays ignored.
- [x] Docker build context now excludes private GTM exports and Terraform state/variables.
- [ ] Final full-suite rerun after shared-module resolution fix; document remaining partial acceptance criteria rather than claiming all PRD features complete.
- [x] Final local typecheck + 33 tests; seven browser scenarios verified (separate suite runs); feature commit `418fbfe`.
- [x] Fresh live eval baseline 27/30; versioned prompt revision 29/30. Remaining `act-01` scoring-intent failure explicitly recorded; Arabic model-judge 3.8/5 is not native-speaker approval.
- [x] Azure compute apply: 10 additions, no changes/deletions; VM `4.223.169.93`, separate new 64 GiB disk mounted by UUID, mount requirement added to Docker service, daily shutdown at 22:00 UTC. Twenty healthy; synthetic product/engine restore underway.
- [ ] Final images, HTTPS app start, public Playwright and live smoke, operational docs.
- [x] Found and fixed the runtime root marker omission in the service Dockerfile: copy `.node-version` so local vault paths resolve under `/app`, including on the server. Final service images will include and verify this marker.
- [x] All three current product images built locally; API/worker source-update builds enforce unchanged lockfile and schema. Runtime root/UID/prompt/private-file checks pass.
- [x] Removed only this run's cancelled dependency-copy cache and obsolete private context cache to recover local Docker disk space; no global prune or unrelated cleanup.
- [x] Public HTTPS obtained; app health endpoint reachable.
- [x] Public checks caught and repaired API PDF/chat memory pressure (512 MiB → 1 GiB), required-nullable live draft schema, and blank audio API-version fallback. Local real-model drafting/transcription check and all 33 backend tests pass.
- [x] Added a harness correction for historical quote claims without a fresh quote; repeat live evaluation and production checks required for the new prompt.
