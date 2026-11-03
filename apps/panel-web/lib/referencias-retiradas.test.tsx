// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { EditorDeAgente } from "@/app/(app)/agentes/[id]/editar/_components/editor-de-agente";
import { ReferenciasRetiradas } from "@/app/(app)/tenants/_components/referencias-retiradas";
import {
  AvisoDeReferenciasEnLista,
  AvisoDeReferenciasRetiradas,
} from "@/components/domain/aviso-de-referencias-retiradas";
import { FeedbackProviders } from "@/components/ui/providers";
import type {
  AgentDetail,
  AgentRetiredNotices,
  LlmModelCatalog,
  PublishTarget,
  RetiredReferenceRow,
  RetiredReferencesReport,
  Superpower,
} from "@/lib/api/types";
import {
  agruparPorAgente,
  avisosDelBorrador,
  erroresDeAcciones,
  etiquetaDeAlcance,
  referenciasDelError,
  resumenDelReporte,
  titularDelAgente,
} from "@/lib/referencias-retiradas";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

// HU-AOS-59: el aviso de referencias retiradas, solo lectura. Master: reporte del negocio. Dueño: aviso por
// agente en palabras simples (sin códigos), señalado en el control y marcado si bloquea publicar.

const AGENTE_ID = "11111111-1111-4111-8111-111111111111";
const NEGOCIO = "0b6f6d3e-6a43-4c39-9a52-4b6c1c1e2f10";

const fila = (parcial: Partial<RetiredReferenceRow> = {}): RetiredReferenceRow => ({
  scope: "version",
  agent: "ventas",
  version: 3,
  path: "tools[3].tool",
  code: "accion_inexistente",
  kind: "action",
  name: "informar_plan",
  destination: "quitar",
  message: "La acción «informar_plan» ya no existe. Quítala del agente.",
  where: ["conexión c1 release #4"],
  ...parcial,
});

const reporte = (parcial: Partial<RetiredReferencesReport> = {}): RetiredReferencesReport => ({
  tenant_id: NEGOCIO,
  slug: "tienda",
  affected: true,
  agents_affected: 1,
  releases_affected: 1,
  rows: [fila()],
  drafts: [],
  affected_connections: [{ connection_id: "c1", release: 4 }],
  aside: [],
  error: null,
  ...parcial,
});

const avisos = (parcial: Partial<AgentRetiredNotices> = {}): AgentRetiredNotices => ({
  agent_id: AGENTE_ID,
  key: "ventas",
  name: "Ventas",
  published_version: 3,
  in_use: false,
  blocks_publish: false,
  notices: [
    {
      scope: "published",
      field: "tools[3].tool",
      kind: "action",
      name: "informar_plan",
      message: "Tu agente usa «Informar plan», que ya no existe. Quítalo y publica de nuevo.",
    },
  ],
  ...parcial,
});

afterEach(cleanup);

describe("lógica del aviso", () => {
  it("agrupa por agente y etiqueta el alcance", () => {
    const grupos = agruparPorAgente([fila(), fila({ agent: "agenda" }), fila({ scope: "release", version: null })]);
    expect(grupos.map((g) => [g.agente, g.filas.length])).toEqual([["ventas", 2], ["agenda", 1]]);
    expect(etiquetaDeAlcance(fila())).toBe("Versión 3");
    expect(etiquetaDeAlcance(fila({ scope: "release", version: null }))).toBe("Release activa");
    expect(etiquetaDeAlcance(fila({ scope: "draft", version: null }))).toBe("Borrador");
  });

  it("resumen en singular, plural y sin afectados", () => {
    expect(resumenDelReporte(reporte())).toBe("1 agente afectado y 1 release afectada.");
    expect(resumenDelReporte(reporte({ agents_affected: 2, releases_affected: 0 }))).toBe("2 agentes afectados y 0 releases afectadas.");
    expect(resumenDelReporte(reporte({ affected: false }))).toMatch(/Ningún agente/);
  });

  it("titular: bloquea publicar, en uso, o solo la versión publicada; sin avisos, nada", () => {
    expect(titularDelAgente(avisos({ blocks_publish: true }))).toMatch(/no se puede publicar/);
    expect(titularDelAgente(avisos({ in_use: true }))).toMatch(/atiende hoy/);
    expect(titularDelAgente(avisos())).toMatch(/última versión publicada/);
    expect(titularDelAgente(avisos({ notices: [] }))).toBeNull();
  });

  it("solo los avisos del borrador se vuelven errores de campo, y se juntan si comparten campo", () => {
    const base = { kind: "action" as const, name: "x" };
    expect(
      avisosDelBorrador([
        { ...base, scope: "draft", field: "procedures[1].id", message: "Uno." },
        { ...base, scope: "draft", field: "procedures[1].id", message: "Dos." },
        { ...base, scope: "published", field: "procedures[0].id", message: "No." },
      ]),
    ).toEqual({ "procedures[1].id": "Uno. Dos." });
  });

  it("lee las referencias del 422 e ignora formas raras; lista las acciones sin repetir", () => {
    expect(
      referenciasDelError({ retired_references: [{ field: "tools[0].tool", message: "Ya no existe." }, { field: 3 }, null] }),
    ).toEqual([{ field: "tools[0].tool", message: "Ya no existe." }]);
    expect(referenciasDelError(undefined)).toEqual([]);
    expect(referenciasDelError({ retired_references: "x" })).toEqual([]);
    expect(
      erroresDeAcciones({ "tools[0].tool": "A.", "tools[2].tool": "A.", "playbooks[0].steps": "B.", "persona.maxLength": "C." }),
    ).toEqual(["A.", "B."]);
  });
});

