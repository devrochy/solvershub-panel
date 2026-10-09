// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { PASOS_DEL_TOUR } from "@/lib/tour";

import { TourGuiado } from "./tour-guiado";

function dialogo(): HTMLElement {
  return screen.getByRole("dialog");
}

describe("TourGuiado (HU-SH-06)", () => {
  it("recorre los 5 pasos con el botón y termina como completado", () => {
    const terminar = vi.fn();
    render(<TourGuiado onTerminar={terminar} />);

    for (const [i, paso] of PASOS_DEL_TOUR.entries()) {
      expect(dialogo().textContent).toContain(paso.titulo);
      expect(screen.getByRole("status").textContent).toBe(`Paso ${i + 1} de 5: ${paso.titulo}`);
      fireEvent.click(screen.getByRole("button", { name: i === 4 ? "Terminar" : "Siguiente" }));
    }
    expect(terminar).toHaveBeenCalledWith("completado");
  });

  it("se maneja con el teclado: flechas para moverse y Escape para saltarlo", () => {
    const terminar = vi.fn();
    render(<TourGuiado onTerminar={terminar} />);

    fireEvent.keyDown(dialogo(), { key: "ArrowRight" });
    expect(dialogo().textContent).toContain(PASOS_DEL_TOUR[1].titulo);
    fireEvent.keyDown(dialogo(), { key: "ArrowLeft" });
    expect(dialogo().textContent).toContain(PASOS_DEL_TOUR[0].titulo);
    fireEvent.keyDown(dialogo(), { key: "Escape" });
    expect(terminar).toHaveBeenCalledWith("saltado");
  });

  it("se puede saltar en cualquier paso", () => {
    const terminar = vi.fn();
    render(<TourGuiado onTerminar={terminar} />);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Saltar recorrido" }));
    expect(terminar).toHaveBeenCalledWith("saltado");
  });

  it("el foco arranca en el botón principal y no se puede retroceder desde el primero", async () => {
    render(<TourGuiado onTerminar={vi.fn()} />);
    await waitFor(() => expect(document.activeElement?.textContent).toBe("Siguiente"));
    expect((screen.getByRole("button", { name: "Anterior" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("describe el paso para el lector de pantalla", () => {
    render(<TourGuiado onTerminar={vi.fn()} />);
    const descripcion = document.getElementById(dialogo().getAttribute("aria-describedby") ?? "");
    expect(descripcion?.textContent).toBe(PASOS_DEL_TOUR[0].texto);
  });
});
