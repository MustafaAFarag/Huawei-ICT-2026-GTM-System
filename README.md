# Revenue Workspace

Next.js and NestJS implementation of [PRD v3](docs/prd/REVENUE_WORKSPACE_PRD_v3.md): four outbound plays, governed workspace tools, persistent assistant history and bilingual assets. Development is local; Azure access and provider sandboxes are pending. The earlier Python demonstrator remains in `gtm/` for reference.

## Local setup

Use project-local Node **24.18.0**, pnpm **12.10.1** and Docker. `mise install` selects the pinned Node version; do not replace the machine's system Node.

```bash
pnpm install --frozen-lockfile
pnpm setup
pnpm infra:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
# Optional upstream services (required for CRM imports and assets):
docker compose --profile engines up -d
pnpm dev
```

Open [the product](http://localhost:3100). Sign in with `DEMO_EMAIL` and `DEMO_PASSWORD` in your private `.env`. Public registration is disabled. Mailpit reset emails appear at [localhost:8026](http://localhost:8026). API documentation is at [localhost:4100/api/docs](http://localhost:4100/api/docs).

`pnpm setup` generates local secrets without printing them. Two product workspaces are provisioned; their Twenty API keys must belong to two separate native workspaces and be configured server-side as `TWENTY_A_API_KEY` and `TWENTY_B_API_KEY`. The upstream UI is at [localhost:3200](http://localhost:3200). Asset engine instances use separate volumes and credentials. Never commit `.env`, engine files, meeting transcripts or customer records.

## Structure

| Directory | Responsibility |
| --- | --- |
| `apps/web` | Next.js interface using Twenty's MIT UI package |
| `apps/api` | NestJS authentication, workspace REST endpoints and OpenAPI |
| `apps/worker` | Separate NestJS/BullMQ durable execution process |
| `packages/backend` | Shared authorization, workflow, provider, storage and vault services |
| `packages/database` | Prisma schema and migrations |
| `packages/contracts` | Validated request contracts and client |
| `twenty-app` | Existing native Twenty app; CRM objects and sidebar components |
| `infra` | Local services and deployment preparation |

Twenty owns CRM companies, contacts and tasks. Product data references native IDs and uses its API; it never writes directly to the CRM database. OpenDesign is unmodified and pinned to `open-design-v0.24.1`. Each product workspace has a separate internal engine and volume.

## Current validation

The local fixture release passes thirteen PostgreSQL/Redis governance checks and three Playwright workflows, including all four plays, CSV/XLSX retries, approval invalidation, reply cancellation, workspace isolation and Arabic PDF export. Native Twenty app installation/CRM writes and OpenDesign token/file isolation use real local upstream services. See [validation](docs/VALIDATION.md), [status](docs/STATUS.md) and [TASKS.md](TASKS.md) for evidence and remaining external checks.

The Docker-packaged product runs at [localhost:3110](http://localhost:3110). [Operations](docs/OPERATIONS.md) covers builds, startup and backup/restore; [the Azure deployment package](docs/AZURE_DEPLOYMENT.md) covers the manual release workflow and required cloud inputs. Bicep compilation is verified locally; Azure deployment and real-service acceptance remain pending.

Fixture mode is explicit: enrichment, assistant suggestions, template generation and sender results are synthetic. It makes no live outbound submission. Paid/model provider validation waits for authorized credentials. Changing `PROVIDER_MODE` does not enable an unverified sender.

## Checks

```bash
pnpm typecheck
pnpm check:links
pnpm check:engines
pnpm twenty:build
pnpm test
pnpm test:e2e
TEST_BASE_URL=http://localhost:3110 pnpm check:roles
TEST_BASE_URL=http://localhost:3110 pnpm check:performance
```

The Apache-2.0 licence covers our code. Preserve [third-party notices](THIRD_PARTY_NOTICES.md). Archived [PRD v1/v2](docs/prd/archive/) retain contracts referenced by v3; [research](docs/research/README.md) records the product evidence. No repository push or deployment is part of local implementation authorization.
