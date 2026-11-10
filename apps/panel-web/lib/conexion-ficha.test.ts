import { describe, expect, it } from "vitest";

import {
  conexionDeCuentaMeta,
  conQuery,
  costosDeLaCuenta,
  destinoDeRutaMeta,
  enlaceSaludMeta,
  estadoDeConexion,
  mensajeErrorAgentes,
  muestraSalud,
  numerosDeLaCuenta,
  numeroVisible,
  pestanasDeFicha,
  puedeEditarAgentesDeConexion,
  subtituloDeFicha,
  tienePestana,
  tipoDeFicha,
  unicaDeTipo,
} from "@/lib/conexion-ficha";
import type { ConexionConsola } from "@/lib/conexiones";

function conexion(parcial: Partial<ConexionConsola>): ConexionConsola {
  return {
    id: "c1",
    channel: "whatsapp",
    type_id: "whatsapp_meta",
    label: "Ventas",
    external_id: "+57 300 000 0000",
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

const etiquetas = (c: Partial<ConexionConsola>) => pestanasDeFicha("c1", tipoDeFicha(conexion(c))).map((p) => p.label);
const sinMeta = { meta_connection_id: null };

describe("pestañas de la ficha por tipo (HU-UX-09)", () => {
  it("WhatsApp oficial: Salud y Agentes primero; Webhook, Producción y Versiones en Avanzado (CON-04)", () => {
    expect(etiquetas({})).toEqual(["Salud", "Agentes", "Números", "Plantillas", "Costos", "Webhook", "Producción", "Versiones"]);
  });

  it("WhatsApp con QR: Estado (con el vínculo), Agentes y Versiones, sin Salud, Plantillas ni Producción", () => {
    const pestanas = etiquetas({ ...sinMeta, type_id: "whatsapp_waweb" });
    expect(pestanas).toEqual(["Estado", "Agentes", "Versiones"]);
    for (const p of ["Salud", "Plantillas", "Producción"]) expect(pestanas).not.toContain(p);
  });

  it("chat web, Instagram y Messenger", () => {
    expect(etiquetas({ ...sinMeta, type_id: "webchat" })).toEqual(["Apariencia", "Instalación", "Agentes", "Versiones"]);
    expect(etiquetas({ type_id: "instagram_meta" })).toEqual(["Cuenta", "Agentes", "Versiones"]);
    expect(etiquetas({ type_id: "messenger_meta" })).toEqual(["Cuenta", "Agentes", "Versiones"]);
  });

  it("las integraciones no tienen pestaña Agentes (el backend responde 422)", () => {
    expect(etiquetas({ ...sinMeta, type_id: "google_calendar", conversational: false })).toEqual(["Cuenta", "Agenda"]);
    expect(etiquetas({ ...sinMeta, type_id: "email_smtp", conversational: false })).toEqual(["Credenciales"]);
    expect(tienePestana("google_calendar", "agentes")).toBe(false);
    expect(tienePestana("smtp", "agentes")).toBe(false);
  });

  it("otros canales manuales (Twilio, Plivo) y filas viejas sin tipo", () => {
    expect(etiquetas({ ...sinMeta, type_id: "whatsapp_twilio" })).toEqual(["Credenciales", "Agentes", "Versiones"]);
    expect(tipoDeFicha(conexion({ type_id: null }))).toBe("whatsapp_meta");
    expect(tipoDeFicha(conexion({ ...sinMeta, type_id: null, conversational: false }))).toBe("smtp");
  });

  it("cada pestaña es una ruta de la ficha", () => {
    expect(pestanasDeFicha("c9", "whatsapp_waweb")[0]).toEqual({ slug: "estado", href: "/conexiones/c9/estado", label: "Estado", avanzada: false });
  });
});

describe("cabecera y lista", () => {
  it("subtítulo con el tipo legible y el detalle", () => {
    expect(subtituloDeFicha(conexion({}), "whatsapp_meta")).toBe("WhatsApp oficial · +57 300 000 0000");
    expect(subtituloDeFicha(conexion({ external_id: "" }), "webchat")).toBe("Chat web");
    expect(subtituloDeFicha(conexion({ external_id: "573005550103" }), "whatsapp_waweb")).toBe("WhatsApp con QR · +57 300 555 0103");
    expect(subtituloDeFicha(conexion({ external_id: "17841400000000000" }), "instagram")).toBe("Instagram");
  });

  it("WhatsApp oficial: el número visible que sincronizó Meta, nunca el phone_number_id", () => {
    // Como en producción: `external_id` es el id del número en Meta.
    const real = { external_id: "100200300400500" };
    expect(subtituloDeFicha(conexion({ ...real, display_phone_number: "+57 300 5550101" }), "whatsapp_meta")).toBe(
      "WhatsApp oficial · +57 300 555 0101",
    );
    expect(subtituloDeFicha(conexion({ ...real, display_phone_number: "+1 555-010-0199" }), "whatsapp_meta")).toBe(
      "WhatsApp oficial · +1 555-010-0199",
    );
    expect(subtituloDeFicha(conexion({ ...real, display_phone_number: null }), "whatsapp_meta")).toBe("WhatsApp oficial");
    expect(subtituloDeFicha(conexion({ ...real, display_phone_number: "  " }), "whatsapp_meta")).toBe("WhatsApp oficial");
    // Otro tipo no lo usa aunque venga.
    expect(subtituloDeFicha(conexion({ external_id: "", display_phone_number: "+57 300 5550101" }), "webchat")).toBe("Chat web");
    expect(numeroVisible({ display_phone_number: "573005550101" })).toBe("+57 300 555 0101");
    expect(numeroVisible({})).toBeNull();
  });

  it("un solo estado: funciona, con avisos, no funciona, pausada o sin terminar", () => {
    expect(estadoDeConexion(conexion({}))).toEqual({ label: "Funciona", tono: "success" });
    expect(estadoDeConexion(conexion({ health: "degraded" }))).toEqual({ label: "Con avisos", tono: "warning" });
    expect(estadoDeConexion(conexion({ health: "error" }))).toEqual({ label: "No funciona", tono: "danger" });
    expect(estadoDeConexion(conexion({ health: "paused" }))).toEqual({ label: "Pausada", tono: "neutral" });
    expect(estadoDeConexion(conexion({ active: false, health: "degraded" }))).toEqual({ label: "Pausada", tono: "neutral" });
    expect(estadoDeConexion(conexion({ health: "pending" })).label).toBe("Sin terminar");
  });

  it("el WhatsApp oficial deja Webhook, Producción y Versiones en Avanzado", () => {
    const pestanas = pestanasDeFicha("c1", "whatsapp_meta");
    expect(pestanas.filter((p) => !p.avanzada).map((p) => p.label)).toEqual(["Salud", "Agentes", "Números", "Plantillas", "Costos"]);
    expect(pestanas.filter((p) => p.avanzada).map((p) => p.label)).toEqual(["Webhook", "Producción", "Versiones"]);
    expect(pestanasDeFicha("c5", "webchat").every((p) => !p.avanzada)).toBe(true);
  });

  it("la salud solo se muestra en las conexiones de una cuenta de Meta", () => {
    expect(muestraSalud(conexion({}))).toBe(true);
    expect(muestraSalud(conexion({ type_id: "instagram_meta" }))).toBe(true);
    expect(muestraSalud(conexion({ ...sinMeta, type_id: "whatsapp_waweb" }))).toBe(false);
    expect(muestraSalud(conexion({ ...sinMeta, type_id: "google_calendar" }))).toBe(false);
  });

  it("números de la cuenta: solo los WhatsApp de esa cuenta", () => {
    const items = [
      conexion({ id: "a" }),
      conexion({ id: "b", is_primary: true }),
      conexion({ id: "ig", type_id: "instagram_meta" }),
      conexion({ id: "otra", meta_connection_id: "m2" }),
    ];
    expect(numerosDeLaCuenta(items, "m1").map((c) => c.id)).toEqual(["a", "b"]);
    expect(numerosDeLaCuenta(items, null)).toEqual([]);
  });
});

describe("rutas viejas del hub de Meta", () => {
  it("cada sección vieja va a su pestaña", () => {
    expect(destinoDeRutaMeta([])).toBe("salud");
    expect(destinoDeRutaMeta(["salud"])).toBe("salud");
    expect(destinoDeRutaMeta(["numeros"])).toBe("numeros");
    expect(destinoDeRutaMeta(["numeros", "negocio"])).toBe("numeros/negocio");
    expect(destinoDeRutaMeta(["plantillas"])).toBe("plantillas");
    expect(destinoDeRutaMeta(["produccion"])).toBe("produccion");
    expect(destinoDeRutaMeta(["pasar-a-produccion"])).toBe("produccion/pasar");
    expect(destinoDeRutaMeta(["webhook"])).toBe("webhook");
    expect(destinoDeRutaMeta(["credenciales"])).toBe("webhook/credenciales");
    expect(destinoDeRutaMeta(["otra-cosa"])).toBe("salud");
  });

  it("la cuenta abre su número principal, o el primero; sin números, ninguno", () => {
    const items = [conexion({ id: "a" }), conexion({ id: "b", is_primary: true })];
    expect(conexionDeCuentaMeta(items, "m1")?.id).toBe("b");
    expect(conexionDeCuentaMeta([conexion({ id: "a" })], "m1")?.id).toBe("a");
    expect(conexionDeCuentaMeta(items, "m9")).toBeNull();
  });

  it("única de un tipo: solo si hay exactamente una", () => {
    expect(unicaDeTipo([conexion({ id: "a" })], "whatsapp_meta")?.id).toBe("a");
    expect(unicaDeTipo([conexion({ id: "a" }), conexion({ id: "b" })], "whatsapp_meta")).toBeNull();
    expect(unicaDeTipo([], "webchat")).toBeNull();
  });

  it("la query sobrevive a la redirección", () => {
    expect(conQuery("/conexiones/c1/salud", { alta: "1", vacio: undefined })).toBe("/conexiones/c1/salud?alta=1");
    expect(conQuery("/x", {})).toBe("/x");
    expect(conQuery("/x", { a: ["1", "2"] })).toBe("/x?a=1&a=2");
  });

  it("los enlaces a la «Salud de Meta» global van a la ficha o a la lista", () => {
    expect(enlaceSaludMeta(["m1"])).toBe("/conexiones/meta/m1/salud");
    expect(enlaceSaludMeta(["m1", "m1"])).toBe("/conexiones/meta/m1/salud");
    expect(enlaceSaludMeta(["m1", "m2"])).toBe("/conexiones");
    expect(enlaceSaludMeta([])).toBe("/conexiones");
  });
});

describe("pestaña Agentes y Costos", () => {
  it("edita el master, o settings de escritura con el Agent OS", () => {
    const dueno = { role: "owner", permissions: { settings: "write", connections: "read" } };
    expect(puedeEditarAgentesDeConexion(dueno, "v3")).toBe(true);
    expect(puedeEditarAgentesDeConexion(dueno, "legacy")).toBe(false);
    expect(puedeEditarAgentesDeConexion({ role: "master", permissions: {} }, "legacy")).toBe(true);
    expect(puedeEditarAgentesDeConexion({ role: "owner", permissions: { settings: "read", connections: "write" } }, "v3")).toBe(false);
    expect(puedeEditarAgentesDeConexion({ role: "owner", permissions: { settings: "write", connections: null } }, "v3")).toBe(false);
  });

  it("los códigos estables de la API tienen su mensaje", () => {
    expect(mensajeErrorAgentes("core_missing", "x")).toMatch(/Coordinador/);
    expect(mensajeErrorAgentes("aos_runtime_legacy", "x")).toMatch(/Agent OS/);
    expect(mensajeErrorAgentes("otro", "fallback")).toBe("fallback");
    expect(mensajeErrorAgentes(undefined, "fallback")).toBe("fallback");
  });

  it("costos por número de la cuenta comparando solo dígitos", () => {
    const filas = [
      { phone_number: "573000000000", cost: 1 },
      { phone_number: "571111111111", cost: 2 },
    ];
    expect(costosDeLaCuenta(filas, ["+57 300 000 0000"])).toEqual([filas[0]]);
    expect(costosDeLaCuenta(filas, [""])).toEqual([]);
  });
});
