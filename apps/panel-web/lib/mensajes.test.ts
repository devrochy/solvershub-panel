import { describe, expect, it } from "vitest";

import type { MensajeDelCatalogo } from "@/lib/api/types";
import { catalogoDeMensajes } from "@/lib/testing/fixtures";

import {
  canalesLabel,
  contarPorTipo,
  detalleDeEstado,
  enlaceAlEditor,
  estadoDeMensaje,
  filtrarPorTipo,
  motivoOmitido,
  nombreDeMensaje,
  tiposVisibles,
} from "./mensajes";

const [meta, evento, opciones, pack] = catalogoDeMensajes.mensajes as [MensajeDelCatalogo, MensajeDelCatalogo, MensajeDelCatalogo, MensajeDelCatalogo];

describe("enlace al editor de origen", () => {
  it("cada tipo apunta a su editor actual", () => {
    expect(enlaceAlEditor(meta.fuente)).toBe("/conexiones/meta/c1/plantillas");
    expect(enlaceAlEditor(evento.fuente)).toBe("/plantillas/eventos");
    expect(enlaceAlEditor(opciones.fuente)).toBe("/plantillas-opciones/confirmar_cita");
    expect(enlaceAlEditor(pack.fuente)).toBe("/habilidades/pack_calendar");
  });

  it("sin el dato necesario no inventa una ruta", () => {
    expect(enlaceAlEditor({ editor: "meta" })).toBeNull();
    expect(enlaceAlEditor({ editor: "opciones" })).toBeNull();
    expect(enlaceAlEditor({ editor: "texto_pack" })).toBeNull();
  });

  it("codifica la clave", () => {
    expect(enlaceAlEditor({ editor: "opciones", clave: "a b/c" })).toBe("/plantillas-opciones/a%20b%2Fc");
  });
});

describe("estado legible", () => {
  it("traduce el estado de Meta y el propio de cada tipo, sin mostrar el enum crudo", () => {
    expect(estadoDeMensaje(meta)).toEqual({ etiqueta: "Aprobada", tono: "success" });
    expect(estadoDeMensaje({ tipo: "meta", estado: "REJECTED" })).toEqual({ etiqueta: "Rechazada", tono: "danger" });
    expect(estadoDeMensaje(evento)).toEqual({ etiqueta: "Con plantilla", tono: "success" });
    expect(estadoDeMensaje({ tipo: "evento", estado: "sin_mapear" }).tono).toBe("neutral");
    expect(estadoDeMensaje(opciones)).toEqual({ etiqueta: "Activa", tono: "success" });
    expect(estadoDeMensaje({ tipo: "texto_pack", estado: "config_invalida" }).tono).toBe("danger");
  });

  it("un estado nuevo del backend se muestra legible en vez de romper", () => {
    expect(estadoDeMensaje({ tipo: "meta", estado: "ALGO_NUEVO" }).etiqueta).toBe("Algo nuevo");
  });

  it("el detalle depende del tipo", () => {
    expect(detalleDeEstado(meta)).toBe("Categoría utility");
    expect(detalleDeEstado(evento)).toBe("Plantilla: cobro_nuevo");
    expect(detalleDeEstado(opciones)).toBe("En Meta: aprobada");
    expect(detalleDeEstado(pack)).toBe("Agenda");
    expect(detalleDeEstado({ tipo: "meta", estado_detalle: null })).toBeNull();
  });
});

describe("nombres, canales y filtros", () => {
  it("el texto de una habilidad lleva el nombre de la habilidad", () => {
    expect(nombreDeMensaje(pack)).toContain("Cuerpo del correo de confirmación");
    expect(nombreDeMensaje(opciones)).toBe("Confirmar cita");
  });

  it("el correo se nombra como correo", () => {
    expect(canalesLabel(["email"])).toBe("Correo");
    expect(canalesLabel(["whatsapp"])).toBe("WhatsApp");
    expect(canalesLabel([])).toBe("—");
  });

  it("filtra y cuenta por tipo", () => {
    expect(filtrarPorTipo(catalogoDeMensajes.mensajes, "todos")).toHaveLength(4);
    expect(filtrarPorTipo(catalogoDeMensajes.mensajes, "evento")).toEqual([evento]);
    expect(contarPorTipo(catalogoDeMensajes.mensajes)).toEqual({ meta: 1, evento: 1, opciones: 1, texto_pack: 1 });
  });

  it("no ofrece la pestaña de un tipo oculto y sin mensajes", () => {
    const omitidas = [{ tipo: "opciones", motivo: "bandera_apagada" }] as const;
    expect(tiposVisibles([meta], [...omitidas])).toEqual(["meta", "evento", "texto_pack"]);
    expect(tiposVisibles([meta, opciones], [...omitidas])).toContain("opciones");
  });

  it("explica por qué falta un tipo", () => {
    expect(motivoOmitido({ tipo: "opciones", motivo: "bandera_apagada" })).toMatch(/desactivada/);
    expect(motivoOmitido({ tipo: "meta", motivo: "sin_permiso" })).toMatch(/rol no tiene acceso/);
  });
});
