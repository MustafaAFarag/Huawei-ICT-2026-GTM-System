# Local release validation — 13 October 2026

This record covers the local fixture release. Provider/model generation, sender outcomes and checkout are simulated; Twenty/OpenDesign API integration, PostgreSQL, Redis and Chromium PDF rendering are real local services.

| Check | Evidence and limit |
| --- | --- |
| Reproducible install | Node 24.18.0, pnpm 12.10.1, frozen lockfile install passes |
| Static checks | Workspace type checks and local Markdown target checks pass |
| Governance/recovery | 13 tests against PostgreSQL/Redis: roles/isolation, concurrent caps and quotas, stale grants, idempotency, uncertain attempt charging, interrupted execution, lost Redis jobs, raw SQL serialization conflicts and duplicate/out-of-order events |
| Browser | 3 Playwright tests against the production web/API/worker containers: four plays, bilingual assets/PDF, review invalidation, native CRM, cancellation/isolation, mapped XLSX retries and deliberately delayed workspace switching |
| Viewports | Desktop, 1024 px and 390 px widths; narrow layouts have no horizontal overflow |
| Asset isolation | Separate engine authentication/files; restrictive CSP and sandboxed iframe; unapproved PDF export returns 409 |
| Arabic PDF | Real container Chromium/Noto font rendering; the generated PDF's text and layout were visually reviewed |
| Permissions | Viewer reads/writes, operator approval restriction, forged body role, revoked membership, disabled registration and discarded forged client-IP headers checked through HTTP |
| Secret boundary | Private environment values absent from checked web, membership, dashboard and OpenAPI responses; private `.env` absent from the image filesystem |
| Docker | All three product targets build and run as UID 1000; API/web/worker health checks pass; Prisma migration status runs without root privileges and reports five current migrations |
| Restore | Product dump restored into a new scratch database; 2 workspaces, 6 prospects and 5 assets matched the source snapshot. Native file volumes were not part of that rehearsal |
| Azure package | Bicep compiles; workflow YAML/embedded Bash parse and deployment output references match. Subscription validate/what-if/deploy have not run |

CSV/XLSX verification uses small synthetic files; imports are bounded to 1,000 rows and persist retry outcomes. Large-file throughput and cloud request timeouts need a separate benchmark before a pilot.

Packaged sequential fixture measurements at localhost:3110 recorded dashboard p50/p95 16/30 ms (20 samples) and durable job acknowledgement 18/76 ms (10 samples). The earlier development baseline was 23/44 ms and 22/44 ms respectively. These exclude models, external providers and PDF rendering and do not establish production throughput. All three packaged browser tests pass in 38.1 seconds, including the complete four-play workflow with synthetic data; this is not real-provider onboarding acceptance.

## Issues found and resolved during packaging

- The stopped development server initially returned `net::ERR_CONNECTION_REFUSED` at localhost:3100; verification moved to the packaged localhost:3110 app.
- Twenty's worker failed with `Reached heap limit Allocation failed - JavaScript heap out of memory`; its local allowance was increased to 1.5 GiB with a 1 GiB Node heap. Azure prepares 2 GiB for that worker.
- Next.js replaced asset CSP with the general `frame-ancestors 'self'` policy; the proxy now preserves the upstream sandbox policy. The browser assertion caught this regression.
- An approval test fetched its PDF before approval finished and received 409; it now waits for the approval response. The server correctly held the export.
- The service image initially omitted the shared TypeScript configuration and failed with `Parameter decorators only work when experimental decorators are enabled`; it now includes that configuration.
- pnpm startup tried to repair root-owned dependencies and failed with `ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR`; runtime dependency verification is disabled inside the already installed, frozen-lockfile image. Non-root startup and migration status pass.
- Prisma reported `Can't write to /app/node_modules/.pnpm/@prisma+engines@7.10.0/node_modules/@prisma/engines`; the final-platform engine is now cached and checked at image build time.
- A latency probe returned `Acknowledgement returned 500`; PostgreSQL raw-query serialization conflicts surfaced as Prisma `P2010` with SQL state `40001`. Bounded retries now recognize that adapter form, and a real concurrent-update test plus 30 acknowledged fixture jobs pass.
- Repeated validation sign-ins reached the authentication limit (`Sign-in failed (429)`). Checks respect the cooldown; rate limiting remains enabled.

The current local service builds reuse an OS-only Chromium/fonts layer, excluding old application/sample files, after a clean OS-package download stalled. The application dependencies and production web are built from the pinned lockfile. A fresh cloud-runner OS download still needs reliable package mirrors; no Azure build/deployment is claimed.

Run the checks using the commands in [README](../README.md) and [operations](OPERATIONS.md). Private logs, traces, PDFs, backup secrets and test credentials remain under ignored `.local`/test-output paths.
