"use client";

import { useState, type FormEvent } from "react";

import { CampoOpcion } from "@/app/(app)/configuracion/_components/campo-opcion";
import { AvisoSoloLectura, ControlesEditables } from "@/app/(app)/configuracion/_components/solo-lectura";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CatalogoConfig, IdentitySettings } from "@/lib/api/types";
import { ayudaFueraDeHorario, cuerpoIdentidad } from "@/lib/asistente";
import { useAvisarCambios } from "@/lib/cambios-sin-guardar";
import { ayudaDeOpcion, GRUPOS_IDENTIDAD, erroresDeRango, indexarCatalogo, opcionesDelGrupo } from "@/lib/catalogo-config";
import {
  igualProfundo,
  seccionesConErrores,
  seccionPorId,
  type SeccionId,
} from "@/lib/configuracion-secciones";
import { usePendientes } from "@/lib/frases-pendientes";
import { leyendaDias } from "@/lib/horario-atencion";
import { toast } from "@/lib/toast-store";
import { useAction } from "@/lib/use-action";

const AYUDA_MONEDA = "Solo cambia cómo se muestran los montos en el panel; el cobro usa la moneda de cada habilidad.";

/**
 * Formulario de Identidad del agente, pintado desde el catálogo de opciones (SPEC-37,
 * ADR-0166): etiquetas, ayudas, valores y rangos los sirve el backend. Responsabilidad: editar
 * y guardar. El resultado va en un aviso del kit (HU-UI-02) y los errores de validación se
 * marcan junto a cada campo.
 *
 * Se guarda con un solo PUT, pero se reparte en varias secciones del menú (Identidad, Horario,
 * Voz, Calidad): el shell lo mantiene montado mientras se cambia entre ellas, así lo escrito en
 * una no se pierde al pasar a otra, y `seccion` decide qué grupos del catálogo se pintan.
 */
export function IdentityForm({
  identity,
  catalogo,
  seccion,
  puedeEditar = true,
  irASeccion,
}: {
  identity: IdentitySettings;
  catalogo: CatalogoConfig | null;
  /** Sección del menú que se está viendo; decide los grupos del catálogo que se pintan. */
  seccion: SeccionId;
  puedeEditar?: boolean;
  /** Para llevar a la persona a la sección donde está un error de validación. */
  irASeccion?: (id: SeccionId) => void;
}) {
  const [values, setValues] = useState(identity);
  // Lo último guardado: la comparación con `values` dice si hay cambios sin guardar.
  const [guardado, setGuardado] = useState(identity);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const { run, pending } = useAction();
  const pendientes = usePendientes();
  useAvisarCambios("identidad", !igualProfundo(values, guardado));

  if (!catalogo) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar el catálogo de opciones de la identidad. Recarga la página; si sigue igual, avísanos.
      </p>
    );
  }

  const valores = values as unknown as Record<string, unknown>;
  const indice = indexarCatalogo(catalogo);
  const grupos = seccionPorId(seccion).gruposIdentidad ?? [];
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
      avisarErrores(locales);
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
          error: json.fields ? textoDeErrores(json.fields) : (json.error ?? "No se pudo guardar los cambios."),
        };
      }
      setGuardado(completos);
      return { ok: true, success: "Cambios guardados." };
    });
  }

  /** «Revisa los campos marcados», nombrando la sección si el error está en una que no se ve. */
  function textoDeErrores(campos: Record<string, string>): string {
    const fuera = seccionesConErrores(Object.keys(campos), (clave) => indice.get(clave)?.grupo).filter((id) => id !== seccion);
    const visibles = Object.keys(campos).some((clave) => grupos.some((g) => indice.get(clave)?.grupo === g));
    if (fuera.length === 0) return "Revisa los campos marcados antes de guardar.";
    const nombres = fuera.map((id) => `«${seccionPorId(id).titulo}»`).join(", ");
    return visibles
      ? `Revisa los campos marcados aquí y en ${nombres} antes de guardar.`
      : `Revisa los campos marcados en ${nombres} antes de guardar.`;
  }

  function avisarErrores(campos: Record<string, string>) {
    toast.error(textoDeErrores(campos));
    // Si el error está solo en otra sección, se lleva a la persona hasta allí.
    const fuera = seccionesConErrores(Object.keys(campos), (clave) => indice.get(clave)?.grupo);
    if (fuera.length > 0 && !fuera.includes(seccion)) irASeccion?.(fuera[0]);
  }

  return (
    <Card>
      <CardContent className="pt-5">
        {/* noValidate: los errores salen en español junto a cada campo, no en la burbuja del navegador. */}
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
          <ControlesEditables puedeEditar={puedeEditar} className="flex flex-col gap-8">
          {GRUPOS_IDENTIDAD.filter((grupo) => grupos.includes(grupo.id)).map((grupo) => {
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
                            : opcion.clave === "currency"
                              ? `${ayudaDeOpcion(opcion)} ${AYUDA_MONEDA}`
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

          </ControlesEditables>

          {puedeEditar ? (
            <div className="flex flex-col gap-2">
              <div>
                <Button type="submit" variant="accent" disabled={pending}>
                  {pending ? "Guardando…" : "Guardar cambios"}
                </Button>
              </div>
              <p className="text-xs text-text-soft">
                Identidad, horario, voz y calidad se guardan juntos: se guarda también lo que cambiaste en las otras
                secciones.
              </p>
            </div>
          ) : (
            <AvisoSoloLectura />
          )}
        </form>
      </CardContent>
    </Card>
  );
}
