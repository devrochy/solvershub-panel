import { describe, expect, it } from "vitest";

import { leerJson, leerObjetoJson, planDeFormulario, textoAValor, valorATexto, type Campo } from "@/lib/plantillas-opciones-formulario";

function campos(schema: unknown): Campo[] {
  const plan = planDeFormulario(schema);
  if (plan.tipo !== "campos") throw new Error(`cayó a JSON: ${plan.motivo}`);
  return plan.campos;
}

describe("planDeFormulario · tipos básicos", () => {
  it("pinta texto, número, entero y booleano con título, ayuda y obligatorio", () => {
    const c = campos({
      type: "object",
      properties: {
        nota: { type: "string", title: "Nota para el cliente", description: "Se muestra tal cual", maxLength: 80 },
        monto: { type: "number", minimum: 0, maximum: 100 },
        cantidad: { type: "integer" },
        aviso: { type: "boolean" },
      },
      required: ["monto"],
    });
    expect(c.map((x) => [x.nombre, x.tipo, x.requerido])).toEqual([
      ["nota", "texto", false],
      ["monto", "numero", true],
      ["cantidad", "entero", false],
      ["aviso", "booleano", false],
    ]);
    expect(c[0]).toMatchObject({ titulo: "Nota para el cliente", ayuda: "Se muestra tal cual", maxLength: 80 });
    expect(c[1]).toMatchObject({ min: 0, max: 100 });
    expect(c[2].titulo).toBe("Cantidad");
  });

  it("un texto largo o con formato textarea usa el área de texto", () => {
    const c = campos({ type: "object", properties: { a: { type: "string", format: "textarea" }, b: { type: "string", maxLength: 500 } } });
    expect(c.map((x) => x.tipo)).toEqual(["textoLargo", "textoLargo"]);
  });

  it("un enum es una lista de elección con sus etiquetas", () => {
    const [c] = campos({
      type: "object",
      properties: { estado: { type: "string", enum: ["a", "b"], "x-enumLabels": ["Alfa", "Beta"] } },
    });
    expect(c).toMatchObject({ tipo: "elegir", opciones: [{ valor: "a", etiqueta: "Alfa" }, { valor: "b", etiqueta: "Beta" }] });
  });

  it("un anyOf con null es un campo opcional del tipo de la otra variante", () => {
    const [c] = campos({ type: "object", properties: { dias: { anyOf: [{ type: "integer" }, { type: "null" }] } }, required: ["dias"] });
    expect(c).toMatchObject({ tipo: "entero", requerido: false });
  });

  it("una lista de textos o números se pinta como una por línea", () => {
    const c = campos({ type: "object", properties: { etiquetas: { type: "array", items: { type: "string" } }, ids: { type: "array", items: { type: "integer" } } } });
    expect(c).toMatchObject([{ tipo: "lista", item: "texto" }, { tipo: "lista", item: "numero" }]);
  });

  it("una tool sin argumentos no pide nada", () => {
    expect(campos({ type: "object", properties: {} })).toEqual([]);
    expect(campos({})).toEqual([]);
  });
});

