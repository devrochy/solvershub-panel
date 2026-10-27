// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import type { PrimerosPasos } from "@/lib/api/types";

import { Bienvenida } from "./bienvenida";

const PENDIENTE: PrimerosPasos = {
  alta_en: "2026-10-09T12:00:00Z",
  origen: "aprovisionamiento",
  completos: 0,
  total: 1,
  pasos: [{ clave: "whatsapp", estado: "pendiente", motivo: "sin_conexion", puede_actuar: true }],
  recorrido: { estado: "no_aplica", paso: 0, total_pasos: 0, aplica: false, abrir: false, avisar: false },
};

const LISTO: PrimerosPasos = {
  ...PENDIENTE,
  completos: 1,
  pasos: [{ clave: "whatsapp", estado: "completo", puede_actuar: true }],
};

function borrarCookies() {
  for (const nombre of ["panel_tour", "panel_pasos_plegados"]) {
    document.cookie = `${nombre}=; path=/; max-age=0`;
  }
}

describe("Bienvenida (HU-SH-06)", () => {
  beforeEach(borrarCookies);

  it("en la primera visita ofrece el recorrido y lo abre al aceptarlo", () => {
    render(<Bienvenida datos={PENDIENTE} ofrecerRecorrido />);
    expect(screen.getByRole("region", { name: "¿Primera vez aquí?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Empezar recorrido" }));
    expect(screen.getByRole("dialog").textContent).toContain("Tus primeros pasos");
  });

  it("«Ahora no» lo salta y no lo vuelve a ofrecer", () => {
    render(<Bienvenida datos={PENDIENTE} ofrecerRecorrido />);
    fireEvent.click(screen.getByRole("button", { name: "Ahora no" }));
    expect(screen.queryByRole("region", { name: "¿Primera vez aquí?" })).toBeNull();
    expect(document.cookie).toContain("panel_tour=saltado");
  });

  it("terminar el recorrido lo recuerda como completado", () => {
    render(<Bienvenida datos={PENDIENTE} ofrecerRecorrido={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver recorrido" }));
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Terminar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.cookie).toContain("panel_tour=completado");
  });

  it("a quien no puede resolver ningún paso no le muestra nada", () => {
    const soloLectura: PrimerosPasos = {
      ...PENDIENTE,
      pasos: [{ clave: "whatsapp", estado: "pendiente", motivo: "sin_conexion", puede_actuar: false }],
    };
    const { container } = render(<Bienvenida datos={soloLectura} ofrecerRecorrido={false} />);
    expect(container.textContent).toBe("");
  });

  it("con todos los pasos listos no muestra nada", () => {
    const { container } = render(<Bienvenida datos={LISTO} ofrecerRecorrido={false} />);
    expect(container.textContent).toBe("");
  });
});
