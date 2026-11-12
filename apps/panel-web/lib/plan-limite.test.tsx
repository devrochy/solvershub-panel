// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { EditorDeAgente } from "@/app/(app)/agentes/[id]/editar/_components/editor-de-agente";
import { NewCollaboratorDialog } from "@/app/(app)/colaboradores/_components/new-collaborator-dialog";
import { FeedbackProviders } from "@/components/ui/providers";
import type { AgentDetail, LlmModelCatalog, PlanResponse, PublishTarget, Superpower } from "@/lib/api/types";
import { plan as planDePrueba } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

import { esLimiteDePlan, limitesOrdenados, RUTA_MEJORAR_PLAN } from "./plan-limite";

// HU-BILL-05 (D-35): barras de agentes, colaboradores y crédito en Plan y consumo, y el 409 de tope
// del plan en el editor de agentes (al publicar) y en Colaboradores (al invitar).

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/plan",
}));

const respuestaDelPlan = vi.hoisted(() => ({ actual: null as unknown }));
vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  apiFetch: vi.fn(async () => ({ ok: true, status: 200, data: respuestaDelPlan.actual })),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("reglas del plan por agentes (lógica pura)", () => {
  it("reconoce el 409 de tope del plan por su code", () => {
    expect(esLimiteDePlan("plan_limit_agentes")).toBe(true);
    expect(esLimiteDePlan("plan_limit_colaboradores")).toBe(true);
    expect(esLimiteDePlan("conflict")).toBe(false);
    expect(esLimiteDePlan(undefined)).toBe(false);
  });

  it("topes del catálogo con las dimensiones del plan primero", () => {
    expect(limitesOrdenados({ mensajes: 10, colaboradores: 5, agentes: 2 }).map(([k]) => k)).toEqual([
      "agentes",
      "colaboradores",
      "mensajes",
    ]);
  });
});

describe("Consumo y plan (rediseño B)", () => {
  it("el crédito en palabras, el reparto y los topes con lo que pasa al llegar (CYP-02 a 04)", async () => {
    respuestaDelPlan.actual = planDePrueba satisfies PlanResponse;
    const { default: PlanPage } = await import("@/app/(app)/plan/page");
    render(<FeedbackProviders>{await resolverServidor(await PlanPage({ searchParams: Promise.resolve({}) }))}</FeedbackProviders>);
    // Crédito medido (HU-BILL-04/06): lo que queda, sin aviso por debajo del 80 %.
    expect(screen.getByRole("heading", { name: "Te quedan 18.766 créditos" })).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    const reparto = screen.getByRole("region", { name: "En qué se usó el crédito" });
    expect(within(reparto).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Respuestas del asistente (IA)1.100 · 89 %",
      "Plantillas enviadas130 · 11 %",
      "Notas de voz5 · 0 %",
    ]);
    expect(screen.getByRole("link", { name: "Ventas" }).getAttribute("href")).toBe("/agentes/00000000-0000-4000-8000-0000000000a1");
    // Los topes, con los que piden atención primero y lo que pasa al llegar.
    const incluye = screen.getByRole("region", { name: "Lo que incluye tu plan" });
    expect(within(incluye).getAllByRole("progressbar").map((b) => b.getAttribute("aria-label"))).toEqual([
      "Agentes publicados",
      "Conversaciones del mes",
      "Personas del equipo",
    ]);
    expect(within(incluye).getByText(/No puedes publicar otro agente/)).toBeTruthy();
    expect(within(incluye).getByRole("link", { name: "Mejorar mi plan" }).getAttribute("href")).toBe(`${RUTA_MEJORAR_PLAN}?ver=planes`);
  });
});

describe("crédito mensual medido (HU-BILL-04/06)", () => {
  const conCredito = (used: number | null, percent: number | null): PlanResponse => ({
    ...planDePrueba,
    credit: { ...planDePrueba.credit!, used, percent },
  });

  it.each([
    [82, /^Vas al 82 %/],
    [100, /^El crédito se acabó$/],
  ])("al %i %% la página muestra el aviso y la barra sigue", async (percent, titulo) => {
    respuestaDelPlan.actual = conCredito(percent * 200, percent);
    const { default: PlanPage } = await import("@/app/(app)/plan/page");
    render(<FeedbackProviders>{await resolverServidor(await PlanPage({ searchParams: Promise.resolve({}) }))}</FeedbackProviders>);
    expect(within(screen.getByRole("status")).getByText(titulo)).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Crédito usado" })).toBeTruthy();
  });

  it("si el core no pudo medir, la barra queda vacía con «medición pendiente»", async () => {
    respuestaDelPlan.actual = { ...planDePrueba, credit: { limit: 20000, used: null, percent: null } };
    const { default: PlanPage } = await import("@/app/(app)/plan/page");
    render(<FeedbackProviders>{await resolverServidor(await PlanPage({ searchParams: Promise.resolve({}) }))}</FeedbackProviders>);
    expect(screen.getByText(/La medición del consumo llega pronto/)).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("progressbar", { name: "Crédito usado" })).toBeNull();
  });
});

