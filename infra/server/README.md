# Future single-server target

Prepared only. The application currently runs on localhost. Terraform has not been applied, and this Compose target has not been deployed. Docker Compose parsing and Caddy configuration are checked locally; cloud TLS, disk permissions, restart behavior and networking still need an authorized server rehearsal.

The server will run the same product/native images behind Caddy. Only Caddy publishes public ports. Twenty publishes `127.0.0.1:3200` for an SSH tunnel; database/cache/OpenDesign/API ports are not published. There is one demo environment, not separate testing/staging/production environments.

## Before a later deployment

1. Confirm remaining credits, subscription-specific VM restrictions/quota and cost. Review the compute plan using a real public SSH key and your current IPv4 `/32`. Establish a project-owned remote Terraform backend and a separately scoped deployment identity; the current Reader identity cannot apply.
2. Build all three product image targets locally with pnpm 12.10.1 and tag them with the reviewed full commit SHA. Transfer reviewed images to the host with `docker save`/`docker load`; no registry is required. Verify upstream image digests. Do not rebuild on the 2 vCPU demo server while serving users.
3. After authorized provisioning, confirm cloud-init succeeded. Manually inspect the attached **new empty** LUN 0 data disk (`/dev/disk/azure/scsi1/lun0`), device identity, filesystem signatures and mounted devices. Format only that confirmed new disk; never overwrite an existing filesystem or the OS disk. Mount by UUID at `/srv/revenue-data` using a persistent fstab entry. Refuse to start containers if that mount is absent; bind paths on the OS disk are not an acceptable substitute.
4. Create separate `postgres`, `redis`, `twenty`, `open-design-a`, `open-design-b`, `assets`, `vault` and `caddy` directories on the mounted disk. Set `assets`/`vault` ownership to UID/GID 1000 for the product images. Verify Twenty/OpenDesign image UIDs and grant their directories only the required ownership. Never combine the two OpenDesign directories.
5. Transfer the reviewed repo into `/srv/revenue`, and place a new server-specific private `.env` there with mode 0600. Use fresh secrets, `PUBLIC_HOST`, `ACME_EMAIL`, `IMAGE_TAG`, product owner credentials, engine tokens, and fixture modes. Configure SMTP separately before relying on password reset; localhost Mailpit is not server email delivery.
6. Configure DNS for the selected hostname to the server IP. Start PostgreSQL/Redis/native engines first. Initialize product schema/owner using the reviewed migration script from the API image, then provision native Twenty workspaces/install the app and populate their keys. Start the product services and Caddy only after these checks. The product seed does not create native Twenty API keys.
7. Run Playwright against the public HTTPS URL, verify native-workspace isolation and Arabic PDF export, and rehearse disk/files/database restore before calling the server ready.

From the repo root, the future Compose invocation is `docker compose --env-file .env -f infra/server/compose.yaml ...`. Do not run it until the data disk, secrets and deployment have been authorized. Native Twenty administration uses `ssh -L 3200:127.0.0.1:3200 revenue@<server-ip>`; it is not a public CRM ingress.

The web API proxy leaves `TRUST_AZURE_INGRESS` unset; it discards client forwarding headers and uses the current shared authentication rate-limit bucket. Review per-client rate limiting behind Caddy before a multi-user pilot. Public signup and live providers remain disabled.

## Persistence, recovery and portability

Do not run Compose `down -v`, delete the resource group, wipe a filesystem or disable the Terraform data disk's `prevent_destroy` without a separate reviewed recovery action. Quiesce product and native workers before coordinated PostgreSQL dumps and file snapshots. Back up outside the server, including the secrets needed to decrypt the local vault; a persistent disk alone cannot recover from data loss.

Scale the VM vertically if measured concurrency requires it. The local baseline does not establish cloud throughput or concurrency capacity. No high availability is promised. A Huawei move substitutes ECS/network/disk resources, transfers database/files and reruns compatibility checks while preserving this Compose topology and model/storage/secret interfaces.

## 15 October deployment continuation

The owner subsequently authorized Azure deployment. Terraform created this project's D2as v6 VM, 64 GiB disk, private Docker network and restricted SSH at `4.223.169.93`. A daily 22:00 UTC shutdown has no automatic restart. The disk was verified as a new empty Azure LUN, formatted once, mounted by UUID at `/srv/revenue-data`, and added as a Docker systemd mount requirement. Twenty and OpenDesign use separate persistent directories; synthetic database and engine snapshots were restored from the tested local demo. No real customer exports were transferred.

The full service dependency image was rebuilt locally from the frozen lockfile. A second full source build was cancelled during dependency copying as the host filesystem approached 99% usage (`Canceled: context canceled`). For this unchanged-lockfile/schema release, [Dockerfile.source-update](../docker/Dockerfile.source-update) reuses that verified image, checks the inherited lockfile and Prisma schema, and copies the reviewed source plus `.node-version`. That marker is also fixed in the full Dockerfile so the local vault resolves under `/app` in fresh builds. Do not use the source-update path to change dependencies or database schema.

```bash
docker build --build-arg SERVICE_IMAGE=revenue-api:local -f infra/docker/Dockerfile.source-update --target api -t revenue-api:gtm-20261015 .
docker build --build-arg SERVICE_IMAGE=revenue-api:local -f infra/docker/Dockerfile.source-update --target worker -t revenue-worker:gtm-20261015 .
```

Use the base image ID recorded in validation for this release; a mutable local tag alone does not establish matching dependencies. Private server environment and SSH keys are stored only under ignored `.local`, and Terraform state remains local/ignored. No GitHub workflow or repository push was performed.
