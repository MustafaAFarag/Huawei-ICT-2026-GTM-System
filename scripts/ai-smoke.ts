// Live AI smoke test through the product HTTP API (web proxy → NestJS → Azure).
// Needs the dev stack running with MODEL_MODE=live and clips from evaluation/agent.
// Usage: tsx scripts/ai-smoke.ts [workspaceName]
import { readFile, mkdir, writeFile } from "node:fs/promises";

process.loadEnvFile(".env");
const base = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const workspaceName = process.argv[2] ?? "Qimam People";
let cookie = "";
async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}/api${path}`, {
    ...init,
    headers: { origin: base, cookie, ...(init.headers ?? {}) },
  });
  const set = response.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
  return response;
}
const signIn = await api("/auth/sign-in/email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: process.env.DEMO_EMAIL,
    password: process.env.DEMO_PASSWORD,
  }),
});
if (!signIn.ok) throw new Error(`Sign-in failed: ${signIn.status}`);
const me = await (await api("/me")).json();
const ws = me.workspaces.find(
  (m: { workspace: { name: string } }) => m.workspace.name === workspaceName,
).workspace.id;
const report: Record<string, unknown> = {
  date: new Date().toISOString(),
  baseURL: base,
  workspace: workspaceName,
};

async function chat(content: string, prospectIds: string[] = []) {
  const started = Date.now();
  let firstToken: number | null = null;
  const response = await api(`/workspaces/${ws}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content,
      context: { play: "P3", prospectIds, language: "en" },
    }),
  });
  const text = await response.text();
  const events = text
    .split("\n\n")
    .filter((f) => f.startsWith("data: "))
    .map((f) => JSON.parse(f.slice(6)));
  const reply = events
    .filter((e) => e.type === "text")
    .map((e) => e.delta)
    .join("");
  for (const e of events)
    if (e.type === "text" && firstToken === null)
      firstToken = Date.now() - started;
  return {
    prompt: content,
    status: response.status,
    model: events.find((e) => e.type === "meta")?.model,
    tools: events
      .filter((e) => e.type === "tool" && e.state === "called")
      .map((e) => e.name),
    quote: events.find((e) => e.type === "quote")?.quote ?? null,
    quoteTool: events.find((e) => e.type === "quote")?.tool ?? null,
    credits: events.find((e) => e.type === "done")?.credits,
    errors: events.filter((e) => e.type === "error").map((e) => e.message),
    totalMs: Date.now() - started,
    reply: reply.slice(0, 500),
  };
}
const dashboard = await (await api(`/workspaces/${ws}`)).json();
if (dashboard.modelFixture)
  throw new Error(
    "Live AI smoke requires MODEL_MODE=live on the target server.",
  );
const budgetBefore = dashboard.budgets.find(
  (b: { userId: string | null }) => !b.userId,
);
report.chatRead = await chat(
  "Which tier A fintech accounts have a hiring signal? Show the top three.",
);
const target = dashboard.prospects.find(
  (p: {
    evidence: { approved: boolean; kind: string }[];
    excluded: boolean;
    lawfulBasis: string | null;
  }) =>
    !p.excluded &&
    p.lawfulBasis &&
    p.evidence.some((e) => e.approved && e.kind === "fact"),
);
report.chatAction = await chat(
  `Draft messages for ${target.snapshot.company}.`,
  [target.id],
);
report.chatArabic = await chat("مين أحسن ٣ حسابات أبدأ بيهم النهارده؟");

for (const clip of ["en-1", "ar-eg-1"]) {
  const audio = await readFile(`evaluation/agent/clips/${clip}.mp3`);
  const started = Date.now();
  const response = await api(
    `/workspaces/${ws}/transcribe?language=${clip.startsWith("ar") ? "ar" : "en"}`,
    {
      method: "POST",
      headers: { "Content-Type": "audio/mpeg" },
      body: audio,
    },
  );
  report[`transcribe_${clip}`] = {
    status: response.status,
    ms: Date.now() - started,
    ...(await response.json()),
  };
}
const suggestion = await api(`/workspaces/${ws}/call-outcome/suggest`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    note: "كلمت مديرة الموارد البشرية وقالت لي أكلمها تاني يوم الأحد بعد ما يخلصوا المرتبات",
  }),
});
report.callOutcome = {
  status: suggestion.status,
  ...(await suggestion.json()),
};
const after = await (await api(`/workspaces/${ws}`)).json();
const budgetAfter = after.budgets.find(
  (b: { userId: string | null }) => !b.userId,
);
report.credits = { before: budgetBefore?.used, after: budgetAfter?.used };
report.runsCreatedByAssistant = after.runs.length - dashboard.runs.length;
await mkdir("verification", { recursive: true });
await writeFile("verification/ai-smoke.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

const checks = {
  read:
    (report.chatRead as { status: number; errors: string[] }).status === 200 &&
    !(report.chatRead as { errors: string[] }).errors.length,
  action:
    (report.chatAction as { quoteTool: string }).quoteTool === "draft_messages",
  arabic: /[\u0600-\u06ff]/.test(
    (report.chatArabic as { reply: string }).reply,
  ),
  englishVoice:
    (report["transcribe_en-1"] as { status: number; text: string }).status ===
      200 && Boolean((report["transcribe_en-1"] as { text: string }).text),
  arabicVoice:
    (report["transcribe_ar-eg-1"] as { status: number; text: string })
      .status === 200 &&
    Boolean((report["transcribe_ar-eg-1"] as { text: string }).text),
  callOutcome:
    (report.callOutcome as { status: number }).status === 200 ||
    (report.callOutcome as { status: number }).status === 201,
  noUnapprovedRuns: report.runsCreatedByAssistant === 0,
};
if (Object.values(checks).some((passed) => !passed))
  throw new Error(
    `Live AI smoke failed: ${Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([name]) => name)
      .join(", ")}`,
  );
console.log("Live AI smoke checks passed.");
