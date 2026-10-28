// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { ChatPrueba } from "@/app/(app)/asistente/_components/chat-prueba";

// «Probar plantilla con opciones» en el chat del playground (SPEC-40, pista B2): selector de plantillas
// publicadas, botones tocables, resultado del toque y errores del backend a la vista.

const fetchMock = vi.fn();

const PLANTILLAS = [
  { clave: "ver_mis_citas", nombre: "Ver mis citas", estado: "published", version_vigente: 2, tiene_borrador_sin_publicar: false, creada_en: "x", actualizada_en: "x" },
  { clave: "borrador_nuevo", nombre: "Borrador nuevo", estado: "draft", version_vigente: null, tiene_borrador_sin_publicar: true, creada_en: "x", actualizada_en: "x" },
  { clave: "vieja", nombre: "Retirada", estado: "retired", version_vigente: 1, tiene_borrador_sin_publicar: false, creada_en: "x", actualizada_en: "x" },
];

const MENSAJE_BOTONES = {
  id: "m1",
  direction: "outbound",
  content: "¿Qué quieres hacer?",
  interactive: { type: "button", body: "¿Qué quieres hacer?", buttons: [{ id: "opt:s1.o1", title: "Ver mis citas" }, { id: "opt:s1.o2", title: "Cancelar" }] },
  created_at: "2026-10-28T00:00:00Z",
};

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const error = (status: number, code: string, message = "Mensaje de la API.") => json({ error: message, code }, status);

/** Respuestas por ruta; cada prueba sobreescribe las de `/options` y `/tap`. */
function rutas(extra: { options?: () => Response; tap?: () => Response } = {}) {
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url.startsWith("/api/plantillas-opciones")) return json({ plantillas: PLANTILLAS });
    if (url === "/api/playground/options") return extra.options?.() ?? json({ enviado: true, ya_enviado: false, via: "interactivo", ejecucion_directa: true, degradado: false, send_id: "s1", mensajes: [MENSAJE_BOTONES] });
    if (url === "/api/playground/tap") return extra.tap?.() ?? json({ outcome: "ok", mensajes: [{ id: "m2", direction: "outbound", content: "Tienes 2 citas.", interactive: null, created_at: "x" }] });
    if (url.startsWith("/api/playground")) return json({ turns: [] });
    throw new Error(`fetch inesperado: ${url} ${init?.method ?? "GET"}`);
  });
}

const llamadasA = (ruta: string) => fetchMock.mock.calls.filter(([u]) => u === ruta) as [string, RequestInit][];

