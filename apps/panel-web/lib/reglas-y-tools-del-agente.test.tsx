// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ReglasDelAgenteEditable } from "@/components/domain/agentes/reglas-del-agente";
import { ToolsHttpDelAgenteEditable } from "@/components/domain/agentes/tools-http-del-agente";
import { FeedbackProviders } from "@/components/ui/providers";
import {
  erroresPorFila,
  problemaDeRegla,
  reglaDesdeApi,
  reglaParaApi,
  reglaVacia,
  toolDesdeApi,
  toolsParaApi,
  toolVacia,
  type ReglasDelAgente,
  type ToolsHttpDelAgente,
} from "@/lib/reglas-y-tools-del-agente";
import { violacionesGraves } from "@/lib/testing/axe";

// HU-AOS-97: «Reglas» y «Tools HTTP» del editor del agente (D-78 decisión 4).

const DOMINIO = "api.transportadora.co";
const TOOL = {
  name: "consultar_envio",
  description: "Estado de una guía",
  method: "GET" as const,
  url: `https://${DOMINIO}/v1/guias/{guia}`,
  allowedDomains: [DOMINIO],
  headers: { Authorization: { secret: "token_envios" }, "X-Cliente": "demo" },
  parameters: { type: "object", properties: { guia: { type: "string" } } },
  body: {},
};
const REGLA = { name: "sin_descuentos", kind: "forbidden_phrase" as const, action: "escalate" as const, phrases: ["descuento"], tool: null, value: null };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("reglas: forma y validación", () => {
  it("solo viajan los campos de su tipo", () => {
    expect(reglaParaApi({ ...reglaVacia("max_length"), name: "corto", value: "300", phrases: ["x"] })).toEqual({
      name: "corto",
      kind: "max_length",
      action: "retry",
      value: 300,
    });
    expect(reglaParaApi(reglaDesdeApi(REGLA))).toEqual({ name: "sin_descuentos", kind: "forbidden_phrase", action: "escalate", phrases: ["descuento"] });
  });

  it("avisa lo que falta antes de llamar a la API", () => {
    expect(problemaDeRegla(reglaVacia())).toMatch(/nombre/);
    expect(problemaDeRegla({ ...reglaVacia(), name: "x" })).toMatch(/frase/);
    expect(problemaDeRegla({ ...reglaVacia("required_tool"), name: "x", phrases: ["envío"] })).toMatch(/acción/);
    expect(problemaDeRegla({ ...reglaVacia("max_length"), name: "x", value: "0" })).toMatch(/largo/);
    expect(problemaDeRegla(reglaDesdeApi(REGLA))).toBeNull();
  });

  it("agrupa los errores de la API por fila", () => {
    const filas = erroresPorFila({ "guardrails[1].tool": "No existe.", "guardrails[1].phrases": "Falta.", otro: "x" }, "guardrails");
    expect([...filas.entries()]).toEqual([[1, ["No existe.", "Falta."]]]);
  });
});

describe("tools HTTP: forma", () => {
  it("ida y vuelta: el secreto queda por referencia y el valor nuevo va aparte", () => {
    const forma = toolDesdeApi(TOOL);
    expect(forma.headers.map((h) => [h.nombre, h.tipo])).toEqual([
      ["Authorization", "secreto"],
      ["X-Cliente", "texto"],
    ]);
    forma.headers[0].valorSecreto = "Bearer abc";
    const { tools, secrets } = toolsParaApi([forma]);
    expect(tools[0]).toEqual({ ...TOOL, body: {} });
    expect(secrets).toEqual({ token_envios: "Bearer abc" });
  });

  it("sin valor nuevo no manda el secreto (usa el guardado)", () => {
    expect(toolsParaApi([toolDesdeApi(TOOL)]).secrets).toEqual({});
  });

  it("dominios separados por comas o espacios", () => {
    const { tools } = toolsParaApi([{ ...toolVacia(), name: "x", dominios: "a.co, b.co  c.co" }]);
    expect(tools[0].allowedDomains).toEqual(["a.co", "b.co", "c.co"]);
  });

  it("un JSON roto o dos valores para el mismo secreto no se mandan", () => {
    expect(() => toolsParaApi([{ ...toolVacia(), parameters: "{" }])).toThrow(/JSON/);
    const a = toolDesdeApi(TOOL);
    a.headers[0].valorSecreto = "uno";
    const b = toolDesdeApi({ ...TOOL, name: "otra" });
    b.headers[0].valorSecreto = "dos";
    expect(() => toolsParaApi([a, b])).toThrow(/dos valores/);
  });
});

const REGLAS: ReglasDelAgente = { guardrails: [], lock_version: 3 };

