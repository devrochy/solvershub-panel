import { describe, expect, it } from "vitest";

import {
  accionesDesdeContenido,
  aplicarAcciones,
  erroresPorAccion,
  erroresSueltosDeAcciones,
  resumenDeAccion,
} from "@/lib/acciones-del-agente";
import { contenidoDesdeEstado, estadoDesdeBorrador } from "@/lib/agentes-editor";

const TOOLS = [
  { tool: "crear_pedido" },
  { tool: "cancel_calendar_event", enabled: false, scopes: ["agenda"] },
  { tool: "buscar_conocimiento", enabled: true },
  { tool: "cob_registrar_abono", maxCallsPerConversation: 3, requiresConfirmation: true },
];
const BASE = {
  contract: "agentspec/3",
  model: { primary: "deepseek-chat" },
  tools: TOOLS,
  playbooks: [{ name: "conocimiento", version: "^1.0" }],
  knowledge: { topK: 4 },
};

describe("acciones del agente", () => {
  it("lee encendido, tope y confirmación de cada binding, sin la de conocimiento", () => {
    expect(accionesDesdeContenido(BASE)).toEqual({
      crear_pedido: { activo: true, tope: null, confirmar: false },
      cancel_calendar_event: { activo: false, tope: null, confirmar: false },
      cob_registrar_abono: { activo: true, tope: 3, confirmar: true },
    });
  });

  it("sin cambios, `tools` sale idéntico (mismo orden y sin claves nuevas)", () => {
    expect(aplicarAcciones(TOOLS, accionesDesdeContenido(BASE))).toEqual(TOOLS);
    const estado = estadoDesdeBorrador({ name: "Ventas", description: "" }, BASE, []);
    expect(contenidoDesdeEstado(BASE, estado, []).tools).toEqual(TOOLS.filter((t) => t.tool !== "buscar_conocimiento").concat([TOOLS[2]]));
  });

  it("aplica los cambios y conserva lo demás del binding", () => {
    const acciones = accionesDesdeContenido(BASE);
    const nuevo = aplicarAcciones(TOOLS, {
      ...acciones,
      crear_pedido: { activo: false, tope: 2, confirmar: true },
      cancel_calendar_event: { activo: true, tope: null, confirmar: false },
      cob_registrar_abono: { activo: true, tope: null, confirmar: false },
    });
    expect(nuevo).toEqual([
      { tool: "crear_pedido", enabled: false, maxCallsPerConversation: 2, requiresConfirmation: true },
      { tool: "cancel_calendar_event", enabled: true, scopes: ["agenda"] },
      { tool: "buscar_conocimiento", enabled: true },
      { tool: "cob_registrar_abono" },
    ]);
  });

  it("acota el tope entre 1 y 10.000", () => {
    const acciones = { crear_pedido: { activo: true, tope: 50_000, confirmar: false } };
    expect(aplicarAcciones([{ tool: "crear_pedido" }], acciones)).toEqual([{ tool: "crear_pedido", maxCallsPerConversation: 10_000 }]);
  });

  it("una acción quitada sale del contenido", () => {
    const acciones = { ...accionesDesdeContenido(BASE), crear_pedido: { activo: true, tope: null, confirmar: false, quitada: true } };
    expect(aplicarAcciones(TOOLS, acciones).map((t) => (t as { tool: string }).tool)).toEqual([
      "cancel_calendar_event",
      "buscar_conocimiento",
      "cob_registrar_abono",
    ]);
  });

  it("la de conocimiento la manda el paso Memoria: apagarlo allí la quita aunque Acciones no la toque", () => {
    const estado = estadoDesdeBorrador({ name: "Ventas", description: "" }, BASE, []);
    const sin = contenidoDesdeEstado(BASE, { ...estado, conocimiento: { ...estado.conocimiento, activo: false } }, []);
    expect((sin.tools as { tool: string }[]).map((t) => t.tool)).toEqual(["crear_pedido", "cancel_calendar_event", "cob_registrar_abono"]);
    // Y un cambio en Acciones llega junto con la sección de conocimiento.
    const con = contenidoDesdeEstado(
      BASE,
      { ...estado, acciones: { ...estado.acciones, crear_pedido: { activo: false, tope: null, confirmar: false } } },
      [],
    );
    expect(con.tools).toEqual([
      { tool: "crear_pedido", enabled: false },
      TOOLS[1],
      TOOLS[3],
      { tool: "buscar_conocimiento", enabled: true },
    ]);
  });

  it("un borrador sin `tools` no gana la clave por guardar", () => {
    const sinTools = { contract: "agentspec/3", model: { primary: "x" } };
    const estado = estadoDesdeBorrador({ name: "A", description: "" }, sinTools, []);
    expect(estado.acciones).toEqual({});
    // aplicarConocimiento deja `tools: []` cuando no hay búsqueda: lo que importa es que no aparezca ninguna acción.
    expect(contenidoDesdeEstado(sinTools, estado, []).tools ?? []).toEqual([]);
  });

  it("traduce los errores `tools[i]` al nombre de la acción", () => {
    expect(
      erroresPorAccion({ "tools[1].tool": "Ya no existe.", "tools[1].maxCallsPerConversation": "Muy alto.", "tools[9].tool": "x", name: "y" }, BASE),
    ).toEqual({ cancel_calendar_event: "Ya no existe. Muy alto." });
  });

  it("resume cada acción en palabras", () => {
    expect(resumenDeAccion({ activo: false, tope: 2, confirmar: true })).toBe("Apagada");
    expect(resumenDeAccion({ activo: true, tope: null, confirmar: false })).toBe("Sin tope");
    expect(resumenDeAccion({ activo: true, tope: 1, confirmar: true })).toBe("Hasta 1 vez por conversación · Pide confirmación");
    expect(resumenDeAccion({ activo: true, tope: 4, confirmar: false })).toBe("Hasta 4 veces por conversación");
  });
});

describe("errores sueltos de acciones", () => {
  it("lista los de `tools` que no caen en una acción del contenido", () => {
    expect(
      erroresSueltosDeAcciones({ tools: "Repetida.", "tools[0].tool": "De una.", "tools[9].tool": "Perdida.", name: "x" }, BASE),
    ).toEqual(["Repetida.", "Perdida."]);
  });
});
