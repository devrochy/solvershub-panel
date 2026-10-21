import { describe, expect, it } from "vitest";

import {
  consultaClientes,
  etiquetaDeDato,
  filtrosDePacks,
  normalizarClave,
  origenDelDato,
  textoDeDato,
  valorDeFiltro,
} from "./clientes";

describe("consultaClientes", () => {
  it("arma la query de la API sin vacíos", () => {
    const qs = consultaClientes({
      q: "  ana ",
      channel: "whatsapp",
      connection_id: "c1",
      filtro: ["clasificacion:fiel", "", "estado_lead:"],
      page: "2",
      cliente: "x",
    });
    expect(qs.toString()).toBe("q=ana&channel=whatsapp&connection_id=c1&filtro=clasificacion%3Afiel&page=2");
  });

  it("el CSV no lleva página", () => {
    expect(consultaClientes({ page: "3", filtro: "clasificacion:nuevo" }, { conPagina: false }).toString()).toBe(
      "filtro=clasificacion%3Anuevo",
    );
  });
});

describe("filtros de packs", () => {
  it("acepta uno o varios y lee el valor por clave", () => {
    expect(filtrosDePacks("clasificacion:fiel")).toEqual(["clasificacion:fiel"]);
    expect(filtrosDePacks(undefined)).toEqual([]);
    expect(valorDeFiltro(["clasificacion:fiel", "estado_lead:nuevo"], "estado_lead")).toBe("nuevo");
    expect(valorDeFiltro("clasificacion:fiel", "estado_lead")).toBe("");
  });
});

describe("ficha", () => {
  it("etiquetas y valores legibles", () => {
    expect(etiquetaDeDato("direccion")).toBe("Dirección");
    expect(etiquetaDeDato("direccion_entrega")).toBe("Direccion entrega");
    expect(origenDelDato("human")).toBe("Persona");
    expect(origenDelDato("tool")).toBe("Asistente");
    expect(textoDeDato(true)).toBe("Sí");
    expect(textoDeDato(null)).toBe("—");
  });

  it("normaliza la clave de un dato nuevo", () => {
    expect(normalizarClave("  Dirección de Entrega ")).toBe("direccion_de_entrega");
    expect(normalizarClave("¿?")).toBe("");
  });
});
