#!/usr/bin/env node
// Backend de prueba para mirar el panel sin agent-core (HU-UI-03).
//
// Sirve `/api/v1/*` con las mismas respuestas ficticias de los tests
// (`lib/testing/fixtures.ts`), así que lo que se ve en el navegador es lo que prueban
// los tests de accesibilidad. Requiere Node >= 23.6 (corre TypeScript sin compilar).
//
//   node scripts/backend-de-prueba.mjs            # escucha en :8765
//   PUERTO=8800 BOT_PAUSADO=1 node scripts/backend-de-prueba.mjs
//
// Luego, en otra terminal:
//   AGENT_CORE_API_URL=http://localhost:8765 npm run start -- -p 3293
// y en el navegador crea la cookie de sesión de prueba (cualquier valor sirve):
//   document.cookie = "panel_session=prueba; path=/"
//
// Las rutas sin fixture responden 404 (la página muestra su estado de error).

import { createServer } from "node:http";

const { RESPUESTAS, ajustes } = await import("../lib/testing/fixtures.ts");

const puerto = Number(process.env.PUERTO ?? 8765);
const respuestas = { ...RESPUESTAS };
if (process.env.BOT_PAUSADO === "1") {
  respuestas["/admin/settings"] = { ...ajustes, identity: { ...ajustes.identity, bot_paused: true } };
}

createServer((req, res) => {
  const ruta = (req.url ?? "").split("?")[0].replace(/^\/api\/v1/, "");
  const cuerpo = req.method === "GET" ? respuestas[ruta] : { ok: true };
  res.setHeader("Content-Type", "application/json");
  if (cuerpo === undefined) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: { message: `Sin fixture para ${ruta}` } }));
    return;
  }
  res.end(JSON.stringify(cuerpo));
}).listen(puerto, () => {
  console.log(`backend de prueba en http://localhost:${puerto} (${Object.keys(respuestas).length} rutas)`);
});
