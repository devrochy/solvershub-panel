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
    // Las fichas con muchas pestañas tardan 2–3 s aisladas; con cobertura y la suite en paralelo en el runner
    // self-hosted pasaban de los 5 s por defecto (agentes-conocimiento, ayuda-pagina, qa/pantallas en main y PRs).
    testTimeout: 15_000,
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
