// @vitest-environment jsdom
// HU-CFG-13: la ficha del agente muestra la voz del negocio y sus límites, sin el interruptor muerto.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { PasoVoz } from "@/components/domain/agentes/recorrido/pasos";
import type { EstadoDelEditor } from "@/lib/agentes-editor";

afterEach(cleanup);

const estado = {
  frasesProhibidas: [],
  largoMaximo: 500,
} as unknown as EstadoDelEditor;

describe("PasoVoz de la ficha del agente", () => {
  it("muestra la voz del negocio y sus límites, sin el interruptor de herencia", () => {
    render(<PasoVoz estado={estado} cambiar={() => {}} errores={{}} vozDelNegocio="Cercano · calidez 4 · pocos emojis" />);

    expect(screen.getByText("La voz de tu negocio")).toBeTruthy();
    expect(screen.getByText(/Cercano · calidez 4 · pocos emojis/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Cambiar en Configuración" }).getAttribute("href")).toBe(
      "/configuracion?seccion=voz",
    );
    expect(screen.getByText("Frases que el agente nunca dice")).toBeTruthy();
    expect(screen.queryByText("Hablar con la voz de la conexión")).toBeNull();
  });
});
