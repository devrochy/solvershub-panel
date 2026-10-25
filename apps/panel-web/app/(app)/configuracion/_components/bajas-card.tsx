"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { BajasSettings, CatalogoConfig } from "@/lib/api/types";
import { ayudaDeOpcion, indexarCatalogo } from "@/lib/catalogo-config";
import { formatList, parseList } from "@/lib/format";
import { useAction } from "@/lib/use-action";

/**
 * Palabras con las que un cliente pide dejar de recibir mensajes (SPEC-37, HU-CFG-05). El
 * dueño las edita; vacío = se usan las de por defecto. Se guarda aparte de la identidad.
 */
export function BajasCard({ bajas, catalogo }: { bajas: BajasSettings; catalogo: CatalogoConfig | null }) {
  const opcion = indexarCatalogo(catalogo).get("palabras_de_baja");
  const [palabras, setPalabras] = useState(bajas.palabras);
  const [error, setError] = useState<string | undefined>();
  const { run, pending } = useAction();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(undefined);
    await run(async () => {
      const res = await fetch("/api/settings/bajas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ palabras }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };
      if (!res.ok) {
        setError(json.fields?.palabras);
        return { ok: false, status: res.status, error: json.error ?? "No se pudieron guardar las palabras de baja." };
      }
      return { ok: true, success: "Palabras de baja guardadas." };
    });
  }

  const porDefecto = bajas.por_defecto.length > 0 ? `Por defecto: ${formatList(bajas.por_defecto)}.` : "";
  const ayuda = [opcion ? ayudaDeOpcion(opcion) : "", porDefecto].filter(Boolean).join(" ");

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-headline">Darse de baja</h3>
            <p className="text-xs text-text-soft">
              Si un cliente escribe una de estas palabras, deja de recibir mensajes de campañas.
            </p>
          </div>
          <Field label={opcion?.etiqueta ?? "Palabras de baja"} htmlFor="palabras_de_baja" help={ayuda} error={error}>
            <Input
              id="palabras_de_baja"
              value={formatList(palabras)}
              onChange={(e) => setPalabras(parseList(e.target.value))}
            />
          </Field>
          <div>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? "Guardando…" : "Guardar palabras de baja"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
