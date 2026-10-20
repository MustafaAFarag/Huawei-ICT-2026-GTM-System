# Handover — UI simplification + live AI (21 Oct 2026)

Merged into local `main`: `5869b43` (UI) and `64af652` (Dockerfile copies `apps/web/public`). Branch `feat/ui-simplify-live-ai` kept. Nothing pushed or deployed.

## Done
- Sign-in uses the wordmark where the route mark is the C ("aravan").
- Home landing: Nabil avatar, headline, input and starter chips, centred. Removed: subtitle, ranking note, "Pick up where you left off", purpose line, and the fixture note. The dock composer shows "Nothing is sent without your approval."
- Search: `components/SidebarSearch.tsx` (replaces CommandPalette). Inline input above New chat; ⌘K/Ctrl+K focuses it (opens the drawer on ≤960px, expands a collapsed rail). The results popover is portalled to `body`. It searches screens, conversations, plays, actions and accounts.
- Width: `--content-max` 1680px; `.content` side padding 20px.

## Runtime (local)
- Web 3140 is the standalone production build. API 4140 and worker run with **MODEL_MODE=live**, PROVIDER_MODE=fixture. Logs: `.local/verification-20261019/{api,worker}-live.log`. A real chat reply was verified.
- E2E expects fixture models. Before `pnpm exec playwright test`, restart the API and worker with plain `source .local/gate-env.sh revenue_resume_20261019` (which sets MODEL_MODE=fixture).
- The Twenty CRM containers had stopped, so 4 import tests failed with "fetch failed". `docker start revenue-workspace-twenty-1 revenue-workspace-twenty-worker-1 revenue-workspace-mailpit-1` fixed it. With fixture models: E2E 23/23.

## Evidence
`.local/verification-20261019/`: `e2e-ui21b.log` (19/23, CRM down), `e2e-ui21c.log` (the 4 failures rerun: pass), `ui21-*.png`.

## Open
- Owner review of the new look.
- The pnpm Vercel/Dokploy warning still applies before any push.
