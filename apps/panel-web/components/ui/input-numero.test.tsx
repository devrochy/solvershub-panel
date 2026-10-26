// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { InputNumero, acotarNumero, leerNumero, sinCerosIzquierda } from "./input-numero";

afterEach(cleanup);

function Caja({
  inicial,
  alCambiar,
  ...props
}: {
  inicial: number;
  alCambiar?: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  decimal?: boolean;
}) {
  const [valor, setValor] = useState(inicial);
  return (
    <>
      <InputNumero
        aria-label="campo"
        value={valor}
        onValueChange={(n) => {
          setValor(n);
          alCambiar?.(n);
        }}
        {...props}
      />
      <output data-testid="valor">{valor}</output>
      <button type="button" onClick={() => setValor(7)}>
        poner 7
      </button>
    </>
  );
}

const campo = () => screen.getByLabelText("campo") as HTMLInputElement;
const escribir = (texto: string) => fireEvent.change(campo(), { target: { value: texto } });
const valor = () => screen.getByTestId("valor").textContent;

describe("helpers de InputNumero", () => {
  it("sinCerosIzquierda quita los ceros que sobran y respeta 0 y decimales", () => {
    expect(sinCerosIzquierda("04")).toBe("4");
    expect(sinCerosIzquierda("007")).toBe("7");
    expect(sinCerosIzquierda("0")).toBe("0");
    expect(sinCerosIzquierda("0.5")).toBe("0.5");
    expect(sinCerosIzquierda("00,5")).toBe("0,5");
    expect(sinCerosIzquierda("-04")).toBe("-4");
    expect(sinCerosIzquierda("")).toBe("");
  });

  it("leerNumero acepta coma decimal y devuelve null si todavía no hay número", () => {
    expect(leerNumero("1,5")).toBe(1.5);
    expect(leerNumero("2.")).toBe(2);
    expect(leerNumero("")).toBeNull();
    expect(leerNumero("-")).toBeNull();
    expect(leerNumero(",")).toBeNull();
  });

  it("acotarNumero respeta mínimo y máximo opcionales", () => {
    expect(acotarNumero(9, 1, 5)).toBe(5);
    expect(acotarNumero(-3, 0)).toBe(0);
    expect(acotarNumero(3)).toBe(3);
  });
});

describe("InputNumero", () => {
  it("deja borrar el 0 y quedar vacío (no devuelve el 0 ni deja 04)", () => {
    render(<Caja inicial={0} min={0} max={10} />);
    expect(campo().value).toBe("0");
    escribir("");
    expect(campo().value).toBe("");
    escribir("4");
    expect(campo().value).toBe("4");
    expect(valor()).toBe("4");
  });

  it("si se teclea un dígito junto al 0, queda sin cero a la izquierda", () => {
    render(<Caja inicial={0} min={0} max={10} />);
    escribir("04");
    expect(campo().value).toBe("4");
    expect(valor()).toBe("4");
  });

  it("al salir vacío vuelve al último valor válido", () => {
    render(<Caja inicial={5} min={1} max={10} />);
    escribir("");
    fireEvent.blur(campo());
    expect(campo().value).toBe("5");
    expect(valor()).toBe("5");
  });

  it("manda el valor acotado a min/max aunque el texto siga a medias, y lo normaliza al salir", () => {
    render(<Caja inicial={100} min={50} max={5000} />);
    escribir("3");
    expect(valor()).toBe("50");
    expect(campo().value).toBe("3");
    fireEvent.blur(campo());
    expect(campo().value).toBe("50");
    escribir("99999");
    expect(valor()).toBe("5000");
  });

  it("no acepta letras, signos ni notación científica", () => {
    render(<Caja inicial={3} min={0} max={10} />);
    escribir("1e2");
    expect(campo().value).toBe("3");
    escribir("-1");
    expect(campo().value).toBe("3");
    escribir("1.5");
    expect(campo().value).toBe("3");
  });

  it("con decimal acepta punto y coma, y 0.5 no pierde su cero", () => {
    render(<Caja inicial={0.3} min={0} max={2} decimal step={0.1} />);
    escribir("0,5");
    expect(valor()).toBe("0.5");
    expect(campo().value).toBe("0,5");
    escribir("1.");
    expect(valor()).toBe("1");
    escribir("2.7");
    expect(valor()).toBe("2");
    fireEvent.blur(campo());
    expect(campo().value).toBe("2");
  });

  it("las flechas suben y bajan según el paso, sin errores de coma flotante", () => {
    render(<Caja inicial={0.2} min={0} max={2} decimal step={0.1} />);
    fireEvent.keyDown(campo(), { key: "ArrowUp" });
    expect(valor()).toBe("0.3");
    expect(campo().value).toBe("0.3");
    fireEvent.keyDown(campo(), { key: "ArrowDown" });
    fireEvent.keyDown(campo(), { key: "ArrowDown" });
    fireEvent.keyDown(campo(), { key: "ArrowDown" });
    expect(valor()).toBe("0");
  });

  it("se actualiza cuando el valor cambia desde afuera", () => {
    render(<Caja inicial={1} min={0} max={10} />);
    fireEvent.click(screen.getByText("poner 7"));
    expect(campo().value).toBe("7");
  });

  it("no repite el aviso si el valor no cambió", () => {
    const alCambiar = vi.fn();
    render(<Caja inicial={4} min={0} max={10} alCambiar={alCambiar} />);
    escribir("4");
    escribir("04");
    expect(alCambiar).not.toHaveBeenCalled();
  });

  it("con mínimo negativo permite escribir un signo menos", () => {
    render(<Caja inicial={0} min={-5} max={5} />);
    escribir("-");
    expect(campo().value).toBe("-");
    escribir("-3");
    expect(valor()).toBe("-3");
  });
});
