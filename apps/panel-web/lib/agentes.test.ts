import { describe, expect, it } from "vitest";

import {
  consistencia,
  estadoDeTarea,
  filtrosDe,
  hrefDeAgente,
  nombreDeProcedimiento,
  pestanaValida,
  puedeEditarAgentes,
  queryDeApi,
  refValido,
  tipoDeRegistro,
} from "@/lib/agentes";

const ID = "3f1c2a4b-1111-4222-8333-944455556666";

describe("sección Agentes (HU-AOS-47)", () => {
  it("acepta solo un id o `general` como ref", () => {
    expect(refValido("general")).toBe("general");
    expect(refValido(ID.toUpperCase())).toBe(ID);
    expect(refValido("ventas")).toBeNull();
    expect(refValido(undefined)).toBeNull();
  });

  it("normaliza filtros de la URL", () => {
    expect(filtrosDe({})).toEqual({ dias: 30, conexion: null, pagina: 1, estado: null });
    expect(filtrosDe({ dias: "7", conexion: ID, page: "3", estado: "closed" })).toEqual({
      dias: 7,
      conexion: ID,
      pagina: 3,
      estado: "closed",
    });
    expect(filtrosDe({ dias: "999", conexion: "x' or 1", page: "-1", estado: "raro" })).toEqual({
      dias: 30,
      conexion: null,
      pagina: 1,
      estado: null,
    });
    expect(pestanaValida("consumo")).toBe("consumo");
    expect(pestanaValida("otra")).toBe("conversaciones");
  });

  it("arma la query de la API con el período", () => {
    const ahora = new Date("2026-10-18T12:00:00Z");
    const qs = new URLSearchParams(queryDeApi({ dias: 7, conexion: ID, pagina: 2, estado: "open" }, ahora));
    expect(qs.get("desde")).toBe("2026-10-11T12:00:00.000Z");
    expect(qs.get("connection_id")).toBe(ID);
    expect(qs.get("page")).toBe("2");
    expect(qs.get("state")).toBe("open");
    expect(new URLSearchParams(queryDeApi({ dias: 30, conexion: null, pagina: 1, estado: null }, ahora, false)).has("page")).toBe(false);
  });

  it("conserva los filtros al cambiar de pestaña y vuelve a la página 1", () => {
    const actual = { tab: "conversaciones" as const, dias: 7, conexion: ID, pagina: 4, estado: null };
    expect(hrefDeAgente("general", actual, { tab: "tareas" })).toBe(`/agentes/general?tab=tareas&dias=7&conexion=${ID}`);
    expect(hrefDeAgente("general", actual, { page: 5 })).toBe(`/agentes/general?dias=7&conexion=${ID}&page=5`);
    expect(hrefDeAgente("general", actual, { conexion: null })).toBe("/agentes/general?dias=7");
  });

  it("traduce estados, tipos y procedimientos", () => {
    expect(estadoDeTarea("escalated")).toBe("Pasó a una persona");
    expect(estadoDeTarea("nuevo")).toBe("Otro estado");
    expect(tipoDeRegistro("promesa")).toBe("Promesa de pago");
    expect(tipoDeRegistro("reserva_mesa")).toBe("reserva mesa");
    expect(nombreDeProcedimiento("comercio.agendar_cita")).toBe("Agendar cita");
  });

  it("calcula pass^k y su tendencia", () => {
    expect(consistencia([])).toEqual({ actual: null, k: null, delta: null });
    expect(consistencia([{ pass_k: 0.9, k: 4 }, { pass_k: 0.85, k: 4 }])).toEqual({ actual: 90, k: 4, delta: 5 });
  });

  it("muestra el editor solo a quien puede escribir", () => {
    expect(puedeEditarAgentes({ role: "master" }, "legacy")).toBe(true);
    expect(puedeEditarAgentes({ role: "colaborador", permissions: { settings: "write" } }, "v3")).toBe(true);
    expect(puedeEditarAgentes({ role: "colaborador", permissions: { settings: "write" } }, "legacy")).toBe(false);
    expect(puedeEditarAgentes({ role: "colaborador", permissions: { settings: "read" } }, "v3")).toBe(false);
  });
});
