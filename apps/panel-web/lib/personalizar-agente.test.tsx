// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { BannerPersonalizar, BotonPersonalizar } from "@/components/domain/agentes/personalizar-agente";
import { claveDeNovedad, novedadVista } from "@/lib/novedad";
import { queryParaRedirigir, rutaDePersonalizar } from "@/lib/rutas-de-agente";
import { violacionesGraves } from "@/lib/testing/axe";

// HU-AOS-80 (D-SPEC-47-3): «Personalizar» con novedad, ruta canónica y redirect de /editar.

const redirect = vi.fn();
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

const AGENTE = "a-1";
const USUARIO = "u-1";
const CLAVE = claveDeNovedad("personalizar", USUARIO, AGENTE);

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  redirect.mockReset();
});

describe("rutas de Personalizar", () => {
  it("la ruta canónica conserva el paso y el modo", () => {
    expect(rutaDePersonalizar("a")).toBe("/agentes/a/personalizar");
    expect(rutaDePersonalizar("a", { paso: "publicar", modo: undefined })).toBe("/agentes/a/personalizar?paso=publicar");
  });

  it("/editar redirige a /personalizar con la misma query", async () => {
    const Pagina = (await import("@/app/(app)/agentes/[id]/editar/page")).default;
    await Pagina({
      params: Promise.resolve({ id: "a-9" }),
      searchParams: Promise.resolve({ paso: "publicar", modo: ["crear", "x"], vacio: "" }),
    });
    expect(redirect).toHaveBeenCalledWith("/agentes/a-9/personalizar?paso=publicar&modo=crear");
    expect(queryParaRedirigir({ tab: "sabe" })).toEqual({ tab: "sabe" });
  });
});

describe("botón Personalizar con novedad", () => {
  it("dice Personalizar, abre la ruta canónica y anuncia la novedad", async () => {
    const { container } = render(<BotonPersonalizar agenteId={AGENTE} usuarioId={USUARIO} />);
    const enlace = screen.getByRole("link", { name: "Personalizar" });
    expect(enlace.getAttribute("href")).toBe("/agentes/a-1/personalizar");
    const descrito = document.getElementById(enlace.getAttribute("aria-describedby") ?? "");
    expect(descrito?.textContent).toBe("Nuevo: personaliza tu agente aquí");
    expect(screen.getByTestId("punto-de-novedad")).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("al enfocarlo muestra la explicación una sola vez, sin robar el foco", () => {
    render(<BotonPersonalizar agenteId={AGENTE} usuarioId={USUARIO} />);
    const enlace = screen.getByRole("link", { name: "Personalizar" });
    act(() => enlace.focus());
    expect(screen.getByRole("dialog", { name: "Nuevo: personaliza tu agente aquí" })).toBeTruthy();
    expect(document.activeElement).toBe(enlace);
    fireEvent.click(screen.getByRole("button", { name: "Entendido" }));
    expect(novedadVista(CLAVE)).toBe(true);
    expect(screen.queryByTestId("punto-de-novedad")).toBeNull();
    expect(enlace.hasAttribute("aria-describedby")).toBe(false);
    fireEvent.focus(enlace);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ya vista para este usuario y agente, no hay punto ni explicación", () => {
    window.localStorage.setItem(CLAVE, "1");
    render(<BotonPersonalizar agenteId={AGENTE} usuarioId={USUARIO} />);
    expect(screen.queryByTestId("punto-de-novedad")).toBeNull();
    // Otro agente del mismo usuario sigue con su novedad.
    cleanup();
    render(<BotonPersonalizar agenteId="a-2" usuarioId={USUARIO} />);
    expect(screen.getByTestId("punto-de-novedad")).toBeTruthy();
  });
});

describe("banner de primera visita", () => {
  it("se descarta y no vuelve, y también descarta el punto", () => {
    render(
      <>
        <BannerPersonalizar agenteId={AGENTE} usuarioId={USUARIO} nombre="Ventas" />
        <BotonPersonalizar agenteId={AGENTE} usuarioId={USUARIO} />
      </>,
    );
    expect(screen.getByRole("status").textContent).toContain("«Editar» ahora se llama «Personalizar».");
    fireEvent.click(screen.getByRole("button", { name: "Descartar el aviso de Personalizar" }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByTestId("punto-de-novedad")).toBeNull();
  });
});
