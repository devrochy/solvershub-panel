/**
 * Importar datos existentes por agente (HU-QA-12, ADR-0180): textos de la vista previa y del resumen, y las
 * llamadas del navegador al BFF `/api/agentes/{id}/importar-datos`. Solo existe en test: fuera de test la API
 * responde 404 y el panel no muestra la opción.
 */
import type { ImportacionHecha, VistaPreviaImportacion } from "@/lib/api/types";
import { conteoLegible, type Respuesta } from "@/lib/datos-de-prueba";

/** Columnas de contacto que nunca se importan: la plantilla no las tiene y el archivo puede traerlas. */
const CONTACTO = ["telefono", "celular", "correo", "email", "whatsapp"];

export function urlDePlantilla(agenteId: string): string {
  return `/api/agentes/${agenteId}/importar-datos/plantilla`;
}

/** «12 filas: 9 nuevas, 2 ya existen y 1 con errores». */
export function resumenDeVistaPrevia(v: Pick<VistaPreviaImportacion, "total_filas" | "nuevas" | "existentes" | "con_errores">): string {
  const partes: string[] = [];
  partes.push(`${v.nuevas} ${v.nuevas === 1 ? "nueva" : "nuevas"}`);
  partes.push(`${v.existentes} ${v.existentes === 1 ? "ya existía" : "ya existían"}`);
  partes.push(`${v.con_errores} con ${v.con_errores === 1 ? "error" : "errores"}`);
  const filas = `${v.total_filas} ${v.total_filas === 1 ? "fila" : "filas"}`;
  return `${filas}: ${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}.`;
}

/** Aviso sobre columnas del archivo que no se usan; las de contacto se nombran aparte porque no se guardan. */
export function avisoDeColumnas(ignoradas: string[]): string | null {
  if (ignoradas.length === 0) return null;
  const contacto = ignoradas.filter((c) => CONTACTO.some((k) => c.includes(k)));
  const otras = ignoradas.filter((c) => !contacto.includes(c));
  const partes: string[] = [];
  if (contacto.length) {
    partes.push(`No se importan teléfonos ni correos (${contacto.join(", ")}): los clientes se crean sin ellos.`);
  }
  if (otras.length) partes.push(`Columnas que no son de la plantilla y se ignoran: ${otras.join(", ")}.`);
  return partes.join(" ");
}

/** Aviso al terminar una importación. */
export function resumenDeImportacion(r: Pick<ImportacionHecha, "conteos" | "existentes" | "con_errores">): string {
  const que = conteoLegible(r.conteos);
  const partes = [`Listo: ${que} importados`];
  if (r.existentes > 0) partes.push(`${r.existentes} ${r.existentes === 1 ? "ya existía" : "ya existían"}`);
  if (r.con_errores > 0) partes.push(`${r.con_errores} omitidas por errores`);
  return `${partes.join("; ")}.`;
}

async function leer<T>(res: Response): Promise<Respuesta<T>> {
  const json = (await res.json().catch(() => null)) as (T & { error?: unknown; code?: unknown }) | null;
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: json && typeof json.error === "string" ? json.error : "No se pudo completar la acción.",
      ...(json && typeof json.code === "string" ? { code: json.code } : {}),
    };
  }
  return { ok: true, data: json as T };
}

/** Sube el archivo a la vista previa (`validar`) o a la importación (`importar`). */
export async function subirArchivo<T>(
  agenteId: string,
  paso: "validar" | "importar",
  archivo: File,
  soloValidas = false,
): Promise<Respuesta<T>> {
  try {
    const cuerpo = new FormData();
    cuerpo.set("archivo", archivo, archivo.name);
    if (paso === "importar" && soloValidas) cuerpo.set("solo_validas", "true");
    const ruta = paso === "validar" ? "importar-datos/validar" : "importar-datos";
    return await leer<T>(await fetch(`/api/agentes/${agenteId}/${ruta}`, { method: "POST", body: cuerpo }));
  } catch {
    return { ok: false, error: "Sin conexión con el servidor.", status: 0 };
  }
}

export async function borrarImportado<T>(agenteId: string): Promise<Respuesta<T>> {
  try {
    return await leer<T>(await fetch(`/api/agentes/${agenteId}/importar-datos`, { method: "DELETE" }));
  } catch {
    return { ok: false, error: "Sin conexión con el servidor.", status: 0 };
  }
}
