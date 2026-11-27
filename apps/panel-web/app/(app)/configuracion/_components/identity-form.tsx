"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Info } from "lucide-react";

import { AsistenteDeConfiguracion } from "@/app/(app)/configuracion/_components/asistente-de-configuracion";
import { CampoOpcion } from "@/app/(app)/configuracion/_components/campo-opcion";
import { EstadoDelAsistente } from "@/app/(app)/configuracion/_components/estado-del-asistente";
import { GuardadoConjunto } from "@/app/(app)/configuracion/_components/guardado-conjunto";
import { AvisoSoloLectura, ControlesEditables } from "@/app/(app)/configuracion/_components/solo-lectura";
import { VistaPreviaIdentidad } from "@/app/(app)/configuracion/_components/vista-previa-identidad";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { CatalogoConfig, IdentitySettings, OpcionConfig, PropuestaAsistente } from "@/lib/api/types";
import { ayudaFueraDeHorario, cuerpoIdentidad } from "@/lib/asistente";
import { useAvisarCambios } from "@/lib/cambios-sin-guardar";
import { conCambiosAplicados, guionDe } from "@/lib/configuracion-asistente";
import { valorEnPalabras } from "@/lib/configuracion-resumen";
import {
  ayudaDeOpcion,
  GRUPOS_IDENTIDAD,
  erroresDeRango,
  indexarCatalogo,
  opcionesDelGrupo,
} from "@/lib/catalogo-config";
import {
  igualProfundo,
  seccionDeClave,
  seccionesConErrores,
  seccionesDeClaves,
  seccionPorId,
  SECCIONES_DE_IDENTIDAD,
  type SeccionId,
} from "@/lib/configuracion-secciones";
import { usePendientes } from "@/lib/frases-pendientes";
import { toast } from "@/lib/toast-store";
import { useAction } from "@/lib/use-action";

const AYUDA_MONEDA = "Solo cambia cómo se muestran los montos en el panel; el cobro usa la moneda de cada habilidad.";

/** Claves que arman cada zona de Identidad (SPEC-37 mantiene las claves; la zona es de producto). */
const CLAVES_PRESENTACION = ["assistant_name", "business_description"];
const CLAVES_DATOS = ["language", "currency", "timezone"];
const CLAVE_PAUSA = "bot_paused";

/** Con el Agent OS el nombre, la descripción y la voz salen de la versión publicada del agente. */
const AVISO_VOZ_DEL_AGENTE =
  "Tu negocio usa el Agent OS: el nombre, la descripción y la voz se aplican cuando publicas una nueva versión del agente, no al guardar aquí.";

function nombrarSecciones(titulos: string[]): string {
  if (titulos.length === 1) return titulos[0];
  if (titulos.length === 2) return `${titulos[0]} y ${titulos[1]}`;
  return `${titulos.slice(0, -1).join(", ")} y ${titulos[titulos.length - 1]}`;
}

