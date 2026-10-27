// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AsistenteDeAgente } from "@/app/(app)/agentes/nuevo/_components/asistente-de-agente";
import { FeedbackProviders } from "@/components/ui/providers";
import type { AgentTemplate, Question } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

import {
  MAX_PASOS,
  cuerpoDeCreacion,
  elegirTipo,
  errorDelPaso,
  pasoDelCampo,
  pasosDelAsistente,
  respuestasPorDefecto,
  textoDeAvance,
} from "./agente-asistente";

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

describe("pasos del asistente", () => {
  it("sin tipo elegido solo está el primer paso", () => {
    expect(pasosDelAsistente(null).map((p) => p.id)).toEqual(["tipo"]);
  });

  it("Ventas pregunta qué vende; Cobranza no, y nunca pasa de 10 pasos", () => {
    expect(pasosDelAsistente(VENTAS).map((p) => p.id)).toEqual([
      "tipo",
      "que_vendes",
      "largo_respuesta",
      "nombre",
      "contenido",
      "revisar",
    ]);
    expect(pasosDelAsistente(COBRANZA).map((p) => p.id)).not.toContain("que_vendes");
    const muchas = Array.from({ length: 12 }, (_, i) => ({ ...LARGO, id: `q${i}` }));
    expect(pasosDelAsistente(plantilla("x", "X", muchas)).length).toBeLessThanOrEqual(MAX_PASOS);
  });

  it("una pregunta de la API no pisa los pasos propios del asistente", () => {
    const rara = plantilla("x", "X", [{ ...LARGO, id: "nombre" }]);
    expect(pasosDelAsistente(rara).filter((p) => p.id === "nombre")).toHaveLength(1);
  });

  it("al elegir el tipo ya viene marcado el valor por defecto de cada pregunta", () => {
    expect(respuestasPorDefecto(VENTAS)).toEqual({ que_vendes: "productos", largo_respuesta: "normal" });
    expect(elegirTipo(VENTAS)).toEqual({
      plantilla: "ventas",
      respuestas: { que_vendes: "productos", largo_respuesta: "normal" },
      nombre: "",
    });
  });

  it("no deja avanzar sin tipo, con un tipo no disponible o sin una opción válida", () => {
    const [tipo, pregunta] = pasosDelAsistente(VENTAS);
    expect(errorDelPaso(tipo, { plantilla: null, respuestas: {}, nombre: "" }, null)).toMatch(/Elige/);
    const sinHabilidad = { ...VENTAS, available: false };
    expect(errorDelPaso(tipo, elegirTipo(sinHabilidad), sinHabilidad)).toMatch(/habilidad/);
    expect(errorDelPaso(tipo, elegirTipo(VENTAS), VENTAS)).toBeUndefined();
    expect(errorDelPaso(pregunta, { ...elegirTipo(VENTAS), respuestas: { que_vendes: "otra" } }, VENTAS)).toMatch(/opciones/);
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

  it("lleva un error de campo de la API al paso que le corresponde", () => {
    const pasos = pasosDelAsistente(VENTAS);
    expect(pasoDelCampo("que_vendes", pasos)).toBe(1);
    expect(pasoDelCampo("name", pasos)).toBe(3);
    expect(pasoDelCampo("desconocido", pasos)).toBe(pasos.length - 1);
    expect(textoDeAvance(1, 6)).toBe("Paso 2 de 6");
  });
});

function montar(plantillas: AgentTemplate[]) {
  return render(
    <FeedbackProviders>
      <AsistenteDeAgente plantillas={plantillas} />
    </FeedbackProviders>,
  );
}

describe("asistente en pantalla", () => {
  beforeEach(() => {
    push.mockClear();
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("guía el guion de Ventas: «Paso X de N», sin pedir frases ni modelo, y crea el borrador con las respuestas", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ agentId: "a-1", warnings: [], requirements: [] }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = montar([VENTAS, COBRANZA]);

    expect(screen.getByText("Paso 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByRole("alert").textContent).toMatch(/Elige/);

    fireEvent.click(screen.getByRole("radio", { name: /Ventas/ }));
    expect(screen.getByText("Paso 1 de 6")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    // Pregunta del tipo de negocio: elige planes.
    expect(screen.getByRole("heading", { name: "¿Qué vende tu negocio?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /Planes o suscripciones/ }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" })); // largo: por defecto
    fireEvent.change(screen.getByLabelText(/Nombre del agente/), { target: { value: "Mis ventas" } });
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" })); // contenido

    expect(screen.getByText("Paso 6 de 6")).toBeTruthy();
    expect(screen.queryByText(/frases/i)).toBeTruthy(); // el resumen explica que van por defecto
    expect((await violacionesGraves(container)).join("\n")).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Crear mi agente" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/agentes/a-1/editar?paso=publicar"));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/agent-editor/from-script");
    expect(JSON.parse(init.body as string)).toEqual({
      template_key: "ventas",
      answers: { que_vendes: "planes", largo_respuesta: "normal" },
      name: "Mis ventas",
    });
  });

  it("Cobranza no ve las preguntas de Ventas y el paso de contenido enlaza lo que falta", () => {
    montar([VENTAS, COBRANZA]);
    fireEvent.click(screen.getByRole("radio", { name: /Cobranza/ }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.queryByText("¿Qué vende tu negocio?")).toBeNull();
    expect(screen.getByRole("heading", { name: "¿Qué tan largas quieres sus respuestas?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText(/Para que funcione del todo, configura/)).toBeTruthy();
    expect(screen.getAllByRole("link").some((a) => a.getAttribute("href") !== "/agentes")).toBe(true); // enlace a la pantalla de la cartera
  });

  it("si ya existe el agente de ese tipo ofrece editarlo y no crea otro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "Ya tienes un agente «Ventas».", code: "key_taken", fields: { agent_id: "viejo" } }), {
          status: 409,
        }),
      ),
    );
    montar([VENTAS]);
    fireEvent.click(screen.getByRole("radio", { name: /Ventas/ }));
    for (let i = 0; i < 5; i += 1) fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Crear mi agente" }));
    const enlace = await screen.findByRole("link", { name: "Editarlo" });
    expect(enlace.getAttribute("href")).toBe("/agentes/viejo/editar");
    expect(push).not.toHaveBeenCalled();
  });

  it("retoma donde se quedó al volver", () => {
    window.localStorage.setItem(
      "asistente-de-agente",
      JSON.stringify({ estado: elegirTipo(VENTAS), paso: 2 }),
    );
    montar([VENTAS]);
    expect(screen.getByText("Paso 3 de 6")).toBeTruthy();
    expect(screen.getByText(/Retomamos donde lo dejaste/)).toBeTruthy();
  });
});
