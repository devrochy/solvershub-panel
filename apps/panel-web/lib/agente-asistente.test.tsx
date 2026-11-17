// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { NuevoAgente } from "@/app/(app)/agentes/nuevo/_components/nuevo-agente";
import { FeedbackProviders } from "@/components/ui/providers";
import type { AgentTemplate, Question } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

import { negocioDesdeIdentidad } from "@/lib/agentes-editor";
import { ajustes } from "@/lib/testing/fixtures";

import { cuerpoDeCreacion, elegirTipo, respuestasPorDefecto, textoDeAvance } from "./agente-asistente";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push }),
}));

const QUE_VENDES: Question = {
  id: "que_vendes",
  text: "¿Qué vende tu negocio?",
  help: "Define el superpoder.",
  type: "option",
  default: "productos",
  options: [
    { id: "productos", text: "Productos", help: "Toma el pedido." },
    { id: "planes", text: "Planes o suscripciones", help: "" },
    { id: "ambos", text: "Productos y planes", help: "" },
  ],
};
const LARGO: Question = {
  id: "largo_respuesta",
  text: "¿Qué tan largas quieres sus respuestas?",
  help: "",
  type: "option",
  default: "normal",
  options: [
    { id: "cortas", text: "Cortas", help: "" },
    { id: "normal", text: "Normales", help: "" },
  ],
};

function plantilla(key: string, name: string, questions: Question[], extra: Partial<AgentTemplate> = {}): AgentTemplate {
  return {
    key,
    name,
    description: `Agente de ${name}`,
    section: name,
    tools: [],
    questions,
    skills: [],
    optional_skills: [],
    available: true,
    missing_skills: [],
    will_enable: [],
    superpowers: [],
    requirements: [],
    ...extra,
  };
}

const VENTAS = plantilla("ventas", "Ventas", [QUE_VENDES, LARGO]);
const COBRANZA = plantilla("cobranza", "Cobranza", [LARGO], {
  requirements: [
    { skill: "pack_cobranza", kind: "sin_contenido", title: "Cartera", explanation: "", section: "cobranza", content: "cartera" },
  ],
});

describe("lógica de Nuevo agente", () => {
  it("al elegir el tipo ya viene marcado el valor sugerido de cada pregunta", () => {
    expect(respuestasPorDefecto(VENTAS)).toEqual({ que_vendes: "productos", largo_respuesta: "normal" });
    expect(elegirTipo(VENTAS)).toEqual({
      plantilla: "ventas",
      respuestas: { que_vendes: "productos", largo_respuesta: "normal" },
      nombre: "",
    });
  });

  it("arma el cuerpo con solo respuestas del guion y el nombre recortado", () => {
    const estado = { plantilla: "ventas", respuestas: { que_vendes: "planes", basura: "x" }, nombre: "  Mis ventas " };
    expect(cuerpoDeCreacion(estado, VENTAS)).toEqual({
      template_key: "ventas",
      answers: { que_vendes: "planes" },
      name: "Mis ventas",
    });
    expect(cuerpoDeCreacion({ ...estado, nombre: " " }, VENTAS)).not.toHaveProperty("name");
  });

  it("«Paso X de N»", () => {
    expect(textoDeAvance(0, 8)).toBe("Paso 1 de 8");
  });
});

describe("horario del negocio en el editor", () => {
  it("sin franjas guardadas no muestra el horario sugerido del asistente como si fuera del negocio", () => {
    expect(negocioDesdeIdentidad("N", { ...ajustes.identity, business_ranges: [] }).horario).toBe("Sin horario definido");
  });

  it("con franjas guardadas las resume", () => {
    const negocio = negocioDesdeIdentidad("N", {
      ...ajustes.identity,
      business_ranges: [{ day: 0, from: "09:00", to: "17:00" }],
    });
    expect(negocio.horario).toMatch(/9:00/);
  });
});

describe("Nuevo agente en pantalla (HU-AOS-77)", () => {
  const fetchMock = vi.fn();
  const negocio = negocioDesdeIdentidad("Negocio de prueba", null);
  beforeEach(() => {
    fetchMock.mockReset();
    push.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function abrir() {
    return render(
      <FeedbackProviders>
        <NuevoAgente plantillas={[VENTAS, COBRANZA]} negocio={negocio} />
      </FeedbackProviders>,
    );
  }

  it("es el paso 1 de 4 de la creación rápida (HU-AOS-81), con el guion y lo sugerido ya marcado", async () => {
    const { container } = abrir();
    expect(screen.getByText("Paso 1 de 4 · Tipo")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "¿Qué quieres que haga tu agente?" })).toBeTruthy();
    expect(screen.queryByText(/modelo/i)).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /Ventas/ }));
    expect(screen.getByRole("radio", { name: /Productos · sugerido/ }).getAttribute("aria-checked")).toBe("true");
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("crea el borrador con el guion, guarda la descripción y sigue en «Habilidades y formas de pago»", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/agent-editor/from-script"
        ? new Response(JSON.stringify({ agentId: "a-1" }), { status: 201 })
        : new Response(JSON.stringify({}), { status: 200 }),
    );
    abrir();
    fireEvent.click(screen.getByRole("radio", { name: /Ventas/ }));
    fireEvent.change(screen.getByLabelText(/Nombre del agente/), { target: { value: "Sofía" } });
    fireEvent.change(screen.getByLabelText(/Para qué sirve/), { target: { value: "Vende por WhatsApp." } });
    fireEvent.click(screen.getByRole("button", { name: /Crear borrador y seguir/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/agentes/a-1/personalizar?paso=habilidades&modo=crear"));
    const [, crear] = fetchMock.mock.calls[0];
    expect(JSON.parse(crear.body)).toEqual({ template_key: "ventas", answers: { que_vendes: "productos", largo_respuesta: "normal" }, name: "Sofía" });
    const [url, patch] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/agent-editor/a-1");
    expect(JSON.parse(patch.body)).toEqual({ name: "Sofía", description: "Vende por WhatsApp." });
  });

  it("no crea sin tipo elegido", () => {
    abrir();
    fireEvent.click(screen.getByRole("button", { name: /Crear borrador y seguir/ }));
    expect(screen.getByText("Elige qué quieres que haga tu agente.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("si ya existe el agente de ese tipo ofrece editarlo y no sigue", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Ya existe.", code: "key_taken", fields: { agent_id: "a-9" } }), { status: 409 }),
    );
    abrir();
    fireEvent.click(screen.getByRole("radio", { name: /Cobranza/ }));
    fireEvent.click(screen.getByRole("button", { name: /Crear borrador y seguir/ }));
    const enlace = await screen.findByRole("link", { name: "Editarlo" });
    expect(enlace.getAttribute("href")).toBe("/agentes/a-9/personalizar");
    expect(push).not.toHaveBeenCalled();
  });
});
