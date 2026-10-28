// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { usePendientes } from "@/lib/frases-pendientes";

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

/** Un formulario como los reales: al enviar suma el texto escrito y no agregado antes de guardar. */
function Formulario({
  inicial = [],
  minLargo = 3,
  max = 10,
  alGuardar,
}: {
  inicial?: string[];
  minLargo?: number;
  max?: number;
  alGuardar: (frases: string[]) => void;
}) {
  const [frases, setFrases] = useState(inicial);
  const [aviso, setAviso] = useState("");
  const pendientes = usePendientes();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const p = pendientes.completar((id) => (id === "frases" ? frases : undefined));
        setAviso(p.errores.frases ?? "");
        if (p.errores.frases) return;
        const completas = p.listas.frases ?? frases;
        setFrases(completas);
        p.limpiar();
        alGuardar(completas);
      }}
    >
      <ListaDeFrases
        id="frases"
        frases={frases}
        onChange={setFrases}
        placeholder="frase"
        agregarLabel="Agregar"
        minLargo={minLargo}
        max={max}
        onPendiente={pendientes.registrar("frases")}
      />
      <button type="submit">Guardar</button>
      {aviso && <p role="alert">{aviso}</p>}
    </form>
  );
}

const guardar = () => fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

describe("texto pendiente al guardar", () => {
  it("guarda con la frase escrita y sin agregar, y deja el campo limpio", () => {
    const guardadas: string[][] = [];
    render(<Formulario inicial={["ya estaba"]} alGuardar={(f) => guardadas.push(f)} />);
    escribir("la que olvidé agregar");
    guardar();
    expect(guardadas).toEqual([["ya estaba", "la que olvidé agregar"]]);
    expect(entrada().value).toBe("");
    expect(screen.getByText("la que olvidé agregar")).toBeTruthy();
  });

  it("guarda lo mismo si no hay texto pendiente", () => {
    const guardadas: string[][] = [];
    render(<Formulario inicial={["ya estaba"]} alGuardar={(f) => guardadas.push(f)} />);
    guardar();
    expect(guardadas).toEqual([["ya estaba"]]);
  });

  it("una repetida escrita no duplica ni avisa", () => {
    const guardadas: string[][] = [];
    render(<Formulario inicial={["Sin falta"]} alGuardar={(f) => guardadas.push(f)} />);
    escribir("sin FALTA");
    guardar();
    expect(guardadas).toEqual([["Sin falta"]]);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("un texto demasiado corto avisa, no guarda y conserva lo escrito", () => {
    const guardadas: string[][] = [];
    render(<Formulario alGuardar={(f) => guardadas.push(f)} />);
    escribir("ab");
    guardar();
    expect(guardadas).toEqual([]);
    expect(screen.getByRole("alert").textContent).toContain("«ab»");
    expect(entrada().value).toBe("ab");
  });

  it("con la lista llena avisa y no guarda", () => {
    const guardadas: string[][] = [];
    render(<Formulario inicial={["uno", "dos"]} max={2} alGuardar={(f) => guardadas.push(f)} />);
    escribir("tres");
    guardar();
    expect(guardadas).toEqual([]);
    expect(screen.getByRole("alert").textContent).toContain("máximo de 2");
  });

  it("tras agregar con el botón ya no queda nada pendiente", () => {
    const guardadas: string[][] = [];
    render(<Formulario alGuardar={(f) => guardadas.push(f)} />);
    escribir("una frase");
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    guardar();
    expect(guardadas).toEqual([["una frase"]]);
  });

  it("agrega dos frases de solo emojis distintas", () => {
    render(<Caja inicial={["👍"]} minLargo={1} />);
    escribir("🙏");
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    expect(estado()).toEqual(["👍", "🙏"]);
  });
});
