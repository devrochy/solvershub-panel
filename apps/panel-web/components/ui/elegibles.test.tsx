// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { FichaUnica, GrupoDeOpciones, TarjetaElegible } from "@/components/ui/elegibles";
import { violacionesGraves } from "@/lib/testing/axe";

afterEach(cleanup);

/** Grupo de la ruta de lanzamiento (HU-UX-24): una recomendada, una normal, una ocupada y una sin nota. */
function Grupo() {
  const [tipo, setTipo] = useState("agenda");
  return (
    <GrupoDeOpciones titulo="¿Qué quieres que haga tu agente?" unica>
      <TarjetaElegible
        nombre="tipo"
        valor="agenda"
        elegida={tipo === "agenda"}
        onElegir={setTipo}
        titulo="Agenda"
        ayuda="Agenda citas y entregas"
        icono={<svg />}
        baldosa
        etiqueta="Recomendado"
        razon="Laura ya vende; Tomás agenda."
      />
      <TarjetaElegible nombre="tipo" valor="cobranza" elegida={tipo === "cobranza"} onElegir={setTipo} titulo="Cobranza" icono={<svg />} baldosa />
      <TarjetaElegible
        nombre="tipo"
        valor="ventas"
        elegida={tipo === "ventas"}
        onElegir={setTipo}
        titulo="Ventas"
        icono={<svg />}
        baldosa
        deshabilitada
        nota="Ya tienes un agente «Ventas»: edítalo en vez de crear otro."
        accion={<a href="#laura">Editar a Laura</a>}
      />
      <TarjetaElegible nombre="tipo" valor="otro" elegida={false} onElegir={setTipo} titulo="Otro" deshabilitada />
    </GrupoDeOpciones>
  );
}

describe("TarjetaElegible en la ruta de lanzamiento", () => {
  it("el grupo es un radiogroup con nombre y opciones radio", () => {
    render(<Grupo />);
    const grupo = screen.getByRole("radiogroup", { name: "¿Qué quieres que haga tu agente?" });
    expect(within(grupo).getAllByRole("radio")).toHaveLength(4);
    expect((within(grupo).getByRole("radio", { name: /Agenda/ }) as HTMLInputElement).checked).toBe(true);
  });

  it("«Recomendado» es texto y la razón se lee con la opción", () => {
    render(<Grupo />);
    expect(screen.getByText("Recomendado")).toBeTruthy();
    const agenda = screen.getByRole("radio", { name: /Agenda/ });
    const razon = document.getElementById(agenda.getAttribute("aria-describedby") ?? "");
    expect(razon?.textContent).toBe("Laura ya vende; Tomás agenda.");
  });

  it("elegir con el teclado (espacio sobre el radio enfocado) cambia la opción", () => {
    render(<Grupo />);
    const cobranza = screen.getByRole("radio", { name: /Cobranza/ }) as HTMLInputElement;
    cobranza.focus();
    expect(document.activeElement).toBe(cobranza);
    fireEvent.click(cobranza);
    expect(cobranza.checked).toBe(true);
    expect((screen.getByRole("radio", { name: /Agenda/ }) as HTMLInputElement).checked).toBe(false);
  });

  it("la deshabilitada no se puede elegir y lee su nota; su enlace queda fuera del radio", () => {
    render(<Grupo />);
    const ventas = screen.getByRole("radio", { name: /Ventas/ }) as HTMLInputElement;
    expect(ventas.disabled).toBe(true);
    const nota = document.getElementById(ventas.getAttribute("aria-describedby") ?? "");
    expect(nota?.textContent).toBe("Ya tienes un agente «Ventas»: edítalo en vez de crear otro.");
    const enlace = screen.getByRole("link", { name: "Editar a Laura" });
    expect(enlace.closest("label")).toBeNull();
  });

  it("tocar la tarjeta deshabilitada no elige nada", () => {
    const onElegir = vi.fn();
    render(
      <TarjetaElegible nombre="t" valor="ventas" elegida={false} onElegir={onElegir} titulo="Ventas" deshabilitada nota="Ya tienes uno." />,
    );
    fireEvent.click(screen.getByText("Ventas"));
    expect(onElegir).not.toHaveBeenCalled();
  });

  it("sin las props nuevas se ve como antes: sin etiqueta, sin descripción y sin baldosa", () => {
    render(<TarjetaElegible nombre="t" valor="a" elegida={false} onElegir={() => {}} titulo="Vendo productos" ayuda="Cotiza." />);
    const radio = screen.getByRole("radio", { name: /Vendo productos/ });
    expect(radio.getAttribute("aria-describedby")).toBeNull();
    expect(screen.queryByText("Recomendado")).toBeNull();
  });

  it("no tiene violaciones graves de axe", async () => {
    const { container } = render(<Grupo />);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe("FichaUnica con inicial", () => {
  it("muestra la inicial y al elegirla pasa a ✓", () => {
    function Demo() {
      const [v, setV] = useState("Laura");
      return (
        <GrupoDeOpciones titulo="Ideas de nombre" unica>
          {["Laura", "Sofía"].map((n) => (
            <FichaUnica key={n} nombre="ideas" valor={n} elegida={v === n} onElegir={setV} inicial={n.charAt(0)}>
              {n}
            </FichaUnica>
          ))}
        </GrupoDeOpciones>
      );
    }
    render(<Demo />);
    const sofia = screen.getByRole("radio", { name: /Sofía/ });
    expect(sofia.closest("label")?.textContent).toBe("SSofía");
    fireEvent.click(sofia);
    expect(sofia.closest("label")?.textContent).toBe("Sofía");
    expect(sofia.closest("label")?.querySelector("svg")).toBeTruthy();
  });
});