/**
 * Formulario de Identidad y de las secciones que comparten su guardado (Horario, Voz y Calidad),
 * pintado desde el catálogo de opciones (SPEC-37, ADR-0166): etiquetas, ayudas, valores y rangos los
 * sirve el backend. Responsabilidad: editar y guardar. El resultado va en un aviso del kit (HU-UI-02)
 * y los errores de validación se marcan junto a cada campo.
 *
 * Se guarda con un solo PUT, pero se reparte en varias secciones del menú: el shell lo mantiene
 * montado mientras se cambia entre ellas, así lo escrito en una no se pierde al pasar a otra.
 * `seccion` decide qué zonas se pintan; el rail «Guardado conjunto» dice qué otras secciones entran.
 */
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
  /** Sección del menú que se está viendo; decide las zonas del catálogo que se pintan. */
  seccion: SeccionId;
  puedeEditar?: boolean;
  /** Para llevar a la persona a la sección donde está un error de validación. */
  irASeccion?: (id: SeccionId) => void;
  /** Tras guardar bien (el cajón se cierra y el resumen muestra el valor nuevo). */
  onGuardado?: (identity: IdentitySettings) => void;
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

  const indice = indexarCatalogo(catalogo);
  const valores = values as unknown as Record<string, unknown>;
  const guardadoValores = guardado as unknown as Record<string, unknown>;
  const clavesCambiadas = Object.keys(valores).filter(
    (clave) => !igualProfundo(valores[clave], guardadoValores[clave]),
  );
  const seccionesCambiadas = catalogo
    ? seccionesDeClaves(clavesCambiadas, (clave) => indice.get(clave)?.grupo)
    : [];
  const sucio = seccionesCambiadas.length > 0;
  // Identidad, Horario, Voz y Calidad comparten formulario; el registro del shell necesita los ids
  // reales para nombrarlas en el aviso de cierre y no confundirlas con «Identidad».
  useAvisarCambios(seccionesCambiadas, sucio);

  const seccionesConError = catalogo
    ? seccionesDeClaves(Object.keys(errores), (clave) => indice.get(clave)?.grupo)
    : [];

  if (!catalogo) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar el catálogo de opciones de la identidad. Recarga la página; si sigue igual, avísanos.
      </p>
    );
  }

  // El asistente por preguntas (HU-CFG-11) solo aparece si el catálogo trae su guion para esta sección y
  // la persona puede editar: un catálogo anterior no lo trae y la sección queda como siempre.
  const guion = puedeEditar ? guionDe(catalogo, seccion) : null;
  const grupos = seccionPorId(seccion).gruposIdentidad ?? [];
  const opcionesDe = (grupo: OpcionConfig["grupo"]) => opcionesDelGrupo(catalogo, grupo, valores);

  const presentacion = opcionesDe("identidad").filter((o) => CLAVES_PRESENTACION.includes(o.clave));
  const datosDelNegocio = opcionesDe("identidad").filter((o) => CLAVES_DATOS.includes(o.clave));
  const idioma = datosDelNegocio.find((o) => o.clave === "language");
  const moneda = datosDelNegocio.find((o) => o.clave === "currency");
  const zonaHoraria = datosDelNegocio.find((o) => o.clave === "timezone");
  const sobrantes = opcionesDe("identidad").filter(
    (o) => !CLAVES_PRESENTACION.includes(o.clave) && !CLAVES_DATOS.includes(o.clave) && o.clave !== CLAVE_PAUSA && o.clave !== "brand_voice",
  );
  const vozDeMarca = indice.get("brand_voice");
  const tonoYEstilo = opcionesDe("voz").filter((o) => !(vozDeMarca && o.clave === "brand_voice"));

  const etiquetaDe = (clave: string): string => {
    const opcion = indice.get(clave);
    return opcion ? valorEnPalabras(opcion, valores[clave]) : String(valores[clave] ?? "");
  };

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
    if (ok) onGuardado?.(completos);
  }

  /** «Revisa los campos marcados», nombrando la sección si el error está en una que no se ve. */
  function textoDeErrores(campos: Record<string, string>): string {
    const fuera = seccionesConErrores(Object.keys(campos), (clave) => indice.get(clave)?.grupo).filter((id) => id !== seccion);
    const visibles = Object.keys(campos).some(
      (clave) => seccionDeClave(clave, indice.get(clave)?.grupo) === seccion,
    );
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

  const ayudaExtra = (opcion: OpcionConfig): string | undefined =>
    opcion.clave === "out_of_hours_message"
      ? ayudaFueraDeHorario(
          values.out_of_hours_message,
          identity.out_of_hours_default_message,
          values.business_ranges.length > 0,
        )
      : opcion.clave === "currency"
        ? `${ayudaDeOpcion(opcion)} ${AYUDA_MONEDA}`
        : undefined;

  const campo = (opcion: OpcionConfig) => (
    <CampoOpcion
      key={opcion.clave}
      opcion={opcion}
      valores={valores}
      onChange={cambiar}
      error={errores[opcion.clave]}
      onPendiente={pendientes.registrar(opcion.clave)}
      etiquetaDe={(clave) => indice.get(clave)?.etiqueta}
      ayudaExtra={ayudaExtra(opcion)}
    />
  );

  const titulosSucios = SECCIONES_DE_IDENTIDAD.filter((id) => seccionesCambiadas.includes(id)).map(
    (id) => seccionPorId(id).titulo,
  );
  const titulosConError = SECCIONES_DE_IDENTIDAD.filter((id) => seccionesConError.includes(id)).map(
    (id) => seccionPorId(id).titulo,
  );
  const textoEstado =
    titulosConError.length > 0
      ? `Hay un campo por revisar en ${nombrarSecciones(titulosConError)}`
      : sucio
        ? seccionesCambiadas.length === 1
          ? `Cambios sin guardar en ${titulosSucios[0]}`
          : `Cambios sin guardar en ${seccionesCambiadas.length} secciones`
        : "Todo guardado";
  const textoGuardar = !sucio
    ? "Guardar cambios"
    : seccionesCambiadas.length === 1
      ? "Guardar 1 sección"
      : `Guardar ${seccionesCambiadas.length} secciones`;

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
        <CardContent className="flex flex-col gap-5 pt-5">
          <GuardadoConjunto
            seccionActual={seccion}
            seccionesSucias={seccionesCambiadas}
            seccionesConError={seccionesConError}
            irASeccion={irASeccion ?? (() => undefined)}
          />

          {seccion === "identidad" && (
            <VistaPreviaIdentidad
              nombre={values.assistant_name}
              descripcion={values.business_description}
              idioma={etiquetaDe("language")}
              moneda={values.currency}
              zona={etiquetaDe("timezone")}
              pausado={values.bot_paused === true}
              puedeEditar={puedeEditar}
              onReactivar={() => cambiar("bot_paused", false)}
            />
          )}

          {/* noValidate: los errores salen en español junto a cada campo, no en la burbuja del navegador. */}
          <form key={version} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
            <ControlesEditables puedeEditar={puedeEditar} className="flex flex-col gap-8">
              {seccion === "identidad" ? (
                <>
                  <section aria-labelledby="zona-presentacion" className="flex flex-col gap-4">
                    <div>
                      <h3 id="zona-presentacion" className="text-sm font-semibold text-headline">
                        Cómo se presenta
                      </h3>
                      <p className="text-sh-label text-text-soft">
                        Lo que el cliente ve y siente en el primer mensaje.
                      </p>
                      <NotaDePublicacion />
                    </div>
                    <div className="flex flex-col gap-4">{presentacion.map(campo)}</div>
                  </section>

                  <section aria-labelledby="zona-datos" className="flex flex-col gap-4 border-t border-border-soft pt-6">
                    <div>
                      <h3 id="zona-datos" className="text-sm font-semibold text-headline">
                        Datos del negocio
                      </h3>
                      <p className="text-sh-label text-text-soft">
                        Se usan en montos, fechas y horarios. No cambian cómo habla el asistente.
                      </p>
                    </div>

                    {idioma && (
                      <div className="flex flex-col gap-1 rounded-lg border border-border-soft bg-surface-2 px-3 py-2.5">
                        <span className="text-sh-label font-medium text-body">{idioma.etiqueta}</span>
                        <span className="text-sm text-headline">{etiquetaDe("language")}</span>
                        <span className="text-sh-label text-text-soft">
                          Se fija al crear el negocio.{" "}
                          <Link
                            href="/ayuda/06-solucion-de-problemas/04-soporte-y-tickets"
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-2"
                          >
                            Escríbenos
                          </Link>{" "}
                          si necesitas cambiarlo.
                        </span>
                      </div>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      {moneda && campo(moneda)}
                      {zonaHoraria && campo(zonaHoraria)}
                    </div>
                  </section>

                  <section aria-labelledby="zona-estado" className="border-t border-border-soft pt-6">
                    <EstadoDelAsistente
                      pausado={values.bot_paused === true}
                      puedeEditar={puedeEditar}
                      onChange={(pausado) => cambiar("bot_paused", pausado)}
                    />
                  </section>

                  {sobrantes.length > 0 && (
                    <section aria-labelledby="zona-otros" className="flex flex-col gap-4 border-t border-border-soft pt-6">
                      <h3 id="zona-otros" className="text-sm font-semibold text-headline">
                        Otros ajustes
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">{sobrantes.map(campo)}</div>
                    </section>
                  )}
                </>
              ) : (
                <>
                  {seccion === "voz" && vozDeMarca && (
                    <section aria-labelledby="zona-voz-marca" className="flex flex-col gap-4">
                      <div>
                        <h3 id="zona-voz-marca" className="text-sm font-semibold text-headline">
                          La voz de tu marca
                        </h3>
                        <p className="text-sh-label text-text-soft">
                          Guía el estilo de todas las respuestas. Se usa en cada turno cuando está escrita.
                        </p>
                        <NotaDePublicacion />
                      </div>
                      {identity.brand_voice_warning && !String(valores.brand_voice ?? "").trim() && (
                        <p
                          role="status"
                          className="rounded-md border border-status-warning-border bg-status-warning-bg px-2.5 py-2 text-sh-label text-status-warning-fg"
                        >
                          Sin voz de marca: el asistente usará solo el tono y la personalidad de abajo.
                        </p>
                      )}
                      {campo(vozDeMarca)}
                    </section>
                  )}

                  {grupos.map((id) => {
                    const grupo = GRUPOS_IDENTIDAD.find((g) => g.id === id);
                    if (!grupo) return null;
                    const opciones = id === "voz" ? tonoYEstilo : opcionesDe(id);
                    if (opciones.length === 0) return null;
                    return (
                      <section
                        key={grupo.id}
                        aria-labelledby={`grupo-${grupo.id}`}
                        className={id === "respuesta" ? "flex flex-col gap-4 border-t border-border-soft pt-6" : "flex flex-col gap-4"}
                      >
                        <div>
                          <h3 id={`grupo-${grupo.id}`} className="text-sm font-semibold text-headline">
                            {grupo.titulo}
                          </h3>
                          <p className="text-sh-label text-text-soft">
                            {grupo.id === "voz"
                              ? "El tono, la calidez, los emojis y el largo de las respuestas."
                              : grupo.descripcion}
                          </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          {opciones.map((opcion) => (
                            <div
                              key={opcion.clave}
                              className={
                                ["texto_largo", "lista_de_textos", "franjas", "elegir_varias", "booleano"].includes(opcion.tipo) ||
                                ["persona_tone", "persona_warmth"].includes(opcion.clave)
                                  ? "md:col-span-2"
                                  : undefined
                              }
                            >
                              {campo(opcion)}
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </>
              )}
            </ControlesEditables>

            {puedeEditar ? (
              <div className="sticky bottom-0 z-10 -mx-5 -mb-5 border-t border-border-soft bg-surface px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p
                    role="status"
                    aria-live="polite"
                    className={
                      titulosConError.length > 0
                        ? "flex min-w-0 items-center gap-1.5 text-sh-label text-status-danger-fg"
                        : sucio
                          ? "flex min-w-0 items-center gap-1.5 text-sh-label text-link"
                          : "flex min-w-0 items-center gap-1.5 text-sh-label text-text-soft"
                    }
                  >
                    <span
                      aria-hidden
                      className={
                        titulosConError.length > 0
                          ? "h-1.5 w-1.5 shrink-0 rounded-full bg-status-danger-fg"
                          : sucio
                            ? "h-1.5 w-1.5 shrink-0 rounded-full bg-link"
                            : "h-1.5 w-1.5 shrink-0 rounded-full bg-status-success-fg"
                      }
                    />
                    {textoEstado}
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={descartarCambios}
                      disabled={!sucio || pending}
                      className="w-full sm:w-auto"
                    >
                      Descartar
                    </Button>
                    <Button type="submit" variant="accent" loading={pending} className="w-full sm:w-auto">
                      {textoGuardar}
                    </Button>
                  </div>
                </div>
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

/** El aviso del Agent OS, una sola vez y con salida: publicar la versión es el paso que aplica. */
function NotaDePublicacion() {
  return (
    <p
      role="note"
      className="mt-2 flex items-start gap-1.5 rounded-md border border-status-info-border bg-status-info-bg px-2.5 py-2 text-sh-label text-status-info-fg"
    >
      <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        {AVISO_VOZ_DEL_AGENTE}{" "}
        <Link href="/agentes" target="_blank" rel="noreferrer" className="underline underline-offset-2">
          Ir a los agentes
        </Link>
        .
      </span>
    </p>
  );
}
