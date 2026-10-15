# Local operations and recovery

## Start and inspect

`pnpm dev` starts web/API/worker at localhost:3100/4100/4101 against local Docker services. The 16 October review instance runs detached with its log at `.local/morning-dev.log` and supervisor PID at `.local/morning-dev.pid`; it remains available while the laptop and Docker stay running. Sign in using `DEMO_EMAIL` and `DEMO_PASSWORD` in private `.env`, then select **Qimam People** to review the synthetic GTM workspace.

Local `.env` currently enables live Azure AI with fixture outbound providers. Use `MODEL_MODE=fixture pnpm dev` for the deterministic browser suite; run `MODEL_MODE=fixture pnpm test` and `pnpm test:e2e` against that fixture instance. Return to `pnpm dev` for live chat/voice. Start only one development supervisor at a time. Activate the pinned Node with `eval "$(mise env -s bash)"` when using a shell that has not loaded mise.

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
