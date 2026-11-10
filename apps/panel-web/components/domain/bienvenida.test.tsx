// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import type { PrimerosPasos } from "@/lib/api/types";
import { RECORRIDO_NO_APLICA } from "@/lib/testing/fixtures";

import { Bienvenida } from "./bienvenida";

const PENDIENTE: PrimerosPasos = {
  recorrido: RECORRIDO_NO_APLICA,
  alta_en: "2026-10-09T12:00:00Z",
  origen: "aprovisionamiento",
  completos: 0,
  total: 1,
  pasos: [{ clave: "whatsapp", estado: "pendiente", motivo: "sin_conexion", puede_actuar: true }],
};

const LISTO: PrimerosPasos = {
  ...PENDIENTE,
  completos: 1,
  pasos: [{ clave: "whatsapp", estado: "completo", puede_actuar: true }],
};

describe("Bienvenida (HU-SH-06)", () => {
  it("es un solo bloque y el recorrido se abre desde los primeros pasos", () => {
    render(<Bienvenida datos={PENDIENTE} />);
    expect(screen.queryByText("¿Primera vez aquí?")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Ver recorrido del panel" }));
    expect(screen.getByRole("dialog").textContent).toContain("Tus primeros pasos");
  });

  it("terminar el recorrido lo cierra", () => {
    render(<Bienvenida datos={PENDIENTE} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver recorrido del panel" }));
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Terminar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("a quien no puede resolver ningún paso no le muestra nada", () => {
    const soloLectura: PrimerosPasos = {
      ...PENDIENTE,
      pasos: [{ clave: "whatsapp", estado: "pendiente", motivo: "sin_conexion", puede_actuar: false }],
    };
    const { container } = render(<Bienvenida datos={soloLectura} />);
    expect(container.textContent).toBe("");
  });

  it("con todos los pasos listos no muestra nada", () => {
    const { container } = render(<Bienvenida datos={LISTO} />);
    expect(container.textContent).toBe("");
  });
});
