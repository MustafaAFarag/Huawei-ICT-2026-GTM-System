import { defineConfig, env } from "prisma/config";

try {
  process.loadEnvFile("../../.env");
} catch {
  /* Cloud environment supplies variables directly. */
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
