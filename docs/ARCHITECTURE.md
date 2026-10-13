# Implementation architecture

Approved 13 October 2026. PRD v3 is the product specification; the owner's implementation instruction authorizes local development, installs, tests and focused commits. No push, deployment or live outbound is authorized.

The Next.js application is the product interface. Its same-origin API proxy forwards cookies to NestJS; it does not implement separate business rules. Better Auth sessions and product membership are validated in NestJS. Twenty service credentials never reach the browser. The default demo has two separately bound CRM workspaces, not public registration.

NestJS modules implement imports, company context, plays, evidence, drafts, approvals, assets, sender readiness, connectors and usage. The worker invokes these same services through BullMQ. PostgreSQL persists job intent, state, steps, events, versioned approvals, suppression and budget reservations. A transactional outbox bridges durable records and queue submission; Redis is not the sole record of work.

Twenty owns CRM records. We extend it through the app SDK and API; we never query or mutate its private database. Product records retain workspace and native record references. Any CRM mutation failure is visible and retriable; reconciliation uses idempotent source identifiers.

OpenDesign is isolated per demo workspace, behind a private API wrapper with a distinct token and volume. Use the BYOK API path, never spawn a coding-agent CLI. A browser render worker exports approved artifacts and stores them through the product storage adapter. HTML previews are sandboxed and do not execute with application privileges.

The product MCP server exposes typed task-level tools through the same policy services as REST. Every action validates session, membership, role, budget and approval. Retrieved text is untrusted data. The native Twenty assistant is evaluated first; a custom product chat shell is the documented fallback if a published integration cannot satisfy these boundaries.

Local development uses Docker PostgreSQL, Redis, Twenty, OpenDesign and Mailpit, with local product file storage. Azure uses Container Apps, PostgreSQL, Managed Redis, Blob Storage, Files and Key Vault. Twenty's local-storage driver uses persistent Files; our assets use Blob Storage. Huawei migration requires a tested data transfer and provider compatibility verification.

Libraries, services and image references are pinned. Preserve the prototype until workflow parity is verified. Live services require external credentials; fixture mode stays visibly simulated.
