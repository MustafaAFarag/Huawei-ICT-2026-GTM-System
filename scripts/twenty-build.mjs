import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
const result = spawnSync(
  "pnpm",
  [
    "--filter",
    "gtm-command-center-twenty",
    "exec",
    "twenty",
    "dev:build",
    resolve("twenty-app"),
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
