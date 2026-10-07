import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    coverage: {
      include: ["src/**"],
      exclude: ["src/bin.ts"],
      thresholds: { lines: 90, statements: 85, functions: 90, branches: 70 },
    },
  },
});
