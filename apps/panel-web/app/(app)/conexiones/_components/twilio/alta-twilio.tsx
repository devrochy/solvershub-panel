"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { InputPassword } from "@/components/ui/input-password";
import { RadioGroup } from "@/components/ui/radio-group";
import { rutaDeFicha } from "@/lib/conexion-ficha";
import {
  BFF_TWILIO,
  errorDeJoinCode,
  erroresDeCredenciales,
  etiquetaDeSender,
  mensajeErrorTwilio,
  motivoDeSender,
  numeroLegible,
  webhookPrevio,
  type CapacidadesTwilio,
  type ConexionTwilio,
  type DescubrirTwilio,
} from "@/lib/conexion-twilio";

type Respuesta<T> = (T & { error?: undefined }) | { error?: string; code?: string; details?: Record<string, unknown> };

async function postJson<T>(url: string, body: unknown): Promise<{ ok: boolean; data: Respuesta<T> }> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as Respuesta<T>;
  return { ok: res.ok, data };
}

const PASOS = ["Tu cuenta de Twilio", "Elige el número", "Conectar"] as const;

type Modo = "sender" | "sandbox";

/**
 * Alta guiada de WhatsApp vía Twilio (HU-CONN-11, ADR-0186 §3), dentro del diálogo «Agregar conexión»:
 * 1) Account SID y Auth Token, que el backend valida contra Twilio y con los que trae los números de la cuenta;
 * 2) elegir el número; si ya manda sus mensajes a otra dirección, se avisa que se reemplaza y no se sigue sin
 * confirmarlo; 3) nombrarlo y conectarlo, y abrir su ficha. Las credenciales viven solo en este estado: el
 * backend las vuelve a pedir al conectar y nunca las devuelve.
 *
 * Si el entorno permite el Sandbox de Twilio (`GET /capabilities`, solo en pruebas, HU-CONN-20), el paso 1 ofrece
 * además «Usar el Sandbox»: con la cuenta y el código de unión se conecta en un solo paso y la ficha explica cómo
 * pegar las direcciones en la consola de Twilio.
 */
