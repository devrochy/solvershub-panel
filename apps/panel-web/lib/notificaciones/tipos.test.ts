import { describe, expect, it } from "vitest";

import {
  agruparPorDia,
  categoriaDe,
  etiquetaDeDia,
  minutosHastaManana,
  rutaDeNotificacion,
  severidadDe,
  tiempoRelativo,
} from "@/lib/notificaciones/tipos";

const AHORA = new Date(2026, 9, 25, 15, 0, 0);
const hace = (min: number) => new Date(AHORA.getTime() - min * 60_000).toISOString();
const TODO = Object.fromEntries(
  ["conversations", "escalations", "leads", "connections", "settings", "pack_commerce", "pack_calendar:citas"].map((s) => [s, "write"]),
);

describe("clasificación", () => {
  it("un valor desconocido cae en un valor seguro, nunca rompe", () => {
    expect(categoriaDe("ventas")).toBe("ventas");
    expect(categoriaDe("inventada")).toBe("sistema");
    expect(severidadDe("critical")).toBe("critical");
    expect(severidadDe("inventada")).toBe("info");
  });
});

describe("tiempo", () => {
  it("relativo en español", () => {
    expect(tiempoRelativo(hace(0), AHORA)).toBe("ahora");
    expect(tiempoRelativo(hace(5), AHORA)).toBe("hace 5 min");
    expect(tiempoRelativo(hace(180), AHORA)).toBe("hace 3 h");
    expect(tiempoRelativo(hace(60 * 30), AHORA)).toBe("ayer");
    expect(tiempoRelativo(hace(60 * 24 * 3), AHORA)).toBe("hace 3 días");
  });

  it("agrupa por día, el más reciente primero", () => {
    expect(etiquetaDeDia(hace(10), AHORA)).toBe("Hoy");
    expect(etiquetaDeDia(hace(60 * 24), AHORA)).toBe("Ayer");
    const grupos = agruparPorDia(
      [{ created_at: hace(10) }, { created_at: hace(20) }, { created_at: hace(60 * 24) }, { created_at: hace(60 * 24 * 9) }],
      AHORA,
    );
    expect(grupos.map((g) => [g.dia, g.items.length])).toEqual([
      ["Hoy", 2],
      ["Ayer", 1],
      [grupos[2].dia, 1],
    ]);
  });

  it("silenciar hasta mañana cuenta hasta las 8:00 del día siguiente", () => {
    expect(minutosHastaManana(AHORA)).toBe(17 * 60);
  });
});

describe("destino", () => {
  it("lleva a la ficha cuando el usuario ve la sección", () => {
    expect(rutaDeNotificacion({ entity: "conversacion", id: "c1", section: "escalations" }, TODO)).toBe("/conversaciones?c=c1");
    expect(rutaDeNotificacion({ entity: "conexion", id: "x", section: "connections" }, TODO)).toBe("/conexiones");
    expect(rutaDeNotificacion({ entity: "mensaje_fallido", id: "m", section: "settings" }, TODO)).toBe("/dlq");
  });

  it("si no ve la primera opción, usa la siguiente; si no ve ninguna, no hay enlace", () => {
    const soloEscalaciones = { escalations: "read" };
    expect(rutaDeNotificacion({ entity: "conversacion", id: "c1", section: "escalations" }, soloEscalaciones)).toBe("/escalaciones");
    expect(rutaDeNotificacion({ entity: "conexion", id: "x", section: "connections" }, soloEscalaciones)).toBeNull();
  });

  it("una entidad desconocida o sin destino no rompe", () => {
    expect(rutaDeNotificacion({ entity: "nueva", id: null, section: null }, TODO)).toBeNull();
    expect(rutaDeNotificacion(null, TODO)).toBeNull();
  });
});
