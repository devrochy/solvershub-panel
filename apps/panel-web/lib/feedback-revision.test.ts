import { describe, expect, it } from "vitest";

import {
  antiguedad,
  consultaDeBandeja,
  decideReportes,
  enlaceDeBandeja,
  mensajeDeRevision,
  tamano,
  veBandejaDeReportes,
} from "@/lib/feedback-revision";

// Bandeja de reportes (SPEC-54, HU-FB-06): quién ve y quién decide, los filtros que llegan a la API y
// los errores de la revisión en palabras.

const NEGOCIO = "a1b2c3d4-e5f6-4789-abcd-ef0123456789";

describe("bandeja de reportes", () => {
  it("el tester ve la bandeja pero solo el master decide", () => {
    expect(veBandejaDeReportes({ role: "master" })).toBe(true);
    expect(veBandejaDeReportes({ role: "tester" })).toBe(true);
    expect(veBandejaDeReportes({ role: "admin" })).toBe(false);
    expect(veBandejaDeReportes(null)).toBe(false);
    expect(decideReportes({ role: "master" })).toBe(true);
    expect(decideReportes({ role: "tester" })).toBe(false);
  });

  it("la consulta lleva solo filtros válidos y un límite acotado", () => {
    expect(consultaDeBandeja({ estado: "aprobado", tipo: "idea", tenant_id: NEGOCIO, cursor: "MjAyNi0x" })).toBe(
      `?estado=aprobado&tipo=idea&tenant_id=${NEGOCIO}&cursor=MjAyNi0x&limit=25`,
    );
    expect(consultaDeBandeja({ estado: "todo", tipo: "x", tenant_id: "1 OR 1", cursor: "a&b=c" }, 500)).toBe("?limit=50");
  });

  it("cambiar un filtro vuelve a la primera página", () => {
    expect(enlaceDeBandeja({ estado: "recibido", cursor: "abc" }, { tipo: "error" })).toBe("/plataforma/feedback?estado=recibido&tipo=error");
    expect(enlaceDeBandeja({ estado: "recibido" }, { cursor: "abc" })).toBe("/plataforma/feedback?estado=recibido&cursor=abc");
    expect(enlaceDeBandeja({})).toBe("/plataforma/feedback");
  });

  it("los errores de la revisión se explican y los 409 recargan", () => {
    expect(mensajeDeRevision(409, { code: "reporte_ya_decidido", details: { estado: "aprobado" } })).toEqual({
      mensaje: "Este reporte ya fue decidido (aprobado). Actualizamos la vista con su estado real.",
      recargar: true,
    });
    expect(mensajeDeRevision(409, { code: "reporte_ya_tomado", details: { revisado_por: NEGOCIO } }).recargar).toBe(true);
    expect(mensajeDeRevision(422, { code: "tope_reporte_excedido", details: { maximo: 5000 } }).mensaje).toMatch(/tope por reporte \(5\.000 créditos\)/);
    expect(mensajeDeRevision(422, { code: "tope_mensual_excedido", details: { maximo: 10000, regalado: 9000, disponible: 1000 } }).mensaje).toBe(
      "El monto pasa el tope mensual de regalos de este negocio: el tope del mes es 10.000 créditos, ya se regalaron 9.000, quedan 1.000.",
    );
    expect(mensajeDeRevision(409, { code: "sin_ciclo_de_creditos" }).mensaje).toMatch(/ciclo de créditos/);
    expect(mensajeDeRevision(403, { error: "Solo el master decide los reportes." }).mensaje).toBe("Solo el master decide los reportes.");
    expect(mensajeDeRevision(500, null).mensaje).toMatch(/No se pudo completar/);
  });

  it("antigüedad y tamaño en palabras", () => {
    const ahora = new Date("2026-11-27T12:00:00Z");
    expect(antiguedad("2026-11-27T11:59:30Z", ahora)).toBe("hace un momento");
    expect(antiguedad("2026-11-27T09:00:00Z", ahora)).toBe("hace 3 h");
    expect(antiguedad("2026-11-25T12:00:00Z", ahora)).toBe("hace 2 d");
    expect(tamano(340 * 1024)).toBe("340 KB");
    expect(tamano(2.1 * 1024 * 1024)).toBe("2,1 MB");
  });
});
