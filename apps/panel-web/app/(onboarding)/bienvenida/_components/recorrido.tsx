"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { ResultadoConPlan } from "@/components/domain/aviso-limite-de-plan";
import { BarraRecomendado } from "@/components/domain/agentes/recorrido/barra-recomendado";
import { CelularDeVistaPrevia } from "@/components/domain/agentes/recorrido/celular-de-vista-previa";
import { MarcoDeBienvenida } from "@/components/domain/agentes/recorrido/marco-de-bienvenida";
import { textoDeFaltan } from "@/components/domain/agentes/recorrido/pregunta-del-recorrido";
import { RecorridoDelAgente } from "@/components/domain/agentes/recorrido/recorrido-del-agente";
import type { IdentitySettings } from "@/lib/api/types";
import { crearYDejarListo } from "@/lib/onboarding-agente";
import {
  ESTADO_INICIAL,
  PARTES_DEL_PASO_1,
  PASOS,
  PASOS_DEL_NEGOCIO,
  TIPO_RECOMENDADO,
  TIPOS_DE_NEGOCIO,
  cambiosDelPaso,
  conLoRecomendado,
  conTipo,
  errorDelPaso,
  estadoDesdeIdentidad,
  fraseDelTipo,
  pasoDeCinco,
  type EstadoDelAsistente,
  type Recorrido,
  type TipoDeNegocio,
} from "@/lib/onboarding";
import { ESTACIONES_DE_LA_BIENVENIDA, cambiosFrenteARecomendado } from "@/lib/ruta-de-lanzamiento";

import { PREGUNTAS_DE_LA_BIENVENIDA, PasoNegocio } from "./paso-negocio";
import { SeguirDespues } from "./seguir-despues";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

async function post<T>(url: string, cuerpo?: unknown): Promise<Resultado<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo ?? {}),
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      return { ok: false, status: res.status, error: typeof json.error === "string" ? json.error : "Algo salió mal. Inténtalo de nuevo." };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, status: 0, error: "No se pudo contactar el servidor." };
  }
}

const BORRADOR = (negocioId: string) => `sh-onboarding:${negocioId}`;

/**
 * Lo de la estación 1 que todavía no está en el servidor (el tipo vive solo aquí hasta crear el agente), con la
 * pregunta abierta para retomar donde quedó (HU-UX-27).
 */
type Borrador = Partial<Pick<EstadoDelAsistente, "tipo" | "negocio" | "descripcion" | "nombreDelAgente" | "tono" | "largo">> & {
  abierta?: number;
};

function leerBorrador(negocioId: string): Borrador {
  try {
    const crudo = window.localStorage.getItem(BORRADOR(negocioId));
    return crudo ? (JSON.parse(crudo) as Borrador) : {};
  } catch {
    return {};
  }
}

function guardarBorrador(negocioId: string, estado: EstadoDelAsistente, abierta: number) {
  try {
    const borrador: Borrador = {
      tipo: estado.tipo,
      negocio: estado.negocio,
      descripcion: estado.descripcion,
      nombreDelAgente: estado.nombreDelAgente,
      tono: estado.tono,
      largo: estado.largo,
      abierta,
    };
    window.localStorage.setItem(BORRADOR(negocioId), JSON.stringify(borrador));
  } catch {
    // Sin almacenamiento el recorrido sigue: solo no recuerda lo de esta estación si se recarga.
  }
}

type Props = {
  negocioId: string;
  nombreDelNegocio: string;
  recorridoInicial: Recorrido;
  identidad: IdentitySettings;
  disponibles: TipoDeNegocio[] | null;
  /** Habilidades que se activarán al crear el agente de cada tipo (las que el negocio aún no tiene). */
  habilitara: Partial<Record<TipoDeNegocio, string[]>>;
  /** El tipo del agente ya creado (volvió a «Tu negocio»): manda sobre el borrador y no se cambia. */
  tipoDelAgente?: TipoDeNegocio | null;
};

