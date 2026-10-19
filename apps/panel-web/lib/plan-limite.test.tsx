// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { EditorDeAgente } from "@/app/(app)/agentes/[id]/editar/_components/editor-de-agente";
import { NewCollaboratorDialog } from "@/app/(app)/colaboradores/_components/new-collaborator-dialog";
import { FeedbackProviders } from "@/components/ui/providers";
import { UsageBar } from "@/components/ui/usage-bar";
import type { AgentDetail, LlmModelCatalog, PlanResponse, PublishTarget, Superpower } from "@/lib/api/types";
import { plan as planDePrueba } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

import {
  avisoDeCredito,
  desgloseDeCredito,
  esLimiteDePlan,
  etiquetaDeLimite,
  formatoCreditos,
  limitesOrdenados,
  RUTA_MEJORAR_PLAN,
  separarConsumo,
} from "./plan-limite";

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

  it("separa lo que vende el plan del resto de topes, en orden", () => {
    const { delPlan, resto } = separarConsumo(planDePrueba.usage);
    expect(delPlan.map((u) => u.key)).toEqual(["agentes", "colaboradores"]);
    expect(resto.map((u) => u.key)).toEqual(["conversations"]);
  });

  it("topes del catálogo con nombre legible y las dimensiones del plan primero", () => {
    expect(limitesOrdenados({ mensajes: 10, colaboradores: 5, agentes: 2 }).map(([k]) => k)).toEqual([
      "agentes",
      "colaboradores",
      "mensajes",
    ]);
    expect(etiquetaDeLimite("agentes")).toBe("Agentes publicados");
    expect(etiquetaDeLimite("otra")).toBe("otra");
  });
});

describe("barras de Plan y consumo", () => {
  it("una barra sin medición muestra el tope, la barra vacía y la nota", () => {
    render(<UsageBar label="Crédito mensual" used={null} limit={20000} percent={null} unit="créditos" nota="pronto" />);
    const barra = screen.getByRole("progressbar", { name: "Crédito mensual" });
    expect(barra.getAttribute("aria-valuenow")).toBeNull();
    expect(screen.getByText(/— \/ 20/)).toBeTruthy();
    expect(screen.getByText("créditos · pronto")).toBeTruthy();
  });

  it("agentes, colaboradores y crédito mensual van primero, con su consumo y su tope", async () => {
    respuestaDelPlan.actual = planDePrueba satisfies PlanResponse;
    const { default: PlanPage } = await import("@/app/(app)/plan/page");
    render(<FeedbackProviders>{await resolverServidor(await PlanPage())}</FeedbackProviders>);
    const incluye = screen.getByRole("region", { name: "Lo que incluye tu plan" });
    const barras = within(incluye).getAllByRole("progressbar");
    expect(barras.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Agentes publicados",
      "Colaboradores",
      "Crédito mensual",
    ]);
    expect(barras[0].getAttribute("aria-valuenow")).toBe("2");
    expect(barras[0].getAttribute("aria-valuemax")).toBe("2");
    expect(barras[2].getAttribute("aria-valuemax")).toBe("20000");
    // Crédito medido (HU-BILL-04/06): consumo real, sin aviso por debajo del 80 %.
    expect(barras[2].getAttribute("aria-valuenow")).toBe("1234.5");
    expect(within(incluye).getByText(/1 crédito = COP 10 · se renueva el/)).toBeTruthy();
    expect(within(incluye).queryByRole("status")).toBeNull();
    const conceptos = within(incluye).getByRole("list", { name: "Crédito por concepto" });
    expect(within(conceptos).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "Respuestas del asistente (IA)1.100",
      "Plantillas enviadas130",
      "Notas de voz4,5",
    ]);
    const agentes = within(incluye).getByRole("list", { name: "Crédito por agente" });
    expect(within(agentes).getByText("Ventas")).toBeTruthy();
    // El catálogo dice los topes con nombre legible, no la clave.
    expect(screen.getAllByText("Agentes publicados").length).toBeGreaterThan(1);
  });
});

