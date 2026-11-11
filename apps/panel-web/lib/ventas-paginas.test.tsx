// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import { resolverServidor } from "@/lib/testing/servidor";

// Rediseño A de Ventas: resumen que pide acción, productos en lista o vitrina, promociones en
// palabras y categorías como árbol.

const respuestas: Record<string, { data: unknown; total?: number }> = {};
let cookieDeVista: string | undefined;

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  getBusinessCurrency: async () => "COP",
  // Primero la ruta con su consulta (el resumen pide pedidos con filtros distintos), luego sin ella.
  apiFetch: vi.fn(async (ruta: string) => {
    const r = respuestas[ruta] ?? respuestas[ruta.split("?")[0]];
    return r === undefined ? { ok: false, status: 404, error: "sin fixture" } : { ok: true, status: 200, ...r };
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (nombre === "panel_vista_productos" && cookieDeVista ? { value: cookieDeVista } : undefined) }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/comercio",
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error("404");
  },
}));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
  cookieDeVista = undefined;
  for (const k of Object.keys(respuestas)) delete respuestas[k];
});

type Pagina = (p: { searchParams: Promise<Record<string, string>> }) => Promise<ReactNode>;

async function pintar(ruta: string, sp: Record<string, string> = {}) {
  const pagina = (await import(`@/app/(app)/comercio${ruta}/page`)).default as unknown as Pagina;
  const arbol = await resolverServidor(await pagina({ searchParams: Promise.resolve(sp) }));
  render(<FeedbackProviders>{arbol}</FeedbackProviders>);
}

const hace = (horas: number) => new Date(Date.now() - horas * 3_600_000).toISOString();
const pedido = (id: string, status: string, payment_status: string, total: number) => ({
  id,
  public_order_number: `PED-${id}`,
  customer_id: `c-${id}`,
  customer_name: `Cliente ${id}`,
  total,
  status,
  payment_status,
  payment_method: "pago_en_linea",
  delivery_method: "domicilio",
  delivery_full_name: null,
  delivery_address: null,
  created_at: hace(1),
  line_items: [{ name: "Camiseta", quantity: 1, unit_price: total }],
});

const CATEGORIAS = [
  { id: "ropa", name: "Ropa", parent_id: null, sort_order: 1, active: true },
  { id: "cam", name: "Camisetas", parent_id: "ropa", sort_order: 1, active: true },
  { id: "acc", name: "Accesorios", parent_id: null, sort_order: 2, active: true },
];
const variante = (stock: number, talla: string) => ({ id: `v-${talla}`, sku: `CAM-${talla}`, attributes: { talla }, price: 39000, stock, active: true });
const PRODUCTOS = [
  { id: "p1", name: "Camiseta básica", description: "", category_id: "cam", category: "Camisetas", price: 39000, image_url: null, variants: [variante(12, "S"), variante(0, "L")] },
  { id: "p2", name: "Gorra", description: "", category_id: "acc", category: "Accesorios", price: 45000, image_url: null, variants: [variante(2, "Única")] },
];
const PROMOS = [
  { id: "pr1", type: "temporada", rules: { label: "Día de la ropa", discount_pct: 19 }, active: true, valid_from: null, valid_to: null, category_id: "ropa", product_id: null, include_child_categories: true, eligible_segments: null },
  { id: "pr2", type: "campaña", rules: { label: "Bienvenida", discount_pct: 10, once_per_customer: true }, active: false, valid_from: null, valid_to: null, category_id: null, product_id: null, include_child_categories: false, eligible_segments: ["nuevo"] },
];

describe("Resumen de Ventas (VEN-01)", () => {
  it("se llama Ventas y muestra lo que pide acción, cada cifra con su lista", async () => {
    respuestas["/pack/commerce/orders?limit=5"] = { data: [pedido("1", "abierto", "pendiente", 207000)] };
    respuestas["/pack/commerce/orders?estado=abierto&limit=1"] = { data: [pedido("1", "abierto", "pendiente", 207000)], total: 2 };
    respuestas["/pack/commerce/orders?pago=pendiente&limit=200"] = { data: [pedido("1", "abierto", "pendiente", 207000), pedido("6", "expirado", "pendiente", 39000)], total: 2 };
    respuestas["/pack/commerce/orders?pago=pagado&limit=200"] = { data: [pedido("2", "entregado", "pagado", 59000), pedido("3", "cancelado", "pagado", 90000)] };
    respuestas["/pack/commerce/products"] = { data: PRODUCTOS };
    await pintar("");

    expect(screen.getByRole("heading", { level: 1, name: "Ventas" })).toBeTruthy();
    const despachar = screen.getByRole("link", { name: /Por despachar/ });
    expect(despachar.getAttribute("href")).toBe("/comercio/pedidos?estado=abierto");
    expect(despachar.textContent).toMatch(/2/);
    // Lo vencido no cuenta como «por cobrar»; lo cancelado no cuenta como vendido.
    expect(screen.getByRole("link", { name: /Pago pendiente/ }).textContent).toMatch(/207\.000 por cobrar/);
    expect(screen.getByRole("link", { name: /Vendido este mes/ }).textContent).toMatch(/59\.000/);
    expect(screen.getByRole("link", { name: /Agotados/ }).textContent).toMatch(/Camiseta básica L/);
  });
});

