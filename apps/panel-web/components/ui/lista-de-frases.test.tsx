// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { ListaDeFrases } from "./lista-de-frases";

afterEach(cleanup);

function Caja({ inicial = [], minLargo, alEnviar }: { inicial?: string[]; minLargo?: number; alEnviar?: () => void }) {
  const [frases, setFrases] = useState(inicial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        alEnviar?.();
      }}
    >
      <ListaDeFrases
        id="frases"
        frases={frases}
        onChange={setFrases}
        placeholder="frase"
        agregarLabel="Agregar"
        minLargo={minLargo}
      />
      <output data-testid="estado">{JSON.stringify(frases)}</output>
    </form>
  );
}

const entrada = () => screen.getByPlaceholderText("frase") as HTMLInputElement;
const estado = () => JSON.parse(screen.getByTestId("estado").textContent ?? "[]") as string[];
const escribir = (texto: string) => fireEvent.change(entrada(), { target: { value: texto } });

describe("ListaDeFrases", () => {
  it("agrega una frase con espacios y comas, y limpia el campo", () => {
    render(<Caja />);
    escribir("no, gracias señor");
    expect(entrada().value).toBe("no, gracias señor");
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    expect(estado()).toEqual(["no, gracias señor"]);
    expect(entrada().value).toBe("");
  });

  it("Enter agrega la frase y no envía el formulario", () => {
    let enviado = false;
    render(<Caja alEnviar={() => (enviado = true)} />);
    escribir("te lo regalo");
    fireEvent.keyDown(entrada(), { key: "Enter" });
    expect(estado()).toEqual(["te lo regalo"]);
    expect(enviado).toBe(false);
  });

  it("no duplica una frase repetida (sin importar mayúsculas ni tildes)", () => {
    render(<Caja inicial={["Sin falta"]} />);
    escribir("sin FALTA");
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    expect(estado()).toEqual(["Sin falta"]);
  });

  it("quita una frase con su ✕", () => {
    render(<Caja inicial={["uno solo", "otra frase"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Quitar «uno solo»" }));
    expect(estado()).toEqual(["otra frase"]);
  });

  it("respeta el largo mínimo", () => {
    render(<Caja minLargo={2} />);
    const agregar = screen.getByRole("button", { name: "Agregar" }) as HTMLButtonElement;
    escribir("a");
    expect(agregar.disabled).toBe(true);
    escribir("ya");
    expect(agregar.disabled).toBe(false);
    fireEvent.click(agregar);
    expect(estado()).toEqual(["ya"]);
  });

  it("con el largo mínimo por defecto (3) rechaza una palabra de dos letras", () => {
    render(<Caja />);
    escribir("ya");
    expect((screen.getByRole("button", { name: "Agregar" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
