import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    env: { QUEUE_NAME: "revenue-tests" },
    include: ["test/**/*.test.ts", "../../packages/backend/test/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
