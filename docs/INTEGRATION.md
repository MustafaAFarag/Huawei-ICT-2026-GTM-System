# Upstream integration decisions

## Twenty and the assistant spike

The local pin is Twenty 2.46.0. `twenty-app` builds with the matching SDK and installs the same deployed package in Revenue Demo A and B. Native companies, people, manual tasks, campaign objects and asset objects are accessed through REST, with workspace API keys held only on the server. Retried creates use stable native IDs; native A contacts were inaccessible with B's key.

Register the app once, review `app:plan`, apply the development package in A, publish it to the **local Twenty private registry**, then install that package in B. A second registration with the same universal identifier is rejected. Development apply is restricted to the owning registration; a deployed private package is the supported reuse path. See [native app instructions](../twenty-app/README.md).

The assistant spike examined Twenty's [MCP interfaces](https://github.com/twentyhq/twenty/blob/main/packages/twenty-docs/user-guide/ai/capabilities/mcp.mdx) and [app component interfaces](https://github.com/twentyhq/twenty/blob/main/packages/twenty-docs/developers/extend/apps/getting-started/concepts.mdx). These document CRM tools and sandboxed app components. We did **not confirm a documented standalone Next.js assistant runtime** supporting our model gateway, context and governed task tools. This is an integration finding, not a claim that no such interface exists anywhere in Twenty.

Use the plan's fallback: a Next.js chat shell with persisted workspace/user history. In fixture mode it proposes structured tasks. In model mode it reserves an explicitly approved model action before making a proposal; the model cannot execute another action or approve spending. REST actions and our workspace MCP server use the same services. The native CRM MCP is not exposed as a privileged bypass.

## OpenDesign

Pin release [open-design-v0.24.1](https://github.com/nexu-io/open-design/releases/tag/open-design-v0.24.1), image `ghcr.io/nexu-io/od:0.24.1`, upstream revision `89e64d813bb1c7a11519b3f668f011f7017637d7`. Its health response uses the stale 0.23.1 package label; image/revision checks establish the pin.

Two unmodified instances have separate API tokens and volumes. Local checks saved an artifact through A, fetched it through A, and received 404 through B; A's token receives 401 at B. Fixture templates are saved through the actual engine API. Real generation uses the release's BYOK `/api/proxy/openai/stream` path and consumes SSE deltas; coding-agent execution is unused. No real BYOK call has been validated without authorized model credentials.

HTML previews run in a sandboxed iframe with restrictive CSP. PDF rendering disables JavaScript and blocks network requests; the browser receives a minimal environment without service secrets. Arabic uses locally installed Noto fonts. Approved-source and current-evidence checks apply again at export and sequence preparation.

## Provider activation

`PROVIDER_MODE=fixture` and `MODEL_MODE=fixture` are independent defaults. `MODEL_MODE=live` can test a reviewed Azure/OpenAI-compatible endpoint while sender and signal data remain fixtures. Budget units are internal product credits, not reconciled currency billing; external pricing/token accounting must be verified against the chosen account before a paid pilot.

The PredictLeads adapter uses the documented company [job openings](https://docs.predictleads.com/guide/job_openings_dataset/api_endpoints) and [financing events](https://docs.predictleads.com/guide/financing_events_dataset/api_endpoints) endpoints, with bounded results and dated source references. Financing sources are `source_urls`; the event date is `effective_date`, with `found_at` as a discovery-date fallback. Returned evidence stays unapproved. Sandbox responses, commercial quotas and freshness remain unverified without an account.

Smartlead credentials can be saved encrypted, but no message-submission adapter is enabled. The sender simulator validates current consent/country, copy, suppression and sender checks, creates native manual tasks and reconciles duplicate/out-of-order events. Real Smartlead authentication, event signatures and submission contracts are activation work once a sandbox exists. Enrichment currently has a bounded fixture waterfall/cache; a licensed provider is required for real contact data.
