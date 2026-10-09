import { describe, expect, it } from "vitest";

import type { PasoPrimerosPasos } from "@/lib/api/types";
import { estadoPasoLabel } from "@/lib/labels";

import { copiaDelPaso, hayPasosParaActuar, hayPasosPendientes, porcentajeDeAvance } from "./primeros-pasos";

function paso(parcial: Partial<PasoPrimerosPasos> & Pick<PasoPrimerosPasos, "clave">): PasoPrimerosPasos {
  return { estado: "pendiente", puede_actuar: true, ...parcial };
}

describe("primeros pasos (HU-SH-06)", () => {
  it("cada paso fijo tiene título, explicación y adónde lleva", () => {
    expect(copiaDelPaso(paso({ clave: "datos_negocio" }))).toMatchObject({
      titulo: "Describe tu negocio",
      href: "/configuracion",
    });
    expect(copiaDelPaso(paso({ clave: "whatsapp" })).href).toBe("/conexiones");
    expect(copiaDelPaso(paso({ clave: "probar_asistente" })).href).toBe("/asistente");
    expect(copiaDelPaso(paso({ clave: "equipo" })).href).toBe("/colaboradores");
  });

  it("el WhatsApp a medias explica qué falta según el motivo", () => {
    const sinVerificar = copiaDelPaso(paso({ clave: "whatsapp", estado: "en_curso", motivo: "sin_verificar" }));
    expect(sinVerificar.href).toBe("/conexiones/meta");
    expect(sinVerificar.descripcion).toContain("diagnóstico");
    const sinTerminar = copiaDelPaso(paso({ clave: "whatsapp", estado: "en_curso", motivo: "sin_terminar" }));
    expect(sinTerminar.accion).toBe("Terminar conexión");
  });

  it("el catálogo se adapta a la habilidad que lo aporta", () => {
    expect(copiaDelPaso(paso({ clave: "catalogo", tipo: "catalogo", pack: "pack_commerce", motivo: "sin_contenido" }))).toMatchObject({
      titulo: "Carga tu catálogo",
      href: "/comercio/productos",
    });
    expect(copiaDelPaso(paso({ clave: "catalogo", tipo: "servicios", pack: "pack_calendar" })).href).toBe(
      "/calendario/tipos",
    );
    expect(copiaDelPaso(paso({ clave: "catalogo", tipo: "cartera", pack: "pack_cobranza" })).href).toBe(
      "/cobranza/clientes",
    );
    expect(copiaDelPaso(paso({ clave: "catalogo", motivo: "sin_habilidad" }))).toMatchObject({
      href: "/habilidades",
      accion: "Ver habilidades",
    });
  });

  it("el catálogo cumplido cuenta lo que se cargó", () => {
    const uno = copiaDelPaso(paso({ clave: "catalogo", estado: "completo", tipo: "catalogo", cantidad: 1 }));
    expect(uno.descripcion).toBe("1 producto cargado.");
    const muchos = copiaDelPaso(paso({ clave: "catalogo", estado: "completo", tipo: "servicios", cantidad: 1200 }));
    expect(muchos.descripcion).toMatch(/^1\.200 servicios creados\.$/);
  });

  it("una habilidad pendiente usa su nombre y su guía, y lleva a su configuración", () => {
    const copia = copiaDelPaso(
      paso({
        clave: "configurar_pack_payments",
        pack: "pack_payments",
        titulo: "Pagos en línea",
        explicacion: "Configura tus llaves de Wompi.",
        motivo: "faltan_datos",
      }),
    );
    expect(copia).toEqual({
      titulo: "Configura Pagos en línea",
      descripcion: "Configura tus llaves de Wompi.",
      accion: "Configurar",
      href: "/habilidades/pack_payments",
    });
  });

  it("el tipo de negocio pendiente dice qué plan necesita", () => {
    const copia = copiaDelPaso(
      paso({ clave: "activar_preset", titulo: "Comercio", plan_requerido: "Basic", motivo: "plan_insuficiente" }),
    );
    expect(copia.titulo).toBe("Activa las habilidades de Comercio");
    expect(copia.descripcion).toContain("plan Basic");
    expect(copia.href).toBe("/plan");
  });

  it("un paso desconocido no inventa una acción", () => {
    expect(copiaDelPaso(paso({ clave: "algo_nuevo" })).href).toBeNull();
  });

  it("avance y si quedan pasos", () => {
    expect(porcentajeDeAvance(3, 6)).toBe(50);
    expect(porcentajeDeAvance(0, 0)).toBe(0);
    expect(porcentajeDeAvance(7, 5)).toBe(100);
    expect(hayPasosPendientes([{ estado: "completo" }, { estado: "en_curso" }])).toBe(true);
    expect(hayPasosPendientes([{ estado: "completo" }])).toBe(false);
  });

  it("solo cuenta los pasos pendientes que el usuario puede resolver", () => {
    expect(hayPasosParaActuar([{ estado: "pendiente", puede_actuar: false }])).toBe(false);
    expect(hayPasosParaActuar([{ estado: "completo", puede_actuar: true }])).toBe(false);
    expect(hayPasosParaActuar([{ estado: "en_curso", puede_actuar: true }])).toBe(true);
  });

  it("el estado del paso nunca se muestra crudo", () => {
    expect(estadoPasoLabel("completo")).toBe("Listo");
    expect(estadoPasoLabel("en_curso")).toBe("En curso");
    expect(estadoPasoLabel("pendiente")).toBe("Pendiente");
  });
});