describe("reporte del negocio (master)", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const responder = (json: unknown, status = 200) => fetchMock.mockResolvedValue(new Response(JSON.stringify(json), { status }));

  it("lista por agente, versión y ruta con el mensaje simple, las releases afectadas y lo apartado aparte, sin botón de corregir", async () => {
    responder(
      reporte({
        agents_affected: 2,
        rows: [fila(), fila({ agent: "agenda", version: 1, path: "procedures[0].id", kind: "procedure", message: "El procedimiento «x» ya no existe." })],
        drafts: [fila({ scope: "draft", version: null, message: "En el borrador sigue «informar_plan»." })],
        aside: [{ connection_id: "c9", reason: "borrada", release: 2, rows: [fila({ scope: "release", version: null, message: "Una release vieja lo nombra." })] }],
      }),
    );
    render(<ReferenciasRetiradas tenantId={NEGOCIO} />);
    await screen.findByText("2 agentes afectados y 1 release afectada.");
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/platform/tenants/${NEGOCIO}/retired-references`);

    const principal = screen.getByRole("list", { name: "Agentes y versiones afectados" });
    expect(within(principal).getByText("Agente ventas")).toBeTruthy();
    expect(within(principal).getByText("Agente agenda")).toBeTruthy();
    expect(within(principal).getByText("Versión 3")).toBeTruthy();
    expect(within(principal).getByText("tools[3].tool")).toBeTruthy();
    expect(within(principal).getByText(/La acción «informar_plan» ya no existe/)).toBeTruthy();

    expect(screen.getByText("Releases activas afectadas")).toBeTruthy();
    expect(screen.getByText("Borradores con referencias retiradas")).toBeTruthy();
    // El bloque aparte no se mezcla con la lista principal.
    expect(within(principal).queryByText(/release vieja/)).toBeNull();
    expect(screen.getByText(/Apartado, no cuenta como falla \(1\)/)).toBeTruthy();
    expect(screen.getByText("Conexión borrada")).toBeTruthy();
    expect(screen.getByText(/Una release vieja lo nombra/)).toBeTruthy();

    expect(screen.queryByRole("button")).toBeNull();
    expect(document.body.textContent).not.toMatch(/\bCorregir\b/);
  });

  it("sin afectados lo dice y no muestra listas", async () => {
    responder(reporte({ affected: false, agents_affected: 0, releases_affected: 0, rows: [], affected_connections: [] }));
    render(<ReferenciasRetiradas tenantId={NEGOCIO} />);
    await screen.findByText("Sin afectados");
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("si la API falla muestra el motivo", async () => {
    responder({ error: "No tienes permiso." }, 403);
    render(<ReferenciasRetiradas tenantId={NEGOCIO} />);
    expect((await screen.findByRole("alert")).textContent).toBe("No tienes permiso.");
  });
});

describe("aviso del dueño", () => {
  it("dice qué ya no existe en palabras simples, sin códigos ni rutas, y marca si bloquea publicar", () => {
    render(
      <AvisoDeReferenciasRetiradas
        aviso={avisos({
          blocks_publish: true,
          notices: [{ scope: "draft", field: "tools[3].tool", kind: "action", name: "informar_plan", message: "Quita «Informar plan»: ya no existe." }],
        })}
      />,
    );
    expect(screen.getByText("Bloquea publicar")).toBeTruthy();
    expect(screen.getByText("Quita «Informar plan»: ya no existe.")).toBeTruthy();
    expect(screen.getByText("En tu borrador")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/accion_inexistente|tools\[3\]|informar_plan/);
  });

  it("sin avisos no pinta nada", () => {
    const { container } = render(<AvisoDeReferenciasRetiradas aviso={avisos({ notices: [] })} />);
    expect(container.innerHTML).toBe("");
    expect(render(<AvisoDeReferenciasRetiradas aviso={null} />).container.innerHTML).toBe("");
  });

  it("la lista de agentes cuenta los afectados y enlaza al editor", () => {
    render(<AvisoDeReferenciasEnLista avisos={{ affected_agents: 1, agents: [avisos({ blocks_publish: true })] }} />);
    expect(screen.getByText("1 agente nombra algo que ya no existe.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Revisar en el editor" }).getAttribute("href")).toBe(`/agentes/${AGENTE_ID}/editar`);
    cleanup();
    expect(render(<AvisoDeReferenciasEnLista avisos={{ affected_agents: 0, agents: [] }} />).container.innerHTML).toBe("");
  });
});

describe("editor de agentes con referencias retiradas", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const PEDIDO: Superpower = {
    id: "pack_commerce.tomar_pedido",
    version: "1.2.0",
    skill: "pack_commerce",
    title: "Tomar un pedido",
    description: "",
    phrases: ["a", "b", "c"].map((x) => `pedido ${x}`),
  };
  const BASE = {
    contract: "agentspec/3",
    description: "Ventas",
    persona: { inheritConnectionVoice: true, maxLength: 500, forbiddenPhrases: [] },
    model: { primary: "deepseek-flash", temperature: 0.3 },
    procedures: [
      { id: PEDIDO.id, version: "^1.0" },
      { id: "pack_commerce.informar_plan", version: "^1.0" },
    ],
    memory: { shortTermTurns: 30, readScopes: ["customer"], writeNamespaces: [] },
    tools: [{ tool: "informar_plan", enabled: true }],
  };
  const agente = {
    id: AGENTE_ID,
    key: "ventas",
    kind: "specialist",
    contract: "agentspec/3",
    name: "Ventas",
    description: "",
    status: "active",
    latest_version: null,
    created_at: "2026-10-18T00:00:00Z",
    draft: { content: BASE, lock_version: 1, base_version_id: null, updated_at: "2026-10-18T00:00:00Z" },
    versions: [],
  } as unknown as AgentDetail;
  const modelos = {
    items: [], total: 0, page: 1, page_size: 100, has_more: false, provider: "deepseek", byok_model: null,
    avg_input_tokens: null, avg_output_tokens: null, sample_turns: 0, min_phrases: 3,
  } as LlmModelCatalog;
  const conexion: PublishTarget = {
    connection_id: "22222222-2222-4222-8222-222222222222",
    label: "WhatsApp tienda",
    channel: "whatsapp",
    installed: false,
    covers_skills: true,
    missing_skills: [],
    active_release_id: null,
  };

  const editor = (avisosRetirados: AgentRetiredNotices | null) =>
    render(
      <FeedbackProviders>
        <EditorDeAgente
          agente={agente}
          superpoderes={[PEDIDO]}
          modelos={modelos}
          destinos={[conexion]}
          destinosError={null}
          puedeActivar
          avisosRetirados={avisosRetirados}
        />
      </FeedbackProviders>,
    );

  const DEL_BORRADOR = avisos({
    blocks_publish: true,
    notices: [
      { scope: "draft", field: "procedures[1].id", kind: "procedure", name: "pack_commerce.informar_plan", message: "«Informar plan» ya no existe: quítalo para publicar." },
      { scope: "published", field: "procedures[0].id", kind: "procedure", name: "x", message: "Otra cosa de la versión publicada." },
    ],
  });

  it("abre con el aviso arriba y señala el superpoder retirado del borrador (no el de otra versión)", () => {
    editor(DEL_BORRADOR);
    expect(screen.getByText("Bloquea publicar")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Paso 3/ }));
    const bloque = screen.getByRole("list", { name: "Superpoderes que no corresponden a este agente" });
    expect(within(bloque).getByText("Informar plan")).toBeTruthy();
    expect(within(bloque).getByText("«Informar plan» ya no existe: quítalo para publicar.")).toBeTruthy();
    // El aviso de la versión publicada vive solo arriba, no pegado a un superpoder del borrador.
    expect(screen.getAllByText("Otra cosa de la versión publicada.")).toHaveLength(1);
  });

  it("el 422 de publicar muestra el texto simple junto al control y no el mensaje genérico", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "Quita «Informar plan»: ya no existe.",
          code: "invalid_spec",
          fields: { "tools[0].tool": "Quita «Informar plan»: ya no existe." },
          details: { retired_references: [{ field: "tools[0].tool", message: "Quita «Informar plan»: ya no existe." }] },
        }),
        { status: 422 },
      ),
    );
    editor(null);
    fireEvent.click(screen.getByRole("button", { name: /Paso 5/ }));
    fireEvent.click(screen.getByRole("button", { name: "Publicar versión" }));
    // Lleva al paso de superpoderes y pinta el texto ahí.
    const alerta = await waitFor(() => {
      const el = screen.getAllByRole("alert").find((a) => a.id.startsWith("acciones-error"));
      if (!el) throw new Error("sin texto junto al control");
      return el;
    });
    expect(alerta.textContent).toBe("Quita «Informar plan»: ya no existe.");
    expect(document.body.textContent).not.toMatch(/Revisa los campos marcados/);
  });

  it("al guardar el borrador vuelve a leer los avisos: quitar lo retirado apaga el aviso", async () => {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/retired-references")) {
        return new Response(JSON.stringify(avisos({ notices: [] })), { status: 200 });
      }
      if (init?.method === "PUT") return new Response(JSON.stringify({ lockVersion: 2, content: BASE }), { status: 200 });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    editor(DEL_BORRADOR);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: "Ventas 2" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar y seguir" }));
    await waitFor(() => expect(screen.queryByText("Bloquea publicar")).toBeNull());
    expect(fetchMock.mock.calls.some(([u]) => String(u) === `/api/agent-editor/${AGENTE_ID}/retired-references`)).toBe(true);
  });
});