describe("sección Reglas", () => {
  it("agrega una frase prohibida, guarda con el lock_version y avisa el nuevo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ guardrails: [REGLA], lock_version: 4 }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onGuardado = vi.fn();
    const { container } = render(
      <FeedbackProviders>
        <ReglasDelAgenteEditable agenteId="a-1" inicial={REGLAS} lockVersion={3} onGuardado={onGuardado} puedeEditar />
      </FeedbackProviders>,
    );
    expect(await violacionesGraves(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: /Agregar regla/ }));
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "sin_descuentos" } });
    const frase = screen.getByPlaceholderText("Escribe una frase y pulsa Enter");
    fireEvent.change(frase, { target: { value: "descuento" } });
    fireEvent.keyDown(frase, { key: "Enter" });
    fireEvent.change(screen.getByLabelText("Si no se cumple"), { target: { value: "escalate" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar reglas" }));
    await waitFor(() => expect(onGuardado).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/agent-editor/a-1/guardrails");
    expect(JSON.parse(init.body as string)).toEqual({
      guardrails: [{ name: "sin_descuentos", kind: "forbidden_phrase", action: "escalate", phrases: ["descuento"] }],
      lock_version: 3,
    });
    expect(onGuardado.mock.calls[0][0]).toBe(4);
  });

  it("muestra el error por campo de la API en su regla", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Revisa las reglas.", fields: { "guardrails[0].tool": "La acción no existe." } }), {
          status: 422,
        }),
      ),
    );
    render(
      <FeedbackProviders>
        <ReglasDelAgenteEditable
          agenteId="a-1"
          inicial={{ guardrails: [{ ...REGLA, kind: "required_tool", tool: "no_existe" }], lock_version: 3 }}
          lockVersion={3}
          onGuardado={vi.fn()}
          puedeEditar
        />
      </FeedbackProviders>,
    );
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "otra" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar reglas" }));
    expect(await screen.findByText("La acción no existe.")).toBeTruthy();
  });
});

const TOOLS: ToolsHttpDelAgente = {
  tools: [TOOL, { ...TOOL, name: "por_url", url: `https://${DOMINIO}/v1?token={secret:token_envios}`, headers: {} }],
  secrets: [{ name: "token_envios", domains: [DOMINIO] }],
  omitted: ["por_url"],
  lock_version: 5,
};

describe("sección Tools HTTP", () => {
  it("avisa la tool que el agente no ofrecerá y lista los secretos sin valores", async () => {
    const { container } = render(
      <FeedbackProviders>
        <ToolsHttpDelAgenteEditable agenteId="a-1" inicial={TOOLS} lockVersion={5} onGuardado={vi.fn()} puedeEditar />
      </FeedbackProviders>,
    );
    expect(screen.getAllByText(/el agente no la ofrecerá/)).toHaveLength(1);
    expect(screen.getByText(/token_envios \(api\.transportadora\.co\)/)).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("un header Authorization pasa a secreto y su valor viaja solo en `secrets`", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ tools: [TOOL], secrets: TOOLS.secrets, omitted: [], lock_version: 6 }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onGuardado = vi.fn();
    render(
      <FeedbackProviders>
        <ToolsHttpDelAgenteEditable
          agenteId="a-1"
          inicial={{ tools: [], secrets: [], omitted: [], lock_version: 5 }}
          lockVersion={5}
          onGuardado={onGuardado}
          puedeEditar
        />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Agregar tool/ }));
    fireEvent.change(screen.getAllByLabelText("Nombre")[0], { target: { value: "consultar_envio" } });
    fireEvent.change(screen.getByLabelText("URL"), { target: { value: `https://${DOMINIO}/v1/guias/{guia}` } });
    fireEvent.change(screen.getByLabelText("Dominios permitidos"), { target: { value: DOMINIO } });
    fireEvent.click(screen.getByRole("button", { name: /Agregar header/ }));
    fireEvent.change(screen.getAllByLabelText("Nombre")[1], { target: { value: "Authorization" } });
    expect((screen.getByLabelText("Va como") as HTMLSelectElement).value).toBe("secreto");
    fireEvent.change(screen.getByLabelText("Valor nuevo"), { target: { value: "Bearer abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar tools" }));
    await waitFor(() => expect(onGuardado).toHaveBeenCalled());
    const cuerpo = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(cuerpo.tools[0].headers).toEqual({ Authorization: { secret: "consultar_envio_token" } });
    expect(cuerpo.secrets).toEqual({ consultar_envio_token: "Bearer abc" });
    expect(cuerpo.lock_version).toBe(5);
    expect(onGuardado.mock.calls[0][0]).toBe(6);
  });
});
