import { describe, expect, it } from "vitest";

import {
  LEYENDA_DEL_CHAT,
  RESPUESTA_SIN_HABILIDAD,
  respuestaDePrueba,
  rotuloDePruebas,
  saludoDePrueba,
  sugerenciasPorEstacion,
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

describe("chat simulado por estación (HU-UX-24)", () => {
  const TIPOS = ["ventas", "agenda", "cobranza", "suscripciones"] as const;
  const ESTACIONES = ["negocio", "tipo", "habilidades", "datos-cliente", "datos-probar", "revisar"] as const;
  const CARGADOS = [
    { tipo: "producto", nombre: "Torta de zanahoria", detalle: "$ 45.000 · Porción para 8" },
    { tipo: "producto", nombre: "Pan de masa madre", detalle: "$ 18.000" },
    { tipo: "tipo", nombre: "Degustación", detalle: "45 min" },
    { tipo: "cliente", nombre: "Andrés Rojas", detalle: "Saldo $ 350.000" },
    { tipo: "plan", nombre: "Trimestral", detalle: "$ 330.000" },
  ];
  const CONTEXTO = { agente: "Laura", negocio: "Panadería La Espiga", cargados: CARGADOS };
  const textos = (m: ReturnType<typeof respuestaDePrueba>) =>
    m.flatMap((x) => (x.tipo === "tarjeta" ? [x.texto, ...x.filas.flatMap((f) => [f.nombre, f.detalle ?? ""])] : [x.texto]));

  it("cada estación y tipo tiene sus mensajes de prueba y su rótulo", () => {
    for (const tipo of TIPOS) {
      for (const estacion of ESTACIONES) {
        expect(sugerenciasPorEstacion(tipo, estacion).length).toBeGreaterThanOrEqual(1);
      }
    }
    expect(sugerenciasPorEstacion("ventas", "datos-cliente").map((s) => s.texto)).toEqual([
      "Quiero un domicilio",
      "Paso a recoger",
    ]);
    expect(sugerenciasPorEstacion("agenda", "habilidades").map((s) => s.texto)).toContain("Quiero agendar una cita");
    expect(rotuloDePruebas("datos-cliente")).toBe("Pruebas de «Datos del cliente» · toca una");
    expect(rotuloDePruebas("tipo")).toBe("Pruebas de «Tipo» · toca una");
  });

  it("en las estaciones 1 a 3 no hay cifras ni productos, aunque haya algo cargado", () => {
    for (const tipo of TIPOS) {
      expect(saludoDePrueba(tipo, "Laura", "Panadería La Espiga").texto).not.toMatch(/\d/);
      for (const estacion of ["negocio", "tipo", "habilidades", "datos-cliente"] as const) {
        for (const s of sugerenciasPorEstacion(tipo, estacion, CARGADOS)) {
          expect(s.texto).not.toMatch(/\d/);
          const respuesta = respuestaDePrueba(tipo, estacion, s.id, CONTEXTO);
          expect(respuesta.some((m) => m.tipo === "tarjeta")).toBe(false);
          for (const t of textos(respuesta)) {
            expect(t, `${tipo}/${estacion}/${s.id}`).not.toMatch(/\d/);
            expect(t).not.toMatch(/Torta de zanahoria|Pan de masa madre/);
          }
        }
      }
    }
  });

  it("en la estación 4 solo usa el precio de lo cargado", () => {
    const sugerencias = sugerenciasPorEstacion("ventas", "datos-probar", CARGADOS);
    expect(sugerencias.map((s) => s.texto)).toEqual(["¿Qué tienen hoy?", "¿Cuánto vale Torta de zanahoria?", "¿Cuánto vale Pan de masa madre?"]);
    const precio = respuestaDePrueba("ventas", "datos-probar", sugerencias[1].id, CONTEXTO);
    expect(precio[1]).toEqual({
      tipo: "tarjeta",
      texto: "Torta de zanahoria",
      filas: [{ nombre: "Torta de zanahoria", detalle: "$ 45.000 · Porción para 8" }],
    });
    for (const tipo of TIPOS) {
      for (const estacion of ["datos-probar", "revisar"] as const) {
        for (const s of sugerenciasPorEstacion(tipo, estacion, CARGADOS)) {
          const cifras = textos(respuestaDePrueba(tipo, estacion, s.id, CONTEXTO)).join(" ").match(/[\d.]+/g) ?? [];
          const cargadas = CARGADOS.map((c) => c.detalle).join(" ");
          for (const c of cifras) expect(cargadas, `${tipo}/${estacion}/${s.id}`).toContain(c);
        }
      }
    }
  });

  it("sin nada cargado invita a cargar, sin inventar", () => {
    const [catalogo] = sugerenciasPorEstacion("ventas", "datos-probar");
    const respuesta = respuestaDePrueba("ventas", "datos-probar", catalogo.id, { agente: "Laura", negocio: "La Espiga" });
    expect(respuesta).toEqual([{ tipo: "agente", texto: "Cuando cargues tus productos, aquí los muestro con el precio que les pongas." }]);
  });

  it("habla con el nombre del agente y del negocio, y una respuesta desconocida pasa a una persona", () => {
    const [quien] = sugerenciasPorEstacion("agenda", "tipo");
    expect(respuestaDePrueba("agenda", "tipo", quien.id, { agente: "Tomás", negocio: "La Espiga" })[0].texto).toBe(
      "Soy Tomás, de La Espiga. Agendo, cambio y confirmo citas.",
    );
    expect(respuestaDePrueba("ventas", "revisar", "otra-cosa", CONTEXTO)).toEqual([{ tipo: "agente", texto: RESPUESTA_SIN_HABILIDAD }]);
    expect(LEYENDA_DEL_CHAT).toBe("Es una vista previa: no le escribe a nadie");
  });
});
