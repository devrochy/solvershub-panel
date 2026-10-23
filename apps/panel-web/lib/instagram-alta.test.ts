import { describe, expect, it } from "vitest";

import {
  avisoDeVencimiento,
  avisoSinCuentas,
  bloqueoDelAltaInstagram,
  cuentaSeleccionable,
  diasParaVencer,
  estadoDeCuenta,
  etiquetaDeRuta,
  explicarDiagnostico,
  interpretarRetorno,
  limpiarCodigoDeInstagram,
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

describe("Instagram Login: cuentas, vencimiento y retorno", () => {
  const AHORA = new Date("2026-10-24T12:00:00Z");

  it("la ruta se muestra con su nombre, no con el valor de la API", () => {
    expect(etiquetaDeRuta("ig_instagram_login")).toBe("Instagram Login");
    expect(etiquetaDeRuta("ig_facebook_login")).toBe("Facebook Login");
    expect(etiquetaDeRuta(null)).toBe("Conexión de Instagram");
  });

  it("una cuenta degradada pide reconectar y una sana no dice nada", () => {
    expect(estadoDeCuenta({ status: "connected", status_reason: null })).toEqual({
      etiqueta: "Conectada", tono: "success", ayuda: null,
    });
    const degradada = estadoDeCuenta({ status: "degraded", status_reason: "reconecta la cuenta" });
    expect([degradada.etiqueta, degradada.tono, degradada.ayuda]).toEqual(["Degradada", "warning", "reconecta la cuenta"]);
    expect(estadoDeCuenta({ status: "degraded", status_reason: null }).ayuda).toMatch(/reconéctala/);
  });

  it("avisa del vencimiento solo cuando está cerca o ya pasó", () => {
    const en = (dias: number) => new Date(AHORA.getTime() + dias * 86_400_000).toISOString();
    expect(avisoDeVencimiento(null, AHORA)).toBeNull();
    expect(avisoDeVencimiento(en(40), AHORA)).toBeNull();
    expect(avisoDeVencimiento(en(5.5), AHORA)).toMatch(/vence en 5 días/);
    expect(avisoDeVencimiento(en(1.2), AHORA)).toMatch(/vence en 1 día\./);
    expect(avisoDeVencimiento(en(0.4), AHORA)).toMatch(/menos de un día/);
    expect(avisoDeVencimiento(en(-2), AHORA)).toMatch(/venció/);
    expect(diasParaVencer("no es una fecha", AHORA)).toBeNull();
  });

  it("limpia el `#_` que Instagram agrega al código", () => {
    expect(limpiarCodigoDeInstagram(" AQBabc#_ ")).toBe("AQBabc");
    expect(limpiarCodigoDeInstagram("AQBabc")).toBe("AQBabc");
  });

  it("interpreta la URL de retorno: listo, cancelado o inválido", () => {
    expect(interpretarRetorno({ code: "AQB#_", state: "s1" })).toEqual({ tipo: "listo", code: "AQB", state: "s1" });
    expect(interpretarRetorno({ error: "access_denied" })).toEqual({
      tipo: "cancelado", motivo: "Cancelaste la autorización en Instagram.",
    });
    expect(interpretarRetorno({ error: "otro" }).tipo).toBe("cancelado");
    expect(interpretarRetorno({ code: "AQB" }).tipo).toBe("invalido");
    expect(interpretarRetorno({ state: "s1" }).tipo).toBe("invalido");
    expect(interpretarRetorno({}).tipo).toBe("invalido");
  });

  it("explica la causa de la prueba de humo con pasos concretos", () => {
    expect(explicarDiagnostico("token_degraded").pasos[0]).toMatch(/Reconecta/);
    expect(explicarDiagnostico("not_subscribed").titulo).toMatch(/no confirmó/);
    const apagado = explicarDiagnostico("access_to_messages_off");
    expect(apagado.pasos.join(" ")).toMatch(/Permitir acceso a los mensajes/);
    expect(explicarDiagnostico(null).pasos.length).toBe(apagado.pasos.length);
  });
});
