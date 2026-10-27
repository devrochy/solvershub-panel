import { describe, expect, it } from "vitest";

import { destinoDeRutaVieja } from "./redirecciones";

describe("redirecciones de Agenda (HU-CAL-08)", () => {
  it("las citas y los bloqueos van a la vista única", () => {
    expect(destinoDeRutaVieja("citas")).toBe("/calendario");
    expect(destinoDeRutaVieja("bloqueos")).toBe("/calendario");
  });

  it("tipos y horario abren su sección del cajón", () => {
    expect(destinoDeRutaVieja("tipos")).toBe("/calendario?ajustes=tipos");
    expect(destinoDeRutaVieja("horario")).toBe("/calendario?ajustes=horario");
  });

  it("conserva el negocio pedido por la app y el aviso de Google", () => {
    expect(destinoDeRutaVieja("citas", { tenant: "t-1", google: "ok" })).toBe("/calendario?tenant=t-1&google=ok");
    expect(destinoDeRutaVieja("tipos", { tenant: "t-1" })).toBe("/calendario?tenant=t-1&ajustes=tipos");
  });

  it("no pisa un `ajustes` que ya venía y admite parámetros repetidos", () => {
    expect(destinoDeRutaVieja("tipos", { ajustes: "agendas" })).toBe("/calendario?ajustes=agendas");
    expect(destinoDeRutaVieja("citas", { a: ["1", "2"], vacio: undefined })).toBe("/calendario?a=1&a=2");
  });
});