describe("Productos: lista o vitrina (VEN-06/08)", () => {
  const base = () => {
    respuestas["/pack/commerce/modulos"] = { data: { aliados: false } };
    respuestas["/pack/commerce/products"] = { data: PRODUCTOS };
    respuestas["/pack/commerce/categories"] = { data: CATEGORIAS };
    respuestas["/pack/commerce/promotions"] = { data: PROMOS };
    respuestas["/admin/datos-de-prueba/ventas"] = { data: { modulo: "ventas", titulo: "Ventas", disponible: false, motivo: "Tu negocio ya tiene productos." } };
  };

  it("la lista dice el inventario en palabras y no muestra el aviso de datos de prueba que no sirve", async () => {
    base();
    await pintar("/productos");
    const tabla = screen.getByRole("table");
    expect(tabla.textContent).toMatch(/2 variantes · 12 en stock/);
    expect(tabla.textContent).toMatch(/1 variante agotada/);
    expect(tabla.textContent).toMatch(/Quedan 2/);
    expect(screen.queryByText("Tu negocio ya tiene productos.")).toBeNull();
    expect(screen.getByRole("link", { name: "Vitrina" }).getAttribute("href")).toBe("/comercio/productos?vista=vitrina");
  });

  it("la vitrina pone la promoción vigente en la tarjeta y busca sin tildes", async () => {
    base();
    await pintar("/productos", { vista: "vitrina", q: "basica" });
    const vitrina = screen.getByRole("list", { name: "Vitrina de productos" });
    expect(within(vitrina).getByRole("link", { name: "Camiseta básica" }).getAttribute("href")).toBe("/comercio/productos?q=basica&vista=vitrina&producto=p1");
    expect(within(vitrina).getByText("19 % · Día de la ropa")).toBeTruthy();
    expect(within(vitrina).queryByText("Gorra")).toBeNull();
    expect(screen.getByRole("link", { name: "Vitrina" }).getAttribute("aria-current")).toBe("page");
  });

  it("recuerda la vitrina: sin `vista` en la URL abre la guardada", async () => {
    base();
    cookieDeVista = "vitrina";
    await pintar("/productos");
    expect(screen.getByRole("list", { name: "Vitrina de productos" })).toBeTruthy();
    // Los enlaces no repiten la vista guardada; volver a la lista sí la escribe.
    expect(screen.getByRole("link", { name: "Lista" }).getAttribute("href")).toBe("/comercio/productos?vista=lista");
  });

  it("«Ver sus productos» de una categoría filtra con sus subcategorías", async () => {
    base();
    await pintar("/productos", { categoria: "ropa" });
    expect(screen.getByRole("table").textContent).toMatch(/Camiseta básica/);
    expect(screen.getByRole("table").textContent).not.toMatch(/Gorra/);
    expect(screen.getByRole("link", { name: "Quitar el filtro de categoría Ropa" }).getAttribute("href")).toBe("/comercio/productos");
  });
});

describe("Promociones en palabras (VEN-11)", () => {
  it("cada promoción es una frase con un solo estado y su interruptor", async () => {
    respuestas["/pack/commerce/promotions"] = { data: PROMOS };
    respuestas["/pack/commerce/categories"] = { data: CATEGORIAS };
    respuestas["/pack/commerce/products"] = { data: PRODUCTOS };
    respuestas["/pack/commerce/modulos"] = { data: { aliados: false } };
    await pintar("/promociones");
    const tabla = screen.getByRole("table");
    expect(tabla.textContent).toMatch(/19 % en Ropa · siempre/);
    expect(tabla.textContent).toMatch(/10 % en toda la tienda · siempre · para clientes nuevos/);
    expect(tabla.textContent).not.toMatch(/Interruptor|— →/);
    expect(screen.getAllByRole("switch", { name: "Encender Bienvenida" }).length).toBeGreaterThan(0);
  });
});

describe("Categorías como árbol (VEN-10)", () => {
  it("anida, cuenta los productos con las subcategorías y ordena con flechas", async () => {
    respuestas["/pack/commerce/categories"] = { data: CATEGORIAS };
    respuestas["/pack/commerce/products"] = { data: PRODUCTOS };
    await pintar("/categorias");
    const lista = screen.getByRole("list", { name: "Categorías" });
    expect(within(lista).getAllByRole("listitem").map((li) => li.textContent?.match(/^(Ropa|Camisetas|Accesorios)/)?.[0])).toEqual(["Ropa", "Camisetas", "Accesorios"]);
    expect(lista.textContent).toMatch(/Ropa1 producto/);
    expect((within(lista).getByRole("button", { name: "Subir Ropa" }) as HTMLButtonElement).disabled).toBe(true);
    expect((within(lista).getByRole("button", { name: "Bajar Ropa" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText(/Padre|Orden/)).toBeNull();
  });
});