const nunca = () => () => {};

/**
 * Espera a estar en el navegador para leer el borrador local (tipo de negocio y nombre, que no viven en el
 * servidor); así el primer pintado del servidor y el del cliente coinciden.
 */
export function RecorridoDeBienvenida(props: Props) {
  const enNavegador = useSyncExternalStore(nunca, () => true, () => false);
  if (!enNavegador) return <div className="min-h-screen" aria-busy="true" />;
  return <Asistente {...props} borrador={leerBorrador(props.negocioId)} />;
}

/**
 * Lo que se compara con lo recomendado en la estación 1: el tipo, el nombre y, en «Opciones avanzadas», el largo,
 * el tono y la frase. La frase cuenta como recomendada mientras sea la sugerida de su tipo: cambiar el tipo es un
 * cambio, no dos.
 */
function valoresDe(estado: EstadoDelAsistente) {
  const sugerida = estado.descripcion === fraseDelTipo(estado.tipo);
  return {
    tipo: estado.tipo,
    nombre: estado.nombreDelAgente.trim(),
    largo: estado.largo,
    tono: estado.tono,
    frase: sugerida ? "sugerida" : estado.descripcion,
  };
}

const TOTAL_DE_PREGUNTAS = PREGUNTAS_DE_LA_BIENVENIDA.length;

/**
 * Bienvenida de primer uso, estación 1 de 5: «Tu negocio» (HU-UX-25 y HU-UX-27, tablero `E1-E-bienvenida`). Pantalla
 * completa con el logo arriba y el celular a la derecha (HU-UX-26); tres preguntas, una a la vez, que llegan con lo
 * recomendado (Vendo productos, «Laura», el nombre del negocio del alta y, en «Opciones avanzadas», el largo, el
 * tono y la frase del tipo). Escribe en la identidad del negocio. Al seguir se crea el agente y se deja listo para probar, y la bienvenida
 * sigue con el editor del agente (`/bienvenida/agente/[id]`, estaciones 2 a 5).
 */
