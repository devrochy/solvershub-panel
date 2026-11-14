// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
  usePathname: () => "/agentes/x",
  useSearchParams: () => new URLSearchParams(),
}));

import { FeedbackProviders } from "@/components/ui/providers";
import type { AgentSkill } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

import { HabilidadesDelAgente } from "./habilidades-del-agente";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refresh.mockReset();
});

const ID = "11111111-1111-4111-8111-111111111111";
const conocimiento = (installed: boolean): AgentSkill => ({
  pack_id: "pack_knowledge",
  installed,
  status: installed ? "active" : null,
  config: {},
});

function montar(props: Partial<Parameters<typeof HabilidadesDelAgente>[0]> = {}) {
  return render(
    <FeedbackProviders>
      <HabilidadesDelAgente
        agenteId={ID}
        nombre="Ventas"
        inicial={[conocimiento(false)]}
        cuentas={[]}
        puedeEditar
        borrador={{ content: { tools: [] }, lockVersion: 2 }}
        usaPublicado={false}
        documentos={[]}
        puedeEscribirDocumentos
        {...props}
      />
    </FeedbackProviders>,
  );
}

function respuestas(borrador: { status: number; body: unknown }) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/skills/pack_knowledge")) {
      const { installed } = JSON.parse(String(init?.body)) as { installed: boolean };
      return new Response(JSON.stringify(conocimiento(installed)), { status: 200 });
    }
    if (url.endsWith("/draft")) return new Response(JSON.stringify(borrador.body), { status: borrador.status });
    return new Response(JSON.stringify([]), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("habilidades del agente", () => {
  it("sin agregar: la tarjeta está cerrada y no muestra documentos", async () => {
    const { container } = montar();
    expect(screen.getByText("Sin agregar")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Conocimiento/ }).getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(/todavía no tiene documentos/)).toBeNull();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("prender Conocimiento guarda la habilidad, pone la búsqueda en el borrador y abre la tarjeta", async () => {
    const fetchMock = respuestas({ status: 200, body: { lockVersion: 3, content: { tools: [{ tool: "buscar_conocimiento", enabled: true }] } } });
    montar();
    fireEvent.click(screen.getByRole("switch", { name: "Agregar Conocimiento" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Conocimiento/ }).getAttribute("aria-expanded")).toBe("true"));
    await waitFor(() => expect(screen.getByRole("link", { name: "Publicar cambios" })).toBeTruthy());
    const borrador = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/draft"));
    const cuerpo = JSON.parse(String(borrador?.[1]?.body)) as { content: { tools: { tool: string }[] }; lock_version: number };
    expect(cuerpo.lock_version).toBe(2);
    expect(cuerpo.content.tools.map((t) => t.tool)).toContain("buscar_conocimiento");
    expect(screen.getByText(/todavía no tiene documentos/)).toBeTruthy();
    expect(refresh).toHaveBeenCalled();
  });

  it("si el borrador falla, la habilidad queda agregada y el paso pendiente con su botón", async () => {
    respuestas({ status: 500, body: { error: "falló" } });
    montar();
    fireEvent.click(screen.getByRole("switch", { name: "Agregar Conocimiento" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Activar" })).toBeTruthy());
    expect(screen.getByRole("switch", { name: "Quitar Conocimiento" }).getAttribute("aria-checked")).toBe("true");
  });

  it("quitar pide confirmación y no hace nada si se cancela", async () => {
    const fetchMock = respuestas({ status: 200, body: {} });
    montar({ inicial: [conocimiento(true)] });
    fireEvent.click(screen.getByRole("switch", { name: "Quitar Conocimiento" }));
    expect(await screen.findByText(/Los documentos no se borran/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Cancelar/ }));
    await waitFor(() => expect(screen.queryByText(/Los documentos no se borran/)).toBeNull());
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/skills/"), expect.anything());
  });
});
