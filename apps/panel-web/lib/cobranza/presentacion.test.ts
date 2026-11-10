import { describe, expect, it } from "vitest";

import { agruparPromesas, cuandoEs, diasHasta, fechaDeHoy, type PromesaDeAgenda } from "@/lib/cobranza/agenda";
import {
  cambiosDeAuditoria,
  cifrasDelCierre,
  diasDeMora,
  etiquetaDeRiesgo,
  loQueCubre,
  montoDeResumen,
  quienPacto,
} from "@/lib/cobranza/presentacion";
import { formatDate } from "@/lib/format";

// Lunes.
const HOY = "2026-11-09";

function promesa(id: string, fecha_prometida: string, estado = "pendiente"): PromesaDeAgenda {
  return { id, cliente: id, fecha_prometida, valor_prometido: 1000, estado, tipo: "promesa", creado_por: "ia" };
}

describe("agenda de promesas", () => {
  it("agrupa las pendientes por cuándo toca cobrar", () => {
    const { grupos, decididas } = agruparPromesas(
      [
        promesa("vieja", "2026-11-02"),
        promesa("hoy", HOY),
        promesa("domingo", "2026-11-15"),
        promesa("lunes", "2026-11-16"),
        promesa("cumplida", "2026-11-09", "cumplida"),
      ],
      HOY,
    );
    expect(grupos.vencidas.map((p) => p.id)).toEqual(["vieja"]);
    expect(grupos.hoy.map((p) => p.id)).toEqual(["hoy"]);
    expect(grupos.semana.map((p) => p.id)).toEqual(["domingo"]);
    expect(grupos.despues.map((p) => p.id)).toEqual(["lunes"]);
    expect(decididas.map((p) => p.id)).toEqual(["cumplida"]);
  });

  it("un domingo, lo de mañana ya es más adelante", () => {
    const { grupos } = agruparPromesas([promesa("lunes", "2026-11-16")], "2026-11-15");
    expect(grupos.semana).toEqual([]);
    expect(grupos.despues.map((p) => p.id)).toEqual(["lunes"]);
  });

  it("ordena cada grupo por fecha", () => {
    const { grupos } = agruparPromesas([promesa("b", "2026-11-05"), promesa("a", "2026-11-02")], HOY);
    expect(grupos.vencidas.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("dice la fecha como se dice", () => {
    expect(cuandoEs(HOY, HOY)).toBe("Hoy");
    expect(cuandoEs("2026-11-10", HOY)).toBe("Mañana");
    expect(cuandoEs("2026-11-08", HOY)).toBe("Ayer");
    expect(cuandoEs("2026-11-02", HOY)).toBe("Hace 7 días");
    expect(cuandoEs("2026-11-12", HOY)).toBe("Jueves 12");
    expect(cuandoEs("2026-12-03", HOY)).toBe("3 de diciembre");
    expect(diasHasta("2026-11-12", HOY)).toBe(3);
  });

  it("hoy es el día del negocio, no el del servidor", () => {
    expect(fechaDeHoy("America/Bogota", new Date("2026-11-10T03:00:00Z"))).toBe(HOY);
  });
});

describe("valores legibles de Cobranza", () => {
  it("el riesgo se lee con palabras y no con su color", () => {
    expect(etiquetaDeRiesgo("rojo")).toBe("Riesgo alto");
    expect(etiquetaDeRiesgo("azul")).toBe("En seguimiento");
    expect(etiquetaDeRiesgo("blanco")).toBe("Sin riesgo");
  });

  it("los montos del resumen vuelven a ser números", () => {
    expect(montoDeResumen("48.350.000")).toBe(48_350_000);
    expect(montoDeResumen(undefined)).toBe(0);
  });

  it("dice quién pactó y qué cubre", () => {
    expect(quienPacto("ia")).toBe("el agente");
    expect(quienPacto("propietario")).toBe("el dueño");
    expect(loQueCubre("saldo_total", "promesa")).toBe("Saldo total");
    expect(loQueCubre(null, "refinanciacion")).toBe("Refinanciación");
    expect(loQueCubre(null, "promesa")).toBeNull();
  });

  it("escribe un cambio de auditoría sin JSON ni ids", () => {
    expect(
      cambiosDeAuditoria({ valor_esperado: 50000, estatus: "pendiente" }, { valor_esperado: 45000, estatus: "pendiente" }),
    ).toEqual(["Valor: $ 50.000 → $ 45.000"]);
    expect(cambiosDeAuditoria(null, { valor: 1000, cuota_id: "abc" })).toEqual(["Valor: $ 1.000"]);
    expect(cambiosDeAuditoria({ aprobado: false }, { aprobado: true })).toEqual(["Aprobado: No → Sí"]);
  });

  it("nombra las cifras de un cierre, también las anidadas", () => {
    expect(cifrasDelCierre({ cobrado_dia: 420000, conteos: { visitas: 18 } })).toBe("Cobrado del día: $ 420.000 · Visitas: 18");
    expect(cifrasDelCierre({})).toBe("—");
  });

  it("la mora se dice en días", () => {
    expect(diasDeMora(0)).toBe("Al día");
    expect(diasDeMora(1)).toBe("1 día");
    expect(diasDeMora(12)).toBe("12 días");
  });

  it("una fecha sin hora conserva su día", () => {
    expect(formatDate("2026-01-10")).toMatch(/^10\/0?1\/(20)?26$/);
  });
});
