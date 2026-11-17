"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { EditorDeAgente, type BienvenidaDelEditor } from "@/components/domain/agentes/recorrido/editor-de-agente";
import type { DatosDelEditor } from "@/lib/editor-de-agente-datos";
import type { PasoId } from "@/lib/agentes-editor";
import { dejarListo, textoDeErrorAlDejarListo } from "@/lib/onboarding-agente";
import { ESTADO_INICIAL, PASOS, PASOS_DEL_NEGOCIO, TIPOS_DE_NEGOCIO, type Recorrido } from "@/lib/onboarding";
import { toast } from "@/lib/toast-store";

import { CabeceraDeBienvenida } from "./cabecera";
import { PantallaFinal } from "./pantalla-final";
import { PasoProbar } from "./paso-probar";

const FALTA: Record<string, string> = {
  datos_negocio: "Falta contar de tu negocio.",
  agente: "Falta crear tu agente.",
  agente_publicado: "Falta dejar tu agente listo para probar.",
  prueba: "Falta probar a tu agente: escríbele un mensaje.",
};

async function post<T>(url: string, cuerpo?: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string; faltan?: string[] }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo ?? {}) });
    const json = (await res.json().catch(() => ({}))) as T & { error?: string; details?: { faltan?: string[] } };
    if (!res.ok) return { ok: false, error: typeof json.error === "string" ? json.error : "Algo salió mal. Inténtalo de nuevo.", faltan: json.details?.faltan };
    return { ok: true, data: json };
  } catch {
    return { ok: false, error: "No se pudo contactar el servidor." };
  }
}

/**
 * Pasos 5 a 9 de la bienvenida (HU-UX-23): el editor del agente en modo bienvenida, a pantalla completa y
 * con la cabecera de siempre. Antes de «Pruébalo» y al terminar se deja el agente listo otra vez, para que la
 * prueba y lo publicado sean lo último que el dueño configuró.
 */
export function BienvenidaDelAgente({
  datos,
  pasoInicial,
  recorridoInicial,
}: {
  datos: DatosDelEditor;
  pasoInicial: PasoId;
  recorridoInicial: Recorrido;
}) {
  const router = useRouter();
  const [conexionId, setConexionId] = useState<string | null>(recorridoInicial.conexion_id ?? null);
  const [probado, setProbado] = useState(Boolean(recorridoInicial.probado_en));
  const [terminando, setTerminando] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const agenteId = datos.agente.id;
  const tipo = TIPOS_DE_NEGOCIO.find((t) => t.id === datos.agente.key)?.id ?? null;

  async function prepararPrueba(): Promise<string | null> {
    const r = await dejarListo(agenteId);
    if (!r.ok) return textoDeErrorAlDejarListo(r);
    if (r.data.conexion_id) setConexionId(r.data.conexion_id);
    return null;
  }

  async function terminar() {
    setTerminando(true);
    const listo = await dejarListo(agenteId);
    if (!listo.ok) {
      setTerminando(false);
      toast.error(textoDeErrorAlDejarListo(listo));
      return;
    }
    const r = await post<Recorrido>("/api/onboarding/finalizar");
    setTerminando(false);
    if (!r.ok) {
      const faltan = r.faltan?.map((c) => FALTA[c]).filter(Boolean);
      toast.error(faltan && faltan.length > 0 ? faltan.join(" ") : r.error);
      return;
    }
    // Sin `router.refresh()`: con el recorrido completo la página redirige al Resumen y la pantalla
    // final no llegaba a verse. Sus enlaces navegan y el layout se vuelve a leer ahí.
    setTerminado(true);
  }

  if (terminado) return <PantallaFinal nombreDelAgente={datos.agente.name} />;

  const bienvenida: BienvenidaDelEditor = {
    pasosDelNegocio: PASOS.slice(0, PASOS_DEL_NEGOCIO).map((p) => ({ id: `negocio-${p.id}`, titulo: p.corto, corto: p.corto })),
    volverA: (numero) => router.push(`/bienvenida?paso=${numero}`),
    avanzar: (numero) => void post("/api/onboarding/avanzar", { paso: numero }),
    prepararPrueba,
    prueba: (
      <PasoProbar estado={{ ...ESTADO_INICIAL, tipo }} conexionId={conexionId} onRespuesta={() => setProbado(true)} />
    ),
    probado,
    terminar,
    terminando,
  };

  return (
    <div className="flex min-h-screen flex-col">
      <CabeceraDeBienvenida ocupado={terminando} />
      <main id="contenido" className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col px-4 md:px-6">
        <EditorDeAgente {...datos} modo="bienvenida" pasoInicial={pasoInicial} bienvenida={bienvenida} />
      </main>
    </div>
  );
}
