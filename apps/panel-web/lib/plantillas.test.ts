import { describe, expect, it } from "vitest";

import {
  claveDePlantilla,
  eventoLabel,
  faltantes,
  mapeoParaApi,
  rellenarCuerpo,
  rutasDesdeApi,
} from "./plantillas";

describe("plantillas por evento (HU-ARCH-13)", () => {
  it("rellena el cuerpo y marca lo que falta", () => {
    expect(rellenarCuerpo("Hola {{1}}, debes {{ 2 }}.", { "1": "Ana" })).toBe("Hola Ana, debes [2].");
    expect(rellenarCuerpo("Hola {{nombre}}", { nombre: " Ana " })).toBe("Hola Ana");
  });

  it("arma el mapeo en la forma que espera la API", () => {
    const rutas = { "1": "cliente.nombre", "2": "cargo.monto" };
    expect(mapeoParaApi(["1", "2"], false, rutas)).toEqual(["cliente.nombre", "cargo.monto"]);
    expect(mapeoParaApi(["nombre"], true, { nombre: "cliente.nombre" })).toEqual({
      nombre: "cliente.nombre",
    });
  });

  it("lee un mapeo guardado (lista o con nombre)", () => {
    expect(rutasDesdeApi(["1", "2"], ["a", "b"])).toEqual({ "1": "a", "2": "b" });
    expect(rutasDesdeApi(["x"], { x: "a" })).toEqual({ x: "a" });
    expect(rutasDesdeApi(["1"], undefined)).toEqual({});
  });

  it("detecta variables sin completar", () => {
    expect(faltantes(["1", "2"], { "1": "Ana", "2": "  " })).toEqual(["2"]);
  });

  it("etiqueta eventos y claves de plantilla", () => {
    expect(eventoLabel("subscription.charge_created")).toBe("Cargo de suscripción generado");
    expect(eventoLabel("subscription.charge_reminder")).toBe("Recordatorio de pago de suscripción");
    expect(eventoLabel("subscription.paused")).toBe("Suscripción pausada por mora");
    expect(eventoLabel("otro.evento")).toBe("otro.evento");
    expect(claveDePlantilla("aviso", "es")).toBe("aviso|es");
  });
});
