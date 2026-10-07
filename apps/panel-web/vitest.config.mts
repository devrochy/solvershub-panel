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
  },
});
