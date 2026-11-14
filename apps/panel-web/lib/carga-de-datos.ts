/**
 * Carga de datos al crear un agente (SPEC-45): lógica pura del paso «Datos» y de «Lo cargado» del asistente.
 * La precarga vive en el navegador (ADR-0194, ADR-0180 §3): el CSV o las fotos se convierten en filas que el
 * dueño corrige, y solo al confirmar viajan a la API, que las vuelve a validar. Las llamadas van al BFF
 * `/api/agentes/{id}/…`.
 */
import type {
  CotizacionFotos,
  EstadoImportacion,
  FilaDeFoto,
  ImportacionHecha,
  MapeoPropuesto,
  PlantillaImportacion,
  RegistroDePrueba,
  VistaPreviaImportacion,
} from "@/lib/api/types";
import type { Respuesta } from "@/lib/datos-de-prueba";

/** Columna interna de la foto del producto: la llena el flujo de fotos y no se edita como texto. */
export const COLUMNA_FOTO = "imagen";
/** Fotos por tanda: con más, la cotización deja de ser legible y la espera se alarga. */
export const MAX_FOTOS = 30;
export const TIPOS_DE_FOTO = ["image/png", "image/jpeg", "image/webp"];
export const MAX_BYTES_FOTO = 5 * 1024 * 1024;

/** Una fila de la precarga: lo que se confirmará, más lo que solo sirve para mostrarla. */
export type FilaEditable = {
  /** Número de fila: la del archivo, o un consecutivo para las fotos. */
  fila: number;
  valores: Record<string, string>;
  /** Columnas que propuso la IA (se marcan «IA» hasta que el dueño las toque). */
  inferidas: string[];
  /** Miniatura de la foto, si la fila salió de una. */
  imagenUrl?: string | null;
};

/** Columnas que el dueño ve y edita, en el orden de la plantilla (sin la interna de la foto). */
export function columnasVisibles(plantilla: Pick<PlantillaImportacion, "columnas">): string[] {
  return plantilla.columnas.map((c) => c.nombre).filter((n) => n !== COLUMNA_FOTO);
}

/** Filas de la precarga a partir del mapeo propuesto: lo que llegó por una columna de la IA queda marcado. */
export function filasDesdeMapeo(m: Pick<MapeoPropuesto, "mapeo" | "filas">): FilaEditable[] {
  const deIa = m.mapeo.filter((a) => a.origen === "ia" && a.columna).map((a) => a.columna as string);
  return m.filas.map((f) => ({
    fila: f.fila,
    valores: { ...(f.valores as Record<string, string>) },
    inferidas: deIa.filter((c) => (f.valores as Record<string, string>)[c]),
  }));
}

/** Fila de la precarga a partir de una foto: todo lo que se ve en la foto lo infirió la IA. */
export function filaDesdeFoto(f: FilaDeFoto, numero: number): FilaEditable {
  const valores = { ...(f.valores as Record<string, string>) };
  return {
    fila: numero,
    valores,
    inferidas: Object.keys(valores).filter((c) => c !== COLUMNA_FOTO && valores[c]),
    imagenUrl: f.image_url,
  };
}

/** Cambia una celda: deja de estar marcada «IA» porque ya la decidió el dueño. */
export function editarCelda(filas: FilaEditable[], fila: number, columna: string, valor: string): FilaEditable[] {
  return filas.map((f) =>
    f.fila === fila
      ? { ...f, valores: { ...f.valores, [columna]: valor }, inferidas: f.inferidas.filter((c) => c !== columna) }
      : f,
  );
}

export function quitarFila(filas: FilaEditable[], fila: number): FilaEditable[] {
  return filas.filter((f) => f.fila !== fila);
}

/** Siguiente número libre para una fila nueva (las fotos se agregan a lo que ya haya). */
export function siguienteNumero(filas: FilaEditable[]): number {
  return filas.reduce((n, f) => Math.max(n, f.fila), 1) + 1;
}

/** Cuerpo de `…/importar-datos/filas` y `…/filas/validar`: solo número de fila y textos. */
export function cuerpoDePrecarga(filas: FilaEditable[], soloValidas = false) {
  return { filas: filas.map((f) => ({ fila: f.fila, valores: f.valores })), solo_validas: soloValidas };
}

/** Errores de la vista previa agrupados por fila, para pintarlos junto a la celda. */
export function erroresPorFila(v: Pick<VistaPreviaImportacion, "errores"> | null): Map<number, { columna: string | null; mensaje: string }[]> {
  const m = new Map<number, { columna: string | null; mensaje: string }[]>();
  for (const e of v?.errores ?? []) {
    const lista = m.get(e.fila) ?? [];
    lista.push({ columna: e.columna ?? null, mensaje: e.mensaje });
    m.set(e.fila, lista);
  }
  return m;
}

/** «Ninguna columna necesitó IA» / «La IA propuso 2 columnas: revisa lo marcado». */
export function avisoDeIa(m: Pick<MapeoPropuesto, "mapeo" | "ia">): string | null {
  const deIa = m.mapeo.filter((a) => a.origen === "ia" && a.columna).length;
  if (m.ia.motivo_fallo) {
    return "La IA no pudo ayudar con algunas columnas: quedaron sin asignar y no se importan.";
  }
  if (deIa === 0) return null;
  return `La IA propuso ${deIa} ${deIa === 1 ? "columna" : "columnas"}: revisa lo marcado con «IA» antes de confirmar.`;
}

