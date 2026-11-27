"use client";

import { useId, useState } from "react";
import { CalendarCheck, Clock, HandCoins, Layers, Repeat, ShoppingBag, Timer } from "lucide-react";

import { BarraRecomendado } from "@/components/domain/agentes/recorrido/barra-recomendado";
import { NombreSugerido } from "@/components/domain/agentes/recorrido/nombre-sugerido";
import { RecorridoDelAgente } from "@/components/domain/agentes/recorrido/recorrido-del-agente";
import { ChatDeVistaPrevia } from "@/components/domain/agentes/recorrido/vista-previa-whatsapp";
import { CelularDeVistaPrevia } from "@/components/domain/agentes/recorrido/celular-de-vista-previa";
import { BarraDePasos } from "@/components/ui/barra-de-pasos";
import { GrupoDeOpciones, TarjetaElegible } from "@/components/ui/elegibles";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { TipoDeNegocio } from "@/lib/onboarding";
import {
  ESTACIONES_DE_LA_BIENVENIDA,
  ESTACIONES_DE_NUEVO_AGENTE,
  NOMBRE_SUGERIDO_DE_LA_BIENVENIDA,
  cambiosFrenteARecomendado,
  ideasDeNombre,
  nombreSugeridoDelTipo,
  type EstacionDeLaRuta,
} from "@/lib/ruta-de-lanzamiento";
import type { CargadoDeVistaPrevia } from "@/lib/vista-previa";

/*
 * Demostraciones del kit «Ruta de lanzamiento» (HU-UX-24, SPEC-49) para `/catalogo`. Cada una guarda
 * su propio estado y deriva sus `id` y `name` con `useId`: el catálogo pinta cada pieza dos veces
 * (claro y oscuro) y los radios de una copia no deben desmarcar los de la otra.
 */

const NEGOCIO = "Panadería La Espiga";

/** Lo cargado de ejemplo en «Datos para probar»: el detalle (precio) es el que puso el dueño. */
const CARGADOS: CargadoDeVistaPrevia[] = [
  { tipo: "producto", nombre: "Torta de zanahoria", detalle: "$ 45.000 · Porción para 8" },
  { tipo: "producto", nombre: "Pan de masa madre", detalle: "$ 18.000" },
  { tipo: "tipo", nombre: "Degustación de tortas", detalle: "45 min" },
  { tipo: "cliente", nombre: "Andrés Rojas", detalle: "Saldo $ 350.000" },
  { tipo: "plan", nombre: "Trimestral", detalle: "$ 330.000" },
];

/** Ruta de estaciones: Nuevo agente en «Datos del cliente», con las dos primeras hechas. */
export function DemoRutaDeEstaciones() {
  const [actual, setActual] = useState<string>("datos-cliente");
  return (
    <div className="flex flex-col gap-6">
      <BarraDePasos
        forma="estaciones"
        etiqueta="Ruta de Nuevo agente"
        modo="en-orden"
        pasos={ESTACIONES_DE_NUEVO_AGENTE}
        actual={actual}
        onIr={setActual}
      />
      <BarraDePasos
        forma="estaciones"
        etiqueta="Ruta de la bienvenida"
        modo="en-orden"
        pasos={ESTACIONES_DE_LA_BIENVENIDA}
        actual="negocio"
      />
    </div>
  );
}

const RECOMENDADO = { tipo: "agenda", guion: "las-dos", duracion: "45" } as const;

/** Opciones con ícono, «Recomendado», un tipo ocupado y uno no disponible, y la barra de lo recomendado. */
export function DemoOpcionesRecomendadas() {
  const id = useId();
  const [valores, setValores] = useState<Record<"tipo" | "guion" | "duracion", string>>({ ...RECOMENDADO });
  const cambios = cambiosFrenteARecomendado(valores, RECOMENDADO);
  const elegir = (clave: keyof typeof valores) => (v: string) => setValores((x) => ({ ...x, [clave]: v }));
  return (
    <div className="flex flex-col gap-5">
      <BarraRecomendado cambios={cambios.length} onUsar={() => setValores({ ...RECOMENDADO })} />
      <GrupoDeOpciones titulo="¿Qué quieres que haga tu agente?" unica className="grid gap-3 sm:grid-cols-2">
        <TarjetaElegible
          nombre={`${id}-tipo`}
          valor="agenda"
          elegida={valores.tipo === "agenda"}
          onElegir={elegir("tipo")}
          titulo="Agenda"
          ayuda="Agenda citas y entregas"
          icono={<CalendarCheck className="h-5 w-5" />}
          baldosa
          etiqueta="Recomendado"
          razon="Laura ya vende; Tomás agenda."
        />
        <TarjetaElegible
          nombre={`${id}-tipo`}
          valor="cobranza"
          elegida={valores.tipo === "cobranza"}
          onElegir={elegir("tipo")}
          titulo="Cobranza"
          ayuda="Recuerda pagos pendientes"
          icono={<HandCoins className="h-5 w-5" />}
          baldosa
        />
        <TarjetaElegible
          nombre={`${id}-tipo`}
          valor="suscripciones"
          elegida={false}
          onElegir={elegir("tipo")}
          titulo="Suscripciones"
          icono={<Repeat className="h-5 w-5" />}
          baldosa
          deshabilitada
          nota="No está en tu servicio por ahora."
        />
        <TarjetaElegible
          nombre={`${id}-tipo`}
          valor="ventas"
          elegida={false}
          onElegir={elegir("tipo")}
          titulo="Ventas"
          icono={<ShoppingBag className="h-5 w-5" />}
          baldosa
          deshabilitada
          nota="Ya tienes un agente «Ventas»: edítalo en vez de crear otro."
          accion={
            <a href="#ruta-opciones" className="font-medium text-link underline underline-offset-2">
              Editar a Laura
            </a>
          }
        />
      </GrupoDeOpciones>
      <div className="grid gap-5 sm:grid-cols-2">
        <GrupoDeOpciones titulo="¿Qué va a agendar?" unica className="flex-col">
          {[
            { v: "degustaciones", t: "Degustaciones", a: "Prueban sabores aquí", i: <Clock className="h-5 w-5" /> },
            { v: "las-dos", t: "Las dos", a: "Degustación y entrega", i: <Layers className="h-5 w-5" /> },
          ].map((o) => (
            <TarjetaElegible
              key={o.v}
              nombre={`${id}-guion`}
              valor={o.v}
              elegida={valores.guion === o.v}
              onElegir={elegir("guion")}
              titulo={o.t}
              ayuda={o.a}
              icono={o.i}
              baldosa
              etiqueta={o.v === RECOMENDADO.guion ? "Recomendado" : undefined}
              className="w-full"
            />
          ))}
        </GrupoDeOpciones>
        <GrupoDeOpciones titulo="¿Cuánto dura cada cita?" unica className="flex-col">
          {["30", "45", "60"].map((m) => (
            <TarjetaElegible
              key={m}
              nombre={`${id}-duracion`}
              valor={m}
              elegida={valores.duracion === m}
              onElegir={elegir("duracion")}
              titulo={`${m} minutos`}
              icono={<Timer className="h-5 w-5" />}
              baldosa
              etiqueta={m === RECOMENDADO.duracion ? "Recomendado" : undefined}
              className="w-full"
            />
          ))}
        </GrupoDeOpciones>
      </div>
    </div>
  );
}

