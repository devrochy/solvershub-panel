// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SeguimientoDelLead } from "@/components/domain/cliente/seguimiento-lead";
import type { LeadEditable } from "@/lib/api/types";
import { getToasts, resetToasts } from "@/lib/toast-store";

// HU-CRM-21: programar, mover, quitar y completar el seguimiento desde la ficha; sin permiso solo se ve.

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh, push: vi.fn() }),
}));

const fetchMock = vi.fn();

beforeEach(() => {
  refresh.mockReset();
  fetchMock.mockReset();
  resetToasts();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const respuesta = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { "Content-Type": "application/json" } });

function editables(nota = "", fecha = ""): LeadEditable[] {
  return [
    { plugin_id: "pack_commerce", key: "seguimiento_nota", label: "Próxima acción", tipo: "texto", max_length: 200, value: nota },
    { plugin_id: "pack_commerce", key: "seguimiento_en", label: "Fecha de seguimiento", tipo: "fecha", max_length: 32, value: fecha },
  ];
}

function pintar({
  nota = "",
  fecha = "",
  estado = null as string | null,
  puedeEditar = true,
  tieneLead = true,
}: { nota?: string; fecha?: string; estado?: string | null; puedeEditar?: boolean; tieneLead?: boolean } = {}) {
  const extras = fecha
    ? { seguimiento_en: "2031-05-04T14:00:00+00:00", seguimiento_nota: nota || null, seguimiento_estado: estado }
    : {};
  return render(
    <SeguimientoDelLead leadId="c-1" editables={editables(nota, fecha)} extras={extras} tieneLead={tieneLead} puedeEditar={puedeEditar} />,
  );
}

describe("SeguimientoDelLead", () => {
  it("sin seguimiento ofrece programarlo y avisa que se crea el lead si no lo tiene", () => {
    pintar({ tieneLead: false });
    expect(screen.getByText(/Sin seguimiento programado/)).toBeTruthy();
    expect(screen.getByText(/se crea el lead de venta/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Programar seguimiento" })).toBeTruthy();
  });

  it("programa con la nota y la hora del negocio (sin zona) y recarga la ficha", async () => {
    fetchMock.mockResolvedValue(respuesta(200, {}));
    pintar();
    fireEvent.click(screen.getByRole("button", { name: "Programar seguimiento" }));
    fireEvent.change(screen.getByLabelText("Qué vas a hacer"), { target: { value: "Enviar cotización" } });
    fireEvent.change(screen.getByLabelText("Cuándo"), { target: { value: "2031-05-04T09:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/leads/c-1/pack/pack_commerce");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(String(init.body))).toEqual({
      valores: { seguimiento_nota: "Enviar cotización", seguimiento_en: "2031-05-04T09:00" },
    });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(getToasts().some((t) => t.message === "Seguimiento guardado.")).toBe(true);
  });

  it("no envía sin fecha y lo dice junto al campo", () => {
    pintar();
    fireEvent.click(screen.getByRole("button", { name: "Programar seguimiento" }));
    fireEvent.change(screen.getByLabelText("Qué vas a hacer"), { target: { value: "Llamar" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("Elige la fecha y la hora del seguimiento.")).toBeTruthy();
  });

  it("un seguimiento vencido se marca «Vencido» con texto, junto a la nota", () => {
    pintar({ nota: "Enviar cotización", fecha: "2031-05-04T09:00", estado: "vencidos" });
    expect(screen.getByText("Vencido")).toBeTruthy();
    expect(screen.getByText("Enviar cotización")).toBeTruthy();
    expect(screen.getByText(/9:00/)).toBeTruthy();
  });

  it("el tope de la nota es el que declara el backend", () => {
    pintar();
    fireEvent.click(screen.getByRole("button", { name: "Programar seguimiento" }));
    expect((screen.getByLabelText("Qué vas a hacer") as HTMLInputElement).maxLength).toBe(200);
  });

  it("quitar manda solo la fecha vacía", async () => {
    fetchMock.mockResolvedValue(respuesta(200, {}));
    pintar({ nota: "Llamar", fecha: "2031-05-04T09:00", estado: "mas_adelante" });
    fireEvent.click(screen.getByRole("button", { name: "Quitar" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({
      valores: { seguimiento_en: "" },
    });
  });

  it("marcar hecho sin siguiente solo cierra el actual", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { ok: true }));
    pintar({ nota: "Llamar", fecha: "2031-05-04T09:00", estado: "hoy" });
    fireEvent.click(screen.getByRole("button", { name: "Marcar hecho" }));
    fireEvent.click(screen.getByRole("button", { name: "Marcar hecho" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/leads/c-1/seguimiento/hecho");
    expect(JSON.parse(String(init.body))).toEqual({});
  });

  it("marcar hecho y programar el siguiente en el mismo gesto", async () => {
    fetchMock.mockResolvedValue(respuesta(200, { ok: true }));
    pintar({ nota: "Enviar cotización", fecha: "2031-05-04T09:00", estado: "hoy" });
    fireEvent.click(screen.getByRole("button", { name: "Marcar hecho" }));
    fireEvent.change(screen.getByLabelText(/Siguiente: qué vas a hacer/), { target: { value: "Confirmar pago" } });
    fireEvent.change(screen.getByLabelText(/Siguiente: cuándo/), { target: { value: "2031-05-08T15:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Hecho y programar siguiente" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({
      siguiente_en: "2031-05-08T15:00",
      siguiente_nota: "Confirmar pago",
    });
    await waitFor(() => expect(getToasts().some((t) => t.message === "Hecho. Quedó programado el siguiente.")).toBe(true));
  });

  it("si el servidor rechaza, muestra el motivo en el campo y no recarga", async () => {
    fetchMock.mockResolvedValue(respuesta(400, { error: "Revisa los datos.", fields: { seguimiento_en: "Usa una fecha y hora válidas." } }));
    pintar();
    fireEvent.click(screen.getByRole("button", { name: "Programar seguimiento" }));
    fireEvent.change(screen.getByLabelText("Cuándo"), { target: { value: "2031-05-04T09:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Usa una fecha y hora válidas.")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("sin permiso de escritura ve el seguimiento y no puede cambiarlo", () => {
    pintar({ nota: "Llamar", fecha: "2031-05-04T09:00", estado: "hoy", puedeEditar: false });
    expect(screen.getByText("Llamar")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    cleanup();
    pintar({ puedeEditar: false });
    expect(screen.queryByRole("button")).toBeNull();
  });
});
