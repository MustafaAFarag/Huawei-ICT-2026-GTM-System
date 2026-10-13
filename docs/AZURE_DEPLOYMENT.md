# Azure preparation — 14 October 2026

The application remains local at [localhost:3110](http://localhost:3110). The active cloud target is one Docker server defined in [Terraform](../infra/terraform/azure/main.tf), with [server Compose](../infra/server/compose.yaml) and [Caddy](../infra/server/Caddyfile). The previous `infra/azure` Bicep package is historical reference; its deployment workflow has been removed. No application server, model deployment, paid inference, registry or remote Terraform state has been created.

## Connection and project boundary

| Setting                | Verified value                                                         |
| ---------------------- | ---------------------------------------------------------------------- |
| Directory              | Default Directory (`amrmedhatamer20gmail.onmicrosoft.com`)             |
| Tenant                 | `3f5648ce-ad7c-46b5-8dfb-ddcbf48520af`                                 |
| Subscription           | Azure for Students, `55336c1c-af74-4164-b687-a7b7c3ec740c`             |
| Human access           | Owner; project CLI signed in as `mustafa.ashraf.saad@gmail.com`        |
| Project resource group | `rg-gtm-command-center-demo`, West Europe                              |
| Connection identity    | `gtm-demo-github-plan`                                                 |
| Client ID              | `df30a1e8-6682-4816-9b68-840ecc0bb71d`                                 |
| Identity permission    | Reader at this resource group only                                     |
| Repository             | `MustafaAFarag/Huawei-ICT-2026-GTM-System`                             |
| GitHub environment     | `azure-demo`, restricted to branch `main`                              |
| Federation             | `repo:MustafaAFarag/Huawei-ICT-2026-GTM-System:environment:azure-demo` |

The federation issuer is `https://token.actions.githubusercontent.com`, audience `api://AzureADTokenExchange`. Environment variables `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` and `AZURE_RESOURCE_GROUP` are configured. They are identifiers, not credentials. There is no client secret. The human Owner identity is distinct from the read-only workflow identity.

The GitHub repository is public and had no default branch when inspected. Code has not been pushed. The workflow's real GitHub OIDC exchange has therefore **not run**. Do not claim CI authentication is tested until an explicitly authorized push makes the workflow available.

Azure CLI uses ignored `.local/azure-cli`; GitHub CLI uses `.local/github-cli`. Default company CLI configurations were preserved. To authenticate this project again:

```bash
AZURE_CONFIG_DIR="$PWD/.local/azure-cli" az login --tenant 3f5648ce-ad7c-46b5-8dfb-ddcbf48520af --use-device-code
GH_CONFIG_DIR="$PWD/.local/github-cli" gh auth login --hostname github.com --git-protocol https --web
```

Answer **No** to changing Git's credential helper if preserving the machine's existing setup. The idempotent [connection setup script](../scripts/azure-project-setup.py) creates only the tagged project group, Reader identity, federation and environment settings; it refuses mismatched ownership/account/trust settings. It does not register providers or deploy anything. [Preflight](../scripts/azure-preflight.py) reads metadata, quotas and policies, and records exact failures in ignored `.local/azure-preflight.json`.

### Narrow Foundry cleanup

Foundry's sign-in onboarding unintentionally created `mustafaashrafsaad-3280-resource` and child `mustafaashrafsaad-3280` in **Amr's** `bravo6ciam-rg`. Both were verified as created by our signed-in account at 21:32 UTC on 13 October, with unchanged modification times, zero API calls, no model deployments, no connections/private endpoints, and no references from the other resources. Only these two resources were deleted after explicit authorization. Cognitive Services may retain a soft-deleted account; no purge was performed.

The before/after inventory preserves `bravo6ciam.onmicrosoft.com`, `NetworkWatcher_westeurope`, and `terraformstateeprofile`. All existing resource groups were preserved. Do not reuse Amr's `terraform-rg` storage backend, import his resources into our state, delete a shared group, or change subscription-wide permissions/policies.

## Terraform validation and future server

Terraform is pinned to **1.15.8**, AzureRM to **5.9.0**; the provider lockfile is committed. Automatic resource-provider registration is disabled. The connection-owned group/identity stay outside the compute state; Terraform reads and verifies the group's project tag.

```bash
terraform -chdir=infra/terraform/azure fmt -check -recursive
terraform -chdir=infra/terraform/azure init -backend=false -lockfile=readonly
terraform -chdir=infra/terraform/azure validate
terraform -chdir=infra/terraform/azure test
```

[The manual workflow](../.github/workflows/azure-plan.yaml) runs these offline checks. Its optional `cloud_plan` job logs in with OIDC and only plans. It has no apply, destroy, image push, migration or deployment commands, and uploads no state/plan artifacts. Public SSH key and administrator IPv4 `/32` are required for a real plan. Example addresses/keys are placeholders and must not be deployed.

The future compute plan contains one Ubuntu 24.04 x86 VM (`Standard_D2as_v6`, 2 vCPU/8 GiB baseline in Sweden Central), a 32 GiB OS disk, protected 64 GiB data disk, one VNet/subnet, NIC, firewall and public IP. SSH accepts only the administrator's `/32`; public web accepts 80/443; other inbound traffic is denied. No availability zones/sets, managed PostgreSQL/Redis, Container Apps, Kubernetes, Front Door, ACR, Key Vault or AI resource is provisioned by this target.

Cloud-init installs Docker and hardens SSH; it does **not** format data disks, fetch code, embed secrets or start the app. Use [the server runbook](../infra/server/README.md) only after later deployment authorization. PostgreSQL, Redis, Twenty and OpenDesign persist on the data disk; the product uses its local file/vault adapters. Native CRM administration uses an SSH tunnel. APIs and databases are private to Docker.

B2ms was marked `NotAvailableForSubscription` in West Europe, North Europe, Sweden Central and Central India. B2as v2 and D2as/D2s v5 in Sweden Central were rejected because their family quotas are 0. The selected **D2as v6** is x64 / 2 vCPU / 8 GiB, has no listed SKU restrictions, and has 0 used / 10 allowed family and total regional vCPUs. No quota increase or account upgrade was needed. Actual allocation remains untested.

Local plans/state and CLI tokens remain ignored; use `umask 077` for plan/state files. Local state is temporary for preparation. A separate project-owned remote backend and least-privilege deployment identity must be reviewed before any apply. Reader permission cannot deploy. The data disk has `prevent_destroy`; this is not a backup.

## Credit and AI readiness

Assume **$100 credit**; actual remaining balance is **unverified**. The sponsorship portal returned “This account does not have an active Sponsorship.” Subscription cost 0.00 does not establish credit balance. Amr's billing account/profile owns the offer; credit eligibility, expiry and live charges need verification there before paid usage.

The public [Azure Retail Prices API](https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices) returned **$0.097/hour** for Linux D2as v6 in Sweden Central on this check: about **$70.81 for 730 compute hours**, excluding disks, public IP, bandwidth, tax and AI. This is a retail estimate, not Amr's bill or confirmation of free-tier eligibility. Continuous hosting would consume most of $100 quickly. Keep localhost now; later deallocate compute between demo sessions, remembering that disks/public IP can continue billing. Front Door stays absent because it has a [base fee](https://learn.microsoft.com/en-us/azure/frontdoor/billing).

Azure AI can serve the product gateway and OpenDesign's BYOK text/HTML generation. The current product does not automatically gain image generation, speech, OCR/search, tool integrations or a fully live conversational assistant merely by connecting Azure.

Existing `MODEL_BASE_URL`, `MODEL_ID`, `MODEL_API_KEY` remain server-side and unset for live use. A future compatible Azure endpoint should use `https://<project-resource>.openai.azure.com/openai/v1` and a deployment name as `MODEL_ID`; [Microsoft's Chat Completions contract](https://learn.microsoft.com/en-us/rest/api/microsoft-foundry/azureopenai/chat) supports this interface. Store keys in private environment/vault storage, never Terraform inputs/state, CI logs or the browser bundle.

The current candidate is **GPT-5 nano** for an inexpensive first text smoke test, with GPT-5 mini as a quality alternative after evaluation. Sweden Central reports unused Global Standard quota for both; GPT-4o mini has Standard/Global Standard quota as another compatibility candidate. Quota listings alone do not prove capacity, credit coverage, model API compatibility or Arabic quality. See the dated [readiness table](CLOUD.md).

Keep `MODEL_MODE=fixture` and `PROVIDER_MODE=fixture`. No live model key/resource has been activated. A later separately authorized check must cover gateway JSON parsing, OpenDesign streaming/artifact validation, English/Arabic output, token limits, errors/timeouts, approval/cost gates and real account billing. Sender, signal and enrichment submission/webhook/billing checks also remain separate activation work.
