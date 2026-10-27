// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { me } from "@/lib/testing/fixtures";
import { violacionesGraves } from "@/lib/testing/axe";

import { PageHeader } from "@/components/ui/page-header";

import { ShellProvider } from "./shell-context";
import { Sidebar } from "./sidebar";

let ruta = "/cobranza/carteras";
vi.mock("next/navigation", () => ({ usePathname: () => ruta, useRouter: () => ({ refresh: vi.fn() }) }));

const PACKS = { pack_cobranza: { enabled: true, hasConfig: false }, pack_calendar: { enabled: true, hasConfig: false } };

function mediaQuery(coincide: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: coincide,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

/** El contenedor de cada estructura (expandida / plegada) por su `nav`. */
function contenedores(container: HTMLElement) {
  const [expandida, plegada] = Array.from(container.querySelectorAll('nav[aria-label="Secciones del panel"]')).map(
    (n) => n.parentElement as HTMLElement,
  );
  return { expandida, plegada };
}

beforeEach(() => {
  ruta = "/cobranza/carteras";
  mediaQuery(false);
  document.cookie = "panel_sidebar=; path=/; max-age=0";
});

afterEach(cleanup);

describe("Sidebar adaptativo (HU-DS-04)", () => {
  it("en auto se pliega por CSS entre 768 y 1279 px y se expande desde 1280", () => {
    const { container } = render(<Sidebar me={me} packs={PACKS} modo="auto" />);
    const aside = container.querySelector("aside") as HTMLElement;
    expect(aside.className).toMatch(/w-\[72px\]/);
    expect(aside.className).toMatch(/xl:w-64/);
    const { expandida, plegada } = contenedores(container);
    expect(expandida.className).toMatch(/hidden xl:flex/);
    expect(plegada.className).toMatch(/flex xl:hidden/);
  });

  it("con preferencia guardada respeta el modo en cualquier ancho", () => {
    const { container } = render(<Sidebar me={me} packs={PACKS} modo="plegada" />);
    expect((container.querySelector("aside") as HTMLElement).className).toMatch(/\bw-\[72px\]/);
    expect(contenedores(container).expandida.className).toMatch(/\bhidden\b/);
  });

  it("el botón pliega o expande, guarda la cookie y dice su estado", () => {
    render(<Sidebar me={me} packs={PACKS} modo="expandida" />);
    const boton = screen.getByRole("button", { name: "Plegar menú" });
    expect(boton.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(boton);
    expect(document.cookie).toContain("panel_sidebar=plegada");
    expect(screen.getByRole("button", { name: "Expandir menú" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("el atajo [ alterna, pero no mientras se escribe", () => {
    const { container } = render(
      <>
        <input aria-label="Campo" />
        <Sidebar me={me} packs={PACKS} modo="expandida" />
      </>,
    );
    const aside = () => (container.querySelector("aside") as HTMLElement).dataset.modo;
    act(() => {
      fireEvent.keyDown(window, { key: "[" });
    });
    expect(aside()).toBe("plegada");
    act(() => {
      fireEvent.keyDown(screen.getByRole("textbox", { name: "Campo" }), { key: "[" });
    });
    expect(aside()).toBe("plegada");
    act(() => {
      fireEvent.keyDown(window, { key: "[" });
    });
    expect(aside()).toBe("expandida");
  });

  it("en la barra plegada el nombre sale en un tooltip con portal, sin scroll lateral (HU-UX-12)", () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    const { container } = render(<Sidebar me={me} packs={PACKS} modo="plegada" />);
    const { plegada } = contenedores(container);
    expect(plegada.querySelector("nav")?.className).toMatch(/overflow-x-hidden/);

    const enlace = within(plegada).getByRole("link", { name: "Conversaciones" });
    fireEvent.mouseEnter(enlace.closest("[data-tooltip]") as HTMLElement);
    const etiqueta = screen.getByRole("tooltip", { hidden: true });
    expect(etiqueta.textContent).toBe("Conversaciones");
    // Fuera del `aside`: el overflow de la barra ya no la recorta.
    expect(container.contains(etiqueta)).toBe(false);
    // El enlace sigue siendo el único tab stop.
    expect(enlace.closest("[data-tooltip]")?.hasAttribute("tabindex")).toBe(false);
  });

  it("marca la sección actual en las dos estructuras", () => {
    const { container } = render(<Sidebar me={me} packs={PACKS} modo="expandida" />);
    const { expandida, plegada } = contenedores(container);
    // Menú v2 (HU-UX-02): Carteras es una pestaña; el menú marca su entrada, Cobranza.
    expect(within(expandida).getByRole("link", { name: "Cobranza" }).getAttribute("aria-current")).toBe("page");
    expect(within(expandida).queryByRole("link", { name: "Carteras" })).toBeNull();
    expect(within(plegada).getByRole("link", { name: "Cobranza" }).className).toMatch(/before:bg-focus/);
    expect(within(plegada).getByRole("link", { name: "Conversaciones" })).toBeTruthy();
  });

  it("el cajón móvil va siempre expandido y sin botón de plegar", () => {
    const { container } = render(<Sidebar me={me} packs={PACKS} modo="plegada" onNavigate={() => undefined} />);
    expect(container.querySelectorAll('nav[aria-label="Secciones del panel"]')).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Plegar menú|Expandir menú/ })).toBeNull();
  });

  it("no tiene violaciones graves de accesibilidad", async () => {
    const { container } = render(<Sidebar me={me} packs={PACKS} modo="expandida" />);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe("migas y pestañas automáticas del PageHeader (HU-DS-04)", () => {
  const TODO = { ...me.permissions };

  it("en una pestaña: migas grupo › entrada › pestaña y pestañas con la actual marcada", () => {
    ruta = "/cobranza/carteras";
    render(
      <ShellProvider permisos={TODO}>
        <PageHeader title="Carteras" />
      </ShellProvider>,
    );
    const migas = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(within(migas).getByText("Carteras").getAttribute("aria-current")).toBe("page");
    expect(within(migas).getAllByRole("link", { name: "Cobranza" })[0].getAttribute("href")).toBe("/cobranza");
    const pestanas = screen.getByRole("navigation", { name: "Secciones" });
    expect(within(pestanas).getByRole("link", { name: "Carteras" }).getAttribute("aria-current")).toBe("page");
    expect(within(pestanas).getAllByRole("link").length).toBeGreaterThan(1);
  });

  it("en un detalle, el título es el último nivel y la sección enlaza", () => {
    ruta = "/cobranza/carteras/7";
    render(
      <ShellProvider permisos={TODO}>
        <PageHeader title="Cartera Norte" />
      </ShellProvider>,
    );
    const migas = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(within(migas).getAllByRole("link", { name: "Carteras" })[0].getAttribute("href")).toBe("/cobranza/carteras");
    expect(within(migas).getByText("Cartera Norte").getAttribute("aria-current")).toBe("page");
  });

  it("sin shell (catálogo, tests) no inventa migas ni pestañas", () => {
    ruta = "/cobranza/carteras";
    render(<PageHeader title="Carteras" />);
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});
