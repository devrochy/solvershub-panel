"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ItemsChecklist } from "@/components/domain/checklist-produccion";
import { RegistroPinForm } from "@/components/domain/registro-pin-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Stepper, type StepItem } from "@/components/ui/stepper";
import { Textarea } from "@/components/ui/textarea";
import type { components } from "@/lib/api/schema";
import { bloquean, pasoActual } from "@/lib/promocion";
import { useAction } from "@/lib/use-action";

type PromotionState = components["schemas"]["PromotionState"];
type PromotionCheck = components["schemas"]["ReadinessItem"];

async function promocion(connectionId: string, payload: Record<string, unknown>) {
  const res = await fetch(`/api/meta/connections/${connectionId}/promotion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>;
  return { ok: res.ok, error: json.error, data: json };
}

const ESTADOS: Record<string, string> = {
  connected: "conectada",
  pending: "pendiente",
  error: "con error",
  disconnected: "desconectada",
};

/**
 * Guía de "Pasar a producción" (HU-CONN-06, un paso a la vez en CON-25): número real, registro,
 * plantillas y verificar. Se abre el primer paso sin hacer; los demás se abren con un toque.
 */
export function PasarAProduccion({ estado }: { estado: PromotionState }) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [checks, setChecks] = useState<PromotionCheck[] | null>(null);
  const id = estado.connection_id;
  // Los pasos 1 a 3 trabajan sobre la conexión de producción de la misma app (la crea el paso 1).
  const prod = estado.production_connection_id;
  const pasos = Object.fromEntries(estado.steps.map((p) => [p.key, p]));
  const actual = pasoActual(estado.steps);
  const promovida = estado.environment === "production";
  const bloqueada = Boolean(estado.blocked_reason) && !promovida;

  async function onNumero(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await run(async () => {
      const res = await promocion(id, {
        action: "number",
        waba_id: String(data.get("waba_id") ?? ""),
        phone_number_id: String(data.get("phone_number_id") ?? ""),
        access_token: String(data.get("access_token") ?? ""),
      });
      return { ok: res.ok, error: res.error, success: "Número real guardado." };
    });
  }

  async function sincronizarPlantillas() {
    await run(async () => {
      const res = await fetch(`/api/meta/connections/${prod}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: res.ok, error: json.error, success: "Plantillas sincronizadas." };
    });
  }

  async function verificar(terminar: boolean) {
    await run(async () => {
      const res = await promocion(id, { action: terminar ? "finish" : "verify" });
      if (!res.ok) return { ok: false, error: res.error };
      const lista = (res.data.checks ?? []) as PromotionCheck[];
      setChecks(lista);
      if (terminar && res.data.promoted !== true) {
        const fallan = bloquean(lista);
        return {
          ok: false,
          error:
            fallan > 0
              ? `Todavía no: ${fallan} chequeo(s) con problemas. Revísalos abajo.`
              : "Todavía no: hay chequeos obligatorios sin dato. Vuelve a verificar en unos segundos.",
        };
      }
      if (terminar && prod) {
        // La de prueba quedó dada de baja: la guía sigue en la de producción.
        router.push(`/conexiones/meta/${prod}/pasar-a-produccion`);
      }
      return {
        ok: true,
        success: terminar ? "La conexión quedó en producción." : "Chequeos actualizados.",
      };
    });
  }

  const [abierto, setAbierto] = useState<string>(actual ?? "verify");
  const estadoDe = (key: string, hecho: boolean): StepItem["state"] =>
    abierto === key ? "current" : hecho ? "complete" : "upcoming";

  const pasoNumero = (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-body">
        Agrega tu número real a una cuenta de WhatsApp Business en tu app de Meta (en modo Live) y pega aquí sus
        identificadores. La conexión de prueba sigue funcionando hasta que termines.
      </p>
      {pasos.real_number?.done && <p className="text-sm text-headline">Número actual: {pasos.real_number.detail}</p>}
      {!promovida && (
        <form className="flex flex-col gap-3" onSubmit={(e) => void onNumero(e)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cuenta de WhatsApp Business (WABA ID)" htmlFor="promo_waba">
              <Input id="promo_waba" name="waba_id" required disabled={bloqueada} inputMode="numeric" />
            </Field>
            <Field label="Identificador del número (Phone number ID)" htmlFor="promo_phone">
              <Input id="promo_phone" name="phone_number_id" required disabled={bloqueada} inputMode="numeric" />
            </Field>
          </div>
          <Field
            label="Token de acceso permanente"
            htmlFor="promo_token"
            help="De un usuario del sistema con acceso a esa cuenta. Si lo dejas vacío, se usa el que ya está guardado."
          >
            <Textarea id="promo_token" name="access_token" rows={2} autoComplete="off" disabled={bloqueada} />
          </Field>
          <div>
            <Button type="submit" loading={pending} disabled={bloqueada} variant={pasos.real_number?.done ? "outline" : "accent"}>
              {pasos.real_number?.done ? "Cambiar número" : "Guardar y seguir"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );

  const pasoRegistro = !pasos.real_number?.done ? (
    <p className="text-sm text-text-soft">Primero guarda el número real.</p>
  ) : pasos.number_registered?.done ? (
    <p className="text-sm text-body">{pasos.number_registered.detail}</p>
  ) : (
    estado.phone_number_id &&
    prod && (
      <RegistroPinForm connectionId={prod} phoneNumberId={estado.phone_number_id} requerido onRegistered={() => router.refresh()} />
    )
  );

  const pasoPlantillas = (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-body">
        Necesitas al menos una plantilla aprobada por Meta para escribirle a un cliente después de 24 horas sin respuesta.
        {pasos.templates?.detail ? ` Ahora: ${pasos.templates.detail}.` : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        {prod && (
          <Button asChild variant="outline">
            <Link href={`/conexiones/meta/${prod}/plantillas`}>Ir a Plantillas</Link>
          </Button>
        )}
        <Button variant="ghost" disabled={pending || !prod} onClick={() => void sincronizarPlantillas()}>
          Traer de Meta
        </Button>
      </div>
    </div>
  );

  const pasoVerificar = (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-body">
        Revisamos la conexión con tu propia app de Meta. Si nada falla, la conexión de prueba se da de baja; sus
        conversaciones de prueba no pasan a tu número real.
      </p>
      {checks && checks.length > 0 && <ItemsChecklist items={checks} connectionId={prod ?? id} />}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={pending || bloqueada || !prod} onClick={() => void verificar(false)}>
          Revisar
        </Button>
        {!promovida && (
          <Button variant="accent" disabled={pending || bloqueada || !prod} onClick={() => void verificar(true)}>
            Pasar a producción
          </Button>
        )}
      </div>
    </div>
  );

  const pasosDeLaGuia: StepItem[] = [
    { id: "real_number", title: "Número real", state: estadoDe("real_number", pasos.real_number?.done ?? false), stateLabel: "Listo", content: pasoNumero },
    {
      id: "number_registered",
      title: "Registro con PIN",
      state: estadoDe("number_registered", pasos.number_registered?.done ?? false),
      stateLabel: "Listo",
      content: pasoRegistro,
    },
    { id: "templates", title: "Plantillas aprobadas", state: estadoDe("templates", pasos.templates?.done ?? false), stateLabel: "Listo", content: pasoPlantillas },
    { id: "verify", title: "Revisar y pasar a producción", state: estadoDe("verify", promovida), stateLabel: "Listo", content: pasoVerificar },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-body">
        {promovida ? "La conexión está en producción" : "La conexión está en prueba"} y{" "}
        {ESTADOS[estado.status] ?? estado.status}.
        {prod && prod !== id && ` La conexión del número real está ${ESTADOS[estado.production_status ?? ""] ?? "sin crear"}.`}
      </p>
      {estado.production_status_reason && prod !== id && <p className="text-sm text-body">{estado.production_status_reason}</p>}

      {promovida && (
        <div role="status" className="rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm">
          <p className="font-medium text-headline">La conexión ya está en producción.</p>
          <p className="text-body">Tus clientes ya pueden escribirle a tu número real.</p>
        </div>
      )}
      {bloqueada && (
        <div role="alert" className="rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-sm text-body">
          {estado.blocked_reason}
        </div>
      )}

      <Card>
        <CardContent className="pt-5">
          <Stepper label="Pasos para pasar a producción" steps={pasosDeLaGuia} onSelect={setAbierto} />
        </CardContent>
      </Card>
    </div>
  );
}