function Asistente({
  negocioId,
  nombreDelNegocio,
  recorridoInicial,
  identidad,
  disponibles,
  habilitara,
  tipoDelAgente = null,
  borrador,
}: Props & { borrador: Borrador }) {
  const router = useRouter();
  const [recorrido, setRecorrido] = useState<Recorrido>(recorridoInicial);
  // Lo recomendado por SolversHub, con el primer tipo que el servicio trae si el recomendado no está.
  // Con el agente ya creado manda su tipo (no cambia después de crearlo); lo recomendado es lo de ese tipo.
  const tipoInicial: TipoDeNegocio =
    tipoDelAgente ??
    (!disponibles || disponibles.includes(TIPO_RECOMENDADO) ? TIPO_RECOMENDADO : (disponibles[0] ?? TIPO_RECOMENDADO));
  const recomendado = useMemo(
    () => conLoRecomendado({ ...ESTADO_INICIAL, negocio: nombreDelNegocio }, tipoInicial),
    [nombreDelNegocio, tipoInicial],
  );
  const [estado, setEstado] = useState<EstadoDelAsistente>(() => {
    const base = estadoDesdeIdentidad(identidad, recomendado);
    // El alta pone el nombre del negocio como nombre del asistente: no es una elección, va el sugerido.
    const nombreElegido =
      base.nombreDelAgente.trim() === nombreDelNegocio.trim() ? recomendado.nombreDelAgente : base.nombreDelAgente;
    // La identidad guarda «negocio. frase»; al retomar se muestra la frase sola.
    const descripcion = base.descripcion.startsWith(`${nombreDelNegocio.trim()}. `)
      ? base.descripcion.slice(nombreDelNegocio.trim().length + 2)
      : base.descripcion;
    const tipo =
      tipoDelAgente ?? (borrador.tipo && (!disponibles || disponibles.includes(borrador.tipo)) ? borrador.tipo : base.tipo);
    return {
      ...base,
      tipo,
      tono: borrador.tono ?? base.tono,
      largo: borrador.largo ?? base.largo,
      nombreDelAgente: borrador.nombreDelAgente ?? nombreElegido,
      descripcion: borrador.descripcion ?? (tipo !== base.tipo && descripcion === fraseDelTipo(base.tipo) ? fraseDelTipo(tipo) : descripcion),
      negocio: borrador.negocio ?? nombreDelNegocio,
    };
  });
  // La pregunta abierta: con el agente ya creado (volvió a «Tu negocio») llegan todas respondidas.
  const [abierta, setAbierta] = useState(() =>
    recorridoInicial.agente_id ? TOTAL_DE_PREGUNTAS : Math.min(Math.max(borrador.abierta ?? 0, 0), TOTAL_DE_PREGUNTAS),
  );
  const [avanzadasAbiertas, setAvanzadasAbiertas] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  // El error con su `code`: el 409 del plan al crear el agente (HU-BILL-19) sale con «Mejorar mi plan».
  const [error, setError] = useState<{ error: string; code?: string } | null>(null);

  // Marca el recorrido como empezado (o retomado, si estaba saltado).
  useEffect(() => {
    if (recorridoInicial.estado !== "en_curso") {
      // Sin retroceder: quien omitió en una estación posterior y vuelve por «Cambiar nombre» conserva dónde iba.
      const paso = Math.max(PASOS_DEL_NEGOCIO, pasoDeCinco(recorridoInicial));
      void post<Recorrido>("/api/onboarding/avanzar", { paso }).then((r) => {
        if (r.ok) setRecorrido(r.data);
      });
    }
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiar = useCallback(
    (cambios: Partial<EstadoDelAsistente>) => {
      setError(null);
      setEstado((e) => {
        const nuevo = { ...e, ...cambios };
        guardarBorrador(negocioId, nuevo, abierta);
        return nuevo;
      });
    },
    [negocioId, abierta],
  );

  function elegirTipo(tipo: TipoDeNegocio) {
    setError(null);
    setEstado((e) => {
      const nuevo = conTipo(e, tipo);
      guardarBorrador(negocioId, nuevo, abierta);
      return nuevo;
    });
  }

  function abrir(indice: number) {
    setError(null);
    setAbierta(indice);
    guardarBorrador(negocioId, estado, indice);
  }

  function usarLoRecomendado() {
    cambiar({
      tipo: recomendado.tipo,
      nombreDelAgente: recomendado.nombreDelAgente,
      descripcion: recomendado.descripcion,
      largo: recomendado.largo,
      tono: recomendado.tono,
    });
  }

  /**
   * «Seguir después» en esta estación: si lo escrito ya es válido, se guarda en la identidad del negocio (lo que
   * lleva queda guardado también fuera de este navegador); si no, queda solo en el borrador local.
   */
  async function guardarAlSalir(): Promise<boolean> {
    if (PARTES_DEL_PASO_1.some((id) => errorDelPaso(id, estado))) return true;
    const cambios = Object.assign({}, ...PARTES_DEL_PASO_1.map((id) => cambiosDelPaso(id, estado)));
    if (Object.keys(cambios).length === 0) return true;
    const guardado = await post("/api/onboarding/identidad", { cambios });
    if (!guardado.ok) setError({ error: guardado.error });
    return guardado.ok;
  }

  async function siguiente() {
    // HU-AOS-81: el paso 1 junta los datos del negocio y la identidad del agente.
    const problema = PARTES_DEL_PASO_1.map((id) => errorDelPaso(id, estado)).find(Boolean);
    if (problema) {
      setError({ error: problema });
      // La frase vive en «Opciones avanzadas»: se abre para que el dueño vea dónde corregir.
      if (estado.tipo && estado.negocio.trim() && estado.nombreDelAgente.trim()) setAvanzadasAbiertas(true);
      return;
    }
    setOcupado(true);
    setError(null);
    const cambios = Object.assign({}, ...PARTES_DEL_PASO_1.map((id) => cambiosDelPaso(id, estado)));
    if (Object.keys(cambios).length > 0) {
      const guardado = await post("/api/onboarding/identidad", { cambios });
      if (!guardado.ok) {
        setOcupado(false);
        setError({ error: guardado.error });
        return;
      }
    }
    // Al salir de la estación 1 nace el agente y queda listo para probar; sigue «Habilidades».
    const creado = await crearYDejarListo(estado, recorrido.agente_id ?? null);
    if (!creado.ok) {
      setOcupado(false);
      setError(creado);
      return;
    }
    // Sigue en «Habilidades», o donde iba si volvió desde una estación posterior («Cambiar nombre», «Editar»).
    await post<Recorrido>("/api/onboarding/avanzar", { paso: destino });
    router.push(`/bienvenida/agente/${creado.agenteId}`);
  }

  // La estación a la que se sigue: «Habilidades», o donde iba si volvió desde una posterior.
  const destino = Math.max(PASOS_DEL_NEGOCIO + 1, pasoDeCinco(recorrido));
  const nombre = estado.nombreDelAgente.trim();
  const negocio = estado.negocio.trim();
  const tipo = TIPOS_DE_NEGOCIO.find((t) => t.id === estado.tipo);
  const cambios = cambiosFrenteARecomendado(valoresDe(estado), valoresDe(recomendado));

  // Cuántas preguntas faltan va en el pie; el chat simulado, en el celular (D-SPEC-49-4). Mientras falten, no se crea.
  const faltan = TOTAL_DE_PREGUNTAS - abierta;
  return (
    <MarcoDeBienvenida extremo={<SeguirDespues nombreDelAgente={nombre} guardar={guardarAlSalir} ocupado={ocupado} />}>
      <RecorridoDelAgente
        disposicion="ruta"
        pasos={ESTACIONES_DE_LA_BIENVENIDA}
        actual="negocio"
        modo="en-orden"
        etiquetaDePasos="Estaciones de la bienvenida"
        pregunta="Arma a tu primer agente"
        bajada="Tres preguntas. Lo demás viene recomendado por SolversHub."
        queSigue={error ? "Completa lo que falta arriba para seguir." : `Sigue: ${PASOS[destino - 1].corto}.`}
        estado={faltan > 0 ? textoDeFaltan(faltan) : undefined}
        celular={
          <CelularDeVistaPrevia
            tipo={tipo?.id}
            estacion="negocio"
            // Sin nombre, el chat dice «Hola, soy tu agente» (no «Tu agente», que es para el inicio de frase).
            agente={nombre}
            negocio={negocio || nombreDelNegocio}
          />
        }
        principal={{
          // Con el agente ya creado no se crea otro: se guarda y se retoma donde iba.
          texto: recorrido.agente_id ? "Guardar y seguir" : nombre ? `Crear a ${nombre} y seguir` : "Crear mi agente y seguir",
          onClick: () => void siguiente(),
          cargando: ocupado,
          deshabilitado: faltan > 0,
        }}
      >
        <BarraRecomendado
          cambios={cambios.length}
          onUsar={usarLoRecomendado}
        />
        <PasoNegocio
          estado={estado}
          onCambiar={cambiar}
          onTipo={elegirTipo}
          disponibles={disponibles ? new Set(disponibles) : null}
          tipoFijo={tipoDelAgente}
          habilitara={habilitara}
          abierta={abierta}
          onAbrir={abrir}
          avanzadasAbiertas={avanzadasAbiertas}
        />
        <ResultadoConPlan error={error?.error} code={error?.code} className="max-w-xl" />
      </RecorridoDelAgente>
    </MarcoDeBienvenida>
  );
}
