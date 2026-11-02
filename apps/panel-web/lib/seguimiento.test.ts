import { describe, expect, it } from "vitest";

import { ORDEN_SEGUIMIENTO, ordenValido } from "./clientes";
import {
  cuerpoDeSeguimiento,
  esHoraDelNegocio,
  ordenPorDefectoDeSeguimiento,
  seguimientoDeExtras,
  textoDeHoraDelNegocio,
  textoDeSeguimiento,
} from "./seguimiento";

// HU-CRM-21: lo que el panel muestra y manda del seguimiento del lead. La zona la decide el negocio.

describe("seguimientoDeExtras", () => {
  it("lee la fecha, la nota y la opción que calculó el servidor", () => {
    expect(
      seguimientoDeExtras({ seguimiento_en: "2031-05-04T14:00:00+00:00", seguimiento_nota: "Enviar cotización", seguimiento_estado: "vencidos" }),
    ).toEqual({ en: "2031-05-04T14:00:00+00:00", nota: "Enviar cotización", estado: "vencidos" });
  });

  it("sin fecha no hay seguimiento; una opción desconocida se ignora", () => {
    expect(seguimientoDeExtras({ seguimiento_en: null, seguimiento_nota: "x" })).toBeNull();
    expect(seguimientoDeExtras(undefined)).toBeNull();
    expect(seguimientoDeExtras({ seguimiento_en: "2031-05-04T14:00:00+00:00", seguimiento_estado: "raro", seguimiento_nota: "  " })).toEqual({
      en: "2031-05-04T14:00:00+00:00",
      nota: null,
      estado: null,
    });
  });
});

describe("fechas en la hora del negocio", () => {
  it("el instante UTC se muestra en la zona del negocio, no en la del navegador", () => {
    // 04:30 UTC del martes 3 es lunes 2, 23:30 en Bogotá.
    const bogota = textoDeSeguimiento("2026-11-03T04:30:00+00:00", "America/Bogota");
    expect(bogota).toMatch(/lun/i);
    expect(bogota).toMatch(/2/);
    expect(bogota).toMatch(/11:30/);
    expect(textoDeSeguimiento("2026-11-03T04:30:00+00:00", "Pacific/Auckland")).toMatch(/mar/i);
  });

  it("una zona inválida cae a Bogotá y una fecha ilegible no rompe", () => {
    expect(textoDeSeguimiento("2026-11-03T04:30:00+00:00", "No/Existe")).toBe(textoDeSeguimiento("2026-11-03T04:30:00+00:00"));
    expect(textoDeSeguimiento("no es fecha")).toBe("—");
  });

  it("la hora de pared del negocio se muestra tal cual, sin convertirla", () => {
    expect(textoDeHoraDelNegocio("2031-05-04T09:00")).toMatch(/9:00/);
    expect(textoDeHoraDelNegocio("2031-05-04T09:00")).toMatch(/dom/i);
    expect(textoDeHoraDelNegocio("")).toBe("—");
  });

  it("solo acepta lo que el selector entrega (y la API entiende)", () => {
    expect(esHoraDelNegocio("2031-05-04T09:00")).toBe(true);
    for (const malo of ["", "2031-05-04", "04/05/2031 09:00", "2031-05-04T09:00:00Z"]) expect(esHoraDelNegocio(malo)).toBe(false);
  });
});

describe("orden y cuerpo", () => {
  it("con un filtro de seguimiento y sin otro orden, los más atrasados primero", () => {
    expect(ordenPorDefectoDeSeguimiento(null, ["seguimiento:vencidos"])).toBe("seguimiento");
    expect(ordenPorDefectoDeSeguimiento(null, ["seguimiento:hoy", "estado_lead:nuevo"])).toBe("seguimiento");
  });

  it("respeta el orden elegido y no ordena si el filtro es «sin seguimiento» o no hay filtro", () => {
    expect(ordenPorDefectoDeSeguimiento("nombre", ["seguimiento:vencidos"])).toBe("nombre");
    expect(ordenPorDefectoDeSeguimiento(null, ["seguimiento:sin_seguimiento"])).toBeNull();
    expect(ordenPorDefectoDeSeguimiento(null, ["estado_lead:nuevo"])).toBeNull();
  });

  it("la API conoce el orden por seguimiento", () => {
    expect(ordenValido("seguimiento")).toBe(ORDEN_SEGUIMIENTO.value);
  });

  it("sin fecha, el cuerpo solo quita el seguimiento (la nota se va con la fecha)", () => {
    expect(cuerpoDeSeguimiento("Enviar cotización", "2031-05-04T09:00")).toEqual({
      seguimiento_nota: "Enviar cotización",
      seguimiento_en: "2031-05-04T09:00",
    });
    expect(cuerpoDeSeguimiento("Enviar cotización", "")).toEqual({ seguimiento_en: "" });
  });
});
