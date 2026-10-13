targetScope = 'resourceGroup'
@description('Review region availability and credit eligibility before deployment.')
param location string = resourceGroup().location
@minLength(3)
@maxLength(16)
param prefix string = 'revenue-demo'
param imageTag string
param registryName string
@secure()
param postgresPassword string
@secure()
param authSecret string
@secure()
param twentySecret string
@secure()
param openDesignTokenA string
@secure()
param openDesignTokenB string
@secure()
param twentyKeyA string = ''
@secure()
param twentyKeyB string = ''
@secure()
param modelApiKey string = ''
param modelBaseUrl string = ''
param modelId string = ''
@allowed(['fixture'])
param providerMode string = 'fixture'
@allowed(['fixture', 'live'])
param modelMode string = 'fixture'
@secure()
param demoPassword string
param demoEmail string = 'demo@revenue.local'
param postgresSku string = 'Standard_B1ms'
param redisSku string = 'Balanced_B1'
param twentyImage string = 'twentycrm/twenty@sha256:bb4e94f0215cbd14c7356b0324d9b7ac10ccd077042cd6d5058ad02ef2080605'
param openDesignImage string = 'ghcr.io/nexu-io/od@sha256:587a992857d0f8b71011e4bc55c5851e33ef9fc4c169fc17e6447700ac428f22'
var suffix = uniqueString(resourceGroup().id)
resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = { name: registryName }
resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${prefix}-runtime'
  location: location
}
resource pullRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, identity.id, 'AcrPull')
  scope: registry
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '7f951dda-4ed3-4680-a7ca-43fe172d538d'
    )
  }
}
resource network 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: '${prefix}-network'
  location: location
  properties: {
    addressSpace: { addressPrefixes: ['10.80.0.0/16'] }
    subnets: [
      {
        name: 'apps'
        properties: {
          addressPrefix: '10.80.0.0/23'
          delegations: [{ name: 'apps', properties: { serviceName: 'Microsoft.App/environments' } }]
        }
      }
      {
        name: 'postgres'
        properties: {
          addressPrefix: '10.80.2.0/24'
          delegations: [{ name: 'postgres', properties: { serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers' } }]
        }
      }
      { name: 'private', properties: { addressPrefix: '10.80.3.0/24', privateEndpointNetworkPolicies: 'Disabled' } }
    ]
  }
}
var subnetApps = '${network.id}/subnets/apps'
var subnetPostgres = '${network.id}/subnets/postgres'
var subnetPrivate = '${network.id}/subnets/private'
resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${prefix}-logs'
  location: location
  properties: { sku: { name: 'PerGB2018' }, retentionInDays: 30 }
}
resource environment 'Microsoft.App/managedEnvironments@2025-01-01' = {
  name: '${prefix}-environment'
  location: location
  properties: {
    vnetConfiguration: { infrastructureSubnetId: subnetApps, internal: false }
    workloadProfiles: [{ name: 'Consumption', workloadProfileType: 'Consumption' }]
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: { customerId: logs.properties.customerId, sharedKey: logs.listKeys().primarySharedKey }
    }
  }
}
var webOrigin = 'https://${prefix}-web.${environment.properties.defaultDomain}'
var apiOrigin = 'https://${prefix}-api.internal.${environment.properties.defaultDomain}'
var twentyOrigin = 'https://${prefix}-twenty.internal.${environment.properties.defaultDomain}'
resource pgDns 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: '${prefix}.postgres.database.azure.com'
  location: 'global'
}
resource pgLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: pgDns
  name: '${prefix}-postgres-link'
  location: 'global'
  properties: { registrationEnabled: false, virtualNetwork: { id: network.id } }
}
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: '${prefix}-pg-${suffix}'
  location: location
  sku: { name: postgresSku, tier: 'Burstable' }
  properties: {
    version: '16'
    administratorLogin: 'revenue'
    administratorLoginPassword: postgresPassword
    storage: { storageSizeGB: 32 }
    backup: { backupRetentionDays: 14, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
    network: {
      publicNetworkAccess: 'Disabled'
      delegatedSubnetResourceId: subnetPostgres
      privateDnsZoneArmResourceId: pgDns.id
    }
  }
  dependsOn: [pgLink]
}
resource pgExtensions 'Microsoft.DBforPostgreSQL/flexibleServers/configurations@2024-08-01' = {
  parent: postgres
  name: 'azure.extensions'
  properties: { value: 'uuid-ossp,unaccent,citext', source: 'user-override' }
}
resource productDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: 'revenue'
  properties: { charset: 'UTF8', collation: 'en_US.utf8' }
}
resource crmDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: 'twenty'
  properties: { charset: 'UTF8', collation: 'en_US.utf8' }
}
resource redis 'Microsoft.Cache/redisEnterprise@2025-07-01' = {
  name: '${prefix}-redis-${suffix}'
  location: location
  sku: { name: redisSku }
  properties: { minimumTlsVersion: '1.2', publicNetworkAccess: 'Disabled', highAvailability: 'Enabled' }
}
resource redisDb 'Microsoft.Cache/redisEnterprise/databases@2025-07-01' = {
  parent: redis
  name: 'default'
  properties: {
    clientProtocol: 'Encrypted'
    clusteringPolicy: 'NoCluster'
    evictionPolicy: 'NoEviction'
    port: 10000
    persistence: { aofEnabled: true, aofFrequency: '1s' }
  }
}
module redisEndpoint 'modules/private-endpoint.bicep' = {
  name: 'redis-private'
  params: {
    name: '${prefix}-redis-private'
    location: location
    resourceId: redis.id
    groupId: 'redisEnterprise'
    dnsZone: 'privatelink.redis.azure.net'
    vnetId: network.id
    subnetId: subnetPrivate
  }
}
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'rw${suffix}'
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
    publicNetworkAccess: 'Disabled'
  }
}
resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    deleteRetentionPolicy: { enabled: true, days: 14 }
    containerDeleteRetentionPolicy: { enabled: true, days: 14 }
    isVersioningEnabled: true
  }
}
resource assets 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'assets'
  properties: { publicAccess: 'None' }
}
resource fileService 'Microsoft.Storage/storageAccounts/fileServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: { shareDeleteRetentionPolicy: { enabled: true, days: 14 } }
}
resource shares 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-05-01' = [
  for share in ['twenty', 'open-design-a', 'open-design-b']: {
    parent: fileService
    name: share
    properties: { shareQuota: 20, enabledProtocols: 'SMB' }
  }
]
module blobEndpoint 'modules/private-endpoint.bicep' = {
  name: 'blob-private'
  params: {
    name: '${prefix}-blob-private'
    location: location
    resourceId: storage.id
    groupId: 'blob'
    dnsZone: 'privatelink.blob.${az.environment().suffixes.storage}'
    vnetId: network.id
    subnetId: subnetPrivate
  }
}
module fileEndpoint 'modules/private-endpoint.bicep' = {
  name: 'file-private'
  params: {
    name: '${prefix}-file-private'
    location: location
    resourceId: storage.id
    groupId: 'file'
    dnsZone: 'privatelink.file.${az.environment().suffixes.storage}'
    vnetId: network.id
    subnetId: subnetPrivate
  }
}
resource filesMount 'Microsoft.App/managedEnvironments/storages@2025-01-01' = [
  for (share, index) in ['twenty', 'open-design-a', 'open-design-b']: {
    parent: environment
    name: share
    properties: {
      azureFile: {
        accountName: storage.name
        accountKey: storage.listKeys().keys[0].value
        shareName: shares[index].name
        accessMode: 'ReadWrite'
      }
    }
    dependsOn: [fileEndpoint]
  }
]
resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'rw-${suffix}'
  location: location
  properties: {
    tenantId: tenant().tenantId
    sku: { family: 'A', name: 'standard' }
    enableRbacAuthorization: true
    enableSoftDelete: true
    enablePurgeProtection: true
    softDeleteRetentionInDays: 14
    publicNetworkAccess: 'Disabled'
  }
}
module vaultEndpoint 'modules/private-endpoint.bicep' = {
  name: 'vault-private'
  params: {
    name: '${prefix}-vault-private'
    location: location
    resourceId: vault.id
    groupId: 'vault'
    dnsZone: 'privatelink.vaultcore.azure.net'
    vnetId: network.id
    subnetId: subnetPrivate
  }
}
resource vaultRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: vault
  name: guid(vault.id, identity.id, 'SecretsOfficer')
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      'b86a8fe4-44ce-4948-aee5-eccb2c155cd7'
    )
  }
}
resource blobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storage
  name: guid(storage.id, identity.id, 'BlobContributor')
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
    )
  }
}
var secretValues = [
  {
    name: 'database-url'
    value: 'postgresql://revenue:${uriComponent(postgresPassword)}@${postgres.properties.fullyQualifiedDomainName}:5432/revenue?sslmode=require'
  }
  {
    name: 'crm-database-url'
    value: 'postgresql://revenue:${uriComponent(postgresPassword)}@${postgres.properties.fullyQualifiedDomainName}:5432/twenty?sslmode=require'
  }
  {
    name: 'redis-url'
    value: 'rediss://:${uriComponent(redisDb.listKeys().primaryKey)}@${redis.properties.hostName}:10000/0'
  }
  { name: 'auth-secret', value: authSecret }
  { name: 'twenty-secret', value: twentySecret }
  { name: 'od-token-a', value: openDesignTokenA }
  { name: 'od-token-b', value: openDesignTokenB }
  { name: 'twenty-key-a', value: empty(twentyKeyA) ? 'NOT_CONFIGURED' : twentyKeyA }
  { name: 'twenty-key-b', value: empty(twentyKeyB) ? 'NOT_CONFIGURED' : twentyKeyB }
  { name: 'model-key', value: empty(modelApiKey) ? 'NOT_CONFIGURED' : modelApiKey }
  { name: 'demo-password', value: demoPassword }
]
var secretNames = [
  'database-url'
  'crm-database-url'
  'redis-url'
  'auth-secret'
  'twenty-secret'
  'od-token-a'
  'od-token-b'
  'twenty-key-a'
  'twenty-key-b'
  'model-key'
  'demo-password'
]
resource vaultSecrets 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = [
  for (name, index) in secretNames: {
    parent: vault
    name: name
    properties: { value: empty(secretValues[index].value) ? 'NOT_CONFIGURED' : secretValues[index].value }
  }
]
var keyVaultRefs = [
  for name in secretNames: {
    name: name
    keyVaultUrl: 'https://${vault.name}${az.environment().suffixes.keyvaultDns}/secrets/${name}'
    identity: identity.id
  }
]
var productEnv = [
  { name: 'DATABASE_URL', secretRef: 'database-url' }
  { name: 'REDIS_URL', secretRef: 'redis-url' }
  { name: 'BETTER_AUTH_SECRET', secretRef: 'auth-secret' }
  { name: 'BETTER_AUTH_URL', value: webOrigin }
  { name: 'WEB_ORIGIN', value: webOrigin }
  { name: 'PROVIDER_MODE', value: providerMode }
  { name: 'MODEL_MODE', value: modelMode }
  { name: 'QUEUE_NAME', value: '${prefix}-product-runs' }
  { name: 'STORAGE_DRIVER', value: 'azure' }
  { name: 'AZURE_BLOB_ACCOUNT_URL', value: storage.properties.primaryEndpoints.blob }
  { name: 'SECRET_DRIVER', value: 'azure' }
  { name: 'AZURE_KEY_VAULT_URL', value: vault.properties.vaultUri }
  { name: 'AZURE_CLIENT_ID', value: identity.properties.clientId }
  { name: 'TWENTY_A_URL', value: twentyOrigin }
  { name: 'TWENTY_B_URL', value: twentyOrigin }
  { name: 'TWENTY_A_API_KEY', secretRef: 'twenty-key-a' }
  { name: 'TWENTY_B_API_KEY', secretRef: 'twenty-key-b' }
  { name: 'OPEN_DESIGN_A_URL', value: 'https://${prefix}-od-a.internal.${environment.properties.defaultDomain}' }
  { name: 'OPEN_DESIGN_B_URL', value: 'https://${prefix}-od-b.internal.${environment.properties.defaultDomain}' }
  { name: 'OPEN_DESIGN_A_TOKEN', secretRef: 'od-token-a' }
  { name: 'OPEN_DESIGN_B_TOKEN', secretRef: 'od-token-b' }
  { name: 'MODEL_BASE_URL', value: modelBaseUrl }
  { name: 'MODEL_ID', value: modelId }
  { name: 'MODEL_API_KEY', secretRef: 'model-key' }
]
module api 'modules/container.bicep' = {
  name: 'product-api'
  params: {
    name: '${prefix}-api'
    location: location
    environmentId: environment.id
    image: '${registry.properties.loginServer}/revenue-api:${imageTag}'
    identityId: identity.id
    registryServer: registry.properties.loginServer
    env: productEnv
    secrets: keyVaultRefs
    port: 4100
    healthPath: '/api/health'
  }
  dependsOn: [productDb, vaultSecrets, vaultRole, blobRole, vaultEndpoint, redisEndpoint, blobEndpoint, pullRole]
}
module worker 'modules/container.bicep' = {
  name: 'product-worker'
  params: {
    name: '${prefix}-worker'
    location: location
    environmentId: environment.id
    image: '${registry.properties.loginServer}/revenue-worker:${imageTag}'
    identityId: identity.id
    registryServer: registry.properties.loginServer
    env: productEnv
    secrets: keyVaultRefs
    port: 4101
    memory: '2Gi'
    cpu: '1'
  }
  dependsOn: [api]
}
module web 'modules/container.bicep' = {
  name: 'product-web'
  params: {
    name: '${prefix}-web'
    location: location
    environmentId: environment.id
    image: '${registry.properties.loginServer}/revenue-web:${imageTag}'
    identityId: identity.id
    registryServer: registry.properties.loginServer
    env: [{ name: 'API_URL', value: apiOrigin }, { name: 'TRUST_AZURE_INGRESS', value: 'true' }]
    port: 3100
    external: true
    healthPath: '/api/health'
  }
  dependsOn: [api]
}
var crmEnv = [
  { name: 'PG_DATABASE_URL', secretRef: 'crm-database-url' }
  { name: 'REDIS_URL', secretRef: 'redis-url' }
  { name: 'APP_SECRET', secretRef: 'twenty-secret' }
  { name: 'ENCRYPTION_KEY', secretRef: 'twenty-secret' }
  { name: 'SERVER_URL', value: twentyOrigin }
  { name: 'STORAGE_TYPE', value: 'local' }
  { name: 'IS_MULTIWORKSPACE_ENABLED', value: 'true' }
  { name: 'NODE_OPTIONS', value: '--max-old-space-size=1024' }
]
module twenty 'modules/container.bicep' = {
  name: 'twenty-server'
  params: {
    name: '${prefix}-twenty'
    location: location
    environmentId: environment.id
    image: twentyImage
    identityId: identity.id
    registryServer: registry.properties.loginServer
    env: crmEnv
    secrets: keyVaultRefs
    port: 3000
    healthPath: '/healthz'
    memory: '2Gi'
    cpu: '1'
    volumes: [{ name: 'files', storageType: 'AzureFile', storageName: 'twenty' }]
    mounts: [{ volumeName: 'files', mountPath: '/app/packages/twenty-server/.local-storage' }]
  }
  dependsOn: [crmDb, pgExtensions, filesMount, vaultSecrets, vaultRole, vaultEndpoint, redisEndpoint]
}
module twentyWorker 'modules/container.bicep' = {
  name: 'twenty-worker'
  params: {
    name: '${prefix}-twenty-worker'
    location: location
    environmentId: environment.id
    image: twentyImage
    identityId: identity.id
    registryServer: registry.properties.loginServer
    env: concat(
      crmEnv,
      [{ name: 'DISABLE_DB_MIGRATIONS', value: 'true' }, { name: 'DISABLE_CRON_JOBS_REGISTRATION', value: 'true' }]
    )
    secrets: keyVaultRefs
    command: ['yarn', 'worker:prod']
    memory: '2Gi'
    cpu: '1'
    volumes: [{ name: 'files', storageType: 'AzureFile', storageName: 'twenty' }]
    mounts: [{ volumeName: 'files', mountPath: '/app/packages/twenty-server/.local-storage' }]
  }
  dependsOn: [twenty]
}
module openDesign 'modules/container.bicep' = [
  for (binding, index) in ['a', 'b']: {
    name: 'open-design-${binding}'
    params: {
      name: '${prefix}-od-${binding}'
      location: location
      environmentId: environment.id
      image: openDesignImage
      identityId: identity.id
      registryServer: registry.properties.loginServer
      env: [
        { name: 'OD_BIND_HOST', value: '0.0.0.0' }
        { name: 'OD_PORT', value: '7456' }
        { name: 'OD_DATA_DIR', value: '/app/.od' }
        { name: 'OD_API_TOKEN', secretRef: 'od-token-${binding}' }
      ]
      secrets: keyVaultRefs
      port: 7456
      healthPath: '/api/health'
      volumes: [{ name: 'files', storageType: 'AzureFile', storageName: 'open-design-${binding}' }]
      mounts: [{ volumeName: 'files', mountPath: '/app/.od' }]
    }
    dependsOn: [filesMount, vaultSecrets, vaultRole, vaultEndpoint]
  }
]
output productUrl string = webOrigin
output vaultUrl string = vault.properties.vaultUri
output postgresHost string = postgres.properties.fullyQualifiedDomainName
output assetAccount string = storage.name
output redisHost string = redis.properties.hostName

resource migrate 'Microsoft.App/jobs@2025-01-01' = {
  name: '${prefix}-migrate'
  location: location
  identity: { type: 'UserAssigned', userAssignedIdentities: { '${identity.id}': {} } }
  properties: {
    environmentId: environment.id
    configuration: {
      triggerType: 'Manual'
      replicaTimeout: 600
      replicaRetryLimit: 0
      manualTriggerConfig: { parallelism: 1, replicaCompletionCount: 1 }
      secrets: keyVaultRefs
      registries: [{ server: registry.properties.loginServer, identity: identity.id }]
    }
    template: {
      containers: [
        {
          name: 'migrate'
          image: '${registry.properties.loginServer}/revenue-api:${imageTag}'
          command: ['node', 'scripts/migrate-and-seed.mjs']
          env: concat(
            productEnv,
            [{ name: 'DEMO_EMAIL', value: demoEmail }, { name: 'DEMO_PASSWORD', secretRef: 'demo-password' }]
          )
          resources: { cpu: json('0.5'), memory: '1Gi' }
        }
      ]
    }
  }
  dependsOn: [productDb, vaultSecrets, vaultRole, vaultEndpoint, redisEndpoint, pullRole]
}
