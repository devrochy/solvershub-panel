// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import type { Superpower } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

import { SuperpoderesDelAgente } from "./superpoderes-del-agente";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ID = "11111111-1111-4111-8111-111111111111";

const CATALOGO: Superpower[] = [
  {
    id: "pack_commerce.tomar_pedido",
    version: "1.2.0",
    skill: "pack_commerce",
    title: "Tomar pedidos",
    description: "Arma el pedido con el cliente.",
    phrases: ["quiero pedir", "me mandas dos", "hacer un pedido"],
  },
  {
    id: "pack_calendar.agendar",
    version: "2.0.0",
    skill: "pack_calendar",
    title: "Agendar citas",
    description: "",
    phrases: ["quiero una cita", "agéndame", "tienen turno mañana"],
  },
  {
    id: "pack_payments.cobrar",
    version: "1.0.0",
    skill: "pack_payments",
    title: "Cobrar en línea",
    description: "",
    phrases: ["cómo pago"],
  },
];

function agente() {
  return {
    id: ID,
    name: "Ventas",
    description: "Vende por WhatsApp",
    draft: {
      content: { procedures: [{ id: "pack_commerce.tomar_pedido", version: "^1.0" }], guardrails: { x: 1 } },
      lock_version: 4,
      base_version_id: null,
      updated_at: "2026-11-01T00:00:00Z",
    },
  };
}

function montar(props: Partial<Parameters<typeof SuperpoderesDelAgente>[0]> = {}) {
  return render(
    <SuperpoderesDelAgente
      agente={agente()}
      catalogo={CATALOGO}
      minFrases={3}
      nombreDeHabilidad={{ pack_commerce: "Comercio", pack_calendar: "Calendario", pack_payments: "Pagos en línea" }}
      puedeEditar
      cambiosSinPublicar={false}
      {...props}
    />,
  );
}

function respuesta(status: number, json: unknown) {
  return Promise.resolve(new Response(JSON.stringify(json), { status, headers: { "Content-Type": "application/json" } }));
}

describe("pestaña Superpoderes del agente (HU-UX-09)", () => {
  it("lista cada superpoder con su interruptor, su habilidad de origen y sus frases", async () => {
    const { container } = montar();
    const pedido = screen.getByRole("switch", { name: "Tomar pedidos" });
    expect(pedido.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch", { name: "Agendar citas" }).getAttribute("aria-checked")).toBe("false");
    expect(screen.getByText("De la habilidad Comercio")).toBeTruthy();
    expect(screen.getByText("De la habilidad Calendario")).toBeTruthy();
    expect(screen.getByText("quiero pedir")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Publicar cambios" })).toBeNull();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("el interruptor guarda el borrador al momento y ofrece publicar", async () => {
    const fetchMock = vi.fn(() => respuesta(200, { lockVersion: 5, content: { procedures: [] } }));
    vi.stubGlobal("fetch", fetchMock);
    montar();
    fireEvent.click(screen.getByRole("switch", { name: "Agendar citas" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/agent-editor/${ID}/draft`);
    expect(init.method).toBe("PUT");
    const body = JSON.parse(String(init.body)) as { lock_version: number; content: Record<string, unknown> };
    expect(body.lock_version).toBe(4);
    // Encenderlo lo suma al borrador con el rango compatible y conserva el resto del contenido.
    expect(body.content.procedures).toEqual([
      { id: "pack_commerce.tomar_pedido", version: "^1.0" },
      { id: "pack_calendar.agendar", version: "^2.0" },
    ]);
    expect(body.content.guardrails).toEqual({ x: 1 });
    const publicar = await screen.findByRole("link", { name: "Publicar cambios" });
    expect(publicar.getAttribute("href")).toBe(`/agentes/${ID}/editar?paso=publicar`);
    expect(screen.getByRole("switch", { name: "Agendar citas" }).getAttribute("aria-checked")).toBe("true");
  });

  it("no deja el agente sin superpoderes", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    montar();
    fireEvent.click(screen.getByRole("switch", { name: "Tomar pedidos" }));
    expect(await screen.findByText("Marca al menos un superpoder para este agente.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no guarda un superpoder sin las frases mínimas: lo dice junto a él", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    montar();
    fireEvent.click(screen.getByRole("switch", { name: "Cobrar en línea" }));
    expect(await screen.findByText(/«Cobrar en línea» necesita al menos 3 frases distintas/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Guardar frases" })).toBeTruthy();
  });

  it("con cambios del borrador sin publicar, muestra «Publicar cambios» desde el inicio", () => {
    montar({ cambiosSinPublicar: true });
    expect(screen.getByRole("link", { name: "Publicar cambios" })).toBeTruthy();
  });

  it("sin permiso de edición los interruptores no se pueden mover", () => {
    montar({ puedeEditar: false, cambiosSinPublicar: true });
    expect((screen.getByRole("switch", { name: "Tomar pedidos" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByRole("link", { name: "Publicar cambios" })).toBeNull();
    expect(screen.getByRole("list", { name: "Frases de Tomar pedidos" })).toBeTruthy();
  });

  it("si otra persona guardó antes, lo explica", async () => {
    vi.stubGlobal("fetch", vi.fn(() => respuesta(409, { code: "stale_lock_version", error: "x" })));
    montar();
    fireEvent.click(screen.getByRole("switch", { name: "Agendar citas" }));
    await waitFor(() => expect(vi.mocked(fetch)).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: "Publicar cambios" })).toBeNull();
  });
});
