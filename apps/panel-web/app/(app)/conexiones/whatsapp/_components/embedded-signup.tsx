"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, CircleDot, LogIn } from "lucide-react";

import { META_CONNECTION_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import type { components } from "@/lib/api/schema";
import {
  CanjePendiente,
  esOrigenDeFacebook,
  estadoPasos,
  nombrePaso,
  parseSignupEvent,
  type CancelEvent,
  type FinishEvent,
} from "@/lib/embedded-signup";
import { parsePin } from "@/lib/meta-pin";

type Estado = components["schemas"]["WizardState"];
type Sesion = components["schemas"]["WizardSessionOut"];

type FbLoginResponse = { authResponse?: { code?: string } | null; status?: string };
type FbSdk = {
  init(opts: { appId: string; autoLogAppEvents?: boolean; xfbml?: boolean; version: string }): void;
  login(cb: (response: FbLoginResponse) => void, opts: Record<string, unknown>): void;
};

declare global {
  interface Window {
    FB?: FbSdk;
    fbAsyncInit?: () => void;
  }
}

const SDK_ID = "facebook-jssdk";
const SDK_URL = "https://connect.facebook.net/en_US/sdk.js";

async function wizard(action: string, payload: Record<string, unknown>) {
  const res = await fetch("/api/meta/wizard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string } & Partial<Sesion>;
  return res.ok
    ? { ok: true as const, data: json as Sesion }
    : { ok: false as const, status: res.status, error: json.error ?? "No se pudo completar." };
}

/** Carga el SDK de Facebook una sola vez y lo inicializa con la app de la plataforma. */
function useFacebookSdk(appId: string, version: string, activo: boolean): boolean {
  const [listo, setListo] = useState(false);
  useEffect(() => {
    if (!activo || !appId) return;
    if (window.FB) {
      // Ya cargado (navegación dentro del panel): se marca en un callback, no en el efecto.
      void Promise.resolve().then(() => setListo(true));
      return;
    }
    window.fbAsyncInit = () => {
      window.FB?.init({ appId, autoLogAppEvents: true, xfbml: false, version: version || "v21.0" });
      setListo(true);
    };
    if (!document.getElementById(SDK_ID)) {
      const script = document.createElement("script");
      script.id = SDK_ID;
      script.src = SDK_URL;
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      document.body.appendChild(script);
    }
  }, [activo, appId, version]);
  return listo;
}

function Progreso({ step }: { step: string }) {
  return (
    <ol className="flex flex-wrap gap-x-4 gap-y-2 text-xs" aria-label="Pasos del alta">
      {estadoPasos(step).map((p) => (
        <li key={p.key} className="flex items-center gap-1.5" aria-current={p.estado === "actual" ? "step" : undefined}>
          {p.estado === "hecho" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden />
          ) : p.estado === "actual" ? (
            <CircleDot className="h-3.5 w-3.5 text-accent" aria-hidden />
          ) : (
            <Circle className="h-3.5 w-3.5 text-text-soft" aria-hidden />
          )}
          <span className={p.estado === "pendiente" ? "text-text-soft" : "text-body"}>{p.label}</span>
          <span className="sr-only">
            {p.estado === "hecho" ? "(hecho)" : p.estado === "actual" ? "(paso actual)" : "(pendiente)"}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * "Producción (Conectar con Facebook)": Embedded Signup de Meta con la app de la plataforma
 * (HU-SH-05). Prepara el alta (el backend da un intento de un solo uso), abre el popup con el
 * `config_id`, junta el `code` y el evento `WA_EMBEDDED_SIGNUP` y los manda al servidor, que
 * canjea el código y encadena el resto. Si se cierra el popup, lo registra y ofrece reintentar;
 * si el alta quedó a medias, muestra el paso y lo retoma.
 */
export function EmbeddedSignup({ estado, inicial }: { estado: Estado; inicial: Sesion | null }) {
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion | null>(inicial);
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [aviso, setAviso] = useState<string>();
  const [pinError, setPinError] = useState<string>();
  const [pin, setPin] = useState("");
  const canjeRef = useRef<CanjePendiente | null>(null);
  const cancelRegistrado = useRef(false);
  const sesionRef = useRef<Sesion | null>(inicial);
  const pinRef = useRef("");

  const sdkListo = useFacebookSdk(estado.app_id, estado.graph_api_version ?? "", estado.meta_configured);

  const actualizar = useCallback(
    (s: Sesion) => {
      sesionRef.current = s;
      setSesion(s);
      if (s.done && s.connection_id) router.push(`/conexiones/meta/${s.connection_id}?alta=1`);
    },
    [router],
  );

  /** Pide (o renueva) el intento del popup. `conservarError`: tras un fallo, el mensaje sigue a la vista. */
  const preparar = useCallback(
    async (restart = false, conservarError = false) => {
      setCargando("preparar");
      if (!conservarError) setError(undefined);
      const res = await wizard("session", { environment: "production", restart });
      setCargando(null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      actualizar(res.data);
    },
    [actualizar],
  );

  const registrarCancelacion = useCallback(
    async (ev: CancelEvent) => {
      const actual = sesionRef.current;
      canjeRef.current?.cancelar();
      canjeRef.current = null;
      if (!actual || cancelRegistrado.current) return;
      cancelRegistrado.current = true;
      setCargando(null);
      const res = await wizard("cancel", {
        wizard_id: actual.wizard_id,
        current_step: ev.currentStep,
        error_message: ev.errorMessage,
        error_code: ev.errorCode,
        session_id: ev.sessionId,
      });
      setAviso(
        ev.errorMessage
          ? `Meta reportó un error en el popup: ${ev.errorMessage}`
          : "Cerraste la ventana de Facebook antes de terminar. Puedes reintentar cuando quieras.",
      );
      if (res.ok) actualizar(res.data);
      // El intento cancelado ya no sirve: se pide uno nuevo para que "Reintentar" abra el popup.
      void preparar();
    },
    [actualizar, preparar],
  );

  const canjear = useCallback(
    async (code: string, finish: FinishEvent | null) => {
      const actual = sesionRef.current;
      canjeRef.current = null;
      if (!actual?.attempt) return;
      setCargando("canje");
      setAviso(undefined);
      const res = await wizard("exchange", {
        wizard_id: actual.wizard_id,
        code,
        attempt: actual.attempt,
        event_type: finish?.eventType ?? "FINISH",
        waba_id: finish?.wabaId ?? "",
        phone_number_id: finish?.phoneNumberId ?? "",
        business_id: finish?.businessId ?? "",
        pin: pinRef.current || null,
      });
      pinRef.current = "";
      setPin("");
      setCargando(null);
      if (!res.ok) {
        setError(res.error);
        // El intento se consumió o el código venció: uno nuevo para reintentar.
        void preparar(false, true);
        return;
      }
      actualizar(res.data);
    },
    [actualizar, preparar],
  );

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!esOrigenDeFacebook(event.origin)) return;
      const ev = parseSignupEvent(event.data);
      if (!ev) return;
      if (ev.kind === "finish") canjeRef.current?.conFinish(ev);
      else void registrarCancelacion(ev);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [registrarCancelacion]);

  function abrirPopup() {
    const actual = sesionRef.current;
    const fb = window.FB;
    if (!actual?.attempt || !fb) return;
    const parsed = parsePin(pin);
    if ("error" in parsed) {
      setPinError(parsed.error);
      return;
    }
    setPinError(undefined);
    setError(undefined);
    setAviso(undefined);
    pinRef.current = parsed.pin ?? "";
    cancelRegistrado.current = false;
    canjeRef.current = new CanjePendiente((code, finish) => void canjear(code, finish));
    setCargando("popup");
    // Sin `await` antes de `FB.login`: el popup se abre en el mismo clic (los navegadores
    // bloquean los que se abren después de una espera).
    fb.login(
      (response) => {
        const code = response?.authResponse?.code;
        if (code) {
          canjeRef.current?.conCode(code);
          return;
        }
        // Sin código: el popup se cerró. Si Meta no mandó su CANCEL, se registra igual.
        setTimeout(() => void registrarCancelacion({ kind: "cancel", currentStep: "popup_cerrado" }), 800);
      },
      {
        config_id: estado.config_id,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {} },
      },
    );
  }

  async function enviarPin(event: FormEvent<HTMLFormElement>, accion: "number" | "pin") {
    event.preventDefault();
    const form = event.currentTarget;
    const actual = sesionRef.current;
    if (!actual) return;
    const parsed = parsePin(String(new FormData(form).get("pin") ?? ""));
    if ("error" in parsed || parsed.pin === null) {
      setPinError("error" in parsed ? parsed.error : "Escribe el PIN de 6 dígitos.");
      return;
    }
    setPinError(undefined);
    setCargando(accion);
    setError(undefined);
    const res = await wizard(accion, { wizard_id: actual.wizard_id, pin: parsed.pin });
    setCargando(null);
    form.reset();
    if (!res.ok) {
      setError(res.error);
      return;
    }
    actualizar(res.data);
  }

  async function reintentarPasos() {
    const actual = sesionRef.current;
    if (!actual) return;
    setCargando("resume");
    setError(undefined);
    const res = await wizard("resume", { wizard_id: actual.wizard_id });
    setCargando(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    actualizar(res.data);
  }

  if (!estado.meta_configured) {
    return (
      <div role="status" className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <p className="font-medium text-headline">Conectar con Facebook no está disponible en este entorno</p>
        <p className="text-body">
          Falta configurar la app de Meta de la plataforma
          {estado.missing_settings?.length ? (
            <>
              {" "}
              ({estado.missing_settings.map((v, i) => (
                <span key={v}>
                  {i > 0 ? ", " : ""}
                  <code className="font-mono text-xs">{v}</code>
                </span>
              ))}
              )
            </>
          ) : null}
          . Mientras tanto puedes conectar con tu propia app de Meta (BYOK).
        </p>
      </div>
    );
  }

  const vivo = sesion && !sesion.done;
  const esperaPopup = vivo && ["select_channel", "launch_oauth", "exchange_code"].includes(sesion.step);
  const ultimoError = sesion?.last_error?.message;

  return (
    <div className="flex flex-col gap-4">
      {sesion && !sesion.done && <Progreso step={sesion.step} />}
      <FormFeedback error={error} success={aviso} />

      {(!sesion || sesion.done || sesion.expired) && (
        <div className="flex flex-col gap-3">
          {sesion?.expired && (
            <p className="text-sm text-body">
              El alta anterior quedó sin terminar más de 24 horas. Empieza de nuevo: se reutiliza el borrador.
            </p>
          )}
          {sesion?.done && sesion.connection_id && (
            <p className="text-sm text-body">
              Ya conectaste un número con Facebook.{" "}
              <Link className="text-accent underline-offset-2 hover:underline" href={`/conexiones/meta/${sesion.connection_id}`}>
                Ver la conexión
              </Link>
              . Si vuelves a conectar, se reautoriza la misma conexión.
            </p>
          )}
          <div>
            <Button variant="accent" disabled={cargando !== null} onClick={() => void preparar()}>
              {cargando === "preparar" ? "Preparando…" : sesion ? "Empezar de nuevo" : "Empezar"}
            </Button>
          </div>
        </div>
      )}

      {esperaPopup && !sesion.expired && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-body">
            Se abrirá una ventana de Facebook: elige o crea tu portafolio de negocio, tu cuenta de WhatsApp Business y
            el número. Al terminar, conectamos todo aquí.
          </p>
          <Field
            label="PIN de verificación en dos pasos del número"
            htmlFor="es_pin"
            help="Si el número ya tiene verificación en dos pasos, escribe ese PIN; si no, el que escribas queda como su PIN (guárdalo). Si lo dejas vacío, te lo pedimos al final."
            error={pinError}
            className="sm:max-w-xs"
          >
            <Input
              id="es_pin"
              name="pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              aria-invalid={pinError ? true : undefined}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="accent"
              disabled={!sdkListo || !sesion.attempt || cargando !== null}
              onClick={abrirPopup}
            >
              <LogIn className="h-4 w-4" aria-hidden />
              {cargando === "popup"
                ? "Esperando a Facebook…"
                : cargando === "canje"
                  ? "Conectando tu número…"
                  : sesion.cancelled
                    ? "Reintentar con Facebook"
                    : "Conectar con Facebook"}
            </Button>
            {!sdkListo && <span className="text-xs text-text-soft">Cargando Facebook…</span>}
            {!sesion.attempt && sdkListo && cargando === null && (
              <Button variant="ghost" size="sm" onClick={() => void preparar()}>
                Preparar de nuevo
              </Button>
            )}
          </div>
          {sesion.cancelled && (
            <p className="text-xs text-text-soft">
              Último intento cancelado
              {sesion.cancelled.current_step && sesion.cancelled.current_step !== "popup_cerrado"
                ? ` en el paso «${sesion.cancelled.current_step}» de Meta`
                : ""}
              .
            </p>
          )}
        </div>
      )}

      {vivo && !sesion.expired && sesion.step === "register_number" && (
        <div className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <p className="font-medium text-headline">Registra el número con su PIN</p>
          <p className="text-sm text-body">
            {ultimoError ?? "Falta registrar el número en la Cloud API con su PIN de verificación en dos pasos."}
          </p>
          <form className="flex flex-col gap-3" onSubmit={(e) => void enviarPin(e, "number")}>
            <Field label="PIN del número" htmlFor="es_pin_registro" error={pinError} className="sm:max-w-xs">
              <Input id="es_pin_registro" name="pin" type="password" inputMode="numeric" autoComplete="off" maxLength={6} />
            </Field>
            <div>
              <Button type="submit" variant="accent" disabled={cargando !== null}>
                {cargando === "number" ? "Registrando…" : "Registrar número"}
              </Button>
            </div>
          </form>
          <details className="text-sm">
            <summary className="cursor-pointer text-text-soft">No recuerdo el PIN del número</summary>
            <form className="mt-3 flex flex-col gap-3" onSubmit={(e) => void enviarPin(e, "pin")}>
              <p className="text-body">
                Fijamos un PIN nuevo de verificación en dos pasos y registramos el número con él.
              </p>
              <Field label="PIN nuevo" htmlFor="es_pin_nuevo" className="sm:max-w-xs">
                <Input id="es_pin_nuevo" name="pin" type="password" inputMode="numeric" autoComplete="off" maxLength={6} />
              </Field>
              <div>
                <Button type="submit" variant="outline" disabled={cargando !== null}>
                  {cargando === "pin" ? "Guardando…" : "Fijar PIN nuevo y registrar"}
                </Button>
              </div>
            </form>
          </details>
        </div>
      )}

      {vivo && !sesion.expired && !esperaPopup && sesion.step !== "register_number" && (
        <div className="flex flex-col gap-3 rounded-lg border border-border-soft p-4">
          <p className="text-sm text-body">
            El alta quedó en «{nombrePaso(sesion.step)}».{ultimoError ? ` ${ultimoError}` : ""}
          </p>
          <div>
            <Button variant="accent" disabled={cargando !== null} onClick={() => void reintentarPasos()}>
              {cargando === "resume" ? "Retomando…" : "Retomar desde aquí"}
            </Button>
          </div>
        </div>
      )}

      {vivo && !sesion.expired && !esperaPopup && (
        <div className="flex items-center gap-2 text-xs text-text-soft">
          {sesion.connection_status && <StatusBadge value={sesion.connection_status} map={META_CONNECTION_STATUS} />}
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            disabled={cargando !== null}
            onClick={() => void preparar(true)}
          >
            Empezar de nuevo con Facebook
          </button>
        </div>
      )}
    </div>
  );
}
