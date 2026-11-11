import { describe, expect, it } from "vitest";

import {
  agotadas,
  arbolDeCategorias,
  beneficioEnPalabras,
  coincide,
  conSubcategorias,
  cuandoFue,
  cuantosProductos,
  estadoDePromo,
  etiquetaDePromo,
  hrefProductos,
  inventarioEnPalabras,
  nombreDeVariante,
  otrosCambios,
  pagoDePedido,
  productosDelPedido,
  promoDelProducto,
  promoEnPalabras,
  siguientePaso,
  vendidoEnElMes,
  vigenciaEnPalabras,
  type PromoVenta,
} from "@/lib/ventas";

const AHORA = new Date(2026, 10, 10, 18, 0);

describe("fechas de Ventas (VEN-05)", () => {
  it("hoy y ayer con la hora; antes, el día y el mes", () => {
    expect(cuandoFue(new Date(2026, 10, 10, 17, 30), AHORA)).toMatch(/^Hoy, 5:30/);
    expect(cuandoFue(new Date(2026, 10, 9, 15, 30), AHORA)).toMatch(/^Ayer, 3:30/);
    expect(cuandoFue(new Date(2026, 10, 7, 9, 0), AHORA)).toBe("7 nov.");
    expect(cuandoFue(new Date(2025, 11, 24, 9, 0), AHORA)).toBe("24 dic. 2025");
    expect(cuandoFue(null, AHORA)).toBe("Sin fecha");
  });
});

describe("pedidos en palabras (VEN-03/04)", () => {
  it("el pago tiene palabra y tono; lo desconocido no sale crudo", () => {
    expect(pagoDePedido("pagado")).toEqual({ label: "Pagado", tono: "success" });
    expect(pagoDePedido("pendiente")).toEqual({ label: "Pago pendiente", tono: "warning" });
    expect(pagoDePedido("rechazado")).toEqual({ label: "Pago rechazado", tono: "danger" });
    expect(pagoDePedido("aprobado").label).toBe("Sin dato de pago");
  });

  it("el siguiente paso es uno solo y el resto va al menú", () => {
    expect(siguientePaso("abierto")?.label).toBe("Marcar como despachado");
    expect(siguientePaso("despachado")?.label).toBe("Marcar como entregado");
    expect(siguientePaso("entregado")).toBeNull();
    expect(otrosCambios("abierto").map((c) => c.estado)).toEqual(["entregado", "cancelado", "expirado"]);
    expect(otrosCambios("cancelado").map((c) => c.label)).toContain("Volver a por despachar");
    expect(otrosCambios("abierto").find((c) => c.estado === "cancelado")?.destructivo).toBe(true);
  });

  it("los productos del pedido en una línea", () => {
    expect(productosDelPedido([])).toBe("Sin productos");
    expect(productosDelPedido([{ name: "Gorra", quantity: 2, unit_price: 1 }])).toBe("2 × Gorra");
    expect(
      productosDelPedido([
        { name: "Jean", quantity: 1, unit_price: 1 },
        { name: "Camiseta", quantity: 2, unit_price: 1 },
        { name: "Medias", quantity: 1, unit_price: 1 },
      ]),
    ).toBe("Jean y 2 más");
  });

  it("lo vendido en el mes cuenta solo lo pagado y no cancelado de este mes", () => {
    const p = (total: number, pago: string, estado: string, fecha: Date) => ({ total, payment_status: pago, status: estado, created_at: fecha.toISOString() });
    expect(
      vendidoEnElMes(
        [
          p(100, "pagado", "entregado", new Date(2026, 10, 2)),
          p(50, "pagado", "abierto", new Date(2026, 10, 9)),
          p(70, "pendiente", "abierto", new Date(2026, 10, 9)),
          p(30, "pagado", "cancelado", new Date(2026, 10, 9)),
          p(999, "pagado", "entregado", new Date(2026, 9, 30)),
        ],
        AHORA,
      ),
    ).toEqual({ total: 150, pedidos: 2 });
  });
});

