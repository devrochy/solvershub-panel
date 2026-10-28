"use client";

import { useState, type FormEvent } from "react";

import { CampoOpcion } from "@/app/(app)/configuracion/_components/campo-opcion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { CatalogoConfig, WawebPolitica } from "@/lib/api/types";
import { erroresDeRango, indexarCatalogo } from "@/lib/catalogo-config";
import { toast } from "@/lib/toast-store";
import { useAction } from "@/lib/use-action";
import { cuerpoWaweb, erroresPorClave, exigeAceptarRiesgo, valoresDePolitica } from "@/lib/waweb";

/**
 * Política anti-baneo de WhatsApp Web (SPEC-37, HU-CFG-05). Solo la ve el master: el catálogo
 * solo trae estas opciones para él y el backend responde 403 al resto. Abrir el envío no
 * solicitado exige leer y aceptar el aviso de riesgo vigente.
 */
export function WawebCard({ politica, catalogo }: { politica: WawebPolitica; catalogo: CatalogoConfig }) {
  const indice = indexarCatalogo(catalogo);
  const opciones = [...indice.values()].filter((o) => o.grupo === "whatsapp_web");
  const [valores, setValores] = useState<Record<string, unknown>>(valoresDePolitica(politica));
  const [acepta, setAcepta] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const { run, pending } = useAction();

  const exigeRiesgo = exigeAceptarRiesgo(valores, politica);
  const cambiar = (clave: string, valor: unknown) => {
    setValores((prev) => ({ ...prev, [clave]: valor }));
    setErrores((prev) => {
      if (!(clave in prev)) return prev;
      const { [clave]: _quitado, ...resto } = prev; // eslint-disable-line @typescript-eslint/no-unused-vars
      return resto;
    });
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const locales = erroresDeRango(catalogo, valores);
    if (exigeRiesgo && !acepta) locales.acepta_riesgo = "Acepta el aviso de riesgo para permitir envíos no solicitados.";
    setErrores(locales);
    if (Object.keys(locales).length > 0) {
      toast.error("Revisa los campos marcados antes de guardar.");
      return;
    }
    await run(async () => {
      const res = await fetch("/api/settings/whatsapp-web", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpoWaweb(valores, politica, exigeRiesgo && acepta)),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };
      if (!res.ok) {
        setErrores(erroresPorClave(json.fields));
        return {
          ok: false,
          status: res.status,
          error: json.fields ? "Revisa los campos marcados antes de guardar." : (json.error ?? "No se pudo guardar la política."),
        };
      }
      return { ok: true, success: "Política de WhatsApp Web guardada." };
    });
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-headline">WhatsApp Web (solo equipo SolversHub)</h3>
            <p className="text-xs text-text-soft">
              Política anti-baneo del canal no oficial de este negocio. El dueño del negocio no la ve.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {opciones.map((opcion) => (
              <div key={opcion.clave} className={opcion.tipo === "booleano" ? "md:col-span-2" : undefined}>
                <CampoOpcion
                  opcion={opcion}
                  valores={valores}
                  onChange={cambiar}
                  error={errores[opcion.clave]}
                  etiquetaDe={(clave) => indice.get(clave)?.etiqueta}
                />
              </div>
            ))}
          </div>
          {exigeRiesgo && (
            <label className="flex flex-col gap-1 rounded-md border border-status-warning-fg p-3 text-sm text-headline">
              <span className="flex items-center gap-3">
                <Switch checked={acepta} onCheckedChange={setAcepta} aria-label="Acepto el aviso de riesgo" />
                Entiendo el riesgo: la cuenta puede suspenderse.
              </span>
              <span className="pl-11 text-xs text-text-soft">
                {errores.acepta_riesgo ?? indice.get("waweb_mode")?.explicacion}
              </span>
            </label>
          )}
          <div>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? "Guardando…" : "Guardar política"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
