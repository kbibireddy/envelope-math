import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/envelope-math/",
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "src/shared/**/*.js",
        "src/calculators/sizing/model.js",
        "src/calculators/registry.js"
      ],
      exclude: ["src/**/*.test.js"],
      thresholds: {
        lines: 98,
        functions: 100,
        statements: 98,
        branches: 95
      }
    }
  }
});
