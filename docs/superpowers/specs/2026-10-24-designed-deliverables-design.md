# Designed deliverables — premium brand kits, emails, carousels, flipbook

Date: 24 October 2026. Owner decisions from the grilling session (Q1–Q18). Replaces the visual layer of `2026-10-21-visual-brand-kits-design.md`; its storage/API/approval rules stay.

## Why

Caravan's edge is the harness, not the model call. The owner's reference points: Higgsfield (a harness around other models) and the owner's own meeting widget (stop recording → summary and todos appear by themselves). Today the pipeline is already a harness in structure — the model returns zod-validated JSON and trusted templates render HTML (`packages/backend/src/formats/`) — but every template is plain: one layout per format, "Point 1" slides, emails with no logo or image, a duplicated logo + "Sarafa Pay (client)" header on slides, a flipbook of text pages, and a Brand book scattered down a long page.

Target: one click produces a finished, designed, ready-to-send deliverable that looks like the best work on reallygoodemails.com, LinkedIn/Instagram and the owner's `FlipBook.html`, in the workspace's own premium identity, in English and Arabic.

## Goals

1. Premium identity per client workspace (Sarafa Pay, Wasla Express, Ruwad Learning).
2. Brand book as one no-scroll canvas.
3. Designed email families with Gmail and Outlook delivery.
4. Instagram and LinkedIn carousels built from designed slide types.
5. Flipbook with the feel of `FlipBook.html`.
6. The harness chooses layout, slide types and images automatically; the user can switch with one click.

## Non-goals

- Other 7 workspaces (keep current identity; they must still render with the fallback design).
- Live image generation in the app (later "make a new image" button; not now).
- Real mail sending, Gmail API drafts, deployment, push.
- E2E suite updates (owner: ignore E2E for now). Unit/backend tests for touched renderers still run.

## Anti-goals (failure even if it "works")

- Model writes free-form HTML.
- AI-generated text inside logos (misspelling, broken Arabic).
- Generated images presented as real customers, metrics or evidence.
- Any slide or brand canvas that needs scrolling to see the whole thing on a 1440×900 desktop.
- Logo and brand name repeated in the same header; "(client)" shown anywhere in output.
- Arabic as an afterthought (English layout with Arabic text poured in).

## Constraints

- Order (Q1): **E assets → A brand canvas → B email → C carousels → D flipbook**. Each slice is finished, merged to local main, and shown to the owner (3 screenshots + live 3140) before the next starts.
- Bilingual from the start (Q17): RTL mirroring, Arabic fonts, AR copy quality checked.
- Existing rules hold: model content passes `checkContent` (no invented numbers); exports gated by approval; images labelled "Illustrative brand imagery"; private media read through `/api/workspaces/:id/brand/media/:mediaId`.
- Image generation only through Codex Skylink, offline, committed as project assets with prompt + provenance in the manifest (same pattern as d164fce).
- Lanes (Q18): Opus plans/audits/checks screens; Codex Skylink makes images; Claude Sonnet workers write code, max 2 at once, one worktree each. No push/deploy.
- Data note: the three client workspaces currently carry their old names ("Mirqab · … client") after the owner restored them; brand names in demo data still end in " (client)". Deliverables must use the kit's brand name without the suffix.

## Decided by the owner

### E — Premium identity per workspace (Q4, Q7–Q10)

Replace the current kit entirely (old one remains in git history).

| | Sarafa Pay (KSA fintech) | Wasla Express (Egypt logistics) | Ruwad Learning (UAE edtech) |
|---|---|---|---|
| Mood | Precise and calm | Bold and fast | Warm and optimistic |
| Palette | Deep ink navy + mint teal, lots of white | Black + saffron yellow | Plum + apricot + cream |
| Graphic motif | Fine-line Saudi geometric pattern | Diagonal speed lines | Soft paper textures |
| Photography | Riyadh shopkeepers, terminal/phone close-ups, cool daylight | Cairo streets, riders, parcels, vans, golden hour | Young professionals, bright studios, mentoring/laptops |
| Headline font | Readex Pro | Rubik (heavy) | Alexandria |
| Body font | IBM Plex Sans Arabic | Cairo | Tajawal |

