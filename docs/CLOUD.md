# Cloud preparation

The December demo targets Azure after local acceptance. Deployment requires subscription, region, credits/model access and separate authorization. No cloud deployment has occurred.

The planned package uses Container Apps for web/API/workers and upstream engines; separate PostgreSQL product/CRM databases; queue-compatible Managed Redis; Blob Storage for product assets; Azure Files for Twenty's native local-storage driver and isolated OpenDesign volumes; Key Vault for connector secrets; a configured model endpoint behind a gateway.

Twenty's local and S3 drivers do not make Blob Storage S3-compatible. Use Azure Files for native CRM engine files and link product-owned Blob assets through the CRM API. Model, storage, secrets and provider code lives behind adapters.

Before deployment, build all product images locally, validate Bicep, back up and rehearse restore, configure private upstream ingress and approve the concrete deployment package. After deployment run the changed workflows with Playwright against Azure. Huawei migration later requires data/files transfer and compatibility tests.

See [architecture](ARCHITECTURE.md), [PRD v3](prd/REVENUE_WORKSPACE_PRD_v3.md) and [implementation status](STATUS.md).

The concrete [deployment package](AZURE_DEPLOYMENT.md), [Bicep](../infra/azure/main.bicep), [manual workflow](../.github/workflows/deploy-azure.yaml) and [backup/restore guide](OPERATIONS.md) are prepared for review. Local Bicep compilation does not validate a subscription deployment.