describe("crédito mensual medido (HU-BILL-04/06)", () => {
  const conCredito = (used: number | null, percent: number | null): PlanResponse => ({
    ...planDePrueba,
    credit: { ...planDePrueba.credit!, used, percent },
  });

  it("avisa al 80 % y al 100 % sin hablar de bloqueo; por debajo, nada", () => {
    expect(avisoDeCredito(conCredito(15000, 75).credit)).toBeNull();
    expect(avisoDeCredito(conCredito(null, null).credit)).toBeNull();
    expect(avisoDeCredito(conCredito(16400, 82).credit, "5 nov")).toMatchObject({
      nivel: "alto",
      titulo: "Llevas el 82 % del crédito del mes",
    });
    const agotado = avisoDeCredito(conCredito(21000, 105).credit, "5 nov");
    expect(agotado?.nivel).toBe("agotado");
    expect(agotado?.texto).toMatch(/sigue respondiendo/);
    expect(agotado?.texto).toMatch(/se renueva el 5 nov/);
  });

  it("desglose legible, de mayor a menor y sin conceptos en cero", () => {
    expect(desgloseDeCredito(planDePrueba.credit).map((d) => d.concepto)).toEqual([
      "Respuestas del asistente (IA)",
      "Plantillas enviadas",
      "Notas de voz",
    ]);
    expect(formatoCreditos(1234.5)).toBe("1.234,5");
  });

  it.each([
    [82, "Llevas el 82 % del crédito del mes"],
    [100, "Usaste todo el crédito del mes"],
  ])("al %i %% la página muestra el aviso y la barra sigue", async (percent, titulo) => {
    respuestaDelPlan.actual = conCredito(percent * 200, percent);
    const { default: PlanPage } = await import("@/app/(app)/plan/page");
    render(<FeedbackProviders>{await resolverServidor(await PlanPage())}</FeedbackProviders>);
    const incluye = screen.getByRole("region", { name: "Lo que incluye tu plan" });
    expect(within(within(incluye).getByRole("status")).getByText(titulo)).toBeTruthy();
    expect(within(incluye).getByRole("progressbar", { name: "Crédito mensual" })).toBeTruthy();
  });

  it("si el core no pudo medir, la barra queda vacía con «medición pendiente»", async () => {
    respuestaDelPlan.actual = { ...planDePrueba, credit: { limit: 20000, used: null, percent: null } };
    const { default: PlanPage } = await import("@/app/(app)/plan/page");
    render(<FeedbackProviders>{await resolverServidor(await PlanPage())}</FeedbackProviders>);
    const incluye = screen.getByRole("region", { name: "Lo que incluye tu plan" });
    expect(within(incluye).getByText(/medición del consumo en créditos llega pronto/)).toBeTruthy();
    expect(within(incluye).queryByRole("status")).toBeNull();
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
    fireEvent.click(screen.getByRole("button", { name: /Paso 5/ }));
    fireEvent.click(screen.getByRole("button", { name: "Publicar versión" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    // El mensaje sale en el aviso junto al botón (con el enlace) y en el toast.
    const enlace = await screen.findByRole("link", { name: "Mejorar mi plan" });
    const aviso = enlace.closest("[role=alert]") as HTMLElement;
    expect(aviso.textContent).toMatch(/permite 1 agente/);
    expect(enlace.getAttribute("href")).toBe(RUTA_MEJORAR_PLAN);
  });

  it("Colaboradores explica el tope al invitar, no cierra el diálogo y ofrece mejorar el plan", async () => {
    fetchMock.mockResolvedValueOnce(
      limite("plan_limit_colaboradores", "Tu plan permite 2 colaborador(es) y ya tienes 2, contando las invitaciones pendientes."),
    );
    render(
      <FeedbackProviders>
        <NewCollaboratorDialog />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Nuevo colaborador" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/Correo/), { target: { value: "ana@x.test" } });
    fireEvent.change(within(dialogo).getByLabelText(/^Contraseña/), { target: { value: "clave-larga-1" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Crear cuenta" }));
    const aviso = await within(dialogo).findByText(/permite 2 colaborador/);
    const caja = aviso.closest("[role=alert]") as HTMLElement;
    expect(within(caja).getByRole("link", { name: "Mejorar mi plan" }).getAttribute("href")).toBe("/plan");
    expect(screen.queryByRole("dialog")).not.toBeNull();
  });
});
