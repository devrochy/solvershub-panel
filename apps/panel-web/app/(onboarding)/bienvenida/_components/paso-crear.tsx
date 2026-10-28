"use client";

import { useState } from "react";
import { AlertTriangle, Check, Circle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ETIQUETAS_DE_SUBPASO,
  MOTIVOS_DE_ESCALAR,
  TIPOS_DE_NEGOCIO,
  TONOS,
  plantillaDe,
  resumenDeHorario,
  respuestasDeCreacion,
  type EstadoDelAsistente,
  type Recorrido,
  type SubPaso,
} from "@/lib/onboarding";
import { cn } from "@/lib/utils";

type Fase = "inactivo" | "creando" | "dejando-listo" | "error" | "listo" | "en-revision";

type DejarListo = { conexion_id: string; listo: boolean; pasos: SubPaso[]; recorrido: Recorrido };

async function enviar<T>(url: string, cuerpo: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string; code?: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
    const json = (await res.json().catch(() => ({}))) as T & { error?: string; code?: string };
    if (!res.ok) return { ok: false, error: typeof json.error === "string" ? json.error : "Algo salió mal. Inténtalo de nuevo.", code: json.code };
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: "No se pudo contactar el servidor." };
  }
}

/**
 * Paso 5: resumen de lo decidido y «Crear mi agente». Corre, con avance visible: crear el agente desde las
 * respuestas, preparar un chat de pruebas cerrado al público, publicarlo ahí y dejarlo activo. Se puede
 * reintentar: cada acción del servidor es idempotente.
 */
export function PasoCrear({
  estado,
  agenteId,
  listoDeAntes,
  onListo,
}: {
  estado: EstadoDelAsistente;
  agenteId: string | null;
  /** El recorrido ya tiene agente y conexión (se retomó): no hay que crear nada. */
  listoDeAntes: boolean;
  onListo: (resultado: { agenteId: string; conexionId: string; recorrido: Recorrido; listo: boolean }) => void;
}) {
  const [fase, setFase] = useState<Fase>(listoDeAntes ? "listo" : "inactivo");
  const [error, setError] = useState<string | null>(null);
  const [pasos, setPasos] = useState<SubPaso[]>([]);
  const tipo = TIPOS_DE_NEGOCIO.find((t) => t.id === estado.tipo);

  async function crear() {
    if (!estado.tipo) return;
    setError(null);
    let agente = agenteId;
    if (!agente) {
      setFase("creando");
      const creado = await enviar<{ agentId: string }>("/api/agent-editor/from-script", {
        template_key: plantillaDe(estado.tipo),
        answers: respuestasDeCreacion(estado),
        name: estado.nombreDelAgente.trim(),
      });
      if (!creado.ok) {
        setError(creado.error);
        setFase("error");
        return;
      }
      agente = creado.data.agentId;
    }
    setFase("dejando-listo");
    const listo = await enviar<DejarListo>("/api/onboarding/dejar-listo", { agent_id: agente });
    if (!listo.ok) {
      setError(
        listo.code === "canal_en_vivo"
          ? "Ya tienes un chat web en vivo. Para no tocarlo, termina estos pasos más tarde desde Agentes o pausa ese chat."
          : listo.error,
      );
      setFase("error");
      return;
    }
    setPasos(listo.data.pasos);
    setFase(listo.data.listo ? "listo" : "en-revision");
    onListo({ agenteId: agente, conexionId: listo.data.conexion_id, recorrido: listo.data.recorrido, listo: listo.data.listo });
  }

  const ocupado = fase === "creando" || fase === "dejando-listo";
  const horario = estado.horario ? resumenDeHorario(estado.horario) : "Sin horario definido";
  const escalar = MOTIVOS_DE_ESCALAR.filter((m) => estado.motivos.includes(m.id)).map((m) => m.titulo);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <Fila titulo="Tipo" valor={tipo?.titulo ?? "—"} />
        <Fila titulo="Se llama" valor={estado.nombreDelAgente.trim() || "—"} />
        <Fila titulo="Tono" valor={TONOS.find((t) => t.id === estado.tono)?.titulo ?? "—"} />
        <Fila titulo="Atiende tu equipo" valor={horario} />
        <Fila titulo="Pasa a una persona si" valor={escalar.join(", ") || "—"} />
      </dl>

      {(ocupado || pasos.length > 0 || fase === "listo") && (
        <ol aria-label="Avance" className="flex flex-col gap-2" aria-live="polite">
          <Linea hecho={fase !== "creando" && fase !== "inactivo" && fase !== "error"} activo={fase === "creando"}>
            Crear tu agente
          </Linea>
          {(["conexion", "publicar", "activar"] as const).map((clave) => {
            const sub = pasos.find((p) => p.clave === clave);
            return (
              <Linea
                key={clave}
                hecho={sub ? sub.estado !== "pendiente_de_revision" : fase === "listo"}
                alerta={sub?.estado === "pendiente_de_revision"}
                activo={fase === "dejando-listo" && !sub}
              >
                {ETIQUETAS_DE_SUBPASO[clave]}
                {sub?.estado === "pendiente_de_revision" ? " · pendiente de revisión" : ""}
              </Linea>
            );
          })}
        </ol>
      )}

      {fase === "en-revision" && (
        <p role="status" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-3 text-sm text-body">
          Tu agente quedó creado, pero una persona de SolversHub debe revisarlo antes de que puedas probarlo. Te avisamos cuando esté listo.
        </p>
      )}
      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm text-status-danger-fg">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {fase === "listo" || fase === "en-revision" ? (
        <p className="text-sm text-body">Todo listo. Sigue para probar a {estado.nombreDelAgente.trim() || "tu agente"}.</p>
      ) : (
        <Button size="lg" variant="accent" className="self-start" onClick={() => void crear()} loading={ocupado} disabled={!estado.tipo}>
          {fase === "error" ? "Reintentar" : "Crear mi agente"}
        </Button>
      )}
    </div>
  );
}

function Fila({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <>
      <dt className="text-text-soft">{titulo}</dt>
      <dd className="text-headline">{valor}</dd>
    </>
  );
}

function Linea({ children, hecho, activo, alerta }: { children: React.ReactNode; hecho?: boolean; activo?: boolean; alerta?: boolean }) {
  return (
    <li className={cn("flex items-center gap-3 text-sm", hecho ? "text-headline" : "text-text-soft")}>
      {alerta ? (
        <AlertTriangle className="h-4 w-4 text-status-warning-fg" aria-hidden />
      ) : hecho ? (
        <Check className="h-4 w-4 text-status-success-fg" aria-hidden />
      ) : activo ? (
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
      ) : (
        <Circle className="h-4 w-4" aria-hidden />
      )}
      {children}
    </li>
  );
}
