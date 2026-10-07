// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ConfirmProvider, useConfirm } from "./confirm";

function BotonDePrueba() {
  const confirm = useConfirm();
  return (
    <button
      onClick={() => {
        void confirm({
          title: "Eliminar conexión",
          description: "Se eliminará la conexión y no se podrá deshacer.",
          confirmLabel: "Eliminar",
          destructive: true,
        });
      }}
      type="button"
    >
      pedir
    </button>
  );
}

describe("useConfirm (HU-UI-02)", () => {
  it("muestra la consecuencia y resuelve al confirmar", async () => {
    render(
      <ConfirmProvider>
        <BotonDePrueba />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "pedir" }));
    const dialogo = await screen.findByRole("alertdialog");
    expect(dialogo.textContent).toContain("Eliminar conexión");
    expect(dialogo.textContent).toContain("Se eliminará la conexión y no se podrá deshacer.");
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("Cancelar cierra sin confirmar", async () => {
    render(
      <ConfirmProvider>
        <BotonDePrueba />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "pedir" }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });
});
