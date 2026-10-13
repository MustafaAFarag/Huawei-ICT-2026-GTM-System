# Implementation status

The active specification is [PRD v3](prd/REVENUE_WORKSPACE_PRD_v3.md); the approved implementation uses Next.js, NestJS, PostgreSQL/Prisma, BullMQ/Redis, Twenty and per-workspace OpenDesign instances.

## Verified foundation

- Pinned Node 24.18.0 and pnpm 12.10.1; reproducible dependency installation.
- PostgreSQL schema/migration and local Redis/Mailpit services.
- Twenty v2.46.0 SDK build and native app installs in two workspaces. Real company/contact CRUD, idempotent retries and CRM workspace isolation pass.
- OpenDesign 0.24.1 image (upstream commit `89e64d813bb1c7a11519b3f668f011f7017637d7`), authentication and separate artifact-volume checks. Its health endpoint reports package version 0.23.1; the verified image/revision is the pin.
- Twenty UI primitives render in Next.js.

## In progress

Six PostgreSQL governance tests and the first complete Playwright workflow pass, including an Arabic sandboxed asset/PDF, reply cancellation and cross-workspace access rejection. Broader failure checks, model/provider activation and Azure Docker/Bicep preparation are in progress.

The implementation contains fixture tools and clearly labelled synthetic results. Real model BYOK validation, sender submission and signal-provider validation require external credentials. No Azure resource or live outreach has been created.

The Python prototype is preserved as a reference. Its historical verification is described in [the review report](../verification/REVIEW.md); it does not verify the new application. Root [TASKS.md](../TASKS.md) tracks current completion and blockers.
