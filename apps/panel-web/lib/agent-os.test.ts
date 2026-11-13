import { describe, expect, it } from "vitest";

import { iguales, objetivoValido, resumenDelCambio, type Banderas } from "@/lib/agent-os";

// Agent OS del panel del master (HU-AOS-15): lo que se reenvía y el resumen de la confirmación.

const APAGADAS: Banderas = { procedures: false, routing: "off" };

describe("objetivoValido", () => {
  it("acepta solo los campos conocidos y manda runtime v3 fijo", () => {
    expect(
      objetivoValido({ runtime: "legacy", procedures: true, routing: "shadow", construir: true, tenant: "otro" }),
    ).toEqual({ runtime: "v3", procedures: true, routing: "shadow" });
  });

  it("rechaza valores fuera del catálogo o con tipos raros", () => {
    expect(objetivoValido(null)).toBeNull();
    expect(objetivoValido([])).toBeNull();
    expect(objetivoValido({ ...APAGADAS, routing: "on" })).toBeNull();
    expect(objetivoValido({ ...APAGADAS, procedures: "true" })).toBeNull();
  });
});

describe("iguales", () => {
  it("compara las dos banderas", () => {
    expect(iguales(APAGADAS, { ...APAGADAS })).toBe(true);
    expect(iguales(APAGADAS, { ...APAGADAS, routing: "shadow" })).toBe(false);
  });
});

describe("resumen de la confirmación", () => {
  it("explica el runbook de activo", () => {
    const activo = resumenDelCambio(APAGADAS, { procedures: true, routing: "active" });
    expect(activo).toContain("pass^4");
    expect(activo).toContain("una semana de prueba");
    expect(resumenDelCambio({ ...APAGADAS, routing: "shadow" }, { ...APAGADAS, routing: "active" })).not.toContain(
      "una semana",
    );
    expect(resumenDelCambio({ procedures: true, routing: "shadow" }, APAGADAS)).toContain("Apaga los recorridos");
  });
});