describe("409 de tope del plan", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  const limite = (code: string, error: string) =>
    new Response(JSON.stringify({ error, code }), { status: 409 });

  it("el editor explica el tope de agentes al publicar y ofrece mejorar el plan", async () => {
    const poder: Superpower = {
      id: "pack_commerce.tomar_pedido",
      version: "1.2.0",
      skill: "pack_commerce",
      title: "Tomar un pedido",
      description: "",
      phrases: ["a", "b", "c"].map((x) => `pedido ${x}`),
    };
    const agente = {
      id: "11111111-1111-4111-8111-111111111111",
      key: "ventas",
      kind: "specialist",
      contract: "agentspec/3",
      name: "Ventas",
      description: "",
      status: "active",
      latest_version: null,
      created_at: "2026-10-18T00:00:00Z",
      draft: {
        content: {
          contract: "agentspec/3",
          description: "Ventas",
          persona: { inheritConnectionVoice: true, maxLength: 500, forbiddenPhrases: [] },
          model: { primary: "deepseek-flash", temperature: 0.3, fallback: "gpt-4o-mini" },
          procedures: [{ id: poder.id, version: "^1.0" }],
          memory: { shortTermTurns: 30, readScopes: ["customer", "connection", "tenant"], writeNamespaces: [] },
          tools: [{ tool: "crear_pedido", enabled: true }],
        },
        lock_version: 1,
        base_version_id: null,
        updated_at: "2026-10-18T00:00:00Z",
      },
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
    fetchMock.mockResolvedValueOnce(
      limite("plan_limit_agentes", "Tu plan permite 1 agente(s) publicado(s) y ya tienes 1. Mejora tu plan para publicar otro agente."),
    );
    render(
      <FeedbackProviders>
        <EditorDeAgente agente={agente} superpoderes={[poder]} modelos={modelos} destinos={[conexion]} destinosError={null} puedeActivar />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Paso 6/ }));
    fireEvent.click(screen.getByRole("button", { name: "Publicar versión" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    // El mensaje sale en el aviso junto al botón (con el enlace) y en el toast.
    const enlace = await screen.findByRole("link", { name: "Mejorar mi plan" });
    const aviso = enlace.closest("[role=alert]") as HTMLElement;
    expect(aviso.textContent).toMatch(/permite 1 agente/);
    expect(enlace.getAttribute("href")).toBe(RUTA_MEJORAR_PLAN);
  });

  it("Colaboradores explica el tope al invitar, no cierra el diálogo y ofrece mejorar el plan", async () => {
    fetchMock.mockImplementation(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes("/existe")) return new Response(JSON.stringify({ existe: false }), { status: 200 });
      if (url.includes("/username-disponible")) return new Response(JSON.stringify({ disponible: true }), { status: 200 });
      return limite("plan_limit_colaboradores", "Tu plan permite 2 colaborador(es) y ya tienes 2, contando las invitaciones pendientes.");
    });
    render(
      <FeedbackProviders>
        <NewCollaboratorDialog />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Invitar a alguien" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/Correo/), { target: { value: "ana@x.test" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Continuar" }));
    fireEvent.change(await within(dialogo).findByLabelText(/Nombre completo/), { target: { value: "Ana Pérez" } });
    fireEvent.change(within(dialogo).getByLabelText(/^Usuario/), { target: { value: "ana.perez" } });
    await within(dialogo).findByText("Disponible");
    fireEvent.change(within(dialogo).getByLabelText(/^Contraseña/), { target: { value: "clave-larga-1" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Crear la cuenta" }));
    const aviso = await within(dialogo).findByText(/permite 2 colaborador/);
    const caja = aviso.closest("[role=alert]") as HTMLElement;
    expect(within(caja).getByRole("link", { name: "Mejorar mi plan" }).getAttribute("href")).toBe(RUTA_MEJORAR_PLAN);
    expect(screen.queryByRole("dialog")).not.toBeNull();
  });
});
