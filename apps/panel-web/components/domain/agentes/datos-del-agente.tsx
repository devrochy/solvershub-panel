"use client";

import type { ReactNode } from "react";
import { Ban, Check, CircleAlert, ClipboardList, Hand, Lock, MessageSquareText, UserRound } from "lucide-react";

import { BarraRecomendado } from "@/components/domain/agentes/recorrido/barra-recomendado";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GrupoDeOpciones, TarjetaElegible } from "@/components/ui/elegibles";
import { EmptyState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/switch";
import {
  agruparPorModulo,
  cambiosDeAccion,
  cambiosFrenteAPorDefecto,
  CUANTO_PREGUNTA,
  CUANTO_PREGUNTA_RECOMENDADO,
  cuantoPreguntaActual,
  estaAjustada,
  METODOS_ENTREGA,
  NIVELES,
  opcionesDeCuantoPregunta,
  pistaDePiso,
  pistaDePorDefecto,
  resumenDeCuantoPregunta,
  type CuantoPregunta,
  type MetodoEntrega,
  type AgenteDatos,
  type AccionPolitica,
  type CampoPolitica,
  type EstadoDatos,
  type NivelDato,
} from "@/lib/datos-cliente";
import { cn } from "@/lib/utils";

const ICONO_DE_CUANTO: Record<CuantoPregunta, ReactNode> = {
  minimo: <UserRound className="h-5 w-5" />,
  justo: <ClipboardList className="h-5 w-5" />,
  completo: <MessageSquareText className="h-5 w-5" />,
};

/**
 * Ícono de cada nivel de un dato (HU-AOS-85). El nivel «Recomendado» lleva su ícono; la etiqueta
 * «Recomendado» de «Cuánto pregunta» es otra cosa (el valor por defecto) y va como insignia.
 */
const ICONO_DE_NIVEL: Record<NivelDato, ReactNode> = {
  requerido: <CircleAlert aria-hidden className="h-3.5 w-3.5" />,
  recomendado: <Hand aria-hidden className="h-3.5 w-3.5" />,
  no_pedir: <Ban aria-hidden className="h-3.5 w-3.5" />,
};

/**
 * «Datos del cliente» de un agente especialista (HU-CRM-28): qué datos pide ESE agente en cada
 * operación que puede ejecutar. El estado y el guardado viven en el editor; este componente solo lo
 * presenta.
 *
 * Con `comoPaso` (HU-AOS-85) es el paso propio de Personalizar: la pregunta del paso es el título,
 * no hay botón propio (guarda «Guardar cambios» del editor) y los títulos empiezan en `h3`. Sin
 * `comoPaso` es una sección dentro de otro paso (la creación rápida y la bienvenida, hasta HU-AOS-86 y
 * HU-UX-25): conserva su botón y sus títulos empiezan en `h4`, bajo el `h3` de la sección.
 */
export function DatosDelAgente({
  politica,
  estado,
  guardado,
  herramientas,
  metodos,
  puedeEditar,
  guardando,
  sinGuardar,
  onNivel,
  onRestablecer,
  onHerramientas,
  onMetodo,
  onGuardar,
  onCuantoPregunta,
  onUsarRecomendado,
  comoPaso = false,
  errorDeMetodos,
}: {
  politica: AgenteDatos;
  estado: EstadoDatos;
  guardado: EstadoDatos;
  herramientas: boolean;
  metodos: MetodoEntrega[];
  puedeEditar: boolean;
  guardando: boolean;
  sinGuardar: boolean;
  onNivel: (accionId: string, clave: string, nivel: NivelDato) => void;
  onRestablecer: (accionId: string) => void;
  onHerramientas: (activo: boolean) => void;
  onMetodo: (metodo: MetodoEntrega, activo: boolean) => void;
  onGuardar?: () => void;
  /** Elige «Lo mínimo», «Lo justo» o «Completo» para todas las operaciones. */
  onCuantoPregunta?: (nivel: CuantoPregunta) => void;
  /** «Usar lo recomendado»: todos los datos a su valor por defecto. */
  onUsarRecomendado?: () => void;
  comoPaso?: boolean;
  /** Error de «Tipos de pedido» (por ejemplo, ninguno encendido). */
  errorDeMetodos?: string;
}) {
  const grupos = agruparPorModulo(politica.acciones);
  const procedimientos = politica.procedimientos ?? [];
  const conVentas = grupos.some((grupo) => grupo.modulo === "ventas");
  const bloqueado = !puedeEditar || guardando;
  const opciones = opcionesDeCuantoPregunta(politica);
  const cuanto = cuantoPreguntaActual(politica, estado);
  const cambiosFrenteAlRecomendado = cambiosFrenteAPorDefecto(politica, estado);
  // Títulos: el paso trae su pregunta (h2); como sección, la sección ya tiene su h3.
  const Modulo = comoPaso ? "h3" : "h4";
  const Bloque = comoPaso ? "h3" : "h4";
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-sm text-text-soft">
        Elige, para cada operación de este agente, qué datos son imprescindibles, cuáles conviene pedir y cuáles no
        hace falta pedir. Se aplica a las próximas conversaciones de este agente, sin publicar una versión nueva.
      </p>

      {grupos.length > 0 && puedeEditar && onUsarRecomendado && (
        <BarraRecomendado cambios={cambiosFrenteAlRecomendado} onUsar={onUsarRecomendado} />
      )}

      {opciones.length > 1 && onCuantoPregunta && (
        <GrupoDeOpciones
          unica
          titulo="Cuánto pregunta"
          ayuda="«Lo justo» es lo que trae cada operación por defecto. Puedes ajustar dato por dato más abajo."
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {CUANTO_PREGUNTA.filter((n) => opciones.includes(n.id)).map((nivel) => (
            <TarjetaElegible
              key={nivel.id}
              nombre="cuanto-pregunta"
              valor={nivel.id}
              elegida={cuanto === nivel.id}
              onElegir={(valor) => onCuantoPregunta(valor as CuantoPregunta)}
              titulo={nivel.titulo}
              ayuda={resumenDeCuantoPregunta(politica, nivel.id)}
              icono={ICONO_DE_CUANTO[nivel.id]}
              baldosa
              etiqueta={nivel.id === CUANTO_PREGUNTA_RECOMENDADO ? "Recomendado" : undefined}
              deshabilitada={bloqueado}
            />
          ))}
        </GrupoDeOpciones>
      )}

      <Card>
        <CardContent className="flex items-start justify-between gap-4 pt-5">
          <div className="min-w-0">
            <p id="herramientas-titulo" className="text-sm font-medium text-headline">
              Que este agente consulte los datos y el historial del cliente
            </p>
            <p className="mt-1 max-w-xl text-sm text-text-soft">
              El agente verá qué datos faltan antes de pedirlos y un resumen de lo que el cliente tiene en sus módulos.
              Está apagado hasta que lo enciendas.
            </p>
          </div>
          <Switch
            checked={herramientas}
            onCheckedChange={onHerramientas}
            disabled={bloqueado}
            aria-label="Que este agente consulte los datos y el historial del cliente"
          />
        </CardContent>
      </Card>

      {conVentas && (
      <Card>
        <CardContent className="pt-5">
          <Bloque className="text-sm font-semibold text-headline">
            {comoPaso ? "Tipos de pedido" : "Métodos de entrega que puede ofrecer"}
          </Bloque>
          <p className="mt-1 max-w-xl text-sm text-text-soft">
            El agente solo ofrecerá los métodos encendidos. Deja al menos uno para que pueda cerrar pedidos.
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {METODOS_ENTREGA.map((metodo) => {
              const activo = metodos.includes(metodo.id);
              const ultimo = activo && metodos.length === 1;
              return (
                <li key={metodo.id} className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-headline">{metodo.etiqueta}</p>
                    <p className="text-xs text-text-soft">
                      {metodo.ayuda}
                      {ultimo ? " Debe quedar al menos uno." : ""}
                    </p>
                  </div>
                  <Switch
                    checked={activo}
                    onCheckedChange={(valor) => onMetodo(metodo.id, valor)}
                    disabled={bloqueado || ultimo}
                    aria-label={`Ofrecer ${metodo.etiqueta.toLowerCase()}`}
                  />
                </li>
              );
            })}
          </ul>
          {errorDeMetodos && (
            <p role="alert" className="mt-3 text-sm text-status-danger-fg">
              {errorDeMetodos}
            </p>
          )}
        </CardContent>
      </Card>
      )}

      {grupos.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <EmptyState
              title="Este agente no pide datos en sus operaciones"
              description="Cuando enciendas una acción que necesite datos del cliente (un pedido, una cita o una inscripción), aquí podrás elegir qué le pide."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {!puedeEditar && (
            <p role="note" className="text-sm text-text-soft">
              Solo puedes ver esta configuración. Para cambiarla, pídele acceso a quien administra el negocio.
            </p>
          )}
          {grupos.map((grupo) => (
            <section key={grupo.modulo} aria-labelledby={`modulo-${grupo.modulo}`} className="flex flex-col gap-3">
              <Modulo id={`modulo-${grupo.modulo}`} className="text-sm font-semibold text-headline">
                {grupo.nombre}
              </Modulo>
              {grupo.acciones.map((accion) => (
                <TarjetaDeAccion
                  key={accion.id}
                  accion={accion}
                  estado={estado[accion.id] ?? {}}
                  puedeEditar={puedeEditar}
                  deshabilitado={guardando}
                  ajustada={estaAjustada(politica, estado, accion.id)}
                  nivelDeTitulo={comoPaso ? "h4" : "h5"}
                  cambios={cambiosDeAccion(politica, estado, accion.id, guardado)}
                  onNivel={(clave, nivel) => onNivel(accion.id, clave, nivel)}
                  onRestablecer={() => onRestablecer(accion.id)}
                />
              ))}
            </section>
          ))}
          {puedeEditar && !comoPaso && onGuardar && (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="accent" disabled={guardando || !sinGuardar} onClick={onGuardar}>
                {guardando ? "Guardando…" : "Guardar datos del cliente"}
              </Button>
              {sinGuardar && !guardando && <span className="text-sm text-text-soft">Tienes cambios sin guardar.</span>}
            </div>
          )}
        </>
      )}

      {procedimientos.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <Bloque className="text-sm font-semibold text-headline">Datos que exige cada superpoder</Bloque>
            <p className="mt-1 max-w-2xl text-sm text-text-soft">
              Estos datos los define el recorrido del superpoder. No se cambian desde esta pantalla: si un superpoder
              los necesita, el agente los pide aunque aquí no aparezcan.
            </p>
            <ul className="mt-3 flex flex-col gap-3">
              {procedimientos.map((procedimiento) => (
                <li key={procedimiento.id} className="rounded-md border border-border-soft p-3">
                  <p className="text-sm font-medium text-headline">{procedimiento.titulo}</p>
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {procedimiento.datos.map((dato) => (
                      <li
                        key={dato.clave}
                        className="rounded-full border border-border-soft px-2 py-0.5 text-xs text-text-soft"
                      >
                        {dato.etiqueta}
                        {dato.condicion ? ` · ${dato.condicion}` : ""}
                        {dato.obligatorio ? "" : " · condicional"}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TarjetaDeAccion({
  accion,
  estado,
  puedeEditar,
  deshabilitado,
  ajustada,
  cambios,
  nivelDeTitulo,
  onNivel,
  onRestablecer,
}: {
  nivelDeTitulo: "h4" | "h5";
  accion: AccionPolitica;
  estado: Record<string, NivelDato>;
  puedeEditar: boolean;
  deshabilitado: boolean;
  ajustada: boolean;
  cambios: number;
  onNivel: (clave: string, nivel: NivelDato) => void;
  onRestablecer: () => void;
}) {
  const titulo = `accion-${accion.id}`;
  const Titulo = nivelDeTitulo;
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Titulo id={titulo} className="text-sm font-medium text-headline">
            {accion.etiqueta}
            {cambios > 0 && <span className="ml-2 text-xs font-normal text-text-soft">· cambios sin guardar</span>}
          </Titulo>
          {puedeEditar && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deshabilitado || !ajustada}
              onClick={onRestablecer}
              aria-label={`Restablecer ${accion.etiqueta}`}
            >
              Restablecer
            </Button>
          )}
        </div>
        <ul aria-labelledby={titulo} className="mt-3 flex flex-col divide-y divide-border-soft">
          {accion.campos.map((campo) => (
            <FilaDeDato
              key={campo.clave}
              accion={accion}
              campo={campo}
              nivel={estado[campo.clave] ?? campo.nivel}
              bloqueado={!puedeEditar || deshabilitado || !campo.ajustable}
              onNivel={(nivel) => onNivel(campo.clave, nivel)}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function FilaDeDato({
  accion,
  campo,
  nivel,
  bloqueado,
  onNivel,
}: {
  accion: AccionPolitica;
  campo: CampoPolitica;
  nivel: NivelDato;
  bloqueado: boolean;
  onNivel: (nivel: NivelDato) => void;
}) {
  const nombre = `${accion.id}__${campo.clave}`;
  const pista = campo.ajustable ? pistaDePorDefecto(campo, nivel) : null;
  const idNota = `${nombre}-nota`;
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm text-headline">{campo.etiqueta}</p>
        {!campo.ajustable && (
          <p id={idNota} className="flex items-center gap-1 text-xs text-text-soft">
            <Lock aria-hidden className="h-3 w-3" />
            {pistaDePiso(accion)}
          </p>
        )}
        {pista && (
          <p id={idNota} className="text-xs text-text-soft">
            {pista}
          </p>
        )}
      </div>
      <div
        role="radiogroup"
        aria-label={`${campo.etiqueta} (${accion.etiqueta})`}
        aria-describedby={!campo.ajustable || pista ? idNota : undefined}
        className="inline-flex shrink-0 overflow-hidden rounded-md border border-control-border"
      >
        {NIVELES.map((opcion) => {
          const marcado = nivel === opcion.id;
          return (
            <label
              key={opcion.id}
              title={opcion.ayuda}
              className={cn(
                "flex cursor-pointer items-center gap-1 border-l border-control-border px-3 py-2 text-sm first:border-l-0",
                "transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-focus",
                marcado ? "bg-hover font-medium text-headline" : "text-body hover:text-headline",
                bloqueado && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name={nombre}
                value={opcion.id}
                checked={marcado}
                disabled={bloqueado}
                onChange={() => onNivel(opcion.id)}
                className="sr-only"
              />
              {marcado ? <Check aria-hidden className="h-3.5 w-3.5" /> : ICONO_DE_NIVEL[opcion.id]}
              {opcion.etiqueta}
            </label>
          );
        })}
      </div>
    </li>
  );
}
