// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { OpcionesDelCoordinador } from "@/components/domain/agentes/opciones-del-coordinador";
import type { OpcionesDelCoordinador as Opciones } from "@/lib/coordinador-voz";

afterEach(cleanup);

const inicial: Opciones = {
  assistant_name: "Lía",
  business_description: "Tienda de plantas",
  brand_voice: "cercana",
  business_tz: "America/Bogota",
  business_ranges: [{ day: 1, from: "08:00", to: "17:00" }],
  business_hours_mode: "bloquea",
  out_of_hours_message: "",
  nivel_ia: "estandar",
  guardrails: [],
  guardrails_problems: [],
};

describe("OpcionesDelCoordinador", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("explica que solo conversa sin especialistas y no ofrece tools ni habilidades", () => {
    render(<OpcionesDelCoordinador inicial={inicial} agenteId="a-1" puedeEditar />);
    expect(screen.getByText(/Solo conversa él cuando el negocio no tiene/)).toBeTruthy();
    expect(screen.queryByText(/Tools HTTP/)).toBeNull();
    expect(screen.getByText("Reglas de la recepción")).toBeTruthy();
  });

  it("no ofrece el nombre del asistente: es de cada agente, el Coordinador es el core", () => {
    render(<OpcionesDelCoordinador inicial={inicial} agenteId="a-1" puedeEditar />);
    expect(screen.queryByLabelText("Nombre del asistente")).toBeNull();
    expect(screen.getByLabelText("Qué hace tu negocio")).toBeTruthy();
  });

  it("guarda solo lo que cambió de la voz", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ...inicial, brand_voice: "formal" }), { status: 200 }));
    render(<OpcionesDelCoordinador inicial={inicial} agenteId="a-1" puedeEditar />);
    fireEvent.change(screen.getByLabelText("Cómo habla tu marca"), { target: { value: "formal" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar voz" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/coordinator");
    expect(JSON.parse(String(init.body))).toEqual({ brand_voice: "formal" });
  });

  it("avisa de reglas guardadas que ya no son válidas", () => {
    render(
      <OpcionesDelCoordinador
        inicial={{ ...inicial, guardrails_problems: ["guardrails[0].kind: inválido"] }}
        agenteId="a-1"
        puedeEditar
      />,
    );
    expect(screen.getByText(/ya no son válidas y bloquean publicar/)).toBeTruthy();
  });

  it("sin permiso de edición no muestra los botones de guardar", () => {
    render(<OpcionesDelCoordinador inicial={inicial} agenteId="a-1" puedeEditar={false} />);
    expect(screen.queryByRole("button", { name: "Guardar voz" })).toBeNull();
  });
});
