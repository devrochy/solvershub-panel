// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * El cierre animado del centro de notificaciones (ADR-0167) vive en `globals.css`: Radix solo
 * desmonta tras el `animationend` si el estado `closed` tiene una animación. jsdom no resuelve ese
 * CSS, así que se verifica el archivo real: cada superficie tiene entrada y salida, la salida usa
 * un @keyframes existente que es el espejo de la entrada, termina en el estado final (`forwards`)
 * y no dura más que la entrada.
 */
const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

const ORDEN_DURACION: Record<string, number> = { instant: 0, fast: 1, base: 2, slow: 3 };

function regla(selector: string): string {
  const escapado = selector.replace(/[.[\]"=]/g, (c) => `\\${c}`);
  const m = css.match(new RegExp(`${escapado}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`falta la regla ${selector} en globals.css`);
  return m[1];
}

function keyframes(nombre: string): { from: string; to: string } {
  const m = css.match(new RegExp(`@keyframes ${nombre}\\s*\\{\\s*from\\s*\\{([^}]*)\\}\\s*to\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`falta @keyframes ${nombre}`);
  return { from: m[1].replace(/\s+/g, " ").trim(), to: m[2].replace(/\s+/g, " ").trim() };
}

function animacion(selector: string) {
  const decl = regla(selector).match(/animation:\s*([^;]+);/);
  if (!decl) throw new Error(`${selector} no declara animation`);
  const partes = decl[1].trim().split(/\s+/);
  const duracion = decl[1].match(/--sh-motion-duration-(\w+)/)?.[1] ?? "";
  return { nombre: partes[0], duracion, forwards: partes.includes("forwards") };
}

const SUPERFICIES = [
  { clase: ".sh-notif-popover", entra: "sh-notif-entra", sale: "sh-notif-sale" },
  { clase: ".sh-notif-hoja", entra: "sh-notif-sube", sale: "sh-notif-baja" },
  { clase: ".sh-notif-overlay", entra: "sh-notif-fundido-entra", sale: "sh-notif-fundido-sale" },
];

describe("CSS del centro de notificaciones: apertura y cierre animados", () => {
  for (const s of SUPERFICIES) {
    describe(s.clase, () => {
      const abierta = animacion(`${s.clase}[data-state="open"]`);
      const cerrada = animacion(`${s.clase}[data-state="closed"]`);

      it("anima la entrada y la salida con keyframes que existen", () => {
        expect(abierta.nombre).toBe(s.entra);
        expect(cerrada.nombre).toBe(s.sale);
        expect(() => keyframes(s.entra)).not.toThrow();
        expect(() => keyframes(s.sale)).not.toThrow();
      });

      it("la salida es el espejo de la entrada", () => {
        const entra = keyframes(s.entra);
        const sale = keyframes(s.sale);
        expect(sale.from).toBe(entra.to);
        expect(sale.to).toBe(entra.from);
      });

      it("la salida queda en su estado final y no dura más que la entrada", () => {
        expect(cerrada.forwards).toBe(true);
        expect(ORDEN_DURACION[cerrada.duracion]).toBeLessThanOrEqual(ORDEN_DURACION[abierta.duracion]);
      });
    });
  }

  it("la salida de la hoja móvil es un deslizamiento hacia abajo y la de los demás un fundido", () => {
    expect(keyframes("sh-notif-baja").to).toContain("translateY(100%)");
    expect(keyframes("sh-notif-sale").to).toContain("opacity: 0");
    expect(keyframes("sh-notif-fundido-sale").to).toContain("opacity: 0");
  });

  it("prefers-reduced-motion reduce la duración de toda animación a ~0", () => {
    const m = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[^@]*?animation-duration:\s*0\.001ms\s*!important/);
    expect(m).not.toBeNull();
  });
});
