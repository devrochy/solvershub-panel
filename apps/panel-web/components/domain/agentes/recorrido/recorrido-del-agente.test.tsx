// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { BarraRecomendado } from "@/components/domain/agentes/recorrido/barra-recomendado";
import { CelularDeVistaPrevia } from "@/components/domain/agentes/recorrido/celular-de-vista-previa";
import { NombreSugerido } from "@/components/domain/agentes/recorrido/nombre-sugerido";
import { RecorridoDelAgente } from "@/components/domain/agentes/recorrido/recorrido-del-agente";
import { ChatDeVistaPrevia, VistaPreviaWhatsApp } from "@/components/domain/agentes/recorrido/vista-previa-whatsapp";
import { BarraDePasos } from "@/components/ui/barra-de-pasos";
import { cambiosFrenteARecomendado, errorDelNombre } from "@/lib/ruta-de-lanzamiento";
import { violacionesGraves } from "@/lib/testing/axe";
import { RESPUESTA_SIN_HABILIDAD, conversacionDeHabilidad } from "@/lib/vista-previa";

afterEach(cleanup);

const PASOS = [
  { id: "identidad", titulo: "Identidad" },
  { id: "voz", titulo: "Cómo habla", marca: "cambios" as const },
  { id: "reglas", titulo: "Horario y reglas", corto: "Horario" },
  { id: "flujo", titulo: "Flujo de atención", corto: "Flujo", marca: "revisar" as const },
];

/** La barra se pinta dos veces (escritorio y móvil, una oculta por CSS): jsdom no aplica el CSS. */
function segmentos() {
  return within(screen.getByRole("navigation", { name: "Pasos" })).getAllByRole("list")[0];
}

describe("BarraDePasos", () => {
  it("dice en qué paso va y marca el actual", () => {
    render(<BarraDePasos pasos={PASOS} actual="reglas" modo="libre" onIr={() => {}} etiqueta="Pasos" />);
    expect(screen.getByText("Paso 3 de 4 · Horario")).toBeTruthy();
    const actual = within(segmentos()).getByText("Horario").closest("[aria-current]");
    expect(actual?.getAttribute("aria-current")).toBe("step");
  });

  it("en modo libre deja ir a cualquier paso y anuncia las marcas con texto", () => {
    const onIr = vi.fn();
    render(<BarraDePasos pasos={PASOS} actual="identidad" modo="libre" onIr={onIr} etiqueta="Pasos" />);
    const lista = segmentos();
    fireEvent.click(within(lista).getByRole("button", { name: /Flujo, revisar/ }));
    expect(onIr).toHaveBeenCalledWith("flujo");
    expect(within(lista).getByRole("button", { name: /Cómo habla, con cambios/ })).toBeTruthy();
  });

  it("en orden solo deja volver a pasos recorridos", () => {
    const onIr = vi.fn();
    render(<BarraDePasos pasos={PASOS} actual="reglas" modo="en-orden" onIr={onIr} etiqueta="Pasos" />);
    const botones = within(segmentos()).getAllByRole("button");
    expect(botones.map((b) => b.textContent)).toEqual(["Identidad", "Cómo habla, con cambios"]);
    fireEvent.click(botones[0]);
    expect(onIr).toHaveBeenCalledWith("identidad");
  });
});

