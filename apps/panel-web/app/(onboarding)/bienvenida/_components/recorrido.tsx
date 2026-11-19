"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { BarraRecomendado } from "@/components/domain/agentes/recorrido/barra-recomendado";
import { AnilloDeListo, PildoraDelAgente, TarjetaDelEscenario } from "@/components/domain/agentes/recorrido/escenario-piezas";
import { MarcoDeBienvenida } from "@/components/domain/agentes/recorrido/marco-de-bienvenida";
import { RecorridoDelAgente } from "@/components/domain/agentes/recorrido/recorrido-del-agente";
import { ChatDeVistaPrevia } from "@/components/domain/agentes/recorrido/vista-previa-whatsapp";
import { FormFeedback } from "@/components/ui/form-feedback";
import type { IdentitySettings } from "@/lib/api/types";
import { crearYDejarListo } from "@/lib/onboarding-agente";
import {
  DESCRIPCION_MIN,
  ESTADO_INICIAL,
  NOMBRE_SUGERIDO_DE_LA_BIENVENIDA,
  PARTES_DEL_PASO_1,
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

import { PasoNegocio } from "./paso-negocio";
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

/** Lo de la estación 1 que todavía no está en el servidor (el tipo vive solo aquí hasta crear el agente). */
type Borrador = Partial<Pick<EstadoDelAsistente, "tipo" | "negocio" | "descripcion" | "nombreDelAgente">>;

function leerBorrador(negocioId: string): Borrador {
  try {
    const crudo = window.localStorage.getItem(BORRADOR(negocioId));
    return crudo ? (JSON.parse(crudo) as Borrador) : {};
  } catch {
    return {};
  }
}

function guardarBorrador(negocioId: string, estado: EstadoDelAsistente) {
  try {
    const borrador: Borrador = {
      tipo: estado.tipo,
      negocio: estado.negocio,
      descripcion: estado.descripcion,
      nombreDelAgente: estado.nombreDelAgente,
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
 * Lo que se compara con lo recomendado en la estación 1 (el tablero `rb1`): el tipo, el nombre y la frase. La
 * frase cuenta como recomendada mientras sea la sugerida de su tipo: cambiar el tipo es un cambio, no dos.
 */
function valoresDe(estado: EstadoDelAsistente) {
  const sugerida = estado.descripcion === fraseDelTipo(estado.tipo);
  return { tipo: estado.tipo, nombre: estado.nombreDelAgente.trim(), frase: sugerida ? "sugerida" : estado.descripcion };
}

/** «a», «a y b», «a, b y c». */
function enLista(partes: string[]): string {
  return partes.length < 2 ? partes.join("") : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

/** La frase recortada para la tarjeta del escenario. */
function corta(frase: string): string {
  const limpia = frase.trim();
  return limpia.length > 44 ? `${limpia.slice(0, 42).trim()}…` : limpia;
}

/**
 * Bienvenida de primer uso, estación 1 de 5: «Tu negocio» (HU-UX-25, SPEC-49, tablero `rb1`). Pantalla completa
 * con el escenario a la izquierda; llega con lo recomendado (Vendo productos, «Laura» y la frase del tipo) y
 * escribe en la identidad del negocio. Al seguir se crea el agente y se deja listo para probar, y la bienvenida
 * sigue con el editor del agente (`/bienvenida/agente/[id]`, estaciones 2 a 5).
 */
function Asistente({
  negocioId,
  nombreDelNegocio,
  recorridoInicial,
  identidad,
  disponibles,
  habilitara,
  borrador,
}: Props & { borrador: Borrador }) {
  const router = useRouter();
  const [recorrido, setRecorrido] = useState<Recorrido>(recorridoInicial);
  // Lo recomendado por SolversHub, con el primer tipo que el servicio trae si el recomendado no está.
  const tipoInicial: TipoDeNegocio =
    !disponibles || disponibles.includes(TIPO_RECOMENDADO) ? TIPO_RECOMENDADO : (disponibles[0] ?? TIPO_RECOMENDADO);
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
    const tipo = borrador.tipo && (!disponibles || disponibles.includes(borrador.tipo)) ? borrador.tipo : base.tipo;
    return {
      ...base,
      tipo,
      nombreDelAgente: borrador.nombreDelAgente ?? nombreElegido,
      descripcion: borrador.descripcion ?? (tipo !== base.tipo && descripcion === fraseDelTipo(base.tipo) ? fraseDelTipo(tipo) : descripcion),
      negocio: borrador.negocio ?? nombreDelNegocio,
    };
  });
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Marca el recorrido como empezado (o retomado, si estaba saltado).
  useEffect(() => {
    if (recorridoInicial.estado !== "en_curso") {
      void post<Recorrido>("/api/onboarding/avanzar", { paso: PASOS_DEL_NEGOCIO }).then((r) => {
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
        guardarBorrador(negocioId, nuevo);
        return nuevo;
      });
    },
    [negocioId],
  );

  function elegirTipo(tipo: TipoDeNegocio) {
    setError(null);
    setEstado((e) => {
      const nuevo = conTipo(e, tipo);
      guardarBorrador(negocioId, nuevo);
      return nuevo;
    });
  }

  function usarLoRecomendado() {
    cambiar({ tipo: recomendado.tipo, nombreDelAgente: recomendado.nombreDelAgente, descripcion: recomendado.descripcion });
  }

  async function siguiente() {
    // HU-AOS-81: el paso 1 junta los datos del negocio y la identidad del agente.
    const problema = PARTES_DEL_PASO_1.map((id) => errorDelPaso(id, estado)).find(Boolean);
    if (problema) {
      setError(problema);
      return;
    }
    setOcupado(true);
    setError(null);
    const cambios = Object.assign({}, ...PARTES_DEL_PASO_1.map((id) => cambiosDelPaso(id, estado)));
    if (Object.keys(cambios).length > 0) {
      const guardado = await post("/api/onboarding/identidad", { cambios });
      if (!guardado.ok) {
        setOcupado(false);
        setError(guardado.error);
        return;
      }
    }
    // Al salir de la estación 1 nace el agente y queda listo para probar; sigue «Habilidades».
    const creado = await crearYDejarListo(estado, recorrido.agente_id ?? null);
    if (!creado.ok) {
      setOcupado(false);
      setError(creado.error);
      return;
    }
    // Sigue en «Habilidades», o donde iba si volvió desde una estación posterior («Cambiar nombre», «Editar»).
    await post<Recorrido>("/api/onboarding/avanzar", { paso: Math.max(PASOS_DEL_NEGOCIO + 1, pasoDeCinco(recorrido)) });
    router.push(`/bienvenida/agente/${creado.agenteId}`);
  }

  const nombre = estado.nombreDelAgente.trim();
  const quien = nombre || "Tu agente";
  const negocio = estado.negocio.trim();
  const tipo = TIPOS_DE_NEGOCIO.find((t) => t.id === estado.tipo);
  const cambios = cambiosFrenteARecomendado(valoresDe(estado), valoresDe(recomendado));
  const tieneFrase = estado.descripcion.trim().length >= DESCRIPCION_MIN;

  // El escenario: lo que el agente ya sabe del negocio (n/4) y su chat simulado (D-SPEC-49-4).
  const sabe = [Boolean(nombre), Boolean(negocio), Boolean(tipo), tieneFrase].filter(Boolean).length;
  const faltan = [
    !nombre && "su nombre",
    !negocio && "el nombre del negocio",
    !tipo && "a qué se dedica",
    !tieneFrase && "cómo presentarse",
  ].filter((x): x is string => Boolean(x));
  const completo = faltan.length === 0;
  const seguirDespues = (enEscenario: boolean) => (
    <SeguirDespues nombreDelAgente={quien} ocupado={ocupado} enEscenario={enEscenario} />
  );

  return (
    <MarcoDeBienvenida
      extremo={seguirDespues(true)}
      escenario={{
        agente: quien,
        titulo: completo ? `${quien} ya puede saludar` : `${quien} ya sabe ${sabe} de 4 cosas`,
        bajada: completo
          ? cambios.length === 0
            ? "Con lo recomendado por SolversHub."
            : "Sabe quién es, a qué se dedica y cómo presentarse."
          : `Falta ${enLista(faltan)}.`,
        bajadaCorta: completo ? "Sabe quién es y cómo presentarse." : `Falta ${enLista(faltan)}.`,
        destacado: <AnilloDeListo hechas={sabe} total={4} />,
        children: (
          <>
            <PildoraDelAgente
              nombre={nombre || "Sin nombre"}
              etiqueta={nombre === NOMBRE_SUGERIDO_DE_LA_BIENVENIDA ? "Sugerido" : undefined}
              className="self-start"
            />
            <div className="grid grid-cols-3 gap-2">
              <TarjetaDelEscenario etiqueta="Negocio" valor={negocio || "Falta el nombre"} hecha={Boolean(negocio)} />
              <TarjetaDelEscenario etiqueta="Se dedica a" valor={tipo?.titulo ?? "Elige un tipo"} hecha={Boolean(tipo)} />
              <TarjetaDelEscenario etiqueta="Se presenta así" valor={tieneFrase ? corta(estado.descripcion) : "Falta la frase"} hecha={tieneFrase} />
            </div>
            {tipo && (
              <ChatDeVistaPrevia
                key={`${tipo.id}:${quien}:${negocio}`}
                tipo={tipo.id}
                estacion="negocio"
                agente={quien}
                negocio={negocio || nombreDelNegocio}
                className="min-h-0 flex-1"
              />
            )}
          </>
        ),
      }}
    >
      <RecorridoDelAgente
        disposicion="ruta"
        pasos={ESTACIONES_DE_LA_BIENVENIDA}
        actual="negocio"
        modo="en-orden"
        etiquetaDePasos="Estaciones de la bienvenida"
        pregunta="Cuéntanos de tu negocio"
        bajada={`Con esto ${quien} sabe quién es y cómo presentarse en su primera conversación.`}
        queSigue={error ? "Completa lo que falta arriba para seguir." : "Sigue: Habilidades."}
        extremo={<div className="hidden lg:block">{seguirDespues(false)}</div>}
        principal={{
          texto: nombre ? `Crear a ${nombre} y seguir` : "Crear mi agente y seguir",
          onClick: () => void siguiente(),
          cargando: ocupado,
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
          habilitara={habilitara}
        />
        <FormFeedback error={error ?? undefined} className="max-w-xl" />
      </RecorridoDelAgente>
    </MarcoDeBienvenida>
  );
}
