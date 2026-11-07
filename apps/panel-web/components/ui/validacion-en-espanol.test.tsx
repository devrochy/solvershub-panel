// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getToasts, resetToasts } from "@/lib/toast-store";

import { ValidacionEnEspanol } from "./validacion-en-espanol";

function Formulario({ onSubmit }: { onSubmit: () => void }) {
  return (
    <>
      <ValidacionEnEspanol />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <Field label="Nombre" htmlFor="nombre" required>
          <Input id="nombre" name="nombre" required />
        </Field>
        <label htmlFor="correo">Correo</label>
        <input id="correo" name="correo" type="email" />
        <label htmlFor="dias">Días de tolerancia</label>
        <input id="dias" name="dias" type="number" min={0} />
        <button type="submit">Guardar</button>
      </form>
    </>
  );
}

const mensajes = () => getToasts().map((t) => t.message);

beforeEach(() => {
  vi.useFakeTimers();
  resetToasts();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

async function enviar() {
  fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
  await act(async () => {
    vi.advanceTimersByTime(10);
  });
}

describe("ValidacionEnEspanol (HU-UX-13)", () => {
  it("cancela la burbuja nativa, avisa en español sobre el primer campo y no envía", async () => {
    const alEnviar = vi.fn();
    render(<Formulario onSubmit={alEnviar} />);

    fireEvent.change(screen.getByLabelText(/Correo/), { target: { value: "ana@" } });
    fireEvent.change(screen.getByLabelText(/Días/), { target: { value: "-1" } });
    await enviar();

    // Un solo aviso rojo: el primer campo inválido (en el orden del documento) y cuántos más hay.
    expect(mensajes()).toEqual(["«Nombre» es obligatorio. Revisa también otros 2 campos."]);
    expect(getToasts()[0].kind).toBe("error");
    expect(document.activeElement).toBe(screen.getByLabelText(/Nombre/));
    expect(screen.getByLabelText(/Nombre/).getAttribute("aria-invalid")).toBe("true");
    expect(alEnviar).not.toHaveBeenCalled();
  });

  it("dice qué falla en cada campo: correo y rango", async () => {
    render(<Formulario onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: "Ana" } });

    fireEvent.change(screen.getByLabelText(/Correo/), { target: { value: "ana@" } });
    await enviar();
    expect(mensajes().at(-1)).toMatch(/^Escribe un correo válido, por ejemplo ana@correo\.com\./);

    fireEvent.change(screen.getByLabelText(/Correo/), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText(/Días/), { target: { value: "-1" } });
    await enviar();
    expect(mensajes().at(-1)).toBe("«Días de tolerancia» debe ser mayor o igual a 0.");
  });

  it("al corregir el campo se quita la marca de error y el formulario se envía", async () => {
    const alEnviar = vi.fn();
    render(<Formulario onSubmit={alEnviar} />);
    await enviar();
    const nombre = screen.getByLabelText(/Nombre/);
    expect(nombre.getAttribute("aria-invalid")).toBe("true");

    fireEvent.input(nombre, { target: { value: "Ana" } });
    expect(nombre.hasAttribute("aria-invalid")).toBe(false);

    await enviar();
    expect(alEnviar).toHaveBeenCalledTimes(1);
  });

  it("no toca los formularios con noValidate", async () => {
    render(
      <>
        <ValidacionEnEspanol />
        <form noValidate onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="x">Campo</label>
          <input id="x" required />
          <button type="submit">Guardar</button>
        </form>
      </>,
    );
    await enviar();
    expect(mensajes()).toEqual([]);
  });
});
