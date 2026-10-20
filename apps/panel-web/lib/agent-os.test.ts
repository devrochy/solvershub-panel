import { describe, expect, it } from "vitest";

import { iguales, normalizar, objetivoValido, resumenDelCambio, type Banderas } from "@/lib/agent-os";

// Agent OS del panel del master (HU-AOS-15): orden de banderas al editar y lo que se reenvía.

const LEGACY: Banderas = { runtime: "legacy", procedures: false, routing: "off" };
const V3: Banderas = { runtime: "v3", procedures: false, routing: "off" };

describe("objetivoValido", () => {
  it("acepta solo los cuatro campos conocidos", () => {
    expect(objetivoValido({ runtime: "v3", procedures: true, routing: "shadow", tenant: "otro", admin_id: "x" })).toEqual({
      runtime: "v3",
      procedures: true,
      routing: "shadow",
      construir: false,
    });
    expect(objetivoValido({ ...V3, construir: true })?.construir).toBe(true);
  });

  it("rechaza valores fuera del catálogo o con tipos raros", () => {
    expect(objetivoValido(null)).toBeNull();
    expect(objetivoValido([])).toBeNull();
    expect(objetivoValido({ ...V3, runtime: "v4" })).toBeNull();
    expect(objetivoValido({ ...V3, routing: "on" })).toBeNull();
    expect(objetivoValido({ ...V3, procedures: "true" })).toBeNull();
    expect(objetivoValido({ ...V3, construir: "si" })).toBeNull();
  });
});

describe("orden de banderas al editar", () => {
  it("volver a legacy apaga procedimientos y ruteo", () => {
    expect(normalizar({ runtime: "legacy", procedures: true, routing: "active" })).toEqual(LEGACY);
    const todo: Banderas = { runtime: "v3", procedures: true, routing: "active" };
    expect(normalizar(todo)).toEqual(todo);
  });

  it("compara los tres valores", () => {
    expect(iguales(V3, { ...V3 })).toBe(true);
    expect(iguales(V3, { ...V3, routing: "shadow" })).toBe(false);
  });
});

describe("resumen de la confirmación", () => {
  it("explica la migración y el runbook de activo", () => {
    expect(resumenDelCambio(LEGACY, V3)).toContain("backfills");
    const activo = resumenDelCambio(V3, { runtime: "v3", procedures: true, routing: "active" });
    expect(activo).toContain("pass^4");
    expect(activo).toContain("una semana en sombra");
    expect(resumenDelCambio({ ...V3, routing: "shadow" }, { ...V3, routing: "active" })).not.toContain("una semana");
    expect(resumenDelCambio({ runtime: "v3", procedures: true, routing: "shadow" }, LEGACY)).toContain("Vuelve a legacy");
  });
});
