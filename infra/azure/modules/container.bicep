param name string
param location string
param environmentId string
param image string
param identityId string
param registryServer string
param env array
param secrets array = []
param port int = 0
param external bool = false
param cpu string = '0.5'
param memory string = '1Gi'
param volumes array = []
param mounts array = []
param command array = []
param healthPath string = '/health'
resource app 'Microsoft.App/containerApps@2025-01-01' = {
  name: name
  location: location
  identity: { type: 'UserAssigned', userAssignedIdentities: { '${identityId}': {} } }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: secrets
      registries: [{ server: registryServer, identity: identityId }]
      ingress: port > 0 ? { external: external, targetPort: port, transport: 'auto', allowInsecure: false } : null
    }
    template: {
      containers: [{
        name: name
        image: image
        command: empty(command) ? null : command
        env: env
        resources: { cpu: json(cpu), memory: memory }
        volumeMounts: mounts
        probes: port > 0 ? [
          { type: 'Startup', httpGet: { path: healthPath, port: port }, initialDelaySeconds: 10, periodSeconds: 10, failureThreshold: 30 }
          { type: 'Readiness', httpGet: { path: healthPath, port: port }, periodSeconds: 10, timeoutSeconds: 5, failureThreshold: 3 }
          { type: 'Liveness', httpGet: { path: healthPath, port: port }, periodSeconds: 30, timeoutSeconds: 5, failureThreshold: 5 }
        ] : []
      }]
      volumes: volumes
      scale: { minReplicas: 1, maxReplicas: 1 }
    }
  }
}
output fqdn string = port > 0 ? app.properties.configuration.ingress.fqdn : ''
output id string = app.id
