// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { TarjetaPlanFree } from "@/components/notificaciones/tarjeta-plan-free";
import { ShellProvider } from "@/components/shell/shell-context";

import { AvisoPlanFree } from "./aviso-plan-free";

const { ruta } = vi.hoisted(() => ({ ruta: { actual: "/dashboard" } }));
vi.mock("next/navigation", () => ({ usePathname: () => ruta.actual }));

const PLAN_FREE = {
  plan_id: "free",
  plan_name: "Free",
  status: "trialing",
  days_left: 12,
  trial_ends_at: null,
  has_plan: true,
};

beforeEach(() => {
  ruta.actual = "/dashboard";
});

afterEach(() => {
  cleanup();
});

function montar(ui: ReactNode, permisos = { plan: "write" }, plan = PLAN_FREE) {
  return render(
    <ShellProvider permisos={permisos} negocioId="t1" plan={plan}>
      {ui}
    </ShellProvider>,
  );
}

describe("Aviso de plan Free (HU-BILL-15)", () => {
  it("se cierra en la vista actual y vuelve al cambiar de sección", () => {
    const { rerender } = montar(<AvisoPlanFree />);

    const aviso = screen.getByRole("status");
    expect(aviso.textContent).toContain("Estás en el plan Free");
    expect(aviso.textContent).toContain("Te quedan 12 días de prueba.");
    expect(screen.getByRole("link", { name: "Mejorar mi plan" }).getAttribute("href")).toBe("/plan");

    fireEvent.click(screen.getByRole("button", { name: "Cerrar el aviso de plan" }));
    expect(screen.queryByRole("status")).toBeNull();

    ruta.actual = "/agentes";
    rerender(
      <ShellProvider permisos={{ plan: "write" }} negocioId="t1" plan={PLAN_FREE}>
        <AvisoPlanFree />
      </ShellProvider>,
    );
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("vuelve tras recargar la página", () => {
    const { unmount } = montar(<AvisoPlanFree />);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar el aviso de plan" }));
    expect(screen.queryByRole("status")).toBeNull();

    unmount();
    montar(<AvisoPlanFree />);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("no aparece en Plan y consumo", () => {
    ruta.actual = "/plan";
    montar(<AvisoPlanFree />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("no aparece sin escritura en plan ni en un plan pago", () => {
    const { rerender } = montar(<AvisoPlanFree />, { plan: "read" });
    expect(screen.queryByRole("status")).toBeNull();

    rerender(
      <ShellProvider permisos={{ plan: "write" }} negocioId="t1" plan={{ ...PLAN_FREE, plan_id: "basic", plan_name: "Basic" }}>
        <AvisoPlanFree />
      </ShellProvider>,
    );
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("usa tono de peligro cuando el Free venció", () => {
    montar(<AvisoPlanFree />, { plan: "write" }, { ...PLAN_FREE, status: "expired" });
    expect(screen.getByRole("alert").textContent).toContain("Tu plan Free terminó");
  });

  it("la campana muestra la misma tarjeta y su CTA", () => {
    montar(<TarjetaPlanFree onCerrar={() => {}} />);
    expect(screen.getByText("Estás en el plan Free")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mejorar mi plan" }).getAttribute("href")).toBe("/plan");
  });

  it("la tarjeta tampoco aparece en Plan y consumo", () => {
    ruta.actual = "/plan";
    montar(<TarjetaPlanFree onCerrar={() => {}} />);
    expect(screen.queryByText("Estás en el plan Free")).toBeNull();
  });
});
