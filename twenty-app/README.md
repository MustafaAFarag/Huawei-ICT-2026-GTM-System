# Twenty application integration source — not installed

The SDK is pinned to 2.44.0, matching the upstream package manifest checked on 2026-10-06. The local Node is 22.23.3; the documented app path requires Node 24.5+. Package installation failed with `EAI_AGAIN registry.npmjs.org`, and Docker reports `permission denied while trying to connect to the docker API`. Therefore no SDK build, metadata sync, native UI integration or live Twenty permissions test is claimed.

Implemented source: five objects, fourteen bidirectional relation fields (including reverse fields on standard Company/Person), workspace-local application identity, restricted default application role, five sidebar entries, and a native read-only React overview with a pinned command. The overview reads the current workspace through the documented RestApiClient and includes loading, empty and error states; it is not runtime-verified. Stable UUIDs are checked into source. Install the app separately in each actual client workspace; a workspace selector in the local demo is not production authentication. Existing standard contacts/companies/tasks should be used in the native integration.

With a suitable local Twenty development environment:

```bash
corepack enable
cd twenty-app
yarn install
yarn typecheck
yarn twenty plan
```

Review the plan and the SDK compatibility before applying to a fresh development workspace. No automatic sync or external write is performed by this repository. A running local Twenty instance is required to finish integration.

The Python service is the tested workflow implementation. Its loopback API cannot be used from a hosted Twenty front component as a production backend. The native campaign editor/action handlers and workspace-authenticated service boundary still need integration; do not present this source package as an installed Twenty product. The local review UI is the complete demonstrator, not a fork of Twenty core.
