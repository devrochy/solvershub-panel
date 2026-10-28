// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { InputPassword } from "./input-password";

afterEach(cleanup);

describe("InputPassword", () => {
  it("arranca oculto y el ojo alterna el tipo y aria-pressed", () => {
    render(<InputPassword id="clave" name="clave" autoComplete="new-password" />);
    const campo = document.getElementById("clave") as HTMLInputElement;
    expect(campo.type).toBe("password");

    const boton = screen.getByRole("button", { name: "Mostrar contraseña" });
    expect(boton.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(boton);
    expect(campo.type).toBe("text");
    const ocultar = screen.getByRole("button", { name: "Ocultar contraseña" });
    expect(ocultar.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(ocultar);
    expect(campo.type).toBe("password");
  });

  it("conserva los atributos del campo y no envía el formulario al tocar el ojo", () => {
    let enviado = false;
    render(
      <form onSubmit={(e) => { e.preventDefault(); enviado = true; }}>
        <InputPassword id="pin" name="pin" inputMode="numeric" maxLength={6} autoComplete="off" />
      </form>,
    );
    const campo = document.getElementById("pin") as HTMLInputElement;
    expect(campo.name).toBe("pin");
    expect(campo.maxLength).toBe(6);
    expect(campo.autocomplete).toBe("off");
    fireEvent.click(screen.getByRole("button"));
    expect(enviado).toBe(false);
  });

  it("la etiqueta cambia el nombre accesible del botón", () => {
    render(<InputPassword id="pin" etiqueta="PIN" />);
    expect(screen.getByRole("button", { name: "Mostrar PIN" })).toBeTruthy();
  });
});
