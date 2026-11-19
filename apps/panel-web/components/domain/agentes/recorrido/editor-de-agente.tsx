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
  conCuantoPregunta,
  conNivel,
  CUANTO_PREGUNTA,
  cuantoPreguntaActual,
  cuerpoParaGuardar,
  estadoInicial,
  METODOS_ENTREGA,
  restablecida,
  tipoDelAgente,
  type AgenteDatos,
  type CuantoPregunta,
  type EstadoDatos,
  type MetodoEntrega,
  type NivelDato,
} from "@/lib/datos-cliente";
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
import { SemaforoListo } from "@/components/domain/agentes/semaforo-listo";
import { agentMeta } from "@/components/domain/agent-icon";
import { AnilloDeListo, TarjetaDelEscenario } from "@/components/domain/agentes/recorrido/escenario-piezas";
import { EscenarioTarjeta } from "@/components/domain/agentes/recorrido/escenario-tarjeta";
import { ResumenDeEstaciones } from "@/components/domain/agentes/recorrido/resumen-de-estaciones";
import { ChatDeVistaPrevia } from "@/components/domain/agentes/recorrido/vista-previa-whatsapp";
import type { EstacionDeLaRuta } from "@/lib/ruta-de-lanzamiento";
import { semaforo } from "@/lib/listo-para-responder";
import { rutaDePersonalizar } from "@/lib/rutas-de-agente";
import type { HorarioDelAgente } from "@/lib/horario-del-agente";
import type { FormasDePago } from "@/lib/formas-de-pago";
import { componerGuion, conversacionDelGuion, estadosDeBloques, guionSugerido, mismoGuion } from "@/lib/guion-reglas";
import {
  conversacionDeHabilidad,
  conversacionDeVoz,
  respuestaDePrueba,
  saludoDePrueba,
  sugerenciasPorEstacion,
} from "@/lib/vista-previa";

/** Pasos del editor que hace la bienvenida (5 a 9 de sus 9): lo anterior es del negocio. */
// HU-AOS-81: la bienvenida también es la creación rápida (sus pasos 2 a 4 de 4).
const PASOS_DE_LA_BIENVENIDA: PasoId[] = ["habilidades", "conocimiento", "probar"];
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
  conocimiento: "¿Con qué datos probamos a {nombre}?",
  probar: "Revisa y publica a {nombre}",
};
/** La bienvenida (HU-AOS-81) sigue en 4 pasos con estos nombres hasta HU-UX-25. */
const EN_LA_CREACION: Partial<Record<PasoId, { titulo: string; corto: string }>> = {
  habilidades: { titulo: "Habilidades y formas de pago", corto: "Habilidades" },
  conocimiento: { titulo: "Datos para probar", corto: "Datos" },
  probar: { titulo: "Revisar, probar y publicar", corto: "Revisar" },
};
const PASO_UNO_DE_LA_CREACION = { id: "tipo", titulo: "Tipo", corto: "Tipo" };

/** «1 encendida», «3 encendidas»: las habilidades encendidas en el escenario de la ruta. */
function encendidasTexto(n: number): string {
  return `${n} ${n === 1 ? "encendida" : "encendidas"}`;
}

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
 * La bienvenida (HU-UX-23) usa el editor para sus pasos 5 a 9. Los cuatro primeros (Tu negocio, Identidad,
 * Cómo habla y Horario y reglas) escriben en el negocio y viven en `/bienvenida`: aquí se ven hechos en la
 * barra y volver a uno de ellos lo decide `volverA`.
 */
