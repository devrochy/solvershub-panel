"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  PasoFlujo,
  PasoIdentidad,
  PasoMemoria,
  PasoPublicar,
  PasoReglas,
  PasoSuperpoderes,
  PasoVoz,
} from "@/components/domain/agentes/recorrido/pasos";
import { AccionesDelAgente } from "@/components/domain/agentes/acciones-del-agente";
import { DatosDelAgente } from "@/components/domain/agentes/datos-del-agente";
import { PasoDatos, type Cargado } from "@/components/domain/agentes/paso-datos";
import { PasoLoCargado } from "@/components/domain/agentes/paso-lo-cargado";
import { PasoProbarBorrador } from "@/components/domain/agentes/paso-probar-borrador";
import { AvisoDeReferenciasRetiradas } from "@/components/domain/aviso-de-referencias-retiradas";
import { AvisoLimiteDePlan } from "@/components/domain/aviso-limite-de-plan";
import { RecorridoDelAgente, type VistaPreviaDelPaso } from "@/components/domain/agentes/recorrido/recorrido-del-agente";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import type { PasoDeLaBarra } from "@/components/ui/barra-de-pasos";
import {
  PASOS,
  pasosConCambios,
  preguntaDelPaso,
  contenidoDesdeEstado,
  erroresDelPaso,
  erroresPorSuperpoder,
  estadoDesdeBorrador,
  pasoDelCampo,
  textoDeConexionPublicada,
  type AccionDelFlujo,
  type Contenido,
  type Errores,
  type EstadoDelEditor,
  type FlujoDelAgente,
  type NegocioDelEditor,
  type PasoId,
} from "@/lib/agentes-editor";
import { erroresPorAccion, erroresSueltosDeAcciones } from "@/lib/acciones-del-agente";
import {
  alPorDefecto,
  cambiosDeLaEstacion3,
  conCuantoPregunta,
  conMetodo,
  conNivel,
  cuerpoParaGuardar,
  datosRecomendadosEnLaRuta,
  estadoInicial,
  METODOS_ENTREGA,
  operacionesEnLaRuta,
  preguntaPorEntregas,
  restablecida,
  tipoDelAgente,
  type AgenteDatos,
  type CuantoPregunta,
  type EstadoDatos,
  type MetodoEntrega,
  type NivelDato,
  type RecomendadoDeDatos,
} from "@/lib/datos-cliente";
import type { AvisoDatos } from "@/lib/aviso-datos";
import type {
  AgentDetail,
  AgentRetiredNotices,
  EditorPublishOut,
  RegistroDePrueba,
  LlmModelCatalog,
  PublishTarget,
  Requirement,
  Superpower,
} from "@/lib/api/types";
import { useAvisarCambios } from "@/lib/cambios-sin-guardar";
import { usePendientes } from "@/lib/frases-pendientes";
import { habilidadLabel } from "@/lib/labels";
import { esLimiteDePlan } from "@/lib/plan-limite";
import { avisosDelBorrador, referenciasDelError } from "@/lib/referencias-retiradas";
import { useAction } from "@/lib/use-action";
import { sugerenciasDePrueba } from "@/lib/carga-de-datos";
import { FormasDePagoDelAgente } from "@/components/domain/agentes/formas-de-pago-del-agente";
import { HorarioDelAgenteEditable } from "@/components/domain/agentes/horario-del-agente";
import { ReglasDelAgenteEditable } from "@/components/domain/agentes/reglas-del-agente";
import { ToolsHttpDelAgenteEditable } from "@/components/domain/agentes/tools-http-del-agente";
import { SemaforoListo } from "@/components/domain/agentes/semaforo-listo";
import { CelularDeVistaPrevia } from "@/components/domain/agentes/recorrido/celular-de-vista-previa";
import { BarraRecomendado } from "@/components/domain/agentes/recorrido/barra-recomendado";
import { OpcionesAvanzadas } from "@/components/domain/agentes/recorrido/opciones-avanzadas";
import { LineaDelHorario, preguntasDeHabilidades } from "@/components/domain/agentes/recorrido/preguntas-de-habilidades";
import { AVANZADAS_DE_DATOS, LineaDelAviso, preguntasDeDatos } from "@/components/domain/agentes/recorrido/preguntas-de-datos";
import { ListaDePreguntas, textoDeFaltan } from "@/components/domain/agentes/recorrido/pregunta-del-recorrido";
import { AvisoDeRequisitos } from "@/components/domain/aviso-de-requisitos";
import { ResumenDeEstaciones } from "@/components/domain/agentes/recorrido/resumen-de-estaciones";
import type { EstacionDeLaRuta } from "@/lib/ruta-de-lanzamiento";
import { TIPOS_DE_NEGOCIO } from "@/lib/onboarding";
import { MarcoDeBienvenida } from "@/components/domain/agentes/recorrido/marco-de-bienvenida";
import { semaforo } from "@/lib/listo-para-responder";
import { rutaDePersonalizar } from "@/lib/rutas-de-agente";
import type { HorarioDelAgente } from "@/lib/horario-del-agente";
import type { ReglasDelAgente, ToolsHttpDelAgente } from "@/lib/reglas-y-tools-del-agente";
import type { FormasDePago, Metodo } from "@/lib/formas-de-pago";
import {
  AVANZADAS_DE_HABILIDADES,
  bajadaDeHabilidades,
  cuerpoDeFormas,
  elegidasDe,
  formasCambiaron,
  type FormasElegidas,
} from "@/lib/habilidades-de-la-ruta";
import { componerGuion, conversacionDelGuion, estadosDeBloques, guionSugerido, mismoGuion } from "@/lib/guion-reglas";
import {
  conversacionDeHabilidad,
  conversacionDeVoz,
  respuestaDePrueba,
  saludoDePrueba,
  sugerenciasPorEstacion,
} from "@/lib/vista-previa";

/**
 * Las estaciones 2 a 5 de la bienvenida (SPEC-49, HU-UX-25): la 1 («Tu negocio») vive en `/bienvenida` y escribe
 * en el negocio. Son las mismas de Nuevo agente; la 5 deja listo y termina el recorrido (`bienvenida.terminar`).
 */
const PASOS_DE_LA_BIENVENIDA: PasoId[] = ["habilidades", "datos-cliente", "conocimiento", "probar"];
/**
 * Nuevo agente en 5 estaciones (SPEC-49, HU-AOS-86, D-SPEC-49-1): la 1 (Tipo) es `/agentes/nuevo`; aquí
 * van Habilidades, Datos del cliente, Datos para probar y Revisar y publicar. La 5 publica (D-SPEC-49-9).
 * Lo demás (voz, horario, flujo) queda para Personalizar, con sus pasos libres.
 */
const PASOS_DE_LA_CREACION: PasoId[] = ["habilidades", "datos-cliente", "conocimiento", "probar"];
/** Los nombres de las estaciones de la ruta de lanzamiento (`ESTACIONES_DE_NUEVO_AGENTE`). */
const EN_LA_RUTA: Partial<Record<PasoId, { titulo: string; corto: string }>> = {
  habilidades: { titulo: "Habilidades", corto: "Habilidades" },
  "datos-cliente": { titulo: "Datos del cliente", corto: "Datos del cliente" },
  conocimiento: { titulo: "Datos para probar", corto: "Datos para probar" },
  probar: { titulo: "Revisar y publicar", corto: "Revisar y publicar" },
};
/** La estación de la ruta de cada paso de la creación (para el chat simulado del escenario). */
const ESTACION_DEL_PASO: Partial<Record<PasoId, EstacionDeLaRuta>> = {
  habilidades: "habilidades",
  "datos-cliente": "datos-cliente",
  conocimiento: "datos-probar",
  probar: "revisar",
};
/** La pregunta de cada estación en la ruta (las demás, la de `PASOS`). */
const PREGUNTA_EN_LA_RUTA: Partial<Record<PasoId, string>> = {
  habilidades: "¿Qué sabe hacer {nombre}?",
  "datos-cliente": "¿Qué datos pide {nombre}?",
  conocimiento: "¿Con qué datos probamos a {nombre}?",
  probar: "Revisa y publica a {nombre}",
};
/** La pregunta de cada estación en la bienvenida (tableros `rb2`–`rb5`); «Datos para probar» va por tipo. */
const PREGUNTA_EN_LA_BIENVENIDA: Partial<Record<PasoId, string>> = {
  habilidades: "¿Qué sabe hacer {nombre}?",
  "datos-cliente": "¿Qué datos pide {nombre}?",
  probar: "La última vuelta antes de atender",
};
const DATOS_PARA_PROBAR: Partial<Record<string, string>> = {
  ventas: "Dale a {nombre} algo que vender",
  agenda: "¿Qué citas agenda {nombre}?",
};
/** Debajo de la pregunta, en la bienvenida. */
const BAJADA_EN_LA_BIENVENIDA: Partial<Record<PasoId, string>> = {
  "datos-cliente": "Lo que le pregunta a cada cliente para atenderlo. Viene con lo justo.",
  conocimiento: "Datos de ejemplo para probar cómo responde en el chat. Puedes seguir sin cargar nada.",
  probar: "Revisa lo que configuraste y escríbele una vez como cliente.",
};
const PASO_UNO_DE_LA_CREACION = { id: "tipo", titulo: "Tipo", corto: "Tipo" };

/** Id de la lista de frases prohibidas (la del paso Identidad), el mismo que usa `pasos.tsx`. */
const ID_PROHIBIDAS = "agente-prohibidas";

type Respuesta = {
  error?: string;
  code?: string;
  fields?: Record<string, string>;
  /** El 422 `invalid_spec` trae aquí `retired_references` (HU-AOS-59). */
  details?: Record<string, unknown>;
};

/**
 * La bienvenida (HU-UX-25) usa el editor para sus estaciones 2 a 5, a pantalla completa con el escenario a la
 * izquierda. La 1 («Tu negocio») escribe en el negocio y vive en `/bienvenida`: aquí se ve hecha en la ruta y
 * volver a ella lo decide `volverA`.
 */
