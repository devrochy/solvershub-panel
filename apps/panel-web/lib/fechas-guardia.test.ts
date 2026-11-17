import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Guardián de fechas (ADR-0201): un `Intl.DateTimeFormat` sin `timeZone` formatea en la zona del
 * servidor (UTC en SSR), que es justo el bug que estamos corrigiendo. Las fechas de calendario y
 * las horas de pared usan `timeZone: "UTC"` a propósito; las de instantes, la del negocio.
 */
function archivos(dir: string): string[] {
  const salida: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) {
      if (nombre !== "node_modules" && nombre !== ".next") salida.push(...archivos(ruta));
    } else if (/\.(ts|tsx)$/.test(nombre) && !nombre.endsWith(".test.ts") && !nombre.endsWith(".test.tsx")) {
      salida.push(ruta);
    }
  }
  return salida;
}

function infracciones(patron: RegExp): string[] {
  const raiz = process.cwd();
  const salida: string[] = [];
  for (const dir of ["app", "components", "lib"]) {
    for (const ruta of archivos(join(raiz, dir))) {
      const texto = readFileSync(ruta, "utf8");
      for (const match of texto.matchAll(patron)) {
        const ventana = texto.slice(match.index ?? 0, (match.index ?? 0) + 320);
        if (!ventana.includes("timeZone")) salida.push(ruta.replace(`${raiz}/`, ""));
      }
    }
  }
  return [...new Set(salida)];
}

describe("fechas y horas (ADR-0201)", () => {
  it("todo Intl.DateTimeFormat declara su zona", () => {
    expect(infracciones(/Intl\.DateTimeFormat\(/g)).toEqual([]);
  });

  it("todo toLocaleDateString/TimeString declara su zona", () => {
    expect(infracciones(/\.toLocale(?:Date|Time)String\(/g)).toEqual([]);
  });

  it("todo formatDateTime recibe la zona del negocio", () => {
    expect(infracciones(/formatDateTime\([^,)]*\)/g)).toEqual([]);
  });
});
