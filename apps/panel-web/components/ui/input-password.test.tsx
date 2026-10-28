// @vitest-environment jsdom
import type { FormEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { InputPassword } from "./input-password";

afterEach(cleanup);

describe("InputPassword", () => {
  it("arranca oculto y el ojo lo muestra y lo vuelve a ocultar", () => {
    render(<InputPassword id="clave" aria-label="Contraseña" defaultValue="secreta" />);
    const campo = screen.getByLabelText("Contraseña") as HTMLInputElement;
    expect(campo.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(campo.type).toBe("text");
    expect(
      screen.getByRole("button", { name: "Ocultar contraseña" }).getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(screen.getByRole("button", { name: "Ocultar contraseña" }));
    expect(campo.type).toBe("password");
  });

  it("el ojo no envía el formulario", () => {
    const enviar = vi.fn((event: FormEvent) => event.preventDefault());
    render(
      <form onSubmit={enviar}>
        <InputPassword id="clave" aria-label="Contraseña" />
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(enviar).not.toHaveBeenCalled();
  });
});
