"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { RecorridoDelAgente } from "@/components/domain/agentes/recorrido/recorrido-del-agente";
import { FormFeedback } from "@/components/ui/form-feedback";
import type { IdentitySettings } from "@/lib/api/types";
import { crearYDejarListo } from "@/lib/onboarding-agente";
import {
  ESTADO_INICIAL,
  PASOS,
  PASOS_DEL_NEGOCIO,
  cambiosDelPaso,
  errorDelPaso,
  estadoDesdeIdentidad,
  type EstadoDelAsistente,
  type Recorrido,
  type TipoDeNegocio,
} from "@/lib/onboarding";
import { conversacionDeVoz } from "@/lib/vista-previa";

import { CabeceraDeBienvenida } from "./cabecera";
import { PasoIdentidad } from "./paso-identidad";
import { PasoNegocio } from "./paso-negocio";
import { PasoReglas } from "./paso-reglas";
import { PasoVoz } from "./paso-voz";

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

type Borrador = Partial<Pick<EstadoDelAsistente, "tipo" | "negocio">>;

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
    window.localStorage.setItem(BORRADOR(negocioId), JSON.stringify({ tipo: estado.tipo, negocio: estado.negocio }));
  } catch {
    // Sin almacenamiento el recorrido sigue: solo no recuerda el tipo si se recarga.
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
  /** `?paso=` al volver desde el editor del agente (pasos 1 a 4). */
  pasoPedido?: number;
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
 * Bienvenida de primer uso (HU-UX-21, HU-UX-23): los cuatro primeros de sus 9 pasos, que escriben en la
 * identidad del negocio. Cada «Siguiente» guarda; al salir de «Horario y reglas» se crea el agente y se deja
 * listo para probar, y la bienvenida sigue con el editor del agente (`/bienvenida/agente/[id]`).
 */
function Asistente({
  negocioId,
  nombreDelNegocio,
  recorridoInicial,
  identidad,
  disponibles,
  habilitara,
  pasoPedido,
  borrador,
}: Props & { borrador: Borrador }) {
  const router = useRouter();
  const [recorrido, setRecorrido] = useState<Recorrido>(recorridoInicial);
  const [paso, setPaso] = useState(() =>
    Math.min(Math.max(pasoPedido ?? recorridoInicial.paso, 1), PASOS_DEL_NEGOCIO),
  );
  const [estado, setEstado] = useState<EstadoDelAsistente>(() => {
    const base = estadoDesdeIdentidad(identidad, ESTADO_INICIAL);
    // El alta pone el nombre del negocio como nombre del asistente: no es una elección, se vuelve a pedir.
    const nombreElegido = base.nombreDelAgente.trim() === nombreDelNegocio.trim() ? "" : base.nombreDelAgente;
    return {
      ...base,
      nombreDelAgente: nombreElegido,
      tipo: borrador.tipo ?? base.tipo,
      negocio: borrador.negocio ?? nombreDelNegocio,
    };
  });
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Marca el recorrido como empezado (o retomado, si estaba saltado).
  useEffect(() => {
    if (recorridoInicial.estado !== "en_curso") {
      void post<Recorrido>("/api/onboarding/avanzar", { paso: Math.max(Math.min(recorridoInicial.paso, PASOS_DEL_NEGOCIO), 1) }).then((r) => {
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

  const pasoActual = PASOS[paso - 1];

  async function irAlPaso(destino: number) {
    setError(null);
    setPaso(destino);
    const r = await post<Recorrido>("/api/onboarding/avanzar", { paso: destino });
    if (r.ok) setRecorrido(r.data);
  }

  async function siguiente() {
    const problema = errorDelPaso(pasoActual.id, estado);
    if (problema) {
      setError(problema);
      return;
    }
    setOcupado(true);
    setError(null);
    const cambios = cambiosDelPaso(pasoActual.id, estado);
    if (Object.keys(cambios).length > 0) {
      const guardado = await post("/api/onboarding/identidad", { cambios });
      if (!guardado.ok) {
        setOcupado(false);
        setError(guardado.error);
        return;
      }
    }
    if (paso < PASOS_DEL_NEGOCIO) {
      await irAlPaso(paso + 1);
      setOcupado(false);
      return;
    }
    // Al salir de «Horario y reglas» nace el agente y queda listo para probar; sigue «Habilidades».
    const creado = await crearYDejarListo(estado, recorrido.agente_id ?? null);
    if (!creado.ok) {
      setOcupado(false);
      setError(creado.error);
      return;
    }
    await post<Recorrido>("/api/onboarding/avanzar", { paso: PASOS_DEL_NEGOCIO + 1 });
    router.push(`/bienvenida/agente/${creado.agenteId}`);
  }

  const nombre = estado.nombreDelAgente.trim() || "Tu agente";
  return (
    <div className="flex min-h-screen flex-col">
      <CabeceraDeBienvenida ocupado={ocupado} />
      <main id="contenido" className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-4 md:px-6">
        <RecorridoDelAgente
          pasos={PASOS.map((p) => ({ id: p.id, titulo: p.corto, corto: p.corto }))}
          actual={pasoActual.id}
          modo="en-orden"
          onIr={(id) => {
            const destino = PASOS.findIndex((p) => p.id === id) + 1;
            if (destino >= 1 && destino < paso) void irAlPaso(destino);
          }}
          etiquetaDePasos="Pasos del primer uso"
          pregunta={pasoActual.titulo}
          vistaPrevia={{
            negocio: estado.negocio || nombreDelNegocio,
            agente: nombre,
            subtitulo: `${nombre} · vista previa`,
            mensajes: conversacionDeVoz(
              { tono: estado.tono, calidez: estado.calidez, emojis: estado.emojis, largo: estado.largo },
              nombre,
              estado.negocio || nombreDelNegocio,
            ),
          }}
          atras={{ texto: "Atrás", onClick: () => void irAlPaso(paso - 1), deshabilitado: paso === 1 || ocupado }}
          principal={{
            texto: paso === PASOS_DEL_NEGOCIO ? "Crear mi agente y seguir" : "Siguiente",
            onClick: () => void siguiente(),
            cargando: ocupado,
          }}
        >
          {pasoActual.id === "negocio" && (
            <PasoNegocio
              estado={estado}
              onCambiar={cambiar}
              disponibles={disponibles ? new Set(disponibles) : null}
              habilitara={habilitara}
            />
          )}
          {pasoActual.id === "identidad" && <PasoIdentidad estado={estado} onCambiar={cambiar} />}
          {pasoActual.id === "voz" && <PasoVoz estado={estado} onCambiar={cambiar} />}
          {pasoActual.id === "reglas" && <PasoReglas estado={estado} onCambiar={cambiar} />}
          <FormFeedback error={error ?? undefined} className="max-w-xl" />
        </RecorridoDelAgente>
      </main>
    </div>
  );
}
