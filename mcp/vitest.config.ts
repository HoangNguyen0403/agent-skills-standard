import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.spec.ts"],
    environment: "node",
    // Windows ACL helper round trips; slowest measured pass 7.0 s, byte-ceiling CLI 12.1 s.
    testTimeout: process.platform === "win32" ? 20_000 : 5_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: ["dist/**", "test/**", "**/*.config.ts"],
    },
  },
});
