// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AvisoDatosCard } from "@/app/(app)/configuracion/_components/aviso-datos-card";
import { FeedbackProviders } from "@/components/ui/providers";
import { avisoDatos } from "@/lib/testing/fixtures";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh, prefetch: vi.fn(), back: vi.fn() }),
}));

const fetchMock = vi.fn();

function montar(props: Partial<Parameters<typeof AvisoDatosCard>[0]> = {}) {
  return render(
    <FeedbackProviders>
      <AvisoDatosCard aviso={avisoDatos} puedeEditar {...props} />
    </FeedbackProviders>,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  refresh.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AvisoDatosCard", () => {
  it("muestra el borrador con la advertencia de que no está validado legalmente", () => {
    montar();
    expect(screen.getByText("Apagado")).toBeTruthy();
    expect(screen.getByText(/borrador y no está validado legalmente/)).toBeTruthy();
    expect((screen.getByLabelText("Texto del aviso") as HTMLTextAreaElement).value).toBe(avisoDatos.texto);
  });

  it("no deja guardar la activación sin confirmar la revisión legal", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ...avisoDatos, activo: true }), { status: 200 }));
    montar();
    const guardar = screen.getByRole("button", { name: "Guardar aviso" });
    expect(guardar).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("checkbox", { name: "Activar el aviso en el chat" }));
    expect(screen.getByRole("button", { name: "Guardar aviso" })).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("checkbox", { name: /revisado legalmente/ }));
    const listo = screen.getByRole("button", { name: "Guardar aviso" });
    expect(listo).toHaveProperty("disabled", false);
    fireEvent.click(listo);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/datos-cliente/aviso");
    // El borrador sin tocar se manda vacío: sigue siendo el borrador del sistema.
    expect(JSON.parse(init.body)).toEqual({ activo: true, texto: "", confirmo_revision_legal: true });
  });

  it("un texto propio viaja tal cual", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(avisoDatos), { status: 200 }));
    montar();
    fireEvent.change(screen.getByLabelText("Texto del aviso"), { target: { value: "Texto revisado por el abogado." } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar aviso" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      activo: false,
      texto: "Texto revisado por el abogado.",
      confirmo_revision_legal: false,
    });
  });

  it("sin permiso de escritura se ve en solo lectura", () => {
    montar({ puedeEditar: false });
    expect(screen.getByText(/Solo puedes ver esta configuración/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Guardar/ })).toBeNull();
    expect(screen.getByLabelText("Texto del aviso")).toHaveProperty("disabled", true);
  });

  it("si no se pudo cargar, muestra el error", () => {
    montar({ aviso: null, error: "Sin conexión" });
    expect(screen.getByText(/No se pudo cargar el aviso de datos: Sin conexión/)).toBeTruthy();
  });
});
