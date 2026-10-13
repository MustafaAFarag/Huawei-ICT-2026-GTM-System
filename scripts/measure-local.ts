import { request } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
if (existsSync(".env")) process.loadEnvFile(".env");
const origin = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const client = await request.newContext({
  baseURL: origin,
  extraHTTPHeaders: { Origin: origin },
});
const signed = await client.post("/api/auth/sign-in/email", {
  data: { email: process.env.DEMO_EMAIL, password: process.env.DEMO_PASSWORD },
});
if (!signed.ok()) throw new Error(`Sign-in failed (${signed.status()}).`);
const me = await (await client.get("/api/me")).json(),
  workspace = me.workspaces.find(
    (m: { workspace: { name: string } }) =>
      m.workspace.name === "Revenue Demo A",
  ).workspace.id;
const dashboard: number[] = [],
  acknowledgement: number[] = [];
for (let i = 0; i < 20; i++) {
  const start = performance.now(),
    result = await client.get(`/api/workspaces/${workspace}`);
  if (!result.ok()) throw new Error(`Dashboard returned ${result.status()}`);
  dashboard.push(performance.now() - start);
}
// A zero-credit fixture preflight is a durable job, separate from provider/render timings.
for (let i = 0; i < 10; i++) {
  const start = performance.now(),
    result = await client.post(`/api/workspaces/${workspace}/runs`, {
      data: { tool: "preflight", requestKey: randomUUID() },
    });
  if (!result.ok())
    throw new Error(`Acknowledgement returned ${result.status()}`);
  acknowledgement.push(performance.now() - start);
}
function percentiles(values: number[]) {
  values.sort((a, b) => a - b);
  return {
    samples: values.length,
    p50Ms: Math.round(values[Math.floor(values.length * 0.5)]!),
    p95Ms: Math.round(
      values[Math.min(values.length - 1, Math.ceil(values.length * 0.95) - 1)]!,
    ),
  };
}
console.log(
  JSON.stringify(
    {
      baseURL: process.env.TEST_BASE_URL ?? "http://localhost:3100",
      dashboard: percentiles(dashboard),
      jobAcknowledgement: percentiles(acknowledgement),
      limits:
        "Local sequential fixture measurements; excludes models, paid providers and PDF rendering.",
    },
    null,
    2,
  ),
);
await client.dispose();
