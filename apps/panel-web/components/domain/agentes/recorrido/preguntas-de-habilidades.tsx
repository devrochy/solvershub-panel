"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";

import type { PreguntaDeLaLista } from "@/components/domain/agentes/recorrido/pregunta-del-recorrido";
import { Badge } from "@/components/ui/badge";
import { GrupoDeOpciones, TarjetaElegible } from "@/components/ui/elegibles";
import { ListaDeFrases } from "@/components/ui/lista-de-frases";
import { frasesDistintas, MAX_FRASES_PROPIAS, type EstadoDelEditor, type SuperpoderEnEditor } from "@/lib/agentes-editor";
import type { Requirement, Superpower } from "@/lib/api/types";
import { estadoEnPantalla, type FormasDePago, type Metodo } from "@/lib/formas-de-pago";
import type { Pendiente } from "@/lib/frases-pendientes";
import { lineaDelHorario, tituloDeLasFrases, type FormasElegidas } from "@/lib/habilidades-de-la-ruta";
import type { HorarioDelAgente } from "@/lib/horario-del-agente";
import type { TipoDeNegocio } from "@/lib/onboarding";
import { copiaDelRequisito, requisitosDeHabilidad } from "@/lib/requisitos-de-agente";

/** Los títulos cortos de las formas de pago en la pregunta (tablero `E2-H`). */
const TITULO_DE_FORMA: Record<Metodo, string> = {
  efectivo_contraentrega: "Contra entrega",
  transferencia: "Transferencia",
  pago_en_linea: "Pago en línea",
};

function ErrorDeLaPregunta({ id, mensaje }: { id: string; mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-sm text-status-danger-fg">
      <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      {mensaje}
    </p>
  );
}

/**
 * Las preguntas de la estación 2 · Habilidades de la ruta (HU-UX-28, tablero `E2-H`), para `ListaDePreguntas`:
 * 1. «¿Qué hará {nombre} por tus clientes?»: los superpoderes del tipo, como tarjetas de casilla, con lo que le
 *    falta a cada uno para funcionar del todo;
 * 2. «¿Cómo te pagan tus clientes?»: solo con Comercio (`formas`), Contra entrega, Transferencia y Pago en
 *    línea, que avisa si falta Wompi;
 * 3. «¿Así te escriben tus clientes?» («¿Así te piden una cita?» en Agenda): por cada superpoder encendido, las
 *    frases sugeridas y las propias. Las propias usan el id `poder-{id}-frase`, que `plegarPendientes` del
 *    editor reconoce para sumar lo escrito y no agregado.
 *
 * Lo que se elige lo guarda el editor al continuar (`/draft`, `payment-forms` y `/flow` si cambia el guion).
 */
