"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Marca } from "@/components/ui/marca";
import { Progress } from "@/components/ui/progress";
import type { IdentitySettings, PasoPrimerosPasos } from "@/lib/api/types";
import {
  ESTADO_INICIAL,
  PASOS,
  TOTAL_PASOS,
  cambiosDelPaso,
  errorDelPaso,
  estadoDesdeIdentidad,
  textoDeAvance,
  type EstadoDelAsistente,
  type Recorrido,
  type TipoDeNegocio,
} from "@/lib/onboarding";

import { PantallaFinal } from "./pantalla-final";
import { PasoConocimiento } from "./paso-conocimiento";
import { PasoCrear } from "./paso-crear";
import { PasoNegocio } from "./paso-negocio";
import { PasoProbar } from "./paso-probar";
import { PasoReglas } from "./paso-reglas";
import { PasoVoz } from "./paso-voz";
import { TarjetaDelAgente } from "./tarjeta-del-agente";

type Resultado<T> = { ok: true; data: T } | { ok: false; error: string; status: number; details?: { faltan?: string[] } };

async function post<T>(url: string, cuerpo?: unknown): Promise<Resultado<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo ?? {}),
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: string; details?: { faltan?: string[] } };
    if (!res.ok) {
      return { ok: false, status: res.status, error: typeof json.error === "string" ? json.error : "Algo salió mal. Inténtalo de nuevo.", details: json.details };
    }
    return { ok: true, data: json };
  } catch {
    return { ok: false, status: 0, error: "No se pudo contactar el servidor." };
  }
}

const BORRADOR = (negocioId: string) => `sh-onboarding:${negocioId}`;

type Borrador = Partial<Pick<EstadoDelAsistente, "tipo" | "queVende" | "negocio">>;

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
    window.localStorage.setItem(BORRADOR(negocioId), JSON.stringify({ tipo: estado.tipo, queVende: estado.queVende, negocio: estado.negocio }));
  } catch {
    // Sin almacenamiento el recorrido sigue: solo no recuerda el tipo si se recarga.
  }
}

const FALTA: Record<string, string> = {
  datos_negocio: "Falta contar de tu negocio.",
  agente: "Falta crear tu agente.",
  agente_publicado: "Falta dejar tu agente listo para probar.",
  prueba: "Falta probar a tu agente: escríbele un mensaje.",
};

/**
 * Asistente de primer uso a pantalla completa (HU-UX-21, SPEC-41): seis pasos, cada uno guarda al avanzar
 * y se retoma donde se quedó. «Completo» lo decide el servidor al terminar.
 */
type Props = {
  negocioId: string;
  nombreDelNegocio: string;
  recorridoInicial: Recorrido;
  identidad: IdentitySettings;
  contenido: PasoPrimerosPasos | null;
  disponibles: TipoDeNegocio[] | null;
};

const nunca = () => () => {};

/**
 * Espera a estar en el navegador para leer el borrador local (tipo de negocio y qué vende, que no viven en el
 * servidor); así el primer pintado del servidor y el del cliente coinciden.
 */
export function RecorridoDeBienvenida(props: Props) {
  const enNavegador = useSyncExternalStore(nunca, () => true, () => false);
  if (!enNavegador) return <div className="min-h-screen" aria-busy="true" />;
  return <Asistente {...props} borrador={leerBorrador(props.negocioId)} />;
}

