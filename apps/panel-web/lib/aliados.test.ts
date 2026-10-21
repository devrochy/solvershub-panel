import { describe, expect, it } from "vitest";

import {
  SIN_ALIADO,
  contactoDelFormulario,
  contactoEnUnaLinea,
  filtroDeAliado,
  nombreDelAliado,
  resumenDelImport,
} from "@/lib/aliados";

const ID = "0b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d";

describe("aliados (HU-CRM-03)", () => {
  it("el filtro acepta un id, «sin aliado» o nada", () => {
    expect(filtroDeAliado(ID)).toBe(ID);
    expect(filtroDeAliado(SIN_ALIADO)).toBe("none");
    expect(filtroDeAliado([ID, "otro"])).toBe(ID);
    expect(filtroDeAliado(undefined)).toBeNull();
    expect(filtroDeAliado("")).toBeNull();
    expect(filtroDeAliado("'; drop table")).toBeNull();
  });

  it("nombra el aliado del producto", () => {
    const aliados = [{ id: ID, name: "Distribuidora Norte" }];
    expect(nombreDelAliado(ID, aliados)).toBe("Distribuidora Norte");
    expect(nombreDelAliado(null, aliados)).toBe("Sin aliado");
    expect(nombreDelAliado("otro", aliados)).toBe("Aliado eliminado");
  });

  it("arma el contacto sin campos vacíos", () => {
    const data = new FormData();
    data.set("contacto", "  Ana ");
    data.set("telefono", "");
    data.set("email", "ana@norte.co");
    expect(contactoDelFormulario(data)).toEqual({ contacto: "Ana", email: "ana@norte.co" });
    expect(contactoEnUnaLinea({ contacto: "Ana", email: "ana@norte.co" })).toBe("Ana · ana@norte.co");
    expect(contactoEnUnaLinea({})).toBe("—");
  });

  it("el resumen del import lista los aliados que no existen", () => {
    expect(resumenDelImport(3, [])).toBe("Importados 3 productos.");
    expect(resumenDelImport(2, ["Fantasma"])).toBe("Importados 2 productos. Sin aliado porque no existen: Fantasma.");
  });
});