describe("VistaPreviaWhatsApp", () => {
  it("cambia la respuesta al apagar un superpoder", () => {
    function Demo() {
      const [activa, setActiva] = useState(true);
      const habilidad = { id: "a", titulo: "Agendar citas", activa, frases: ["¿Tienen cita el sábado?"] };
      return (
        <>
          <button type="button" onClick={() => setActiva((v) => !v)}>
            Alternar
          </button>
          <VistaPreviaWhatsApp negocio="Estudio Lumen" agente="Sofía" mensajes={conversacionDeHabilidad(habilidad)} />
        </>
      );
    }
    render(<Demo />);
    const telefono = screen.getByRole("region", { name: "Vista previa en WhatsApp" });
    expect(within(telefono).getByText(/te ayudo con eso: agendar citas/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Alternar" }));
    expect(within(telefono).getByText(RESPUESTA_SIN_HABILIDAD)).toBeTruthy();
    expect(screen.getByText("Así respondería · vista previa, no envía mensajes")).toBeTruthy();
  });

  it("las sugerencias prueban una frase", () => {
    const onUsar = vi.fn();
    render(
      <VistaPreviaWhatsApp
        negocio="Estudio Lumen"
        agente="Sofía"
        mensajes={[]}
        sugerencias={[{ id: "s", texto: "¿Cuánto vale?", activa: false, onUsar }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "«¿Cuánto vale?»" }));
    expect(onUsar).toHaveBeenCalled();
  });
});

describe("RecorridoDelAgente", () => {
  function Recorrido({ modo = "libre" as "libre" | "en-orden" }) {
    const [actual, setActual] = useState("identidad");
    return (
      <RecorridoDelAgente
        pasos={PASOS}
        actual={actual}
        modo={modo}
        onIr={setActual}
        pregunta={actual === "identidad" ? "¿Cómo se llama tu agente?" : "¿Cómo quieres que hable?"}
        vistaPrevia={{ negocio: "Estudio Lumen", agente: "Sofía", mensajes: [{ tipo: "agente", texto: "Hola" }] }}
        atras={{ texto: "Atrás", onClick: () => {}, deshabilitado: actual === "identidad" }}
        guardar={modo === "libre" ? { texto: "Guardar cambios", onClick: () => {} } : undefined}
        principal={{ texto: "Siguiente", onClick: () => setActual("voz") }}
      >
        <p>Contenido</p>
      </RecorridoDelAgente>
    );
  }

  it("lleva el foco a la pregunta al cambiar de paso, no al montar", () => {
    render(<Recorrido />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(document.activeElement).not.toBe(h1);
    fireEvent.click(screen.getByRole("button", { name: /Siguiente/ }));
    const nuevo = screen.getByRole("heading", { level: 1, name: "¿Cómo quieres que hable?" });
    expect(document.activeElement).toBe(nuevo);
  });

  it("al editar muestra «Guardar cambios»; al crear, no", () => {
    render(<Recorrido />);
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeTruthy();
    cleanup();
    render(<Recorrido modo="en-orden" />);
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
  });

  it("no tiene violaciones graves de axe", async () => {
    const { container } = render(<Recorrido />);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

// ------------------------------------------------------------- ruta de lanzamiento (HU-UX-24)

const ESTACIONES = [
  { id: "tipo", titulo: "Tipo" },
  { id: "habilidades", titulo: "Habilidades" },
  { id: "datos-cliente", titulo: "Datos del cliente" },
  { id: "datos-probar", titulo: "Datos para probar" },
  { id: "revisar", titulo: "Revisar y publicar" },
];

describe("BarraDePasos forma=estaciones", () => {
  function listas() {
    const [escritorio, movil] = within(screen.getByRole("navigation", { name: "Ruta" })).getAllByRole("list");
    return { escritorio, movil };
  }

  it("marca las hechas con la V del logo y «hecho», la actual con aria-current y las siguientes con su número", () => {
    render(<BarraDePasos forma="estaciones" pasos={ESTACIONES} actual="datos-cliente" modo="en-orden" etiqueta="Ruta" />);
    const nodos = within(listas().escritorio).getAllByRole("listitem");
    expect(nodos).toHaveLength(5);
    expect(nodos[0].textContent).toBe("Tipo, hecho");
    expect(nodos[1].textContent).toBe("Habilidades, hecho");
    // La V del wordmark (HU-UX-26), con el degradado de la marca y un id propio por nodo.
    const ves = [nodos[0], nodos[1]].map((n) => n.querySelector("svg"));
    expect(ves.every((v) => v?.getAttribute("viewBox") === "-84 488 188 168")).toBe(true);
    expect(ves.every((v) => v?.getAttribute("aria-hidden") === "true")).toBe(true);
    const degradados = ves.map((v) => v?.querySelector("linearGradient")?.id);
    expect(new Set(degradados).size).toBe(2);
    expect(ves[0]?.querySelector("path")?.getAttribute("fill")).toBe(`url(#${degradados[0]})`);
    expect(nodos[2].querySelector("svg")).toBeNull();
    const actual = nodos[2].querySelector("[aria-current]");
    expect(actual?.getAttribute("aria-current")).toBe("step");
    expect(nodos[2].textContent).toContain("Datos del cliente, actual");
    expect(nodos[3].textContent).toBe("4Datos para probar");
    expect(nodos[4].textContent).toBe("5Revisar y publicar");
    expect(nodos[0].querySelector("[aria-current]")).toBeNull();
  });

  it("en el celular: 5 puntos, el actual alargado, y «Paso 3 de 5 · Datos del cliente»", () => {
    render(<BarraDePasos forma="estaciones" pasos={ESTACIONES} actual="datos-cliente" modo="en-orden" etiqueta="Ruta" />);
    const puntos = within(listas().movil).getAllByRole("listitem");
    expect(puntos).toHaveLength(5);
    expect(puntos[2].getAttribute("aria-current")).toBe("step");
    expect(puntos[2].querySelector("span")?.className).toContain("w-6");
    expect(puntos[3].querySelector("span")?.className).toContain("w-1.5");
    expect(screen.getByText("Paso 3 de 5 · Datos del cliente")).toBeTruthy();
  });

  it("en orden solo deja volver a las estaciones hechas", () => {
    const onIr = vi.fn();
    render(<BarraDePasos forma="estaciones" pasos={ESTACIONES} actual="datos-cliente" modo="en-orden" onIr={onIr} etiqueta="Ruta" />);
    const botones = within(listas().escritorio).getAllByRole("button");
    expect(botones.map((b) => b.textContent)).toEqual(["Tipo, hecho", "Habilidades, hecho"]);
    fireEvent.click(botones[1]);
    expect(onIr).toHaveBeenCalledWith("habilidades");
  });

  it("no tiene violaciones graves de axe", async () => {
    const { container } = render(
      <BarraDePasos forma="estaciones" pasos={ESTACIONES} actual="habilidades" modo="libre" onIr={() => {}} etiqueta="Ruta" />,
    );
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe("BarraRecomendado", () => {
  it("cuenta los cambios y «Usar lo recomendado» vuelve a lo recomendado y desaparece", () => {
    const RECOMENDADO = { tipo: "agenda", duracion: "45", guion: "las-dos" };
    function Demo() {
      const [valores, setValores] = useState<Record<string, string>>({ ...RECOMENDADO });
      return (
        <>
          <button type="button" onClick={() => setValores((v) => ({ ...v, tipo: "cobranza", duracion: "60" }))}>
            Cambiar dos
          </button>
          <BarraRecomendado
            cambios={cambiosFrenteARecomendado(valores, RECOMENDADO).length}
            onUsar={() => setValores({ ...RECOMENDADO })}
          />
          <output>{JSON.stringify(valores)}</output>
        </>
      );
    }
    render(<Demo />);
    expect(screen.getByText("Todo viene con lo recomendado por SolversHub")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Usar lo recomendado" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cambiar dos" }));
    expect(screen.getByText(/2 cambios/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Usar lo recomendado" }));
    expect(screen.queryByRole("button", { name: "Usar lo recomendado" })).toBeNull();
    expect(screen.queryByText(/cambios/)).toBeNull();
    expect(JSON.parse(screen.getByRole("status").textContent ?? "{}")).toEqual(RECOMENDADO);
  });
});

describe("NombreSugerido", () => {
  function Demo() {
    const [nombre, setNombre] = useState("Laura");
    return (
      <>
        <NombreSugerido valor={nombre} onCambiar={setNombre} ideas={["Laura", "Sofía", "Vera"]} />
        <button type="button" disabled={errorDelNombre(nombre) !== null}>
          Seguir
        </button>
      </>
    );
  }

  it("tocar una idea la pone en el campo", () => {
    render(<Demo />);
    const campo = screen.getByRole("textbox", { name: /Nombre de tu agente/ }) as HTMLInputElement;
    expect(campo.value).toBe("Laura");
    expect(screen.getByText("Sugerido")).toBeTruthy();
    const ideas = screen.getByRole("radiogroup", { name: "Ideas de nombre" });
    expect(within(ideas).getAllByRole("radio")).toHaveLength(3);
    fireEvent.click(within(ideas).getByRole("radio", { name: /Sofía/ }));
    expect(campo.value).toBe("Sofía");
    expect((within(ideas).getByRole("radio", { name: /Sofía/ }) as HTMLInputElement).checked).toBe(true);
  });

  it("sin nombre pide uno y no deja seguir", () => {
    render(<Demo />);
    const campo = screen.getByRole("textbox", { name: /Nombre de tu agente/ });
    fireEvent.change(campo, { target: { value: "  " } });
    expect(screen.getByRole("alert").textContent).toBe("Ponle un nombre para seguir");
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect((screen.getByRole("button", { name: "Seguir" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("no tiene violaciones graves de axe", async () => {
    const { container } = render(<Demo />);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe("ChatDeVistaPrevia (simulado)", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("en «Datos del cliente» de Ventas responde fijo, con «escribiendo…» y sin red", () => {
    vi.useFakeTimers();
    const red = vi.spyOn(globalThis, "fetch");
    render(<ChatDeVistaPrevia tipo="ventas" estacion="datos-cliente" agente="Laura" negocio="La Espiga" />);
    expect(screen.getByText("Pruebas de «Datos del cliente» · toca una")).toBeTruthy();
    expect(screen.getByText("Es una vista previa: no le escribe a nadie")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Quiero un domicilio" }));
    expect(screen.getByText("escribiendo…")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Paso a recoger" }) as HTMLButtonElement).disabled).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText("escribiendo…")).toBeNull();
    expect(screen.getByText(/A qué dirección y barrio te lo enviamos/)).toBeTruthy();
    expect(red).not.toHaveBeenCalled();
  });

  it("en «Datos para probar» muestra el producto con el precio cargado", () => {
    vi.useFakeTimers();
    render(
      <ChatDeVistaPrevia
        tipo="ventas"
        estacion="datos-probar"
        agente="Laura"
        negocio="La Espiga"
        cargados={[{ tipo: "producto", nombre: "Torta de zanahoria", detalle: "$ 45.000" }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "¿Cuánto vale Torta de zanahoria?" }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("$ 45.000")).toBeTruthy();
  });

  it("al cambiar de estación cambian las pruebas y la conversación empieza de nuevo", () => {
    const { rerender } = render(<ChatDeVistaPrevia tipo="agenda" estacion="habilidades" agente="Tomás" negocio="La Espiga" />);
    expect(screen.getByRole("button", { name: "Quiero agendar una cita" })).toBeTruthy();
    rerender(<ChatDeVistaPrevia tipo="agenda" estacion="tipo" agente="Tomás" negocio="La Espiga" />);
    expect(screen.getByText("Pruebas de «Tipo» · toca una")).toBeTruthy();
    expect(screen.getByRole("button", { name: "¿Quién eres?" })).toBeTruthy();
  });

  it("no tiene violaciones graves de axe", async () => {
    const { container } = render(<ChatDeVistaPrevia tipo="cobranza" estacion="revisar" agente="Clara" negocio="La Espiga" />);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe("RecorridoDelAgente en disposición ruta", () => {
  function Ruta() {
    const [actual, setActual] = useState("tipo");
    return (
      <RecorridoDelAgente
        disposicion="ruta"
        pasos={ESTACIONES}
        actual={actual}
        modo="en-orden"
        onIr={setActual}
        etiquetaDePasos="Ruta"
        pregunta="¿Qué quieres que haga tu agente?"
        bajada="Laura ya vende; Tomás agenda."
        queSigue="Sigue: Habilidades."
        extremo={<a href="#despues">Seguir después</a>}
        estado="Faltan 2 preguntas"
        celular={<CelularDeVistaPrevia tipo="agenda" estacion="tipo" agente="Tomás" negocio="La Espiga" />}
        principal={{ texto: "Guardar y seguir: Habilidades", onClick: () => setActual("habilidades") }}
      >
        <p>Contenido</p>
      </RecorridoDelAgente>
    );
  }

  it("muestra el eyebrow, el título grande, la bajada, el estado, «qué sigue», el celular y la burbuja", () => {
    render(<Ruta />);
    expect(screen.getAllByText("Paso 1 de 5 · Tipo").length).toBeGreaterThanOrEqual(1);
    const h1 = screen.getByRole("heading", { level: 1, name: "¿Qué quieres que haga tu agente?" });
    expect(h1.className).toContain("md:text-sh-ruta");
    expect(screen.getByText("Laura ya vende; Tomás agenda.")).toBeTruthy();
    expect(screen.getByText("Sigue: Habilidades.")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Faltan 2 preguntas");
    // El celular va en su columna (visible desde xl) y la burbuja lo abre por debajo de 1280 px.
    const celular = screen.getByRole("region", { name: "Vista previa del agente en el celular" });
    expect(celular.parentElement?.className).toContain("xl:flex");
    expect(celular.parentElement?.className).toContain("hidden");
    const burbuja = screen.getByRole("button", { name: "Probar el chat" });
    expect(burbuja.className).toContain("xl:hidden");
    expect(burbuja.className).toContain("fixed");
    fireEvent.click(screen.getByRole("button", { name: /Guardar y seguir/ }));
    expect(screen.getAllByText("Paso 2 de 5 · Habilidades").length).toBeGreaterThanOrEqual(1);
  });

  it("no tiene violaciones graves de axe", async () => {
    const { container } = render(<Ruta />);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
