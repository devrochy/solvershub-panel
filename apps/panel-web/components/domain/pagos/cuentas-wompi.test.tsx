import { describe, expect, it } from "vitest";

import { cuerpoDeCuenta } from "@/components/domain/pagos/cuentas-wompi";

const form = { name: " Principal ", public_key: "pub_test_x", private_key: "", events_secret: "", sandbox: true };

describe("cuerpoDeCuenta", () => {
  it("al crear manda todas las llaves", () => {
    expect(cuerpoDeCuenta({ ...form, private_key: "prv", events_secret: "ev" }, false)).toEqual({
      name: "Principal", public_key: "pub_test_x", sandbox: true, private_key: "prv", events_secret: "ev",
    });
  });

  it("al editar no manda las llaves vacías (se conservan)", () => {
    expect(cuerpoDeCuenta(form, true)).toEqual({ name: "Principal", public_key: "pub_test_x", sandbox: true });
    expect(cuerpoDeCuenta({ ...form, private_key: "nueva" }, true)).toHaveProperty("private_key", "nueva");
  });
});
