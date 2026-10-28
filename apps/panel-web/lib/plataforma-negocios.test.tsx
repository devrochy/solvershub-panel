// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
}));

import { TenantActions } from "@/app/(app)/tenants/_components/tenant-actions";
import { TenantPlanBadge } from "@/app/(app)/tenants/_components/tenant-plan-badge";
import { TenantStatusToggle } from "@/app/(app)/tenants/_components/tenant-status-toggle";
import { FeedbackProviders } from "@/components/ui/providers";
import type { PlanResponse, PlatformTenant } from "@/lib/api/types";
import { AVISO_DESACTIVAR_PRIMERO } from "@/lib/eliminar-negocio";
import { resetToasts } from "@/lib/toast-store";

const TENANT: PlatformTenant = {
  id: "t-1",
  name: "Negocio Uno",
  slug: "uno",
  status: "active",
  created_at: "2026-10-01T00:00:00Z",
  plan_name: "Pro",
  plan_status: "active",
  operational: true,
};

const PLANES: PlanResponse["plans"] = [
  { id: "free", name: "Free", price_cop: 0, is_free: true, current: false, limits: {}, features: {} },
  { id: "pro", name: "Pro", price_cop: 199000, is_free: false, current: true, limits: {}, features: {} },
];

function montar(nodo: ReactNode) {
  return render(<FeedbackProviders>{nodo}</FeedbackProviders>);
}

describe("controles de Negocios (master)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetToasts();
    refresh.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("suspende con la consecuencia a la vista y refresca", async () => {
    montar(<TenantStatusToggle tenant={TENANT} />);

    fireEvent.click(screen.getByRole("switch", { name: "Suspender Negocio Uno" }));
    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo.textContent).toContain("dejará de operar hasta que lo reactives");
    expect(dialogo.textContent).toContain("conversaciones se conservan");

    fireEvent.click(screen.getByRole("button", { name: "Suspender" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/platform/tenants/t-1");
    expect(JSON.parse(String(init.body))).toEqual({ action: "deactivate" });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("activar también pide confirmación y no toca la API si se cancela", async () => {
    montar(<TenantStatusToggle tenant={{ ...TENANT, status: "suspended" }} />);

    fireEvent.click(screen.getByRole("switch", { name: "Activar Negocio Uno" }));
    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo.textContent).toContain("volverá a operar de inmediato");

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("el badge de plan abre el cambio y envía plan y días extra", async () => {
    montar(<TenantPlanBadge tenant={TENANT} plans={PLANES} />);

    fireEvent.click(screen.getByRole("button", { name: /Cambiar plan de Negocio Uno/ }));
    await screen.findByRole("dialog");

    fireEvent.change(screen.getByLabelText("Plan"), { target: { value: "free" } });
    fireEvent.change(screen.getByLabelText("Días extra"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar plan" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/platform/tenants/t-1");
    expect(JSON.parse(String(init.body))).toEqual({ action: "plan", plan_id: "free", extend_days: 5 });
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("las acciones son iconos con nombre y la purga exige la frase exacta", async () => {
    montar(<TenantActions tenant={{ ...TENANT, status: "suspended" }} />);

    expect(screen.getByRole("button", { name: "Gestionar Negocio Uno" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Negocio Uno" }));
    await screen.findByRole("dialog");

    const frase = screen.getByLabelText("Escribe la frase de confirmación");
    fireEvent.change(frase, { target: { value: "ELIMINAR uno" } });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar definitivamente" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/platform/tenants/t-1");
    expect(JSON.parse(String(init.body))).toEqual({ action: "purge", confirm_phrase: "ELIMINAR uno" });
  });

  it("un negocio activo avisa que hay que desactivarlo antes de eliminar", async () => {
    montar(<TenantActions tenant={TENANT} />);

    fireEvent.click(screen.getByRole("button", { name: "Eliminar Negocio Uno" }));
    await screen.findByRole("dialog");
    expect(screen.getByText(AVISO_DESACTIVAR_PRIMERO)).toBeTruthy();
    expect((screen.getByLabelText("Escribe la frase de confirmación") as HTMLInputElement).disabled).toBe(true);
  });
});
