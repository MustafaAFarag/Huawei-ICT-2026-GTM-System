import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

const secret = () => randomBytes(32).toString("hex");
if (!process.versions.node.startsWith("24."))
  throw new Error("Use Node 24: mise exec -- pnpm setup");
await mkdir(".local", { recursive: true });
const source = existsSync(".env")
  ? await readFile(".env", "utf8")
  : await readFile(".env.example", "utf8");
const values = Object.fromEntries(
  source
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => [
      line.slice(0, line.indexOf("=")),
      line.slice(line.indexOf("=") + 1),
    ]),
);
for (const key of [
  "POSTGRES_PASSWORD",
  "BETTER_AUTH_SECRET",
  "DEMO_PASSWORD",
  "TWENTY_ENCRYPTION_KEY",
  "OPEN_DESIGN_A_TOKEN",
  "OPEN_DESIGN_B_TOKEN",
  "SMARTLEAD_WEBHOOK_SECRET",
])
  if (!values[key]) values[key] = secret();
if (!values.DATABASE_URL || values.DATABASE_URL.includes("GENERATED_PASSWORD"))
  values.DATABASE_URL = `postgresql://revenue:${values.POSTGRES_PASSWORD}@127.0.0.1:5546/revenue`;
if (!values.STORAGE_PATH || values.STORAGE_PATH === ".local/assets")
  values.STORAGE_PATH = resolve(".local/assets");
await writeFile(
  ".env",
  Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n",
  { mode: 0o600 },
);
console.log(
  "Local environment prepared. Credentials are in ignored .env; existing connections were preserved.",
);
