/**
 * Conversaciones de ejemplo de la vista previa en WhatsApp del recorrido del agente (HU-UX-22, SPEC-47).
 *
 * Son textos fijos armados con lo que el dueño decide en cada paso: no llaman a un modelo ni consumen
 * créditos. Nunca inventan precios ni horarios: lo que no viene de la configuración se dice sin cifras.
 * Solo el paso «Pruébalo» habla con el agente real. La ruta de lanzamiento (HU-UX-24) suma un chat
 * simulado por estación y tipo, al final del archivo.
 */

import { muestraDeVoz, type Emojis, type Largo, type TipoDeNegocio, type Tono } from "@/lib/onboarding";
import { numeroDeEstacion, tituloDeEstacion, type EstacionDeLaRuta } from "@/lib/ruta-de-lanzamiento";

/** Una fila de una tarjeta de lista del chat: el nombre y su detalle tal como lo cargó el dueño. */
export type FilaDeTarjeta = { nombre: string; detalle?: string | null };

export type MensajeDeVistaPrevia =
  | { tipo: "cliente"; texto: string }
  | { tipo: "agente"; texto: string }
  | { tipo: "etapa"; texto: string }
  /** Tarjeta de un producto, servicio o plan cargado; el detalle (precio incluido) sale de lo cargado. */
  | { tipo: "tarjeta"; texto: string; filas: readonly FilaDeTarjeta[] };

export type VozDeVistaPrevia = { tono: Tono; calidez: number; emojis: Emojis; largo: Largo };

/** Lo que responde cuando no puede hacer algo: pasa a una persona, como en el runtime. */
export const RESPUESTA_SIN_HABILIDAD = "Eso no lo puedo resolver por aquí. Te paso con alguien del equipo.";

/** Primer intercambio con la voz elegida: el saludo del cliente y la muestra de voz. */
export function conversacionDeVoz(voz: VozDeVistaPrevia, nombreDelAgente: string, negocio: string): MensajeDeVistaPrevia[] {
  return [
    { tipo: "cliente", texto: "Hola, buenas" },
    { tipo: "agente", texto: muestraDeVoz(voz, nombreDelAgente, negocio) },
  ];
}

export type HabilidadDeVistaPrevia = {
  id: string;
  titulo: string;
  activa: boolean;
  /** Frases de clientes que la disparan; la primera es la que se muestra en el teléfono. */
  frases: readonly string[];
};

/**
 * Una frase de cliente y lo que haría el agente con ella: si el superpoder está activo, dice que lo
 * resuelve (sin cifras inventadas); si está apagado, pasa a una persona.
 */
export function conversacionDeHabilidad(habilidad: HabilidadDeVistaPrevia, frase?: string): MensajeDeVistaPrevia[] {
  const texto = (frase ?? habilidad.frases[0] ?? habilidad.titulo).trim();
  return [
    { tipo: "cliente", texto },
    {
      tipo: "agente",
      texto: habilidad.activa ? `Claro, te ayudo con eso: ${minusculaInicial(habilidad.titulo)}.` : RESPUESTA_SIN_HABILIDAD,
    },
  ];
}

export type EtapaDeVistaPrevia = { nombre: string; proposito: string };

/** El recorrido de una conversación por las etapas del flujo: una marca por etapa y lo que hace en ella. */
export function conversacionDeFlujo(etapas: readonly EtapaDeVistaPrevia[]): MensajeDeVistaPrevia[] {
  return etapas.flatMap((etapa, i) => {
    const nombre = etapa.nombre.trim() || `Etapa ${i + 1}`;
    const proposito = etapa.proposito.trim();
    const marca: MensajeDeVistaPrevia = { tipo: "etapa", texto: `${i + 1} · ${nombre}` };
    return proposito ? [marca, { tipo: "agente", texto: proposito }] : [marca];
  });
}

/** Los últimos mensajes que caben en la hoja inferior del móvil, sin cortar una etapa de su texto. */
export function ultimosMensajes(mensajes: readonly MensajeDeVistaPrevia[], cuantos = 2): MensajeDeVistaPrevia[] {
  const burbujas = mensajes.filter((m) => m.tipo !== "etapa");
  return burbujas.slice(-cuantos);
}

function minusculaInicial(texto: string): string {
  const t = texto.trim();
  return t ? t.charAt(0).toLocaleLowerCase("es-CO") + t.slice(1) : t;
}

// ------------------------------------------------------------------ chat simulado por estación

/*
 * Chat de vista previa de la «Ruta de lanzamiento» (HU-UX-24, D-SPEC-49-4). En cada estación el
 * teléfono ofrece mensajes de prueba según el tipo de agente y responde con textos fijos: sin modelo,
 * sin red y sin créditos. La regla de cifras manda: en las estaciones 1 a 3 ninguna respuesta lleva
 * un número; desde la 4 solo aparecen los nombres y detalles (precio incluido) que el dueño cargó.
 * El guion se inspira en el tablero `ChatTelefono` del diseño, sin sus direcciones, cifras ni pedidos.
 */

