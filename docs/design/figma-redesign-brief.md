# Caravan — Figma redesign brief and page inventory

17 October 2026. Design preparation only. Application code is on hold.

**Delivery status:** current app audited; draft structure and coverage below are prepared. No Figma file or redesigned frames have been created. Figma reports installed/enabled, but this session exposes no Figma tools. Restored tool access is pending; create a new draft by default, or use an existing draft if the owner supplies one. Direct probe returned `TypeError: tools.mcp__figma__whoami is not a function`.

## Product and outcome

Caravan helps founders, small B2B teams and agencies prepare branded work and reviewed outreach. Nabil is the assistant and chat remains the main entry. Preserve Caravan, Nabil/Strobi, workspace isolation, English/Arabic, grounded claims, versioned approval, spend caps and explicit outbound authorization.

Design a connected product, including all existing pages and their meaningful detail states. The owner should be able to walk through a new company creating its brand, requesting a deliverable, reviewing it and finding it later; and an existing team importing accounts, preparing outreach, reviewing it and tracking the next step.

The draft must distinguish **existing capability**, **proposed UX**, and **new feature requiring implementation**. Brand book extraction/generation and image generation are proposed features, not working product capabilities today.

## Evidence from the local app

Audited eight main screens, six Settings sections, account details/tabs, a saved flipbook canvas and narrow/Arabic views. Evidence is in `.local/figma-audit/`; these are captures of the existing product, not redesigns. No paid generations or outbound actions were run.

The populated Qimam People demonstration workspace contained 170 accounts, 12 drafts and 32 deliverables. Measurements at 1440 × 900:

| Surface | Observed content height | Design consequence |
| --- | ---: | --- |
| Accounts | 10,632 px | Paginated list; move imports/history into dedicated task views. |
| Review queue | 12,940 px | List plus one selected review; do not render every draft editor together. |
| Deliverables | 2,192 px | Search, sorting, grouping and pagination; optional visual previews. |
| Company context | 2,000 px | Split identity, messaging, references and setup into focused views. |
| Sequences, even when empty | 1,084 px | Put results in a separate tab; show a useful operational empty state first. |

At 390 × 844, the review screen had 13,821 px of content. The document itself remained 390 px wide; the dominant problem is task structure and vertical length, not universal horizontal overflow. The floating Nabil control overlaps the visible message editor area in this capture. Previous title fixes do not solve these broader layout problems.

### Problems to resolve

1. Account selection, play configuration, reviewing and sequences are disconnected destinations. The user must remember context and prerequisites between pages.
2. Review renders pending and approved versions together as large forms. Repeated company names do not clearly explain which version/account task is selected.
3. Account details put a large source empty state ahead of fit/policy/triage/calls/discovery. Important controls and next steps are pushed below the fold.
4. Secondary account tabs sit below the source section and look like they govern unrelated side content. Promote a single, unambiguous detail navigation.
5. Context combines business positioning, identity, SDR export, references and website extraction. It does not provide a visual identity workspace.
6. Creation in Deliverables defaults to an Instagram prompt regardless of the format the user intended. Provide a format choice with a visible brand context.
7. Sequence results occupy the first viewport even when there are no sequences. Separate operational work from reporting.
8. Canvas actions compete in one header. Title, version, approval and export need a consistent priority and overflow treatment.
9. Shell chrome, notices and repeated headings consume substantial height on phones. Reduce persistent chrome and preserve the working area.
10. Many controls have equal visual weight. Use one primary next action per task and hide advanced options until they are relevant.

These are findings from this local demonstration data and source inspection, not user research or usability-test results.

## Proposed information architecture

The current pages remain covered. Group Plays and Sequences under **Campaigns** with clear tabs; place Company context within **Brand & company**, with Brand book as its default visual view. These groupings are proposals for the Figma draft.

| Main destination | Purpose | Detail navigation |
| --- | --- | --- |
| New chat | Ask Nabil to prepare work | Saved conversations; linked deliverables and account context |
| Deliverables | Find, review and reuse work | All / Documents / Emails / Carousels / Flipbooks; editor |
| Accounts | Manage prospects and source evidence | All / Needs review / Assigned to me / Duplicates; import/history |
| Campaigns | Prepare and operate outreach | Overview / Plays / Sequences / Results / Schedules |
| Review | Decide on work requiring attention | Messages / Deliverables / Scheduled reviews; selected-item detail |
| Brand & company | Define the identity and business context | Brand book / Messaging / References / SDR kit |
| Settings | Configure the workspace | Spending / Quotas / Assignment / Connections / Sender checks / Audit |

Sidebar: workspace selector, New chat, Search, main destinations, a bounded recent-conversations region, Settings and profile. Credits are a quiet summary with details available on demand. Collapsing the sidebar must leave the current task usable. Do not add a generic dashboard in front of chat.

## Core journeys to connect in the prototype

### New company → Brand book → first deliverable

