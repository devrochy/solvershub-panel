import { describe, expect, it } from "vitest";

import type { HealthConnectionMeta, OpcionesMetaEstado, OpcionesMetaResultado } from "@/lib/api/types";
import { leerError } from "@/lib/plantillas-opciones";
import {
  REINTENTABLES,
  avisoDeDegradacion,
  categoriaEtiqueta,
  conexionesParaPublicar,
  ejemplosIniciales,
  ejemplosParaEnviar,
  enlacePlantillasMeta,
  esFalloReintentable,
  estadoDeVersion,
  mensajeDePublicacion,
  motivoNoEnviar,
  motivoNoLista,
  nombreDeConexion,
  presentacionDeEstado,
  presentacionDeResultado,
  resumirComponentes,
} from "@/lib/plantillas-opciones-meta";
import { metaDeVersion, saludMeta } from "@/lib/testing/fixtures";

const meta = (estado: string, extra: Record<string, unknown> = {}) => metaDeVersion("confirmar_cita_v1", estado, extra) as OpcionesMetaEstado;
const resultado = (extra: Partial<OpcionesMetaResultado>): OpcionesMetaResultado => ({
  ok: false,
  outcome: "network_error",
  reintentable: true,
  nombre: "confirmar_cita_v1",
  estado: "DRAFT",
  categoria: "UTILITY",
  message_template_id: null,
  meta_template_id: null,
  motivo: null,
  ...extra,
});

describe("estados de Meta → insignia", () => {
  it.each([
    ["DRAFT", "Enviando a Meta", "info"],
    ["PENDING", "En revisión", "warning"],
    ["APPROVED", "Aprobada", "success"],
    ["REJECTED", "Rechazada", "danger"],
    ["PAUSED", "Pausada", "warning"],
    ["DISABLED", "Desactivada", "danger"],
  ])("%s se ve como «%s» (%s)", (estado, etiqueta, tono) => {
    const p = presentacionDeEstado(estado);
    expect(p.etiqueta).toBe(etiqueta);
    expect(p.tono).toBe(tono);
    expect(p.explicacion.length).toBeGreaterThan(20);
  });

  it("un estado desconocido no rompe: sale neutro con su nombre", () => {
    const p = presentacionDeEstado("FLAGGED_NUEVO");
    expect(p.tono).toBe("neutral");
    expect(p.etiqueta).toContain("FLAGGED_NUEVO");
    expect(presentacionDeEstado(null).etiqueta).toBe("Sin estado");
  });

  it("los textos no usan jerga del backend", () => {
    for (const e of ["DRAFT", "PENDING", "APPROVED", "REJECTED", "PAUSED", "DISABLED"]) {
      const { etiqueta, explicacion } = presentacionDeEstado(e);
      expect(`${etiqueta} ${explicacion}`).not.toMatch(/outcome|tenant|webhook|message_template/i);
    }
  });
});

describe("resultado de publicar", () => {
  const TODOS = [
    "published", "already_published", "network_error", "rate_limited", "in_progress", "internal_error", "meta_rejected",
    "invalid_definition", "name_taken", "other_account", "template_deleted", "meta_id_taken", "connection_not_ready",
    "template_quota_full", "version_retired", "version_not_found", "invalid_category", "invalid_language",
  ];

  it("cada outcome del OpenAPI tiene texto propio", () => {
    for (const o of TODOS) {
      const p = presentacionDeResultado(o);
      expect(p.etiqueta, o).not.toBe("No se pudo publicar");
      expect(p.explicacion.length, o).toBeGreaterThan(15);
    }
  });

  it("los reintentables coinciden con la lista del backend", () => {
    expect([...REINTENTABLES].sort()).toEqual(["in_progress", "internal_error", "network_error", "rate_limited"]);
  });

  it("un outcome nuevo cae a un texto genérico, no a un error", () => {
    expect(presentacionDeResultado("algo_nuevo").tono).toBe("warning");
  });
});