export type BienvenidaDelEditor = {
  /** La estación del negocio, para la ruta de 5 (id propio, distinto de los del editor). */
  pasosDelNegocio: PasoDeLaBarra[];
  /** Vuelve a la estación del negocio (1). */
  volverA: (numero: number) => void;
  /** Guarda en el recorrido la estación (1 a 5) a la que se llega. */
  avanzar: (numero: number) => void;
  /**
   * «Seguir después», con el nombre del agente y cómo guardar lo de la estación antes de salir. `enEscenario`:
   * va en la franja oscura del celular.
   */
  seguirDespues: (opciones: { nombre: string; guardar: () => Promise<boolean>; enEscenario: boolean }) => ReactNode;
  /** Vuelve a dejar el agente listo antes de «Pruébalo», con lo último configurado. Devuelve el error, si hubo. */
  prepararPrueba: () => Promise<string | null>;
  /** El chat de prueba de la bienvenida, por la conexión de pruebas; lo cargado en la estación 4 va primero en las frases. */
  prueba: (cargados: readonly RegistroDePrueba[]) => ReactNode;
  /** Ya le escribió a su agente: se puede terminar. */
  probado: boolean;
  /** Deja el agente listo con lo último y da por terminado el recorrido. */
  terminar: () => Promise<void>;
  terminando: boolean;
};

/**
 * Editor de un agente especialista con el recorrido común (HU-AOS-78, SPEC-47): los nueve pasos de
 * Personalizar (con «Datos del cliente», HU-AOS-85), libres, con el teléfono de la vista previa. Cambiar
 * de paso no guarda: «Guardar cambios» guarda todo lo cambiado sin publicar (también los datos del
 * cliente), y «Publicar versión» valida los nueve pasos, publica en las conexiones elegidas (D-35) y deja la versión lista para activar.
 * «Proveedor y modelo» ya no es un paso: el agente usa el modelo del negocio (HU-AOS-79).
 *
 * Con `modo="crear"` (HU-AOS-77) es la continuación de Nuevo agente: los pasos van en orden y
 * «Siguiente» valida y guarda el paso antes de avanzar; no hay «Guardar cambios» aparte.
 */
