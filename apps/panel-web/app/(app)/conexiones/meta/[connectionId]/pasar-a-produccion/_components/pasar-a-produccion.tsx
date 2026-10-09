"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, CircleAlert, CircleHelp } from "lucide-react";

import { RegistroPinForm } from "@/components/domain/registro-pin-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { components } from "@/lib/api/schema";
import { bloquean, nombreCheckPromocion, pasoActual } from "@/lib/promocion";
import { useAction } from "@/lib/use-action";

type PromotionState = components["schemas"]["PromotionState"];
type PromotionCheck = components["schemas"]["PromotionCheck"];

async function promocion(connectionId: string, payload: Record<string, unknown>) {
  const res = await fetch(`/api/meta/connections/${connectionId}/promotion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>;
  return { ok: res.ok, error: json.error, data: json };
}

function Paso({
  numero,
  titulo,
  hecho,
  activo,
  children,
}: {
  numero: number;
  titulo: string;
  hecho: boolean;
  activo: boolean;
  children: ReactNode;
}) {
  return (
    <Card aria-current={activo ? "step" : undefined} className={activo ? "border-accent/50" : undefined}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {hecho ? (
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
          ) : (
            <Circle className="h-4 w-4 text-text-soft" aria-hidden />
          )}
          <CardTitle className="text-sm">
            {numero}. {titulo}
          </CardTitle>
          {hecho && <Badge variant="success">listo</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}

function Chequeos({ checks }: { checks: PromotionCheck[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {checks.map((c) => (
        <li key={c.key} className="flex items-start gap-2 text-xs">
          {c.ok === true ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-label="bien" />
          ) : c.ok === false ? (
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-label="falla" />
          ) : (
            <CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-soft" aria-label="sin dato" />
          )}
          <span className="flex flex-col">
            <span className="text-body">{nombreCheckPromocion(c.key)}</span>
            <span className="text-text-soft">{c.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Guía de "Pasar a producción" (HU-CONN-06): número real, registro, plantillas y verificar. */
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
        return {
          ok: false,
          error: `Todavía no: ${bloquean(lista)} chequeo(s) con problemas. Revísalos abajo.`,
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-text-soft">Entorno:</span>
        <Badge variant={promovida ? "success" : "neutral"}>{promovida ? "Producción" : "Prueba"}</Badge>
        <span className="text-text-soft">Estado:</span>
        <Badge variant={estado.status === "connected" ? "success" : "warning"}>{estado.status}</Badge>
        {prod && prod !== id && (
          <>
            <span className="text-text-soft">Conexión de producción:</span>
            <Badge variant={estado.production_status === "connected" ? "success" : "warning"}>
              {estado.production_status}
            </Badge>
          </>
        )}
        <span className="font-mono text-xs text-text-soft">App {estado.meta_app_id}</span>
      </div>
      {estado.production_status_reason && prod !== id && (
        <p className="text-sm text-body">{estado.production_status_reason}</p>
      )}

      {promovida && (
        <div role="status" className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm">
          <p className="font-medium text-headline">La conexión ya está en producción.</p>
          <p className="text-body">Tus clientes ya pueden escribirle a tu número real.</p>
        </div>
      )}
      {bloqueada && (
        <div role="alert" className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-body">
          {estado.blocked_reason}
        </div>
      )}

      <Paso numero={1} titulo="Número real" hecho={pasos.real_number?.done ?? false} activo={actual === "real_number"}>
        <p className="text-sm text-body">
          Agrega tu número real a una cuenta de WhatsApp Business (WABA) en tu app de Meta (en modo Live) y
          pega aquí sus IDs. Usa un token permanente de un usuario del sistema con acceso a esa WABA. Se
          crea la conexión de producción con tu misma app; la de prueba sigue funcionando hasta que
          termines.
        </p>
        {pasos.real_number?.done && (
          <p className="text-sm text-headline">Número actual: {pasos.real_number.detail}</p>
        )}
        {!promovida && (
          <form className="flex flex-col gap-3" onSubmit={(e) => void onNumero(e)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="WABA ID" htmlFor="promo_waba">
                <Input id="promo_waba" name="waba_id" required disabled={bloqueada} />
              </Field>
              <Field label="Phone Number ID" htmlFor="promo_phone">
                <Input id="promo_phone" name="phone_number_id" required disabled={bloqueada} />
              </Field>
            </div>
            <Field
              label="Access token"
              htmlFor="promo_token"
              help="Opcional: si lo dejas vacío se usa el token guardado de la conexión."
            >
              <Textarea id="promo_token" name="access_token" rows={2} autoComplete="off" disabled={bloqueada} />
            </Field>
            <div>
              <Button type="submit" disabled={pending || bloqueada} variant={pasos.real_number?.done ? "outline" : "accent"}>
                {pasos.real_number?.done ? "Cambiar número" : "Guardar número real"}
              </Button>
            </div>
          </form>
        )}
      </Paso>

      <Paso
        numero={2}
        titulo="Registro con PIN"
        hecho={pasos.number_registered?.done ?? false}
        activo={actual === "number_registered"}
      >
        {!pasos.real_number?.done ? (
          <p className="text-sm text-text-soft">Primero guarda el número real.</p>
        ) : pasos.number_registered?.done ? (
          <p className="text-sm text-body">{pasos.number_registered.detail}</p>
        ) : (
          estado.phone_number_id &&
          prod && (
            <RegistroPinForm
              connectionId={prod}
              phoneNumberId={estado.phone_number_id}
              requerido
              onRegistered={() => router.refresh()}
            />
          )
        )}
      </Paso>

      <Paso numero={3} titulo="Plantillas aprobadas" hecho={pasos.templates?.done ?? false} activo={actual === "templates"}>
        <p className="text-sm text-body">
          Necesitas al menos una plantilla aprobada por Meta en la WABA del número real para escribirle a un
          cliente fuera de la ventana de 24 horas.
          {pasos.templates?.detail ? ` Ahora: ${pasos.templates.detail}.` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          {prod && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/conexiones/meta/${prod}/plantillas`}>Ir a Plantillas</Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={pending || !prod}
            onClick={() => void sincronizarPlantillas()}
          >
            Sincronizar con Meta
          </Button>
        </div>
      </Paso>

      <Paso numero={4} titulo="Verificar y pasar a producción" hecho={promovida} activo={actual === "verify"}>
        <p className="text-sm text-body">
          Revisamos la conexión de producción con tu app de Meta (tu token, tu App Secret y tus
          suscripciones), no con la de SolversHub. Si nada falla, la conexión de prueba se da de baja: sus
          conversaciones de prueba no pasan a tu número real.
        </p>
        {checks && <Chequeos checks={checks} />}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={pending || bloqueada || !prod} onClick={() => void verificar(false)}>
            Verificar
          </Button>
          {!promovida && (
            <Button variant="accent" disabled={pending || bloqueada || !prod} onClick={() => void verificar(true)}>
              Pasar a producción
            </Button>
          )}
        </div>
      </Paso>
    </div>
  );
}
