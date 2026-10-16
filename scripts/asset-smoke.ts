// Live Asset Studio smoke: one make_asset run through OpenDesign's BYOK path on Azure.
// Approves its own quote (it is a person-run script, not the assistant). Usage: tsx scripts/asset-smoke.ts
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

process.loadEnvFile(".env");
const base = process.env.TEST_BASE_URL ?? "http://localhost:3100";
let cookie = "";
async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}/api${path}`, {
    ...init,
    headers: { origin: base, cookie, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const set = response.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
  return response;
}
const signIn = await api("/auth/sign-in/email", {
  method: "POST",
  body: JSON.stringify({ email: process.env.DEMO_EMAIL, password: process.env.DEMO_PASSWORD }),
});
if (!signIn.ok) throw new Error(`Sign-in failed (${signIn.status}).`);
const me = await (await api("/me")).json();
const ws = me.workspaces.find((m: { workspace: { name: string } }) => m.workspace.name === "Qimam People").workspace.id;
const state = await (await api(`/workspaces/${ws}`)).json();
const prospect = state.prospects.find(
  (p: { evidence: { approved: boolean; kind: string }[]; excluded: boolean; score: number | null; lawfulBasis: string | null }) =>
    !p.excluded && (p.score ?? 0) >= 50 && p.lawfulBasis && p.evidence.some((e) => e.approved && e.kind === "fact"),
);
const input = {
  tool: "make_asset",
  requestKey: randomUUID(),
  prospectIds: [prospect.id],
  play: "P3",
  language: process.argv[2] ?? "en",
  template: "offer-one-pager",
  message: process.env.ASSET_EDIT_REQUEST ?? "Make the headline shorter and put the three observations in a two-column layout.",
};
const started = Date.now();
const quote = await (await api(`/workspaces/${ws}/quotes`, { method: "POST", body: JSON.stringify(input) })).json();
await api(`/workspaces/${ws}/quotes/${quote.id}/approve`, { method: "POST" });
const run = await (await api(`/workspaces/${ws}/runs`, { method: "POST", body: JSON.stringify({ ...input, spendApprovalId: quote.id }) })).json();
let current = run;
for (let i = 0; i < 120 && !["succeeded", "failed"].includes(current.state); i++) {
  await new Promise((r) => setTimeout(r, 2000));
  current = (await (await api(`/workspaces/${ws}`)).json()).runs.find((r: { id: string }) => r.id === run.id) ?? current;
}
const after = await (await api(`/workspaces/${ws}`)).json();
const asset = after.assets.find((a: { runId: string }) => a.runId === run.id);
let htmlBytes = 0;
if (asset) {
  const html = await (await api(`/workspaces/${ws}/assets/${asset.id}/html`)).text();
  htmlBytes = html.length;
  await mkdir(".local/asset-smoke", { recursive: true });
  await writeFile(`.local/asset-smoke/${asset.id}.html`, html);
}
const events = await (await api(`/workspaces/${ws}/runs/${run.id}/events?after=0`)).text();
const parsedEvents = events.split("\n").filter((line)=>line.startsWith("data: ")).map(line=>JSON.parse(line.slice(6)));
const report = {
  events: events.split("\n").filter((l) => l.startsWith("data: ")).map((l) => JSON.parse(l.slice(6)).message).slice(0, 8),
  date: new Date().toISOString(),
  configuration: parsedEvents.find(event=>event.kind==="model")?.details ?? null,
  company: prospect.snapshot.company,
  quote: quote.estimate,
  run: { state: current.state, error: current.error, actualCost: current.actualCost },
  assetId: asset?.id ?? null,
  htmlBytes,
  seconds: Math.round((Date.now() - started) / 1000),
};
await writeFile(process.env.ASSET_SMOKE_REPORT ?? "verification/asset-smoke.json", JSON.stringify(report, null, 2));
console.log(report);
if (current.state !== "succeeded" || !asset || htmlBytes < 1000) throw new Error("The fresh Asset Studio run did not produce a usable artifact.");
