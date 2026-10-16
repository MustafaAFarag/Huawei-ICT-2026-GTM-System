// Person-run synthetic product check: explicitly reviews cost, generates a draft,
// leaves copy unapproved and never queues outreach. MODEL_MODE must be live.
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { draftChecks, type Touch } from "../packages/contracts/src/index.ts";
process.loadEnvFile(".env");
const base = process.env.TEST_BASE_URL ?? "http://localhost:3100";
let cookie = "";
async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}/api${path}`, {
    ...init,
    headers: {
      origin: base,
      cookie,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const set = response.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((value) => value.split(";")[0]).join("; ");
  if (!response.ok)
    throw new Error(`Product check failed at ${path}: HTTP ${response.status}`);
  return response;
}
await api("/auth/sign-in/email", {
  method: "POST",
  body: JSON.stringify({
    email: process.env.DEMO_EMAIL,
    password: process.env.DEMO_PASSWORD,
  }),
});
const me = await (await api("/me")).json();
const ws = me.workspaces.find(
  (membership: any) => membership.workspace.name === "Qimam People",
).workspace.id;
const state = await (await api(`/workspaces/${ws}`)).json();
if (state.modelFixture)
  throw new Error("A live draft check requires live model mode.");
const target = state.prospects.find(
  (prospect: any) =>
    !prospect.excluded &&
    (prospect.score ?? 0) >= 50 &&
    prospect.lawfulBasis &&
    prospect.evidence.some(
      (item: any) => item.kind === "fact" && item.approved,
    ),
);
if (!target) throw new Error("No eligible synthetic prospect found.");
const results = [];
for (const language of ["en", "ar-EG"] as const) {
  const input = {
    tool: "draft_messages",
    requestKey: randomUUID(),
    prospectIds: [target.id],
    play: "P3",
    language,
  };
  const quote = await (
    await api(`/workspaces/${ws}/quotes`, {
      method: "POST",
      body: JSON.stringify(input),
    })
  ).json();
  await api(`/workspaces/${ws}/quotes/${quote.id}/approve`, { method: "POST" });
  const run = await (
    await api(`/workspaces/${ws}/runs`, {
      method: "POST",
      body: JSON.stringify({ ...input, spendApprovalId: quote.id }),
    })
  ).json();
  const started = Date.now();
  let current = run,
    after = state;
  for (
    let attempt = 0;
    attempt < 60 &&
    !["succeeded", "failed", "cancelled"].includes(current.state);
    attempt++
  ) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    after = await (await api(`/workspaces/${ws}`)).json();
    current = after.runs.find((item: any) => item.id === run.id) ?? current;
  }
  const draft = after.drafts.find((item: any) => item.runId === run.id);
  if (current.state !== "succeeded" || !draft)
    throw new Error(
      `Fresh ${language} run failed: ${current.error ?? current.state}`,
    );
  const touches = draft.content as Touch[];
  const errors = draftChecks(touches, language).filter(
    (check) => check.level === "error",
  );
  const approvedIds = new Set(
    target.evidence
      .filter((item: any) => item.approved && item.kind === "fact")
      .map((item: any) => item.id),
  );
  if (
    errors.length ||
    touches.length !== 3 ||
    touches.some((touch) =>
      touch.evidenceIds.some((id) => !approvedIds.has(id)),
    ) ||
    draft.approvedVersion !== null
  )
    throw new Error(
      "Fresh draft did not satisfy its contract or unexpectedly became approved.",
    );
  const events = (
    await (await api(`/workspaces/${ws}/runs/${run.id}/events?after=0`)).text()
  )
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice(6)));
  results.push({
    language,
    runId: run.id,
    draftId: draft.id,
    company: target.snapshot.company,
    state: current.state,
    seconds: (Date.now() - started) / 1000,
    estimatedCredits: quote.estimate,
    actualCredits: current.actualCost,
    approvedVersion: draft.approvedVersion,
    configuration:
      events.find((event: any) => event.kind === "model")?.details ?? null,
    approvedSources: target.evidence.filter(
      (item: any) => item.approved && item.kind === "fact",
    ),
    touches,
    checks: errors,
  });
  console.log(
    `${language}: fresh live draft passed, ${current.actualCost} credits; copy remains unapproved.`,
  );
}
const after = await (await api(`/workspaces/${ws}`)).json();
if (after.sequences.length !== state.sequences.length)
  throw new Error("A draft check unexpectedly created a sequence.");
await mkdir("verification", { recursive: true });
await writeFile(
  process.env.DRAFT_SMOKE_REPORT ??
    "verification/draft-smoke-local-2026-10-16.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      baseURL: base,
      workspace: "Qimam People",
      sequenceCountUnchanged: true,
      results,
    },
    null,
    2,
  ),
);
