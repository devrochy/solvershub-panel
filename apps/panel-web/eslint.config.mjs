import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Clases de color que no cumplen AA en algún tema (HU-DS-02, SPEC-29). Los base de
// estado (success/warning/danger), el cyan (`accent`), el oro y el azul de marca
// sirven como relleno o marca, pero no como texto ni como fondo de texto blanco.
const CLASES_SIN_AA = String.raw`\b(?:text-(?:success|warning|danger|accent|gold|blue|primary)|(?:bg|border)-(?:success|warning|danger)\/[0-9]+|bg-blue)\b`;
const MENSAJE =
  "Color sin contraste AA en algún tema. Usa text-status-*-fg, bg-status-*-bg, border-status-*-border, text-link, text-data-*, bg-action o bg-cta (DESIGN.md · Color).";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    ignores: ["**/*.test.*", "lib/api/schema.d.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: `Literal[value=/${CLASES_SIN_AA}/]`, message: MENSAJE },
        { selector: `TemplateElement[value.raw=/${CLASES_SIN_AA}/]`, message: MENSAJE },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
]);

export default eslintConfig;
