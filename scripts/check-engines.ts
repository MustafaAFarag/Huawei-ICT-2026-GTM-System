import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

process.loadEnvFile(".env");
const urlA = process.env.OPEN_DESIGN_A_URL!;
const urlB = process.env.OPEN_DESIGN_B_URL!;
const headersA = {
  Authorization: `Bearer ${process.env.OPEN_DESIGN_A_TOKEN!}`,
  "Content-Type": "application/json",
};
const headersB = {
  Authorization: `Bearer ${process.env.OPEN_DESIGN_B_TOKEN!}`,
  "Content-Type": "application/json",
};
assert.equal((await fetch(`${process.env.TWENTY_A_URL}/healthz`)).status, 200);
const blocked = await fetch(`${urlB}/api/projects`, { headers: headersA });
assert.equal(
  blocked.status,
  401,
  "Workspace B must reject workspace A credentials",
);
const html =
  '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>اختبار العزل</title><body><h1>مراجعة موقع الشركة</h1><p>بيانات تجريبية مصطنعة</p></body></html>';
const saved = await fetch(`${urlA}/api/artifacts/save`, {
  method: "POST",
  headers: headersA,
  body: JSON.stringify({
    identifier: randomUUID(),
    title: "Workspace isolation check",
    html,
  }),
});
assert.equal(saved.status, 200);
const artifact = (await saved.json()) as { url: string };
assert.equal(
  (await fetch(`${urlA}${artifact.url}`, { headers: headersA })).status,
  200,
);
assert.equal(
  (await fetch(`${urlB}${artifact.url}`, { headers: headersB })).status,
  404,
  "Workspace A artifact must not exist in B",
);
const missingModel = await fetch(`${urlA}/api/proxy/openai/stream`, {
  method: "POST",
  headers: headersA,
  body: JSON.stringify({ messages: [] }),
});
assert.equal(missingModel.status, 400);
const result = {
  twentyHealth: "passed",
  openDesignInstances: 2,
  authenticationIsolation: "passed",
  fileIsolation: "passed",
  byokInputValidation: "passed",
  realModelGeneration: "not exercised by this check; run scripts/asset-smoke.ts separately",
  release: "open-design-v0.24.1",
  commit: "89e64d813bb1c7a11519b3f668f011f7017637d7",
  checkedAt: new Date().toISOString(),
};
await writeFile(".local/engine-check.json", JSON.stringify(result, null, 2));
console.log(result);