describe("productos en palabras (VEN-06)", () => {
  it("nombra la variante por sus atributos", () => {
    expect(nombreDeVariante({ talla: "S", color: "Negro" })).toBe("S · Negro");
    expect(nombreDeVariante({})).toBe("Única");
  });

  it("resume el inventario y avisa lo que se agota", () => {
    const v = (stock: number, active = true) => ({ stock, active });
    expect(inventarioEnPalabras([v(12), v(3), v(0)])).toEqual({ texto: "3 variantes · 15 en stock", aviso: { label: "1 variante agotada", tono: "warning" } });
    expect(inventarioEnPalabras([v(9), v(4, false)])).toEqual({ texto: "9 en stock", aviso: null });
    expect(inventarioEnPalabras([v(3)]).aviso).toEqual({ label: "Quedan 3", tono: "warning" });
    expect(inventarioEnPalabras([v(0)]).aviso).toEqual({ label: "Agotado", tono: "danger" });
    expect(inventarioEnPalabras([v(5, false)]).texto).toBe("Sin variantes a la venta");
  });

  it("cuenta las variantes agotadas del catálogo para el resumen", () => {
    expect(
      agotadas([
        { name: "Camiseta", variants: [{ stock: 0, active: true, attributes: { talla: "L" } }, { stock: 0, active: false, attributes: {} }] },
        { name: "Medias", variants: [{ stock: 0, active: true, attributes: {} }] },
      ]),
    ).toEqual({ variantes: 2, ejemplo: "Camiseta L" });
  });

  it("los enlaces de Productos conservan filtros, vista y ficha", () => {
    expect(hrefProductos({})).toBe("/comercio/productos");
    expect(hrefProductos({ aliado: "none", q: " gorra ", vista: "vitrina", producto: "p-1" })).toBe(
      "/comercio/productos?aliado=none&q=gorra&vista=vitrina&producto=p-1",
    );
    expect(hrefProductos({ vista: "" })).toBe("/comercio/productos");
    expect(coincide("Camiseta básica", "BASICA")).toBe(true);
  });
});

const promo = (extra: Partial<PromoVenta>): PromoVenta => ({
  type: "temporada",
  rules: { label: "Día sin IVA", discount_pct: 19 },
  active: true,
  valid_from: null,
  valid_to: null,
  category_id: null,
  product_id: null,
  include_child_categories: true,
  eligible_segments: null,
  ...extra,
});

const NOMBRES = {
  categorias: new Map([["cat-ropa", "Ropa"]]),
  productos: new Map([["p-1", "Camiseta básica"]]),
  aliados: new Map([["a-1", "Taller Ruiz"]]),
};

