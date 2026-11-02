// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { EditablesDelPack } from "@/components/domain/cliente/ficha-cliente";
import type { LeadEditable } from "@/lib/api/types";
import { getToasts, resetToasts } from "@/lib/toast-store";

// HU-CRM-23: en la ficha, perder un lead pide motivo (con nota opcional) y el valor estimado se escribe
// como número simple. El motivo y la nota solo existen mientras la etapa es «perdido».

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh, push: vi.fn() }),
}));

// El mapa de la ficha (Leaflet) no interviene en estos formularios.
vi.mock("@/components/domain/cliente/mapa-direccion", () => ({ MapaDireccion: () => null }));

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

const ETAPAS = [
  { value: "nuevo", label: "Nuevo" },
  { value: "calificado", label: "Calificado" },
  { value: "perdido", label: "Perdido" },
];
const MOTIVOS = [
  { value: "precio", label: "Precio" },
  { value: "otro", label: "Otro" },
];

function campos({ etapa = "calificado", motivo = "", nota = "", valor = "" } = {}): LeadEditable[] {
  const base = { plugin_id: "pack_commerce" };
  return [
    { ...base, key: "estado_lead", label: "Estado del lead", tipo: "opciones", options: ETAPAS, max_length: 32, value: etapa },
    { ...base, key: "motivo_perdida", label: "Motivo de pérdida", tipo: "opciones", options: MOTIVOS, max_length: 32, value: motivo },
    { ...base, key: "nota_perdida", label: "Nota de la pérdida", tipo: "texto", max_length: 300, value: nota },
    { ...base, key: "valor_estimado", label: "Valor estimado", tipo: "numero", max_length: 14, value: valor },
  ];
}

function pintar(props: Parameters<typeof campos>[0] = {}) {
  return render(<EditablesDelPack leadId="c-1" pluginId="pack_commerce" campos={campos(props)} />);
}

const etapa = () => screen.getByLabelText("Estado del lead") as HTMLSelectElement;
const guardar = () => screen.getByRole("button", { name: "Guardar" });

describe("ficha · motivo de pérdida y valor estimado", () => {
  it("oculta el motivo y la nota mientras la etapa no es perdido", () => {
    pintar();
    expect(screen.queryByLabelText(/Motivo de pérdida/)).toBeNull();
    expect(screen.queryByLabelText("Nota de la pérdida")).toBeNull();
    expect(screen.getByLabelText("Valor estimado")).toBeTruthy();
  });

  it("al elegir perdido aparecen el motivo y la nota; sin motivo no se envía", async () => {
    pintar();
    fireEvent.change(etapa(), { target: { value: "perdido" } });
    expect(screen.getByLabelText(/Motivo de pérdida/)).toBeTruthy();
    expect(screen.getByLabelText("Nota de la pérdida")).toBeTruthy();

    fireEvent.click(guardar());
    expect(await screen.findByText("Elige el motivo de la pérdida para marcar el lead como perdido.")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("con motivo y nota guarda la etapa, el motivo y la nota juntos", async () => {
    fetchMock.mockResolvedValue(respuesta(200, {}));
    pintar();
    fireEvent.change(etapa(), { target: { value: "perdido" } });
    fireEvent.change(screen.getByLabelText(/Motivo de pérdida/), { target: { value: "precio" } });
    fireEvent.change(screen.getByLabelText("Nota de la pérdida"), { target: { value: "Muy caro" } });
    fireEvent.click(guardar());

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      valores: { estado_lead: "perdido", motivo_perdida: "precio", nota_perdida: "Muy caro" },
    });
  });

  it("si se arrepiente de perder el lead, el motivo escrito no se envía", async () => {
    fetchMock.mockResolvedValue(respuesta(200, {}));
    pintar();
    fireEvent.change(etapa(), { target: { value: "perdido" } });
    fireEvent.change(screen.getByLabelText(/Motivo de pérdida/), { target: { value: "precio" } });
    fireEvent.change(etapa(), { target: { value: "nuevo" } });
    fireEvent.click(guardar());

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ valores: { estado_lead: "nuevo" } });
  });

  it("un perdido de antes sin motivo deja anotarlo sin pedirlo", async () => {
    fetchMock.mockResolvedValue(respuesta(200, {}));
    pintar({ etapa: "perdido" });
    expect(screen.getByLabelText(/Motivo de pérdida/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Motivo de pérdida/), { target: { value: "otro" } });
    fireEvent.click(guardar());

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ valores: { motivo_perdida: "otro" } });
  });

  it("el valor estimado se guarda como número simple", async () => {
    fetchMock.mockResolvedValue(respuesta(200, {}));
    pintar();
    fireEvent.change(screen.getByLabelText("Valor estimado"), { target: { value: "250000" } });
    fireEvent.click(guardar());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ valores: { valor_estimado: "250000" } });
  });

  it("rechaza un valor con puntos de miles o símbolos antes de ir al servidor", async () => {
    pintar();
    const valor = screen.getByLabelText("Valor estimado");
    fireEvent.change(valor, { target: { value: "$150.000" } });
    fireEvent.click(guardar());
    expect(await screen.findByText(/sin puntos de miles ni símbolos/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("vaciar el valor lo quita", async () => {
    fetchMock.mockResolvedValue(respuesta(200, {}));
    pintar({ valor: "250000" });
    fireEvent.change(screen.getByLabelText("Valor estimado"), { target: { value: "" } });
    fireEvent.click(guardar());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ valores: { valor_estimado: "" } });
  });

  it("muestra el mensaje del servidor si lo rechaza", async () => {
    fetchMock.mockResolvedValue(respuesta(400, { error: "El valor estimado admite hasta 9.999.999.999." }));
    pintar();
    fireEvent.change(screen.getByLabelText("Valor estimado"), { target: { value: "99999999999" } });
    fireEvent.click(guardar());
    await waitFor(() => expect(getToasts().map((t) => t.message)).toContain("El valor estimado admite hasta 9.999.999.999."));
  });
});
