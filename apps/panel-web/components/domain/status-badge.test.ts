import { describe, expect, it } from "vitest";

import { PAYMENT_STATUS } from "@/components/domain/status-badge";

describe("PAYMENT_STATUS (HU-SH-04)", () => {
  it("tiene etiqueta para cada estado de un pago del plan que manda el backend", () => {
    for (const estado of ["pendiente", "aprobado", "rechazado", "anulado", "duplicado"]) {
      expect(PAYMENT_STATUS[estado]).toBeDefined();
    }
  });

  it("marca el pago doble como un problema", () => {
    expect(PAYMENT_STATUS.duplicado).toEqual({ label: "Pago doble", variant: "danger" });
  });
});