Create/select workspace → choose **Use a website**, **Upload PDF/PPTX**, or **Generate a brand** → provide source/brief → visible processing → review proposed identity → resolve missing fields → **Use this brand** → chat/create deliverable → preview/edit → approve current version → export → return to saved deliverables.

Allow users to skip brand setup and return later. Creation then shows the actual fallback style and an accessible option to add a brand; do not silently claim a complete identity exists.

### Existing company → website or file extraction

Brand book → Import/update → enter public website or upload PDF/PPTX → inspect extracted elements and source references → choose correct logo/font/colors when candidates conflict → save a new brand version. Existing deliverables stay attached to their original brand version. Applying the new brand creates a new, unapproved deliverable version.

### Accounts → reviewed outreach → operational follow-up

Accounts → import/map/inspect outcomes → filter/select accounts → choose a play or ask Nabil → show persistent account scope → run preparation within caps → review sources/copy → correct blockers → approve the concrete version → inspect launch readiness → explicitly authorize outbound when available → sequences/next task → log outcome or opt-out.

Ordinary assistant preparation starts immediately with inline progress. Do not restore the removed proposed-action approval overlay. Human approval remains meaningful for content and actual sending.

### Returning user → next useful action

Chat or existing destination → see a compact attention summary only when useful → resume an in-progress deliverable/review → finish without losing selection or list position. Completed work stays filed under its workspace/account and linked conversation.

## Brand book workspace

The owner's reference is a visual identity board: color ramps, typography and applied samples together. Build that as an editable board, with readable labels at normal zoom, rather than a long form or a single generated screenshot.

**Board:** logo on light/dark surfaces; primary/accent/neutral palettes and semantic roles; English/Arabic heading/body samples; spacing and shape examples; button/input examples; imagery direction; tone-of-voice examples; an applied email and carousel. Keep workspace UI tokens separate from client brand tokens.

**Editing:** select a section to open one inspector; show name, values, usage, source and review state. Close the inspector to return to a calm board. Preview changes before publishing the brand version. Never require dragging small objects to perform essential edits.

**Website route:** URL, detected pages/assets, candidate logos, CSS/font observations, extracted business messaging, source URLs, missing/uncertain values, review. A social-preview image must not be silently treated as the company logo. Blocked/private sites get a usable upload/manual alternative.

**Upload route:** PDF/PPTX file, upload/processing progress, page/slide preview, extracted elements with page/slide references, candidate selection and missing-font warnings. Treat typography inferred from rasterized pages as uncertain. Password-protected/unreadable files have a specific recovery path. Final file limits depend on the future parser/storage implementation; do not invent numerical limits in designs.

**Generate route:** company name, short description, audience and preferred voice; optional existing assets. Produce one coherent proposed system with editable colors/type/imagery guidance, then refine individual sections with Nabil. Mark generated concepts as proposals. New companies must not need an existing website or presentation.

**Use this brand:** show which pieces are ready, which were inferred and which remain missing. Offer explicit fallbacks rather than forcing arbitrary values. Version, provenance and review status are visible without making the board look like an audit console.

**Images:** include actual imagery areas in email/carousel/flipbook designs. Original image generation needs a separate connected capability. Design an unavailable state, upload/reuse alternatives, progress, error/retry and an asset picker. Keep important text editable rather than baked into images, including Arabic and email CTAs.

## Page design contract

| Surface | First viewport and primary action | What moves out of the default view |
| --- | --- | --- |
| Sign-in | Focused authentication form, concise Caravan explanation | Repeated feature marketing |
| Home | Nabil, a clear prompt, composer, a few useful starters | Operational metrics, complete activity logs |
| Conversation | Readable thread, inline progress, context chips, saved output | Tool internals and run details behind disclosure |
| Deliverables | Search/filter, readable rows or visual grid, **Create** | Per-item version metadata until selected |
| Creation | Format, brand version, audience/purpose, content language, **Create** | Format-specific advanced options |
| Artifact | Large stage; stable title; clear review state; one next action | Exports in a menu; history/checks in an inspector |
| Accounts | Search, saved filters, essential columns, **Import** | Mapping/history/duplicates explanation |
| Account detail | Company/person summary, next action, coherent tabs | Full source editor and long policy form |
| Plays | Outcome-driven play selection and selected account scope | P1/tool names and full cost internals |
| Play detail | Current stage, prerequisites, result, next action | Non-current steps collapsed but discoverable |
| Review | Compact pending list; one selected item; decision footer | Approved history and non-relevant scheduling text |
| Sequences | Searchable sequence list, next touch and real state | Complete messages for every sequence |
| Sequence detail | Selected sequence timeline and next operational task | Results reporting and unrelated discovery records |
| Results | A few meaningful funnel metrics and their definitions | Raw events and every discovery form |
| Brand book | Identity board and **Use this brand/Edit** | Long business context and policy settings |
| Messaging | Company, audience, offers and voice as focused sections | SDR kit download and reference management |
| Settings | One section and current state | Five plan cards on the default operational screen |

## Figma file organization and planned frame checklist

