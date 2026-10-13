import { describe, expect, it } from "vitest";

import type { QaEvento, QaItem } from "@/lib/api/types";
import { estadoDePrueba, fechaDeCatalogo, porcentaje, segmentosDeProgreso } from "@/lib/qa/estados";
import { describirEvento } from "@/lib/qa/historial";
import { FILTROS_INICIALES, agrupar, filtrar, modulos, primerPasoPendiente, siguientePendiente, vecina } from "@/lib/qa/lista";
import { accionDeTecla } from "@/lib/qa/teclas";

function item(slug: string, extra: Partial<QaItem> = {}): QaItem {
  return {
    slug,
    seccion: "pruebas",
    orden: 0,
    grupo: "Navegación",
    titulo: `Prueba ${slug}`,
    estado: "sin_correr",
    pasos: [{ accion: "Abrir", esperado: "Abre" }],
    ...extra,
  } as QaItem;
}

const ITEMS = [
  item("a", { modulo: "Panel", prioridad: "P0", hu: ["HU-DS-05"], titulo: "Ir con Ctrl+K" }),
  item("b", { modulo: "Panel" }),
  item("c", { modulo: "App de campo", grupo: "Pagos", titulo: "Pago sin conexión" }),
];
const MIS_ESTADOS: Record<string, string> = { a: "ok", c: "falla" };
const estadoDe = (slug: string) => MIS_ESTADOS[slug] ?? "sin_correr";

describe("estados", () => {
  it("deriva el estado de la prueba como el backend", () => {
    expect(estadoDePrueba(3, {})).toBe("sin_correr");
    expect(estadoDePrueba(3, { "1": "ok" })).toBe("en_curso");
    expect(estadoDePrueba(3, { "1": "ok", "2": "falla" })).toBe("falla");
    expect(estadoDePrueba(2, { "1": "bloqueado" })).toBe("bloqueada");
    expect(estadoDePrueba(2, { "1": "ok", "2": "omitido" })).toBe("ok");
    expect(estadoDePrueba(2, { "1": "omitido", "2": "omitido" })).toBe("omitida");
  });

  it("arma los segmentos sin los vacíos y calcula el porcentaje", () => {
    const seg = segmentosDeProgreso({
      total: 10, terminadas: 4, sin_correr: 5, en_curso: 1, omitida: 0, ok: 3, bloqueada: 0, falla: 1,
    });
    expect(seg.map((s) => s.clave)).toEqual(["ok", "falla", "en_curso"]);
    expect(porcentaje(4, 10)).toBe(40);
    expect(porcentaje(1, 0)).toBe(0);
    expect(fechaDeCatalogo("2026-10-13")).toBe("13/10/26");
    expect(fechaDeCatalogo(null)).toBe("—");
  });
});

describe("lista lateral", () => {
  it("filtra por texto sin tildes, estado, módulo y humo", () => {
    expect(filtrar(ITEMS, { ...FILTROS_INICIALES, texto: "conexion" }, estadoDe).map((i) => i.slug)).toEqual(["c"]);
    expect(filtrar(ITEMS, { ...FILTROS_INICIALES, texto: "hu-ds-05" }, estadoDe).map((i) => i.slug)).toEqual(["a"]);
    expect(filtrar(ITEMS, { ...FILTROS_INICIALES, estado: "pendientes" }, estadoDe).map((i) => i.slug)).toEqual(["b"]);
    expect(filtrar(ITEMS, { ...FILTROS_INICIALES, estado: "falla" }, estadoDe).map((i) => i.slug)).toEqual(["c"]);
    expect(filtrar(ITEMS, { ...FILTROS_INICIALES, modulo: "Panel" }, estadoDe)).toHaveLength(2);
    expect(filtrar(ITEMS, { ...FILTROS_INICIALES, soloHumo: true }, estadoDe).map((i) => i.slug)).toEqual(["a"]);
  });

  it("agrupa por módulo y grupo con lo terminado", () => {
    const grupos = agrupar(ITEMS, estadoDe);
    expect(grupos.map((g) => [g.titulo, g.items.length, g.terminadas])).toEqual([
      ["Panel · Navegación", 2, 1],
      ["App de campo · Pagos", 1, 1],
    ]);
    expect(modulos(ITEMS)).toEqual(["App de campo", "Panel"]);
  });

  it("encuentra la siguiente pendiente y las vecinas", () => {
    expect(siguientePendiente(ITEMS, "a", estadoDe)).toBe("b");
    expect(siguientePendiente(ITEMS, "b", (s) => (s === "b" ? "sin_correr" : "ok"))).toBeNull();
    expect(vecina(ITEMS, "a", 1)).toBe("b");
    expect(vecina(ITEMS, "a", -1)).toBeNull();
    expect(vecina(ITEMS, null, 1)).toBe("a");
    expect(primerPasoPendiente(3, { "1": { estado: "ok" }, "2": { estado: null } })).toBe(2);
    expect(primerPasoPendiente(1, { "1": { estado: "ok" } })).toBeNull();
  });
});

describe("historial y atajos", () => {
  it("describe los eventos en frases claras", () => {
    const ev = (campo: string, extra: Partial<QaEvento> = {}) => ({ campo, por: "ana", ...extra }) as QaEvento;
    expect(describirEvento(ev("paso.estado", { paso: 2, antes: null, despues: "falla" }))).toBe("Paso 2: sin marcar → Falla");
    expect(describirEvento(ev("prueba.estado", { antes: "en_curso", despues: "ok" }))).toBe("La prueba pasó de En curso a OK");
    expect(describirEvento(ev("adjunto.agregado", { paso: 1, despues: "pantalla.png" }))).toBe("Paso 1: agregó la captura pantalla.png");
    expect(describirEvento(ev("config.estado", { antes: "pendiente", despues: "listo" }))).toBe("Pendiente → Listo");
    expect(describirEvento(ev("raro"))).toBe("Cambio registrado");
  });

  it("solo dispara atajos fuera de campos y sin modificadores", () => {
    expect(accionDeTecla({ key: "a", enCampo: false })).toEqual({ tipo: "marcar", estado: "ok" });
    expect(accionDeTecla({ key: "F", enCampo: false })).toEqual({ tipo: "marcar", estado: "falla" });
    expect(accionDeTecla({ key: "j", enCampo: false })).toEqual({ tipo: "prueba", paso: 1 });
    expect(accionDeTecla({ key: "a", enCampo: true })).toBeNull();
    expect(accionDeTecla({ key: "k", ctrlKey: true, enCampo: false })).toBeNull();
    expect(accionDeTecla({ key: "x", enCampo: false })).toBeNull();
  });
});
