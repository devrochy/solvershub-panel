// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { RecorridoDelAgente } from "@/components/domain/agentes/recorrido/recorrido-del-agente";
import { VistaPreviaWhatsApp } from "@/components/domain/agentes/recorrido/vista-previa-whatsapp";
import { BarraDePasos } from "@/components/ui/barra-de-pasos";
import { violacionesGraves } from "@/lib/testing/axe";
import { RESPUESTA_SIN_HABILIDAD, conversacionDeHabilidad } from "@/lib/vista-previa";

afterEach(cleanup);

const PASOS = [
  { id: "identidad", titulo: "Identidad" },
  { id: "voz", titulo: "Cómo habla", marca: "cambios" as const },
  { id: "reglas", titulo: "Horario y reglas", corto: "Horario" },
  { id: "flujo", titulo: "Flujo de atención", corto: "Flujo", marca: "revisar" as const },
];

/** La barra se pinta dos veces (escritorio y móvil, una oculta por CSS): jsdom no aplica el CSS. */
function segmentos() {
  return within(screen.getByRole("navigation", { name: "Pasos" })).getAllByRole("list")[0];
}

describe("BarraDePasos", () => {
  it("dice en qué paso va y marca el actual", () => {
    render(<BarraDePasos pasos={PASOS} actual="reglas" modo="libre" onIr={() => {}} etiqueta="Pasos" />);
    expect(screen.getByText("Paso 3 de 4 · Horario")).toBeTruthy();
    const actual = within(segmentos()).getByText("Horario").closest("[aria-current]");
    expect(actual?.getAttribute("aria-current")).toBe("step");
  });

  it("en modo libre deja ir a cualquier paso y anuncia las marcas con texto", () => {
    const onIr = vi.fn();
    render(<BarraDePasos pasos={PASOS} actual="identidad" modo="libre" onIr={onIr} etiqueta="Pasos" />);
    const lista = segmentos();
    fireEvent.click(within(lista).getByRole("button", { name: /Flujo, revisar/ }));
    expect(onIr).toHaveBeenCalledWith("flujo");
    expect(within(lista).getByRole("button", { name: /Cómo habla, con cambios/ })).toBeTruthy();
  });

  it("en orden solo deja volver a pasos recorridos", () => {
    const onIr = vi.fn();
    render(<BarraDePasos pasos={PASOS} actual="reglas" modo="en-orden" onIr={onIr} etiqueta="Pasos" />);
    const botones = within(segmentos()).getAllByRole("button");
    expect(botones.map((b) => b.textContent)).toEqual(["Identidad", "Cómo habla, con cambios"]);
    fireEvent.click(botones[0]);
    expect(onIr).toHaveBeenCalledWith("identidad");
  });
});

describe("VistaPreviaWhatsApp", () => {
  it("cambia la respuesta al apagar un superpoder", () => {
    function Demo() {
      const [activa, setActiva] = useState(true);
      const habilidad = { id: "a", titulo: "Agendar citas", activa, frases: ["¿Tienen cita el sábado?"] };
      return (
        <>
          <button type="button" onClick={() => setActiva((v) => !v)}>
            Alternar
          </button>
          <VistaPreviaWhatsApp negocio="Estudio Lumen" agente="Sofía" mensajes={conversacionDeHabilidad(habilidad)} />
        </>
      );
    }
    render(<Demo />);
    const telefono = screen.getByRole("region", { name: "Vista previa en WhatsApp" });
    expect(within(telefono).getByText(/te ayudo con eso: agendar citas/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Alternar" }));
    expect(within(telefono).getByText(RESPUESTA_SIN_HABILIDAD)).toBeTruthy();
    expect(screen.getByText("Así respondería · vista previa, no envía mensajes")).toBeTruthy();
  });

  it("las sugerencias prueban una frase", () => {
    const onUsar = vi.fn();
    render(
      <VistaPreviaWhatsApp
        negocio="Estudio Lumen"
        agente="Sofía"
        mensajes={[]}
        sugerencias={[{ id: "s", texto: "¿Cuánto vale?", activa: false, onUsar }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "«¿Cuánto vale?»" }));
    expect(onUsar).toHaveBeenCalled();
  });
});

describe("RecorridoDelAgente", () => {
  function Recorrido({ modo = "libre" as "libre" | "en-orden" }) {
    const [actual, setActual] = useState("identidad");
    return (
      <RecorridoDelAgente
        pasos={PASOS}
        actual={actual}
        modo={modo}
        onIr={setActual}
        pregunta={actual === "identidad" ? "¿Cómo se llama tu agente?" : "¿Cómo quieres que hable?"}
        vistaPrevia={{ negocio: "Estudio Lumen", agente: "Sofía", mensajes: [{ tipo: "agente", texto: "Hola" }] }}
        atras={{ texto: "Atrás", onClick: () => {}, deshabilitado: actual === "identidad" }}
        guardar={modo === "libre" ? { texto: "Guardar cambios", onClick: () => {} } : undefined}
        principal={{ texto: "Siguiente", onClick: () => setActual("voz") }}
      >
        <p>Contenido</p>
      </RecorridoDelAgente>
    );
  }

  it("lleva el foco a la pregunta al cambiar de paso, no al montar", () => {
    render(<Recorrido />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(document.activeElement).not.toBe(h1);
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    const nuevo = screen.getByRole("heading", { level: 1, name: "¿Cómo quieres que hable?" });
    expect(document.activeElement).toBe(nuevo);
  });

  it("al editar muestra «Guardar cambios»; al crear, no", () => {
    render(<Recorrido />);
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeTruthy();
    cleanup();
    render(<Recorrido modo="en-orden" />);
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
  });

  it("no tiene violaciones graves de axe", async () => {
    const { container } = render(<Recorrido />);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