/** Lo cargado en «Datos para probar» (`RegistroDePrueba`): `tipo` es el `kind` (`producto`, `tipo`, `cliente`, `plan`). */
export type CargadoDeVistaPrevia = { tipo: string; nombre: string; detalle?: string | null };

export type SugerenciaDePrueba = { id: string; texto: string };

/** Las respuestas posibles del guion; cada sugerencia apunta a una. */
type Respuesta =
  | "quien"
  | "que-hace"
  | "donde"
  | "pedido"
  | "pagos"
  | "encargo"
  | "domicilio"
  | "recoger"
  | "catalogo"
  | "precio"
  | "agendar"
  | "cambiar"
  | "horarios"
  | "nombre-cita"
  | "otro-dia"
  | "pagar"
  | "plazo"
  | "ya-pague"
  | "saldo"
  | "planes"
  | "cambiar-plan"
  | "persona";

type Guion = Record<"inicio" | "habilidades" | "datos-cliente" | "datos-probar" | "revisar", readonly [string, Respuesta][]>;

/** Los mensajes de prueba de cada estación, por tipo. La estación 4 suma los que salen de lo cargado. */
const GUIONES: Record<TipoDeNegocio, Guion> = {
  ventas: {
    inicio: [["¿Quién eres?", "quien"], ["¿Qué venden?", "que-hace"], ["¿Dónde están?", "donde"]],
    habilidades: [["Quiero hacer un pedido", "pedido"], ["¿Cómo puedo pagar?", "pagos"], ["Un encargo para el sábado", "encargo"]],
    "datos-cliente": [["Quiero un domicilio", "domicilio"], ["Paso a recoger", "recoger"]],
    "datos-probar": [["¿Qué tienen hoy?", "catalogo"]],
    revisar: [["Quiero hacer un pedido", "pedido"], ["¿Cómo puedo pagar?", "pagos"], ["Quiero hablar con una persona", "persona"]],
  },
  agenda: {
    inicio: [["¿Quién eres?", "quien"], ["¿Dónde están?", "donde"], ["¿Qué días atienden?", "horarios"]],
    habilidades: [["Quiero agendar una cita", "agendar"], ["Necesito cambiar mi cita", "cambiar"], ["¿Cómo puedo pagar?", "pagos"]],
    "datos-cliente": [["Quiero agendar una cita", "nombre-cita"], ["Quiero otro día", "otro-dia"]],
    "datos-probar": [["¿Qué servicios tienen?", "catalogo"]],
    revisar: [["Quiero agendar una cita", "agendar"], ["Necesito cambiar mi cita", "cambiar"], ["Quiero hablar con una persona", "persona"]],
  },
  cobranza: {
    inicio: [["¿Quién me escribe?", "quien"], ["¿Dónde puedo pagar?", "donde"]],
    habilidades: [["Quiero pagar ahora", "pagar"], ["Necesito más plazo", "plazo"], ["Ya pagué", "ya-pague"]],
    "datos-cliente": [["¿Cuánto debo?", "saldo"], ["Ya pagué", "ya-pague"]],
    "datos-probar": [["¿Cuál es mi estado de cuenta?", "catalogo"]],
    revisar: [["Necesito más plazo", "plazo"], ["Quiero pagar ahora", "pagar"], ["Quiero hablar con una persona", "persona"]],
  },
  suscripciones: {
    inicio: [["¿Quién eres?", "quien"], ["¿Dónde están?", "donde"]],
    habilidades: [["Quiero un plan", "planes"], ["¿Cómo puedo pagar?", "pagos"], ["Quiero cambiar mi plan", "cambiar-plan"]],
    "datos-cliente": [["Quiero un plan", "planes"], ["Quiero cambiar mi plan", "cambiar-plan"]],
    "datos-probar": [["¿Qué planes tienen?", "catalogo"]],
    revisar: [["Quiero cambiar mi plan", "cambiar-plan"], ["¿Cómo puedo pagar?", "pagos"], ["Quiero hablar con una persona", "persona"]],
  },
};

/** El `kind` de lo cargado que muestra cada tipo en su catálogo de prueba. */
const KIND_DEL_TIPO: Record<TipoDeNegocio, string> = {
  ventas: "producto",
  agenda: "tipo",
  cobranza: "cliente",
  suscripciones: "plan",
};

function claveDelGuion(estacion: EstacionDeLaRuta): keyof Guion {
  return estacion === "negocio" || estacion === "tipo" ? "inicio" : estacion;
}