export function AltaTwilio({ onVolver, onConectada }: { onVolver: () => void; onConectada: () => void }) {
  const router = useRouter();
  const [paso, setPaso] = useState(0);
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [errores, setErrores] = useState<{ account_sid?: string; auth_token?: string }>({});
  const [descubierto, setDescubierto] = useState<DescubrirTwilio | null>(null);
  const [senderSid, setSenderSid] = useState("");
  const [confirmaWebhook, setConfirmaWebhook] = useState(false);
  const [previo, setPrevio] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [capacidades, setCapacidades] = useState<CapacidadesTwilio | null>(null);
  const [modo, setModo] = useState<Modo>("sender");
  const [joinCode, setJoinCode] = useState("");
  const [errorJoin, setErrorJoin] = useState<string | undefined>();

  useEffect(() => {
    let vivo = true;
    // Sin respuesta (o 404 sin la bandera) se queda el alta de siempre: el Sandbox solo aparece si el backend lo ofrece.
    fetch(`${BFF_TWILIO}/capabilities`)
      .then((res) => (res.ok ? (res.json() as Promise<CapacidadesTwilio>) : null))
      .then((data) => {
        if (vivo && data) setCapacidades(data);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);
  const conSandbox = capacidades?.sandbox_disponible === true;
  const enSandbox = conSandbox && modo === "sandbox";

  const sender = descubierto?.senders.find((s) => s.sender_sid === senderSid) ?? null;
  const pideConfirmar = Boolean(sender?.webhook_ajeno) || previo !== null;

  async function descubrir(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const encontrados = erroresDeCredenciales(accountSid, authToken);
    setErrores(encontrados);
    if (encontrados.account_sid || encontrados.auth_token) return;
    setError(null);
    setCargando(true);
    const { ok, data } = await postJson<DescubrirTwilio>(`${BFF_TWILIO}/discover`, {
      account_sid: accountSid.trim(),
      auth_token: authToken.trim(),
    }).finally(() => setCargando(false));
    if (!ok || !("senders" in data)) {
      const fallo = data as { error?: string; code?: string };
      setError(mensajeErrorTwilio(fallo.code, fallo.error ?? "No se pudo consultar Twilio."));
      return;
    }
    setDescubierto(data);
    const primero = data.senders.find((s) => s.seleccionable);
    setSenderSid(primero?.sender_sid ?? "");
    setConfirmaWebhook(false);
    setPrevio(null);
    setPaso(1);
  }

  async function conectarSandbox(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const encontrados = erroresDeCredenciales(accountSid, authToken);
    const deJoin = errorDeJoinCode(joinCode);
    setErrores(encontrados);
    setErrorJoin(deJoin);
    if (encontrados.account_sid || encontrados.auth_token || deJoin) return;
    setError(null);
    setCargando(true);
    const codigo = joinCode.trim().toLowerCase();
    const { ok, data } = await postJson<ConexionTwilio>(`${BFF_TWILIO}/sandbox`, {
      account_sid: accountSid.trim(),
      auth_token: authToken.trim(),
      label: nombre.trim(),
      ...(codigo ? { join_code: codigo } : {}),
    }).finally(() => setCargando(false));
    // 201 si se creó y 200 si el sandbox de esa cuenta ya estaba conectado aquí.
    if (ok && "connection_id" in data) {
      onConectada();
      router.refresh();
      router.push(`${rutaDeFicha({ id: data.connection_id })}?alta=1`);
      return;
    }
    const fallo = data as { error?: string; code?: string };
    setError(mensajeErrorTwilio(fallo.code, fallo.error ?? "No se pudo conectar el Sandbox."));
  }

  function elegirSender(sid: string) {
    setSenderSid(sid);
    setConfirmaWebhook(false);
    setPrevio(null);
    setError(null);
  }

  function aConectar() {
    if (!sender) return;
    if (!nombre.trim()) setNombre(sender.display_name.trim() || "WhatsApp");
    setError(null);
    setPaso(2);
  }

  async function conectar() {
    if (!sender) return;
    setError(null);
    setCargando(true);
    const { ok, data } = await postJson<ConexionTwilio>(BFF_TWILIO, {
      account_sid: accountSid.trim(),
      auth_token: authToken.trim(),
      sender_sid: sender.sender_sid,
      label: nombre.trim(),
      confirm_overwrite_webhook: pideConfirmar && confirmaWebhook,
    }).finally(() => setCargando(false));
    // 201 si se creó y 200 si el número ya estaba conectado en este negocio: las dos son un alta lista.
    if (ok && "connection_id" in data) {
      onConectada();
      router.refresh();
      router.push(`${rutaDeFicha({ id: data.connection_id })}?alta=1`);
      return;
    }
    const fallo = data as { error?: string; code?: string; details?: Record<string, unknown> };
    if (fallo.code === "webhook_overwrite_not_confirmed") {
      // Red de seguridad: el número cambió de dirección entre el paso 2 y ahora. Se vuelve a pedir confirmación.
      setPrevio(webhookPrevio(fallo.details) ?? "");
      setConfirmaWebhook(false);
      setPaso(1);
    }
    setError(mensajeErrorTwilio(fallo.code, fallo.error ?? "No se pudo conectar el número."));
  }

  return (
    <div className="flex flex-col gap-4">
      <Button type="button" variant="ghost" onClick={paso === 0 ? onVolver : () => setPaso(paso - 1)} className="self-start">
        <ChevronLeft className="h-4 w-4" aria-hidden /> {paso === 0 ? "Elegir otro tipo" : "Volver"}
      </Button>
      {!enSandbox && (
        <p className="text-xs text-text-soft" aria-live="polite">
          Paso {paso + 1} de {PASOS.length} · {PASOS[paso]}
        </p>
      )}

      {error && <FormFeedback error={error} />}

      {paso === 0 && conSandbox && (
        <RadioGroup
          label="¿Qué vas a conectar?"
          name="twilio_modo"
          value={modo}
          onValueChange={(v) => {
            setModo(v as Modo);
            setError(null);
          }}
          options={[
            { value: "sender", label: "Un número propio", description: "Un número de WhatsApp registrado en tu cuenta de Twilio." },
            {
              value: "sandbox",
              label: "Usar el Sandbox de Twilio",
              description: `Solo para pruebas: el número compartido ${numeroLegible(capacidades?.sandbox_e164 ?? "")}, sin comprar uno.`,
            },
          ]}
        />
      )}

      {paso === 0 && enSandbox && (
        <form className="flex flex-col gap-4" onSubmit={(e) => void conectarSandbox(e)} noValidate>
          <p className="text-sm text-body">
            Copia el Account SID y el Auth Token de tu consola de Twilio (Account Info). El código de unión está en
            Messaging › Try it out › Send a WhatsApp message: son las palabras que siguen a «join».
          </p>
          <Field label="Account SID" htmlFor="twilio_sbx_account_sid" error={errores.account_sid} required>
            <Input
              id="twilio_sbx_account_sid"
              autoComplete="off"
              spellCheck={false}
              placeholder="AC…"
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
            />
          </Field>
          <Field label="Auth Token" htmlFor="twilio_sbx_auth_token" error={errores.auth_token} required>
            <InputPassword
              id="twilio_sbx_auth_token"
              etiqueta="Auth Token"
              autoComplete="off"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
            />
          </Field>
          <Field
            label="Código de unión"
            htmlFor="twilio_sbx_join"
            error={errorJoin}
            help="Opcional. Lo mostramos en la ficha para que cada teléfono de prueba se una."
          >
            <Input
              id="twilio_sbx_join"
              autoComplete="off"
              spellCheck={false}
              placeholder="cloud-forgotten"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
          </Field>
          <Field label="Nombre de la conexión" htmlFor="twilio_sbx_label" help="Para reconocerla en Conexiones.">
            <Input
              id="twilio_sbx_label"
              maxLength={120}
              placeholder="WhatsApp Sandbox de Twilio"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </Field>
          <div>
            <Button type="submit" variant="accent" loading={cargando}>
              Conectar el Sandbox
            </Button>
          </div>
        </form>
      )}

      {paso === 0 && !enSandbox && (
        <form className="flex flex-col gap-4" onSubmit={(e) => void descubrir(e)} noValidate>
          <p className="text-sm text-body">
            Copia los datos de la página principal de tu consola de Twilio (Account Info). Solo los usamos para traer
            tus números de WhatsApp y conectarlos; el Auth Token no se vuelve a mostrar.
          </p>
          <Field label="Account SID" htmlFor="twilio_account_sid" error={errores.account_sid} required>
            <Input
              id="twilio_account_sid"
              autoComplete="off"
              spellCheck={false}
              placeholder="AC…"
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
            />
          </Field>
          <Field label="Auth Token" htmlFor="twilio_auth_token" error={errores.auth_token} required>
            <InputPassword
              id="twilio_auth_token"
              etiqueta="Auth Token"
              autoComplete="off"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
            />
          </Field>
          <div>
            <Button type="submit" variant="accent" loading={cargando}>
              Buscar mis números
            </Button>
          </div>
        </form>
      )}

      {paso === 1 && descubierto && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-body">
            Cuenta <span className="text-headline">{descubierto.account.friendly_name}</span>
            {descubierto.account.type === "Trial" && (
              <>
                {" "}
                <Badge variant="warning">De prueba</Badge>
              </>
            )}
          </p>
          {descubierto.senders.length === 0 ? (
            <p className="text-sm text-body">
              Esta cuenta no tiene números de WhatsApp. Regístralo primero en la consola de Twilio (Messaging › Senders ›
              WhatsApp senders) y vuelve a buscar.
            </p>
          ) : (
            <>
              <RadioGroup
                label="Número de WhatsApp"
                name="twilio_sender"
                value={senderSid}
                onValueChange={elegirSender}
                options={descubierto.senders.map((s) => ({
                  value: s.sender_sid,
                  label: etiquetaDeSender(s),
                  description: s.seleccionable
                    ? s.webhook_ajeno
                      ? "Ya manda sus mensajes a otra dirección."
                      : undefined
                    : motivoDeSender(s),
                }))}
              />
              {descubierto.senders.some((s) => !s.seleccionable) && (
                <p className="text-xs text-text-soft">Los números que no están en línea en Twilio no se pueden elegir.</p>
              )}
            </>
          )}
          {sender && !sender.seleccionable && <FormFeedback error={motivoDeSender(sender)} />}
          {sender?.seleccionable && pideConfirmar && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-md border border-status-warning-border bg-status-warning-bg p-4 text-sm"
            >
              <p className="flex items-start gap-2 text-headline">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-fg" aria-hidden />
                <span>
                  Este número ya manda sus mensajes a otra dirección
                  {previo ? (
                    <>
                      {" "}
                      (<span className="break-all">{previo}</span>)
                    </>
                  ) : null}
                  . Al conectarlo la reemplazamos por la de solvershub y lo que la usaba deja de recibir mensajes. Queda
                  anotada en la ficha.
                </span>
              </p>
              <Checkbox
                id="twilio_confirma_webhook"
                label="Entiendo, reemplazar la dirección"
                checked={confirmaWebhook}
                onCheckedChange={setConfirmaWebhook}
              />
            </div>
          )}
          <div>
            <Button
              type="button"
              variant="accent"
              disabled={!sender?.seleccionable || (pideConfirmar && !confirmaWebhook)}
              onClick={aConectar}
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {paso === 2 && sender && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-body">
            Vas a conectar <span className="text-headline tabular-nums">{sender.e164}</span>. Los mensajes que le
            escriban los atiende tu agente desde ahora.
          </p>
          <Field label="Nombre de la conexión" htmlFor="twilio_label" help="Para reconocerla en Conexiones.">
            <Input id="twilio_label" maxLength={120} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Field>
          <div>
            <Button type="button" variant="accent" loading={cargando} onClick={() => void conectar()}>
              Conectar número
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
