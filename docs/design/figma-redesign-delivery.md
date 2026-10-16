# Caravan — Figma redesign delivery

17 October 2026. Design only; application source remains unchanged.

- [Open the new draft](https://www.figma.com/design/XQYMm6aLF8AVUAFje7CpuK?node-id=15-6321)
- [Open the clickable walkthrough](https://www.figma.com/proto/XQYMm6aLF8AVUAFje7CpuK?node-id=17-12&starting-point-node-id=17-12&scaling=contain)
- [Open the visual Brand book](https://www.figma.com/design/XQYMm6aLF8AVUAFje7CpuK?node-id=9-773)

## What changed in the design

Chat remains the main entry. A clearer sidebar groups work by destination, with bounded recent conversations and a quiet credit summary. Nabil has a reserved dock on working pages so it does not cover content. Deliverables open beside chat or in a dedicated editor with stable actions.

Accounts uses a paginated table and focused detail tabs instead of one long page. Import, mapping, outcomes and history are dedicated tasks. Review becomes a queue beside one selected version, with the approval action attached to that item. Plays, sequences, results and schedules are grouped under Campaigns, with explicit handoffs and sending holds.

Brand & company separates visual identity, company messaging, references and the SDR kit. Brand book offers website extraction, PDF/PPTX upload and generation from a short brief. Each route leads through processing and a source-aware proposal review to the editable visual board. Logo, palette, English/Arabic type, voice and applied email/carousel examples appear together; a selected element opens a focused inspector.

## Coverage

The file has 12 pages. There are 92 screen/state designs in the organized design pages and 92 corresponding native-layer copies on `11 Interactive walkthrough`, where Figma permits navigation between them. These are screen variants and states, not 92 separate product destinations.

| Design page | Screen/state frames | Coverage |
| --- | ---: | --- |
| Chat & entry | 7 | Home, working/ready conversations, chat with artifact, contextual assistant, sign-in, new company workspace |
| Brand & company | 13 | Three entry routes, processing/proposal, board/inspector, messaging/references/SDR kit, missing-font recovery and connection task |
| Deliverables | 10 | Library/empty/create, LinkedIn/Instagram, Gmail/Outlook, document, flipbook, approved state |
| Accounts | 13 | Paginated/selected lists, four import views, duplicate comparison, overview/sources/policy/triage/calls/discovery |
| Campaigns | 7 | Overview, plays, guided preparation, sequences/detail, results and schedules |
| Review | 7 | Message review/approved state, artifact review, history/export, launch readiness and scheduled review |
| Settings | 6 | Spending, quotas/member caps, assignment, connections, sender checks and audit |
| Responsive & Arabic | 17 | Eight phone layouts, three Arabic phone examples, tablet review, two dark examples, 1280px review and two Arabic desktop examples |
| States | 12 | Focused task dialogs/views and loading, error, read-only, cap, partial and success states |

`00 Start here` explains the design and links to the main journeys. `01 Foundations` contains reusable navigation/status components, the imported Simple Design System button, typography specimens and semantic Light/Dark variables. Other repeated structures use native auto-layout frames and editable text. The existing Strobi/Nabil avatar and Tabler icons preserve the recognizable product identity.

## Verification

- Structurally checked all 92 walkthrough layouts: no child overflow beyond the two-pixel diagnostic tolerance and no invalid navigation destinations.
- Read back 3,283 text nodes, 2,915 vector nodes, 480 instances and 4,176 frames across the walkthrough. Text uses Inter or the explicitly chosen Arabic fallback, Noto Sans Arabic.
- All 102 image-filled nodes use the same discrete Nabil avatar asset. None is a flattened rendering of a complete UI; no large raster UI exists in the walkthrough.
- Read back 1,143 navigation actions and four named starting points: creation, Brand book setup, reviewed outreach and phone experience.
- Checked each transition in the creation journey: Home → working → ready → artifact beside chat → editor → approval → export → completion.
- Checked each website/upload/generation Brand book route through processing, proposal review and saved board.
- Checked account selection → guided play → review → approval → launch readiness, plus import upload → mapping → outcomes → accounts.
- Visually inspected representative desktop, phone, Arabic and dark treatments; tablet and narrower desktop variants also passed structural bounds checks. Corrected automatic text sizing, status labels, Arabic buttons, table alignment and inspector bounds. Inspected the final screenshots after those fixes where applicable.

Local evidence and exact state/IDs: `.local/figma-redesign/state.json`, `validation.json`, `check-*.png` and `review-*.png`. Existing-product audit captures are in `.local/figma-audit/`. These are ignored local artifacts; the Figma links are the review deliverable.

## Limits and next implementation boundary

This is a Figma prototype, not a functioning app build. Forms, filters, pagination and downloads are illustrative; the main desktop journeys are linked, while phone/Arabic frames demonstrate layout and direction rather than every application transition. No AI brand extraction, image generation, upload parsing, real outreach or paid model evaluation ran during this pass.

Brand extraction/generation and original image generation remain future implementation work. Their proposed states appear in the draft without claiming these pipelines already exist. The example Qimam identity and content are illustrative; they are not a verified extraction of a real brand guide.

IBM Plex Sans Arabic is not available in the connected Figma font catalog. Noto Sans Arabic is used explicitly for the draft; the application font configuration was not changed. Native Arabic copy review and user usability testing remain human review work. Structural/visual checks do not establish measured usability improvement.

Figma disallows prototype navigation between different design pages, so the connected copies share one walkthrough page. That constraint was checked directly; the API returned `destinations must be a different top-level frame on the same page`. All delivered navigation targets now satisfy that constraint. Tool response-size and script-length limits encountered during construction were resolved by smaller batches; no unfinished construction placeholders remain.

Implementation should follow the selected design after owner review. No push, deployment, production change or edit to application source is included in this delivery.
