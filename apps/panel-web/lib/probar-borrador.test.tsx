// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("@/lib/api/server", () => ({ apiFetch: api.apiFetch }));

import { ChatPrueba } from "@/app/(app)/asistente/_components/chat-prueba";
import { GET, POST } from "@/app/api/playground/route";
import { PasoProbarBorrador } from "@/components/domain/agentes/paso-probar-borrador";

// HU-AOS-72: probar el borrador de un agente sin publicarlo. El chat le habla al agente (`agent_id`), que gana
// sobre la conexión, y el BFF lo pasa al backend en el historial, el mensaje, el reinicio y el cierre.

const AGENTE = "11111111-1111-4111-8111-111111111111";
const CONEXION = "22222222-2222-4222-8222-222222222222";

const fetchMock = vi.fn();
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

beforeEach(() => {
  fetchMock.mockReset();
  api.apiFetch.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("chat de prueba sobre el borrador", () => {
  it("pide el historial, manda y reinicia con agent_id, aunque también haya conexión", async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const cuerpo = JSON.parse(String(init.body));
        if (cuerpo.action === "message") return json({ text: "¡Hola! Te ayudo.", simulado: true });
        return json({ ok: true });
      }
      return json({ turns: [] });
    });
    render(<ChatPrueba agenteId={AGENTE} conexionId={CONEXION} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/api/playground?agent_id=${AGENTE}`));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Hola" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
    expect(await screen.findByText("¡Hola! Te ayudo.")).toBeTruthy();
    const mensaje = fetchMock.mock.calls.find(([, i]) => i?.method === "POST" && JSON.parse(String(i.body)).action === "message");
    expect(JSON.parse(String(mensaje?.[1]?.body))).toEqual({ action: "message", text: "Hola", agent_id: AGENTE });
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar prueba" }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(([, i]) => i?.method === "POST" && JSON.parse(String(i.body)).action === "reset" && JSON.parse(String(i.body)).agent_id === AGENTE),
      ).toBe(true),
    );
  });

  it("el paso Pruébalo de la creación conversa con el borrador y ya no dice «Muy pronto»", async () => {
    fetchMock.mockResolvedValue(json({ turns: [] }));
    render(<PasoProbarBorrador agenteId={AGENTE} sugerencias={["¿Tienen hamburguesas?"]} />);
    expect(screen.queryByText(/Muy pronto/)).toBeNull();
    expect(screen.getByText(/no se publica/)).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/api/playground?agent_id=${AGENTE}`));
    expect(screen.getByRole("button", { name: "¿Tienen hamburguesas?" })).toBeTruthy();
  });
});

describe("BFF del playground", () => {
  it("pasa agent_id al historial y al cierre, y lo pone en el cuerpo del mensaje", async () => {
    api.apiFetch.mockResolvedValue({ ok: true, data: { turns: [] }, status: 200 });
    await GET(new Request(`http://x/api/playground?agent_id=${AGENTE}`));
    expect(api.apiFetch).toHaveBeenLastCalledWith(`/admin/playground?agent_id=${AGENTE}`);
    await POST(new Request("http://x/api/playground", { method: "POST", body: JSON.stringify({ action: "close", agent_id: AGENTE }) }));
    expect(api.apiFetch).toHaveBeenLastCalledWith(`/admin/playground/close?agent_id=${AGENTE}`, { method: "POST" });
    await POST(new Request("http://x/api/playground", { method: "POST", body: JSON.stringify({ action: "message", text: "Hola", agent_id: AGENTE }) }));
    expect(api.apiFetch).toHaveBeenLastCalledWith("/admin/playground/message", { method: "POST", body: { text: "Hola", agent_id: AGENTE } });
  });

  it("descarta ids que no son uuid", async () => {
    api.apiFetch.mockResolvedValue({ ok: true, data: { turns: [] }, status: 200 });
    await GET(new Request("http://x/api/playground?agent_id=../../otra&connection_id=x"));
    expect(api.apiFetch).toHaveBeenLastCalledWith("/admin/playground");
  });
});
