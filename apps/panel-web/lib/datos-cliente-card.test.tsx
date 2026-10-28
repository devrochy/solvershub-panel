// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { DatosClienteCard } from "@/app/(app)/configuracion/_components/datos-cliente-card";
import { FeedbackProviders } from "@/components/ui/providers";
import { politicaDatosCliente } from "@/lib/testing/fixtures";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh, prefetch: vi.fn(), back: vi.fn() }),
}));

const fetchMock = vi.fn();

function montar(props: Partial<Parameters<typeof DatosClienteCard>[0]> = {}) {
  return render(
    <FeedbackProviders>
      <DatosClienteCard politica={politicaDatosCliente} puedeEditar {...props} />
    </FeedbackProviders>,
  );
}

const grupo = (nombre: string) => screen.getByRole("radiogroup", { name: nombre });

beforeEach(() => {
  fetchMock.mockReset();
  refresh.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DatosClienteCard", () => {
  it("agrupa por módulo y muestra el nivel actual de cada dato", () => {
    montar();
    expect(screen.getByRole("heading", { name: "¿Qué datos pide tu asistente al cliente?" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ventas" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Agenda" })).toBeTruthy();
    expect(within(grupo("Dirección de entrega (Crear un pedido)")).getByRole("radio", { name: "Recomendado" })).toHaveProperty("checked", true);
    // Distinto del valor por defecto: se avisa cuál es.
    expect(screen.getByText("Por defecto: Requerido.")).toBeTruthy();
  });

  it("bloquea el dato que exige el sistema y lo explica", () => {
    montar();
    for (const radio of within(grupo("Correo electrónico (Agendar una cita)")).getAllByRole("radio")) {
      expect(radio).toHaveProperty("disabled", true);
    }
    expect(screen.getByText(/Lo exige el sistema/)).toBeTruthy();
  });

  it("al cambiar un nivel habilita Guardar y manda el estado completo", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(politicaDatosCliente), { status: 200 }));
    montar();
    const guardar = screen.getByRole("button", { name: "Guardar datos del cliente" });
    expect(guardar).toHaveProperty("disabled", true);

    fireEvent.click(within(grupo("Nombre (Crear un pedido)")).getByRole("radio", { name: "No pedir" }));
    expect(screen.getByText("Tienes cambios sin guardar.")).toBeTruthy();
    fireEvent.click(guardar);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/datos-cliente/politica");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body as string)).toEqual({
      politica: {
        "ventas.crear_pedido": { nombre: "no_pedir", direccion: "recomendado" },
        "agenda.agendar_cita": {},
      },
    });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("Restablecer deja la acción en sus valores por defecto", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(politicaDatosCliente), { status: 200 }));
    montar();
    const restablecer = screen.getByRole("button", { name: "Restablecer Crear un pedido" });
    expect(screen.getByRole("button", { name: "Restablecer Agendar una cita" })).toHaveProperty("disabled", true);

    fireEvent.click(restablecer);
    expect(within(grupo("Dirección de entrega (Crear un pedido)")).getByRole("radio", { name: "Requerido" })).toHaveProperty("checked", true);
    expect(screen.queryByText("Por defecto: Requerido.")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Guardar datos del cliente" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string).politica["ventas.crear_pedido"]).toEqual({});
  });

  it("si guardar falla, avisa y conserva lo elegido", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "Ese dato no se puede ajustar." }), { status: 422 }));
    montar();
    fireEvent.click(within(grupo("Nombre (Crear un pedido)")).getByRole("radio", { name: "Recomendado" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar datos del cliente" }));
    expect(await screen.findByText("Ese dato no se puede ajustar.")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
    expect(within(grupo("Nombre (Crear un pedido)")).getByRole("radio", { name: "Recomendado" })).toHaveProperty("checked", true);
  });

  it("sin permiso de escritura se ve en solo lectura, sin botones", () => {
    montar({ puedeEditar: false });
    expect(screen.getByText(/Solo puedes ver esta configuración/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Guardar/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Restablecer/ })).toBeNull();
    expect(within(grupo("Nombre (Crear un pedido)")).getAllByRole("radio")[0]).toHaveProperty("disabled", true);
  });

  it("sin acciones muestra el estado vacío", () => {
    montar({ politica: { niveles: politicaDatosCliente.niveles, acciones: [] } });
    expect(screen.getByText("Tu negocio aún no tiene agentes que pidan datos")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Guardar/ })).toBeNull();
  });

  it("si no se pudo cargar, muestra el error", () => {
    montar({ politica: null, error: "Sin conexión" });
    expect(screen.getByText(/No se pudieron cargar los datos del cliente: Sin conexión/)).toBeTruthy();
  });
});
