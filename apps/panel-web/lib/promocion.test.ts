import { describe, expect, it } from "vitest";

import { bloquean, pasoActual } from "./promocion";

describe("promoción a producción", () => {
  it("abre el primer paso sin hacer", () => {
    const pasos = [
      { key: "real_number", label: "", done: true },
      { key: "number_registered", label: "", done: false },
      { key: "templates", label: "", done: false },
    ];
    expect(pasoActual(pasos)).toBe("number_registered");
    expect(pasoActual(pasos.map((p) => ({ ...p, done: true })))).toBeNull();
  });

  it("solo bloquea lo que falló, no lo que no se pudo evaluar", () => {
    expect(bloquean([{ ok: true }, { ok: null }, { ok: false }, {}])).toBe(1);
  });
});
