#!/usr/bin/env python3
"""Read-only Azure inventory; report failures rather than guess availability."""
import datetime
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SUB = '55336c1c-af74-4164-b687-a7b7c3ec740c'
TENANT = '3f5648ce-ad7c-46b5-8dfb-ddcbf48520af'
LOCATION = 'swedencentral'
SIZE = 'Standard_D2as_v6'
ENV = {**os.environ, 'AZURE_CONFIG_DIR': str(ROOT / '.local/azure-cli')}


def run(args):
    result = subprocess.run(['az', *args, '-o', 'json'], env=ENV,
                            capture_output=True, text=True, timeout=120)
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    return json.loads(result.stdout)


account = run(['account', 'show'])
if account['id'] != SUB or account['tenantId'] != TENANT:
    raise SystemExit('Wrong Azure subscription/tenant; no inventory run.')

checks = {
    'providers': ['provider', 'list', '--subscription', SUB, '--query',
                  "[?namespace=='Microsoft.ManagedIdentity' || namespace=='Microsoft.Compute' || namespace=='Microsoft.Network' || namespace=='Microsoft.CognitiveServices'].{namespace:namespace,state:registrationState}"],
    'policies': ['policy', 'assignment', 'list', '--subscription', SUB,
                 '--disable-scope-strict-match', '--query',
                 '[].{name:name,scope:scope,definition:policyDefinitionId,parameters:parameters}'],
    'vmSkus': ['rest', '--method', 'get', '--url',
               f'https://management.azure.com/subscriptions/{SUB}/providers/Microsoft.Compute/skus?api-version=2021-07-01&$filter=location%20eq%20%27{LOCATION}%27',
               '--query', f"{{matches:value[?name=='{SIZE}'].{{name:name,family:family,locations:locations,capabilities:capabilities,restrictions:restrictions}},nextLink:nextLink}}"],
    'vmQuota': ['vm', 'list-usage', '--subscription', SUB, '--location', LOCATION,
                '--query', "[?name.value=='cores' || name.value=='standardDav6Family' || name.value=='virtualMachines'].{name:name.value,used:currentValue,limit:limit}"],
    'aiQuota': ['cognitiveservices', 'usage', 'list', '--subscription', SUB,
                '--location', LOCATION, '--query',
                "[?contains(name.value, 'gpt-5-nano') || contains(name.value, 'gpt-5-mini') || contains(name.value, 'gpt-4o-mini')].{name:name.value,unit:unit,used:currentValue,limit:limit}"],
    'aiModels': ['rest', '--method', 'get', '--url',
                 f'https://management.azure.com/subscriptions/{SUB}/providers/Microsoft.CognitiveServices/locations/{LOCATION}/models?api-version=2025-06-01',
                 '--query', "value[?model.name=='gpt-5-nano' || model.name=='gpt-5-mini' || model.name=='gpt-4o-mini'].{name:model.name,version:model.version,capabilities:model.capabilities}"],
    'resources': ['resource', 'list', '--subscription', SUB, '--query',
                  '[].{id:id,name:name,type:type,group:resourceGroup,location:location}'],
}
report = {
    'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'subscriptionId': SUB, 'tenantId': TENANT,
    'computeCandidate': {'location': LOCATION, 'size': SIZE},
    'credit': {'assumedUSD': 100, 'remainingVerified': False,
               'reason': 'Sponsorship portal: This account does not have an active Sponsorship.'},
    'checks': {},
    'limits': 'Read-only inventory. Quota/SKU listings do not prove actual capacity, creation, credit eligibility or successful model inference.',
}
for name, args in checks.items():
    try:
        report['checks'][name] = {'status': 'verified', 'value': run(args)}
    except Exception as error:
        report['checks'][name] = {'status': 'unverified', 'error': str(error)}
    print(name, report['checks'][name]['status'], flush=True)

skus = report['checks']['vmSkus']
if skus['status'] == 'verified':
    listing = skus['value']
    matches = listing['matches']
    # A listed result is not enough if the subscription restricts the location.
    report['computeCandidate']['listedWithoutRestrictions'] = bool(matches) and not listing.get('nextLink') and all(not s['restrictions'] for s in matches)

quota = report['checks']['vmQuota']
if quota['status'] == 'verified':
    values = quota['value']
    family = next((q for q in values if q['name'] == 'standardDav6Family'), None)
    total = next((q for q in values if q['name'] == 'cores'), None)
    report['computeCandidate']['quotaHasTwoFreeCores'] = bool(family and total) and all(float(q['limit']) - float(q['used']) >= 2 for q in [family, total])
    if not report['computeCandidate']['quotaHasTwoFreeCores']:
        report['computeCandidate']['blocker'] = 'Selected VM family needs at least 2 free regional vCPUs; quota was not changed.'

path = ROOT / '.local/azure-preflight.json'
path.write_text(json.dumps(report, indent=2))
path.chmod(0o600)
print('Report: .local/azure-preflight.json')