describe("promociones en palabras (VEN-11)", () => {
  it("el beneficio, el alcance, la vigencia y para quién", () => {
    expect(beneficioEnPalabras({ tiers: [{ min: 3, max: 5, discount_pct: 10 }, { min: 6, discount_pct: 15 }] })).toBe("10 % desde 3 unidades, 15 % desde 6");
    expect(beneficioEnPalabras({ tiers: [{ min: 4, free_item_sku: "MED-X3" }] })).toBe("MED-X3 de regalo desde 4 unidades");
    expect(
      promoEnPalabras(promo({ category_id: "cat-ropa", valid_from: "2026-11-20T00:00:00Z", valid_to: "2026-11-21T23:59:00Z" }), NOMBRES, AHORA),
    ).toBe("19 % en Ropa · del 20 al 21 de nov.");
    expect(promoEnPalabras(promo({ eligible_segments: ["nuevo", "fiel"], ally_id: "a-1" }), NOMBRES, AHORA)).toBe(
      "19 % en toda la tienda, solo de Taller Ruiz · siempre · para clientes nuevos y fieles",
    );
    expect(vigenciaEnPalabras("2026-11-28T00:00:00Z", "2026-12-02T00:00:00Z", AHORA)).toBe("del 28 nov. al 2 dic.");
    expect(vigenciaEnPalabras(null, "2026-11-30T00:00:00Z", AHORA)).toBe("hasta el 30 nov.");
  });

  it("un solo estado por promoción", () => {
    expect(estadoDePromo(promo({ active: false }), AHORA).label).toBe("Apagada");
    expect(estadoDePromo(promo({ valid_from: "2026-11-20T05:00:00Z" }), AHORA)).toEqual({ label: "Empieza en 10 días", tono: "info" });
    expect(estadoDePromo(promo({ valid_to: "2026-11-01T00:00:00Z" }), AHORA).label).toBe("Terminó");
    expect(estadoDePromo(promo({}), AHORA)).toEqual({ label: "Activa", tono: "success" });
  });

  it("la vitrina muestra la promoción vigente de mayor descuento que alcanza al producto", () => {
    const categorias = [
      { id: "cat-ropa", parent_id: null },
      { id: "cat-camisetas", parent_id: "cat-ropa" },
    ];
    const camiseta = { id: "p-1", category_id: "cat-camisetas", ally_id: null };
    const enRopa = promo({ category_id: "cat-ropa", rules: { label: "Ropa", discount_pct: 19 } });
    const volumen = promo({ product_id: "p-1", rules: { label: "Volumen", tiers: [{ min: 3, discount_pct: 10 }, { min: 6, discount_pct: 15 }] } });
    expect(promoDelProducto(camiseta, [volumen, enRopa], categorias, AHORA)).toBe(enRopa);
    expect(promoDelProducto(camiseta, [promo({ category_id: "cat-ropa", include_child_categories: false })], categorias, AHORA)).toBeNull();
    // Programada, apagada, por segmento o de otro aliado: no se muestra.
    expect(promoDelProducto(camiseta, [promo({ valid_from: "2026-12-01T00:00:00Z" }), promo({ active: false }), promo({ eligible_segments: ["nuevo"] }), promo({ ally_id: "a-1" })], categorias, AHORA)).toBeNull();
    expect(etiquetaDePromo(volumen)).toBe("Hasta 15 % · Volumen");
    expect(etiquetaDePromo(enRopa)).toBe("19 % · Ropa");
  });
});

describe("categorías como árbol (VEN-10)", () => {
  const c = (id: string, name: string, parent_id: string | null, sort_order: number, active = true) => ({ id, name, parent_id, sort_order, active });

  it("anida, ordena, cuenta con las subcategorías y deja las pausadas al final", () => {
    const arbol = arbolDeCategorias(
      [c("acc", "Accesorios", null, 2), c("pan", "Pantalones", "ropa", 2), c("ropa", "Ropa", null, 1), c("cam", "Camisetas", "ropa", 1), c("vieja", "Temporada pasada", null, 0, false), c("huerf", "Huérfana", "no-existe", 5)],
      [{ category_id: "cam" }, { category_id: "cam" }, { category_id: "pan" }, { category_id: "ropa" }, { category_id: "acc" }, { category_id: null }],
    );
    expect(arbol.map((n) => `${"-".repeat(n.nivel)}${n.categoria.name}:${n.productos}`)).toEqual([
      "Ropa:4",
      "-Camisetas:2",
      "-Pantalones:1",
      "Accesorios:1",
      "Huérfana:0",
      "Temporada pasada:0",
    ]);
    const camisetas = arbol.find((n) => n.categoria.id === "cam")!;
    expect(camisetas.anterior).toBeNull();
    expect(camisetas.siguiente?.id).toBe("pan");
    expect(cuantosProductos(1)).toBe("1 producto");
    expect([...conSubcategorias("ropa", [{ id: "ropa", parent_id: null }, { id: "cam", parent_id: "ropa" }, { id: "polo", parent_id: "cam" }, { id: "acc", parent_id: null }])]).toEqual(["ropa", "cam", "polo"]);
    expect(cuantosProductos(0)).toBe("Sin productos");
  });
});
