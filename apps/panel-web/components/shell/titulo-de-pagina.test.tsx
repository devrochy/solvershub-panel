// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { PageHeader } from "@/components/ui/page-header";

import { TituloDePaginaProvider, ZonaDeTitulo, tituloFueraDeVista } from "./titulo-de-pagina";

vi.mock("next/navigation", () => ({
  usePathname: () => "/leads",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

afterEach(cleanup);

function rect(top: number, height = 32): DOMRect {
  return {
    top,
    bottom: top + height,
    left: 0,
    right: 0,
    width: 0,
    height,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

const negocio = { id: "t1", name: "Tienda Norte", role: "owner", active: true };

function montar() {
  return render(
    <TituloDePaginaProvider>
      <header>
        <ZonaDeTitulo current={negocio} count={1} />
      </header>
      <main id="contenido">
        <PageHeader title="Clientes" description="Tu cartera." />
      </main>
    </TituloDePaginaProvider>,
  );
}

/** Simula el scroll del `h1` hasta `top` y espera el frame en que se mide. */
async function desplazar(main: HTMLElement, top: number) {
  vi.spyOn(screen.getByRole("heading", { level: 1 }), "getBoundingClientRect").mockReturnValue(rect(top));
  await act(async () => {
    fireEvent.scroll(main);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
}

describe("Título de la página en la topbar", () => {
  it("mantiene un solo h1 y marca el de la barra como decorativo", () => {
    const { container } = montar();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const barra = container.querySelector('[data-titulo-barra="oculto"]');
    expect(barra).not.toBeNull();
    expect(barra?.getAttribute("aria-hidden")).toBe("true");
    expect(barra?.textContent).toBe("Clientes");
  });

  it("muestra el título cuando el h1 empieza a ocultarse y lo retira al subir", async () => {
    const { container } = montar();
    const main = container.querySelector<HTMLElement>("main#contenido")!;
    vi.spyOn(main, "getBoundingClientRect").mockReturnValue(rect(0));

    await desplazar(main, 12);
    expect(container.querySelector('[data-titulo-barra="oculto"]')).not.toBeNull();

    await desplazar(main, -12);
    expect(container.querySelector('[data-titulo-barra="visible"]')).not.toBeNull();

    // La histéresis evita el parpadeo justo en el umbral.
    await desplazar(main, 4);
    expect(container.querySelector('[data-titulo-barra="visible"]')).not.toBeNull();

    await desplazar(main, 12);
    expect(container.querySelector('[data-titulo-barra="oculto"]')).not.toBeNull();
  });

  it("sigue renderizando el h1 fuera del shell (catálogo y tests)", () => {
    render(<PageHeader title="Clientes" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Clientes");
  });
});

describe("tituloFueraDeVista", () => {
  it("exige un margen extra cuando ya se ve para no parpadear", () => {
    expect(tituloFueraDeVista(rect(4), rect(0), false)).toBe(false);
    expect(tituloFueraDeVista(rect(-1), rect(0), false)).toBe(true);
    expect(tituloFueraDeVista(rect(4), rect(0), true)).toBe(true);
    expect(tituloFueraDeVista(rect(10), rect(0), true)).toBe(false);
  });
});
