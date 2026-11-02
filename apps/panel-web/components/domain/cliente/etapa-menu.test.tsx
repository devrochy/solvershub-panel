// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { EtapaMenu } from "@/components/domain/cliente/etapa-menu";
import { getToasts, resetToasts } from "@/lib/toast-store";

// HU-CRM-19: cambio rápido de etapa desde la lista, con actualización inmediata y reversa si falla.

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh, push: vi.fn() }),
}));

class ResizeObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}
const fetchMock = vi.fn();

beforeEach(() => {
  refresh.mockReset();
  fetchMock.mockReset();
  resetToasts();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverFalso);
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.releasePointerCapture = () => undefined;
  window.HTMLElement.prototype.setPointerCapture = () => undefined;
  window.HTMLElement.prototype.scrollIntoView = () => undefined;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const OPCIONES = [
  { value: "nuevo", label: "Nuevo" },
  { value: "calificado", label: "Calificado" },
  { value: "contactado", label: "Contactado" },
  { value: "convertido", label: "Convertido" },
  { value: "perdido", label: "Perdido" },
];

const MOTIVOS = [
  { value: "precio", label: "Precio" },
  { value: "sin_respuesta", label: "Sin respuesta" },
  { value: "otro", label: "Otro" },
];

function pintar(actual = "calificado", texto = "Calificado", motivos?: { value: string; label: string }[]) {
  return render(
    <EtapaMenu
      leadId="c-1"
      nombre="Ana Prueba"
      pluginId="pack_commerce"
      clave="estado_lead"
      actual={actual}
      texto={texto}
      opciones={OPCIONES}
      motivos={motivos}
    />,
  );
}

async function abrirMenu() {
  const trigger = screen.getByRole("button", { name: /Cambiar la etapa de Ana Prueba/ });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
  await screen.findByRole("menu");
}

const respuesta = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });

describe("EtapaMenu", () => {
  it("muestra la etapa actual y las cinco opciones", async () => {
    pintar();
    expect(screen.getByRole("button", { name: "Etapa: Calificado. Cambiar la etapa de Ana Prueba" })).toBeTruthy();
    await abrirMenu();
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual(OPCIONES.map((o) => o.label));
  });

  it("cambia la etapa al instante y la guarda en el pack comercio", async () => {
    let terminar: (r: Response) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (terminar = r)));
    pintar();
    await abrirMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Contactado" }));

    // El servidor aún no respondió y la etapa ya cambió.
    await waitFor(() => expect(screen.getByRole("button", { name: /Etapa: Contactado/ })).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/leads/c-1/pack/pack_commerce",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ valores: { estado_lead: "contactado" } }) }),
    );

    terminar(respuesta(200, {}));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(getToasts().map((t) => t.message)).toContain("Ana Prueba pasó a Contactado.");
  });

  it("si el servidor la rechaza vuelve a la etapa anterior y muestra su motivo", async () => {
    fetchMock.mockResolvedValue(respuesta(409, { error: "Solo una persona puede reabrir un lead perdido." }));
    pintar("perdido", "Perdido");
    await abrirMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Nuevo" }));

    await waitFor(() =>
      expect(getToasts().map((t) => t.message)).toContain("Solo una persona puede reabrir un lead perdido."),
    );
    expect(screen.getByRole("button", { name: /Etapa: Perdido/ })).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("si falla la red vuelve a la etapa anterior", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    pintar();
    await abrirMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Convertido" }));

    await waitFor(() => expect(getToasts().some((t) => t.kind === "error")).toBe(true));
    expect(screen.getByRole("button", { name: /Etapa: Calificado/ })).toBeTruthy();
  });

  it("elegir la etapa actual no llama al servidor", async () => {
    pintar();
    await abrirMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Calificado" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sigue la etapa que trae el servidor cuando la vista se refresca", () => {
    const { rerender } = pintar();
    rerender(
      <EtapaMenu leadId="c-1" nombre="Ana Prueba" pluginId="pack_commerce" clave="estado_lead" actual="convertido" texto="Convertido" opciones={OPCIONES} />,
    );
    expect(screen.getByRole("button", { name: /Etapa: Convertido/ })).toBeTruthy();
  });
});

describe("EtapaMenu · motivo de pérdida (HU-CRM-23)", () => {
  async function elegirPerdido() {
    pintar("calificado", "Calificado", MOTIVOS);
    await abrirMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Perdido" }));
    return screen.findByRole("dialog");
  }

  it("pasar a perdido abre el diálogo y no cambia nada hasta confirmarlo", async () => {
    const dialogo = await elegirPerdido();
    expect(dialogo.textContent).toContain("¿Por qué se perdió?");
    expect(fetchMock).not.toHaveBeenCalled();
    // Con el diálogo abierto el resto de la página queda oculto a los lectores de pantalla.
    expect(screen.getByRole("button", { name: /Etapa: Calificado/, hidden: true })).toBeTruthy();
  });

  it("pide el motivo: sin elegirlo muestra el aviso y no llama al servidor", async () => {
    await elegirPerdido();
    fireEvent.click(screen.getByRole("button", { name: "Marcar como perdido" }));
    expect(await screen.findByText("Elige el motivo de la pérdida.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ofrece los motivos del pack y guarda etapa, motivo y nota en una sola escritura", async () => {
    fetchMock.mockResolvedValue(respuesta(200, {}));
    await elegirPerdido();
    const select = screen.getByLabelText(/Motivo de la pérdida/) as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(["Elige un motivo", "Precio", "Sin respuesta", "Otro"]);
    fireEvent.change(select, { target: { value: "precio" } });
    fireEvent.change(screen.getByLabelText(/Nota/), { target: { value: "  Dijo que estaba caro  " } });
    fireEvent.click(screen.getByRole("button", { name: "Marcar como perdido" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/leads/c-1/pack/pack_commerce",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ valores: { estado_lead: "perdido", motivo_perdida: "precio", nota_perdida: "Dijo que estaba caro" } }),
      }),
    );
    expect(screen.getByRole("button", { name: /Etapa: Perdido/ })).toBeTruthy();
  });

  it("sin nota no manda el campo", async () => {
    fetchMock.mockResolvedValue(respuesta(200, {}));
    await elegirPerdido();
    fireEvent.change(screen.getByLabelText(/Motivo de la pérdida/), { target: { value: "otro" } });
    fireEvent.click(screen.getByRole("button", { name: "Marcar como perdido" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ valores: { estado_lead: "perdido", motivo_perdida: "otro" } }));
  });

  it("cancelar deja la etapa como estaba", async () => {
    await elegirPerdido();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Etapa: Calificado/ })).toBeTruthy();
  });

  it("si el servidor rechaza la pérdida vuelve a la etapa anterior y muestra su mensaje", async () => {
    fetchMock.mockResolvedValue(respuesta(400, { error: "Elige el motivo de la pérdida para marcar el lead como perdido (Precio)." }));
    await elegirPerdido();
    fireEvent.change(screen.getByLabelText(/Motivo de la pérdida/), { target: { value: "precio" } });
    fireEvent.click(screen.getByRole("button", { name: "Marcar como perdido" }));
    await waitFor(() => expect(getToasts().some((t) => t.kind === "error")).toBe(true));
    expect(screen.getByRole("button", { name: /Etapa: Calificado/ })).toBeTruthy();
  });

  it("cualquier otra etapa no pide motivo", async () => {
    fetchMock.mockResolvedValue(respuesta(200, {}));
    pintar("calificado", "Calificado", MOTIVOS);
    await abrirMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "Convertido" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
