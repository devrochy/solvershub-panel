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

  it("no muestra «Documentación» si no hay destino configurado", async () => {
    render(<UserCard me={ME} initialTheme="sh-dark" />);
    await abrirMenu();
    expect(screen.queryByRole("menuitem", { name: /Documentación/ })).toBeNull();
  });

  it("muestra «Documentación» como enlace a pestaña nueva, entre el perfil y el tema", async () => {
    render(<UserCard me={ME} initialTheme="sh-dark" docsUrl="/ayuda" />);
    await abrirMenu();
    const docs = screen.getByRole("menuitem", { name: /Documentación/ });
    expect(docs.tagName).toBe("A");
    expect(docs.getAttribute("href")).toBe("/ayuda");
    expect(docs.getAttribute("target")).toBe("_blank");
    expect(docs.getAttribute("rel")).toBe("noopener noreferrer");
    // El aviso de pestaña nueva llega a lectores de pantalla y como tooltip.
    expect(docs.textContent).toContain("se abre en una pestaña nueva");
    expect(docs.getAttribute("title")).toBe("se abre en una pestaña nueva");
    const items = screen.getAllByRole("menuitem").map((el) => el.textContent ?? "");
    const iPerfil = items.findIndex((t) => /Editar perfil/.test(t));
    const iDocs = items.findIndex((t) => /Documentación/.test(t));
    const iSalir = items.findIndex((t) => /Cerrar sesión/.test(t));
    expect(iPerfil).toBeLessThan(iDocs);
    expect(iDocs).toBeLessThan(iSalir);
  });

  it("avisa al cajón móvil para que se cierre al abrir la documentación", async () => {
    const onNavigate = vi.fn();
    render(<UserCard me={ME} initialTheme="sh-dark" docsUrl="https://docs.ejemplo.test/" onNavigate={onNavigate} />);
    await abrirMenu();
    const docs = screen.getByRole("menuitem", { name: /Documentación/ });
    // jsdom no navega; el clic solo debe disparar el cierre del cajón.
    docs.addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(docs);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
