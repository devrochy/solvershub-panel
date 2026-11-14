import { describe, expect, it } from "vitest";

import {
  CATEGORIAS,
  agruparPorDia,
  categoriaDe,
  categoriasDisponibles,
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

describe("categorías según los agentes creados", () => {
  const SIN_AGENTES = {
    pack_commerce: "plan",
    pack_calendar: "plan",
    pack_cobranza: "plan",
    pack_subscriptions: "plan",
  } as const;

  it("sin datos de módulos muestra todas (tests, catálogo o consulta fallida)", () => {
    expect(categoriasDisponibles()).toEqual(CATEGORIAS);
  });

  it("sin especialista publicado solo quedan Conversaciones y Sistema", () => {
    expect(categoriasDisponibles(SIN_AGENTES)).toEqual(["conversaciones", "sistema"]);
  });

  it("cada pack habilitado habilita su categoría", () => {
    expect(categoriasDisponibles({ ...SIN_AGENTES, pack_commerce: "habilitado" })).toContain("ventas");
    expect(categoriasDisponibles({ ...SIN_AGENTES, pack_cobranza: "habilitado" })).toContain("cobros");
    expect(categoriasDisponibles({ ...SIN_AGENTES, pack_subscriptions: "habilitado" })).toContain("cobros");
    expect(categoriasDisponibles({ ...SIN_AGENTES, pack_calendar: "habilitado" })).toContain("agenda");
  });

  it("un pack apagado o sin agente no habilita su categoría", () => {
    expect(categoriasDisponibles({ ...SIN_AGENTES, pack_commerce: "pack" })).not.toContain("ventas");
    expect(categoriasDisponibles({ ...SIN_AGENTES, pack_calendar: "plan" })).not.toContain("agenda");
  });

  it("Pagos en línea mantiene Cobros aunque no haya agente de cobranza o suscripciones", () => {
    expect(categoriasDisponibles(SIN_AGENTES, { pack_payments: { enabled: true } })).toContain("cobros");
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

  it("el aviso de un cliente abre su ficha (lead nuevo, seguimiento vencido)", () => {
    const destino = { entity: "cliente", id: "c-1", section: "leads" };
    expect(rutaDeNotificacion(destino, TODO)).toBe("/leads?cliente=c-1");
    expect(rutaDeNotificacion(destino, { escalations: "read" })).toBeNull();
  });

  it("el resumen de Ventas abre la lista de Ventas ya filtrada (HU-CRM-22)", () => {
    const packs = { pack_commerce: { enabled: true } };
    const resumen = { entity: "lead", id: null, section: "leads", filtro: "seguimiento:vencidos" };
    expect(rutaDeNotificacion(resumen, TODO, packs)).toBe("/comercio/clientes?filtro=seguimiento%3Avencidos");
    expect(rutaDeNotificacion({ ...resumen, filtro: "seguimiento:hoy" }, TODO, packs)).toBe(
      "/comercio/clientes?filtro=seguimiento%3Ahoy",
    );
  });

  it("sin la lista de Ventas en su menú, el resumen cae en Clientes sin filtro", () => {
    const resumen = { entity: "lead", id: null, section: "leads", filtro: "seguimiento:hoy" };
    // Ventas apagado: la entrada de Ventas no aparece y queda Clientes.
    expect(rutaDeNotificacion(resumen, TODO, { pack_commerce: { enabled: false } })).toBe("/leads");
    // Un cliente sin filtro (o con uno que no es `clave:valor`) abre la lista general.
    expect(rutaDeNotificacion({ ...resumen, filtro: null }, TODO)).toBe("/leads");
    expect(rutaDeNotificacion({ ...resumen, filtro: "x&y=1" }, TODO, { pack_commerce: { enabled: true } })).toBe("/leads");
  });

  it("una entidad desconocida o sin destino no rompe", () => {
    expect(rutaDeNotificacion({ entity: "nueva", id: null, section: null }, TODO)).toBeNull();
    expect(rutaDeNotificacion(null, TODO)).toBeNull();
  });
});
