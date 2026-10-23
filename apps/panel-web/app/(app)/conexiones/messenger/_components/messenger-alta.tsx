"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFacebookSdk } from "@/lib/facebook-sdk";
import {
  bloqueoDelAlta,
  codeDeLogin,
  esSeleccionable,
  motivoNoSeleccionable,
  nombreDePagina,
  resumirConexion,
  seleccionInicial,
  type EstadoMessenger,
  type PaginaDescubierta,
  type ResultadoConexion,
} from "@/lib/messenger-alta";
import type { components } from "@/lib/api/schema";

type Intento = components["schemas"]["AttemptOut"];
type Descubrimiento = components["schemas"]["DiscoverOut"];

type Respuesta<T> = { ok: true; data: T } | { ok: false; error: string };

async function messenger<T>(action: string, payload: Record<string, unknown> = {}): Promise<Respuesta<T>> {
  const res = await fetch("/api/meta/messenger", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  return res.ok
    ? { ok: true, data: json as T }
    : { ok: false, error: json.error ?? "No se pudo completar." };
}

type Fase = "inicio" | "descubriendo" | "elegir" | "conectando" | "resultado";

/**
 * Alta de Messenger con Facebook Login for Business (HU-CHAN-01, ADR-0152). El backend da un
 * intento de un solo uso; el popup devuelve un `code` que viaja con ese intento a la API, la API
 * lista las Páginas que la persona administra y, al elegirlas, las conecta (token de Página,
 * suscripción verificada). Los tokens nunca llegan aquí.
 */
export function MessengerAlta({ estado }: { estado: EstadoMessenger }) {
  const router = useRouter();
  const bloqueo = bloqueoDelAlta(estado);
  const [fase, setFase] = useState<Fase>("inicio");
  const [intento, setIntento] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [aviso, setAviso] = useState<string>();
  const [descubierto, setDescubierto] = useState<Descubrimiento | null>(null);
  const [elegidas, setElegidas] = useState<string[]>([]);
  const [resultado, setResultado] = useState<ResultadoConexion | null>(null);
  const [preparando, setPreparando] = useState(bloqueo === null);
  const intentoRef = useRef<string | null>(null);

  const sdkListo = useFacebookSdk(estado.app_id, estado.graph_api_version, bloqueo === null);

  /** Pide un intento nuevo. Se hace antes del clic: `FB.login` debe abrirse en el mismo gesto. */
  const pedirIntento = useCallback(async () => {
    const res = await messenger<Intento>("attempt");
    setPreparando(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    intentoRef.current = res.data.attempt;
    setIntento(res.data.attempt);
  }, []);

  const preparar = useCallback(() => {
    setPreparando(true);
    return pedirIntento();
  }, [pedirIntento]);

  useEffect(() => {
    // `preparando` ya parte en true; el estado cambia al volver la respuesta, en un callback (no en el efecto).
    if (bloqueo === null) void Promise.resolve().then(pedirIntento);
  }, [bloqueo, pedirIntento]);

  async function descubrir(code: string) {
    const usado = intentoRef.current;
    intentoRef.current = null;
    setIntento(null);
    if (!usado) return;
    setFase("descubriendo");
    const res = await messenger<Descubrimiento>("discover", { code, attempt: usado });
    if (!res.ok) {
      setError(res.error);
      setFase("inicio");
      // El intento se consumió: uno nuevo para reintentar.
      void preparar();
      return;
    }
    setDescubierto(res.data);
    setElegidas(seleccionInicial(res.data.pages));
    setFase("elegir");
    if (res.data.pages.length === 0) {
      setAviso("Esa cuenta de Facebook no administra ninguna Página.");
    }
  }

  function abrirPopup() {
    const fb = window.FB;
    if (!fb || !intentoRef.current) return;
    setError(undefined);
    setAviso(undefined);
    // Sin `await` antes de `FB.login`: el popup se abre en el mismo clic (si no, el navegador lo bloquea).
    fb.login(
      (response) => {
        const code = codeDeLogin(response);
        if (!code) {
          setAviso("Cerraste la ventana de Facebook antes de terminar. Puedes reintentar cuando quieras.");
          return;
        }
        void descubrir(code);
      },
      {
        config_id: estado.config_id,
        response_type: "code",
        override_default_response_type: true,
      },
    );
  }

  async function conectar() {
    if (!descubierto || elegidas.length === 0) return;
    setFase("conectando");
    setError(undefined);
    const res = await messenger<ResultadoConexion>("connect", {
      connection_id: descubierto.connection_id,
      page_ids: elegidas,
    });
    if (!res.ok) {
      setError(res.error);
      setFase("elegir");
      return;
    }
    setResultado(res.data);
    setFase("resultado");
    router.refresh();
  }

  function alternar(pageId: string, marcada: boolean) {
    setElegidas((actual) => (marcada ? [...actual, pageId] : actual.filter((id) => id !== pageId)));
  }

  function empezarDeNuevo() {
    setDescubierto(null);
    setResultado(null);
    setElegidas([]);
    setError(undefined);
    setAviso(undefined);
    setFase("inicio");
    void preparar();
  }

  if (bloqueo) {
    return (
      <div role="status" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm">
        <p className="font-medium text-headline">{bloqueo.titulo}</p>
        <p className="text-body">{bloqueo.texto}</p>
        {!estado.plan_includes && (
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/plan">Ver planes</Link>
          </Button>
        )}
      </div>
    );
  }

  if (fase === "resultado" && resultado) {
    return <Resultado resultado={resultado} paginas={descubierto?.pages ?? []} onOtra={empezarDeNuevo} />;
  }

  if ((fase === "elegir" || fase === "conectando") && descubierto) {
    const ocupado = fase === "conectando";
    return (
      <div className="flex flex-col gap-4">
        <FormFeedback error={error} success={aviso} />
        {descubierto.pages.length > 0 && (
          <>
            <p className="text-sm text-body">
              Elige las Páginas que atenderá tu asistente. Cada Página solo puede estar en un negocio.
            </p>
            <ul className="flex flex-col gap-2" aria-label="Páginas de Facebook">
              {descubierto.pages.map((p) => (
                <FilaPagina
                  key={p.page_id}
                  pagina={p}
                  marcada={elegidas.includes(p.page_id)}
                  disabled={ocupado}
                  onChange={(v) => alternar(p.page_id, v)}
                />
              ))}
            </ul>
          </>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {descubierto.pages.length > 0 && (
            <Button variant="accent" disabled={ocupado || elegidas.length === 0} onClick={() => void conectar()}>
              {ocupado
                ? "Conectando…"
                : elegidas.length === 1
                  ? "Conectar 1 Página"
                  : `Conectar ${elegidas.length} Páginas`}
            </Button>
          )}
          <Button variant="ghost" disabled={ocupado} onClick={empezarDeNuevo}>
            Usar otra cuenta de Facebook
          </Button>
        </div>
      </div>
    );
  }

  const ocupado = fase === "descubriendo";
  return (
    <div className="flex flex-col gap-4">
      <FormFeedback error={error} success={aviso} />
      <p className="max-w-prose text-sm text-body">
        Se abrirá una ventana de Facebook. Inicia sesión con la cuenta que administra la Página y autoriza a SolversHub a
        leer y responder sus mensajes. Después eliges qué Páginas conectar.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="accent" disabled={!sdkListo || !intento || ocupado || preparando} onClick={abrirPopup}>
          <LogIn className="h-4 w-4" aria-hidden />
          {ocupado ? "Buscando tus Páginas…" : "Conectar con Facebook"}
        </Button>
        {!sdkListo && <span className="text-xs text-text-soft">Cargando Facebook…</span>}
        {sdkListo && !intento && !preparando && !ocupado && (
          <Button variant="ghost" size="sm" onClick={() => void preparar()}>
            Preparar de nuevo
          </Button>
        )}
      </div>
    </div>
  );
}

function FilaPagina({
  pagina,
  marcada,
  disabled,
  onChange,
}: {
  pagina: PaginaDescubierta;
  marcada: boolean;
  disabled: boolean;
  onChange: (marcada: boolean) => void;
}) {
  const motivo = motivoNoSeleccionable(pagina);
  return (
    <li className="flex flex-col gap-1 rounded-md border border-border-soft px-3 py-2">
      <Checkbox
        id={`pagina-${pagina.page_id}`}
        label={pagina.name || `Página ${pagina.page_id}`}
        checked={esSeleccionable(pagina) && marcada}
        disabled={disabled || !esSeleccionable(pagina)}
        onCheckedChange={onChange}
      />
      {pagina.category && <span className="pl-6 text-xs text-text-soft">{pagina.category}</span>}
      {motivo && <span className="pl-6 text-xs text-text-soft">{motivo}</span>}
    </li>
  );
}

function Resultado({
  resultado,
  paginas,
  onOtra,
}: {
  resultado: ResultadoConexion;
  paginas: PaginaDescubierta[];
  onOtra: () => void;
}) {
  const r = resumirConexion(resultado);
  return (
    <div className="flex flex-col gap-4">
      {r.recibiendo && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-status-success-fg" aria-hidden />
          <p className="text-body">
            {r.conectadas.length - r.sinSuscripcion.length === 1
              ? "Tu Página quedó conectada y recibiendo mensajes."
              : "Tus Páginas quedaron conectadas y recibiendo mensajes."}
          </p>
        </div>
      )}
      {r.sinSuscripcion.length > 0 && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-status-warning-fg" aria-hidden />
          <div className="text-body">
            <p className="font-medium text-headline">Meta no confirmó la suscripción de estas Páginas</p>
            <p>
              Quedaron guardadas, pero no recibirán mensajes hasta que se confirme. Vuelve a conectarlas con Facebook:
            </p>
            <ul className="mt-1 list-disc pl-5">
              {r.sinSuscripcion.map((p) => (
                <li key={p.page_id}>{nombreDePagina(p.page_id, paginas)}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {r.omitidas.length > 0 && (
        <div role="alert" className="rounded-lg border border-status-danger-border bg-status-danger-bg p-4 text-sm">
          <p className="font-medium text-headline">No se pudieron conectar</p>
          <ul className="mt-1 list-disc pl-5 text-body">
            {r.omitidas.map((o) => (
              <li key={o.page_id}>
                {nombreDePagina(o.page_id, paginas)}: {o.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="accent">
          <Link href="/conexiones">Ver conexiones</Link>
        </Button>
        <Button variant="outline" onClick={onOtra}>
          Conectar otra Página
        </Button>
      </div>
    </div>
  );
}