function creditos(n: number): string {
  return `${n} ${n === 1 ? "crédito" : "créditos"}`;
}

/** Texto de la cotización de una tanda de fotos. */
export function textoDeCotizacion(c: CotizacionFotos): string {
  const que = `Reconocer ${c.fotos} ${c.fotos === 1 ? "foto" : "fotos"} cuesta ${creditos(c.creditos)}`;
  const llave = c.llave_propia ? " (usas tu propia llave de visión: solo se cobra el uso de la plataforma)" : "";
  if (c.limite === null || c.limite === undefined) return `${que}${llave}.`;
  const disponible = c.disponible ?? Math.max(0, c.limite - c.usado);
  return `${que}${llave}. Te quedan ${creditos(disponible)} este mes.`;
}

/** «Listo: 3 productos importados; 1 ya existía.» */
export function resumenDeImportacionDelCatalogo(h: Pick<ImportacionHecha, "creadas" | "existentes">): string {
  const partes = [`Listo: ${h.creadas} ${h.creadas === 1 ? "producto importado" : "productos importados"}`];
  if (h.existentes > 0) partes.push(`${h.existentes} ya ${h.existentes === 1 ? "existía" : "existían"}`);
  return `${partes.join("; ")}.`;
}

/** Lo cargado en producción (sin la API de registros, que es solo de test): la lista sale de las filas confirmadas. */
export function registrosDesdeFilas(filas: FilaEditable[]): RegistroDePrueba[] {
  return filas
    .filter((f) => (f.valores.nombre ?? "").trim())
    .map((f) => ({
      tipo: "producto",
      nombre: f.valores.nombre.trim(),
      detalle: [f.valores.precio, f.valores.categoria].filter((x) => x && x.trim()).join(" · ") || null,
      origen: "importacion",
    }));
}

/** Frases para probar el agente con lo que se cargó (como mucho 4, sin repetir). */
export function sugerenciasDePrueba(registros: Pick<RegistroDePrueba, "tipo" | "nombre">[]): string[] {
  const frases: string[] = [];
  const de = (tipo: string) => registros.filter((r) => r.tipo === tipo).map((r) => r.nombre);
  const [p1, p2] = de("producto");
  if (p1) frases.push(`¿Tienen ${p1}?`);
  if (p2) frases.push(`¿Cuánto cuesta ${p2}?`);
  if (p1 && !p2) frases.push(`¿Cuánto cuesta ${p1}?`);
  const [t1] = de("tipo");
  if (t1) frases.push(`Quiero agendar ${t1} para mañana`);
  const [c1] = de("cliente");
  if (c1) frases.push(`Hola, soy ${c1}. ¿Cuánto debo?`);
  const [pl] = de("plan");
  if (pl) frases.push(`¿Qué incluye el plan ${pl}?`);
  return [...new Set(frases)].slice(0, 4);
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

async function llamar<T>(url: string, init?: RequestInit): Promise<Respuesta<T>> {
  try {
    return await leer<T>(await fetch(url, init));
  } catch {
    return { ok: false, error: "Sin conexión con el servidor.", status: 0 };
  }
}

export function leerJson<T>(url: string): Promise<Respuesta<T>> {
  return llamar<T>(url);
}

export function mapearArchivo(agenteId: string, archivo: File): Promise<Respuesta<MapeoPropuesto>> {
  const cuerpo = new FormData();
  cuerpo.set("archivo", archivo, archivo.name);
  return llamar(`/api/agentes/${agenteId}/importar-datos/mapear`, { method: "POST", body: cuerpo });
}

export function enviarPrecarga<T extends VistaPreviaImportacion | ImportacionHecha>(
  agenteId: string,
  paso: "validar" | "importar",
  filas: FilaEditable[],
  soloValidas = false,
): Promise<Respuesta<T>> {
  const ruta = paso === "validar" ? "importar-datos/filas/validar" : "importar-datos/filas";
  return llamar(`/api/agentes/${agenteId}/${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpoDePrecarga(filas, soloValidas)),
  });
}

export function cotizarFotos(agenteId: string, fotos: number): Promise<Respuesta<CotizacionFotos>> {
  return llamar(`/api/agentes/${agenteId}/importar-datos/fotos/cotizacion?fotos=${fotos}`);
}

export function subirFoto(agenteId: string, foto: File): Promise<Respuesta<FilaDeFoto>> {
  const cuerpo = new FormData();
  cuerpo.set("archivo", foto, foto.name);
  return llamar(`/api/agentes/${agenteId}/importar-datos/fotos`, { method: "POST", body: cuerpo });
}

/**
 * Primer agente que importa productos (su plantilla de importación es `productos`), con esa plantilla; `null` si
 * ninguno. Las rutas de importación son por agente, pero el catálogo es del negocio (SPEC-45).
 */
export async function agenteQueImportaProductos(
  agentes: string[],
): Promise<{ agenteId: string; plantilla: PlantillaImportacion } | null> {
  for (const agenteId of agentes) {
    const r = await leerJson<EstadoImportacion>(`/api/agentes/${agenteId}/importar-datos`);
    if (r.ok && r.data.disponible && r.data.plantilla?.id === "productos") return { agenteId, plantilla: r.data.plantilla };
  }
  return null;
}
