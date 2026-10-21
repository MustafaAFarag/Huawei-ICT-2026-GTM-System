# Reusable company visuals and immediate Nabil creation

Owner request: enrich generated playbooks, flipbooks, carousels and account assistant surfaces; prepare only the three Mirqab client companies; start explicit creation actions immediately instead of requiring a second Send.

## Product behavior

- Sarafa Pay, Wasla Express and Ruwad Learning each get an original logo, their established palette, a written visual/photo direction, and three saved generated gallery images. The owner confirmed these three companies.
- Available company media is reused automatically by generated documents, playbooks, carousels and flipbooks. Saved artifacts contain their visual snapshot and render/export without network requests. Existing companies and old deliverables continue to work.
- The Brand & company page shows the saved kit rather than only text swatches. Accounts and the account assistant show the current client brand context; real prospect website icons may be used when available, with honest initials on failure. Client gallery photos must not be labelled as photographs of a prospect.
- Create with Nabil captures the completed creation brief and selected context, opens the conversation, submits once, and shows pending/success/error feedback. Account assistant quick actions start once with the active or selected accounts. Ordinary New chat, manual composer use and prefill-only editing remain manual.

## Implementation decisions

Keep the existing Workspace.brand JSON and private workspace-scoped Storage; no database migration or new media platform. Extend the validated brand schema with media references, a supporting palette and visual direction. Preserve these fields when ordinary brand settings are edited.

A media reference identifies a private storage key, an image MIME type, alt text, usage role and generated/uploaded/extracted provenance. Reuse Storage's existing flat-key rules with `brand-{kitId}-{filename}`. A membership-checked `GET /api/workspaces/:workspaceId/brand/media/:mediaId` endpoint serves only references belonging to the active workspace brand. Reject traversal keys and unsupported types. The three demo kits are applied with a narrowly targeted idempotent import, never the global seed/reset commands.

Public brand additions: `palette: string[]`, `visualDirection: string`, `photoDirection: string`, and `media: { logo?, mark?, gallery: BrandMediaRef[] }`. Each reference has `id`, `key`, `mimeType`, `alt`, `role` and `provenance`. Supported MIME types are PNG, JPEG, WebP and SVG; gallery photographs are raster images. IDs are stable and each kit's references are distinct. Normal name/color saves preserve omitted media and direction fields; explicit gallery arrays replace that array. Media responses are private, include `X-Content-Type-Options: nosniff`, and restrict SVG content with a sandbox CSP. Unknown IDs and absent stored files return 404; anonymous reads return 401. No endpoint accepts arbitrary filesystem paths or storage keys.

Resolve saved media into data URIs for trusted document/carousel/flipbook rendering, after model content generation. Never send base64 images in text-model prompts or assistant context. PDF/PNG exports already block network access, so adding image URLs to prompts alone is insufficient. Preserve existing email HTTPS-only image lint and legacy logo behavior.

Use explicit click-to-start handoffs and a synchronous controller guard. Capture context before navigation; do not submit from effects or replay on reload. Keep the existing server stream API unless testing demonstrates a necessary change.

## Visual direction

| Company | Existing colors retained | Direction |
| --- | --- | --- |
| Sarafa Pay | #123c69 / #2bb3a3 | Precise fintech editorial; merchant/product context, restrained teal, generous white space |
| Wasla Express | #f2c94c / #1d1d1f | Industrial logistics; parcel/handoff/route imagery, bold typographic hierarchy and deliberate yellow/ink contrasts |
| Ruwad Learning | #3b1f5c / #f2994a | Warm corporate learning; adult workshops, peer coaching and learning-detail photography |

Reference principles: [Column](https://styles.refero.design/style/a76ec6ba-20b3-495c-9d89-1e58281e79e7), [Ameba](https://styles.refero.design/style/371df039-a090-402b-b2e4-21ab38e07625), [SuperHi](https://styles.refero.design/style/90b8631c-4e2c-407e-86a3-d2bff456dc93). These inform composition, spacing and type; third-party artwork and logos are not copied.

## Verification and limits

Black-box tests cover single-click creation, preserved context, double click, failure and reload without replay; brand media survives a normal settings save; media access is workspace-scoped; target outputs contain actual saved media and export with network blocked; email lint remains valid. Check English/Arabic, desktop/phone, and missing-image fallbacks.

No push, deploy, outreach, reset, global seed or unrelated file changes. Live model use and the requested image generation are authorized; browser/backend verification uses fixture models and isolated queues. Keep sender providers fixture-only. Preserve old deliverables and existing approvals rather than silently regenerating them.