export type BienvenidaDelEditor = {
  /** Los cuatro pasos del negocio, para la barra de 9 (ids propios, distintos de los del editor). */
  pasosDelNegocio: PasoDeLaBarra[];
  /** Vuelve a uno de los pasos del negocio (1 a 4). */
  volverA: (numero: number) => void;
  /** Guarda en el recorrido el paso (1 a 9) al que se llega. */
  avanzar: (numero: number) => void;
  /** Vuelve a dejar el agente listo antes de «Pruébalo», con lo último configurado. Devuelve el error, si hubo. */
  prepararPrueba: () => Promise<string | null>;
  /** El chat de prueba de la bienvenida. */
  prueba: ReactNode;
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
  formasDePago = null,
  semillaDelFlujo = null,
  horarioDelAgente = null,
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
  /** Formas de pago del agente (SPEC-48, HU-COM-21); `null` si el agente no tiene Comercio. */
  formasDePago?: FormasDePago | null;
  /** Semilla del flujo de sus habilidades, para «Restaurar guion sugerido» (HU-COM-25). */
  semillaDelFlujo?: FlujoDelAgente | null;
  /** Horario propio del agente (HU-AOS-82); `null` si no se pudo leer. */
  horarioDelAgente?: HorarioDelAgente | null;
  /** Flujo del agente (ADR-0195, HU-AOS-76); si la API no responde, se abre vacío. */
  flujoInicial?: FlujoDelAgente;
  flujoSeeded?: boolean;
  accionesDelFlujo?: AccionDelFlujo[];
  negocio?: NegocioDelEditor;
  /** El modelo con el que atenderá (HU-AOS-79), solo para mostrarlo en Publicar. */
  modeloEfectivo?: { nombre: string; origen: "negocio" | "agente" } | null;
  /** Sin permiso de escritura: se ve todo, sin guardar ni publicar. */
  puedeEditar?: boolean;
  /** `crear`: continuación de Nuevo agente (pasos en orden, «Siguiente» guarda). `bienvenida`: pasos 5 a 9 del primer uso. */
  modo?: "crear" | "editar" | "bienvenida";
  bienvenida?: BienvenidaDelEditor;
}) {
  // Crear y la bienvenida van en orden y «Siguiente» guarda; la bienvenida además vive fuera del shell.
  const creando = modo !== "editar";
  const enBienvenida = modo === "bienvenida" && bienvenida !== undefined;
  // HU-AOS-81: «crear» es la creación rápida de 4 pasos; la edición sigue libre con los 8.
  const creacionRapida = modo === "crear";
  // Los pasos de la creación rápida (nombres y contenido corto) valen también en la bienvenida.
  const comoCreacionRapida = creacionRapida || enBienvenida;
  const [preparando, setPreparando] = useState(false);
  const [errorDeBienvenida, setErrorDeBienvenida] = useState<string | null>(null);
  const confirm = useConfirm();
  const guardarAccion = useAction({ refresh: false });
  const publicarAccion = useAction({ refresh: false });
  const activarAccion = useAction();
  const datosAccion = useAction({ refresh: false });

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

  function cambiarMetodo(metodo: MetodoEntrega, activo: boolean) {
    setMetodos((actual) => {
      if (activo) return METODOS_ENTREGA.map((m) => m.id).filter((id) => id === metodo || actual.includes(id));
      return actual.length === 1 ? actual : actual.filter((id) => id !== metodo);
    });
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
    // Al crear solo se ven las 4 estaciones del editor: lo de otro paso se avisa en «Revisar y publicar».
    irA(creacionRapida && !PASOS_DE_LA_CREACION.includes(destino) ? "probar" : destino);
  }

  function irA(id: PasoId) {
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
  async function guardarCambios(): Promise<boolean> {
    const completo = plegarPendientes();
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
    const completo = plegarPendientes();
    if (!completo) return;
    const propios = validar(paso, completo);
    setErrores(propios);
    if (Object.keys(propios).length > 0) return;
    if (!(await guardarCambios())) return;
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

  // «Datos del cliente»: paso propio en Personalizar (HU-AOS-85) y estación 3 de Nuevo agente (HU-AOS-86);
  // en la bienvenida sigue como sección de Habilidades hasta HU-UX-25.
  const datosComoPaso = modo !== "bienvenida";
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
      onGuardar={datosComoPaso ? undefined : () => void guardarDatos()}
      onCuantoPregunta={elegirCuantoPregunta}
      onUsarRecomendado={usarDatosRecomendados}
      comoPaso={datosComoPaso}
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
      if (!datosCliente) return "Sin cargar";
      const preset = cuantoPreguntaActual(datosCliente, datos);
      return preset ? `«${CUANTO_PREGUNTA.find((c) => c.id === preset)?.titulo ?? preset}»` : "A tu medida";
    }
    if (id === "conocimiento") {
      return cargados.length > 0 ? `${cargados.length} ${cargados.length === 1 ? "registro cargado" : "registros cargados"}` : "Sin datos de prueba";
    }
    return "";
  }
  // Errores de pasos que la ruta no muestra (voz, flujo…): se avisan en la estación 5 con un enlace.
  const fueraDeLaRuta = creacionRapida
    ? [...new Set(Object.keys(errores).map(pasoDelCampo))].filter((p) => p !== "publicar" && !PASOS_DE_LA_CREACION.includes(p))
    : [];

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
    ),
    habilidades: (
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
        {!datosComoPaso && (
          <section aria-labelledby="habilidades-datos" className="flex flex-col gap-4">
            <h3 id="habilidades-datos" className="font-display text-sh-block text-headline">
              Datos del cliente
            </h3>
            {datosDelCliente}
          </section>
        )}
      </div>
    ),
    "datos-cliente": datosDelCliente,
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
              onSeguirSinDatos={creacionRapida ? () => void siguienteAlCrear() : undefined}
            />
          )}
        </section>
      </div>
    ),
    probar: enBienvenida ? (
      <div className="flex flex-col gap-6">
        <SemaforoListo
          semaforo={semaforo({
            requisitos,
            formas,
            superpoderesActivos: Object.values(estado.superpoderes).filter((p) => p.activo).length,
            conDatos: cargados.length > 0,
          })}
        />
        {bienvenida.prueba}
        {!bienvenida.probado && (
          <p role="status" className="rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg">
            Para terminar, escríbele al menos un mensaje a tu agente aquí.
          </p>
        )}
        <p className="text-sm text-text-soft">
          Tu agente queda listo en tu chat de pruebas, cerrado al público. Cómo habla, su horario y su flujo los ajustas
          después en Personalizar; cuando conectes tu WhatsApp, lo activas desde Conexiones.
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
  const tipoDelChat = tipoDelAgente(agente.key, datosCliente);
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

  // Los datos del cliente marcan su propio paso; donde todavía son sección de Habilidades, marcan ese.
  const conCambios = pasosConCambios(estado, guardado, { datosCliente: datosSinGuardar && datosComoPaso });
  if (datosSinGuardar && !datosComoPaso) conCambios.add("habilidades");
  const conError = new Set(Object.keys(errores).map(pasoDelCampo));
  const visibles = enBienvenida
    ? PASOS.filter((p) => PASOS_DE_LA_BIENVENIDA.includes(p.id))
    : creacionRapida
      ? PASOS.filter((p) => PASOS_DE_LA_CREACION.includes(p.id))
      : PASOS;
  const pasosDelEditor: PasoDeLaBarra[] = visibles.map(
    (p) => ({
      id: p.id,
      titulo: (creacionRapida ? EN_LA_RUTA[p.id]?.titulo : enBienvenida && EN_LA_CREACION[p.id]?.titulo) || p.titulo,
      corto: (creacionRapida ? EN_LA_RUTA[p.id]?.corto : enBienvenida && EN_LA_CREACION[p.id]?.corto) || p.corto,
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

  // Ruta de lanzamiento (HU-AOS-86): la estación siguiente, la pregunta y el escenario en tarjeta.
  const siguienteDeLaRuta = creacionRapida ? PASOS_DE_LA_CREACION[PASOS_DE_LA_CREACION.indexOf(paso) + 1] : undefined;
  const tituloSiguiente = siguienteDeLaRuta ? (EN_LA_RUTA[siguienteDeLaRuta]?.titulo ?? "") : "";
  const nombreVisible = estado.nombre.trim();
  const estacionDelChat = ESTACION_DEL_PASO[paso];
  const hechasDeLaRuta = 1 + Math.max(0, PASOS_DE_LA_CREACION.indexOf(paso));
  const escenario = creacionRapida ? (
    <EscenarioTarjeta agente={nombreVisible} estado={`Borrador · ${agentMeta(agente.key, agente.name).label}`} leyenda="Vista previa: no envía mensajes">
      {paso === "probar" ? (
        <div className="flex items-center gap-4">
          <AnilloDeListo hechas={hechasDeLaRuta} total={PASOS_DE_LA_CREACION.length + 1} />
          <p className="text-sm text-escena-texto">
            {destinos.length > 0 ? "Ya se puede publicar. Te sugerimos una última prueba antes." : "Falta una conexión donde atienda."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <TarjetaDelEscenario
            etiqueta="Habilidades"
            valor={encendidasTexto(superpoderes.filter((p) => estado.superpoderes[p.id]?.activo).length)}
            hecha={PASOS_DE_LA_CREACION.indexOf(paso) >= 0}
          />
          <TarjetaDelEscenario
            etiqueta="Datos del cliente"
            valor={paso === "habilidades" ? "En la estación 3" : resumenDeEstacion("datos-cliente")}
            hecha={PASOS_DE_LA_CREACION.indexOf(paso) >= 1}
          />
        </div>
      )}
      {tipoDelChat && estacionDelChat && (
        <ChatDeVistaPrevia
          key={`${nombreVisible}:${cargados.length}`}
          tipo={tipoDelChat}
          estacion={estacionDelChat}
          agente={nombreVisible || "tu agente"}
          negocio={negocio.nombre}
          cargados={cargados}
        />
      )}
    </EscenarioTarjeta>
  ) : undefined;

  return (
    <div className="flex flex-col gap-6">
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
        pregunta={creacionRapida && PREGUNTA_EN_LA_RUTA[paso] ? PREGUNTA_EN_LA_RUTA[paso].replace("{nombre}", nombreVisible || "tu agente") : preguntaDelPaso(paso, estado.nombre)}
        nivelDePregunta={enBienvenida || creacionRapida ? "h1" : "h2"}
        disposicion={creacionRapida ? "ruta" : "pasos"}
        lateral={escenario}
        queSigue={creacionRapida ? (tituloSiguiente ? `Sigue: ${tituloSiguiente}.` : undefined) : undefined}
        extremo={
          creacionRapida ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/agentes/${agente.id}`}>Terminar después</Link>
            </Button>
          ) : undefined
        }
        dentroDelPanel={!enBienvenida}
        vistaPrevia={vistaPrevia}
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
                texto: "Terminar",
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
            : creacionRapida
              ? {
                  texto: `Guardar y seguir: ${tituloSiguiente}`,
                  onClick: () => void siguienteAlCrear(),
                  cargando: guardarAccion.pending || datosAccion.pending,
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
}
