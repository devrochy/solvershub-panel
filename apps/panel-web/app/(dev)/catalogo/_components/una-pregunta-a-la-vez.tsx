"use client";

import { useId, useRef, useState } from "react";

import { BurbujaDePrueba } from "@/components/domain/agentes/recorrido/burbuja-de-prueba";
import { CelularDeVistaPrevia } from "@/components/domain/agentes/recorrido/celular-de-vista-previa";
import { ChatDelCelular } from "@/components/domain/agentes/recorrido/chat-del-celular";
import { avisoDeLaPrueba, LineaDelNivelDeIa } from "@/components/domain/agentes/recorrido/preguntas-de-revisar";
import { OpcionesAvanzadas } from "@/components/domain/agentes/recorrido/opciones-avanzadas";
import { ListaDePreguntas, textoDeFaltan } from "@/components/domain/agentes/recorrido/pregunta-del-recorrido";
import { GrupoDeOpciones, TarjetaElegible } from "@/components/ui/elegibles";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FRASES_DE_PRUEBA, TIPOS_DE_NEGOCIO, type TipoDeNegocio } from "@/lib/onboarding";
import type { ChatDePrueba, TurnoDePrueba } from "@/lib/use-chat-de-prueba";

/*
 * Demostraciones del kit «Una pregunta a la vez» (HU-UX-26, SPEC-52) para `/catalogo`. Como el resto del
 * catálogo, cada pieza se pinta dos veces (claro y oscuro): los `id` y `name` salen de `useId`.
 */

const NEGOCIO = "Panadería La Espiga";

/** Tres preguntas de ejemplo, como la estación 1 de la bienvenida (tablero `E1-E-bienvenida`). */
export function DemoListaDePreguntas() {
  const id = useId();
  const [abierta, setAbierta] = useState(0);
  const [tipo, setTipo] = useState<TipoDeNegocio>("ventas");
  const [nombre, setNombre] = useState("Laura");
  const [negocio, setNegocio] = useState(NEGOCIO);
  const tipoElegido = TIPOS_DE_NEGOCIO.find((t) => t.id === tipo);
  return (
    <div className="flex flex-col gap-3">
      <ListaDePreguntas
        abierta={abierta}
        onAbrir={setAbierta}
        preguntas={[
          {
            id: "tipo",
            titulo: "¿Qué hará tu agente?",
            ayuda: "Su trabajo principal. Las habilidades las ajustas en el siguiente paso.",
            respuesta: tipoElegido?.titulo,
            contenido: (
              <GrupoDeOpciones titulo="Tipo de agente" unica className="grid gap-3 sm:grid-cols-2">
                {TIPOS_DE_NEGOCIO.map((t) => (
                  <TarjetaElegible
                    key={t.id}
                    nombre={`${id}-tipo`}
                    valor={t.id}
                    elegida={tipo === t.id}
                    onElegir={(v) => setTipo(v as TipoDeNegocio)}
                    titulo={t.titulo}
                    etiqueta={t.id === "ventas" ? "Recomendado" : undefined}
                  />
                ))}
              </GrupoDeOpciones>
            ),
          },
          {
            id: "nombre",
            titulo: "¿Cómo se llama?",
            ayuda: "Un nombre de persona hace que la conversación se sienta cercana.",
            respuesta: nombre.trim() || "Sin nombre",
            puedeContinuar: nombre.trim().length > 0,
            contenido: (
              <Field label="Nombre del agente" htmlFor={`${id}-nombre`} help="Así lo verán tus clientes." className="max-w-sm">
                <Input id={`${id}-nombre`} value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </Field>
            ),
          },
          {
            id: "negocio",
            titulo: "¿Cómo se llama tu negocio?",
            ayuda: "Tu agente lo dice al presentarse.",
            respuesta: negocio.trim() || "Sin nombre",
            puedeContinuar: negocio.trim().length > 0,
            contenido: (
              <Field label="Nombre del negocio" htmlFor={`${id}-negocio`} className="max-w-sm">
                <Input id={`${id}-negocio`} value={negocio} onChange={(e) => setNegocio(e.target.value)} />
              </Field>
            ),
          },
        ]}
      />
      <p className="text-sm text-text-soft">Pie de la estación: «{textoDeFaltan(3 - abierta)}»</p>
    </div>
  );
}

