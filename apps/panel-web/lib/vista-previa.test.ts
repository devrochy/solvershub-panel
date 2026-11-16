import { describe, expect, it } from "vitest";

import {
  RESPUESTA_SIN_HABILIDAD,
  conversacionDeFlujo,
  conversacionDeHabilidad,
  conversacionDeVoz,
  ultimosMensajes,
} from "@/lib/vista-previa";

describe("vista previa del recorrido del agente", () => {
  it("la voz cambia con el tono y la calidez", () => {
    const base = { tono: "cercano", calidez: 4, emojis: "none", largo: "normal" } as const;
    const cercana = conversacionDeVoz(base, "Sofía", "Estudio Lumen");
    const formal = conversacionDeVoz({ ...base, tono: "formal" }, "Sofía", "Estudio Lumen");
    const seca = conversacionDeVoz({ ...base, calidez: 0 }, "Sofía", "Estudio Lumen");

    expect(cercana[0]).toEqual({ tipo: "cliente", texto: "Hola, buenas" });
    expect(cercana[1].tipo).toBe("agente");
    expect(cercana[1].texto).toContain("Soy Sofía, de Estudio Lumen");
    expect(formal[1].texto).toContain("Le atiende Sofía");
    expect(seca[1].texto).not.toEqual(cercana[1].texto);
  });

  it("un superpoder activo lo resuelve y uno apagado pasa a una persona", () => {
    const habilidad = { id: "a", titulo: "Agendar citas", activa: true, frases: ["¿Tienen cita el sábado?"] };
    expect(conversacionDeHabilidad(habilidad)).toEqual([
      { tipo: "cliente", texto: "¿Tienen cita el sábado?" },
      { tipo: "agente", texto: "Claro, te ayudo con eso: agendar citas." },
    ]);
    const apagada = conversacionDeHabilidad({ ...habilidad, activa: false }, "Quiero una cita");
    expect(apagada[0].texto).toBe("Quiero una cita");
    expect(apagada[1].texto).toBe(RESPUESTA_SIN_HABILIDAD);
  });

  it("no inventa cifras", () => {
    const habilidad = { id: "p", titulo: "Servicios y precios", activa: true, frases: ["¿Cuánto vale?"] };
    expect(conversacionDeHabilidad(habilidad)[1].texto).not.toMatch(/\d/);
  });

  it("el flujo marca cada etapa y lo que hace en ella", () => {
    const mensajes = conversacionDeFlujo([
      { nombre: "Saludo", proposito: "Entiende qué busca." },
      { nombre: "", proposito: "" },
    ]);
    expect(mensajes).toEqual([
      { tipo: "etapa", texto: "1 · Saludo" },
      { tipo: "agente", texto: "Entiende qué busca." },
      { tipo: "etapa", texto: "2 · Etapa 2" },
    ]);
  });

  it("la hoja del móvil muestra las dos últimas burbujas, sin marcas de etapa", () => {
    const mensajes = conversacionDeFlujo([
      { nombre: "Saludo", proposito: "Saluda." },
      { nombre: "Cierre", proposito: "Despide." },
    ]);
    expect(ultimosMensajes(mensajes)).toEqual([
      { tipo: "agente", texto: "Saluda." },
      { tipo: "agente", texto: "Despide." },
    ]);
  });
});
