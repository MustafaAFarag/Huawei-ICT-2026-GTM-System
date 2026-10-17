# Caravan logo: Route C

Chosen by the owner on 17 October 2026 from five AI-generated concepts (see `TASKS.md`). The mark is the letter C drawn as a trade route: deep-green route, three coral waypoint dots (follow-ups), and a larger coral terminal dot (the account reaching a recorded outcome). The mark also serves as the "C" of the wordmark, so it reads "Caravan".

All files here are redrawn from exact geometry by `build.py`, not traced from the AI concepts. Open `preview.html` through a local web server to see the intro animation.

## Geometry (100-unit box, from `spec.json`)

- Centreline radius 34; stroke 14 with round caps. Outer diameter is 82, so the stroke is 0.171 of the outer diameter.
- Arc starts at −40° (upper right) and sweeps 280° anticlockwise, leaving an 80° opening to the right.
- Waypoints sit on the centreline at 70°, 140° and 210° from the start. Waypoint diameter is 8.68; terminal dot diameter is 21.
- Clear space: twice the terminal diameter on every side.
- Favicon (16 and 32 px): C plus the terminal dot only, stroke 20, terminal 26.
- Single-colour versions cut the waypoints out of the stroke instead of hiding them.

## Type and colour

- Latin: Inter Variable at weight 600, outlined; tracking −0.01 em; gap after the mark 0.045 em; mark height is 1.06 × cap height.
- Arabic: IBM Plex Sans Arabic 600 (the app's Arabic font), "كارافان". The Arabic-first lockup puts the mark on the right.
- Both fonts are under the SIL Open Font License.
- Palette: ink `#20231F`, deep green `#3F5A45`, coral `#E8765A`, paper `#F3F0E7`.

## Files

| File | Use |
| --- | --- |
| `wordmark-c-as-mark.svg`, `-reversed.svg` | Primary wordmark, with the mark as the C |
| `lockup-horizontal.svg`, `lockup-stacked.svg` | Mark plus the full word, for places where the C-as-mark may not read |
| `lockup-arabic.svg`, `wordmark-arabic.svg`, `lockup-bilingual.svg` | Arabic and bilingual versions |
| `mark.svg`, `mark-mono-ink.svg`, `mark-paper-on-green.svg`, `mark-paper-on-ink.svg` | Symbol variants |
| `app-icon-1024.svg`, `app-icon-1024-light.svg`, `favicon-32.svg`, `favicon-16.svg` | Icons |
| `route-stroke.svg` | Animation source: `#route` (open path, length 166.17) and `#waypoint-1..3`, `#terminal` |
| `mark-animated.svg` | Self-contained CSS intro; respects `prefers-reduced-motion` |

## Animation

1. The route draws via `stroke-dashoffset` (600 ms, ease-out).
2. The waypoints pop in 120 ms apart (280 ms, slight overshoot), then the terminal dot.
3. "aravan" fades and slides in at 700 ms.

Future ideas: a dot travelling the route as a loading state, and a single terminal-dot pulse for "send approved". With reduced motion, show the static mark.

## Before public use

- Native Arabic review of the lockup.
- A trademark clearance search (Egypt, GCC, and the US/EU if relevant).
- Import into Figma as native vectors. This was not done because of the Figma connector rate limit.
