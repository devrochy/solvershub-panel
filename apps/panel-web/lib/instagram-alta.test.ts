import { describe, expect, it } from "vitest";

import {
  avisoSinCuentas,
  bloqueoDelAltaInstagram,
  cuentaSeleccionable,
  motivoCuentaNoSeleccionable,
  nombreDeCuenta,
  nombreDeCuentaPorId,
  resumirConexionInstagram,
  seleccionInicialInstagram,
  type CuentaDescubierta,
  type ResultadoConexionInstagram,
} from "@/lib/instagram-alta";

function cuenta(c: Partial<CuentaDescubierta>): CuentaDescubierta {
  return {
    ig_user_id: "1", username: "mitienda", page_id: "10", page_name: "Mi Página",
    eligible: true, already_connected: false, ...c,
  } as CuentaDescubierta;
}

describe("bloqueoDelAltaInstagram", () => {
  it("el plan sin Instagram bloquea antes que la configuración", () => {
    expect(bloqueoDelAltaInstagram({ plan_includes: false, meta_configured: false })?.titulo).toBe(
      "Tu plan no incluye Instagram",
    );
  });

  it("sin la app de Meta configurada avisa que no está disponible", () => {
    expect(bloqueoDelAltaInstagram({ plan_includes: true, meta_configured: false })?.titulo).toMatch(
      /no está disponible/,
    );
  });

  it("con plan y app configurada no bloquea", () => {
    expect(bloqueoDelAltaInstagram({ plan_includes: true, meta_configured: true })).toBeNull();
  });
});

describe("selección de cuentas", () => {
  const cuentas = [
    cuenta({ ig_user_id: "1" }),
    cuenta({ ig_user_id: "2", eligible: false, reason: "Te falta el rol de mensajes." }),
    cuenta({ ig_user_id: "3", already_connected: true }),
  ];

  it("solo se marcan las elegibles que no están conectadas", () => {
    expect(cuentas.map(cuentaSeleccionable)).toEqual([true, false, false]);
    expect(seleccionInicialInstagram(cuentas)).toEqual(["1"]);
  });

  it("explica por qué una cuenta no se puede marcar", () => {
    expect(motivoCuentaNoSeleccionable(cuentas[0])).toBeNull();
    expect(motivoCuentaNoSeleccionable(cuentas[1])).toBe("Te falta el rol de mensajes.");
    expect(motivoCuentaNoSeleccionable(cuentas[2])).toBe("Ya está conectada a este negocio.");
    expect(motivoCuentaNoSeleccionable(cuenta({ eligible: false, reason: null }))).toMatch(/roles/);
  });

  it("nombra la cuenta por su usuario o, si no, por su ID", () => {
    expect(nombreDeCuenta(cuentas[0])).toBe("@mitienda");
    expect(nombreDeCuenta(cuenta({ ig_user_id: "9", username: null }))).toBe("Cuenta 9");
    expect(nombreDeCuentaPorId("1", cuentas)).toBe("@mitienda");
    expect(nombreDeCuentaPorId("99", cuentas)).toBe("Cuenta 99");
  });
});

describe("avisoSinCuentas", () => {
  it("explica los requisitos y cuenta las Páginas sin Instagram", () => {
    expect(avisoSinCuentas(0)).toMatch(/profesional/);
    expect(avisoSinCuentas(1)).toMatch(/1 de tus Páginas no tiene Instagram vinculado/);
    expect(avisoSinCuentas(3)).toMatch(/3 de tus Páginas no tienen Instagram vinculado/);
  });
});

describe("resumirConexionInstagram", () => {
  const base: ResultadoConexionInstagram = {
    connection_id: "c",
    connected: [
      { ig_user_id: "1", channel_connection_id: "x", subscribed: true, subscribed_fields: ["messages"] },
      { ig_user_id: "2", channel_connection_id: "y", subscribed: false, subscribed_fields: [] },
    ],
    skipped: [{ ig_user_id: "3", code: "asset_claimed", message: "Esa cuenta ya está en otro negocio." }],
  };

  it("separa las que no quedaron suscritas y las omitidas", () => {
    const r = resumirConexionInstagram(base);
    expect(r.sinSuscripcion.map((c) => c.ig_user_id)).toEqual(["2"]);
    expect(r.omitidas).toHaveLength(1);
    expect(r.recibiendo).toBe(true);
  });

  it("si ninguna quedó suscrita no hay cuenta recibiendo mensajes", () => {
    expect(resumirConexionInstagram({ ...base, connected: [base.connected[1]] }).recibiendo).toBe(false);
  });
});