function Asistente({
  negocioId,
  nombreDelNegocio,
  recorridoInicial,
  identidad,
  contenido,
  disponibles,
  borrador,
}: Props & { borrador: Borrador }) {
  const router = useRouter();
  const confirmar = useConfirm();
  const [recorrido, setRecorrido] = useState<Recorrido>(recorridoInicial);
  const [paso, setPaso] = useState(Math.min(Math.max(recorridoInicial.paso, 1), TOTAL_PASOS));
  const [estado, setEstado] = useState<EstadoDelAsistente>(() => {
    const base = estadoDesdeIdentidad(identidad, ESTADO_INICIAL);
    // El alta pone el nombre del negocio como nombre del asistente: no es una elección, se vuelve a pedir.
    const nombreElegido = base.nombreDelAgente.trim() === nombreDelNegocio.trim() ? "" : base.nombreDelAgente;
    return {
      ...base,
      nombreDelAgente: nombreElegido,
      tipo: borrador.tipo ?? base.tipo,
      queVende: borrador.queVende ?? base.queVende,
      negocio: borrador.negocio ?? nombreDelNegocio,
    };
  });
  const [probado, setProbado] = useState(Boolean(recorridoInicial.probado_en));
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [terminado, setTerminado] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const primeraVez = useRef(true);

  // Marca el recorrido como empezado (o retomado, si estaba saltado).
  useEffect(() => {
    if (recorridoInicial.estado !== "en_curso") {
      void post<Recorrido>("/api/onboarding/avanzar", { paso: Math.max(recorridoInicial.paso, 1) }).then((r) => {
        if (r.ok) setRecorrido(r.data);
      });
    }
    // Solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    titulo.current?.focus();
  }, [paso]);

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
  const agenteId = recorrido.agente_id ?? null;
  const conexionId = recorrido.conexion_id ?? null;

  async function irAlPaso(destino: number) {
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
    await irAlPaso(paso + 1);
    setOcupado(false);
  }

  async function terminar() {
    setOcupado(true);
    setError(null);
    const r = await post<Recorrido>("/api/onboarding/finalizar");
    setOcupado(false);
    if (!r.ok) {
      const faltan = r.details?.faltan?.map((c) => FALTA[c]).filter(Boolean);
      setError(faltan && faltan.length > 0 ? faltan.join(" ") : r.error);
      return;
    }
    setRecorrido(r.data);
    setTerminado(true);
    router.refresh();
  }

  async function omitir() {
    const seguro = await confirmar({
      title: "¿Dejarlo para después?",
      description:
        "Tu agente no estará listo para probar y no podrás operar SolversHub del todo. Verás un aviso en cada pantalla hasta que termines, y retomas donde te quedaste.",
      confirmLabel: "Lo hago después",
      cancelLabel: "Seguir ahora",
      destructive: false,
    });
    if (!seguro) return;
    setOcupado(true);
    const r = await post<Recorrido>("/api/onboarding/omitir");
    if (!r.ok) {
      setOcupado(false);
      setError(r.error);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  if (terminado) return <PantallaFinal nombreDelAgente={estado.nombreDelAgente.trim()} />;

  const enUltimo = paso === TOTAL_PASOS;
  // En el paso de crear solo se sigue cuando el agente quedó publicado para probar.
  const sinListo = pasoActual.id === "crear" && !conexionId;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Marca pieza="horizontal-simple" className="h-9 w-auto" />
        <Button variant="ghost" size="sm" onClick={() => void omitir()} disabled={ocupado}>
          Lo hago después
        </Button>
      </header>

      <div className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-6 px-4 pb-28 md:px-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-text-soft" aria-live="polite">
            {textoDeAvance(paso)} · {pasoActual.corto}
          </p>
          <Progress value={paso} max={TOTAL_PASOS} size="sm" label="Avance del primer uso" valueText={textoDeAvance(paso)} />
        </div>

        <details className="rounded-lg border border-border-soft bg-surface lg:hidden">
          <summary className="min-h-11 cursor-pointer px-4 py-3 font-display text-sm font-semibold text-headline">
            Ver cómo va tu agente
          </summary>
          <TarjetaDelAgente estado={estado} className="rounded-t-none border-0 border-t" />
        </details>

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <main id="contenido" className="flex min-w-0 flex-col gap-8">
            <h1 ref={titulo} tabIndex={-1} className="font-display text-sh-h1 text-headline outline-none">
              {pasoActual.titulo}
            </h1>
            {pasoActual.id === "negocio" && <PasoNegocio estado={estado} onCambiar={cambiar} disponibles={disponibles ? new Set(disponibles) : null} />}
            {pasoActual.id === "voz" && <PasoVoz estado={estado} onCambiar={cambiar} />}
            {pasoActual.id === "reglas" && <PasoReglas estado={estado} onCambiar={cambiar} />}
            {pasoActual.id === "conocimiento" && <PasoConocimiento estado={estado} contenido={contenido} />}
            {pasoActual.id === "crear" && (
              <PasoCrear
                estado={estado}
                agenteId={agenteId}
                listoDeAntes={Boolean(agenteId && conexionId)}
                onListo={(r) => setRecorrido(r.recorrido)}
              />
            )}
            {pasoActual.id === "probar" && <PasoProbar estado={estado} conexionId={conexionId} onRespuesta={() => setProbado(true)} />}
            {error && (
              <p role="alert" className="max-w-xl text-sm text-status-danger-fg">
                {error}
              </p>
            )}
          </main>
          <div className="hidden lg:block">
            <TarjetaDelAgente estado={estado} className="sticky top-6" />
          </div>
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 border-t border-border-soft bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Button variant="outline" size="lg" onClick={() => void irAlPaso(paso - 1)} disabled={paso === 1 || ocupado}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Atrás
          </Button>
          {enUltimo ? (
            <Button size="lg" variant="accent" onClick={() => void terminar()} loading={ocupado} disabled={!probado}>
              Terminar
            </Button>
          ) : (
            <Button size="lg" variant="accent" onClick={() => void siguiente()} loading={ocupado} disabled={sinListo}>
              {pasoActual.id === "crear" ? "Probar mi agente" : "Siguiente"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
