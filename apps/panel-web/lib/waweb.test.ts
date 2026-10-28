import { describe, expect, it } from "vitest";

import type { WawebPolitica } from "@/lib/api/types";

import { cuerpoWaweb, erroresPorClave, exigeAceptarRiesgo, valoresDePolitica } from "./waweb";

const politica: WawebPolitica = {
  mode: "reply_only",
  send_min_delay_ms: 3000,
  send_max_delay_ms: 9000,
  daily_outbound_cap: 40,
  warmup_enabled: true,
  risk_version: "2026-09-27",
};

describe("política de WhatsApp Web", () => {
  it("lleva la política a las claves del catálogo", () => {
    expect(valoresDePolitica(politica)).toEqual({
      waweb_mode: "reply_only",
      waweb_send_min_delay_ms: 3000,
      waweb_send_max_delay_ms: 9000,
      waweb_daily_outbound_cap: 40,
      waweb_warmup_enabled: true,
    });
  });

  it("solo exige aceptar el riesgo al abrir el envío no solicitado", () => {
    const abierto = { ...valoresDePolitica(politica), waweb_mode: "allow_outbound" };
    expect(exigeAceptarRiesgo(abierto, politica)).toBe(true);
    expect(exigeAceptarRiesgo(valoresDePolitica(politica), politica)).toBe(false);
    // Si ya estaba abierto, cambiar otras cosas no vuelve a pedirlo.
    expect(exigeAceptarRiesgo(abierto, { ...politica, mode: "allow_outbound" })).toBe(false);
  });

  it("arma el cuerpo con la versión del aviso que la persona vio", () => {
    const abierto = { ...valoresDePolitica(politica), waweb_mode: "allow_outbound", waweb_daily_outbound_cap: "25" };
    expect(cuerpoWaweb(abierto, politica, true)).toEqual({
      mode: "allow_outbound",
      send_min_delay_ms: 3000,
      send_max_delay_ms: 9000,
      daily_outbound_cap: 25,
      warmup_enabled: true,
      acepta_riesgo: true,
      risk_version: "2026-09-27",
    });
  });

  it("traduce los errores 422 a las claves del catálogo", () => {
    expect(
      erroresPorClave({ send_max_delay_ms: "La pausa máxima no puede ser menor que la mínima.", acepta_riesgo: "Acepta el aviso." }),
    ).toEqual({
      waweb_send_max_delay_ms: "La pausa máxima no puede ser menor que la mínima.",
      acepta_riesgo: "Acepta el aviso.",
    });
    expect(erroresPorClave(undefined)).toEqual({});
    expect(erroresPorClave({ risk_version: "El aviso cambió." }).acepta_riesgo).toBe("El aviso cambió.");
  });
});
