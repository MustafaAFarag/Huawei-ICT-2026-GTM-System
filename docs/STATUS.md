# Implementation status — 16 October 2026

The active specification is [PRD v3.1](prd/REVENUE_WORKSPACE_PRD_v3.md), with a matching [PDF](prd/REVENUE_WORKSPACE_PRD_v3.pdf). **The full PRD is not complete.** This unattended run adds locally tested features and improves measured output quality; the deployed Azure build has not been updated. No repository push, new deployment or live outreach occurred.

Start the current local build at [localhost:3100](http://localhost:3100) using [the restart instructions](OPERATIONS.md#start-and-inspect). Development processes are stopped after verification; Docker data and private configuration are preserved. Local `.env` retains live Azure AI and simulated outbound providers. The [Azure demo](https://gtm-4-223-169-93.sslip.io) is an older build on a VM stopped by its nightly schedule, with manual restart.

The new local features are:

- Assistant/UI refinement: safe Markdown for saved and streamed chat; viewport-bound chat/navigation; account detail sections below evidence; translated role labels and isolated mixed-script names/counts. Explicit screen/account/document commands open immediately with a visible target cursor. The open one-pager stays beside chat, accepts grounded AI revisions through the cost review, and offers approval/download in the preview. Each revision preserves its source asset and starts unapproved.
- Arabic PDF correction: explicit paragraph direction and isolated Latin/numeric runs in generated and legacy asset previews/PDF/PNG exports; cached exports use normalized content, and PDF exports now repeat the approval/source check after rendering.

- Import history: per-filename revisions, previous-version links, row counts and field-level before/after changes, with pagination and workspace isolation.
- Recurring play reviews: durable schedules create due review items; a person reviews current scope and cost before each paid step. Missed occurrences collapse into one review. Pause, resume, dismiss and role-revocation handling are implemented.
- Discovery guides: eight role-specific HR discovery questions, English/Arabic preview and printable PDFs; preparing a guide creates no answers or scores.
- Research briefs: English/Arabic PDF layouts and JSON from the saved account record. Reviewed dated facts, unverified hypotheses and unknowns stay separate; original source wording is preserved. Unsaved source edits hold the UI export.
- PNG export: approved assets render through an isolated browser with source-change checks, private content-addressed caching and bounded concurrency.
- Call logging: manual fallback, editable summary/delay, workspace-local date context and stale-suggestion protection. Confirmed opt-outs persist and cancel active sequences before CRM sync; a CRM failure is shown separately.

The assistant now reads actual draft text and saved run states, returns explicit search batches and uses stronger versioned instructions for citations, language, action scope and cost proposals. Generated drafts/assets record their model and prompt versions. Arabic assets translate observations and approved offers while preserving original links; checks reject missing RTL, untranslated source sentences and unsupported numerical values. Draft checks preserve the supplied recipient name and reject new digit-based numerical claims. These checks do not prove semantic entailment or native dialect quality. [Research 12](research/12-output-quality-and-prompt-engineering.md) contains before/after outputs, primary sources and measured limitations.

The settled Raycast-derived interface remains in place: dark/light themes, Arabic RTL, command palette, bilingual messages and print assets. Eight synthetic workspaces cover all five plan tiers and the agency model; Demo A/B retain independently tested native CRM bindings. Real customer exports remain ignored and absent from runtime images. Existing triage, duplicate exclusion, balanced assignment, discovery capture, draft confidence, launch checklist, references and SDR PDF remain available.

Sender, enrichment/signal providers and checkout remain fixtures. Remaining acceptance work includes CRM field merging, LinkedIn connection/acceptance telemetry, automatic SDR-kit delivery on joining, Letter/PPTX export, broader play chains, native Arabic review and real provider pilots. SMTP/password-reset delivery, high availability and full native-engine disaster recovery are not claimed. Executed checks and exact remaining limits are in [validation](VALIDATION.md).

Azure still uses one 2 vCPU / 8 GiB VM and a separate 64 GiB data disk, with private PostgreSQL, Redis, Twenty and two OpenDesign engines behind authenticated HTTPS. Daily shutdown is 22:00 UTC, manual restart. **Two new additive migrations were applied locally; all product images must be rebuilt and those migrations applied before a future deployment.** Do not use the old source-only image-update shortcut after schema changes. See [deployment](AZURE_DEPLOYMENT.md).

GitHub OIDC exchange remains unexecuted because code has not been pushed. Terraform state, credentials and native engine files stay ignored. The Python prototype and unrelated sample CSV edits are preserved. [TASKS.md](../TASKS.md) records the work.
