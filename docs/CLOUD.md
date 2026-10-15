# Cloud readiness — 16 October 2026

The project-only Azure demo is deployed at [Revenue Workspace](https://gtm-4-223-169-93.sslip.io). The VM is currently stopped by its nightly schedule; restart it manually for remote access. Its public verification is tracked in [validation](VALIDATION.md). Azure OpenAI supplies real chat, drafting, transcription and OpenDesign generation. Outbound providers and payments remain simulated.

| Capability                                             | Current state                                                                                                   |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Tenant, student subscription, isolated human Owner CLI | Verified; default company CLI unchanged                                                                         |
| Project boundary                                       | `rg-gtm-command-center-demo`; no changes to Amr's resources                                                     |
| Compute                                                | Allocated Sweden Central D2as v6, 2 vCPU / 8 GiB                                                                |
| Persistence                                            | Separate 64 GiB disk mounted by UUID; Docker requires its mount                                                 |
| Network / TLS                                          | Product HTTPS through Caddy; SSH restricted to administrator `/32`; databases and engines private               |
| Terraform                                              | Two boundary tests pass; apply created 10 resources, changed/deleted none                                       |
| Operating window                                       | Daily shutdown at 22:00 UTC; restart manually                                                                   |
| Models                                                 | Project Azure OpenAI resource; live inference verified; native Arabic review pending                            |
| Budget                                                 | Amr confirmed credits; USD 50/month project alert, not a hard spending stop; balance not independently measured |
| Data / engine restore                                  | Synthetic product and Twenty databases, assets, vault and separate OpenDesign snapshots restored                |
| GitHub OIDC                                            | Reader federation configured; exchange unexecuted, no repository push                                           |
| Live outbound / provider sandboxes                     | Disabled / unavailable                                                                                          |
| SMTP, HA, production disaster recovery                 | Not claimed                                                                                                     |

Use [Azure deployment](AZURE_DEPLOYMENT.md), [Terraform](../infra/terraform/azure/main.tf), [server runbook](../infra/server/README.md) and [operations](OPERATIONS.md). Runtime source updates reuse the locally built dependency base only after lockfile/schema checks; full dependency or schema changes require the full image build. Private state, keys and raw logs remain ignored.

The historical managed-service Bicep target is retained as reference. A Huawei migration substitutes cloud resources and rehearses database/files/secret transfer and provider compatibility; Terraform does not translate services automatically.
