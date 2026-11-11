import { describe, expect, it } from "vitest";

import {
  conexionesDelAgente,
  conexionParaProbar,
  desdeHace,
  estadoDePublicacion,
  hayCambiosSinPublicar,
  instanciasDelAgente,
  nombresDeHabilidades,
  resueltasSinPersona,
  tipoDeConexion,
} from "@/lib/agentes-ficha";
import type { ConnectionsConsole } from "@/lib/api/types";

type Conexion = ConnectionsConsole["items"][number];
type Agente = Conexion["agents"][number];

const AGENTE = "11111111-1111-4111-8111-111111111111";
const OTRO = "22222222-2222-4222-8222-222222222222";

function agente(cambios: Partial<Agente> = {}): Agente {
  return {
    instance_id: "i-1",
    agent_id: AGENTE,
    key: "ventas",
    name: "Ventas",
    role: "specialist",
    is_default: false,
    enabled: true,
    priority: 100,
    release_version: 2,
    latest_version: 2,
    ...cambios,
  };
}

function conexion(cambios: Partial<Conexion> = {}): Conexion {
  return {
    id: "c-1",
    channel: "whatsapp",
    type_id: "whatsapp_meta",
    label: "WhatsApp tienda",
    external_id: "x",
    conversational: true,
    active: true,
    is_primary: false,
    created_at: null,
    meta_connection_id: null,
    health: "ok",
    pause_scope: "connection",
    pausable: true,
    coordinator: null,
    agents: [],
    active_release: null,
    canary_release: null,
    usage_7d: { turns: 0, conversations: 0, input_tokens: 0, output_tokens: 0, cost_usd: null },
    ...cambios,
  };
}

describe("ficha del agente · conexiones (HU-UX-09)", () => {
  it("cruza la consola: solo las conexiones del agente, la principal primero y luego por prioridad", () => {
    const items = [
      conexion({ id: "c-1", label: "Chat de la web", type_id: "webchat", channel: "webchat", agents: [agente({ priority: 50 })] }),
      conexion({ id: "c-2", agents: [agente({ instance_id: "i-2", is_default: true, priority: 200 })] }),
      conexion({ id: "c-3", agents: [agente({ agent_id: OTRO })] }),
      conexion({ id: "c-4", label: " ", type_id: "whatsapp_waweb", agents: [agente({ instance_id: "i-4", priority: 10, enabled: false })] }),
    ];
    const filas = conexionesDelAgente(items, AGENTE);
    expect(filas.map((f) => f.id)).toEqual(["c-2", "c-4", "c-1"]);
    expect(filas[0]).toMatchObject({ label: "WhatsApp tienda", tipo: "WhatsApp oficial (Meta)", rol: "Especialista", principal: true, atiende: true, version: 2 });
    expect(filas[0].estado).toEqual({ label: "Sana", tono: "success" });
    // Sin nombre, la conexión se nombra por su tipo; deshabilitado aquí no atiende.
    expect(filas[1]).toMatchObject({ label: "WhatsApp Web (QR)", atiende: false, estado: { label: "Apagado en esta conexión", tono: "neutral" } });
    expect(filas[2].tipo).toBe("Chat web");
  });

  it("una conexión inactiva o degradada se dice en el estado", () => {
    const [inactiva] = conexionesDelAgente([conexion({ active: false, agents: [agente()] })], AGENTE);
    expect(inactiva.estado.label).toBe("Conexión inactiva");
    expect(inactiva.atiende).toBe(false);
    const [degradada] = conexionesDelAgente([conexion({ health: "degraded", agents: [agente()] })], AGENTE);
    expect(degradada.estado).toEqual({ label: "Degradada", tono: "warning" });
  });

  it("reconoce al agente cuando es el Coordinador de la conexión", () => {
    const [fila] = conexionesDelAgente([conexion({ coordinator: agente({ role: "core", instance_id: "core-1" }) })], AGENTE);
    expect(fila.rol).toBe("Coordinador");
    expect(instanciasDelAgente([conexion({ coordinator: agente({ instance_id: "core-1" }), agents: [agente()] })], AGENTE)).toEqual(
      new Set(["core-1", "i-1"]),
    );
  });

  it("tipo legible por type_id y, si no, por el canal", () => {
    expect(tipoDeConexion({ type_id: "google_calendar", channel: "x" })).toBe("Google Calendar");
    expect(tipoDeConexion({ type_id: null, channel: "instagram" })).toBe("Instagram");
  });
});

