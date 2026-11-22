import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de «Comprar créditos» (HU-BILL-27 parte 2b, HU-BILL-23): reenvía `{paquete}` a agent-core y, si
// falla, el `code` del error para que el cajón reconozca `recarga_bajo_minimo`.

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "panel_session" ? { value: "token-de-prueba" } : undefined) }),
}));

import { POST } from "@/app/api/plan/recargas/route";

const pedir = (cuerpo: unknown) => new Request("http://panel.test/api/plan/recargas", { method: "POST", body: JSON.stringify(cuerpo) });

describe("BFF de recargas de créditos", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("pide el link del paquete y devuelve el checkout", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ checkout_url: "https://checkout.wompi.co/l/r" }), { status: 200 }));
    const res = await POST(pedir({ paquete: "recarga_5k" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ checkout_url: "https://checkout.wompi.co/l/r" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/admin\/plan\/recargas$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ paquete: "recarga_5k" });
  });

  it("reenvía el código y el mensaje del 409 bajo el mínimo", async () => {
    const message = "Esta recarga cuesta $42.500 COP y en este ambiente la pasarela solo acepta pagos desde $150.000 COP, así que no se puede pagar aquí.";
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { code: "recarga_bajo_minimo", message } }), { status: 409 }));
    const res = await POST(pedir({ paquete: "recarga_5k" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: message, code: "recarga_bajo_minimo" });
  });

  it("sin paquete no llega al backend", async () => {
    const res = await POST(pedir({}));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
