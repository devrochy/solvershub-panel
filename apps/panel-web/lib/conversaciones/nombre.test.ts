import { describe, expect, it } from "vitest";

import { nombreDelChat } from "./nombre";

describe("nombreDelChat", () => {
  it("prefiere el nombre del cliente", () => {
    expect(nombreDelChat({ customer_name: "Ana Pérez", external_id: "573001112233" })).toBe("Ana Pérez");
  });

  it("sin nombre, usa el identificador", () => {
    expect(nombreDelChat({ customer_name: null, external_id: "573001112233" })).toBe("573001112233");
  });

  it("un visitante del chat web se lee corto y estable", () => {
    expect(nombreDelChat({ customer_name: null, external_id: "web:cf7834ced6544a9190c389b73865c13f" })).toBe(
      "Visitante web · cf78",
    );
  });

  it("sin nada, dice «Cliente»", () => {
    expect(nombreDelChat({ customer_name: null, external_id: null })).toBe("Cliente");
    expect(nombreDelChat({})).toBe("Cliente");
  });
});
