"use client";

import { useState, type FormEvent } from "react";

import { CampoOpcion } from "@/app/(app)/configuracion/_components/campo-opcion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CatalogoConfig, IdentitySettings } from "@/lib/api/types";
import { ayudaFueraDeHorario, cuerpoIdentidad } from "@/lib/asistente";
import { GRUPOS_IDENTIDAD, erroresDeRango, indexarCatalogo, opcionesDelGrupo } from "@/lib/catalogo-config";
import { usePendientes } from "@/lib/frases-pendientes";
import { leyendaDias } from "@/lib/horario-atencion";
import { toast } from "@/lib/toast-store";
import { useAction } from "@/lib/use-action";

/**
 * Formulario de Identidad del agente, pintado desde el catálogo de opciones (SPEC-37,
 * ADR-0166): etiquetas, ayudas, valores y rangos los sirve el backend. Responsabilidad: editar
 * y guardar. El resultado va en un aviso del kit (HU-UI-02) y los errores de validación se
 * marcan junto a cada campo.
 */
export function IdentityForm({
  identity,
  catalogo,
}: {
  identity: IdentitySettings;
  catalogo: CatalogoConfig | null;
}) {
  const [values, setValues] = useState(identity);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const { run, pending } = useAction();
  const pendientes = usePendientes();

  if (!catalogo) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar el catálogo de opciones de la identidad. Recarga la página; si sigue igual, avísanos.
      </p>
    );
  }

  const valores = values as unknown as Record<string, unknown>;
  const indice = indexarCatalogo(catalogo);
  const cambiar = (clave: string, valor: unknown) => {
    setValues((prev) => ({ ...prev, [clave]: valor }) as IdentitySettings);
    setErrores((prev) => {
      if (!(clave in prev)) return prev;
      const { [clave]: _quitado, ...resto } = prev; // eslint-disable-line @typescript-eslint/no-unused-vars
      return resto;
    });
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    // El texto escrito en una lista y no agregado se suma antes de validar y de guardar.
    const pendiente = pendientes.completar((clave) => (Array.isArray(valores[clave]) ? (valores[clave] as string[]) : undefined));
    const completos = { ...values, ...pendiente.listas } as IdentitySettings;
    const locales = { ...erroresDeRango(catalogo!, completos as unknown as Record<string, unknown>), ...pendiente.errores };
    setErrores(locales);
    if (Object.keys(locales).length > 0) {
      toast.error("Revisa los campos marcados antes de guardar.");
      return;
    }
    setValues(completos);
    pendiente.limpiar();
    await run(async () => {
      const res = await fetch("/api/settings/identity", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // Una sola zona en la UI: el horario de atención usa la del negocio.
        body: JSON.stringify(cuerpoIdentidad(completos, identity)),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; fields?: Record<string, string> };
      if (!res.ok) {
        setErrores(json.fields ?? {});
        return {
          ok: false,
          status: res.status,
          error: json.fields ? "Revisa los campos marcados antes de guardar." : (json.error ?? "No se pudo guardar la identidad."),
        };
      }
      return { ok: true, success: "Identidad guardada." };
    });
  }

  return (
    <Card>
      <CardContent className="pt-5">
        {/* noValidate: los errores salen en español junto a cada campo, no en la burbuja del navegador. */}
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
          {GRUPOS_IDENTIDAD.map((grupo) => {
            const opciones = opcionesDelGrupo(catalogo, grupo.id, valores);
            if (opciones.length === 0) return null;
            return (
              <section key={grupo.id} aria-labelledby={`grupo-${grupo.id}`} className="flex flex-col gap-4">
                <div>
                  <h3 id={`grupo-${grupo.id}`} className="text-sm font-semibold text-headline">
                    {grupo.titulo}
                  </h3>
                  <p className="text-xs text-text-soft">{grupo.descripcion}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {opciones.map((opcion) => (
                    <div
                      key={opcion.clave}
                      className={
                        ["texto_largo", "lista_de_textos", "franjas", "elegir_varias", "booleano"].includes(opcion.tipo)
                          ? "md:col-span-2"
                          : undefined
                      }
                    >
                      <CampoOpcion
                        opcion={opcion}
                        valores={valores}
                        onChange={cambiar}
                        error={errores[opcion.clave]}
                        onPendiente={pendientes.registrar(opcion.clave)}
                        etiquetaDe={(clave) => indice.get(clave)?.etiqueta}
                        ayudaExtra={
                          opcion.clave === "out_of_hours_message"
                            ? ayudaFueraDeHorario(
                                values.out_of_hours_message,
                                identity.out_of_hours_default_message,
                                values.business_ranges.length > 0,
                              )
                            : undefined
                        }
                      />
                      {opcion.clave === "business_ranges" && (
                        <p className="mt-1.5 text-xs text-text-soft">Días: {leyendaDias()}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          <div>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? "Guardando…" : "Guardar identidad"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
