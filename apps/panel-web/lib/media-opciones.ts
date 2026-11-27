/**
 * Opciones de multimedia por calidad y costo (SPEC-04, ADR-0151).
 *
 * El backend expone, por cada modelo del catálogo, su `quality` (1–5), su `tier`
 * semántico y su costo de referencia. Aquí se aplana el catálogo, se descartan los
 * modelos legados y se traduce el `tier` a una opción que el dueño puede entender:
 * nombre, promesa, costo por 10 notas o 100 imágenes y calidad. El nombre del modelo
 * no sale a la vista.
 */

import type { MediaSettings } from "@/lib/api/types";
import { formatUsd } from "@/lib/format";

export type CapacidadMedia = "audio" | "vision";

export type OpcionMedia = {
  /** `provider:model`, estable para el radio y para comparar. */
  clave: string;
  provider: string;
  model: string;
  tier: string;
  nombre: string;
  descripcion: string;
  recomendada: boolean;
  /** 1 = no sirve · 2 = simple · 3 = uso diario · 4 = difícil · 5 = máxima. */
  calidad: number;
  costoUsd: number | null;
  costoUnidad: "minute" | "image" | string;
  legado: boolean;
};

type Copia = { nombre: string; descripcion: string; recomendada?: boolean };

/** Copy de la opción; el catálogo solo aporta el `tier`, no el texto. */
const COPIA: Record<CapacidadMedia, Record<string, Copia>> = {
  audio: {
    rapido: { nombre: "Rápido", descripcion: "Responde en segundos, para chats en vivo." },
    precision: {
      nombre: "Precisión",
      descripcion: "El día a día, con algo de ruido.",
      recomendada: true,
    },
    maxima: {
      nombre: "Máxima",
      descripcion: "Audios difíciles: acentos o varias personas.",
    },
  },
  vision: {
    economico: { nombre: "Económico", descripcion: "Fotos simples: productos y capturas." },
    equilibrado: { nombre: "Equilibrado", descripcion: "Documentos y comprobantes del día a día." },
    preciso: {
      nombre: "Preciso",
      descripcion: "Letra pequeña, pedidos y varios detalles.",
      recomendada: true,
    },
    detallado: { nombre: "Detallado", descripcion: "Fotos complejas y descripciones largas." },
    maxima: { nombre: "Máxima", descripcion: "Letra a mano, poca luz o mucho detalle." },
  },
};

/** Respaldo para un backend anterior a esta entrega, o para un modelo nuevo sin `tier`. */
const TIER_POR_MODELO: Record<CapacidadMedia, Record<string, string>> = {
  audio: {
    "whisper-large-v3-turbo": "rapido",
    "whisper-large-v3": "precision",
    "gpt-4o-mini-transcribe": "basico",
    "gpt-4o-transcribe": "maxima",
    "whisper-1": "legado",
  },
  vision: {
    "deepseek-flash": "economico",
    "gpt-4o-mini": "equilibrado",
    "gpt-4.1-mini": "preciso",
    "claude-haiku-4-5": "detallado",
    "claude-sonnet-4-5": "maxima",
    "gpt-4o": "detallado",
  },
};

const CALIDAD: Record<number, string> = {
  1: "Básica",
  2: "Buena",
  3: "Muy buena",
  4: "Excelente",
  5: "Máxima",
};

const FACTOR_COSTO: Record<string, number> = { minute: 10, image: 100 };
const UNIDAD_COSTO: Record<string, string> = {
  minute: "/ 10 min",
  image: "/ 100 imágenes",
};

export function etiquetaCalidad(calidad: number): string {
  const n = Math.min(5, Math.max(1, Math.round(Number.isFinite(calidad) ? calidad : 3)));
  return CALIDAD[n] ?? "Muy buena";
}

function tierDe(capacidad: CapacidadMedia, tier: string | undefined, modeloId: string): string {
  return tier || TIER_POR_MODELO[capacidad][modeloId] || "";
}

