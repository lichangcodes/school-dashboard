import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    // Every file shares one database, so run files one at a time.
    fileParallelism: false,
    // Each request is a round trip to Neon, so allow more than the 5s default.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
