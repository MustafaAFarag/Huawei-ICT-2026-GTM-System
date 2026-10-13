# Reviewed Azure demo package

The Bicep template compiles locally. Subscription validation, region/SKU availability, prices, private networking, upstream Azure Files compatibility and real model calls remain unverified until Azure access exists. No cloud resources have been created.

## Required inputs and first setup

Supply subscription/tenant/client identity, resource group, reviewed region, credits and an existing ACR. Register the App, PostgreSQL, RedisEnterprise, Storage, Network, KeyVault, ManagedIdentity and OperationalInsights resource providers. The deploying identity needs resource creation and role-assignment permission within the reviewed scopes. Use GitHub OIDC federation for the `azure-demo` environment and configure required reviewers.

Copy [the parameter template](../infra/azure/parameters.example.json) into the private GitHub environment secret `AZURE_DEPLOY_PARAMETERS`. Supply generated strong passwords/tokens and the selected registry/region. It contains secure infrastructure inputs and must never be committed. Define environment variables `AZURE_REGISTRY`, `AZURE_RESOURCE_GROUP`, `AZURE_PREFIX`, `DEMO_EMAIL`, and secrets `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`, `DEMO_PASSWORD`. The demo password must match the provisioning parameter. Use an immutable reviewed commit SHA for `image_tag`.

Default modes are fixtures. Model access is a separate parameter; keep `modelMode=fixture` until the chosen compatible model endpoint, per-call price, authorization and spend accounting are reviewed. Sender submission stays disabled in this package. Public registration is disabled; the migration job provisions the owner and two product memberships.

Cloud password-reset delivery also needs a reviewed SMTP connection. Local Mailpit delivery does not establish Azure email delivery; keep demo account provisioning under the owner until that connection is configured and tested.

Web ingress discards client-supplied IP forwarding headers and passes only the rightmost address supplied by Azure ingress in a private header to the internal API. Better Auth uses that header for rate limiting. This follows [Azure's header contract](https://learn.microsoft.com/en-us/azure/container-apps/ingress-overview); validate the deployed path before accepting it as a cloud check. Local ingress uses a shared authentication bucket, so repeated test logins must respect its cooldown.

## Package behavior

The [manual workflow](../.github/workflows/deploy-azure.yaml) builds pinned images, validates the concrete parameters, prints an Azure what-if, deploys only after its explicit confirmation input, waits for the migration/provisioning job and runs Playwright against the deployed URL. GitHub environment approval is the external release gate. A failed migration or browser check fails the workflow; it does not claim the deployment is healthy. Do not invoke it until deployment is authorized.

The [main template](../infra/azure/main.bicep) prepares:

- External web ingress and internal API, worker, Twenty and isolated OpenDesign A/B apps.
- A workload-profile Container Apps environment and private PostgreSQL/Redis/Blob/Files/Key Vault networking.
- Separate product and CRM databases; required native PostgreSQL extensions.
- Managed Redis with `NoCluster`, `NoEviction`, encrypted traffic and AOF persistence; BullMQ uses database zero and a product queue namespace.
- Blob assets, three separate persistent Azure Files mounts for native Twenty and the two asset engines, managed identity access, Key Vault secret references and Log Analytics.
- A manual migration/seed job. API and worker health probes are independent of external models/sender accounts.

For this demo, both databases use the bootstrap PostgreSQL administrator. Separate least-privilege database users/grants must be configured and verified before using customer data or enabling a pilot. Runtime identity also has connector-secret write access. Review its scope and the native engines' identities before broadening beyond two isolated demo workspaces.

## Native-workspace bootstrap

Provision two native Twenty workspaces and install the deployed app package through Twenty's API/SDK. Native workspace/API keys are **not** manufactured by our product seed. Since Twenty is internal, use an authorized administrative connection within the VNet (VPN/jump host or a reviewed temporary admin ingress) for its UI/SDK. Keep OpenDesign internal. Store the two resulting workspace keys in Key Vault and redeploy the secret references, then check CRM connections in the product.

A first deployment without native keys will intentionally fail the full workflow checks at CRM import. Complete native provisioning and rerun validation; do not treat initial infrastructure provisioning as release acceptance. The local installation rehearsal is recorded in [integration decisions](INTEGRATION.md).

## Validation and recovery

After provisioning, run the full four-play browser suite at the Azure URL, with the private demo credential injected into the runner. Verify two-workspace isolation, role restrictions, Arabic PDF fonts, queues after restart, persistent engine files and asset access. Measure app API/job-acknowledgement latency separately from model/provider/render time. Validate the chosen model's actual BYOK path and account billing separately; fixture results are not model evaluation.

Review logs through the workspace UI and Log Analytics; never enable request-body, authorization-header or secret-value logging. Rehearse database point-in-time restore, Blob version restore and separate Azure Files snapshots with the matching secrets/images before a live pilot. See [operations](OPERATIONS.md). Roll back to a reviewed image digest only when schema compatibility is established; avoid automatic destructive schema rollback.

The pnpm migration rule requires a local Docker build before deployment. The manual workflow has no Vercel/Dokploy dependency. GitHub publication and cloud deployment remain separate authorized actions.
