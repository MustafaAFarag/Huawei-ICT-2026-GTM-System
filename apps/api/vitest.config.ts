import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    // Tests never call paid models or live providers, whatever .env says.
    env: {
      QUEUE_NAME: process.env.QUEUE_NAME ?? "revenue-tests",
      MODEL_MODE: "fixture",
      PROVIDER_MODE: "fixture",
    },
    include: ["test/**/*.test.ts", "../../packages/backend/test/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
