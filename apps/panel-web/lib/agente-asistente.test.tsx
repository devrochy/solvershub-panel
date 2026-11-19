// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { NuevoAgente } from "@/app/(app)/agentes/nuevo/_components/nuevo-agente";
import { FeedbackProviders } from "@/components/ui/providers";
import type { AgentTemplate, Question } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

import { negocioDesdeIdentidad } from "@/lib/agentes-editor";
import { ajustes } from "@/lib/testing/fixtures";

import { TIPOS_DE_NEGOCIO } from "@/lib/onboarding";

import {
  cuerpoDeCreacion,
  elegirTipo,
  estadoRecomendado,
  nombreSugeridoDe,
  ocupadoDe,
  primerTipoLibre,
  respuestasPorDefecto,
  textoDeAvance,
  textoDeOcupado,
  tipoDeLaPlantilla,
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

describe("tipo ocupado y lo recomendado (HU-AOS-86)", () => {
  const AGENDA = plantilla("agenda", "Agenda", [LARGO]);
  const laura = { id: "v-1", key: "ventas", name: "Laura", status: "active", virtual: false };

  it("el tipo ocupado es el de la misma key, sin virtuales; manda el activo sobre el archivado", () => {
    expect(ocupadoDe("ventas", [laura])).toEqual({ id: "v-1", nombre: "Laura", archivado: false });
    expect(ocupadoDe("ventas", [{ ...laura, status: "archived" }])).toEqual({ id: "v-1", nombre: "Laura", archivado: true });
    expect(ocupadoDe("ventas", [{ ...laura, virtual: true }])).toBeNull();
    expect(ocupadoDe("agenda", [laura])).toBeNull();
    expect(
      ocupadoDe("ventas", [
        { ...laura, id: "v-0", status: "archived" },
        laura,
      ]),
    ).toEqual({ id: "v-1", nombre: "Laura", archivado: false });
  });

  it("el texto es el mismo del 409 `key_taken`, y el archivado dice que lo está", () => {
    expect(textoDeOcupado("Ventas", false)).toBe("Ya tienes un agente «Ventas»: edítalo en vez de crear otro.");
    expect(textoDeOcupado("Ventas", true)).toBe("Ya tienes un agente «Ventas», pero está archivado.");
  });

  it("lo recomendado es el primer tipo libre y disponible, con su guion y su nombre sugerido («Tomás» en Agenda)", () => {
    const NO_DISPONIBLE = plantilla("cobranza", "Cobranza", [], { available: false });
    expect(primerTipoLibre([VENTAS, NO_DISPONIBLE, AGENDA], [laura])?.key).toBe("agenda");
    expect(estadoRecomendado([VENTAS, NO_DISPONIBLE, AGENDA], [laura])).toEqual({
      plantilla: "agenda",
      respuestas: { largo_respuesta: "normal" },
      nombre: "Tomás",
    });
    expect(estadoRecomendado([VENTAS], [laura])).toEqual({ plantilla: null, respuestas: {}, nombre: "" });
  });

  it("el tipo de negocio y el nombre de una plantilla que no es de los 4 caen a su nombre", () => {
    expect(tipoDeLaPlantilla("agenda")).toBe("agenda");
    expect(tipoDeLaPlantilla("soporte")).toBeNull();
    expect(nombreSugeridoDe(plantilla("soporte", "Soporte", []))).toBe("Soporte");
    expect(nombreSugeridoDe(VENTAS)).toBe("Laura");
  });

  it("«Tomás» encabeza los nombres de Agenda en `lib/onboarding.ts`", () => {
    expect(TIPOS_DE_NEGOCIO.find((t) => t.id === "agenda")?.nombres[0]).toBe("Tomás");
  });
});

describe("Nuevo agente en pantalla (HU-AOS-86)", () => {
  const fetchMock = vi.fn();
  const negocio = negocioDesdeIdentidad("Panadería La Espiga", null);
  const AGENDA = plantilla("agenda", "Agenda", [LARGO], { description: "Agenda citas y entregas" });
  const laura = { id: "v-1", key: "ventas", name: "Laura", status: "active", virtual: false };
  beforeEach(() => {
    fetchMock.mockReset();
    push.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function abrir(agentes: { id: string; key: string; name: string; status: string; virtual: boolean }[] = [laura]) {
    return render(
      <FeedbackProviders>
        <NuevoAgente plantillas={[VENTAS, AGENDA, COBRANZA]} negocio={negocio} agentes={agentes} />
      </FeedbackProviders>,
    );
  }

  it("es la estación 1 de 5, con todo recomendado: Agenda, su guion y «Tomás» con ideas", async () => {
    const { container } = abrir();
    expect(screen.getAllByText("Paso 1 de 5 · Tipo").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 1, name: "¿Qué quieres que haga tu agente?" })).toBeTruthy();
    const ruta = screen.getByRole("navigation", { name: "Pasos para crear el agente" });
    for (const estacion of ["Tipo", "Habilidades", "Datos del cliente", "Datos para probar", "Revisar y publicar"]) {
      expect(ruta.textContent).toContain(estacion);
    }
    const agenda = screen.getByRole("radio", { name: /Agenda/ }) as HTMLInputElement;
    expect(agenda.checked).toBe(true);
    expect(agenda.closest("label")?.textContent).toContain("Recomendado");
    const normales = screen.getByRole("radio", { name: /Normales/ }) as HTMLInputElement;
    expect(normales.checked).toBe(true);
    expect(normales.closest("label")?.textContent).toContain("Recomendado");
    expect((screen.getByLabelText(/Nombre del agente/) as HTMLInputElement).value).toBe("Tomás");
    expect(screen.getByRole("radiogroup", { name: "Ideas de nombre" })).toBeTruthy();
    expect(screen.getByText("Todo viene con lo recomendado por SolversHub")).toBeTruthy();
    expect(screen.queryByText(/modelo/i)).toBeNull();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("Ventas ocupada por Laura: deshabilitada, con el texto y «Editar a Laura» hacia Personalizar", () => {
    abrir();
    const ventas = screen.getByRole("radio", { name: /Ventas/ }) as HTMLInputElement;
    expect(ventas.disabled).toBe(true);
    expect(document.getElementById(ventas.getAttribute("aria-describedby")?.split(" ")[0] ?? "")?.textContent).toBe(
      "Ya tienes un agente «Ventas»: edítalo en vez de crear otro.",
    );
    expect(screen.getByRole("link", { name: "Editar a Laura" }).getAttribute("href")).toBe("/agentes/v-1/personalizar");
  });

  it("ocupada por un archivado: lo dice y «Desarchívalo» lo reactiva y lleva a su ficha", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    abrir([{ ...laura, status: "archived" }]);
    expect(screen.getByText("Ya tienes un agente «Ventas», pero está archivado.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Desarchívalo" }));
    fireEvent.click(await screen.findByRole("button", { name: "Desarchivar" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/agentes/v-1"));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/agent-editor/v-1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ status: "active" });
  });

  it("si desarchivar falla, muestra el mensaje de la API y no navega", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "No se puede reactivar ahora." }), { status: 409 }));
    abrir([{ ...laura, status: "archived" }]);
    fireEvent.click(screen.getByRole("button", { name: "Desarchívalo" }));
    fireEvent.click(await screen.findByRole("button", { name: "Desarchivar" }));
    expect(await screen.findByText("No se puede reactivar ahora.")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it("crea el borrador con lo recomendado y sigue en Habilidades (estación 2)", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url === "/api/agent-editor/from-script"
        ? new Response(JSON.stringify({ agentId: "a-1" }), { status: 201 })
        : new Response(JSON.stringify({}), { status: 200 }),
    );
    abrir();
    fireEvent.click(screen.getByRole("button", { name: /Crear a Tomás y seguir/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/agentes/a-1/personalizar?paso=habilidades&modo=crear"));
    const [, crear] = fetchMock.mock.calls[0];
    expect(JSON.parse(crear.body)).toEqual({ template_key: "agenda", answers: { largo_respuesta: "normal" }, name: "Tomás" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("cambiar de tipo trae su nombre sugerido si no se tocó, y «Usar lo recomendado» vuelve a todo", () => {
    abrir([]);
    // Sin agentes, lo recomendado es el primero: Ventas con «Laura».
    expect((screen.getByLabelText(/Nombre del agente/) as HTMLInputElement).value).toBe("Laura");
    fireEvent.click(screen.getByRole("radio", { name: /Agenda/ }));
    expect((screen.getByLabelText(/Nombre del agente/) as HTMLInputElement).value).toBe("Tomás");
    fireEvent.click(screen.getByRole("radio", { name: /Cortas/ }));
    expect(screen.getByText(/2 cambios/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Usar lo recomendado/ }));
    expect((screen.getByRole("radio", { name: /Ventas/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText(/Nombre del agente/) as HTMLInputElement).value).toBe("Laura");
  });

  it("sin nombre no crea", () => {
    abrir();
    fireEvent.change(screen.getByLabelText(/Nombre del agente/), { target: { value: " " } });
    fireEvent.click(screen.getByRole("button", { name: /Crear y seguir/ }));
    expect(screen.getAllByText("Ponle un nombre para seguir").length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("red de seguridad: el 409 `key_taken` de una carrera muestra el mismo texto, ofrece editar y no sigue", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: "Ya tienes un agente «Agenda»: edítalo en vez de crear otro.", code: "key_taken", fields: { agent_id: "a-9" } }),
        { status: 409 },
      ),
    );
    abrir();
    fireEvent.click(screen.getByRole("button", { name: /Crear a Tomás y seguir/ }));
    expect((await screen.findAllByText(/Ya tienes un agente «Agenda»: edítalo en vez de crear otro\./)).length).toBeGreaterThan(0);
    // a-9 no está en la lista que cargó la página: el enlace usa el nombre del tipo.
    expect(screen.getByRole("link", { name: "Editar a Agenda" }).getAttribute("href")).toBe("/agentes/a-9/personalizar");
    expect(push).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