All frames below are **planned**, not yet drawn. Current-state captures should be clearly separated from proposed designs.

| Page | Required frames/variants |
| --- | --- |
| 00 Read me & flows | Coverage map; existing/proposed legend; new-brand journey; deliverable journey; campaign/review journey |
| 01 Current product | Eight main-page captures; representative account, review, artifact and phone evidence; annotations |
| 02 Foundations | Light/dark variables; type and spacing; shell expanded/collapsed; buttons/inputs; rows/tabs/status; empty/loading/error/permission states |
| 03 Entry & chat | Sign-in; workspace chooser/new company; home new workspace; home established workspace; conversation working; conversation with artifact; contextual Nabil panel; search |
| 04 Brand & company | Brand setup choice; website entry/processing; upload/processing; generation brief; extracted proposal review; visual board; selected-section inspector; missing/conflicting values; saved brand version; messaging; references; SDR kit |
| 05 Deliverables | Populated library; empty/filtered-empty library; format chooser; creation brief; editor with Nabil; document; Gmail/Outlook email preview/checks; Instagram carousel; LinkedIn carousel; flipbook; image picker/unavailable; versions; approval/export states |
| 06 Accounts | Populated list; empty state; bulk selection; import upload; column mapping; import outcomes/history; duplicates compare/resolve; account overview; source review; fit/policy; triage; calls; discovery/research guide |
| 07 Campaigns | Overview; four-play chooser; guided play detail; prerequisite blocker; preparation progress; schedule list/create; sequence list/empty; sequence detail; results/discovery |
| 08 Review | Pending inbox; selected message/touch; evidence/checks; unsaved edit; approval success; deliverable review; scheduled review; cleared inbox/history |
| 09 Settings | Spending/current plan; plan comparison as separate task; quotas/member caps; assignment; connections; sender checks; audit history |
| 10 Responsive & Arabic | 390px chat/review/list/brand/artifact; 820px review/editor; Arabic desktop review/brand; Arabic phone chat/account; long mixed-script titles |

Use reusable frames/components and semantic layer names. Provide desktop frames at 1440 × 900 and check the 1280px layout. The main prototype starts at Home; a second start point covers new-company setup. Connect primary actions, Back, Cancel, save/success, review corrections and resume paths. No dead-end primary buttons.

## Hierarchy, scrolling and overlay rules

- One workspace header, one page title, one toolbar. Do not repeat the same title inside a nested panel.
- One primary action for the active task. Other actions become secondary or live in a menu.
- Main UI text should be comfortably readable; use roughly 14–16px for working content, 12–13px for secondary metadata and a restrained heading scale. Do not reduce text to make all fields fit.
- Lists have pagination or bounded incremental loading, visible total/filter state, and preserved selection/scroll position. A long message may scroll; the user should not scroll through every other message to review one.
- Review uses list/detail at desktop, list → detail navigation on phone, with sticky decision controls that do not obscure the last content.
- Artifacts own the working area. Close unrelated inspectors; on narrower screens use Preview/Edit tabs instead of squeezing three columns together.
- Nabil uses reserved dock space or a context action where a floating control would cover important content. Only one assistant/inspector is open at a time. On phones it becomes a dedicated full-height view with Back.
- Modals serve short, bounded decisions. Imports, brand extraction and multi-step creation get full task views with clear progress and return paths.
- Long document titles wrap or truncate with an accessible full-title reveal; adjacent actions retain their size. Do not let a title determine toolbar width.
- Empty, loading, error, success, read-only, cap-reached and partial-result states are part of the design. Errors explain the recovery action next to the failed region.

## Responsive, Arabic and review acceptance

At 390px: no document-level horizontal scroll; visible primary action; useful metadata prioritization; minimum 44px touch targets; safe space for the keyboard and fixed controls. Prefer a mobile list summary to an unreadable full desktop table. At tablet width, choose a clear working pane rather than compressing desktop columns.

Arabic mirrors navigation and directional controls. Keep names and mixed-script content isolated; URLs/email/phone numbers remain LTR. Show real Arabic labels and a long title in the draft. Identity samples include Arabic typography when relevant; the client brand board is not mirrored blindly if a logo/artwork has a fixed composition.

Before calling the Figma work complete: verify every existing page is accounted for; walk all three journeys; check selected context survives transitions; inspect desktop/phone/Arabic variants; inspect the longest title and empty/error cases; verify the draft contains editable layers and working prototype links; provide the actual file URL. Do not claim usability improvement was tested with users unless that test happens.

## Research references

Linear documents a focused [Inbox](https://linear.app/docs/inbox) for work needing attention, and [display options](https://linear.app/docs/display-options) for choosing ordering, grouping and visible information. Those are references for task-focused lists and intentional metadata disclosure; the Caravan layout proposed here is our design judgment.

Figma's official [tools documentation](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/) describes creating files and editable design layers with its remote tools. Their availability in the product does not prove they are exposed in this session. Local catalog inspection and a direct probe did not provide a callable Figma tool.
