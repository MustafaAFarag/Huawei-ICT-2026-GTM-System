import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
process.loadEnvFile(".env");
const binding = process.argv[2] ?? "A";
const remote = `revenue-demo-${binding.toLowerCase()}`;
const key = process.env[`TWENTY_${binding}_API_KEY`];
if (!key) throw new Error("Configure the native workspace API key first.");
const env = { ...process.env, NODE_ENV: "test" };
function command(args) {
  const result = spawnSync(
    "pnpm",
    ["--filter", "gtm-command-center-twenty", "exec", "twenty", ...args],
    { env, stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
command([
  "remote:add",
  "--test",
  "--as",
  remote,
  "--url",
  "http://127.0.0.1:3200",
  "--api-key",
  key,
]);
command([
  "-r",
  remote,
  process.argv[3] ?? "plan",
  "--no-delete",
  resolve("twenty-app"),
]);
