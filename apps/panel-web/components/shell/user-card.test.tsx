// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { UserCard } from "@/components/shell/user-card";
import type { Me } from "@/lib/api/types";
import { me as meBase } from "@/lib/testing/fixtures";

const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
  usePathname: () => "/dashboard",
}));

// jsdom no trae estas APIs que usa el posicionamiento/menú de Radix.
class ResizeObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const fetchMock = vi.fn();

beforeEach(() => {
  replace.mockReset();
  refresh.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverFalso);
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.releasePointerCapture = () => undefined;
  window.HTMLElement.prototype.setPointerCapture = () => undefined;
  document.documentElement.dataset.theme = "sh-dark";
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ME: Me = { ...meBase, nombre: "Ana Pérez", username: "ana.perez", avatar_url: null };

async function abrirMenu() {
  const trigger = screen.getByRole("button", { name: "Menú de tu cuenta" });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: "mouse" });
  return await screen.findByRole("menu");
}

describe("tarjeta del usuario", () => {
  it("muestra el nombre y el submenú con perfil, tema y salir", async () => {
    render(<UserCard me={ME} initialTheme="sh-dark" />);
    expect(screen.getByText("Ana Pérez")).toBeTruthy();

    await abrirMenu();
    expect(screen.getByRole("menuitem", { name: /Editar perfil/ })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Tema oscuro" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: /Cerrar sesión/ })).toBeTruthy();
  });

  it("cambia el tema con el interruptor del submenú", async () => {
    render(<UserCard me={ME} initialTheme="sh-dark" />);
    await abrirMenu();
    fireEvent.click(screen.getByRole("switch", { name: "Tema oscuro" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("sh-light"));
  });

  it("cierra la sesión y vuelve al login", async () => {
    render(<UserCard me={ME} initialTheme="sh-dark" />);
    await abrirMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: /Cerrar sesión/ }));
    await waitFor(() => {
      const llamada = fetchMock.mock.calls.find(([url]) => String(url).includes("/api/session"));
      expect(llamada).toBeTruthy();
      expect(llamada?.[1]?.method).toBe("DELETE");
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
  });
});
