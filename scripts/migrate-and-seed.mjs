import { spawnSync } from "node:child_process";
for (const command of ["db:migrate", "db:seed"]) {
  const result = spawnSync("pnpm", [command], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
