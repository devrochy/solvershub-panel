#!/usr/bin/env node
// Sincroniza los design tokens generados de la marca (SolversHub) al panel.
//
// Fuente única: solvershub/brand/tokens/tokens.json → tokens.css (generado por
// brand/tokens/build.mjs). Aquí solo se COPIA el CSS ya generado; si cambias la
// paleta, edita tokens.json y corre `npm run build` en brand/tokens, luego esto.
//
// Uso: npm run tokens:sync   (o `node scripts/sync-tokens.mjs <ruta-al-brand>`)

import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arg = process.argv[2];
const brandTokens = arg
  ? resolve(arg)
  : join(ROOT, "..", "..", "brand", "tokens");

const src = join(brandTokens, "tokens.css");
const dest = join(ROOT, "app", "tokens.css");

if (!existsSync(src)) {
  console.error(`✗ No existe ${src}. Corre primero: (cd brand/tokens && npm run build)`);
  process.exit(1);
}
copyFileSync(src, dest);
console.log(`✓ ${dest}`);
