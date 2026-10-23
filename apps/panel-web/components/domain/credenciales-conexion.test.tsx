// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { CredencialesConexion } from "@/components/domain/credenciales-conexion";
import type { CampoCredencial } from "@/lib/conexiones";

class ResizeObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const CAMPOS: CampoCredencial[] = [
  { name: "host", label: "Servidor SMTP", value: "smtp.example", secret: false, configured: true },
  { name: "password", label: "Contraseña SMTP", secret: true, configured: true },
  {
    name: "app_secret",
    label: "App Secret",
    secret: true,
    configured: true,
    platform: true,
  },
  { name: "verify_token", label: "Verify token", secret: true, configured: false },
];

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ secrets: { password: "secreto-smtp" } }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverFalso);
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.releasePointerCapture = () => undefined;
  window.HTMLElement.prototype.setPointerCapture = () => undefined;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("credenciales de una conexión", () => {
  it("muestra los datos, enmascara secretos y revela con contraseña", async () => {
    render(<CredencialesConexion campos={CAMPOS} revealUrl="/api/connections/c1/credentials/reveal" />);

    expect(screen.getByText("smtp.example")).toBeTruthy();
    expect(screen.getAllByText("••••••••").length).toBe(1);
    expect(screen.getByText("Gestionado por la plataforma")).toBeTruthy();
    expect(screen.getByText("Sin configurar")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Mostrar App Secret" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Mostrar Contraseña SMTP" }));
    fireEvent.change(screen.getByLabelText(/Contraseña actual/), {
      target: { value: "admin123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Mostrar" }));

    await waitFor(() => expect(screen.getByText("secreto-smtp")).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/connections/c1/credentials/reveal",
      expect.objectContaining({ method: "POST" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Ocultar Contraseña SMTP" }));
    expect(screen.queryByText("secreto-smtp")).toBeNull();
  });

  it("muestra el error cuando la contraseña es incorrecta", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "La contraseña no es correcta." }), { status: 403 }),
    );
    render(<CredencialesConexion campos={CAMPOS} revealUrl="/api/connections/c1/credentials/reveal" />);

    fireEvent.click(screen.getByRole("button", { name: "Mostrar Contraseña SMTP" }));
    fireEvent.change(screen.getByLabelText(/Contraseña actual/), {
      target: { value: "mala" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Mostrar" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("no es correcta"));
    expect(screen.queryByText("secreto-smtp")).toBeNull();
  });
});
