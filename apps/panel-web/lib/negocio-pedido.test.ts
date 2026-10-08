import { describe, expect, it } from "vitest";

import { negocioPedidoDistinto } from "./negocio-pedido";

const A = "08ccdc19-f2ef-4eeb-b9a9-65c898c34fd1";
const B = "2f1d7c3a-5b6e-4c8d-9a0b-1c2d3e4f5a6b";

describe("negocioPedidoDistinto", () => {
  it("devuelve el negocio pedido si es distinto del activo", () => {
    expect(negocioPedidoDistinto(B, A)).toBe(B);
  });

  it("null si coincide con el activo (sin importar mayúsculas)", () => {
    expect(negocioPedidoDistinto(A.toUpperCase(), A)).toBeNull();
  });

  it("null sin parámetro o con un valor que no es UUID", () => {
    expect(negocioPedidoDistinto(undefined, A)).toBeNull();
    expect(negocioPedidoDistinto("", A)).toBeNull();
    expect(negocioPedidoDistinto("no-es-uuid", A)).toBeNull();
    expect(negocioPedidoDistinto(`${B}x`, A)).toBeNull();
  });

  it("pide el cambio si no hay negocio activo", () => {
    expect(negocioPedidoDistinto(B, null)).toBe(B);
  });
});
