import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// HU-BILL-27: los BFF de Conexiones y Configuración reenvían `code` y `details` del error del backend, para
// que el panel reconozca los 409 del plan v3 (HU-BILL-19) y ofrezca «Mejorar mi plan».

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined),
  }),
}));

import { POST as accionDeConexion } from "@/app/api/connections/[id]/route";
import { POST as altaManual } from "@/app/api/connections/manual/route";
import { GET as numeros, POST as agregarNumero } from "@/app/api/meta/connections/[id]/numbers/route";
import { POST as instagram } from "@/app/api/meta/instagram/route";
import { POST as messenger } from "@/app/api/meta/messenger/route";
import { GET as estadoWaweb, POST as waweb } from "@/app/api/meta/waweb/route";
import { POST as wizard } from "@/app/api/meta/wizard/route";
import { PUT as guardarPestana } from "@/app/api/settings/[tab]/route";

const ID = "11111111-1111-4111-8111-111111111111";
const pedido = (cuerpo: unknown, metodo = "POST") => new Request("http://panel.test/api/x", { method: metodo, body: JSON.stringify(cuerpo) });
const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

const del409 = (code: string, message: string, details: Record<string, unknown>) =>
  new Response(JSON.stringify({ error: { code, message, details } }), { status: 409 });

const TOPE = del409("plan_limit_conexiones", "Tu plan permite 2 conexiones y ya tienes 2.", { metric: "conexiones", used: 2, limit: 2 });
const CANAL = del409("plan_channel_not_included", "Tu plan Basic no incluye Instagram.", { channel: "instagram", plan: "basic" });

describe("BFF que reenvían el 409 del plan con su code y details", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  const casos: [string, () => Promise<Response>, Response][] = [
    ["aceptar el riesgo de WhatsApp Web", () => waweb(pedido({ action: "accept-risk" })), TOPE],
    ["el estado de WhatsApp Web", () => estadoWaweb(), TOPE],
    ["activar una conexión", () => accionDeConexion(pedido({ action: "activate" }), ctx({ id: ID })), TOPE],
    ["el wizard de WhatsApp", () => wizard(pedido({ action: "byok", app_id: "1" })), TOPE],
    ["conectar Instagram", () => instagram(pedido({ action: "connect", connection_id: ID, ig_user_ids: ["1"] })), CANAL],
    ["conectar Messenger", () => messenger(pedido({ action: "connect", connection_id: ID, page_ids: ["1"] })), CANAL],
    ["el alta manual", () => altaManual(pedido({ type_id: "smtp", values: {} })), del409("plan_limit_correos", "Tu plan permite 1 correo.", { metric: "correos", used: 1, limit: 1 })],
    ["guardar el chat web", () => guardarPestana(pedido({ enabled: true }, "PUT"), ctx({ tab: "web-chat" })), CANAL],
    ["agregar un número", () => agregarNumero(pedido({ cc: "57", phone_number: "3000000000", verified_name: "Tienda" }), ctx({ id: ID })), TOPE],
    ["listar los números", () => numeros(new Request("http://panel.test/api/x"), ctx({ id: ID })), TOPE],
  ];

  it.each(casos)("%s", async (_nombre, llamar, respuesta) => {
    fetchMock.mockResolvedValue(respuesta.clone());
    const res = await llamar();
    expect(res.status).toBe(409);
    const json = (await res.json()) as { error: string; code: string; details: Record<string, unknown> };
    const esperado = (await respuesta.clone().json()) as { error: { code: string; message: string; details: Record<string, unknown> } };
    expect(json).toEqual({ error: esperado.error.message, code: esperado.error.code, details: esperado.error.details });
  });

  it("el éxito no cambia: `{ok: true}` donde lo había y el 201 del wizard", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: ID }), { status: 200 }));
    const activar = await accionDeConexion(pedido({ action: "activate" }), ctx({ id: ID }));
    expect(await activar.json()).toEqual({ ok: true });
    const riesgo = await waweb(pedido({ action: "accept-risk" }));
    expect(await riesgo.json()).toEqual({ ok: true });
    const alta = await wizard(pedido({ action: "byok", app_id: "1" }));
    expect(alta.status).toBe(201);
  });

  it("los 422 de Configuración siguen con sus errores por campo", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "validation_error", message: "Revisa los campos.", fields: { allowed_origins: "No es una URL." } } }), { status: 422 }),
    );
    const res = await guardarPestana(pedido({ enabled: true }, "PUT"), ctx({ tab: "web-chat" }));
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ error: "Revisa los campos.", fields: { allowed_origins: "No es una URL." } });
  });
});
