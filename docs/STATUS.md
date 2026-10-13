# Implementation status

The active specification is [PRD v3](prd/REVENUE_WORKSPACE_PRD_v3.md). The approved Next.js/NestJS implementation now provides a verified **local fixture release**. No GitHub push, Azure deployment or live outreach has been performed.

## Verified foundation

- Pinned Node 24.18.0 and pnpm 12.10.1; reproducible dependency installation.
- PostgreSQL schema/migration and local Redis/Mailpit services.
- Twenty v2.46.0 SDK build and native app installs in two workspaces. Real company/contact CRUD, idempotent retries and CRM workspace isolation pass.
- OpenDesign 0.24.1 image (upstream commit `89e64d813bb1c7a11519b3f668f011f7017637d7`), authentication and separate artifact-volume checks. Its health endpoint reports package version 0.23.1; the verified image/revision is the pin.
- Twenty UI primitives render in Next.js.

## Product and governance checks

Four plays provide deterministic qualification, cited research review, enrichment fixtures, bilingual drafts, sender pre-flight and governed sequence simulation/manual CRM tasks. The persistent assistant and product MCP use the same authorization, approvals, budget reservations and durable execution as the UI.

CSV/XLSX mapping and resumable imports, workspace/member caps, resource quotas, suppression, audit history, connector status and labelled mock checkout are implemented. Asset Studio supplies offer one-pager and mini-audit templates, approved-source references, sandboxed previews, PDF exports, versioned draft attachments and native CRM links.

Thirteen PostgreSQL/Redis governance tests and three packaged Playwright workflows pass. Checks include concurrent caps, stale approvals, interrupted/lost jobs, uncertain provider attempts, cancellation, four-play preparation, import retries and delayed workspace switching. Arabic PDF layout has been visually reviewed. [Validation details](VALIDATION.md) distinguish these fixture checks from external-service acceptance.

The Docker migration check succeeds as a non-root user. A product backup was restored into a new scratch database; native engine file snapshots still require a coordinated rehearsal. Bicep compiles and the manual workflow's YAML/Bash and output references validate locally. See [Azure preparation](AZURE_DEPLOYMENT.md) and [operations](OPERATIONS.md).

## Remaining external work

Azure subscription/region/credits and model credentials are required for cloud validation and real BYOK generation. Sender/signal/enrichment accounts are required to implement and verify their remaining live submission, webhook authentication, commercial quota and billing contracts. Internal product credits are not currency billing. Sender submission remains disabled; fixture outcomes are synthetic and labelled.

Native Azure Files compatibility, private networking, regional SKUs, backup/restore and password-reset delivery must be verified after cloud access. Interviews and reviewer/legal inputs remain required before applicable pilots. These are release gates, not completed checks.

The Python prototype is preserved as a reference. Its historical verification is described in [the review report](../verification/REVIEW.md); it does not verify the new application. Root [TASKS.md](../TASKS.md) tracks current completion and blockers.