describe("planDeFormulario · anidados y referencias", () => {
  it("un objeto con propiedades se pinta como grupo con sus campos", () => {
    const [g] = campos({
      type: "object",
      properties: {
        direccion: {
          type: "object",
          properties: { calle: { type: "string" }, piso: { type: "integer" } },
          required: ["calle"],
        },
      },
    });
    expect(g).toMatchObject({ tipo: "grupo", campos: [{ nombre: "calle", tipo: "texto", requerido: true }, { nombre: "piso", tipo: "entero" }] });
  });

  it("resuelve un $ref local a $defs", () => {
    const c = campos({
      type: "object",
      $defs: { Prioridad: { type: "string", enum: ["alta", "baja"] } },
      properties: { prioridad: { $ref: "#/$defs/Prioridad", description: "Urgencia" } },
    });
    expect(c[0]).toMatchObject({ tipo: "elegir", ayuda: "Urgencia", opciones: [{ valor: "alta" }, { valor: "baja" }] });
  });

  it("un $ref que no resuelve cae a JSON solo en ese campo, sin romper el resto", () => {
    const c = campos({
      type: "object",
      properties: { raro: { $ref: "https://ejemplo.com/esquema.json" }, nota: { type: "string" } },
    });
    expect(c[0]).toMatchObject({ nombre: "raro", tipo: "json" });
    expect(c[1].tipo).toBe("texto");
  });

  it("una referencia circular no cuelga el generador", () => {
    const c = campos({
      type: "object",
      $defs: { A: { $ref: "#/$defs/A" } },
      properties: { a: { $ref: "#/$defs/A" } },
    });
    expect(c[0].tipo).toBe("json");
  });

  it("oneOf, objetos libres, listas de objetos y tipos desconocidos caen a JSON por campo", () => {
    const c = campos({
      type: "object",
      properties: {
        a: { oneOf: [{ type: "string" }, { type: "integer" }] },
        b: { type: "object", additionalProperties: true },
        c: { type: "array", items: { type: "object", properties: { x: { type: "string" } } } },
        d: { title: "Sin tipo" },
        e: { type: "string", enum: ["x"] },
      },
    });
    expect(c.map((x) => x.tipo)).toEqual(["json", "json", "json", "json", "elegir"]);
    expect(c[3]).toMatchObject({ titulo: "Sin tipo" });
  });

  it("más de dos niveles de objetos anidados caen a JSON", () => {
    const c = campos({
      type: "object",
      properties: {
        n1: { type: "object", properties: { n2: { type: "object", properties: { n3: { type: "object", properties: { x: { type: "string" } } } } } } },
      },
    });
    const n1 = c[0];
    expect(n1.tipo).toBe("grupo");
    const n2 = n1.tipo === "grupo" ? n1.campos[0] : null;
    expect(n2?.tipo).toBe("grupo");
    expect(n2?.tipo === "grupo" ? n2.campos[0].tipo : null).toBe("json");
  });
});

describe("planDeFormulario · caída al editor JSON", () => {
  it("un schema que no es un objeto cae a JSON del conjunto", () => {
    expect(planDeFormulario(null).tipo).toBe("json");
    expect(planDeFormulario("texto").tipo).toBe("json");
    expect(planDeFormulario({ type: "array", items: { type: "string" } }).tipo).toBe("json");
    expect(planDeFormulario({ oneOf: [{ type: "object" }, { type: "string" }] }).tipo).toBe("json");
    expect(planDeFormulario({ $ref: "#/$defs/NoExiste" }).tipo).toBe("json");
  });

  it("un schema raíz que es un $ref a un objeto se pinta", () => {
    const plan = planDeFormulario({
      $ref: "#/$defs/Args",
      $defs: { Args: { type: "object", properties: { nombre: { type: "string" } }, required: ["nombre"] } },
    });
    expect(plan).toMatchObject({ tipo: "campos", campos: [{ nombre: "nombre", requerido: true }] });
  });
});

describe("valores del formulario", () => {
  const num = { nombre: "n", titulo: "N", requerido: false, tipo: "numero" } as const;
  const lista = { nombre: "l", titulo: "L", requerido: false, tipo: "lista", item: "texto" } as const;

  it("un número vacío o inválido es «sin valor», no cero ni texto", () => {
    expect(textoAValor(num, "")).toBeUndefined();
    expect(textoAValor(num, "12.5")).toBe(12.5);
    expect(textoAValor(num, "abc")).toBeUndefined();
    expect(textoAValor(num, "0")).toBe(0);
  });

  it("una lista parte por líneas y descarta las vacías", () => {
    expect(textoAValor(lista, "a\n\n b \n")).toEqual(["a", "b"]);
    expect(textoAValor(lista, " \n")).toBeUndefined();
    expect(textoAValor({ ...lista, item: "numero" }, "1\n2")).toEqual([1, 2]);
    expect(textoAValor({ ...lista, item: "numero" }, "1\nx")).toBeUndefined();
  });

  it("el valor vuelve a texto para el campo", () => {
    expect(valorATexto(lista, ["a", "b"])).toBe("a\nb");
    expect(valorATexto(num, 3)).toBe("3");
    expect(valorATexto(num, undefined)).toBe("");
    expect(valorATexto({ tipo: "json" }, { a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it("valida el JSON: vacío vale, roto no, y el conjunto debe ser un objeto", () => {
    expect(leerJson("")).toEqual({ ok: true, valor: undefined });
    expect(leerJson('{"a":1}')).toEqual({ ok: true, valor: { a: 1 } });
    expect(leerJson("{roto")).toEqual({ ok: false });
    expect(leerObjetoJson("")).toEqual({ ok: true, valor: {} });
    expect(leerObjetoJson('{"a":1}')).toEqual({ ok: true, valor: { a: 1 } });
    expect(leerObjetoJson("[1]")).toMatchObject({ ok: false });
    expect(leerObjetoJson("{")).toMatchObject({ ok: false, motivo: "El JSON no es válido." });
  });
});