- Palette: 4 roles (primary, secondary, tertiary/ink, neutral), each with a generated tint scale (as in the owner's Veridian Flow reference).
- Logo (Q9): image generator makes **3 symbol options per company**; owner picks one each before anything else continues. The name is typeset in the headline font in English and Arabic. Export PNG at 2× and 3×: light lockup, dark lockup, symbol alone. Raster PNG is required (email clients don't render SVG).
- Image library (Q10), ~16 per workspace: 4 wide heroes 1200×600, 6 photos (people/product/place), 4 background textures/patterns, 2 square carousel covers. Each has alt text, role, mood tags and prompt/provenance in the manifest; all labelled generated brand imagery.
- Written visual direction per workspace: short do/don't rules, usable by the harness and shown on the canvas.

### A — Brand canvas (Q11)

Brand book tab = one canvas, no scroll at 1440×900: palette columns with tints · type specimens (headline/body/label, EN + AR) · logo tiles light/dark · Visual direction card (do/don't) · image library filmstrip (click to enlarge) · sample button/CTA styles. Website proposal and "Update brand" move into a dialog. Phone may scroll.

### B — Email (Q6, Q12, Q15, Q16)

- Two families, chosen automatically from the goal, switchable with one click:
  - **Designed**: raster logo, hero image, visual hierarchy, brand fonts with fallbacks, CTA button. Four layouts: announcement, case study, event invite, product update.
  - **Personal**: reads like a person wrote it; branded signature block (logo, name, small banner).
- Primary action **Approve & open in Outlook**: approval plus download of an `.eml` draft with images embedded as inline CID parts, built from the Outlook-safe variant (outlook-safe-email rules: MSO conditionals, forward/reply stability).
- **Copy for Gmail** (rich HTML clipboard) is built, driven by an image-host base URL setting, and disabled until the app has a public URL (Gmail needs public image URLs).
- Gmail variant follows gmail-safe-email rules (hosted images, size limit, existing `lintGmail`).

### C — Carousels (Q13)

- Slide types: cover (full-bleed image + big headline), content (big stat · list · quote · before/after · steps, harness picks), end (CTA).
- Logo small in one corner only; no name text header.
- Instagram: image-led, few words. LinkedIn: more text/data, author line, PDF document carousel export.
- Viewer: whole slide on screen with no scroll, thumbnail strip below, swipe on phone.

### D — Flipbook (Q14)

Take structure and feel from `FlipBook.html` (not its ctcHealth branding): reader bar with logo, page turns on laptop/iPad (StPageFlip, already inlined in `formats/flipbook.ts`), full-screen swipe pages on phone, full-bleed photo cover, section openers with images, brand pattern field per workspace, pull quotes, stat pages.

## Calls made by Claude after the builder check (owner to confirm while reading)

1. **Logo gate**: the owner's symbol pick blocks only work that needs the logo. The image library, tint scales, fonts and direction text are generated in parallel; the canvas (A) starts once the picks are in.
2. **Kit data**: keep the manifest shape (`kits[]`, `logo`, `mark`, `gallery`) and bump `version` to 2, adding fields: `fonts {headline, body}`, `palette` roles with tints, `direction {do[], dont[]}`, `logoVariants {light, dark, symbol}` × 2×/3×, gallery `role` (hero/photo/texture/cover) and `tags`. Match kits by workspace id, not name. Import sets the brand name to the plain name ("Sarafa Pay"); renderers also strip a trailing " (client)" so stored legacy names never reach output. Storage/API rules unchanged.
3. **One-click switch**: switching layout within a family re-renders the same stored JSON (content schema is shared across layouts in a family; no model call). Switching family (Designed ↔ Personal) or slide set re-runs the model. Either switch makes a new version that needs approval again (one click).
4. **Numbers**: `checkContent` stays. Stat and before/after slides only use figures from approved facts/offer; when none exist the harness doesn't pick those types.
5. **Language**: unchanged from today: one deliverable per language, the model writes Arabic directly (no translation step). Claude reviews Arabic in screenshots; native review stays an open owner item.
6. **`.eml`**: download only (the browser cannot launch Outlook). `To` = the account contact's email when known, else blank; subject and preheader from the content; `X-Unsent: 1` so Outlook opens it as an editable draft.
7. **Gmail image host**: an env value (`PUBLIC_ASSET_BASE_URL`), no settings screen.
8. **Logo rasterising**: offline (headless browser render of the typeset name + chosen symbol), PNGs committed as assets. No runtime rendering dependency.

## Left to the builder

- Exact JSON schemas per layout/slide type and how the model sees the image library (metadata only — alt, role, tags — never bytes; code validates chosen ids).
- Tint-scale algorithm, font embedding approach (fontsource packages already used for Inter/Plex), and how fallback design applies to workspaces without a premium kit.
- Grid geometry of the canvas, as long as the no-scroll rule holds.
- How to split each slice into single worker tasks.

## Done

Per slice: EN/AR × desktop/phone checked for the three workspaces, web/backend typecheck and production build pass, touched-renderer tests pass, owner has seen it, merged to local main. Whole project: all five slices done and the TASKS.md section closed.
