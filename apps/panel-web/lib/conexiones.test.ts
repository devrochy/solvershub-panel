import { describe, expect, it } from "vitest";

import {
  esChatWeb,
  etiquetaRuteo,
  puedePausar,
  resumenConsumo,
  saludDeConexion,
  separarConexiones,
  TEXTO_ALCANCE_PAUSA,
  textoConfirmarPausa,
  versionDeAgente,
  type ConexionConsola,
} from "@/lib/conexiones";

function conexion(parcial: Partial<ConexionConsola>): ConexionConsola {
  return {
    id: "c1",
    channel: "whatsapp",
    type_id: "whatsapp_meta",
    label: "Ventas",
    external_id: "123",
    conversational: true,
    active: true,
    is_primary: false,
    created_at: null,
    meta_connection_id: "m1",
    health: "ok",
    pause_scope: "meta_account",
    pausable: true,
    coordinator: null,
    agents: [],
    active_release: null,
    canary_release: null,
    usage_7d: { turns: 0, conversations: 0, input_tokens: 0, output_tokens: 0, cost_usd: null },
    ...parcial,
  };
}

describe("consola de conexiones", () => {
  it("versión del agente: la de la release, la nueva pendiente o ninguna", () => {
    expect(versionDeAgente({ release_version: 3, latest_version: 3 })).toBe("v3");
    expect(versionDeAgente({ release_version: 3, latest_version: 4 })).toBe("v3 (hay v4)");
    expect(versionDeAgente({ release_version: null, latest_version: 1 })).toBe("v1 en la próxima versión");
    expect(versionDeAgente({ release_version: null, latest_version: null })).toBe("sin versión publicada");
  });

  it("separa canales de integraciones", () => {
    const { canales, integraciones } = separarConexiones([
      conexion({ id: "a" }),
      conexion({ id: "b", conversational: false }),
    ]);
    expect(canales.map((c) => c.id)).toEqual(["a"]);
    expect(integraciones.map((c) => c.id)).toEqual(["b"]);
  });

  it("la confirmación de Meta avisa que alcanza a todos los números de la cuenta", () => {
    expect(textoConfirmarPausa(conexion({}))).toContain("todos los números de esa cuenta");
    expect(textoConfirmarPausa(conexion({ pause_scope: "connection" }))).not.toContain("cuenta de Meta");
  });

  it("sin permiso de edición no hay pausa; tampoco donde la pausa no detiene", () => {
    expect(puedePausar(conexion({}), true)).toBe(true);
    expect(puedePausar(conexion({}), false)).toBe(false);
    expect(puedePausar(conexion({ pausable: false, meta_connection_id: null }), true)).toBe(false);
  });

  it("también se pausan las conexiones manuales, de WhatsApp Web y el chat web", () => {
    const manual = { meta_connection_id: null, pause_scope: "connection" as const, pausable: true };
    expect(puedePausar(conexion(manual), true)).toBe(true);
    expect(puedePausar(conexion({ ...manual, type_id: "whatsapp_waweb" }), true)).toBe(true);
    expect(puedePausar(conexion(manual), false)).toBe(false);
    expect(textoConfirmarPausa(conexion(manual))).toContain("no sale nada");
    // Un backend anterior aún manda el chat web como `webchat_settings` y no pausable: sin botón.
    expect(
      puedePausar(conexion({ meta_connection_id: null, pause_scope: "webchat_settings", pausable: false }), true),
    ).toBe(false);
  });

  it("el chat web se pausa desde la consola con el mismo interruptor de Configuración", () => {
    const web = { meta_connection_id: null, type_id: "webchat", pause_scope: "connection" as const, pausable: true };
    expect(esChatWeb(conexion(web))).toBe(true);
    expect(puedePausar(conexion(web), true)).toBe(true);
    expect(puedePausar(conexion(web), false)).toBe(false); // colaborador sin permiso de editar conexiones
    expect(textoConfirmarPausa(conexion(web))).toContain("Configuración → Chat web");
    expect(textoConfirmarPausa(conexion(web))).toContain("en pausa");
  });

  it("toda confirmación aclara que la pausa es solo de ese canal", () => {
    expect(TEXTO_ALCANCE_PAUSA).toBe("Pausa solo este canal; los demás canales del negocio siguen atendiendo.");
    for (const parcial of [
      {},
      { meta_connection_id: null, pause_scope: "connection" as const },
      { meta_connection_id: null, type_id: "webchat", pause_scope: "connection" as const },
    ]) {
      expect(textoConfirmarPausa(conexion(parcial))).toContain(TEXTO_ALCANCE_PAUSA);
    }
  });

  it("salud, ruteo y consumo", () => {
    expect(saludDeConexion("paused")).toEqual({ label: "Pausada", tono: "neutral" });
    expect(etiquetaRuteo("shadow")).toBe("En sombra");
    expect(resumenConsumo({ turns: 2, conversations: 1, input_tokens: 10, output_tokens: 5, cost_usd: null })).toBe(
      "2 turnos · 1 conversaciones · 15 tokens",
    );
    expect(
      resumenConsumo({ turns: 2, conversations: 1, input_tokens: 10, output_tokens: 5, cost_usd: 0.03 }),
    ).toContain("de IA");
  });
});
