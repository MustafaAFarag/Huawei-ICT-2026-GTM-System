# Local operations and recovery

## Start and inspect

The current source serves web/API/worker at localhost:3100/4100/4101. Development processes were stopped after the unattended verification; existing Docker volumes and private `.env` were preserved. After laptop startup, run:

```bash
eval "$(mise env -s bash)"
docker compose --profile engines up -d
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Sign in using `DEMO_EMAIL` and `DEMO_PASSWORD` from private `.env`; choose **Qimam People**. Review Accounts → saved research brief, discovery interview guide and call log; Review queue → fresh drafts and due scheduled reviews; Plays → recurring review settings; Asset Studio → approved PNG/PDF export. Unapproved copy remains held.

Local `.env` retains `MODEL_MODE=live` and `PROVIDER_MODE=fixture`. Stop the live development process before starting `MODEL_MODE=fixture pnpm dev` for deterministic browser tests. Run `MODEL_MODE=fixture pnpm test`, then `pnpm test:e2e` against that fixture instance; return to plain `pnpm dev` for live AI. Never run two development supervisors against the same ports. The API and worker use plain `tsx` rather than watch mode: restart `pnpm dev` after backend or prompt changes; only Next.js hot-reloads frontend edits. The private unattended launcher wrote `.local/morning-dev.log` and `.local/morning-dev.pid`; those are operational artifacts, not a boot-time service.

Two additive migrations (`20261016000100_import_history`, `20261016000200_scheduled_reviews`) are applied locally. A future cloud deployment must rebuild **all** product images and run migrations before starting the matching API/worker; the old deployed build is unchanged. The prior source-only image update procedure requires an unchanged schema and does not apply to this update.

Recurring schedules prepare reviews only, without credit reservation or execution. Due occurrences require a fresh manual cost review. Catch-up creates at most one pending review per schedule; revoked creators and malformed legacy schedules pause with an explanation. Schedules are bound to the worker queue namespace.

PNG exports use private storage keyed by the approved HTML digest. Identical requests coalesce, only one new render runs per API process, and a competing render returns HTTP 503 for retry. Scripts/network are disabled. An approval/source change during rendering holds the download, including a revoke-and-reapprove cycle over unchanged source facts. Internal interview/research PDFs are read-only record exports and do not spend AI credits.

For the production images:

```bash
for app in api worker web; do
  docker build -f infra/docker/Dockerfile --target "$app" -t "revenue-$app:local" .
done
docker compose -f compose.yaml -f compose.product.yaml --profile product up -d api worker web
TEST_BASE_URL=http://localhost:3110 pnpm test:e2e
```

The packaged product is at localhost:3110; its API binds localhost:4110. Database credentials and API tokens come from private `.env`, never from images. Product images run as the non-root `node` user. The worker's `/health` checks PostgreSQL and Redis. API `/api/health` checks PostgreSQL; engine checks are explicit so a provider outage does not restart otherwise healthy API replicas.

PostgreSQL is the durable run source. The worker reconstructs queued BullMQ jobs when Redis loses them. Execution uses leases and heartbeats; interrupted provider execution fails for human reconciliation and retains reserved cost conservatively instead of blindly repeating calls. A request key reuses its original run and cannot silently change its input. Inspect recent run errors and next actions in the product, then approve a fresh action after resolving the issue.

## Back up

Pause new requests and stop product workers before taking a coordinated snapshot. Run `node scripts/backup-local.mjs` from the project root. It creates private `.local/backups/<timestamp>/` files: PostgreSQL custom dumps for product and CRM, product assets/vault archives and the local environment needed to decrypt connector credentials. Copy the directory to encrypted storage outside this machine; local copies alone are not a disaster-recovery strategy.

For a full engine backup, also quiesce Twenty and both OpenDesign instances and snapshot **each named persistent volume separately**. OpenDesign's SQLite files must include a consistent database/WAL snapshot. Keep the two engine volumes separate. The script deliberately reports that these native file volumes are not included.

The current Azure target is one Docker server with a separate persistent disk. Back up both PostgreSQL databases, product assets/vault and each native engine directory in a coordinated snapshot to storage outside the server; retain the matching decryption secrets and image digests. There is no managed PostgreSQL point-in-time recovery or automatic Blob/Files backup in this minimal target. Cloud disk mounting, retention and restore must be rehearsed before a pilot. See [the future server runbook](../infra/server/README.md).

## Restore safely

Restore first into a **new scratch database and isolated asset directories**, not over an existing workspace:

```bash
docker compose exec -T postgres createdb -U revenue revenue_restore_check
cat .local/backups/<timestamp>/revenue.dump | docker compose exec -T postgres pg_restore -U revenue --no-owner --exit-on-error -d revenue_restore_check
docker compose exec -T postgres psql -U revenue -d revenue_restore_check -c 'SELECT count(*) FROM "Workspace";'
```

Point a separate API/worker pair at the restored database, use a distinct `QUEUE_NAME`, and restore the matching encryption secret and file archive. Keep outbound disabled. Verify memberships, native record links, suppressed contacts, run events and an approved PDF before selecting a restored environment for service. Database/schema changes and any overwrite of existing data require a reviewed recovery action.

## Portability

Models, object storage, secrets and providers sit behind adapters. A Huawei move also needs PostgreSQL extension compatibility, Redis/BullMQ behavior, database and file transfer, native Twenty/OpenDesign storage validation, identity/secret conversion, Arabic render checks and the same isolation/governance browser suite. Configuration changes alone do not establish compatibility.
