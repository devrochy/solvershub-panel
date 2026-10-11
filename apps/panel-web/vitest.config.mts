import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    globals: true,
    include: ["lib/**/*.test.ts", "lib/**/*.test.tsx", "components/**/*.test.ts", "components/**/*.test.tsx"],
    environment: "node",
    // Cobertura (HU-UI-04): `npm run test:coverage`. El CI la publica como artefacto.
    coverage: {
      provider: "v8",
      include: ["lib/**", "components/**"],
      exclude: ["lib/testing/**", "lib/api/schema.d.ts", "**/*.test.*"],
      reporter: ["text-summary", "html"],
      reportsDirectory: "coverage",
    },
  },
});
