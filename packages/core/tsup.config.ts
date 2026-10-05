import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/elements.ts",
    "src/elements-auto.ts",
    "src/ai-sdk.ts",
    "src/cli.ts",
    "src/bin.ts",
  ],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
});
