import { describe, expect, it } from "vitest";

import { largoDeMaxLength, negocioParaLaMuestra, NOTA_ENVIO, NOTA_VELOCIDAD, resumenDeRitmo, TITULO_ENVIO } from "@/lib/voz-estilo";

describe("voz-estilo", () => {
  it("elige el largo de la muestra más cercano al tope guardado", () => {
    expect(largoDeMaxLength(300)).toBe("cortas");
    expect(largoDeMaxLength(350)).toBe("cortas");
    expect(largoDeMaxLength(400)).toBe("normal");
    expect(largoDeMaxLength(500)).toBe("normal");
    expect(largoDeMaxLength(900)).toBe("detalladas");
    expect(largoDeMaxLength(0)).toBe("detalladas");
  });

  it("resume velocidad y envío en una frase", () => {
    expect(resumenDeRitmo({ etiqueta: "Natural", nota: "espera 15 s" }, { etiqueta: "Un solo mensaje" })).toBe(
      "espera 15 s y envía un solo mensaje.",
    );
    expect(resumenDeRitmo({ etiqueta: "Inmediata", nota: "responde sin esperar" }, { etiqueta: "Varios mensajes cortos" })).toBe(
      "responde sin esperar y envía varios mensajes cortos.",
    );
    expect(resumenDeRitmo(null, { etiqueta: "Un solo mensaje" })).toBe("");
  });

  it("los nombres cortos cubren las opciones que se muestran", () => {
    expect(Object.keys(TITULO_ENVIO).sort()).toEqual(["pocos_cortos", "un_mensaje", "varios_cortos"]);
    expect(NOTA_ENVIO.un_mensaje).toContain("gasta menos");
    expect(NOTA_ENVIO.pocos_cortos).toBe("hasta 3 mensajes");
    expect(NOTA_VELOCIDAD.inmediato).toBe("sin esperar");
  });

  it("recorta la descripción del negocio sin cortar palabras a la mitad", () => {
    expect(negocioParaLaMuestra("Panadería artesanal en Manizales")).toBe("Panadería artesanal en Manizales");
    expect(negocioParaLaMuestra("Una descripción muy larga que no cabe en la muestra de voz")).toMatch(/…$/);
  });
});
