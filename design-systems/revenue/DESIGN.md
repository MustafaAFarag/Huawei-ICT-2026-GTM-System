# Caravan — Design System

> Midnight command center for go-to-market work. Adapted from the [Raycast reference](../raycast/DESIGN.md) (Refero Styles, copied 15 October 2026) for a dense, bilingual product dashboard.

**Themes:** dark (default) and light. **Direction:** LTR and RTL. **Source of truth for code:** `apps/web/src/styles/tokens.css`. Print assets use the light print tokens at the end of this file.

## 1. Character

Raycast is a dark power-tool cockpit: near-black canvas, hairline borders, inset "key" highlights instead of drop shadows, neutral light-gray actions, and one coral accent. We keep that character and change three things for a working dashboard:

1. **Coral means AI.** Raycast uses coral for its logo and AI badge. In our product coral marks AI-produced or AI-proposed things: the assistant, streaming text, tool-call chips, the "thinking" shimmer and the brand mark. It never marks errors and never carries body text.
2. **Status colours exist.** A governed workflow needs states (approved, needs review, blocked, simulated). We add four quiet semantic tones that always come with a text label, never colour alone.
3. **A light theme exists.** Long table and review sessions are easier on light surfaces, and printed assets are light. The light theme is achromatic in the same way; only surface values invert.

## 2. Colour tokens

| Token | Dark | Light | Role |
| --- | --- | --- | --- |
| `--bg` | `#040506` Void Black | `#f7f7f8` | Page canvas |
| `--surface` | `#07080a` Ink | `#ffffff` | Cards, panels, sidebar |
| `--surface-2` | `#111214` Obsidian | `#f1f1f3` | Inputs, recessed wells, table header |
| `--surface-3` | `#1b1c1e` Graphite | `#e9e9ec` | Badges, hover rows, keycaps |
| `--line` | `#2f3031` Slate | `#e4e4e7` | Dividers, table rules |
| `--line-strong` | `#363739` | `#d4d4d8` | Card and control borders |
| `--text` | `#ffffff` | `#0b0c0e` | Headings, emphasis |
| `--text-2` | `#e6e6e6` Mist | `#2a2b2e` | Body |
| `--text-3` | `#9c9c9d` Ash | `#5f6064` | Secondary, labels |
| `--text-4` | `#6a6b6c` Smoke | `#8b8c90` | Muted, placeholders, meta |
| `--action` | `#e6e6e6` Mist | `#111214` | Primary button fill |
| `--action-text` | `#111214` | `#ffffff` | Primary button label |
| `--ai` | `#ff6363` Coral Pulse | `#e5484d` | AI and brand accent |
| `--ai-tint` | `#452324` Ember Hush | `#fdecec` | AI surfaces (assistant bubbles, AI chips) |
| `--ok` | `#59d499` | `#1a7f4b` | Approved, succeeded, imported |
| `--warn` | `#f5b14c` | `#a15c00` | Needs review, held, reserved |
| `--danger` | `#f2555a` | `#c42b31` | Failed, blocked, suppressed |
| `--info` | `#56c2ff` | `#0b6bb8` | Simulated, fixture, informational |

Status tones render as a 12% tinted fill plus the solid tone for the dot and text (`color-mix`). Contrast: every text token on its surface passes WCAG AA at 13px and up; `--text-4` is used only for meta text at 12px and above.

## 3. Typography

