// Rasteriza SVG → PNG con sharp (librsvg). Uso:
//   node render.mjs '[{"in":"a.svg","out":"a.png","width":512,"height":512,"background":"#0B1733"}]'
// o bien con un archivo JSON:  node render.mjs @jobs.json
// sharp se toma de SHARP_PATH o del primer node_modules/sharp que aparezca subiendo
// desde aquí (también en un solvershub-landing hermano de algún ancestro).
import { createRequire } from "node:module";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function findSharp() {
  if (process.env.SHARP_PATH) return process.env.SHARP_PATH;
  for (let dir = here; dir !== dirname(dir); dir = dirname(dir)) {
    for (const cand of ["node_modules/sharp", "solvershub-landing/node_modules/sharp"]) {
      if (existsSync(resolve(dir, cand))) return resolve(dir, cand);
    }
  }
  throw new Error("No encuentro sharp: instala sharp o define SHARP_PATH");
}

const sharp = createRequire(import.meta.url)(findSharp());

const arg = process.argv[2];
const jobs = JSON.parse(arg.startsWith("@") ? readFileSync(arg.slice(1), "utf8") : arg);

for (const job of jobs) {
  const svg = readFileSync(job.in);
  // densidad alta para que librsvg no rasterice a baja resolución antes de escalar
  const density = job.density ?? 288;
  let img = sharp(svg, { density, limitInputPixels: false });
  if (job.width || job.height) {
    img = img.resize(job.width ?? null, job.height ?? null, {
      fit: "contain",
      background: job.background ?? { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: "lanczos3",
    });
  }
  if (job.background) img = img.flatten({ background: job.background });
  mkdirSync(dirname(job.out), { recursive: true });
  await img.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(job.out);
}
console.log(`ok ${jobs.length}`);
