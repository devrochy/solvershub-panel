import { describe, expect, it } from "vitest";

import { NAV_GROUPS } from "@/components/shell/nav";

import { gruposVisibles, itemActivo, migasPara, pestanasPara } from "./navegacion";
import { cookieModoSidebar, leerModoSidebar } from "./preferencias";

const TODO = Object.fromEntries(NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.section, "write"])));
const grupos = gruposVisibles(TODO);

describe("navegación del shell (HU-DS-04)", () => {
  it("solo muestra los grupos con secciones permitidas", () => {
    const soloAtencion = gruposVisibles({ conversations: "write", escalations: "read" });
    expect(soloAtencion.map((g) => g.group.id)).toEqual(["operacion"]);
    expect(soloAtencion[0].visible.map((i) => i.label)).toEqual(["Conversaciones", "Escalaciones"]);
  });

  it("el ítem activo es el más específico", () => {
    expect(itemActivo("/cobranza/carteras/7", grupos)?.item.label).toBe("Carteras");
    expect(itemActivo("/cobranza", grupos)?.item.label).toBe("Resumen");
    expect(itemActivo("/conexiones/requisitos", grupos)?.item.label).toBe("Requisitos de Meta");
    expect(itemActivo("/no-existe", grupos)).toBeNull();
  });

  it("migas: grupo › sección, y el título en un detalle", () => {
    expect(migasPara("/cobranza/carteras", grupos)).toEqual([{ label: "Cobranza" }, { label: "Carteras" }]);
    expect(migasPara("/cobranza/carteras/7", grupos, "Cartera Norte")).toEqual([
      { label: "Cobranza" },
      { label: "Carteras", href: "/cobranza/carteras" },
      { label: "Cartera Norte" },
    ]);
    expect(migasPara("/conversaciones", grupos)).toEqual([{ label: "Operación" }, { label: "Conversaciones" }]);
  });

  it("pestañas: hermanas del pack y de la misma subsección, solo si hay más de una", () => {
    const agenda = pestanasPara("/calendario/tipos", grupos).map((p) => p.label);
    expect(agenda).toEqual(["Conexión", "Horario de atención", "Tipos de cita", "Bloqueos", "Citas"]);
    const monitoreo = pestanasPara("/cobranza/reglas", grupos).map((p) => p.label);
    expect(monitoreo).toEqual(["Monitoreo IA", "Reglas de negociación"]);
    expect(pestanasPara("/conversaciones", grupos)).toEqual([]);
  });

  it("las pestañas respetan los permisos", () => {
    const parcial = gruposVisibles({ "pack_calendar:citas": "read", "pack_calendar:tipos": "read" });
    expect(pestanasPara("/calendario/citas", parcial).map((p) => p.label)).toEqual(["Tipos de cita", "Citas"]);
    const una = gruposVisibles({ "pack_calendar:citas": "read" });
    expect(pestanasPara("/calendario/citas", una)).toEqual([]);
  });

  it("cada sección de un pack tiene su propio ícono (la barra plegada se lee por íconos)", () => {
    for (const grupo of NAV_GROUPS.filter((g) => g.pack)) {
      const unicos = new Set(grupo.items.map((i) => i.icon));
      expect({ grupo: grupo.id, unicos: unicos.size }).toEqual({ grupo: grupo.id, unicos: grupo.items.length });
    }
  });
});

describe("preferencia de la barra lateral", () => {
  it("sin cookie o con un valor raro, es auto", () => {
    expect(leerModoSidebar(undefined)).toBe("auto");
    expect(leerModoSidebar("lo-que-sea")).toBe("auto");
    expect(leerModoSidebar("plegada")).toBe("plegada");
    expect(cookieModoSidebar("expandida")).toMatch(/^panel_sidebar=expandida; path=\/; max-age=31536000; samesite=lax$/);
  });
});