| Role | Family | Size / line | Weight | Notes |
| --- | --- | --- | --- | --- |
| Display (sign-in) | Inter | 44 / 1.1 | 500 | +0.2px tracking, Raycast's "whisper at size" |
| Page title | Inter | 24 / 1.2 | 500 | One per screen |
| Section title | Inter | 15 / 1.3 | 600 | Panel headers |
| Body | Inter | 14 / 1.55 | 400 | Dashboard default (Raycast's 16 is a marketing size) |
| Small | Inter | 13 / 1.5 | 400 | Table cells, helper text |
| Label / eyebrow | Geist Mono | 11 / 1.2 | 500 | Uppercase, +0.06em: eyebrows, column headers, IDs |
| Numbers / credits | Geist Mono | 12–28 | 400–500 | `tabular-nums`; credits, scores, counts, versions |
| Arabic | IBM Plex Sans Arabic | same scale +1px | 400–600 | Inter has no Arabic glyphs; line-height 1.7 for Arabic body |

Stacks: `--font-sans: "Inter Variable", "IBM Plex Sans Arabic", system-ui, sans-serif`; `--font-mono: "Geist Mono Variable", ui-monospace, monospace`. In `[dir="rtl"]` the Arabic family moves first. Never letter-space Arabic. Mono labels stay LTR in RTL layouts when they hold IDs or numbers (`<bdi>`).

## 4. Space, radius, elevation

- **Spacing:** 4px half-step for icon gaps, then an 8px grid: 8, 12, 16, 24, 32, 40, 48, 64. Card padding 20–24. Table cell padding 12×16.
- **Radius:** badges and chips 6, buttons and inputs 8, cards and panels 12–16, modals 16, pills 999.
- **Elevation:** no drop shadows on cards. Cards use the Raycast "key" stack in dark: `inset 0 1px 0 rgba(255,255,255,.05), 0 0 0 1px var(--line-strong)`. Popovers, the command palette and modals use the only real shadow (`--shadow-pop`). Light theme replaces inset highlights with a 1px border and a 1px soft shadow.
- **Layout:** sidebar 248px, assistant panel 380px, content max 1240px. Breakpoints: 1280 (assistant overlays), 960 (sidebar collapses to top bar), 640 (phone stack).

## 5. Components

| Component | Spec |
| --- | --- |
| **Button / primary** | `--action` fill, `--action-text` label, 13/500, height 32, padding 0 12, radius 8. One per region. |
| **Button / secondary** | `--surface-2` fill, 1px `--line-strong`, `--text-2` label. Default button. |
| **Button / ghost** | Transparent, `--text-3`, hover `--surface-3`. Toolbar and row actions. |
| **Button / AI** | `--ai-tint` fill, `--ai` label and sparkle icon. Only for "ask the assistant" actions. |
| **Button / danger** | Secondary with `--danger` label. Opt-out, cancel run. |
| **Input / select / textarea** | `--surface-2` well, 1px `--line-strong`, radius 8, height 34; focus ring 2px `--ai` at 40% plus border `--text-3`. |
| **Badge** | Mono 11/500 uppercase, radius 6, height 20, tone dot. Tones: neutral, ok, warn, danger, info, ai. |
| **Kbd** | Mono 11, `--surface-3` fill, inset bottom 1px — the Raycast keycap. Used in nav hints and the palette. |
| **Panel / card** | `--surface`, key stack, radius 14, header row (title + actions) separated by `--line`. |
| **Stat tile** | Mono eyebrow, 28px tabular number, small delta/meta line, optional meter. |
| **Meter** | 4px track `--surface-3`, fill `--text-2`; turns `--warn` at 80% and `--danger` at 100%. |
| **Table** | Sticky mono header on `--surface-2`, 1px row rules, hover `--surface-3` at 50%, selected row inset 2px `--ai` on the leading edge. |
| **Sidebar nav item** | 32px high, icon 16, label 13/500, count badge at the end, active = `--surface-3` fill + `--text`. |
| **Command palette (⌘K)** | 560px modal, search input 48px, grouped results, active row `--surface-3`, kbd hints at the end. |
| **Assistant** | Right panel. Messages: user right-aligned `--surface-3`; assistant left with coral avatar dot, `--surface` card. Tool calls render as mono chips (`tool · state`). Cost quotes render as a card with a mono credit figure and Approve/Cancel. |
| **Streaming caret** | 7×14 coral block blinking at 1s steps after the last token. |
| **Thinking shimmer** | Gradient sweep `--text-4 → --text → --text-4` across the label, 1.6s linear. Disabled under reduced motion. |
| **Empty / loading / error** | Every data region has all three. Empty: icon in a 40px circle, title, one-line next step, one action. Loading: skeleton rows matching the final layout. Error: danger-tone panel, plain cause, Retry. |
| **Toast / status** | Bottom-centre, `--surface` with key stack, tone dot; `role="status"`, 5s. Errors stay until dismissed. |
| **Modal** | 520px, radius 16, `--shadow-pop`, backdrop `rgba(0,0,0,.6)` with 8px blur. |

## 6. Motion

150ms ease-out for hover and press; 200ms for panels and modals (opacity + 4px translate). Streaming caret and thinking shimmer are the only looping animations. `prefers-reduced-motion` removes translate and loops.

## 7. RTL and bilingual rules

- Set `dir` and `lang` on `<html>`. Layout uses logical properties only (`margin-inline-start`, `inset-inline-end`, `border-inline-start`).
- Directional icons (chevrons, arrows) flip in RTL; brand and media icons do not.
- Emails, URLs, phone numbers, IDs and credit figures stay LTR inside `<bdi>`.
- User and generated content uses `dir="auto"`.

## 8. Print and PDF tokens

Assets are A4, light, and carry the workspace brand. Defaults derive from the light theme and are overridden by the brand kit (`--brand`, `--brand-accent`).

| Token | Value | Role |
| --- | --- | --- |
| `--paper` | `#ffffff` | Page |
| `--ink` | `#0b0c0e` | Headings |
| `--body` | `#2a2b2e` | Body text |
| `--meta` | `#6b6c70` | Captions, sources |
| `--rule` | `#e4e4e7` | Rules and table lines |
| `--brand` | brand kit primary (fallback `#111214`) | Header band, key figures |
| `--brand-accent` | brand kit accent (fallback `#e5484d`) | One highlight per page |

Type: Inter / IBM Plex Sans Arabic 10.5pt body, 22pt title, Geist Mono 8pt labels. Margins 16mm, 8mm grid, `break-inside: avoid` on blocks. Footer: mono source line and "Made with Caravan" on the Free plan.

## 9. Do and don't

- **Do** keep 95% of every screen achromatic; let coral appear only where AI acts.
- **Do** pair every status colour with a word.
- **Do** use mono for anything a person might compare across rows: credits, scores, versions, dates.
- **Don't** use coral for errors, links or primary buttons.
- **Don't** add drop shadows to cards or alternate light and dark bands in one theme.
- **Don't** introduce a second accent hue.
