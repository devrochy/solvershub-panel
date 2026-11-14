"use client";

import { useState, type FormEvent } from "react";

import { AsistenteDeConfiguracion } from "@/app/(app)/configuracion/_components/asistente-de-configuracion";
import { CampoOpcion } from "@/app/(app)/configuracion/_components/campo-opcion";
import { AvisoSoloLectura, ControlesEditables } from "@/app/(app)/configuracion/_components/solo-lectura";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CatalogoConfig, IdentitySettings, PropuestaAsistente } from "@/lib/api/types";
import { ayudaFueraDeHorario, cuerpoIdentidad } from "@/lib/asistente";
import { useAvisarCambios } from "@/lib/cambios-sin-guardar";
import { conCambiosAplicados, guionDe } from "@/lib/configuracion-asistente";
import { ayudaDeOpcion, GRUPOS_IDENTIDAD, erroresDeRango, indexarCatalogo, opcionesDelGrupo } from "@/lib/catalogo-config";
import {
  igualProfundo,
  seccionesConErrores,
  seccionPorId,
  type SeccionId,
} from "@/lib/configuracion-secciones";
import { usePendientes } from "@/lib/frases-pendientes";
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
/** Con el Agent OS el nombre, la descripción y la voz salen de la versión publicada del agente. */
const AVISO_VOZ_DEL_AGENTE =
  "Tu negocio usa el Agent OS: el nombre, la descripción y la voz se aplican cuando publicas una nueva versión del agente, no al guardar aquí.";

export function IdentityForm({
  identity,
  catalogo,
  seccion,
  puedeEditar = true,
  irASeccion,
  onGuardado,
}: {
  identity: IdentitySettings;
  catalogo: CatalogoConfig | null;
  /** Sección del menú que se está viendo; decide los grupos del catálogo que se pintan. */
  seccion: SeccionId;
  puedeEditar?: boolean;
  /** Para llevar a la persona a la sección donde está un error de validación. */
  irASeccion?: (id: SeccionId) => void;
  /** Tras guardar bien (el cajón se cierra y el resumen muestra el valor nuevo). */
  onGuardado?: () => void;
}) {
  const [values, setValues] = useState(identity);
  // Lo último guardado: la comparación con `values` dice si hay cambios sin guardar.
  const [guardado, setGuardado] = useState(identity);
  const [errores, setErrores] = useState<Record<string, string>>({});
  // Algunos controles (el horario, el texto sin agregar de las listas) guardan su propio texto: al cambiar
  // los valores desde fuera —descartar o aplicar el asistente— se vuelven a montar para que lo muestren.
  const [version, setVersion] = useState(0);
  const { run, pending } = useAction();
  const pendientes = usePendientes();
  const sucio = !igualProfundo(values, guardado);
  useAvisarCambios("identidad", sucio);

  if (!catalogo) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar el catálogo de opciones de la identidad. Recarga la página; si sigue igual, avísanos.
      </p>
    );
  }

  const valores = values as unknown as Record<string, unknown>;
  const indice = indexarCatalogo(catalogo);
  // El asistente por preguntas (HU-CFG-11) solo aparece si el catálogo trae su guion para esta sección y
  // la persona puede editar: un catálogo anterior no lo trae y la sección queda como siempre.
  const guion = puedeEditar ? guionDe(catalogo, seccion) : null;
  const grupos = seccionPorId(seccion).gruposIdentidad ?? [];
  /** Vuelve a lo último guardado: el asistente parte de lo guardado, no de lo editado sin guardar. */
  const descartarCambios = () => {
    setValues(guardado);
    setErrores({});
    pendientes.descartar();
    setVersion((v) => v + 1);
  };
  /** El servidor aplicó la propuesta del asistente: el formulario ya muestra el resultado, sin cambios pendientes. */
  const reflejarAplicado = (propuesta: PropuestaAsistente) => {
    setValues((prev) => conCambiosAplicados(prev, propuesta.cambios));
    setGuardado((prev) => conCambiosAplicados(prev, propuesta.cambios));
    setErrores({});
    setVersion((v) => v + 1);
  };
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
    const ok = await run(async () => {
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
    if (ok) onGuardado?.();
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
    <>
      {guion && (
        <AsistenteDeConfiguracion
          key={guion.seccion}
          guion={guion}
          catalogo={catalogo}
          hayCambiosSinGuardar={sucio}
          onDescartar={descartarCambios}
          onAplicado={reflejarAplicado}
        />
      )}
    <Card>
      <CardContent className="pt-5">
        {/* noValidate: los errores salen en español junto a cada campo, no en la burbuja del navegador. */}
        <form key={version} onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
          <ControlesEditables puedeEditar={puedeEditar} className="flex flex-col gap-8">
          {/* En el orden de la sección (Horario antes que Escalamiento), no el del catálogo. */}
          {grupos.flatMap((id) => GRUPOS_IDENTIDAD.filter((g) => g.id === id)).map((grupo) => {
            const opciones = opcionesDelGrupo(catalogo, grupo.id, valores);
            if (opciones.length === 0) return null;
            return (
              <section key={grupo.id} aria-labelledby={`grupo-${grupo.id}`} className="flex flex-col gap-4">
                <div>
                  <h3 id={`grupo-${grupo.id}`} className="text-sm font-semibold text-headline">
                    {grupo.titulo}
                  </h3>
                  <p className="text-xs text-text-soft">{grupo.descripcion}</p>
                  {(grupo.id === "identidad" || grupo.id === "voz") && (
                    <p role="note" className="mt-1.5 rounded-md border border-border-soft bg-status-info-bg p-2 text-xs text-status-info-fg">
                      {AVISO_VOZ_DEL_AGENTE}
                    </p>
                  )}
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
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          </ControlesEditables>

          {puedeEditar ? (
            <div>
              <Button type="submit" variant="accent" loading={pending}>
                Guardar
              </Button>
            </div>
          ) : (
            <AvisoSoloLectura />
          )}
        </form>
      </CardContent>
    </Card>
    </>
  );
}