/** Lo cargado solo cuenta desde la estación 4; antes el chat no sabe de productos ni de precios. */
function cargadosVisibles(tipo: TipoDeNegocio, estacion: EstacionDeLaRuta, cargados: readonly CargadoDeVistaPrevia[]) {
  if (numeroDeEstacion(estacion) < 4) return [];
  const kind = KIND_DEL_TIPO[tipo];
  return cargados.filter((c) => c.tipo === kind && c.nombre.trim());
}

/**
 * Los mensajes de prueba de una estación («toca una»). En la 4 y la 5 se suman frases con lo cargado
 * (por ejemplo «¿Cuánto vale Torta de zanahoria?»); en la 1 a la 3, lo cargado no se usa.
 */
export function sugerenciasPorEstacion(
  tipo: TipoDeNegocio,
  estacion: EstacionDeLaRuta,
  cargados: readonly CargadoDeVistaPrevia[] = [],
): SugerenciaDePrueba[] {
  const base = GUIONES[tipo][claveDelGuion(estacion)].map(([texto, r]) => ({ id: r, texto }));
  const visibles = cargadosVisibles(tipo, estacion, cargados);
  if (estacion !== "datos-probar" || visibles.length === 0) return base;
  const [primero, segundo] = visibles;
  const extra: SugerenciaDePrueba[] = [{ id: `precio:${primero.nombre}`, texto: preguntaPorElPrecio(tipo, primero.nombre) }];
  if (segundo) extra.push({ id: `precio:${segundo.nombre}`, texto: preguntaPorElPrecio(tipo, segundo.nombre) });
  return [...base, ...extra];
}

function preguntaPorElPrecio(tipo: TipoDeNegocio, nombre: string): string {
  if (tipo === "agenda") return `¿Cuánto vale ${nombre}?`;
  if (tipo === "cobranza") return `Hola, soy ${nombre}. ¿Cuánto debo?`;
  if (tipo === "suscripciones") return `¿Qué incluye el plan ${nombre}?`;
  return `¿Cuánto vale ${nombre}?`;
}

/** El rótulo sobre los mensajes de prueba: «Pruebas de «Datos del cliente» · toca una». */
export function rotuloDePruebas(estacion: EstacionDeLaRuta): string {
  return `Pruebas de «${tituloDeEstacion(estacion)}» · toca una`;
}

/** La leyenda del chat simulado. */
export const LEYENDA_DEL_CHAT = "Es una vista previa: no le escribe a nadie";

/** El primer mensaje del agente en el teléfono. */
export function saludoDePrueba(tipo: TipoDeNegocio, agente: string, negocio: string): MensajeDeVistaPrevia {
  const quien = `Hola, soy ${agente || "tu agente"}, de ${negocio || "tu negocio"}.`;
  const pregunta: Record<TipoDeNegocio, string> = {
    ventas: "¿Qué se te antoja hoy?",
    agenda: "¿Te ayudo a agendar una cita?",
    cobranza: "Te escribo por el saldo de tu cuenta.",
    suscripciones: "¿Buscas un plan o ya eres socio?",
  };
  return { tipo: "agente", texto: `${quien} ${pregunta[tipo]}` };
}

export type ContextoDePrueba = {
  agente: string;
  negocio: string;
  cargados?: readonly CargadoDeVistaPrevia[];
};

/**
 * La respuesta fija a un mensaje de prueba de `sugerenciasPorEstacion`. Sin red ni modelo. En las
 * estaciones 1 a 3 nunca lleva cifras; en la 4 y la 5, las tarjetas muestran el detalle cargado tal cual.
 */