async function enviarPlantilla() {
  const selector = await screen.findByLabelText("Plantilla");
  await waitFor(() => expect(within(selector).getByRole("option", { name: "Ver mis citas" })).toBeTruthy());
  fireEvent.change(selector, { target: { value: "ver_mis_citas" } });
  fireEvent.click(screen.getByRole("button", { name: /Enviar al chat/ }));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Probar plantilla con opciones", () => {
  it("sin la opción no hay selector (otros usos del chat no cambian)", async () => {
    rutas();
    render(<ChatPrueba />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByText("Probar plantilla con opciones")).toBeNull();
    expect(llamadasA("/api/plantillas-opciones")).toHaveLength(0);
  });

  it("lista solo las plantillas publicadas y siempre avisa que la acción se ejecuta de verdad", async () => {
    rutas();
    render(<ChatPrueba probarOpciones={{}} />);
    const selector = await screen.findByLabelText("Plantilla");
    await waitFor(() => expect(within(selector).getByRole("option", { name: "Ver mis citas" })).toBeTruthy());
    expect(within(selector).queryByRole("option", { name: "Borrador nuevo" })).toBeNull();
    expect(within(selector).queryByRole("option", { name: "Retirada" })).toBeNull();
    expect(screen.getByRole("note").textContent).toMatch(/se ejecuta de verdad/);
    expect((screen.getByRole("button", { name: /Enviar al chat/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("la plantilla que viene del editor queda elegida, sin enviarse sola", async () => {
    rutas();
    render(<ChatPrueba probarOpciones={{ plantillaInicial: "ver_mis_citas" }} />);
    const selector = (await screen.findByLabelText("Plantilla")) as HTMLSelectElement;
    await waitFor(() => expect(selector.value).toBe("ver_mis_citas"));
    expect(llamadasA("/api/playground/options")).toHaveLength(0);
  });

  it("envía la plantilla, pinta los botones, y al tocar uno llama al tap y muestra la respuesta fija", async () => {
    rutas();
    render(<ChatPrueba probarOpciones={{}} conexionId="0b6f6d3e-6a43-4c39-9a52-4b6c1c1e2f10" />);
    await enviarPlantilla();

    const boton = await screen.findByRole("button", { name: "Ver mis citas" });
    expect(screen.getByText("¿Qué quieres hacer?")).toBeTruthy();
    expect(JSON.parse(String(llamadasA("/api/playground/options")[0][1].body))).toEqual({
      clave: "ver_mis_citas",
      connection_id: "0b6f6d3e-6a43-4c39-9a52-4b6c1c1e2f10",
    });

    fireEvent.click(boton);
    expect(await screen.findByText("Tienes 2 citas.")).toBeTruthy();
    expect(JSON.parse(String(llamadasA("/api/playground/tap")[0][1].body))).toEqual({
      payload: "opt:s1.o1",
      connection_id: "0b6f6d3e-6a43-4c39-9a52-4b6c1c1e2f10",
    });
    // El toque queda como lo que dijo el cliente, y el botón usado no se puede volver a tocar.
    const usado = screen.getByRole("button", { name: "Ver mis citas ✓" }) as HTMLButtonElement;
    expect(usado.disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Cancelar" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("una lista de 4 a 10 opciones se pinta con todas las opciones tocables", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ id: `opt:s1.o${i}`, title: `Opción ${i + 1}` }));
    rutas({
      options: () =>
        json({
          enviado: true, ya_enviado: false, via: "interactivo", ejecucion_directa: true, degradado: false, send_id: "s1",
          mensajes: [{ ...MENSAJE_BOTONES, interactive: { type: "list", body: "Elige", button: "Ver opciones", rows } }],
        }),
    });
    render(<ChatPrueba probarOpciones={{}} />);
    await enviarPlantilla();
    const grupo = await screen.findByRole("group", { name: "Ver opciones" });
    expect(within(grupo).getAllByRole("button")).toHaveLength(5);
  });

  it("con la bandera apagada el tap muestra el error del backend, no falla en silencio, y el botón sigue disponible", async () => {
    rutas({ tap: () => error(404, "opciones_directas_no_habilitadas") });
    render(<ChatPrueba probarOpciones={{}} />);
    await enviarPlantilla();
    fireEvent.click(await screen.findByRole("button", { name: "Ver mis citas" }));
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toMatch(/no están activadas en este negocio/);
    expect(alerta.textContent).toMatch(/master/);
    // El toque no se ejecutó: el botón sigue disponible y el chat no queda con un "Ver mis citas" dicho por el cliente.
    expect(screen.getAllByText("Ver mis citas", { ignore: "option" }).map((n) => n.tagName)).toEqual(["BUTTON"]);
    expect((screen.getByRole("button", { name: "Ver mis citas" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("con la bandera apagada, al listar o enviar también se explica", async () => {
    rutas({ options: () => error(404, "opciones_directas_no_habilitadas") });
    render(<ChatPrueba probarOpciones={{}} />);
    await enviarPlantilla();
    expect((await screen.findByRole("alert")).textContent).toMatch(/no están activadas/);
  });

  it("un toque descartado o repetido se explica aunque no traiga mensajes", async () => {
    rutas({ tap: () => json({ outcome: "duplicate", mensajes: [] }) });
    render(<ChatPrueba probarOpciones={{}} />);
    await enviarPlantilla();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar" }));
    expect((await screen.findByRole("status", {}, { timeout: 2000 })).textContent).toMatch(/ya se usó/);
  });

  it("un fallo de la tool (tool_error) se avisa como error y se ve la respuesta de error de la plantilla", async () => {
    rutas({ tap: () => json({ outcome: "tool_error", mensajes: [{ id: "m3", direction: "outbound", content: "No pudimos consultar tus citas.", interactive: null, created_at: "x" }] }) });
    render(<ChatPrueba probarOpciones={{}} />);
    await enviarPlantilla();
    fireEvent.click(await screen.findByRole("button", { name: "Ver mis citas" }));
    expect(await screen.findByText("No pudimos consultar tus citas.")).toBeTruthy();
    expect((await screen.findByRole("alert")).textContent).toMatch(/falló al ejecutarse/);
  });

  it("si la plantilla salió como texto (sin botones) lo avisa", async () => {
    rutas({
      options: () =>
        json({
          enviado: true, ya_enviado: false, via: "texto", ejecucion_directa: false, degradado: true, send_id: "s1",
          mensajes: [{ id: "m1", direction: "outbound", content: "¿Qué quieres?\n1. Ver\n2. Cancelar", interactive: null, created_at: "x" }],
        }),
    });
    render(<ChatPrueba probarOpciones={{}} />);
    await enviarPlantilla();
    expect(await screen.findByText(/1\. Ver/)).toBeTruthy();
    expect((await screen.findByRole("alert")).textContent).toMatch(/sin botones/);
  });

  it("reiniciar la prueba limpia el chat y los avisos", async () => {
    rutas({ tap: () => json({ outcome: "expired", mensajes: [] }) });
    render(<ChatPrueba probarOpciones={{}} />);
    await enviarPlantilla();
    fireEvent.click(await screen.findByRole("button", { name: "Ver mis citas" }));
    await screen.findByRole("alert");
    fetchMock.mockImplementationOnce(async () => json({ ok: true }));
    fireEvent.click(screen.getByRole("button", { name: "Reiniciar prueba" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.queryByRole("button", { name: /Ver mis citas/ })).toBeNull();
  });
});
