import { describe, expect, it } from "vitest";

import {
  consultaPedidos,
  etiquetaDeEstado,
  etiquetaDePago,
  filtrosLimpios,
  hrefPedidos,
  paginaDe,
  PEDIDOS_POR_PAGINA,
} from "@/lib/pedidos";

// HU-CRM-20: filtros de Pedidos y estados en español.

describe("estados en español", () => {
  it("nombra los cinco estados del pedido", () => {
    expect(["abierto", "despachado", "entregado", "cancelado", "expirado"].map(etiquetaDeEstado)).toEqual([
      "Abierto",
      "Despachado",
      "Entregado",
      "Cancelado",
      "Expirado",
    ]);
  });

  it("deja pasar un estado desconocido tal cual y nombra el pago", () => {
    expect(etiquetaDeEstado("otro")).toBe("otro");
    expect(etiquetaDePago("pagado")).toBe("Pagado");
    expect(etiquetaDePago("pendiente")).toBe("Pendiente");
  });
});

describe("consultaPedidos", () => {
  it("sin filtros pide la primera página", () => {
    expect(consultaPedidos({}).toString()).toBe(`limit=${PEDIDOS_POR_PAGINA}&offset=0`);
  });

  it("manda estado, pago, búsqueda y cliente, y calcula el offset de la página", () => {
    const qs = consultaPedidos({ estado: "abierto", pago: "pagado", q: "  Ana ", cliente: "c-1", page: "3" });
    expect(qs.get("estado")).toBe("abierto");
    expect(qs.get("pago")).toBe("pagado");
    expect(qs.get("q")).toBe("Ana");
    expect(qs.get("customer_id")).toBe("c-1");
    expect(qs.get("offset")).toBe(String(2 * PEDIDOS_POR_PAGINA));
  });

  it("descarta un estado inventado y una página inválida", () => {
    const qs = consultaPedidos({ estado: "inventado", pago: "nada", page: "-4" });
    expect(qs.has("estado")).toBe(false);
    expect(qs.has("pago")).toBe(false);
    expect(qs.get("offset")).toBe("0");
    expect(paginaDe("abc")).toBe(1);
    expect(paginaDe("2")).toBe(2);
  });
});

describe("hrefPedidos", () => {
  it("conserva los filtros y la página", () => {
    expect(hrefPedidos({ estado: "abierto", q: "ana", cliente: "c-1" }, 2)).toBe(
      "/comercio/pedidos?estado=abierto&q=ana&cliente=c-1&page=2",
    );
  });

  it("sin filtros es la lista limpia", () => {
    expect(hrefPedidos({})).toBe("/comercio/pedidos");
    expect(filtrosLimpios({ estado: "x" }).estado).toBe("");
  });
});
