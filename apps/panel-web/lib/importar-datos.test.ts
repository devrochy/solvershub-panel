import { describe, expect, it } from "vitest";

import { resumenDeVistaPrevia } from "./importar-datos";

describe("vista previa de una importación", () => {
  it("resume la vista previa", () => {
    expect(resumenDeVistaPrevia({ total_filas: 12, nuevas: 9, existentes: 2, con_errores: 1 })).toBe(
      "12 filas: 9 nuevas, 2 ya existían y 1 con error.",
    );
    expect(resumenDeVistaPrevia({ total_filas: 1, nuevas: 1, existentes: 0, con_errores: 0 })).toBe(
      "1 fila: 1 nueva, 0 ya existían y 0 con errores.",
    );
  });
});