describe("ficha del agente · indicadores (HU-UX-09)", () => {
  const instancias = new Set(["i-1", "i-2"]);

  it("resueltas sin persona suma las instancias del agente y deja fuera las ajenas", () => {
    const filas = [
      { instance_id: "i-1", turns: 60, escalated: 3 },
      { instance_id: "i-2", turns: 40, escalated: 2 },
      { instance_id: "otra", turns: 1000, escalated: 1000 },
      { instance_id: null, turns: 5, escalated: 5 },
    ];
    expect(resueltasSinPersona(filas, instancias, 30)).toEqual({ porcentaje: 95, turnos: 100 });
  });

  it("bajo la muestra mínima no hay porcentaje", () => {
    expect(resueltasSinPersona([{ instance_id: "i-1", turns: 5, escalated: 0 }], instancias, 30)).toEqual({ porcentaje: null, turnos: 5 });
    expect(resueltasSinPersona([], instancias, 0)).toEqual({ porcentaje: null, turnos: 0 });
  });

  it("estado de publicación", () => {
    expect(estadoDePublicacion(true, 3)).toEqual({ label: "Publicado · v3", tono: "success" });
    expect(estadoDePublicacion(true, null)).toEqual({ label: "Publicado", tono: "success" });
    expect(estadoDePublicacion(false, 3)).toEqual({ label: "Borrador", tono: "neutral" });
  });

  it("cambios sin publicar: el borrador se guardó después de la última versión", () => {
    const version = (n: number, fecha: string) => ({
      id: `v${n}`, version: n, label: "", contract: "", content_hash: "", notes: "", legacy: false, created_at: fecha,
    });
    const draft = (fecha: string) => ({ content: {}, lock_version: 1, base_version_id: null, updated_at: fecha });
    expect(hayCambiosSinPublicar({ draft: draft("2026-11-01T00:00:00Z"), versions: [] })).toBe(true);
    expect(
      hayCambiosSinPublicar({ draft: draft("2026-11-01T00:00:00Z"), versions: [version(1, "2026-10-01T00:00:00Z"), version(2, "2026-11-02T00:00:00Z")] }),
    ).toBe(false);
    expect(hayCambiosSinPublicar({ draft: draft("2026-11-03T00:00:00Z"), versions: [version(2, "2026-11-02T00:00:00Z")] })).toBe(true);
  });

  it("desde hace N días", () => {
    expect(desdeHace(7, new Date("2026-11-08T12:00:00Z"))).toBe("2026-11-01T12:00:00.000Z");
  });
});

describe("ficha del agente · superpoderes y Probar (HU-UX-09)", () => {
  it("nombre de la habilidad: el de /admin/plugins o la etiqueta conocida", () => {
    const nombre = nombresDeHabilidades([{ id: "pack_commerce", display_name: "Ventas y pedidos" }, { id: "pack_x", display_name: " " }]);
    expect(nombre("pack_commerce")).toBe("Ventas y pedidos");
    expect(nombre("pack_calendar")).toBe("Calendario");
    expect(nombre("pack_x")).toBe("X");
  });

  it("Probar abre con la elegida, si no con la principal que atiende", () => {
    const filas = conexionesDelAgente(
      [
        conexion({ id: "c-1", agents: [agente({ priority: 1 })] }),
        conexion({ id: "c-2", agents: [agente({ is_default: true, enabled: false })] }),
        conexion({ id: "c-3", agents: [agente({ is_default: true, priority: 5 })] }),
      ],
      AGENTE,
    );
    expect(conexionParaProbar(filas, null)?.id).toBe("c-3");
    expect(conexionParaProbar(filas, "c-1")?.id).toBe("c-1");
    expect(conexionParaProbar(filas, "ajena")?.id).toBe("c-3");
    expect(conexionParaProbar([], null)).toBeNull();
  });
});