export function preguntasDeHabilidades({
  nombre,
  tipo,
  catalogo,
  estado,
  onSuperpoder,
  formas,
  elegidas,
  onForma,
  requisitos,
  minFrases,
  errores,
  erroresPorPoder,
  registrarPendiente,
  soloLectura = false,
}: {
  nombre: string;
  tipo: TipoDeNegocio | null | undefined;
  catalogo: readonly Superpower[];
  estado: EstadoDelEditor;
  onSuperpoder: (id: string, cambio: Partial<SuperpoderEnEditor>) => void;
  /** Formas de pago del agente; `null` sin Comercio (no hay pregunta de pagos). */
  formas: FormasDePago | null;
  elegidas: FormasElegidas;
  onForma: (metodo: Metodo, encendida: boolean) => void;
  requisitos: readonly Requirement[];
  minFrases: number;
  /** `procedures` (ningún superpoder) y los de las formas de pago (`formas`). */
  errores: Record<string, string | undefined>;
  /** El error de cada superpoder (sus frases), por id. */
  erroresPorPoder: Record<string, string>;
  registrarPendiente?: (id: string) => (pendiente: Pendiente | null) => void;
  soloLectura?: boolean;
}): PreguntaDeLaLista[] {
  const activos = catalogo.filter((p) => estado.superpoderes[p.id]?.activo);
  const quien = nombre || "tu agente";

  const superpoderes: PreguntaDeLaLista = {
    id: "superpoderes",
    titulo: `¿Qué hará ${quien} por tus clientes?`,
    ayuda: "Marca lo que quieres que haga. Viene con lo que recomienda SolversHub para tu tipo de negocio.",
    respuesta: activos.map((p) => p.title).join(" · ") || "Nada marcado",
    puedeContinuar: activos.length > 0,
    contenido: (
      <div className="flex flex-col gap-3">
        <GrupoDeOpciones titulo="Lo que hará tu agente" tituloOculto className="grid gap-3 sm:grid-cols-2">
          {catalogo.map((poder) => {
            const encendido = Boolean(estado.superpoderes[poder.id]?.activo);
            const [falta] = requisitosDeHabilidad([...requisitos], poder.skill);
            return (
              <TarjetaElegible
                key={poder.id}
                multiple
                nombre={`poder-${poder.id}`}
                valor={poder.id}
                elegida={encendido}
                onElegir={() => onSuperpoder(poder.id, { activo: !encendido })}
                deshabilitada={soloLectura}
                titulo={poder.title}
                ayuda={poder.description || undefined}
                razon={poder.phrases[0] ? `«${poder.phrases[0]}»` : undefined}
                aviso={encendido && falta ? `Falta: ${copiaDelRequisito(falta).titulo.toLocaleLowerCase("es-CO")}` : undefined}
                className="w-full"
              />
            );
          })}
        </GrupoDeOpciones>
        <ErrorDeLaPregunta id="habilidades-superpoderes-error" mensaje={errores.procedures} />
      </div>
    ),
  };

  const encendidas = formas ? formas.forms.filter((f) => elegidas[f.method] ?? f.enabled) : [];
  const pagos: PreguntaDeLaLista | null = formas
    ? {
        id: "formas-de-pago",
        titulo: "¿Cómo te pagan tus clientes?",
        ayuda: "El agente solo ofrece las formas que marques. Las cuentas y las instrucciones las ajustas en Personalizar.",
        respuesta: encendidas.map((f) => TITULO_DE_FORMA[f.method]).join(" · ") || "Nada marcado",
        puedeContinuar: encendidas.length > 0,
        contenido: (
          <div className="flex flex-col gap-3">
            <GrupoDeOpciones titulo="Formas de pago" tituloOculto className="grid gap-3 sm:grid-cols-3">
              {formas.forms.map((f) => {
                const encendida = elegidas[f.method] ?? f.enabled;
                const { estado: deLaForma, falta } = estadoEnPantalla(
                  f.method,
                  encendida,
                  formas.transfer_accounts,
                  formas.pago_en_linea_disponible,
                );
                const sinWompi = f.method === "pago_en_linea" && !formas.pago_en_linea_disponible;
                return (
                  <TarjetaElegible
                    key={f.method}
                    multiple
                    nombre={`forma-${f.method}`}
                    valor={f.method}
                    elegida={encendida}
                    onElegir={() => onForma(f.method, !encendida)}
                    deshabilitada={soloLectura}
                    titulo={TITULO_DE_FORMA[f.method]}
                    ayuda={f.label !== TITULO_DE_FORMA[f.method] ? f.label : undefined}
                    aviso={sinWompi ? "Necesita Wompi" : deLaForma === "falta_configurar" ? falta : undefined}
                    className="w-full"
                  />
                );
              })}
            </GrupoDeOpciones>
            {formas.forms.some((f) => f.method === "pago_en_linea") && !formas.pago_en_linea_disponible && (
              <p className="text-sm text-body">
                Para cobrar con link de pago, conecta Wompi.{" "}
                <Link className="text-link underline underline-offset-2" href="/conexiones/pagos">
                  Conectar Wompi
                </Link>
              </p>
            )}
            <ErrorDeLaPregunta id="habilidades-formas-error" mensaje={errores.formas} />
          </div>
        ),
      }
    : null;

  const faltanFrases = activos.some((p) => frasesDistintas(p, estado.superpoderes[p.id]?.frases ?? []) < minFrases);
  const propias = activos.reduce((n, p) => n + (estado.superpoderes[p.id]?.frases.length ?? 0), 0);
  const frases: PreguntaDeLaLista = {
    id: "frases",
    titulo: tituloDeLasFrases(tipo),
    ayuda: "Con estas frases reconoce lo que quiere el cliente. Ya vienen sugeridas; suma las tuyas si quieres.",
    respuesta: propias > 0 ? `Frases sugeridas y ${propias === 1 ? "1 tuya" : `${propias} tuyas`}` : "Frases sugeridas",
    puedeContinuar: !faltanFrases,
    contenido: (
      <div className="flex flex-col gap-4">
        {activos.map((poder) => {
          const propiasDelPoder = estado.superpoderes[poder.id]?.frases ?? [];
          const total = frasesDistintas(poder, propiasDelPoder);
          const idLista = `poder-${poder.id}-frase`;
          const idTitulo = `${idLista}-titulo`;
          const idError = `poder-${poder.id}-error`;
          const error = erroresPorPoder[poder.id];
          return (
            <section
              key={poder.id}
              aria-labelledby={idTitulo}
              className="flex flex-col gap-3 rounded-md border border-border-soft bg-bg-deep/40 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id={idTitulo} className="font-display text-base font-semibold text-headline">
                  {poder.title}
                </h3>
                <Badge variant={total >= minFrases ? "success" : "warning"}>
                  {total} frases (mínimo {minFrases})
                </Badge>
              </div>
              {poder.phrases.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label={`Frases sugeridas de ${poder.title}`}>
                  {poder.phrases.map((frase) => (
                    <li key={frase} className="rounded-sm border border-border-soft px-2 py-1 text-sm text-body">
                      {frase}
                    </li>
                  ))}
                </ul>
              )}
              {soloLectura ? (
                propiasDelPoder.length > 0 && <p className="text-sm text-body">Tuyas: {propiasDelPoder.join(" · ")}</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={idLista} className="text-sm font-medium text-headline">
                    Tus frases
                  </label>
                  <ListaDeFrases
                    id={idLista}
                    frases={propiasDelPoder}
                    onChange={(lista) => onSuperpoder(poder.id, { frases: lista })}
                    placeholder="Cómo lo pide un cliente tuyo"
                    agregarLabel="Agregar frase"
                    max={MAX_FRASES_PROPIAS}
                    onPendiente={registrarPendiente?.(idLista)}
                    invalido={Boolean(error)}
                    describedBy={error ? idError : undefined}
                  />
                </div>
              )}
              <ErrorDeLaPregunta id={idError} mensaje={error} />
            </section>
          );
        })}
      </div>
    ),
  };

  return pagos ? [superpoderes, pagos, frases] : [superpoderes, frases];
}

/**
 * La línea del horario en «Opciones avanzadas» de la estación 2 (decisión del dueño, 2026-11-26): solo se lee.
 * Hoy ni la bienvenida ni Nuevo agente preguntan el horario; el agente hereda el del negocio. «Cambiar» lleva a
 * Personalizar › Horario y reglas.
 */
export function LineaDelHorario({
  horario,
  delNegocio,
  hrefCambiar,
}: {
  horario: HorarioDelAgente | null | undefined;
  delNegocio: string | null;
  hrefCambiar: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-display text-base font-semibold text-headline">Horario</p>
      <p className="text-sm text-body">
        {lineaDelHorario(horario, delNegocio)} ·{" "}
        <Link href={hrefCambiar} className="text-link underline-offset-2 hover:underline" aria-label="Cambiar el horario en Personalizar">
          Cambiar
        </Link>
      </p>
    </div>
  );
}