export function respuestaDePrueba(
  tipo: TipoDeNegocio,
  estacion: EstacionDeLaRuta,
  id: string,
  { agente, negocio, cargados = [] }: ContextoDePrueba,
): MensajeDeVistaPrevia[] {
  const nombre = agente || "tu agente";
  const neg = negocio || "tu negocio";
  const visibles = cargadosVisibles(tipo, estacion, cargados);
  const di = (texto: string): MensajeDeVistaPrevia => ({ tipo: "agente", texto });

  if (id.startsWith("precio:")) {
    const elegido = visibles.find((c) => c.nombre === id.slice("precio:".length));
    if (elegido) return [di(tipo === "cobranza" ? "Este es tu estado de cuenta:" : "Te cuento:"), tarjetaDe(elegido.nombre, [elegido])];
    return [di(SIN_CARGADOS[tipo])];
  }

  const catalogo = (): MensajeDeVistaPrevia[] =>
    visibles.length > 0 ? [di(TITULO_DEL_CATALOGO[tipo].intro), tarjetaDe(TITULO_DEL_CATALOGO[tipo].titulo, visibles.slice(0, 4))] : [di(SIN_CARGADOS[tipo])];

  switch (id as Respuesta) {
    case "quien":
      return [di(QUIEN[tipo](nombre, neg))];
    case "que-hace":
      return visibles.length > 0 ? catalogo() : [di(`En ${neg} te ayudo a elegir y a hacer tu pedido. ¿Buscas algo en especial?`)];
    case "donde":
      return [di(`Te comparto la dirección y el horario de ${neg} por aquí. ¿Quieres que te los envíe?`)];
    case "pedido": {
      const [p] = visibles;
      return p
        ? [di(`Sí, tenemos ${p.nombre}.`), tarjetaDe(p.nombre, [p]), di("¿Lo recoges o te lo enviamos?")]
        : [di("Claro. ¿Qué producto quieres y cuántas unidades?")];
    }
    case "pagos":
      return [di(`Te digo las formas de pago que tiene activas ${neg} y te envío los datos para pagar.`)];
    case "encargo":
      return [di("Con gusto. ¿Para qué día lo necesitas y para cuántas personas?")];
    case "domicilio":
      return [di("Claro. ¿A qué dirección y barrio te lo enviamos? También necesito tu nombre y un teléfono.")];
    case "recoger":
      return [di("Listo. ¿A nombre de quién lo separo?")];
    case "catalogo":
      return catalogo();
    case "agendar":
      return [di("Claro. ¿Qué día te queda mejor? Te muestro los horarios libres de la agenda.")];
    case "cambiar":
      return [di("Claro. ¿Para qué día quieres moverla? Te muestro los horarios libres.")];
    case "horarios":
      return [di(`Te muestro los días y horarios en que atiende ${neg} y separo el que te sirva.`)];
    case "nombre-cita":
      return [di("Con gusto. ¿A nombre de quién la agendo y a qué correo te envío la confirmación?")];
    case "otro-dia":
      return [di("Claro. Dime qué día prefieres y te muestro los horarios libres de ese día.")];
    case "pagar":
      return [di("Te envío el link de pago con el valor de tu saldo.")];
    case "plazo":
      return [di("Entiendo. ¿Qué fecha te sirve para pagar? La dejo anotada como promesa de pago.")];
    case "ya-pague":
      return [di("Gracias. ¿Me envías el comprobante? Lo reviso y te confirmo por aquí.")];
    case "saldo":
      return [di("Para darte tu saldo, ¿me confirmas tu número de documento?")];
    case "planes":
      return visibles.length > 0 ? catalogo() : [di("Te cuento los planes que tenemos y qué incluye cada uno. ¿Buscas algo en especial?")];
    case "cambiar-plan":
      return [di("Claro. ¿A qué plan quieres pasar? Hago el cambio desde tu próximo cobro.")];
    case "persona":
      return [di("Te paso con alguien del equipo. Te escribe en unos minutos.")];
    default:
      return [di(RESPUESTA_SIN_HABILIDAD)];
  }
}

const QUIEN: Record<TipoDeNegocio, (agente: string, negocio: string) => string> = {
  ventas: (a, n) => `Soy ${a}, de ${n}. Te ayudo con pedidos, precios y domicilios.`,
  agenda: (a, n) => `Soy ${a}, de ${n}. Agendo, cambio y confirmo citas.`,
  cobranza: (a, n) => `Soy ${a}, de ${n}. Te doy el saldo de tu cuenta y acordamos una fecha de pago.`,
  suscripciones: (a, n) => `Soy ${a}, de ${n}. Te ayudo con planes, pagos y cambios de plan.`,
};

const TITULO_DEL_CATALOGO: Record<TipoDeNegocio, { intro: string; titulo: string }> = {
  ventas: { intro: "Esto es lo que tenemos:", titulo: "Productos" },
  agenda: { intro: "Esto es lo que puedes agendar:", titulo: "Servicios" },
  cobranza: { intro: "Este es tu estado de cuenta:", titulo: "Estado de cuenta" },
  suscripciones: { intro: "Estos son los planes:", titulo: "Planes" },
};

/** Lo que dice cuando todavía no hay nada cargado: invita a cargar, sin inventar. */
const SIN_CARGADOS: Record<TipoDeNegocio, string> = {
  ventas: "Cuando cargues tus productos, aquí los muestro con el precio que les pongas.",
  agenda: "Cuando cargues tus servicios, aquí los muestro con su duración y su precio.",
  cobranza: "Cuando cargues tu cartera, aquí muestro el saldo de cada cliente.",
  suscripciones: "Cuando cargues tus planes, aquí los muestro con lo que incluyen.",
};

function tarjetaDe(titulo: string, cargados: readonly CargadoDeVistaPrevia[]): MensajeDeVistaPrevia {
  return { tipo: "tarjeta", texto: titulo, filas: cargados.map((c) => ({ nombre: c.nombre, detalle: c.detalle?.trim() || null })) };
}
