# Implementation status

The active specification is [PRD v3](prd/REVENUE_WORKSPACE_PRD_v3.md). The approved Next.js/NestJS implementation now provides a verified **local fixture release**. No GitHub push, Azure deployment or live outreach has been performed.

## 15 October 2026 update

The UI uses a Raycast-derived design system (dark/light, Arabic RTL, command palette) split into components. Eight synthetic demo workspaces cover every plan tier and the agency model. The assistant runs on a real Azure model through our own harness with governed tools, streaming and voice dictation; OpenDesign generates assets through the same Azure deployment. 21 unit/integration and 6 browser tests pass; live results are in [validation](VALIDATION.md).

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

The Docker migration check succeeds as a non-root user. A product backup was restored into a new scratch database; native engine file snapshots still require a coordinated rehearsal. The historical Bicep package compiles; it has been superseded by single-server Terraform and a manual validation/plan-only workflow. See [Azure preparation](AZURE_DEPLOYMENT.md) and [operations](OPERATIONS.md).

## Remaining external work

The student subscription, human Owner access, separate project Reader identity and GitHub OIDC settings are verified. Terraform schema/safety checks and a human-authenticated read-only cloud plan are checked locally; GitHub's OIDC exchange remains unexecuted because no code was pushed. Remaining credits, actual VM capacity and model credentials/inference remain cloud activation gates. Sender/signal/enrichment accounts are required to implement and verify their remaining live submission, webhook authentication, commercial quota and billing contracts. Internal product credits are not currency billing. Sender submission remains disabled; fixture outcomes are synthetic and labelled.

The current target uses one Docker server rather than Azure Files or managed databases. Server disk permissions/mounting, TLS/networking, regional capacity, coordinated backup/restore and password-reset delivery still require verification before a cloud pilot. Interviews and reviewer/legal inputs remain required before applicable pilots. These are release gates, not completed checks.

The Python prototype is preserved as a reference. Its historical verification is described in [the review report](../verification/REVIEW.md); it does not verify the new application. Root [TASKS.md](../TASKS.md) tracks current completion and blockers.
