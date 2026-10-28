import { describe, expect, it } from "vitest";

import type { PlatformTenant } from "@/lib/api/types";

import { estadoDelPlan } from "./estados-negocio";

function negocio(cambios: Partial<PlatformTenant> = {}): Pick<PlatformTenant, "status" | "plan_name" | "plan_status" | "operational"> {
  return {
    status: "active",
    plan_name: "Pro",
    plan_status: "active",
    operational: true,
    ...cambios,
  };
}

describe("estadoDelPlan", () => {
  it("nombra el plan y su estado de suscripción", () => {
    expect(estadoDelPlan(negocio())).toEqual({ label: "Pro · Vigente", variant: "success" });
    expect(estadoDelPlan(negocio({ plan_status: "trialing" }))).toEqual({
      label: "Pro · En prueba",
      variant: "accent",
    });
    expect(estadoDelPlan(negocio({ plan_status: "past_due" }))).toEqual({
      label: "Pro · Pago pendiente",
      variant: "warning",
    });
    expect(estadoDelPlan(negocio({ plan_status: "expired", operational: false }))).toEqual({
      label: "Pro · Vencida",
      variant: "danger",
    });
    expect(estadoDelPlan(negocio({ plan_status: "canceled", operational: false }))).toEqual({
      label: "Pro · Cancelada",
      variant: "neutral",
    });
  });

  it("un negocio sin suscripción se lee como «Sin plan»", () => {
    expect(estadoDelPlan(negocio({ plan_name: "—", plan_status: "sin_suscripcion" }))).toEqual({
      label: "Sin plan",
      variant: "neutral",
    });
  });

  it("avisa cuando el plan está vigente pero el negocio activo no opera", () => {
    expect(estadoDelPlan(negocio({ operational: false }))).toEqual({
      label: "Pro · Sin operar",
      variant: "warning",
    });
  });

  it("un negocio suspendido conserva el estado de su plan", () => {
    expect(estadoDelPlan(negocio({ status: "suspended", operational: false }))).toEqual({
      label: "Pro · Vigente",
      variant: "success",
    });
  });

  it("no inventa etiquetas para estados desconocidos", () => {
    expect(estadoDelPlan(negocio({ plan_status: "en_revision" }))).toEqual({
      label: "Pro · en_revision",
      variant: "neutral",
    });
  });
});
