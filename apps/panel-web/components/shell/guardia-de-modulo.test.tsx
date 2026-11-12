// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { ShellProvider } from "@/components/shell/shell-context";

import { GuardiaDeModulo } from "./guardia-de-modulo";

let ruta = "/comercio/pedidos";
vi.mock("next/navigation", () => ({
  usePathname: () => ruta,
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  ruta = "/comercio/pedidos";
});

const PACKS = { pack_commerce: { enabled: true, hasConfig: false } };

function montar(modulos: Record<string, "habilitado" | "plan" | "pack">, packs = PACKS) {
  return render(
    <ShellProvider permisos={{}} modulos={modulos}>
      <GuardiaDeModulo packs={packs}>
        <p>Contenido del módulo</p>
      </GuardiaDeModulo>
    </ShellProvider>,
  );
}

describe("GuardiaDeModulo", () => {
  it("con el módulo habilitado deja pasar el contenido", () => {
    montar({ pack_commerce: "habilitado" });
    expect(screen.getByText("Contenido del módulo")).toBeTruthy();
  });

  it("sin agente (plan) bloquea el contenido y ofrece mejorar el plan", () => {
    montar({ pack_commerce: "plan" });
    expect(screen.queryByText("Contenido del módulo")).toBeNull();
    expect(screen.getByRole("heading", { name: "Ventas no está en tu plan" })).toBeTruthy();
    const enlace = screen.getByRole("link", { name: "Mejorar mi plan" });
    expect(enlace.getAttribute("href")).toBe("/plan?ver=planes");
    expect(screen.getByRole("link", { name: "Volver al Resumen" }).getAttribute("href")).toBe("/dashboard");
  });

  it("con el pack apagado bloquea y ofrece activarlo", () => {
    montar({ pack_commerce: "pack" });
    expect(screen.queryByText("Contenido del módulo")).toBeNull();
    expect(screen.getByRole("heading", { name: "Ventas está apagado" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Habilitar Ventas" })).toBeTruthy();
  });

  it("una ruta sin pack (Resumen) no se bloquea", () => {
    ruta = "/dashboard";
    montar({ pack_commerce: "plan" });
    expect(screen.getByText("Contenido del módulo")).toBeTruthy();
  });

  it("sin estado de agentes cae al estado del pack", () => {
    montar({}, { pack_commerce: { enabled: true, hasConfig: false } });
    expect(screen.getByText("Contenido del módulo")).toBeTruthy();
  });
});