describe("estado de una versión: reintentar solo si es reintentable", () => {
  it("sin plantilla de Meta: se puede publicar, no reintentar", () => {
    const e = estadoDeVersion(null);
    expect(e.enMeta).toBe(false);
    expect(e.reintentable).toBe(false);
    expect(e.insignia.etiqueta).toBe("Sin enviar a Meta");
  });

  it("el último intento reintentable (corte de red) se puede repetir", () => {
    const e = estadoDeVersion(null, resultado({ outcome: "network_error", reintentable: true }));
    expect(e.reintentable).toBe(true);
    expect(e.insignia.tono).toBe("warning");
  });

  it("un rechazo de Meta del último intento NO se reintenta y muestra el motivo", () => {
    const e = estadoDeVersion(null, resultado({ outcome: "meta_rejected", reintentable: false, motivo: "Parameter 'example' is invalid." }));
    expect(e.reintentable).toBe(false);
    expect(e.insignia.tono).toBe("danger");
    expect(e.motivo).toBe("Parameter 'example' is invalid.");
    expect(e.siguiente).toMatch(/versión nueva/);
  });

  it("lo persistido en DRAFT con el código de un resultado reintentable permite reintentar; con uno no reintentable, no", () => {
    expect(estadoDeVersion(meta("DRAFT", { error_de_publicacion: "rate_limited" })).reintentable).toBe(true);
    expect(estadoDeVersion(meta("DRAFT", { error_de_publicacion: "name_taken" })).reintentable).toBe(false);
  });

  it("DRAFT con un texto de error desconocido se reintenta (el backend concilia antes de crear) y lo muestra", () => {
    const e = estadoDeVersion(meta("DRAFT", { error_de_publicacion: "Timeout hablando con Graph" }));
    expect(e.reintentable).toBe(true);
    expect(e.motivo).toBe("Timeout hablando con Graph");
  });

  it("DRAFT sin error está en proceso: no hay reintento", () => {
    const e = estadoDeVersion(meta("DRAFT"));
    expect(e.reintentable).toBe(false);
    expect(e.insignia.etiqueta).toBe("Enviando a Meta");
  });

  it("una vez que Meta respondió, manda el estado real aunque el último intento haya fallado", () => {
    const e = estadoDeVersion(meta("PENDING"), resultado({ outcome: "network_error", reintentable: true }));
    expect(e.insignia.etiqueta).toBe("En revisión");
    expect(e.reintentable).toBe(false);
  });

  it("rechazada: trae el motivo y la recomendación de Meta, sin reintento", () => {
    const e = estadoDeVersion(meta("REJECTED", { motivo_rechazo: "INVALID_FORMAT", recomendacion: "Quita los saltos de línea." }));
    expect(e.motivo).toBe("INVALID_FORMAT");
    expect(e.recomendacion).toBe("Quita los saltos de línea.");
    expect(e.reintentable).toBe(false);
    expect(e.aprobada).toBe(false);
  });

  it("aprobada, pausada y desactivada no se reintentan; solo la aprobada está lista para enviar", () => {
    expect(estadoDeVersion(meta("APPROVED")).aprobada).toBe(true);
    for (const s of ["APPROVED", "PAUSED", "DISABLED", "PENDING"]) expect(estadoDeVersion(meta(s)).reintentable).toBe(false);
  });

  it("avisa cuando Meta recategorizó", () => {
    const e = estadoDeVersion(meta("APPROVED", { categoria: "MARKETING", categoria_anterior: "UTILITY" }));
    expect(e.categoriaCambiada).toEqual({ de: "UTILITY", a: "MARKETING" });
    expect(estadoDeVersion(meta("APPROVED")).categoriaCambiada).toBeNull();
  });
});

describe("aviso de degradación", () => {
  it("sin contraparte aprobada explica el texto de respaldo fuera de las 24 horas", () => {
    for (const e of [estadoDeVersion(null), estadoDeVersion(meta("PENDING")), estadoDeVersion(meta("REJECTED")), estadoDeVersion(meta("PAUSED"))]) {
      const a = avisoDeDegradacion(e);
      expect(a).not.toBeNull();
      expect(a!.texto).toMatch(/24 horas/);
      expect(a!.texto).toMatch(/texto con las opciones numeradas/);
      expect(a!.texto).toMatch(/no ejecuta nada/);
    }
  });

  it("con la plantilla aprobada no hay aviso", () => {
    expect(avisoDeDegradacion(estadoDeVersion(meta("APPROVED")))).toBeNull();
  });
});

