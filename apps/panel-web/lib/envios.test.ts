import { describe, expect, it } from "vitest";

import { conteoDelEnvio, faltaVariable, textoDeEjemplo, variablesIniciales } from "./envios";

describe("envíos a un segmento", () => {
  it("la primera variable propone el nombre del cliente", () => {
    expect(variablesIniciales(["1", "2"])).toEqual({
      "1": { fuente: "cliente.nombre", valor: "" },
      "2": { fuente: "fijo", valor: "" },
    });
  });

  it("pide los valores fijos vacíos", () => {
    expect(faltaVariable({ "1": { fuente: "cliente.nombre", valor: "" }, "2": { fuente: "fijo", valor: " " } })).toBe(
      "Completa la variable {{2}}.",
    );
    expect(faltaVariable({ "1": { fuente: "fijo", valor: "20%" } })).toBeNull();
  });

  it("muestra el texto con los valores y el nombre marcado", () => {
    expect(
      textoDeEjemplo("Hola {{1}}, esta semana {{2}} y {{3}}.", {
        "1": { fuente: "cliente.nombre", valor: "amigo" },
        "2": { fuente: "fijo", valor: "20% en todo" },
      }),
    ).toBe("Hola [nombre del cliente], esta semana 20% en todo y {{3}}.");
  });

  it("ordena el conteo por el recorrido del mensaje", () => {
    expect(conteoDelEnvio({ read: 1, omitido: 2, queued: 3, raro: 1 })).toEqual([
      { label: "En cola", total: 3 },
      { label: "Leídos", total: 1 },
      { label: "Omitidos", total: 2 },
      { label: "raro", total: 1 },
    ]);
  });
});