export function EditorDeAgente({
  agente,
  superpoderes,
  modelos,
  destinos,
  destinosError,
  puedeActivar,
  requisitos = [],
  pasoInicial = "identidad",
  avisosRetirados = null,
  nombresDeHabilidades = {},
  gruposDeAcciones = {},
  datosCliente = null,
  datosClienteError,
  puedeEditarDatos = true,
  avisoDeDatos = null,
  formasDePago = null,
  semillaDelFlujo = null,
  horarioDelAgente = null,
  reglasDelAgente = null,
  toolsHttpDelAgente = null,
  flujoInicial = { sections: [] },
  flujoSeeded = false,
  accionesDelFlujo = [],
  negocio = { nombre: "", voz: null, resumenDeVoz: null, horario: null, motivos: null },
  modeloEfectivo = null,
  puedeEditar = true,
  modo = "editar",
  bienvenida,
}: {
  agente: AgentDetail;
  superpoderes: Superpower[];
  modelos: LlmModelCatalog;
  destinos: PublishTarget[];
  destinosError: string | null;
  puedeActivar: boolean;
  /** Lo que falta configurar para este enfoque (aviso, no bloquea). */
  requisitos?: Requirement[];
  /** Paso con el que abre (el asistente de creación entra directo a publicar, HU-AOS-54). */
  pasoInicial?: PasoId;
  /** Lo que el agente nombra y ya no existe (HU-AOS-59): solo avisa, en palabras simples. */
  avisosRetirados?: AgentRetiredNotices | null;
  /** Nombre legible del pack de cada superpoder (`Superpower.skill`), para «De la habilidad …» (HU-UX-09). */
  nombresDeHabilidades?: Record<string, string>;
  /** Grupo de cada acción según la API (ADR-0190); sin respuesta se agrupan por su nombre. */
  gruposDeAcciones?: Record<string, string>;
  /** Política de datos de ESTE agente (HU-CRM-28): `null` si no se pudo cargar. */
  datosCliente?: AgenteDatos | null;
  datosClienteError?: string;
  /** Quien puede escribir la configuración del negocio (la política de datos la exige). */
  puedeEditarDatos?: boolean;
  /** El aviso de tratamiento de datos del negocio (HU-CRM-16), para «Opciones avanzadas» de la estación 3; `null` si no se pudo leer. */
  avisoDeDatos?: AvisoDatos | null;
  /** Formas de pago del agente (SPEC-48, HU-COM-21); `null` si el agente no tiene Comercio. */
  formasDePago?: FormasDePago | null;
  /** Semilla del flujo de sus habilidades, para «Restaurar guion sugerido» (HU-COM-25). */
  semillaDelFlujo?: FlujoDelAgente | null;
  /** Horario propio del agente (HU-AOS-82); `null` si no se pudo leer. */
  horarioDelAgente?: HorarioDelAgente | null;
  /** Reglas de respuesta del agente (HU-AOS-97); `null` si no se pudieron leer (no se muestra la sección). */
  reglasDelAgente?: ReglasDelAgente | null;
  /** Tools HTTP del agente con los secretos del negocio (HU-AOS-97); `null` si no se pudieron leer. */
  toolsHttpDelAgente?: ToolsHttpDelAgente | null;
  /** Flujo del agente (ADR-0195, HU-AOS-76); si la API no responde, se abre vacío. */
  flujoInicial?: FlujoDelAgente;
  flujoSeeded?: boolean;
  accionesDelFlujo?: AccionDelFlujo[];
  negocio?: NegocioDelEditor;
  /** El modelo con el que atenderá (HU-AOS-79), solo para mostrarlo en Publicar. */
  modeloEfectivo?: { nombre: string; origen: "negocio" | "agente" } | null;
  /** Sin permiso de escritura: se ve todo, sin guardar ni publicar. */
  puedeEditar?: boolean;
  /** `crear`: continuación de Nuevo agente (pasos en orden, «Siguiente» guarda). `bienvenida`: estaciones 2 a 5 del primer uso. */
  modo?: "crear" | "editar" | "bienvenida";
  bienvenida?: BienvenidaDelEditor;
}) {
  // Crear y la bienvenida van en orden y «Siguiente» guarda; la bienvenida además vive fuera del shell.
  const creando = modo !== "editar";
  const enBienvenida = modo === "bienvenida" && bienvenida !== undefined;
  // HU-AOS-81: «crear» es la creación rápida de 4 pasos; la edición sigue libre con los 8.
  const creacionRapida = modo === "crear";
  // Las estaciones de la ruta de lanzamiento: Nuevo agente y la bienvenida (SPEC-49) tienen las mismas cuatro.
  const comoCreacionRapida = creacionRapida || enBienvenida;
  const deLaRuta: PasoId[] = creacionRapida ? PASOS_DE_LA_CREACION : PASOS_DE_LA_BIENVENIDA;
  const [preparando, setPreparando] = useState(false);
  const [errorDeBienvenida, setErrorDeBienvenida] = useState<string | null>(null);
  const confirm = useConfirm();
  const guardarAccion = useAction({ refresh: false });
  const publicarAccion = useAction({ refresh: false });
  const activarAccion = useAction();
  const datosAccion = useAction({ refresh: false });
  const formasAccion = useAction({ refresh: false });

  const [base, setBase] = useState<Contenido>(agente.draft.content);
  const [lock, setLock] = useState(agente.draft.lock_version);
  const [guardado, setGuardado] = useState(() => estadoDesdeBorrador(agente, agente.draft.content, superpoderes, flujoInicial));
  const [estado, setEstado] = useState<EstadoDelEditor>(guardado);
  const router = useRouter();
  // La creación rápida arranca en su primer paso aunque el enlace traiga otro.
  const [paso, setPaso] = useState<PasoId>(() => {
    // La creación rápida y la bienvenida arrancan en uno de sus pasos aunque el enlace traiga otro
    // (un enlace viejo a «Publicar» o «Flujo» cae en el más cercano).
    const subconjunto = modo === "crear" ? PASOS_DE_LA_CREACION : modo === "bienvenida" ? PASOS_DE_LA_BIENVENIDA : null;
    if (!subconjunto || subconjunto.includes(pasoInicial)) return pasoInicial;
    return pasoInicial === "publicar" ? "probar" : subconjunto[0];
  });
  const [frasePrueba, setFrasePrueba] = useState<string | null>(null);
  const [pruebaDeDatosId, setPruebaDeDatosId] = useState<string | null>(null);
  // Datos cargados en «Conocimiento y datos» (SPEC-45): null = nada en esta visita.
  const [cargado, setCargado] = useState<Cargado | null>(null);
  const [cargados, setCargados] = useState<RegistroDePrueba[]>([]);
  // Si el flujo que se ve es la semilla, se persiste en el primer guardado (aunque no se edite).
  const [flujoPersistido, setFlujoPersistido] = useState(!flujoSeeded);
  // SPEC-48, HU-COM-25: las formas de pago vigentes deciden los bloques de pago del guion.
  const [formas, setFormas] = useState(formasDePago);
  // Estación 2 de la ruta (HU-UX-28): las formas elegidas se guardan al seguir, sin botón propio.
  const [formasElegidas, setFormasElegidas] = useState<FormasElegidas>(() => (formasDePago ? elegidasDe(formasDePago) : {}));
  const [errorDeFormas, setErrorDeFormas] = useState<string | null>(null);
  // La pregunta abierta de la estación 2: al volver a ella desde otra estación, llega todo respondido.
  const [abiertaDeHabilidades, setAbiertaDeHabilidades] = useState(() => (paso === "habilidades" ? 0 : 99));
  // Lo recomendado de la estación 2 es lo que el agente trajo al crearse (`from-script`): sus superpoderes y formas.
  const [recomendadoDeHabilidades] = useState(() => ({
    superpoderes: Object.fromEntries(superpoderes.map((p) => [p.id, Boolean(guardado.superpoderes[p.id]?.activo)])),
    formas: formasDePago ? elegidasDe(formasDePago) : ({} as FormasElegidas),
  }));
  const [errores, setErrores] = useState<Errores>({});
  const [limite, setLimite] = useState<string | null>(null);
  const [elegidas, setElegidas] = useState<string[]>(() => {
    const propias = destinos.filter((d) => d.covers_skills && (d.installed || destinos.length === 1)).map((d) => d.connection_id);
    // Al crear (HU-AOS-86) «Dónde atiende» llega con lo recomendado: si nada viene marcado, la primera que sirve.
    if (modo !== "crear" || propias.length > 0) return propias;
    const primera = destinos.find((d) => d.covers_skills);
    return primera ? [primera.connection_id] : [];
  });
  const [notas, setNotas] = useState("");
  const [publicado, setPublicado] = useState<EditorPublishOut | null>(null);
  const [activadas, setActivadas] = useState<Set<string>>(new Set());
  const [retiradas, setRetiradas] = useState<AgentRetiredNotices | null>(avisosRetirados);
  const pendientes = usePendientes();
  // Avisos de texto escrito y no agregado en una lista, por id de la lista.
  const [avisos, setAvisos] = useState<Record<string, string>>({});
  const [datos, setDatos] = useState<EstadoDatos>(() => (datosCliente ? estadoInicial(datosCliente) : {}));
  const [datosGuardado, setDatosGuardado] = useState<EstadoDatos>(datos);
  const [herramientas, setHerramientas] = useState(datosCliente?.herramientas_del_agente ?? false);
  const [herramientasGuardado, setHerramientasGuardado] = useState(herramientas);
  const [metodos, setMetodos] = useState<MetodoEntrega[]>(
    () => datosCliente?.metodos_entrega ?? METODOS_ENTREGA.map((m) => m.id),
  );
  const [metodosGuardado, setMetodosGuardado] = useState<MetodoEntrega[]>(metodos);
  // Estación 3 de la ruta (HU-UX-29): la pregunta abierta; `null` = aún no se llegó a la estación.
  const [abiertaDeDatos, setAbiertaDeDatos] = useState<number | null>(() => (paso === "datos-cliente" ? 0 : null));
  // Lo recomendado de la estación 3: los niveles por defecto y las entregas y la memoria con que llegó el agente.
  const [recomendadoDeDatos] = useState<RecomendadoDeDatos>(() => ({ metodos, herramientas }));

  const minFrases = modelos.min_phrases;
  const cambios = JSON.stringify(estado) !== JSON.stringify(guardado);
  const datosSinGuardar =
    JSON.stringify(datos) !== JSON.stringify(datosGuardado) ||
    herramientas !== herramientasGuardado ||
    JSON.stringify(metodos) !== JSON.stringify(metodosGuardado);
  useAvisarCambios("datos-cliente-agente", datosSinGuardar);
  useAvisarCambios("editor-de-agente", cambios);
  const contenido = useMemo(() => contenidoDesdeEstado(base, estado, superpoderes), [base, estado, superpoderes]);
  // Lo retirado que está en el borrador se señala junto al superpoder (los índices `procedures[i]` son los del
  // contenido guardado, igual que los errores de la API); lo de versiones publicadas va solo en el aviso.
  const avisosDeBorrador = useMemo(() => avisosDelBorrador(retiradas?.notices ?? []), [retiradas]);
  const avisoPorPoder = useMemo(() => erroresPorSuperpoder(avisosDeBorrador, base), [avisosDeBorrador, base]);
  const porPoder = useMemo(
    () => ({ ...avisoPorPoder, ...erroresPorSuperpoder(errores, contenido) }),
    [avisoPorPoder, errores, contenido],
  );
  // Igual con las acciones (`tools[i]`): los avisos con el índice guardado, los errores con el del contenido.
  const porAccion = useMemo(
    () => ({ ...erroresPorAccion(avisosDeBorrador, base), ...erroresPorAccion(errores, contenido) }),
    [avisosDeBorrador, errores, base, contenido],
  );
  const erroresDeLasAcciones = useMemo(
    () => [...new Set([...erroresSueltosDeAcciones(avisosDeBorrador, base), ...erroresSueltosDeAcciones(errores, contenido)])],
    [avisosDeBorrador, errores, base, contenido],
  );
  // Lo de `tools` se muestra en Acciones; Superpoderes se queda con el resto.
  const sinAcciones = (campos: Errores) => Object.fromEntries(Object.entries(campos).filter(([campo]) => !campo.startsWith("tools")));

  function cambiar(cambio: Partial<EstadoDelEditor>) {
    setEstado((actual) => ({ ...actual, ...cambio }));
    setAvisos({});
  }

  /** Guarda la política de datos del agente si cambió. `true` = se puede continuar. */
  async function guardarDatos(herramientasNuevas: boolean = herramientas): Promise<boolean> {
    if (!datosCliente) return true;
    const sucio =
      JSON.stringify(datos) !== JSON.stringify(datosGuardado) ||
      herramientasNuevas !== herramientasGuardado ||
      JSON.stringify(metodos) !== JSON.stringify(metodosGuardado);
    if (!sucio) return true;
    const ok = await datosAccion.run(async () => {
      const res = await fetch(`/api/agent-editor/${agente.id}/datos-cliente`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cuerpoParaGuardar(datosCliente, datos),
          herramientas_del_agente: herramientasNuevas,
          metodos_entrega: metodos,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: unknown };
      if (!res.ok) {
        const texto = typeof json.error === "string" ? json.error : undefined;
        return { ok: false, status: res.status, error: texto ?? "No se pudieron guardar los datos del cliente." };
      }
      return { ok: true, success: "Datos del cliente guardados." };
    });
    if (ok) {
      setDatosGuardado(datos);
      setHerramientasGuardado(herramientasNuevas);
      setMetodosGuardado(metodos);
    }
    return ok;
  }

  /** Como los niveles y los métodos, queda «con cambios» hasta guardar (HU-AOS-85: un solo guardado). */
  function cambiarHerramientas(activo: boolean) {
    setHerramientas(activo);
  }

  /** En la ruta (HU-UX-29) se pueden desmarcar todas: la pregunta no deja seguir sin una. En Personalizar, la última no se apaga. */
  function cambiarMetodo(metodo: MetodoEntrega, activo: boolean) {
    setMetodos((actual) => conMetodo(actual, metodo, activo, comoCreacionRapida));
  }

  function cambiarNivel(accionId: string, clave: string, nivel: NivelDato) {
    if (!datosCliente) return;
    setDatos((actual) => conNivel(datosCliente, actual, accionId, clave, nivel));
  }

  function restablecerAccion(accionId: string) {
    if (!datosCliente) return;
    setDatos((actual) => restablecida(datosCliente, actual, accionId));
  }

  function elegirCuantoPregunta(nivel: CuantoPregunta) {
    if (!datosCliente) return;
    setDatos((actual) => conCuantoPregunta(datosCliente, actual, nivel));
  }

  function usarDatosRecomendados() {
    if (!datosCliente) return;
    setDatos((actual) => alPorDefecto(datosCliente, actual));
  }

  function validar(id: PasoId, actual: EstadoDelEditor = estado): Errores {
    return erroresDelPaso(id, actual, superpoderes, {
      minFrases,
      conexiones: elegidas,
      ...(datosCliente ? { metodosDeEntrega: metodos } : {}),
    });
  }

  /**
   * Suma a su lista el texto escrito y no agregado (frases prohibidas y frases de superpoderes) y
   * devuelve el estado completo; es el que hay que validar y guardar, porque `estado` aún no lo trae.
   * Si alguna frase no cabe (muy corta o lista llena) avisa junto al campo y devuelve null.
   */
  function plegarPendientes(): EstadoDelEditor | null {
    const dePoder = (id: string) => /^poder-(.+)-frase$/.exec(id)?.[1];
    const pendiente = pendientes.completar((id) => {
      if (id === ID_PROHIBIDAS) return estado.frasesProhibidas;
      const poder = dePoder(id);
      return poder ? estado.superpoderes[poder]?.frases : undefined;
    });
    setAvisos(pendiente.errores);
    if (Object.keys(pendiente.errores).length > 0) return null;
    let completo = estado;
    for (const [id, frases] of Object.entries(pendiente.listas)) {
      const poder = dePoder(id);
      completo = poder
        ? { ...completo, superpoderes: { ...completo.superpoderes, [poder]: { ...completo.superpoderes[poder], frases } } }
        : { ...completo, frasesProhibidas: frases };
    }
    if (completo !== estado) setEstado(completo);
    pendiente.limpiar();
    return completo;
  }

  /** Guarda nombre, descripción, borrador y flujo si cambiaron. Devuelve el `lock_version` vigente o null. */
  async function guardar(actual: EstadoDelEditor = estado): Promise<number | null> {
    if (JSON.stringify(actual) === JSON.stringify(guardado)) return lock;
    const resultado: { lock: number | null } = { lock: null };
    const flujoCambio = !flujoPersistido || JSON.stringify(actual.flujo) !== JSON.stringify(guardado.flujo);
    const ok = await guardarAccion.run(async () => {
      if (actual.nombre !== guardado.nombre || actual.descripcion !== guardado.descripcion) {
        const res = await fetch(`/api/agent-editor/${agente.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: actual.nombre, description: actual.descripcion }),
        });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as Respuesta;
          return { ok: false, status: res.status, error: json.error ?? "No se pudo guardar el nombre." };
        }
      }
      const res = await fetch(`/api/agent-editor/${agente.id}/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contenidoDesdeEstado(base, actual, superpoderes), lock_version: lock }),
      });
      const json = (await res.json().catch(() => ({}))) as Respuesta & { lockVersion?: number; content?: Contenido };
      if (!res.ok) {
        if (json.fields) mostrarErrores(json.fields);
        const error =
          json.code === "stale_lock_version"
            ? "Otra persona guardó este agente mientras lo editabas. Recarga la página para ver sus cambios."
            : (json.error ?? "No se pudo guardar el borrador.");
        return { ok: false, status: res.status, error };
      }
      let vigente = json.lockVersion ?? lock;
      setLock(vigente);
      if (json.content) setBase(json.content);
      if (flujoCambio) {
        const flowRes = await fetch(`/api/agent-editor/${agente.id}/flow`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flow: actual.flujo, lock_version: vigente }),
        });
        const flowJson = (await flowRes.json().catch(() => ({}))) as Respuesta & { lock_version?: number };
        if (!flowRes.ok) {
          if (flowJson.fields) mostrarErrores(flowJson.fields);
          const error =
            flowJson.code === "stale_lock_version"
              ? "Otra persona guardó este agente mientras lo editabas. Recarga la página para ver sus cambios."
              : (flowJson.error ?? "No se pudo guardar el flujo de atención.");
          return { ok: false, status: flowRes.status, error };
        }
        vigente = flowJson.lock_version ?? vigente;
        setLock(vigente);
        setFlujoPersistido(true);
      }
      resultado.lock = vigente;
      setGuardado(actual);
      void recargarAvisos();
      return { ok: true, success: "Borrador guardado." };
    });
    return ok ? resultado.lock : null;
  }

  /** Vuelve a leer los avisos del agente (tras guardar el borrador): quitar lo retirado debe apagar el aviso. */
  async function recargarAvisos() {
    const res = await fetch(`/api/agent-editor/${agente.id}/retired-references`, { cache: "no-store" }).catch(() => null);
    if (!res?.ok) return;
    const json = (await res.json().catch(() => null)) as AgentRetiredNotices | null;
    if (json && Array.isArray(json.notices)) setRetiradas(json);
  }

  function mostrarErrores(campos: Errores) {
    setErrores(campos);
    const primero = Object.keys(campos)[0];
    if (!primero) return;
    const destino = pasoDelCampo(primero);
    if (destino === "habilidades" && comoCreacionRapida) abrirLaDelError(campos);
    // En la ruta solo se ven 4 estaciones del editor: lo de otro paso se avisa en «Revisar y publicar».
    irA(comoCreacionRapida && !deLaRuta.includes(destino) ? "probar" : destino);
  }

  function irA(id: PasoId) {
    // La primera vez que se llega a la estación 3 de la ruta, se abre su primera pregunta.
    if (id === "datos-cliente") setAbiertaDeDatos((a) => a ?? 0);
    setPaso(id);
  }

  /** Cambiar de paso no guarda: lo cambiado queda marcado hasta «Guardar cambios». */
  function mover(delta: 1 | -1) {
    if (creacionRapida) {
      const j = PASOS_DE_LA_CREACION.indexOf(paso);
      const siguiente = PASOS_DE_LA_CREACION[j + delta];
      if (siguiente) irA(siguiente);
      return;
    }
    if (enBienvenida) {
      // Antes de «Habilidades» va el paso del negocio, que vive en `/bienvenida`.
      const j = PASOS_DE_LA_BIENVENIDA.indexOf(paso);
      const siguiente = PASOS_DE_LA_BIENVENIDA[j + delta];
      if (siguiente) irA(siguiente);
      else if (delta < 0) bienvenida.volverA(bienvenida.pasosDelNegocio.length);
      return;
    }
    const i = PASOS.findIndex((p) => p.id === paso);
    const destino = PASOS[i + delta];
    // En la bienvenida, antes de «Habilidades» van los pasos del negocio, que viven en `/bienvenida`.
    if (enBienvenida && (!destino || PASOS_DE_LA_BIENVENIDA.indexOf(destino.id) < 0)) {
      if (delta < 0) bienvenida.volverA(bienvenida.pasosDelNegocio.length);
      return;
    }
    if (destino) irA(destino.id);
  }

  /** Número (1 a 9) de un paso del editor en la bienvenida. */
  function numeroEnBienvenida(id: PasoId): number {
    return (bienvenida?.pasosDelNegocio.length ?? 0) + PASOS_DE_LA_BIENVENIDA.indexOf(id) + 1;
  }

  /** Guarda todo lo cambiado sin publicar. Las reglas de publicación (frases mínimas) no frenan un borrador. */
  async function guardarCambios(plegado?: EstadoDelEditor): Promise<boolean> {
    const completo = plegado ?? plegarPendientes();
    if (!completo) return false;
    setErrores({});
    if (!(await guardarDatos())) return false;
    return (await guardar(completo)) !== null;
  }

  /** «Guardar como borrador» (estación 5): guarda lo que falte, sin publicar, y va a la ficha del agente. */
  async function guardarComoBorrador() {
    if (!(await guardarCambios())) return;
    router.push(`/agentes/${agente.id}`);
  }

  async function siguienteAlCrear() {
    let completo = plegarPendientes();
    if (!completo) return;
    const propios = validar(paso, completo);
    setErrores(propios);
    if (Object.keys(propios).length > 0) {
      if (paso === "habilidades") abrirLaDelError(propios);
      return;
    }
    if (paso === "habilidades" && comoCreacionRapida) {
      // Las formas de pago se guardan como en Personalizar y recomponen el guion (HU-COM-25): va con el borrador.
      const nuevas = await guardarFormas();
      if (nuevas === null) return;
      if (nuevas !== formas) {
        const recompuesto = componerGuion(completo.flujo, estadosDeBloques(nuevas, completo.flujo), accionesDelFlujo);
        if (!mismoGuion(recompuesto, completo.flujo)) {
          completo = { ...completo, flujo: recompuesto };
          setEstado(completo);
        }
      }
    }
    if (!(await guardarCambios(completo))) return;
    if (enBienvenida) {
      const i = PASOS_DE_LA_BIENVENIDA.indexOf(paso);
      const destino = PASOS_DE_LA_BIENVENIDA[i + 1];
      if (!destino) return;
      if (destino === "probar") {
        // La prueba tiene que hablar con lo que el dueño acaba de configurar.
        setPreparando(true);
        const error = await bienvenida.prepararPrueba();
        setPreparando(false);
        setErrorDeBienvenida(error);
        if (error) return;
      }
      bienvenida.avanzar(numeroEnBienvenida(destino));
    }
    mover(1);
  }

  /**
   * Estación 2 de la ruta: guarda las formas de pago elegidas (`PUT payment-forms`, el mismo cuerpo de
   * Personalizar) si cambiaron. Devuelve las vigentes, o `null` si no se pudieron guardar.
   */
  async function guardarFormas(): Promise<FormasDePago | null> {
    if (!formas || !formasCambiaron(formas, formasElegidas)) return formas;
    setErrorDeFormas(null);
    let resultado: FormasDePago | null = null;
    await formasAccion.run(async () => {
      const res = await fetch(`/api/pack/commerce/agents/${agente.id}/payment-forms`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cuerpoDeFormas(formas, formasElegidas)),
      }).catch(() => null);
      const cuerpo = (await res?.json().catch(() => null)) as (FormasDePago & { error?: { message?: string } }) | null;
      if (!res?.ok) {
        const error = cuerpo?.error?.message ?? "No pudimos guardar las formas de pago. Inténtalo de nuevo.";
        setErrorDeFormas(error);
        return { ok: false, status: res?.status ?? 0, error };
      }
      resultado = cuerpo as FormasDePago;
      return { ok: true, success: "Formas de pago guardadas." };
    });
    if (resultado) {
      setFormas(resultado);
      setFormasElegidas(elegidasDe(resultado));
    } else {
      setAbiertaDeHabilidades(1);
    }
    return resultado;
  }

  /** Reabre la pregunta de la estación 2 que tiene el error: ningún superpoder (1) o las frases (la última). */
  function abrirLaDelError(campos: Errores) {
    if (campos.procedures) setAbiertaDeHabilidades(0);
    else if (Object.keys(campos).some((c) => c.startsWith("procedures["))) setAbiertaDeHabilidades(formas ? 2 : 1);
  }

  async function publicar(): Promise<EditorPublishOut | null> {
    const completo = plegarPendientes();
    if (!completo) return null;
    const todos = PASOS.reduce<Errores>((acc, p) => ({ ...acc, ...validar(p.id, completo) }), {});
    if (Object.keys(todos).length > 0) {
      mostrarErrores(todos);
      return null;
    }
    if (!(await guardarDatos())) return null;
    const vigente = await guardar(completo);
    if (vigente === null) return null;
    let resultado: EditorPublishOut | null = null;
    await publicarAccion.run(async () => {
      const res = await fetch(`/api/agent-editor/${agente.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_ids: elegidas, lock_version: vigente, notes: notas }),
      });
      const json = (await res.json().catch(() => ({}))) as Respuesta & Partial<EditorPublishOut>;
      if (!res.ok) {
        // Referencias retiradas (HU-AOS-59): cada texto va junto a su control y el mensaje es el de la API,
        // no el genérico. Si `fields` faltara, se arma desde `details.retired_references`.
        const retiradas422 = referenciasDelError(json.details);
        const campos =
          json.fields ?? (retiradas422.length > 0 ? Object.fromEntries(retiradas422.map((r) => [r.field, r.message])) : undefined);
        if (campos) mostrarErrores(campos);
        // Tope de agentes publicados del plan (HU-BILL-05): no se publicó nada; se explica y se
        // ofrece mejorar el plan junto al botón.
        setLimite(esLimiteDePlan(json.code) ? (json.error ?? "Llegaste al tope de agentes de tu plan.") : null);
        return {
          ok: false,
          status: res.status,
          error:
            campos && retiradas422.length === 0
              ? "Revisa los campos marcados antes de publicar."
              : (json.error ?? "No se pudo publicar."),
        };
      }
      setErrores({});
      setLimite(null);
      resultado = json as EditorPublishOut;
      if (creacionRapida) {
        // Al crear, «Publicar» ya es la decisión del dueño: se activa enseguida donde atiende (D-SPEC-49-9).
        return { ok: true, success: await activarAlCrear(resultado) };
      }
      setPublicado(resultado);
      void recargarAvisos();
      return { ok: true, success: `Versión ${json.version?.version} publicada. Actívala cuando quieras que tus clientes la vean.` };
    });
    return resultado;
  }

  /**
   * Estación 5 de Nuevo agente (HU-AOS-86): activa la versión recién publicada en las conexiones de
   * «Dónde atiende» (si el usuario puede activar) y dice cómo quedó. Un fallo no deshace la publicación.
   */
  async function activarAlCrear(hecho: EditorPublishOut): Promise<string> {
    const nombre = estado.nombre.trim() || "Tu agente";
    const listas = hecho.connections.filter((c) => c.release_id && !c.error);
    if (!puedeActivar) return `${nombre} quedó publicado. Lo activa el propietario del negocio desde su ficha.`;
    if (listas.length === 0) return `${nombre} quedó publicado, pero ninguna conexión quedó lista para activarlo: revísalo desde su ficha.`;
    const fallidas: string[] = [];
    for (const c of listas) {
      const res = await fetch("/api/agent-editor/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: c.connection_id, release_id: c.release_id }),
      }).catch(() => null);
      if (!res?.ok) {
        const destino = destinos.find((d) => d.connection_id === c.connection_id);
        fallidas.push(destino?.label || destino?.channel || "una conexión");
      }
    }
    if (fallidas.length > 0) {
      return `${nombre} quedó publicado, pero no se activó en ${fallidas.join(", ")}: actívalo desde su ficha.`;
    }
    return `${nombre} quedó publicado y ya atiende.`;
  }

  /** «Publicar a {nombre}» (estación 5): publica la versión 1, la activa y va a la ficha del agente. */
  async function publicarAlCrear() {
    if (await publicar()) router.push(`/agentes/${agente.id}`);
  }

  async function activar(connectionId: string, releaseId: string, nombre: string) {
    const ok = await confirm({
      title: `Activar en ${nombre}`,
      description:
        "Desde el próximo mensaje, los clientes de esta conexión hablan con esta versión. Puedes volver a la anterior desde Conexiones.",
      confirmLabel: "Activar versión",
    });
    if (!ok) return;
    await activarAccion.run(async () => {
      const res = await fetch("/api/agent-editor/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: connectionId, release_id: releaseId }),
      });
      const json = (await res.json().catch(() => ({}))) as Respuesta;
      if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "No se pudo activar." };
      setActivadas((a) => new Set([...a, connectionId]));
      return { ok: true, success: `Versión activa en ${nombre}.` };
    });
  }

  const avisosPorPoder = Object.fromEntries(
    Object.entries(avisos).flatMap(([id, aviso]) => {
      const poder = /^poder-(.+)-frase$/.exec(id)?.[1];
      return poder ? [[poder, aviso]] : [];
    }),
  );

  // «Datos del cliente»: paso propio en Personalizar (HU-AOS-85) y estación 3 de Nuevo agente (HU-AOS-86) y de
  // la bienvenida (HU-UX-25). Se guarda con «Guardar y seguir» o «Guardar cambios», no con un botón propio.
  const datosDelCliente = datosCliente ? (
    <DatosDelAgente
      politica={datosCliente}
      estado={datos}
      guardado={datosGuardado}
      herramientas={herramientas}
      metodos={metodos}
      puedeEditar={puedeEditarDatos && puedeEditar}
      guardando={datosAccion.pending}
      sinGuardar={datosSinGuardar}
      onNivel={cambiarNivel}
      onRestablecer={restablecerAccion}
      onHerramientas={cambiarHerramientas}
      onMetodo={cambiarMetodo}
      onCuantoPregunta={elegirCuantoPregunta}
      onUsarRecomendado={usarDatosRecomendados}
      comoPaso
      errorDeMetodos={errores["datos.metodos_entrega"]}
    />
  ) : (
    <Card>
      <CardContent role="alert" className="pt-5 text-sm text-status-danger-fg">
        No se pudieron cargar los datos del cliente{datosClienteError ? `: ${datosClienteError}` : "."} Recarga la página
        para intentarlo de nuevo.
      </CardContent>
    </Card>
  );

  /** Lo que quedó en cada estación, para «Revisar y publicar» (HU-AOS-86). */
  function resumenDeEstacion(id: PasoId): string {
    if (id === "habilidades") {
      const encendidas = superpoderes.filter((p) => estado.superpoderes[p.id]?.activo).length;
      return `${encendidas} de ${superpoderes.length} encendidas`;
    }
    if (id === "datos-cliente") {
      // Sin los atajos de «Cuánto pregunta» en la ruta (HU-UX-29): las entregas y cuántos datos pide siempre.
      if (!datosCliente) return "Sin cargar";
      const siempre = operacionesEnLaRuta(datosCliente, metodos).reduce(
        (n, { accion }) => n + accion.campos.filter((c) => (datos[accion.id]?.[c.clave] ?? c.nivel) === "requerido").length,
        0,
      );
      const entregas = preguntaPorEntregas(datosCliente)
        ? METODOS_ENTREGA.filter((m) => metodos.includes(m.id)).map((m) => m.etiqueta).join(" y ")
        : "";
      return [entregas, `${siempre} ${siempre === 1 ? "dato" : "datos"} siempre`].filter(Boolean).join(" · ");
    }
    if (id === "conocimiento") {
      return cargados.length > 0 ? `${cargados.length} ${cargados.length === 1 ? "registro cargado" : "registros cargados"}` : "Sin datos de prueba";
    }
    return "";
  }
  /** «Tu negocio» en la estación 5 de la bienvenida: el negocio, el tipo y cómo atiende. */
  const tipoDelNegocio = TIPOS_DE_NEGOCIO.find((t) => t.id === agente.key);
  const resumenDelNegocio = [
    negocio.nombre.trim(),
    tipoDelNegocio?.titulo,
    estado.nombre.trim() ? `Atiende como ${estado.nombre.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  // Errores de pasos que la ruta no muestra (voz, flujo…): se avisan en la estación 5 con un enlace.
  const fueraDeLaRuta = comoCreacionRapida
    ? [...new Set(Object.keys(errores).map(pasoDelCampo))].filter((p) => p !== "publicar" && !deLaRuta.includes(p))
    : [];

  // Estación 2 de la ruta (HU-UX-28): tres preguntas una a la vez (dos sin Comercio); lo técnico, en avanzadas.
  const tipoDeLaRuta = tipoDelAgente(agente.key, datosCliente);
  const preguntasDeLaEstacion2 = preguntasDeHabilidades({
    nombre: estado.nombre.trim(),
    tipo: tipoDeLaRuta,
    catalogo: superpoderes,
    estado,
    onSuperpoder: (id, cambio) => {
      const actual = estado.superpoderes[id] ?? { activo: false, frases: [] };
      cambiar({ superpoderes: { ...estado.superpoderes, [id]: { ...actual, ...cambio } } });
    },
    formas,
    elegidas: formasElegidas,
    onForma: (metodo: Metodo, encendida: boolean) => {
      setFormasElegidas((e) => ({ ...e, [metodo]: encendida }));
      setErrorDeFormas(null);
    },
    requisitos,
    minFrases,
    errores: { procedures: sinAcciones({ ...avisosDeBorrador, ...errores }).procedures, formas: errorDeFormas ?? undefined },
    erroresPorPoder: { ...porPoder, ...avisosPorPoder },
    registrarPendiente: pendientes.registrar,
    soloLectura: !puedeEditar,
    // En la bienvenida el panel no se abre hasta terminar: lo que se hace después va como texto (dueño, 2026-11-26).
    sinEnlaces: enBienvenida,
  });
  const faltanDeLaEstacion2 = preguntasDeLaEstacion2.length - Math.min(abiertaDeHabilidades, preguntasDeLaEstacion2.length);
  const cambiosDeLaEstacion2 =
    superpoderes.filter((p) => Boolean(estado.superpoderes[p.id]?.activo) !== recomendadoDeHabilidades.superpoderes[p.id]).length +
    (formas
      ? formas.forms.filter(
          (f) => (formasElegidas[f.method] ?? f.enabled) !== (recomendadoDeHabilidades.formas[f.method] ?? f.enabled),
        ).length
      : 0);
  function usarLoRecomendadoEnHabilidades() {
    cambiar({
      superpoderes: Object.fromEntries(
        Object.entries(estado.superpoderes).map(([id, p]) => [id, { ...p, activo: recomendadoDeHabilidades.superpoderes[id] ?? p.activo }]),
      ),
    });
    setFormasElegidas(recomendadoDeHabilidades.formas);
  }
  /** Al dejar la pregunta de las frases se suma lo escrito y no agregado, antes de que su caja se cierre. */
  function abrirEnHabilidades(indice: number) {
    const deLasFrases = preguntasDeLaEstacion2.length - 1;
    if (abiertaDeHabilidades === deLasFrases && indice > deLasFrases && !plegarPendientes()) return;
    setAbiertaDeHabilidades(indice);
  }
  const conErrorDeAcciones = erroresDeLasAcciones.length > 0 || Object.keys(porAccion).length > 0;
  const habilidadesEnLaRuta = (
    <div className="flex flex-col gap-6">
      <BarraRecomendado cambios={cambiosDeLaEstacion2} onUsar={usarLoRecomendadoEnHabilidades} />
      <ListaDePreguntas
        preguntas={preguntasDeLaEstacion2}
        abierta={abiertaDeHabilidades}
        onAbrir={abrirEnHabilidades}
      />
      <AvisoDeRequisitos
        requisitos={requisitos}
        titulo="Para que funcione del todo"
        bajada={enBienvenida ? "Tu agente ya puede responder. Esto lo haces después de terminar." : "Tu agente ya puede responder. Esto lo haces ahora o después."}
        sinEnlaces={enBienvenida}
      />
      <OpcionesAvanzadas descripcion={AVANZADAS_DE_HABILIDADES} abierta={conErrorDeAcciones}>
        <section aria-labelledby="habilidades-acciones" className="flex flex-col gap-3">
          <h3 id="habilidades-acciones" className="font-display text-base font-semibold text-headline">
            Acciones y límites por acción
          </h3>
          <AccionesDelAgente
            acciones={estado.acciones}
            cambiar={(acciones) => cambiar({ acciones })}
            erroresPorAccion={porAccion}
            errores={erroresDeLasAcciones}
            conConocimiento={estado.conocimiento.activo}
            gruposDeLaApi={gruposDeAcciones}
            soloLectura={!puedeEditar}
          />
        </section>
        <LineaDelHorario
          horario={horarioDelAgente}
          delNegocio={negocio.horario}
          hrefCambiar={enBienvenida ? undefined : rutaDePersonalizar(agente.id, { paso: "reglas" })}
        />
      </OpcionesAvanzadas>
    </div>
  );

  // Estación 3 de la ruta (HU-UX-29): entregas, una pregunta por entrega u operación y la memoria; el aviso, en avanzadas.
  const preguntasDeLaEstacion3 = datosCliente
    ? preguntasDeDatos({
        nombre: estado.nombre.trim(),
        politica: datosCliente,
        estado: datos,
        metodos,
        herramientas,
        onNivel: cambiarNivel,
        onMetodo: cambiarMetodo,
        onHerramientas: cambiarHerramientas,
        error: errores["datos.metodos_entrega"],
      })
    : [];
  const abiertaEnDatos = Math.min(abiertaDeDatos ?? 0, preguntasDeLaEstacion3.length);
  const faltanDeLaEstacion3 = preguntasDeLaEstacion3.length - abiertaEnDatos;
  const cambiosEnDatos = datosCliente
    ? cambiosDeLaEstacion3(datosCliente, datos, metodos, herramientas, recomendadoDeDatos)
    : 0;
  function usarLoRecomendadoEnDatos() {
    if (!datosCliente) return;
    setDatos((actual) => datosRecomendadosEnLaRuta(datosCliente, actual, recomendadoDeDatos.metodos));
    setHerramientas(recomendadoDeDatos.herramientas);
    if (JSON.stringify(metodos) !== JSON.stringify(recomendadoDeDatos.metodos)) {
      // Con otras entregas cambian las preguntas: se vuelve a la primera.
      setMetodos(recomendadoDeDatos.metodos);
      setAbiertaDeDatos(0);
    }
  }
  const datosEnLaRuta = datosCliente ? (
    <div className="flex flex-col gap-6">
      {puedeEditarDatos && <BarraRecomendado cambios={cambiosEnDatos} onUsar={usarLoRecomendadoEnDatos} />}
      {!puedeEditarDatos && (
        <p role="note" className="text-sm text-text-soft">
          Solo puedes ver esta configuración. Para cambiarla, pídele acceso a quien administra el negocio.
        </p>
      )}
      <fieldset disabled={!puedeEditarDatos} className="min-w-0">
        <legend className="sr-only">Datos del cliente</legend>
        <ListaDePreguntas preguntas={preguntasDeLaEstacion3} abierta={abiertaEnDatos} onAbrir={setAbiertaDeDatos} />
      </fieldset>
      {avisoDeDatos && (
        <OpcionesAvanzadas descripcion={AVANZADAS_DE_DATOS}>
          <LineaDelAviso aviso={avisoDeDatos} conEnlace={!enBienvenida} />
        </OpcionesAvanzadas>
      )}
    </div>
  ) : (
    datosDelCliente
  );

  const bloquesDelGuion = estadosDeBloques(formas, estado.flujo);
  const sugerido = guionSugerido(semillaDelFlujo ?? flujoInicial, bloquesDelGuion, accionesDelFlujo);
  const contenidoDelPaso: Record<PasoId, React.ReactNode> = {
    identidad: <PasoIdentidad estado={estado} cambiar={cambiar} errores={errores} />,
    voz: (
      <PasoVoz
        estado={estado}
        cambiar={cambiar}
        errores={avisos[ID_PROHIBIDAS] ? { ...errores, "persona.forbiddenPhrases": avisos[ID_PROHIBIDAS] } : errores}
        registrarPendiente={pendientes.registrar}
        vozDelNegocio={negocio.resumenDeVoz}
      />
    ),
    reglas: (
      <div className="flex flex-col gap-6">
        <PasoReglas
          horario={negocio.horario}
          motivos={negocio.motivos}
          horarioDelAgente={
            horarioDelAgente ? (
              <HorarioDelAgenteEditable
                agenteId={agente.id}
                inicial={horarioDelAgente}
                lockVersion={lock}
                onLockVersion={setLock}
                puedeEditar={puedeEditar}
                zonaDelNegocio="America/Bogota"
              />
            ) : undefined
          }
        />
        {reglasDelAgente && (
          <div className="max-w-xl">
            <ReglasDelAgenteEditable
              agenteId={agente.id}
              inicial={reglasDelAgente}
              lockVersion={lock}
              onGuardado={(nuevo, guardrails) => {
                setLock(nuevo);
                // El borrador del editor lleva las reglas nuevas: el próximo «Guardar» no las pisa.
                setBase((b) => ({ ...b, guardrails }));
              }}
              puedeEditar={puedeEditar}
              acciones={[...new Set([...accionesDelFlujo.map((a) => a.tool), ...(toolsHttpDelAgente?.tools ?? []).map((t) => t.name)])]}
            />
          </div>
        )}
      </div>
    ),
    habilidades: comoCreacionRapida ? (
      habilidadesEnLaRuta
    ) : (
      <div className="flex flex-col gap-10">
        <section aria-labelledby="habilidades-superpoderes" className="flex flex-col gap-4">
          <h3 id="habilidades-superpoderes" className="font-display text-sh-block text-headline">
            Superpoderes
          </h3>
          <PasoSuperpoderes
            estado={estado}
            cambiar={cambiar}
            // Las acciones retiradas del borrador no tienen un control propio: se listan aquí, junto a los
            // errores de la API de esos mismos campos.
            errores={sinAcciones({ ...avisosDeBorrador, ...errores })}
            erroresPorPoder={{ ...porPoder, ...avisosPorPoder }}
            registrarPendiente={pendientes.registrar}
            catalogo={superpoderes}
            minFrases={minFrases}
            requisitos={requisitos}
            nombreDeHabilidad={(skill) => nombresDeHabilidades[skill] ?? habilidadLabel(skill)}
            interruptor
            soloLectura={!puedeEditar}
          />
        </section>
        {formasDePago && (
          <section aria-labelledby="habilidades-formas-de-pago" className="flex flex-col gap-4">
            <h3 id="habilidades-formas-de-pago" className="font-display text-sh-block text-headline">
              Formas de pago
            </h3>
            <FormasDePagoDelAgente
              agenteId={agente.id}
              inicial={formasDePago}
              puedeEditar={puedeEditar}
              onGuardado={(nuevas) => {
                setFormas(nuevas);
                // HU-COM-25: el guion se recompone con las formas guardadas; queda «con cambios» hasta guardar.
                const recompuesto = componerGuion(estado.flujo, estadosDeBloques(nuevas, estado.flujo), accionesDelFlujo);
                if (!mismoGuion(recompuesto, estado.flujo)) cambiar({ flujo: recompuesto });
              }}
            />
          </section>
        )}
        {toolsHttpDelAgente && (
          <section aria-labelledby="habilidades-tools-http" className="flex flex-col gap-4">
            <h3 id="habilidades-tools-http" className="font-display text-sh-block text-headline">
              Tools HTTP
            </h3>
            <ToolsHttpDelAgenteEditable
              agenteId={agente.id}
              inicial={toolsHttpDelAgente}
              lockVersion={lock}
              onGuardado={(nuevo, declarativeTools) => {
                setLock(nuevo);
                setBase((b) => ({ ...b, declarativeTools }));
              }}
              puedeEditar={puedeEditar}
            />
          </section>
        )}
        <section aria-labelledby="habilidades-acciones" className="flex flex-col gap-4">
          <h3 id="habilidades-acciones" className="font-display text-sh-block text-headline">
            Acciones
          </h3>
          <AccionesDelAgente
            acciones={estado.acciones}
            cambiar={(acciones) => cambiar({ acciones })}
            erroresPorAccion={porAccion}
            errores={erroresDeLasAcciones}
            conConocimiento={estado.conocimiento.activo}
            gruposDeLaApi={gruposDeAcciones}
          />
        </section>
      </div>
    ),
    "datos-cliente": comoCreacionRapida ? datosEnLaRuta : datosDelCliente,
    flujo: (
      <PasoFlujo
        flujo={estado.flujo}
        acciones={accionesDelFlujo}
        cambiar={(flujo) => cambiar({ flujo })}
        errores={errores}
        semilla={flujoSeeded && JSON.stringify(estado.flujo) === JSON.stringify(flujoInicial)}
        guion={
          formas
            ? {
                bloques: bloquesDelGuion,
                restaurado: mismoGuion(sugerido, estado.flujo),
                onRestaurar: () => cambiar({ flujo: sugerido }),
              }
            : undefined
        }
      />
    ),
    conocimiento: (
      <div className="flex flex-col gap-10">
        {!comoCreacionRapida && <PasoMemoria estado={estado} cambiar={cambiar} errores={errores} agenteId={agente.id} />}
        <section aria-labelledby="conocimiento-datos" className="flex flex-col gap-4">
          <h3 id="conocimiento-datos" className="font-display text-sh-block text-headline">
            Carga sus datos
          </h3>
          {cargado ? (
            <div className="flex flex-col gap-4">
              <PasoLoCargado agenteId={agente.id} locales={cargado.registros} resumen={cargado.resumen || null} onRegistros={setCargados} />
              <div>
                <Button variant="outline" onClick={() => setCargado(null)}>
                  Cargar otros datos
                </Button>
              </div>
            </div>
          ) : (
            <PasoDatos
              agenteId={agente.id}
              onCargado={(c) => {
                setCargado(c);
                setCargados(c.registros);
              }}
              // Fuera de test Agenda, Cobranza y Suscripciones no tienen carga: «Seguir sin datos» pasa a la 5.
              onSeguirSinDatos={comoCreacionRapida ? () => void siguienteAlCrear() : undefined}
            />
          )}
        </section>
      </div>
    ),
    probar: enBienvenida ? (
      <div className="flex flex-col gap-8">
        <ResumenDeEstaciones<PasoId | "negocio">
          estaciones={[
            { id: "negocio", titulo: "Tu negocio", resumen: resumenDelNegocio },
            ...PASOS_DE_LA_BIENVENIDA.filter((p) => p !== "probar").map((p) => ({
              id: p,
              titulo: EN_LA_RUTA[p]?.titulo ?? p,
              resumen: resumenDeEstacion(p),
            })),
          ]}
          onEditar={(id) => (id === "negocio" ? bienvenida.volverA(1) : irA(id))}
        />
        {fueraDeLaRuta.length > 0 && (
          <p role="alert" className="max-w-xl rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
            Hay algo por revisar en {fueraDeLaRuta.map((p) => `«${PASOS.find((x) => x.id === p)?.titulo ?? p}»`).join(", ")}.
            Lo ajustas después en Personalizar.
          </p>
        )}
        <section aria-labelledby="ultima-prueba" className="flex flex-col gap-3">
          <h2 id="ultima-prueba" className="font-display text-sh-block text-headline">
            Última prueba: qué le escribes
          </h2>
          {bienvenida.prueba(cargados)}
          {!bienvenida.probado && (
            <p role="status" className="rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
              Para publicar a {estado.nombre.trim() || "tu agente"}, envíale al menos una frase aquí.
            </p>
          )}
        </section>
        <p className="text-sm text-text-soft">
          Queda listo en tu chat de pruebas, cerrado al público. Cómo habla, su horario y su flujo los ajustas después en
          Personalizar; cuando conectes tu WhatsApp, lo activas desde Conexiones.
        </p>
      </div>
    ) : creacionRapida ? (
      <div className="flex flex-col gap-8">
        <SemaforoListo
          semaforo={semaforo({
            requisitos,
            formas,
            superpoderesActivos: Object.values(estado.superpoderes).filter((p) => p.activo).length,
            conDatos: cargados.length > 0,
          })}
        />
        <ResumenDeEstaciones
          estaciones={PASOS_DE_LA_CREACION.filter((p) => p !== "probar").map((p) => ({
            id: p,
            titulo: EN_LA_RUTA[p]?.titulo ?? p,
            resumen: resumenDeEstacion(p),
          }))}
          onEditar={irA}
        />
        {fueraDeLaRuta.length > 0 && (
          <p role="alert" className="max-w-xl rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
            Hay algo por revisar en {fueraDeLaRuta.map((p) => `«${PASOS.find((x) => x.id === p)?.titulo ?? p}»`).join(", ")}.{" "}
            <Link className="underline" href={rutaDePersonalizar(agente.id, { paso: fueraDeLaRuta[0] })}>
              Ábrelo en Personalizar
            </Link>
            .
          </p>
        )}
        <section aria-labelledby="ultima-prueba" className="flex flex-col gap-3">
          <h3 id="ultima-prueba" className="font-display text-sh-block text-headline">
            Última prueba
          </h3>
          <PasoProbarBorrador agenteId={agente.id} sugerencias={sugerenciasDePrueba(cargados)} />
        </section>
        <PasoPublicar
          destinos={destinos}
          destinosError={destinosError}
          requisitos={requisitos}
          elegidas={elegidas}
          alternar={(id, activo) => setElegidas((e) => (activo ? [...new Set([...e, id])] : e.filter((x) => x !== id)))}
          errores={errores}
          notas={notas}
          setNotas={setNotas}
          modelo={modeloEfectivo}
          alCrear
        />
        <p className="text-sm text-text-soft">Si prefieres seguir después, guárdalo como borrador: no atiende hasta que lo publiques.</p>
      </div>
    ) : creando ? (
      <div className="flex flex-col gap-6">
        <PasoProbarBorrador agenteId={agente.id} sugerencias={sugerenciasDePrueba(cargados)} />
      </div>
    ) : (
      <div className="flex max-w-xl flex-col gap-4">
        <p className="text-sm text-body">
          El chat de prueba responde con la versión <strong className="text-headline">activa</strong> de una conexión
          donde está el agente, igual que con un cliente. Lo que cambiaste aquí se prueba después de publicar y activar la
          versión nueva.
        </p>
        <div>
          <Button asChild variant="outline">
            <Link href={`/agentes/${agente.id}?tab=probar`}>Abrir el chat de prueba</Link>
          </Button>
        </div>
      </div>
    ),
    publicar: enBienvenida ? (
      <div className="flex max-w-xl flex-col gap-4">
        <p className="text-body">
          Tu agente queda listo en tu chat de pruebas, cerrado al público, con todo lo que configuraste. Cuando conectes tu
          WhatsApp, lo activas ahí desde Conexiones.
        </p>
        {!bienvenida.probado && (
          <p role="status" className="rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
            Para terminar, escríbele al menos un mensaje en «Pruébalo».
          </p>
        )}
      </div>
    ) : (
      <PasoPublicar
        destinos={destinos}
        destinosError={destinosError}
        requisitos={requisitos}
        elegidas={elegidas}
        alternar={(id, activo) => setElegidas((e) => (activo ? [...new Set([...e, id])] : e.filter((x) => x !== id)))}
        errores={errores}
        notas={notas}
        setNotas={setNotas}
        modelo={modeloEfectivo}
      />
    ),
  };

  // La vista previa de cada paso: textos fijos de `lib/vista-previa.ts`, sin modelo ni créditos.
  const nombreDelAgente = estado.nombre.trim() || "Tu agente";
  const activos = superpoderes.filter((p) => estado.superpoderes[p.id]?.activo);
  const probado = superpoderes.find((p) => p.phrases[0] === frasePrueba) ?? activos[0] ?? superpoderes[0];
  // «Datos del cliente»: el chat simulado de la estación 3 (D-SPEC-49-4), sin modelo ni precios.
  const tipoDelChat = tipoDeLaRuta;
  const pruebaDeDatos = paso === "datos-cliente" && tipoDelChat ? sugerenciasPorEstacion(tipoDelChat, "datos-cliente") : [];
  const pruebaElegida = pruebaDeDatos.find((s) => s.id === pruebaDeDatosId);
  const mensajesDelPaso =
    paso === "datos-cliente" && tipoDelChat
      ? [
          saludoDePrueba(tipoDelChat, nombreDelAgente, negocio.nombre),
          ...(pruebaElegida
            ? [
                { tipo: "cliente" as const, texto: pruebaElegida.texto },
                ...respuestaDePrueba(tipoDelChat, "datos-cliente", pruebaElegida.id, {
                  agente: nombreDelAgente,
                  negocio: negocio.nombre,
                }),
              ]
            : []),
        ]
      : paso === "habilidades" && probado
      ? conversacionDeHabilidad(
          { id: probado.id, titulo: probado.title, activa: Boolean(estado.superpoderes[probado.id]?.activo), frases: probado.phrases },
          frasePrueba ?? undefined,
        )
      : paso === "flujo"
        ? conversacionDelGuion(estado.flujo)
        : negocio.voz
          ? conversacionDeVoz(negocio.voz, nombreDelAgente, negocio.nombre)
          : [];
  const vistaPrevia: VistaPreviaDelPaso | undefined =
    paso === "probar" || paso === "publicar"
      ? undefined
      : {
          negocio: negocio.nombre,
          agente: nombreDelAgente,
          subtitulo: `${nombreDelAgente} · borrador sin publicar`,
          mensajes: mensajesDelPaso,
          sugerencias:
            paso === "datos-cliente"
              ? pruebaDeDatos.map((s) => ({
                  id: s.id,
                  texto: s.texto,
                  activa: s.id === pruebaDeDatosId,
                  onUsar: () => setPruebaDeDatosId(s.id),
                }))
              : paso === "habilidades"
              ? superpoderes
                  .filter((p) => p.phrases[0])
                  .slice(0, 4)
                  .map((p) => ({
                    id: p.id,
                    texto: p.phrases[0],
                    activa: probado?.id === p.id,
                    onUsar: () => setFrasePrueba(p.phrases[0]),
                  }))
              : undefined,
        };

  // Los datos del cliente marcan su propio paso.
  const conCambios = pasosConCambios(estado, guardado, { datosCliente: datosSinGuardar });
  const conError = new Set(Object.keys(errores).map(pasoDelCampo));
  const visibles = enBienvenida
    ? PASOS.filter((p) => PASOS_DE_LA_BIENVENIDA.includes(p.id))
    : creacionRapida
      ? PASOS.filter((p) => PASOS_DE_LA_CREACION.includes(p.id))
      : PASOS;
  const pasosDelEditor: PasoDeLaBarra[] = visibles.map(
    (p) => ({
      id: p.id,
      titulo: (comoCreacionRapida && EN_LA_RUTA[p.id]?.titulo) || p.titulo,
      corto: (comoCreacionRapida && EN_LA_RUTA[p.id]?.corto) || p.corto,
      marca: conError.has(p.id) ? "revisar" : conCambios.has(p.id) ? "cambios" : undefined,
    }),
  );
  const pasos: PasoDeLaBarra[] = enBienvenida
    ? [...bienvenida.pasosDelNegocio, ...pasosDelEditor]
    : creacionRapida
      ? [PASO_UNO_DE_LA_CREACION, ...pasosDelEditor]
      : pasosDelEditor;
  const indice = PASOS.findIndex((p) => p.id === paso);
  const ultimo = creacionRapida
    ? paso === PASOS_DE_LA_CREACION[PASOS_DE_LA_CREACION.length - 1]
    : enBienvenida
      ? paso === PASOS_DE_LA_BIENVENIDA[PASOS_DE_LA_BIENVENIDA.length - 1]
      : indice === PASOS.length - 1;
  const primeroDeLaCreacion = creacionRapida && paso === PASOS_DE_LA_CREACION[0];
  const hayCambios = cambios || datosSinGuardar;

  // Ruta de lanzamiento (HU-AOS-86): la estación siguiente, la pregunta y el celular.
  const siguienteDeLaRuta = comoCreacionRapida ? deLaRuta[deLaRuta.indexOf(paso) + 1] : undefined;
  const tituloSiguiente = siguienteDeLaRuta ? (EN_LA_RUTA[siguienteDeLaRuta]?.titulo ?? "") : "";
  const nombreVisible = estado.nombre.trim();
  const estacionDelChat = ESTACION_DEL_PASO[paso];
  // El celular a la derecha en los dos recorridos (HU-UX-26). En la estación 5 de la bienvenida no hay chat
  // simulado: la última prueba es de verdad, por la conexión de pruebas, en el formulario.
  const celular = comoCreacionRapida ? (
    <CelularDeVistaPrevia
      tipo={tipoDelChat}
      estacion={enBienvenida && paso === "probar" ? undefined : estacionDelChat}
      agente={nombreVisible || "tu agente"}
      negocio={negocio.nombre}
      cargados={cargados}
      frasesPropias={
        paso === "habilidades"
          ? activos.flatMap((p) => (estado.superpoderes[p.id]?.frases ?? []).map((texto) => ({ texto, superpoder: p.title })))
          : undefined
      }
      sinChat={
        enBienvenida && paso === "probar"
          ? `La última prueba es de verdad: escríbele a ${nombreVisible || "tu agente"} en esta estación.`
          : undefined
      }
    />
  ) : undefined;

  // La pregunta de la estación: en la bienvenida, la de sus tableros; al crear, la de la ruta; si no, la del paso.
  const preguntaDeLaRuta = enBienvenida
    ? paso === "conocimiento"
      ? (DATOS_PARA_PROBAR[agente.key ?? ""] ?? PREGUNTA_EN_LA_RUTA.conocimiento)
      : PREGUNTA_EN_LA_BIENVENIDA[paso]
    : creacionRapida
      ? PREGUNTA_EN_LA_RUTA[paso]
      : undefined;
  const pregunta = preguntaDeLaRuta
    ? preguntaDeLaRuta.replace("{nombre}", nombreVisible || "tu agente")
    : preguntaDelPaso(paso, estado.nombre);

  // «Seguir después» guarda lo de la estación (sin las reglas de publicar) antes de salir.
  const seguirDespues = () =>
    enBienvenida ? bienvenida.seguirDespues({ nombre: nombreVisible || "Tu agente", guardar: guardarCambios, enEscenario: false }) : null;

  const editor = (
    <div className={enBienvenida ? "flex flex-1 flex-col gap-6" : "flex flex-col gap-6"}>
      <AvisoDeReferenciasRetiradas aviso={retiradas} />

      <RecorridoDelAgente
        pasos={pasos}
        actual={paso}
        modo={creando ? "en-orden" : "libre"}
        onIr={(id) => {
          const delNegocio = bienvenida?.pasosDelNegocio.findIndex((p) => p.id === id) ?? -1;
          if (enBienvenida && delNegocio >= 0) bienvenida.volverA(delNegocio + 1);
          else if (id !== PASO_UNO_DE_LA_CREACION.id) irA(id as PasoId);
        }}
        etiquetaDePasos={enBienvenida ? "Pasos del primer uso" : creando ? "Pasos para crear el agente" : "Pasos del editor de agentes"}
        pregunta={pregunta}
        nivelDePregunta={enBienvenida || creacionRapida ? "h1" : "h2"}
        disposicion={comoCreacionRapida ? "ruta" : "pasos"}
        bajada={
          comoCreacionRapida && paso === "habilidades"
            ? bajadaDeHabilidades(preguntasDeLaEstacion2.length)
            : comoCreacionRapida && paso === "datos-cliente"
              ? datosCliente && preguntaPorEntregas(datosCliente)
                ? "Cada forma de entrega pide sus propios datos. Viene con lo justo, como lo recomienda SolversHub."
                : "Cada operación pide sus propios datos. Viene con lo justo, como lo recomienda SolversHub."
            : enBienvenida
              ? BAJADA_EN_LA_BIENVENIDA[paso]
              : undefined
        }
        estado={
          comoCreacionRapida && paso === "habilidades" && faltanDeLaEstacion2 > 0
            ? textoDeFaltan(faltanDeLaEstacion2)
            : comoCreacionRapida && paso === "datos-cliente" && faltanDeLaEstacion3 > 0
              ? textoDeFaltan(faltanDeLaEstacion3)
              : undefined
        }
        celular={celular}
        queSigue={
          comoCreacionRapida
            ? tituloSiguiente
              ? `Sigue: ${tituloSiguiente}.`
              : enBienvenida
                ? "Sigue: queda atendiendo en tu chat de pruebas."
                : undefined
            : undefined
        }
        extremo={
          creacionRapida ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/agentes/${agente.id}`}>Terminar después</Link>
            </Button>
          ) : undefined
        }
        dentroDelPanel={!enBienvenida}
        className={enBienvenida ? "flex-1" : undefined}
        // En la bienvenida el chat simulado va en el escenario de la izquierda, no en el teléfono.
        vistaPrevia={enBienvenida ? undefined : vistaPrevia}
        atras={{ texto: "Atrás", onClick: () => mover(-1), deshabilitado: (indice === 0 && !enBienvenida) || primeroDeLaCreacion }}
        guardar={
          ultimo && creacionRapida && puedeEditar
            ? {
                texto: "Guardar como borrador",
                onClick: () => void guardarComoBorrador(),
                cargando: guardarAccion.pending,
                deshabilitado: publicarAccion.pending || datosAccion.pending,
              }
            : puedeEditar && !creando
            ? {
                texto: "Guardar cambios",
                onClick: () => void guardarCambios(),
                // Con solo datos del cliente cambiados, el PUT es el de `datosAccion`: también cuenta.
                cargando: guardarAccion.pending || datosAccion.pending,
                deshabilitado: !hayCambios || publicarAccion.pending || datosAccion.pending,
              }
            : undefined
        }
        principal={
          ultimo && enBienvenida
            ? {
                // La prueba por la conexión de pruebas es lo que deja terminar (`finalizar`).
                texto: `Publicar a ${nombreVisible || "tu agente"}`,
                onClick: () => void bienvenida.terminar(),
                cargando: bienvenida.terminando,
                deshabilitado: !bienvenida.probado || bienvenida.terminando,
              }
            : ultimo && creacionRapida
            ? puedeEditar
              ? {
                  texto: `Publicar a ${nombreVisible || "tu agente"}`,
                  onClick: () => void publicarAlCrear(),
                  cargando: publicarAccion.pending,
                  deshabilitado:
                    publicarAccion.pending || guardarAccion.pending || datosAccion.pending || destinos.length === 0,
                }
              : undefined
            : ultimo
            ? puedeEditar
              ? {
                  texto: creando ? "Publicar" : "Publicar versión",
                  onClick: () => void publicar(),
                  cargando: publicarAccion.pending,
                  deshabilitado:
                    publicarAccion.pending || guardarAccion.pending || datosAccion.pending || destinos.length === 0,
                }
              : undefined
            : comoCreacionRapida
              ? {
                  texto: `Guardar y seguir: ${tituloSiguiente}`,
                  onClick: () => void siguienteAlCrear(),
                  cargando: guardarAccion.pending || datosAccion.pending || formasAccion.pending || preparando,
                  // En Habilidades y Datos del cliente, como en la estación 1, se sigue con todas las preguntas respondidas.
                  deshabilitado:
                    (paso === "habilidades" && faltanDeLaEstacion2 > 0) || (paso === "datos-cliente" && faltanDeLaEstacion3 > 0),
                }
            : creando
              ? { texto: "Siguiente", onClick: () => void siguienteAlCrear(), cargando: guardarAccion.pending || preparando }
              : { texto: "Siguiente", onClick: () => mover(1) }
        }
      >
        <fieldset disabled={!puedeEditar} className="flex min-w-0 flex-col gap-6">
          <legend className="sr-only">{PASOS[indice]?.titulo}</legend>
          {contenidoDelPaso[paso]}
          {ultimo && limite && <AvisoLimiteDePlan mensaje={limite} />}
          {errorDeBienvenida && (
            <p role="alert" className="max-w-xl text-sm text-status-danger-fg">
              {errorDeBienvenida}
            </p>
          )}
        </fieldset>
      </RecorridoDelAgente>

      {publicado && (
        <section aria-labelledby="publicado-titulo" className="flex flex-col gap-3 rounded-md border border-border-soft p-5">
          <h2 id="publicado-titulo" className="font-display text-base font-semibold text-headline">
            Versión {publicado.version.version} publicada
          </h2>
          {creando && (
            <p className="text-sm text-body">
              Tu agente quedó creado. Actívalo en una conexión para que tus clientes hablen con él, o{" "}
              <Link href={`/agentes/${agente.id}`} className="text-link underline-offset-2 hover:underline">
                ve a su ficha
              </Link>
              .
            </p>
          )}
          {publicado.warnings.map((aviso) => (
            <p key={aviso} className="rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
              {aviso}
            </p>
          ))}
          <ul className="flex flex-col gap-3">
            {publicado.connections.map((c) => {
              const destino = destinos.find((d) => d.connection_id === c.connection_id);
              const nombre = destino?.label || destino?.channel || "la conexión";
              const yaActiva = activadas.has(c.connection_id) || destino?.active_release_id === c.release_id;
              return (
                <li key={c.connection_id} className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <span className="text-body">
                    <strong className="text-headline">{nombre}:</strong> {textoDeConexionPublicada(c)}
                  </span>
                  {c.release_id && !c.error && puedeActivar && !yaActiva && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={activarAccion.pending}
                      onClick={() => activar(c.connection_id, c.release_id as string, nombre)}
                    >
                      Activar en {nombre}
                    </Button>
                  )}
                  {yaActiva && <span className="text-status-success-fg">Activa</span>}
                  {c.release_id && !c.error && !puedeActivar && !yaActiva && (
                    <span className="text-text-soft">La activa el propietario del negocio.</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );

  if (!enBienvenida) return editor;
  // La bienvenida va a pantalla completa: el logo y «Seguir después» arriba (HU-UX-26).
  return <MarcoDeBienvenida extremo={seguirDespues()}>{editor}</MarcoDeBienvenida>;
}