describe("conexiones", () => {
  const todas = saludMeta.connections as unknown as HealthConnectionMeta[];
  const ahora = new Date("2026-10-27T12:00:00Z");

  it("solo las de WhatsApp conectadas o degradadas están listas; las demás dicen por qué no", () => {
    const { listas, noListas } = conexionesParaPublicar(todas, ahora);
    expect(listas.map((c) => c.id.slice(-4))).toEqual(["aaaa", "bbbb"]);
    expect(noListas).toHaveLength(1);
    expect(noListas[0].conexion.id.endsWith("cccc")).toBe(true);
    expect(noListas[0].motivo).toMatch(/error/i);
  });

  it("un token vencido no sirve", () => {
    const vencida = { ...todas[0], token_expires_at: "2026-10-01T00:00:00Z" };
    expect(motivoNoLista(vencida, ahora)).toMatch(/token venció/);
    expect(motivoNoLista({ ...todas[0], status: "revoked" }, ahora)).toMatch(/pausada/);
    expect(motivoNoLista({ ...todas[0], status: "pending" }, ahora)).toMatch(/no termina/);
  });

  it("el nombre distingue origen y entorno sin enseñar el id completo", () => {
    const n = nombreDeConexion(todas[1]);
    expect(n).toContain("App propia");
    expect(n).toContain("Prueba");
    expect(n).toContain("…00bbbb");
    expect(n).not.toContain(todas[1].id);
  });

  it("enlaza a las plantillas de la conexión única; con varias, al selector", () => {
    expect(enlacePlantillasMeta([todas[0]])).toBe(`/conexiones/meta/${todas[0].id}/plantillas`);
    expect(enlacePlantillasMeta(todas)).toBe("/plantillas");
    expect(enlacePlantillasMeta(todas, todas[1].id)).toBe(`/conexiones/meta/${todas[1].id}/plantillas`);
    expect(enlacePlantillasMeta([])).toBe("/plantillas");
  });
});

describe("petición", () => {
  it("no se envía sin conexión, sin categoría válida o sin la confirmación", () => {
    expect(motivoNoEnviar({ conexion: null, categoria: "UTILITY", entendido: true })).toMatch(/conexión/);
    expect(motivoNoEnviar({ conexion: "c1", categoria: null, entendido: true })).toMatch(/categoría/);
    expect(motivoNoEnviar({ conexion: "c1", categoria: "AUTHENTICATION", entendido: true })).toMatch(/categoría/);
    expect(motivoNoEnviar({ conexion: "c1", categoria: "UTILITY", entendido: false })).toMatch(/entiendes/);
    expect(motivoNoEnviar({ conexion: "c1", categoria: "MARKETING", entendido: true })).toBeNull();
  });

  it("los valores de muestra se recortan a 60 caracteres y los vacíos no viajan", () => {
    const largo = "x".repeat(100);
    expect(ejemplosParaEnviar({ "cliente.nombre": " Ana ", vacio: "   ", largo })).toEqual({ "cliente.nombre": "Ana", largo: "x".repeat(60) });
    expect(ejemplosIniciales(["cliente.nombre", "otra.cosa"])).toEqual({ "cliente.nombre": "Ana", "otra.cosa": "Ejemplo" });
  });

  it("etiqueta de categoría", () => {
    expect(categoriaEtiqueta("UTILITY")).toBe("Utilidad");
    expect(categoriaEtiqueta("MARKETING")).toBe("Marketing");
    expect(categoriaEtiqueta(null)).toBe("Sin categoría");
  });
});

