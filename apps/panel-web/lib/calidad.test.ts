import { describe, expect, it } from "vitest";

import { cuenta, filtrosDeCalidad, modoA2A, origenDeCorrida, porcentaje, puedeMarcar, queryDeCalidad, segundos, tipoDeRechazo } from "@/lib/calidad";

const CONEXION = "c811a870-36fa-4a85-b3f4-d3035e67a5e2";

describe("filtros de calidad", () => {
  it("acepta solo períodos conocidos y conexiones con forma de uuid", () => {
    expect(filtrosDeCalidad({ dias: "7", conexion: CONEXION })).toEqual({ dias: 7, conexion: CONEXION });
    expect(filtrosDeCalidad({ dias: "13", conexion: "x' or 1=1" })).toEqual({ dias: 30, conexion: null });
  });

  it("arma la query con la ventana y la conexión", () => {
    const ahora = new Date("2026-10-25T12:00:00Z");
    const qs = new URLSearchParams(queryDeCalidad({ dias: 7, conexion: CONEXION }, ahora));
    expect(qs.get("desde")).toBe("2026-10-18T12:00:00.000Z");
    expect(qs.get("connection_id")).toBe(CONEXION);
    expect(new URLSearchParams(queryDeCalidad({ dias: 30, conexion: null }, ahora)).has("connection_id")).toBe(false);
  });
});

describe("textos", () => {
  it("muestra fracciones como porcentaje y «—» sin datos suficientes", () => {
    expect(porcentaje(0.24)).toBe("24 %");
    expect(porcentaje(0.8567)).toBe("85,7 %");
    expect(porcentaje(null)).toBe("—");
  });

  it("concuerda el número con la palabra", () => {
    expect(cuenta(1, "turno", "turnos")).toBe("1 turno");
    expect(cuenta(1200, "turno", "turnos")).toBe("1.200 turnos");
  });

  it("muestra la latencia en ms o segundos", () => {
    expect(segundos(850)).toBe("850 ms");
    expect(segundos(1240)).toBe("1,2 s");
    expect(segundos(null)).toBe("—");
  });

  it("nombra los rechazos, modos y orígenes conocidos y deja legible el resto", () => {
    expect(tipoDeRechazo("monto_sin_evidencia")).toBe("Montos sin respaldo");
    expect(tipoDeRechazo("algo_nuevo")).toBe("Algo nuevo");
    expect(modoA2A("query")).toBe("Consulta");
    expect(modoA2A(null)).toBe("—");
    expect(origenDeCorrida("gate")).toBe("Antes de publicar");
  });

  it("solo marca quien escribe en Agentes o es master", () => {
    expect(puedeMarcar({ role: "master" })).toBe(true);
    expect(puedeMarcar({ role: "colaborador", permissions: { agents: "write" } })).toBe(true);
    expect(puedeMarcar({ role: "colaborador", permissions: { agents: "read" } })).toBe(false);
  });
});
