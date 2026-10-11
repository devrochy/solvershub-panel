#!/usr/bin/env node
// Tipos de la API del panel desde el OpenAPI de agent-core (ADR-0077, HU-UI-04).
//
//   node scripts/api-types.mjs           regenera lib/api/schema.d.ts
//   node scripts/api-types.mjs --check   falla (código 1) si lib/api/schema.d.ts no
//                                        coincide con el OpenAPI actual: deriva de tipos
//
// De dónde sale el OpenAPI, en orden:
//   1. OPENAPI_PATH: ruta a un openapi.json (el CI hace checkout de agent-core aquí).
//   2. `origin/develop:docs/openapi.json` del backend local (../../../solvershub-backend),
//      leído con git y sin tocar su árbol de trabajo (que suele estar en otra rama).
//      La rama se cambia con API_TYPES_REF.
// La referencia es `develop` porque el panel se integra contra la rama de integración
// del backend (la app hace lo mismo, ADR-APP-06).

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = join(ROOT, "lib", "api", "schema.d.ts");
const BACKEND = resolve(ROOT, "..", "..", "..", "solvershub-backend");
const REF = process.env.API_TYPES_REF || "origin/develop";
const check = process.argv.includes("--check");
const tmp = mkdtempSync(join(tmpdir(), "panel-api-types-"));

function fuente() {
  if (process.env.OPENAPI_PATH) {
    if (!existsSync(process.env.OPENAPI_PATH)) throw new Error(`OPENAPI_PATH no existe: ${process.env.OPENAPI_PATH}`);
    return { ruta: process.env.OPENAPI_PATH, origen: process.env.OPENAPI_PATH };
  }
  const [remoto, ...rama] = REF.split("/");
  if (rama.length) execFileSync("git", ["-C", BACKEND, "fetch", "--quiet", remoto, rama.join("/")], { stdio: "ignore" });
  const contenido = execFileSync("git", ["-C", BACKEND, "show", `${REF}:docs/openapi.json`], { maxBuffer: 64 * 1024 * 1024 });
  const ruta = join(tmp, "openapi.json");
  writeFileSync(ruta, contenido);
  return { ruta, origen: `${REF}:docs/openapi.json de ${BACKEND}` };
}

let origen;
let generado;
try {
  const f = fuente();
  origen = f.origen;
  generado = check ? join(tmp, "schema.d.ts") : SALIDA;
  execFileSync(join(ROOT, "node_modules", ".bin", "openapi-typescript"), [f.ruta, "-o", generado], { stdio: "ignore" });
} catch (error) {
  console.error(`✗ api:types: no se pudo leer el OpenAPI (${error.message}).`);
  console.error("  Define OPENAPI_PATH o clona el backend en ../../../solvershub-backend.");
  process.exit(2);
}

if (!check) {
  console.log(`✓ lib/api/schema.d.ts regenerado desde ${origen}`);
  process.exit(0);
}

const actual = readFileSync(SALIDA, "utf8");
const esperado = readFileSync(generado, "utf8");
if (actual === esperado) {
  console.log(`✓ api:types: lib/api/schema.d.ts al día con ${origen}`);
  process.exit(0);
}

console.error(`✗ api:types: lib/api/schema.d.ts no coincide con ${origen}.`);
console.error("  Corre `npm run api:types`, revisa el typecheck y commitea el resultado.\n");
try {
  execFileSync("git", ["diff", "--no-index", "--stat", "--", SALIDA, generado], { stdio: "inherit" });
} catch {
  // git diff --no-index sale con 1 cuando hay diferencias: es lo esperado.
}
process.exit(1);