/** Nombre sugerido con ideas: «Laura» en la bienvenida. */
export function DemoNombreSugerido() {
  const [nombre, setNombre] = useState(NOMBRE_SUGERIDO_DE_LA_BIENVENIDA);
  return <NombreSugerido valor={nombre} onCambiar={setNombre} ideas={ideasDeNombre(NOMBRE_SUGERIDO_DE_LA_BIENVENIDA, "ventas")} />;
}

const TIPOS: { valor: TipoDeNegocio; texto: string }[] = [
  { valor: "ventas", texto: "Ventas" },
  { valor: "agenda", texto: "Agenda y encargos" },
  { valor: "cobranza", texto: "Cobranza" },
  { valor: "suscripciones", texto: "Suscripciones" },
];

/** Chat simulado por estación y tipo: sin modelo ni red. Desde la estación 4 usa lo cargado. */
export function DemoChatSimulado() {
  const id = useId();
  const [tipo, setTipo] = useState<TipoDeNegocio>("ventas");
  const [estacion, setEstacion] = useState<EstacionDeLaRuta>("datos-cliente");
  const agente = tipo === "ventas" ? "Laura" : nombreSugeridoDelTipo(tipo);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo de agente" htmlFor={`${id}-tipo`}>
          <Select id={`${id}-tipo`} value={tipo} onChange={(e) => setTipo(e.target.value as TipoDeNegocio)}>
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.texto}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estación" htmlFor={`${id}-estacion`}>
          <Select id={`${id}-estacion`} value={estacion} onChange={(e) => setEstacion(e.target.value as EstacionDeLaRuta)}>
            {ESTACIONES_DE_LA_BIENVENIDA.map((e, i) => (
              <option key={e.id} value={e.id}>
                {i + 1}. {e.titulo}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <ChatDeVistaPrevia
        className="w-full max-w-[21rem]"
        tipo={tipo}
        estacion={estacion}
        agente={agente}
        negocio={NEGOCIO}
        cargados={CARGADOS}
      />
    </div>
  );
}

/** El cascarón con la disposición «ruta»: eyebrow, título grande, bajada, «qué sigue» y el celular a la derecha. */
export function DemoRecorridoEnRuta() {
  const [actual, setActual] = useState<string>("tipo");
  const [nombre, setNombre] = useState("Tomás");
  const indice = ESTACIONES_DE_NUEVO_AGENTE.findIndex((e) => e.id === actual);
  const siguiente = ESTACIONES_DE_NUEVO_AGENTE[indice + 1];
  return (
    <RecorridoDelAgente
      disposicion="ruta"
      nivelDePregunta="h2"
      pasos={ESTACIONES_DE_NUEVO_AGENTE}
      actual={actual}
      modo="en-orden"
      onIr={setActual}
      etiquetaDePasos="Ruta de ejemplo"
      pregunta="¿Cómo se llama tu agente?"
      bajada="Tomás agenda las degustaciones y la entrega de tus encargos."
      queSigue={siguiente ? `Sigue: ${siguiente.titulo}.` : undefined}
      atras={{ texto: "Atrás", onClick: () => setActual(ESTACIONES_DE_NUEVO_AGENTE[Math.max(0, indice - 1)].id), deshabilitado: indice === 0 }}
      principal={{
        texto: siguiente ? `Guardar y seguir: ${siguiente.titulo}` : "Publicar a Tomás",
        onClick: () => siguiente && setActual(siguiente.id),
      }}
      estado="Falta 1 pregunta"
      celular={<CelularDeVistaPrevia tipo="agenda" estacion="tipo" agente={nombre} negocio={NEGOCIO} />}
    >
      <NombreSugerido valor={nombre} onCambiar={setNombre} ideas={ideasDeNombre(nombreSugeridoDelTipo("agenda"), "agenda", 3)} etiqueta="Nombre del agente" />
    </RecorridoDelAgente>
  );
}
