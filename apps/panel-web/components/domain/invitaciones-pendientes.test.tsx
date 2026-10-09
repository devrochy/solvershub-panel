// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ refresh, push: vi.fn() }),
}));

import { ConfirmProvider } from "@/components/ui/confirm";
import type { InvitationItem } from "@/lib/api/types";
import { getToasts, resetToasts } from "@/lib/toast-store";

import { InvitacionesPendientes } from "./invitaciones-pendientes";

const INVITACION: InvitationItem = {
  id: "inv-1",
  tenantId: "t-1",
  slug: "panaderia",
  nombre: "Panadería La Espiga",
  rol: "owner",
};

function montar(items: InvitationItem[] = [INVITACION]) {
  return render(
    <ConfirmProvider>
      <InvitacionesPendientes items={items} />
    </ConfirmProvider>,
  );
}

describe("InvitacionesPendientes (HU-SH-06)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetToasts();
    refresh.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra quién invita y con qué rol, en español", () => {
    montar();
    expect(screen.getByRole("heading", { name: "Tienes una invitación pendiente" })).toBeTruthy();
    expect(screen.getByText(/te invitó como dueño/)).toBeTruthy();
  });

  it("aceptar entra al negocio: lo resuelve el BFF con el negocio a dejar activo", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Aceptar la invitación de Panadería La Espiga" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/invitations/inv-1");
    expect(JSON.parse(String(init.body))).toEqual({ action: "accept", tenantId: "t-1" });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(getToasts()).toContainEqual(
      expect.objectContaining({ kind: "success", message: "Ya eres parte de Panadería La Espiga." }),
    );
  });

  it("rechazar pide confirmación con la consecuencia y no hace nada si se cancela", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Rechazar la invitación de Panadería La Espiga" }));
    const confirmacion = await screen.findByRole("alertdialog");
    expect(confirmacion.textContent).toContain("No vas a poder entrar a ese negocio");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rechazar confirmado llama al BFF", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Rechazar la invitación de Panadería La Espiga" }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Rechazar invitación" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body)).action).toBe("reject");
  });

  it("un error del BFF queda en un aviso de error", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "La invitación venció: pídele al negocio una nueva" }), { status: 400 }),
    );
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Aceptar la invitación de Panadería La Espiga" }));
    await waitFor(() =>
      expect(getToasts()).toContainEqual(
        expect.objectContaining({ kind: "error", message: "La invitación venció: pídele al negocio una nueva" }),
      ),
    );
  });

  it("sin invitaciones no ocupa lugar", () => {
    const { container } = montar([]);
    expect(container.textContent).toBe("");
  });
});
