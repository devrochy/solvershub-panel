import { describe, expect, it } from "vitest";

import {
  avisosPorConexion,
  destinosDe,
  enlaceAPlantillasDeConexion,
  estadoDeCelda,
  frasesDeResumen,
  origenesDe,
  origenesDeTodas,
  resultadoDeCopia,
  rutaPlantillasNegocioDeBackend,
  sumarResumen,
  type ConexionDePlantillas,
  type FilaDePlantilla,
  type ResumenDeCopia,
} from "./plantillas-negocio";

const conexion = (proveedor: "meta" | "twilio", id: string, extra: Partial<ConexionDePlantillas> = {}): ConexionDePlantillas => ({
  clave: `${proveedor}:${id}`,
  proveedor,
  id,
  etiqueta: id,
  activa: true,
  motivo_pausa: null,
  sandbox: false,
  destinable: true,
  ...extra,
});

const META = conexion("meta", "m1");
const TWILIO = conexion("twilio", "t1");
const SANDBOX = conexion("twilio", "t2", { sandbox: true, destinable: false });
const PAUSADA = conexion("twilio", "t3", { activa: false, destinable: false });
const TODAS = [META, TWILIO, SANDBOX, PAUSADA];

const fila = (celdas: Record<string, string>): FilaDePlantilla => ({
  nombre: "recordatorio",
  idioma: "es",
  categoria: "UTILITY",
  cuerpo: "Hola {{1}}",
  celdas: Object.fromEntries(
    Object.entries(celdas).map(([k, estado]) => [k, { estado, distinta: false, plantilla_id: null, motivo: "" }]),
  ),
});

describe("BFF de plantillas del negocio", () => {
  it("solo deja pasar la matriz y las dos copias", () => {
    expect(rutaPlantillasNegocioDeBackend("GET", [])).toBe("/admin/whatsapp-templates");
    expect(rutaPlantillasNegocioDeBackend("POST", ["copy"])).toBe("/admin/whatsapp-templates/copy");
    expect(rutaPlantillasNegocioDeBackend("POST", ["copy-all"])).toBe("/admin/whatsapp-templates/copy-all");
    expect(rutaPlantillasNegocioDeBackend("POST", [])).toBeNull();
    expect(rutaPlantillasNegocioDeBackend("GET", ["copy"])).toBeNull();
    expect(rutaPlantillasNegocioDeBackend("DELETE", ["copy"])).toBeNull();
    expect(rutaPlantillasNegocioDeBackend("POST", ["..", "settings"])).toBeNull();
  });
});

describe("matriz", () => {
  it("ofrece copiar desde donde está aprobada hacia donde falta, sin Sandbox ni pausadas", () => {
    const f = fila({ [META.clave]: "aprobada", [TWILIO.clave]: "falta", [SANDBOX.clave]: "falta", [PAUSADA.clave]: "falta" });
    expect(origenesDe(f, TODAS)).toEqual([META]);
    expect(destinosDe(f, TODAS)).toEqual([TWILIO]);
  });

  it("no ofrece destino donde ya está, es distinta o no se puede copiar", () => {
    const f = fila({ [META.clave]: "aprobada", [TWILIO.clave]: "no_replicable" });
    expect(destinosDe(f, TODAS)).toEqual([]);
    expect(destinosDe(fila({ [META.clave]: "aprobada", [TWILIO.clave]: "pendiente" }), TODAS)).toEqual([]);
  });

  it("origen de «Copiar todas» = conexiones con alguna aprobada", () => {
    const filas = [fila({ [TWILIO.clave]: "aprobada", [META.clave]: "falta" })];
    expect(origenesDeTodas({ filas, conexiones: TODAS })).toEqual([TWILIO]);
  });

  it("estados y enlaces en palabras", () => {
    expect(estadoDeCelda("falta")).toEqual({ label: "Falta", tono: "info" });
    expect(estadoDeCelda("raro").label).toBe("raro");
    expect(enlaceAPlantillasDeConexion(META)).toBe("/conexiones/meta/m1/plantillas");
    expect(enlaceAPlantillasDeConexion(TWILIO)).toBe("/conexiones/t1/plantillas");
  });

  it("agrupa los avisos que no saldrán por conexión", () => {
    const avisos = [
      { evento: "appointment.reminder", nombre: "r", idioma: "es", conexion: TWILIO.clave, estado: "falta" },
      { evento: "appointment.confirmed", nombre: "c", idioma: "es", conexion: TWILIO.clave, estado: "pendiente" },
    ];
    expect(avisosPorConexion(avisos, TODAS)).toEqual([{ conexion: TWILIO, avisos }]);
  });
});

describe("resultado de la copia", () => {
  it("dice el motivo de cada destino", () => {
    expect(resultadoDeCopia({ resultado: "distinta", motivo: "" })).toBe("Ya existe con otro texto (no se tocó)");
    expect(resultadoDeCopia({ resultado: "no_replicable", motivo: "Tiene botones." })).toBe("No se puede copiar: Tiene botones.");
  });

  const r = (detalle: ResumenDeCopia["detalle"], restantes = 0): ResumenDeCopia => ({
    creadas: detalle.filter((d) => d.resultado === "creada").length,
    ya_existian: detalle.filter((d) => d.resultado === "ya_existia").length,
    distintas: detalle.filter((d) => d.resultado === "distinta").length,
    no_replicables: detalle.filter((d) => d.resultado === "no_replicable").length,
    errores: detalle.filter((d) => d.resultado === "error").length,
    restantes,
    detalle,
  });
  const d = (nombre: string, resultado: ResumenDeCopia["detalle"][number]["resultado"]) => ({
    conexion: TWILIO.clave,
    resultado,
    motivo: "",
    nombre,
    idioma: "es",
  });

  it("suma las vueltas sin contar dos veces lo creado en la anterior", () => {
    const primera = r([d("a", "creada"), d("b", "no_replicable"), d("x", "ya_existia")], 1);
    const segunda = r([d("a", "ya_existia"), d("b", "no_replicable"), d("x", "ya_existia"), d("c", "creada")]);
    const total = sumarResumen(sumarResumen(null, primera), segunda);
    expect([total.creadas, total.ya_existian, total.no_replicables, total.restantes]).toEqual([2, 1, 1, 0]);
    expect(frasesDeResumen(total)).toBe("2 creadas, 1 ya estaba, 1 no se puede copiar.");
  });
});