/** La sección plegable al final de una estación, con su línea de qué hay adentro. */
export function DemoOpcionesAvanzadas() {
  const id = useId();
  const [corto, setCorto] = useState(true);
  return (
    <OpcionesAvanzadas descripcion="Largo de las respuestas y para qué sirve el agente.">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={`${id}-corto`} className="text-sm text-headline">
          Respuestas cortas
        </label>
        <Switch id={`${id}-corto`} checked={corto} onCheckedChange={setCorto} />
      </div>
    </OpcionesAvanzadas>
  );
}

/** El celular con el chat simulado, el fondo de canales y el aviso de la última prueba. */
export function DemoCelular() {
  return (
    <CelularDeVistaPrevia
      tipo="ventas"
      estacion="habilidades"
      agente="Laura"
      negocio={NEGOCIO}
      aviso="Escribe aquí para probar a Laura"
      className="max-w-[30rem]"
    />
  );
}

/** La burbuja «Probar el chat» (aquí en línea; en la ruta va fija abajo a la derecha por debajo de 1280 px). */
export function DemoBurbuja() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <BurbujaDePrueba enLinea>
        <CelularDeVistaPrevia tipo="agenda" estacion="tipo" agente="Tomás" negocio={NEGOCIO} />
      </BurbujaDePrueba>
      <BurbujaDePrueba enLinea conAviso>
        <CelularDeVistaPrevia tipo="ventas" estacion="revisar" agente="Laura" negocio={NEGOCIO} aviso="Escribe aquí para probar a Laura" />
      </BurbujaDePrueba>
    </div>
  );
}

/**
 * La última prueba de la estación 5 (HU-UX-31): `ChatDelCelular` dentro del celular, con el aviso «Escribe aquí
 * para probar a Laura», que se cierra al escribir, al tocar una frase o con la ×. Aquí el chat no tiene red: contesta
 * siempre lo mismo. En la ruta habla con el borrador (`/api/playground`) o con la conexión de pruebas.
 */
export function DemoUltimaPrueba() {
  const [turnos, setTurnos] = useState<TurnoDePrueba[]>([]);
  const [cargando, setCargando] = useState(false);
  const [avisoCerrado, setAvisoCerrado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chat: ChatDePrueba = {
    turnos,
    setTurnos,
    cargando,
    setEstado: (e) => setCargando(Boolean(e.loading)),
    enviar: async (frase) => {
      setTurnos((t) => [...t, { role: "user", text: frase }]);
      setCargando(true);
      temporizador.current = setTimeout(() => {
        setTurnos((t) => [...t, { role: "assistant", text: "¡Hola! Hoy tenemos pan de masa madre y torta de zanahoria. ¿Qué se te antoja?" }]);
        setCargando(false);
      }, 900);
      return true;
    },
    reiniciar: async () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      setTurnos([]);
      setCargando(false);
      return true;
    },
  };
  return (
    <CelularDeVistaPrevia
      tipo="ventas"
      agente="Laura"
      negocio={NEGOCIO}
      className="max-w-[30rem]"
      aviso={avisoCerrado || turnos.length > 0 ? undefined : avisoDeLaPrueba("Laura")}
      onCerrarAviso={() => setAvisoCerrado(true)}
      pantalla={
        <ChatDelCelular
          chat={chat}
          agente="Laura"
          negocio={NEGOCIO}
          sugerencias={FRASES_DE_PRUEBA.ventas}
          onEscribir={() => setAvisoCerrado(true)}
          className="min-w-0 flex-1"
        />
      }
    />
  );
}

/** «Opciones avanzadas» de la estación 5: solo el nivel de IA, con «Cambiar» (enlace en Nuevo agente, texto en la bienvenida). */
export function DemoNivelDeIa() {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <LineaDelNivelDeIa nivel="estandar" incluyeAvanzado={false} hrefCambiar="#nivel-de-ia" />
      <LineaDelNivelDeIa nivel="avanzado" incluyeAvanzado />
    </div>
  );
}
