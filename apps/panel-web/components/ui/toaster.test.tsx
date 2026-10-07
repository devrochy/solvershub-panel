// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { Toaster } from "./toaster";
import { push, resetToasts } from "@/lib/toast-store";

describe("Toaster (HU-UI-02)", () => {
  beforeEach(() => resetToasts());

  it("éxito se anuncia con role=status", () => {
    render(<Toaster />);
    act(() => push("success", "Guardado."));
    expect(screen.getByRole("status").textContent).toContain("Guardado.");
  });

  it("error se anuncia con role=alert", () => {
    render(<Toaster />);
    act(() => push("error", "No se pudo guardar."));
    expect(screen.getByRole("alert").textContent).toContain("No se pudo guardar.");
  });

  it("se puede cerrar a mano", () => {
    render(<Toaster />);
    act(() => push("error", "Falló."));
    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(screen.queryByText("Falló.")).toBeNull();
  });
});
