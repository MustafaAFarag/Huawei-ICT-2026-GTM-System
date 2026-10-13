import { spawn } from "node:child_process";

process.loadEnvFile(".env");
const services = ["@revenue/api", "@revenue/worker", "@revenue/web"].map(
  (name) =>
    spawn("pnpm", ["--filter", name, "dev"], {
      stdio: "inherit",
      env: process.env,
    }),
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const service of services) service.kill("SIGTERM");
  process.exitCode = code;
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
for (const service of services)
  service.on("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
