import { describe, expect, it } from "vitest";

import type { AgentSkill, PaymentAccount } from "@/lib/api/types";
import { PAGOS, cuentaElegida, estadoDeHabilidad, etiquetaDeCuenta, textoDeHabilidad } from "@/lib/habilidades-del-agente";

const cuenta = (id: string, sandbox = true): PaymentAccount => ({
  id,
  name: `Cuenta ${id}`,
  public_key: "pub_test_x",
  sandbox,
  link_expires_hours: 24,
  min_amount: null,
  events_url: `https://x/webhooks/payments/wompi/neg/${id}`,
  agent_ids: [],
});

describe("habilidades del agente", () => {
  it("nombra las habilidades sin palabras internas", () => {
    expect(textoDeHabilidad(PAGOS).nombre).toBe("Pagos en línea");
    expect(textoDeHabilidad("pack_x").nombre).toBe("Habilidad");
  });

  it("estado: sin agregar, lista o falta configurar", () => {
    const base: AgentSkill = { pack_id: PAGOS, installed: false, status: null, config: {} };
    expect(estadoDeHabilidad(base)).toBe("sin_agregar");
    expect(estadoDeHabilidad({ ...base, installed: true, status: "pending_config" })).toBe("falta_configurar");
    expect(estadoDeHabilidad({ ...base, installed: true, status: "active" })).toBe("lista");
  });

  it("encuentra la cuenta elegida solo si sigue existiendo", () => {
    const h: AgentSkill = { pack_id: PAGOS, installed: true, status: "active", config: { cuenta_id: "b" } };
    expect(cuentaElegida(h, [cuenta("a"), cuenta("b")])?.id).toBe("b");
    expect(cuentaElegida(h, [cuenta("a")])).toBeUndefined();
    expect(etiquetaDeCuenta(cuenta("a", false))).toBe("Cuenta a · producción");
  });
});
