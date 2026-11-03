import { describe, expect, it } from "vitest";

import {
  consultaDeColumna,
  desdeDeColumna,
  moverTarjeta,
  sumarPagina,
  tarjetaDeFila,
  type ColumnaDeEmbudo,
  type FilaDeLead,
  type TarjetaDeEmbudo,
} from "@/lib/embudo";

const tarjeta = (id: string, valor: number | null = null): TarjetaDeEmbudo => ({
  id,
  nombre: `Cliente ${id}`,
  puntaje: null,
  valor,
  actividad: null,
  vencido: false,
  href: `/leads?cliente=${id}&agente=ventas`,
});

const columna = (value: string, tarjetas: TarjetaDeEmbudo[], extra: Partial<ColumnaDeEmbudo> = {}): ColumnaDeEmbudo => ({
  value,
  label: value,
  total: tarjetas.length,
  suma: tarjetas.reduce((s, t) => s + (t.valor ?? 0), 0),
  tarjetas,
  entraron: [],
  hayMas: false,
  ...extra,
});

describe("consultaDeColumna", () => {
  it("pide la etapa de la columna con la página de 50 y conserva búsqueda, filtros y orden", () => {
    const qs = consultaDeColumna({
      agente: "ventas",
      q: " Ana ",
      filtros: ["clasificacion:fiel", "seguimiento:vencidos"],
      orden: "valor_desc",
      etapa: "estado_lead",
      valor: "calificado",
    });
    expect(qs.get("agente")).toBe("ventas");
    expect(qs.get("q")).toBe("Ana");
    expect(qs.getAll("filtro")).toEqual(["clasificacion:fiel", "seguimiento:vencidos", "estado_lead:calificado"]);
    expect(qs.get("orden")).toBe("valor_desc");
    expect(qs.get("page_size")).toBe("50");
    expect(qs.has("page")).toBe(false);
  });

  it("ignora la etapa que ya traía la URL y no repite el orden por defecto", () => {
    const qs = consultaDeColumna({
      agente: "ventas",
      filtros: "estado_lead:perdido",
      orden: "alta",
      etapa: "estado_lead",
      valor: "nuevo",
      pagina: 3,
    });
    expect(qs.getAll("filtro")).toEqual(["estado_lead:nuevo"]);
    expect(qs.has("orden")).toBe(false);
    expect(qs.get("page")).toBe("3");
  });
});

describe("tarjetaDeFila", () => {
  const fila = (extras: Record<string, unknown>): FilaDeLead =>
    ({
      id: "c1",
      perfil: { nombre_visible: "Ana Pérez" },
      ultima_actividad: "2026-11-01T10:00:00Z",
      extras,
    }) as unknown as FilaDeLead;

  it("toma puntaje, valor, actividad y marca el seguimiento vencido", () => {
    const t = tarjetaDeFila(
      fila({ puntaje: 72, valor_estimado: 250000, seguimiento_en: "2026-10-30T10:00:00Z", seguimiento_estado: "vencidos" }),
      "ventas",
    );
    expect(t).toMatchObject({ id: "c1", nombre: "Ana Pérez", puntaje: 72, valor: 250000, vencido: true });
    expect(t.actividad).toBe("2026-11-01T10:00:00Z");
    expect(t.href).toBe("/leads?cliente=c1&agente=ventas");
  });

  it("sin datos no inventa nada: puntaje y valor nulos, seguimiento no vencido", () => {
    const t = tarjetaDeFila(fila({ valor_estimado: null, seguimiento_en: "2026-12-01T10:00:00Z", seguimiento_estado: "mas_adelante" }), "ventas");
    expect(t).toMatchObject({ puntaje: null, valor: null, vencido: false });
  });
});

describe("moverTarjeta", () => {
  const base = () => [
    columna("nuevo", [tarjeta("a", 100), tarjeta("b", 50)], { total: 7, suma: 900 }),
    columna("calificado", [tarjeta("c", 10)]),
    columna("perdido", []),
  ];

  it("cambia cantidades y sumas con el total real de la columna, no con lo cargado", () => {
    const res = moverTarjeta(base(), "a", "calificado");
    const [nuevo, calificado] = res;
    expect(nuevo).toMatchObject({ total: 6, suma: 800 });
    expect(nuevo.tarjetas.map((t) => t.id)).toEqual(["b"]);
    expect(calificado).toMatchObject({ total: 2, suma: 110 });
    expect(calificado.tarjetas.map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("anota qué tarjetas llegaron a la columna y deja de anotarlas si vuelven a salir", () => {
    const [, calificado] = moverTarjeta(base(), "a", "calificado");
    expect(calificado.entraron).toEqual(["a"]);
    const res = moverTarjeta(moverTarjeta(base(), "a", "calificado"), "a", "perdido");
    expect(res.map((c) => c.entraron)).toEqual([[], [], ["a"]]);
  });

  it("una tarjeta sin valor mueve la cantidad pero no la suma", () => {
    const res = moverTarjeta([columna("nuevo", [tarjeta("a")]), columna("perdido", [])], "a", "perdido");
    expect(res[0]).toMatchObject({ total: 0, suma: 0 });
    expect(res[1]).toMatchObject({ total: 1, suma: 0 });
  });

  it("sin suma del servidor la deja en null", () => {
    const res = moverTarjeta([columna("nuevo", [tarjeta("a", 5)], { suma: null }), columna("perdido", [], { suma: null })], "a", "perdido");
    expect(res.map((c) => c.suma)).toEqual([null, null]);
  });

  it("devuelve las mismas columnas si la tarjeta no está, ya está ahí o el destino no existe", () => {
    const cols = base();
    expect(moverTarjeta(cols, "zzz", "calificado")).toBe(cols);
    expect(moverTarjeta(cols, "a", "nuevo")).toBe(cols);
    expect(moverTarjeta(cols, "a", "inexistente")).toBe(cols);
  });
});

describe("sumarPagina", () => {
  it("agrega las tarjetas nuevas, sube la página y no repite las que ya están en otra columna", () => {
    const cols = [columna("nuevo", [tarjeta("a")], { hayMas: true }), columna("calificado", [tarjeta("c")])];
    const res = sumarPagina(cols, "nuevo", [tarjeta("a"), tarjeta("c"), tarjeta("d")], false);
    expect(res[0].tarjetas.map((t) => t.id)).toEqual(["a", "d"]);
    expect(res[0]).toMatchObject({ hayMas: false });
    expect(res[1]).toBe(cols[1]);
  });
});

describe("desdeDeColumna", () => {
  it("sigue desde las tarjetas que la columna ya muestra, sin las que llegaron por un movimiento", () => {
    const cols = [columna("nuevo", [tarjeta("a"), tarjeta("b"), tarjeta("c")]), columna("perdido", [tarjeta("p")])];
    expect(desdeDeColumna(cols[0])).toBe(3);
    // «a» sale de Nuevo: el servidor ya no la cuenta ahí, así que la siguiente página empieza una posición antes.
    const tras = moverTarjeta(cols, "a", "perdido");
    expect(desdeDeColumna(tras[0])).toBe(2);
    // En Perdido, «a» llegó por el tablero: no cuenta para saber dónde seguir.
    expect(desdeDeColumna(tras[1])).toBe(1);
  });
});
