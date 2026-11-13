// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { NuevoAgenteBoton } from "@/app/(app)/agentes/_components/nuevo-agente-boton";

// El botón de Agentes: con cupo navega al asistente; al tope avisa y ofrece mejorar el plan.

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("Nuevo agente con el tope del plan", () => {
  it("con cupo enlaza al asistente", () => {
    render(<NuevoAgenteBoton aviso={null} />);
    expect(screen.getByRole("link", { name: "Nuevo agente" }).getAttribute("href")).toBe("/agentes/nuevo");
  });

  it("al tope abre el aviso y no navega", () => {
    render(<NuevoAgenteBoton aviso="Tu plan permite 1 agente publicado y ya tienes 1. Mejora tu plan para crear otro agente." />);
    fireEvent.click(screen.getByRole("button", { name: "Nuevo agente" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByText(/ya tienes 1/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mejorar mi plan" }).getAttribute("href")).toBe("/plan");
  });
});
