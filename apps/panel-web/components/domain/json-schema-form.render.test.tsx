// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { getToasts, resetToasts as limpiarToasts } from "@/lib/toast-store";
import { violacionesGraves } from "@/lib/testing/axe";

import { JsonSchemaForm } from "./json-schema-form";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const SCHEMA = {
  type: "object",
  required: ["nombre"],
  properties: {
    nombre: { type: "string", title: "Nombre del negocio" },
    max_cuotas: { type: "integer", title: "Cuotas máximas", minimum: 1 },
    activo: { type: "boolean", title: "Activo" },
    canal: { type: "string", title: "Canal", enum: ["whatsapp", "web"], "x-enum-labels": ["WhatsApp", "Chat web"] },
    extra: { type: "object", title: "Datos extra" },
  },
};

function renderFormulario(onSaved = vi.fn()) {
  render(
    <JsonSchemaForm
      resourcePath="/api/prueba"
      schema={SCHEMA}
      initialValues={{ nombre: "Tienda de prueba", max_cuotas: 3, activo: true, canal: "web" }}
      configuredSecrets={[]}
      onSaved={onSaved}
    />,
  );
  return onSaved;
}

const respuesta = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

beforeEach(() => {
  refresh.mockClear();
  limpiarToasts();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("JsonSchemaForm (HU-UI-04)", () => {
  it("dibuja un control etiquetado por cada tipo del schema", () => {
    renderFormulario();
    expect((screen.getByLabelText(/Nombre del negocio/) as HTMLInputElement).value).toBe("Tienda de prueba");
    expect((screen.getByLabelText(/Cuotas máximas/) as HTMLInputElement).type).toBe("number");
    expect((screen.getByLabelText(/Activo/) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByLabelText(/Canal/).tagName).toBe("SELECT");
    expect(screen.getByLabelText(/Datos extra/).tagName).toBe("TEXTAREA");
  });

  it("un JSON inválido se marca en su campo y no se envía", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderFormulario();

    fireEvent.change(screen.getByLabelText(/Datos extra/), { target: { value: "{ no es json" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("El JSON no es válido.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("muestra los errores por campo y el mensaje del backend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => respuesta(422, { error: { message: "Revisa los campos marcados.", fields: { nombre: "Ya existe." } } })),
    );
    const onSaved = renderFormulario();

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Ya existe.")).toBeTruthy();
    expect(screen.getByText("Revisa los campos marcados.")).toBeTruthy();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("al guardar bien confirma, refresca y avisa a quien lo usa", async () => {
    const fetchMock = vi.fn(() => respuesta(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const onSaved = renderFormulario();

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("Configuración guardada.")).toBeTruthy();
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(refresh).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).values.nombre).toBe("Tienda de prueba");
  });

  it("valida en español sin la burbuja nativa del navegador (HU-UX-13)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(
      <JsonSchemaForm
        resourcePath="/api/prueba"
        schema={{
          type: "object",
          required: ["nombre"],
          properties: {
            nombre: { type: "string", title: "Nombre del negocio" },
            dias_tolerancia: { type: "integer", title: "Días de tolerancia de cobro", minimum: 0, maximum: 30 },
          },
        }}
        initialValues={{ nombre: "", dias_tolerancia: -1 }}
        configuredSecrets={[]}
      />,
    );

    // Sin `noValidate` el navegador frena el envío con su burbuja (en inglés) y el panel nunca valida.
    expect(container.querySelector("form")?.noValidate).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("«Nombre del negocio» es obligatorio.")).toBeTruthy();
    expect(screen.getByText("«Días de tolerancia de cobro» debe estar entre 0 y 30.")).toBeTruthy();
    // Aviso rojo del kit (con ícono y botón de cierre), no solo el texto junto al campo.
    expect(getToasts().some((t) => t.kind === "error" && /Revisa los campos marcados/.test(t.message))).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("un select obligatorio sin valor muestra «Elige una opción» y avisa si no se elige", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(
      <JsonSchemaForm
        resourcePath="/api/prueba"
        schema={{
          type: "object",
          required: ["canal"],
          properties: { canal: { type: "string", title: "Canal", enum: ["whatsapp", "web"] } },
        }}
        initialValues={{}}
        configuredSecrets={[]}
      />,
    );

    expect((screen.getByLabelText(/Canal/) as HTMLSelectElement).selectedOptions[0].textContent).toBe("Elige una opción");
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("«Canal» es obligatorio.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("no tiene violaciones graves de accesibilidad", async () => {
    renderFormulario();
    expect(await violacionesGraves(document.body)).toEqual([]);
  });
});
