import { describe, expect, it } from "vitest";

import {
  anclaFacturacion,
  muestraReparacion,
  nombreDelCheck,
  reparacion,
  type HealthCheck,
} from "@/lib/meta-salud";

const check = (key: string, ok: boolean | null, repair_action: string | null = null): HealthCheck => ({
  key,
  ok,
  detail: null,
  repair_action,
  checked_at: null,
});

describe("salud de Meta (HU-CONN-04)", () => {
  it("la reparación sale de repair_action, no del nombre del check", () => {
    // Antes se buscaba por la clave del check (`token_valid`) y el enlace nunca aparecía.
    expect(reparacion("reauthorize", "c1")).toEqual({
      tipo: "enlace",
      href: "/conexiones/whatsapp",
      label: "Reconectar",
    });
    expect(reparacion("token_valid", "c1")).toBeNull();
  });

  it("cada acción que manda el backend tiene reparación", () => {
    const acciones = [
      "reauthorize",
      "refresh_token",
      "subscribe_waba",
      "resubscribe_app",
      "sync_templates",
      "configure_billing",
    ];
    for (const accion of acciones) {
      expect(reparacion(accion, "c1"), accion).not.toBeNull();
    }
  });

  it("las reparaciones llevan al lugar correcto", () => {
    expect(reparacion("sync_templates", "c1")).toMatchObject({ href: "/conexiones/meta/c1/plantillas" });
    expect(reparacion("configure_billing", "c1")).toMatchObject({ href: `#${anclaFacturacion("c1")}` });
    expect(reparacion("subscribe_waba", "c1")).toMatchObject({ tipo: "accion", accion: "resubscribe" });
    expect(reparacion("refresh_token", "c1")).toMatchObject({ tipo: "accion", accion: "extend_token" });
  });

  it("muestra la reparación de lo que falla o no se pudo revisar", () => {
    expect(muestraReparacion(check("token_valid", false, "reauthorize"))).toBe(true);
    expect(muestraReparacion(check("token_valid", null, "reauthorize"))).toBe(true);
    expect(muestraReparacion(check("token_valid", true, "reauthorize"))).toBe(false);
    // Facturación siempre es `null` (manual): su selector ya está en la tarjeta.
    expect(muestraReparacion(check("billing", null, "configure_billing"))).toBe(false);
  });

  it("nombra los checks en castellano, también con varios números", () => {
    expect(nombreDelCheck("token_valid")).toBe("Token de acceso");
    expect(nombreDelCheck("number_registered:123")).toBe("Número registrado (123)");
    expect(nombreDelCheck("algo_nuevo")).toBe("algo_nuevo");
  });
});
