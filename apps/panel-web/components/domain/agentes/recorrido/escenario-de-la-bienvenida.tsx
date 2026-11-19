import { Pencil } from "lucide-react";

import type { TipoDeNegocio } from "@/lib/onboarding";
import type { CargadoDeVistaPrevia } from "@/lib/vista-previa";

import { AnilloDeListo, InicialDelAgente, PildoraDelAgente, TarjetaDelEscenario } from "./escenario-piezas";
import type { EscenarioDeLaEstacion } from "./marco-de-bienvenida";
import { ChatDeVistaPrevia } from "./vista-previa-whatsapp";

/** Las estaciones de la bienvenida que hace el editor del agente (2 a 5). */
export type EstacionDelEditor = "habilidades" | "datos-cliente" | "conocimiento" | "probar";

export type InfoDelEscenario = {
  estacion: EstacionDelEditor;
  nombre: string;
  negocio: string;
  tipo: TipoDeNegocio | null;
  /** Los títulos de las habilidades encendidas. */
  encendidas: readonly string[];
  /** «Lo justo», «Lo mínimo» o «Completo»; `null` si el dueño lo dejó a su medida. */
  cuantoPregunta: string | null;
  /** Los tipos de pedido elegidos («A domicilio», «Recoger en tienda»), solo en Ventas. */
  tiposDePedido: readonly string[];
  consultaHistorial: boolean;
  cargados: readonly CargadoDeVistaPrevia[];
  /** Ya le escribió por la conexión de pruebas (estación 5). */
  probado: boolean;
  /** «Cambiar nombre» lleva a Tu negocio: el nombre lo manda esa estación. */
  onCambiarNombre: () => void;
};

const QUE_CONOCE: Record<TipoDeNegocio, [string, string]> = {
  ventas: ["producto", "productos"],
  agenda: ["servicio", "servicios"],
  cobranza: ["cliente", "clientes"],
  suscripciones: ["plan", "planes"],
};

function cuenta(n: number, [uno, varios]: [string, string]): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/**
 * Lo que gana el agente en cada estación de la bienvenida, para el escenario a pantalla completa (HU-UX-25,
 * tableros `rb2`–`rb5`). En las estaciones 2 a 4 el chat es simulado (D-SPEC-49-4) y no cuenta como prueba;
 * en la 5 no hay chat simulado: la prueba real va por la conexión, en la columna de la ruta.
 */
export function escenarioDeLaBienvenida(info: InfoDelEscenario): EscenarioDeLaEstacion {
  const quien = info.nombre.trim() || "Tu agente";
  const cabecera = (
    <div className="flex flex-wrap items-center gap-2">
      <PildoraDelAgente nombre={quien} />
      <button
        type="button"
        onClick={info.onCambiarNombre}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-escena-acento hover:bg-escena-tarjeta"
      >
        <Pencil className="h-3.5 w-3.5" aria-hidden />
        Cambiar nombre
      </button>
    </div>
  );
  const chat = info.tipo && info.estacion !== "probar" && (
    <ChatDeVistaPrevia
      key={`${info.tipo}:${info.estacion}:${quien}:${info.cargados.length}`}
      tipo={info.tipo}
      estacion={info.estacion === "conocimiento" ? "datos-probar" : info.estacion}
      agente={quien}
      negocio={info.negocio}
      cargados={info.cargados}
      className="min-h-0 flex-1"
    />
  );

  if (info.estacion === "habilidades") {
    const n = info.encendidas.length;
    return {
      agente: quien,
      titulo: `${quien} ya sabe hacer ${n} ${n === 1 ? "cosa" : "cosas"}`,
      bajada: "Viene como lo recomienda SolversHub. Pruébalo en su chat.",
      destacado: <InicialDelAgente nombre={quien} className="h-14 w-14 text-xl ring-4 ring-escena-acento" />,
      children: (
        <>
          {cabecera}
          <div className="grid grid-cols-2 gap-2">
            {info.encendidas.slice(0, 4).map((t) => (
              <TarjetaDelEscenario key={t} etiqueta="Activa" valor={t} hecha />
            ))}
          </div>
          {chat}
        </>
      ),
    };
  }

  if (info.estacion === "datos-cliente") {
    return {
      agente: quien,
      titulo: info.cuantoPregunta ? `${quien} pide ${info.cuantoPregunta.toLocaleLowerCase("es-CO")}` : `${quien} pide lo que elegiste`,
      bajada: "Así llena la ficha de cada cliente, en el orden en que se la pide.",
      destacado: <InicialDelAgente nombre={quien} className="h-14 w-14 text-xl ring-4 ring-escena-acento" />,
      children: (
        <>
          {cabecera}
          <div className="grid grid-cols-2 gap-2">
            <TarjetaDelEscenario etiqueta="Cuánto pregunta" valor={info.cuantoPregunta ?? "A tu medida"} hecha />
            {info.tipo === "ventas" ? (
              <TarjetaDelEscenario
                etiqueta="Tipos de pedido"
                valor={info.tiposDePedido.map((t, i) => (i > 0 ? t.toLocaleLowerCase("es-CO") : t)).join(" y ") || "Sin elegir"}
                hecha={info.tiposDePedido.length > 0}
              />
            ) : (
              <TarjetaDelEscenario
                etiqueta="Consulta el historial"
                valor={info.consultaHistorial ? "Sí" : "No"}
                hecha={info.consultaHistorial}
              />
            )}
          </div>
          {chat}
        </>
      ),
    };
  }

  if (info.estacion === "conocimiento") {
    const palabras = info.tipo ? QUE_CONOCE[info.tipo] : (["dato", "datos"] as [string, string]);
    const n = info.cargados.length;
    const primeros = info.cargados.slice(0, 4);
    return {
      agente: quien,
      titulo: n > 0 ? `${quien} conoce ${cuenta(n, palabras)}` : `${quien} aún no conoce tus ${palabras[1]}`,
      bajada: n > 0 ? "Con lo que cargaste: así responde en el chat." : "Cárgale algunos para probar cómo responde.",
      destacado: <AnilloDeListo hechas={n} total={Math.max(n, 4)} />,
      children: (
        <>
          {cabecera}
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => {
              const c = primeros[i];
              return c ? (
                <TarjetaDelEscenario key={i} etiqueta="En el chat" valor={c.detalle ? `${c.nombre} · ${c.detalle}` : c.nombre} hecha />
              ) : (
                <TarjetaDelEscenario key={i} etiqueta="Por cargar" valor="Espacio libre" hecha={false} />
              );
            })}
          </div>
          {chat}
        </>
      ),
    };
  }

  return {
    agente: quien,
    titulo: info.probado ? `${quien} ya puede responder` : `A ${quien} le falta la última prueba`,
    bajada: info.probado
      ? "Publícalo y queda atendiendo en tu chat de pruebas."
      : "Elige una frase y envíasela como cliente.",
    destacado: <AnilloDeListo hechas={info.probado ? 5 : 4} total={5} />,
    leyenda: "Es una prueba: no se envía nada por WhatsApp.",
    children: (
      <>
        {cabecera}
        <div className="grid grid-cols-2 gap-2">
          <TarjetaDelEscenario etiqueta="Chat de pruebas" valor="Cerrado al público" hecha />
          <TarjetaDelEscenario etiqueta="Última prueba" valor={info.probado ? "Hecha" : "Falta"} hecha={info.probado} />
        </div>
      </>
    ),
  };
}