function construir(
  media: MediaSettings,
  capacidad: CapacidadMedia,
  incluirLegado: boolean,
): OpcionMedia[] {
  const proveedores = media.catalog?.[capacidad] ?? [];
  const opciones: OpcionMedia[] = [];

  for (const proveedor of proveedores) {
    for (const modelo of proveedor.models ?? []) {
      const legado = Boolean(modelo.legacy) || modelo.offered === false;
      if (legado && !incluirLegado) continue;

      const tier = tierDe(capacidad, modelo.tier, modelo.id);
      const copia = COPIA[capacidad][tier];
      const calidad = modelo.quality ?? 3;
      const unidad = modelo.cost_unit ?? (capacidad === "audio" ? "minute" : "image");

      opciones.push({
        clave: `${proveedor.key}:${modelo.id}`,
        provider: proveedor.key,
        model: modelo.id,
        tier,
        nombre: copia?.nombre ?? `Calidad ${etiquetaCalidad(calidad)}`,
        descripcion: copia?.descripcion ?? "Una opción disponible para tu cuenta.",
        recomendada: Boolean(copia?.recomendada),
        calidad,
        costoUsd: typeof modelo.cost_usd === "number" ? modelo.cost_usd : null,
        costoUnidad: unidad,
        legado,
      });
    }
  }

  return opciones.sort((a, b) => {
    if (a.costoUsd == null && b.costoUsd == null) return b.calidad - a.calidad;
    if (a.costoUsd == null) return 1;
    if (b.costoUsd == null) return -1;
    return a.costoUsd - b.costoUsd || b.calidad - a.calidad;
  });
}

/** Opciones que se ofrecen en el panel: sin modelos legados. */
export function opcionesDeMedia(media: MediaSettings, capacidad: CapacidadMedia): OpcionMedia[] {
  return construir(media, capacidad, false);
}

/** Todas las opciones, incluidos los legados, para resolver una configuración guardada. */
export function opcionesConLegado(media: MediaSettings, capacidad: CapacidadMedia): OpcionMedia[] {
  return construir(media, capacidad, true);
}

/** Texto y unidad del costo visible: 10 notas de 30 s o 100 imágenes. */
export function costoVisible(opcion: OpcionMedia): { monto: string; unidad: string } {
  const factor = FACTOR_COSTO[opcion.costoUnidad] ?? 1;
  return {
    monto: opcion.costoUsd == null ? "—" : formatUsd(opcion.costoUsd * factor, 2),
    unidad: UNIDAD_COSTO[opcion.costoUnidad] ?? "/ unidad",
  };
}

function masCercana(opciones: OpcionMedia[], calidad: number): OpcionMedia | undefined {
  return [...opciones].sort(
    (a, b) =>
      Math.abs(a.calidad - calidad) - Math.abs(b.calidad - calidad) ||
      (a.costoUsd ?? Number.POSITIVE_INFINITY) - (b.costoUsd ?? Number.POSITIVE_INFINITY),
  )[0];
}

/**
 * Ajusta la configuración guardada a una opción que exista hoy.
 *
 * Un modelo legado (o retirado) no se ofrece, pero sigue siendo válido para no romper
 * la configuración guardada. En ese caso se elige la opción no legada del mismo
 * `tier` o la de calidad más cercana, y se devuelve una nota para contarlo una vez.
 */
export function resolverSeleccion(
  config: { provider: string; model: string },
  media: MediaSettings,
  capacidad: CapacidadMedia,
): {
  seleccion: { provider: string; model: string };
  retirada: boolean;
  nota?: string;
  hayOpciones: boolean;
} {
  const opciones = opcionesDeMedia(media, capacidad);
  if (opciones.length === 0) {
    return { seleccion: config, retirada: false, hayOpciones: false };
  }

  const todas = opcionesConLegado(media, capacidad);
  const actual = todas.find(
    (opcion) => opcion.provider === config.provider && opcion.model === config.model,
  );
  const teniaSeleccion = Boolean(config.provider && config.model);

  if (actual && !actual.legado) {
    return { seleccion: config, retirada: false, hayOpciones: true };
  }

  // Si el modelo guardado dejó de ofrecerse, primero intentamos quedarnos en su
  // proveedor para no cambiar la llave del negocio; después buscamos el mismo tier
  // o la calidad más cercana en el resto del catálogo.
  const delMismoProveedor = actual
    ? opciones.filter((opcion) => opcion.provider === actual.provider)
    : [];
  const elegida = actual
    ? delMismoProveedor.find((opcion) => opcion.tier === actual.tier) ??
      masCercana(delMismoProveedor, actual.calidad) ??
      opciones.find((opcion) => opcion.tier === actual.tier) ??
      masCercana(opciones, actual.calidad)
    : opciones.find((opcion) => opcion.recomendada) ?? masCercana(opciones, 3);

  if (!elegida) {
    return { seleccion: config, retirada: false, hayOpciones: false };
  }

  const cambio = elegida.provider !== config.provider || elegida.model !== config.model;
  return {
    seleccion: { provider: elegida.provider, model: elegida.model },
    retirada: teniaSeleccion && cambio,
    nota:
      teniaSeleccion && cambio
        ? `Actualizamos tu elección a ${elegida.nombre}. Guarda para confirmarla.`
        : undefined,
    hayOpciones: true,
  };
}
