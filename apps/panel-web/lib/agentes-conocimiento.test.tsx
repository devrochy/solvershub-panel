// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ConocimientoDelAgente } from "@/app/(app)/agentes/_components/conocimiento";
import { FeedbackProviders } from "@/components/ui/providers";
import type { KnowledgeDocument } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";
import { agentes, me } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

// Pestaña «Conocimiento» de la ficha del agente (HU-AOS-49): solo especialistas, aviso si el agente
// todavía no usa sus documentos, subida con el tope del plan y borrado con confirmación.

const respuestas: Record<string, unknown> = {};
const llamadas: string[] = [];

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  apiFetch: vi.fn(async (ruta: string) => {
    llamadas.push(ruta);
    const data = respuestas[ruta.split("?")[0]];
    return data === undefined ? { ok: false, status: 404, error: "sin fixture" } : { ok: true, status: 200, data };
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], has: () => false }),
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/agentes/x",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

type Pagina = (props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) => Promise<ReactNode>;

const VENTAS = agentes.items[1];
const AGENTE = VENTAS.id as string;

function documento(extra: Partial<KnowledgeDocument> = {}): KnowledgeDocument {
  return {
    id: "1c7f7e4f-7b54-4d4a-8b63-5c7d2d2f3a21",
    agent_id: AGENTE,
    titulo: "Preguntas frecuentes",
    mime: "application/pdf",
    bytes: 2048,
    estado: "listo",
    error_codigo: null,
    paginas: 3,
    num_fragmentos: 5,
    pii_detectada: 0,
    desactualizado: false,
    created_at: "2026-10-20T10:00:00Z",
    processed_at: "2026-10-20T10:01:00Z",
    ...extra,
  };
}

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  llamadas.length = 0;
  for (const k of Object.keys(respuestas)) delete respuestas[k];
});

async function abrir(id: string, sp: Record<string, string> = {}) {
  const Pagina = (await import("@/app/(app)/agentes/[id]/page")).default as Pagina;
  const arbol = await resolverServidor(await Pagina({ params: Promise.resolve({ id }), searchParams: Promise.resolve(sp) }));
  return render(<FeedbackProviders>{arbol}</FeedbackProviders>);
}

function pestana(props: Partial<Parameters<typeof ConocimientoDelAgente>[0]> = {}) {
  return render(
    <FeedbackProviders>
      <ConocimientoDelAgente
        agenteId={AGENTE}
        nombre="Ventas"
        documentos={[]}
        puedeEscribir
        usaConocimiento
        puedeEditar
        {...props}
      />
    </FeedbackProviders>,
  );
}

describe("ficha del agente", () => {
  it("un especialista tiene la pestaña Conocimiento, con sus documentos y sin filtros de período", async () => {
    Object.assign(respuestas, {
      "/admin/agents/overview": agentes,
      "/admin/me": me,
      [`/pack/pack_knowledge/agents/${AGENTE}/documents`]: [documento()],
      [`/admin/agents/${AGENTE}`]: { draft: { content: { tools: [] } } },
    });
    const { container } = await abrir(VENTAS.ref, { tab: "conocimiento" });
    expect(screen.getByRole("link", { name: "Conocimiento" })).toBeTruthy();
    expect(screen.getByText("Preguntas frecuentes")).toBeTruthy();
    expect(screen.getByText("2 KB · 3 páginas · 5 fragmentos")).toBeTruthy();
    // El borrador no declara la búsqueda: lo dice y lleva al editor.
    expect(screen.getByText(/todavía no responde con estos documentos/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Editar agente → Memoria y conocimiento/ }).getAttribute("href")).toBe(
      `/agentes/${AGENTE}/editar`,
    );
    expect(screen.queryByLabelText(/Período/i)).toBeNull();
    expect(llamadas).toContain(`/pack/pack_knowledge/agents/${AGENTE}/documents`);
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("el Coordinador no tiene pestaña Conocimiento", async () => {
    const conCoordinador = {
      ...agentes,
      items: agentes.items.map((a, i) => (i === 1 ? { ...a, kind: "core" } : a)),
    };
    Object.assign(respuestas, {
      "/admin/agents/overview": conCoordinador,
      "/admin/me": me,
      [`/admin/agents/${VENTAS.ref}/conversations`]: { items: [], total: 0, page: 1, has_more: false },
    });
    await abrir(VENTAS.ref, { tab: "conocimiento" });
    expect(screen.queryByRole("link", { name: "Conocimiento" })).toBeNull();
    expect(llamadas.some((r) => r.includes("pack_knowledge"))).toBe(false);
  });
});

describe("pestaña Conocimiento", () => {
  it("muestra el estado, el motivo de una falla y el aviso de datos personales", () => {
    pestana({
      documentos: [
        documento({ id: "a", titulo: "Escaneado", estado: "fallido", error_codigo: "sin_texto" }),
        documento({ id: "b", titulo: "Clientes", pii_detectada: 4 }),
      ],
    });
    expect(screen.getByText("No se pudo leer")).toBeTruthy();
    expect(screen.getByText(/PDF escaneado/)).toBeTruthy();
    expect(screen.getByText(/datos personales/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Volver a procesar «Escaneado»" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Volver a procesar «Clientes»" })).toBeNull();
  });

  it("sin permiso de escritura no hay subida ni acciones", () => {
    pestana({ puedeEscribir: false, documentos: [documento()] });
    expect(screen.queryByRole("group", { name: /Arrastra o elige/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Borrar/ })).toBeNull();
  });

  it("al tope del plan muestra el aviso para mejorar el plan", async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? new Response(
            JSON.stringify({ error: "Tu plan permite 3 documento(s) de conocimiento y ya tienes 3.", code: "plan_limit_documentos" }),
            { status: 409 },
          )
        : new Response(JSON.stringify([]), { status: 200 }),
    );
    const { container } = pestana();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["hola"], "faq.md", { type: "" })] } });
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/Tu plan permite 3 documento/));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/agent-knowledge/${AGENTE}/documents`);
    expect((init.body as FormData).get("archivo")).toBeInstanceOf(File);
  });

  it("un tipo no admitido no se sube", async () => {
    const { container } = pestana();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "foto.png", { type: "image/png" })] } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("borrar pide confirmación y quita el documento de la lista", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    pestana({ documentos: [documento()] });
    fireEvent.click(screen.getByRole("button", { name: "Borrar «Preguntas frecuentes»" }));
    fireEvent.click(await screen.findByRole("button", { name: "Borrar documento" }));
    await waitFor(() => expect(screen.queryByText("2 KB · 3 páginas · 5 fragmentos")).toBeNull());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/agent-knowledge/${AGENTE}/documents/1c7f7e4f-7b54-4d4a-8b63-5c7d2d2f3a21`);
    expect(init.method).toBe("DELETE");
  });
});