describe("componentes de Meta", () => {
  it("resume cuerpo, pie y botones QUICK_REPLY con su largo", () => {
    const r = resumirComponentes([
      { type: "BODY", text: "Hola {{1}}" },
      { type: "FOOTER", text: "Pie" },
      { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Confirmar" }, { type: "QUICK_REPLY", text: "x".repeat(26) }, { type: "URL", text: "Web" }] },
    ]);
    expect(r.cuerpo).toBe("Hola {{1}}");
    expect(r.pie).toBe("Pie");
    expect(r.botones.map((b) => [b.largo, b.excede])).toEqual([[9, false], [26, true]]);
    expect(r.excedeBotones).toBe(false);
  });

  it("más de 10 botones supera el tope", () => {
    const botones = Array.from({ length: 11 }, (_, i) => ({ type: "QUICK_REPLY", text: `B${i}` }));
    expect(resumirComponentes([{ type: "BUTTONS", buttons: botones }]).excedeBotones).toBe(true);
  });

  it("tolera componentes vacíos o raros", () => {
    expect(resumirComponentes(null)).toEqual({ cuerpo: "", pie: null, botones: [], excedeBotones: false });
    expect(resumirComponentes([null, 3, "x"] as unknown[])).toEqual({ cuerpo: "", pie: null, botones: [], excedeBotones: false });
  });
});

describe("errores de la petición: sobre propio y 422 estándar de FastAPI", () => {
  it("el sobre propio con `code` de categoría inválida", () => {
    const e = leerError(422, { error: { code: "categoria_invalida", message: "La categoría debe ser UTILITY (utilidad) o MARKETING (marketing)." } });
    expect(mensajeDePublicacion(e)).toBe("Elige una categoría válida: Utilidad o Marketing.");
  });

  it("el 422 estándar de FastAPI: `detail` es una lista con el campo en `loc`", () => {
    const e = leerError(422, { detail: [{ type: "literal_error", loc: ["body", "meta", "categoria"], msg: "Input should be 'UTILITY' or 'MARKETING'" }] });
    expect(e.campos).toEqual(["categoria"]);
    expect(mensajeDePublicacion(e)).toBe("Elige una categoría válida: Utilidad o Marketing.");
  });

  it("el mismo 422 ya traducido por el BFF (`error` de texto, sin código)", () => {
    const e = leerError(422, { error: "Hay datos que no se pudieron guardar. Revisa: categoria." });
    expect(mensajeDePublicacion(e)).toBe("Elige una categoría válida: Utilidad o Marketing.");
  });

  it("idioma y conexión inválidos", () => {
    expect(mensajeDePublicacion(leerError(422, { detail: [{ loc: ["body", "idioma"], msg: "x" }] }))).toBe("Elige un idioma de la lista.");
    expect(mensajeDePublicacion(leerError(422, { detail: [{ loc: ["body", "connection_id"], msg: "x" }] }))).toBe("Elige una conexión de WhatsApp de la lista.");
    expect(mensajeDePublicacion(leerError(422, { error: { code: "idioma_invalido", message: "x" } }))).toBe("Elige un idioma de la lista.");
  });

  it("403, 404 y 409 de versión retirada", () => {
    expect(mensajeDePublicacion(leerError(403, { error: "Prohibido" }))).toMatch(/propietario/);
    expect(mensajeDePublicacion(leerError(404, { error: { code: "not_found", message: "x" } }))).toMatch(/ya no existe/);
    expect(mensajeDePublicacion(leerError(409, { error: { code: "version_retirada", message: "x" } }))).toMatch(/retirada/);
  });

  it("un 502 o un corte invitan a reintentar sin asustar", () => {
    for (const e of [leerError(502, { error: "No se pudo contactar el backend." }), { status: 0, mensaje: "x", hallazgos: [] }]) {
      expect(mensajeDePublicacion(e)).toMatch(/Puedes reintentar/);
      expect(esFalloReintentable(e)).toBe(true);
    }
    expect(esFalloReintentable(leerError(422, { error: "x" }))).toBe(false);
  });

  it("nunca lanza con cuerpos raros", () => {
    for (const cuerpo of [null, undefined, "texto", 3, [], { detail: "no es lista" }, { detail: [null] }]) {
      expect(() => mensajeDePublicacion(leerError(422, cuerpo))).not.toThrow();
    }
  });
});
