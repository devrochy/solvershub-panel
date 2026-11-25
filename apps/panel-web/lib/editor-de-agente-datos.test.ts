import { beforeEach, describe, expect, it, vi } from "vitest";

import { cargarEditorDeAgente } from "@/lib/editor-de-agente-datos";

const pedidas: string[] = [];
let agente: { ok: boolean; status: number; data?: unknown; error?: string } = { ok: false, status: 404 };

vi.mock("@/lib/api/server", () => ({
  apiFetch: vi.fn(async (ruta: string) => {
    pedidas.push(ruta);
    return ruta === "/admin/agents/c1" ? agente : { ok: false, status: 404, error: "no existe" };
  }),
}));

beforeEach(() => {
  pedidas.length = 0;
});

describe("cargarEditorDeAgente", () => {
  it("con el Coordinador pide solo el agente y abre sus opciones (HU-AOS-98)", async () => {
    agente = { ok: true, status: 200, data: { kind: "core", name: "Coordinador" } };
    expect(await cargarEditorDeAgente("c1")).toEqual({ estado: "no_especialista", nombre: "Coordinador", coordinador: true });
    expect(pedidas).toEqual(["/admin/agents/c1"]);
  });

  it("un agente que no existe es no_existe", async () => {
    agente = { ok: false, status: 404, error: "x" };
    expect(await cargarEditorDeAgente("c1")).toEqual({ estado: "no_existe" });
  });

  it("un fallo del servidor al leer el agente es error con su detalle", async () => {
    agente = { ok: false, status: 500, error: "boom" };
    expect(await cargarEditorDeAgente("c1")).toEqual({ estado: "error", detalle: "boom" });
  });
});
