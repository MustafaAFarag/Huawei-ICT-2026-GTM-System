# Azure AI (project-only)

One Azure OpenAI account in Sweden Central inside `rg-gtm-command-center-demo`, with three deployments (GPT-5.4 mini for chat and tools, Whisper and GPT-4o transcribe for dictation) and a monthly budget alert on the project resource group. State is local (`*.tfstate` is git-ignored). This root is separate from `../azure` so applying it never creates the VM.

```bash
export AZURE_CONFIG_DIR="$PWD/../../../.local/azure-cli"
terraform init
terraform plan -var budget_contact=you@example.com -out ai.tfplan
terraform apply ai.tfplan
```

Keys are read with `az cognitiveservices account keys list` into the git-ignored `.env`; they are never written to Terraform outputs.
