// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import type { Me } from "@/lib/api/types";

import { MobileNav } from "./mobile-nav";

const ME = {
  admin_id: "a-1",
  email: "dueno@demo.test",
  username: null,
  role: "owner",
  tenant: { id: "t-1", name: "Cobranza Demo", role: "owner", active: true },
  tenant_count: 1,
  permissions: { dashboard: "write", conversations: "write" },
} as unknown as Me;

describe("MobileNav (panel en celular)", () => {
  it("el menú arranca cerrado y se abre con el botón", () => {
    render(<MobileNav me={ME} packs={{}} />);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(screen.getByRole("dialog", { name: "Menú del panel" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Secciones del panel" })).toBeTruthy();
  });

  it("se cierra con Escape", () => {
    render(<MobileNav me={ME} packs={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("se cierra al tocar fuera y al elegir una sección", () => {
    render(<MobileNav me={ME} packs={{}} />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    fireEvent.click(screen.getByTestId("mobile-nav-fondo"));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    const enlaces = screen.getAllByRole("link").filter((a) => a.getAttribute("href") !== "/dashboard");
    fireEvent.click(enlaces[0] ?? screen.getAllByRole("link")[0]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
