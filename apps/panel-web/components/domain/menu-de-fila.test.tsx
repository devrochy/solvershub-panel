// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

class ResizeObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverFalso);
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.releasePointerCapture = () => undefined;
  window.HTMLElement.prototype.setPointerCapture = () => undefined;
  window.HTMLElement.prototype.scrollIntoView = () => undefined;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function FilaConDialogo() {
  const [editando, setEditando] = useState(false);
  return (
    <>
      <MenuDeFila etiqueta="Más acciones de Control">
        <DropdownMenuItem onSelect={() => setEditando(true)}>Editar</DropdownMenuItem>
      </MenuDeFila>
      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent title="Editar Control">
          <input aria-label="Nombre" />
        </DialogContent>
      </Dialog>
    </>
  );
}

describe("MenuDeFila", () => {
  it("al cerrar un diálogo abierto desde un ítem, el foco vuelve al botón del menú", async () => {
    render(<FilaConDialogo />);
    const disparador = screen.getByRole("button", { name: "Más acciones de Control" });
    disparador.focus();
    fireEvent.pointerDown(disparador, { button: 0, ctrlKey: false, pointerType: "mouse" });
    const item = await screen.findByRole("menuitem", { name: "Editar" });
    item.focus();
    fireEvent.click(item);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(disparador));
  });
});
