import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

let directory = process.cwd();
while (
  !existsSync(join(directory, ".node-version")) &&
  dirname(directory) !== directory
)
  directory = dirname(directory);
if (existsSync(join(directory, ".env")))
  process.loadEnvFile(join(directory, ".env"));

export const ROOT = directory;
export const config = {
  fixture: process.env.PROVIDER_MODE !== "live",
  queueName: process.env.QUEUE_NAME ?? "revenue-runs",
  redis: process.env.REDIS_URL ?? "redis://127.0.0.1:6386",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3100",
  apiPort: Number(process.env.API_PORT ?? 4100),
  storagePath: process.env.STORAGE_PATH ?? join(ROOT, ".local/assets"),
};

export function required(name: string): string {
  const value = process.env[name];
  if (!value)
    throw new Error(
      `${name} is not configured. Ask the workspace owner to connect the service.`,
    );
  return value;
}
