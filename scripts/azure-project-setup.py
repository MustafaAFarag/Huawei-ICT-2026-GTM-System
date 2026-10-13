#!/usr/bin/env python3
"""Create only this project's RG + Reader OIDC identity and GitHub settings.

Requires separate, already authenticated .local/azure-cli and .local/github-cli.
Never registers providers, provisions the app/model, or pushes the repository.
"""
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SUBSCRIPTION = "55336c1c-af74-4164-b687-a7b7c3ec740c"
TENANT = "3f5648ce-ad7c-46b5-8dfb-ddcbf48520af"
GROUP = "rg-gtm-command-center-demo"
IDENTITY = "gtm-demo-github-plan"
REPOSITORY = "MustafaAFarag/Huawei-ICT-2026-GTM-System"
ENVIRONMENT = "azure-demo"
SCOPE = f"/subscriptions/{SUBSCRIPTION}/resourceGroups/{GROUP}"
TAGS = {"project": "gtm-command-center", "environment": "demo", "managed_by": "connection-setup"}
ENV = {**os.environ, "AZURE_CONFIG_DIR": str(ROOT / ".local/azure-cli"), "GH_CONFIG_DIR": str(ROOT / ".local/github-cli")}


def command(args, body=None, missing=False):
    result = subprocess.run(args, input=json.dumps(body) if body is not None else None, env=ENV, capture_output=True, text=True, timeout=120)
    if result.returncode:
        if missing and any(error in result.stderr for error in ["ResourceNotFound", "ResourceGroupNotFound", "(NotFound)", "HTTP 404"]):
            return None
        raise RuntimeError(f"{args[0]} {args[1]} failed: {result.stderr.strip()}")
    return json.loads(result.stdout) if result.stdout.strip() else None


def az(*args, **kwargs):
    return command(["az", *args, "-o", "json"], **kwargs)


def gh(method, path, body=None, **kwargs):
    args = ["gh", "api", "--hostname", "github.com", "--method", method, path]
    if body is not None:
        args += ["--input", "-"]
    return command(args, body=body, **kwargs)


def main():
    account = az("account", "show")
    if account["id"] != SUBSCRIPTION or account["tenantId"] != TENANT:
        raise RuntimeError("Project CLI is authenticated to the wrong subscription/tenant; no changes made.")
    if gh("GET", "user")["login"] != "MustafaAFarag":
        raise RuntimeError("Project GitHub CLI is authenticated to the wrong account; no changes made.")
    provider = az("provider", "show", "--namespace", "Microsoft.ManagedIdentity", "--subscription", SUBSCRIPTION)
    if provider["registrationState"] != "Registered":
        raise RuntimeError("Microsoft.ManagedIdentity is not registered. Registration is outside this script.")
    group = az("group", "show", "--name", GROUP, "--subscription", SUBSCRIPTION, missing=True)
    if group is None:
        group = az("group", "create", "--name", GROUP, "--location", "westeurope", "--subscription", SUBSCRIPTION, "--tags", *[f"{k}={v}" for k, v in TAGS.items()])
    if group.get("tags", {}).get("project") != TAGS["project"]:
        raise RuntimeError("Resource group ownership tag does not match; refusing to reuse it.")
    identity = az("identity", "show", "--name", IDENTITY, "--resource-group", GROUP, "--subscription", SUBSCRIPTION, missing=True)
    if identity is None:
        identity = az("identity", "create", "--name", IDENTITY, "--resource-group", GROUP, "--location", group["location"], "--subscription", SUBSCRIPTION, "--tags", *[f"{k}={v}" for k, v in TAGS.items()])
    if identity.get("tags", {}).get("project") != TAGS["project"]:
        raise RuntimeError("Identity ownership tag does not match; refusing to change it.")
    trust = {
        "issuer": "https://token.actions.githubusercontent.com",
        "subject": f"repo:{REPOSITORY}:environment:{ENVIRONMENT}",
        "audiences": ["api://AzureADTokenExchange"],
    }
    credential = az("identity", "federated-credential", "show", "--name", "github-azure-demo", "--identity-name", IDENTITY, "--resource-group", GROUP, "--subscription", SUBSCRIPTION, missing=True)
    if credential is None:
        credential = az("identity", "federated-credential", "create", "--name", "github-azure-demo", "--identity-name", IDENTITY, "--resource-group", GROUP, "--subscription", SUBSCRIPTION, "--issuer", trust["issuer"], "--subject", trust["subject"], "--audiences", trust["audiences"][0])
    if any(credential.get(k) != v for k, v in trust.items()):
        raise RuntimeError("Existing federation differs; refusing to replace its trust.")
    roles = az("role", "assignment", "list", "--scope", SCOPE, "--subscription", SUBSCRIPTION)
    own_roles = [r for r in roles if r["principalId"] == identity["principalId"]]
    if any(r["roleDefinitionName"] != "Reader" for r in own_roles):
        raise RuntimeError("Plan identity has a non-Reader role; review before continuing.")
    if not own_roles:
        az("role", "assignment", "create", "--assignee-object-id", identity["principalId"], "--assignee-principal-type", "ServicePrincipal", "--role", "Reader", "--scope", SCOPE, "--subscription", SUBSCRIPTION)
    env_path = f"repos/{REPOSITORY}/environments/{ENVIRONMENT}"
    environment = gh("GET", env_path, missing=True)
    if environment is None:
        gh("PUT", env_path, {"deployment_branch_policy": {"protected_branches": False, "custom_branch_policies": True}})
    elif environment.get("deployment_branch_policy") != {"protected_branches": False, "custom_branch_policies": True}:
        raise RuntimeError("Existing GitHub branch protection policy differs; review without overwriting it.")
    policies = gh("GET", env_path + "/deployment-branch-policies")["branch_policies"]
    if any(p["name"] != "main" or p.get("type", "branch") != "branch" for p in policies):
        raise RuntimeError("GitHub environment trusts another branch/tag; review without altering it.")
    if not policies:
        gh("POST", env_path + "/deployment-branch-policies", {"name": "main", "type": "branch"})
    values = {"AZURE_CLIENT_ID": identity["clientId"], "AZURE_TENANT_ID": TENANT, "AZURE_SUBSCRIPTION_ID": SUBSCRIPTION, "AZURE_RESOURCE_GROUP": GROUP}
    for name, value in values.items():
        current = gh("GET", env_path + "/variables/" + name, missing=True)
        if current is not None and current["value"] != value:
            raise RuntimeError(f"Existing GitHub variable {name} differs; refusing to replace it.")
        if current is None:
            gh("POST", env_path + "/variables", {"name": name, "value": value})
    result = {"subscriptionId": SUBSCRIPTION, "tenantId": TENANT, "resourceGroup": GROUP, "identityId": identity["id"], "clientId": identity["clientId"], "principalId": identity["principalId"], "role": "Reader", "scope": SCOPE, "trust": trust, "repository": REPOSITORY, "environment": ENVIRONMENT, "remoteOidcExecuted": False}
    output = ROOT / ".local/azure-connection.json"
    output.write_text(json.dumps(result, indent=2))
    output.chmod(0o600)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
