// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { BurbujaDePrueba } from "@/components/domain/agentes/recorrido/burbuja-de-prueba";
import { CelularDeVistaPrevia } from "@/components/domain/agentes/recorrido/celular-de-vista-previa";
import { OpcionesAvanzadas } from "@/components/domain/agentes/recorrido/opciones-avanzadas";
import {
  ListaDePreguntas,
  PreguntaDelRecorrido,
  textoDeFaltan,
} from "@/components/domain/agentes/recorrido/pregunta-del-recorrido";
import { violacionesGraves } from "@/lib/testing/axe";

afterEach(cleanup);

/** Tres preguntas, como la estación 1 de la bienvenida: las respuestas las guarda la estación, no la lista. */
function Estacion({ onTerminar }: { onTerminar?: () => void }) {
  const [tipo, setTipo] = useState("Ventas");
  const [nombre, setNombre] = useState("Laura");
  const [negocio, setNegocio] = useState("La Espiga");
  return (
    <ListaDePreguntas
      onTerminar={onTerminar}
      preguntas={[
        {
          id: "tipo",
          titulo: "¿Qué hará tu agente?",
          ayuda: "Su trabajo principal.",
          respuesta: tipo,
          contenido: (
            <button type="button" onClick={() => setTipo("Agenda")}>
              Elegir Agenda
            </button>
          ),
        },
        {
          id: "nombre",
          titulo: "¿Cómo se llama?",
          ayuda: "Así lo verán tus clientes.",
          respuesta: nombre,
          puedeContinuar: nombre.trim().length > 0,
          contenido: (
            <label>
              Nombre del agente
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </label>
          ),
        },
        {
          id: "negocio",
          titulo: "¿Cómo se llama tu negocio?",
          respuesta: negocio,
          contenido: (
            <label>
              Nombre del negocio
              <input value={negocio} onChange={(e) => setNegocio(e.target.value)} />
            </label>
          ),
        },
      ]}
    />
  );
}

function seccion(nombre: RegExp) {
  return screen.getByRole("region", { name: nombre });
}

describe("ListaDePreguntas (HU-UX-26)", () => {
  it("abre la primera con «Pregunta 1 de 3», su título de 24 px, su ayuda y «Continuar»; las otras, pendientes con su número", () => {
    render(<Estacion />);
    const primera = seccion(/¿Qué hará tu agente\?/);
    expect(within(primera).getByText("Pregunta 1 de 3")).toBeTruthy();
    const titulo = within(primera).getByRole("heading", { level: 2, name: "¿Qué hará tu agente?" });
    expect(titulo.className).toContain("text-sh-h1");
    expect(within(primera).getByText("Su trabajo principal.")).toBeTruthy();
    expect(within(primera).getByRole("button", { name: "Continuar" })).toBeTruthy();

    const segunda = seccion(/¿Cómo se llama\?/);
    expect(within(segunda).getByText("2")).toBeTruthy();
    expect(within(segunda).getByRole("heading").textContent).toBe("¿Cómo se llama?, pregunta 2 de 3, pendiente");
    expect(within(segunda).queryByRole("textbox")).toBeNull();
    expect(within(seccion(/tu negocio/)).getByText("3")).toBeTruthy();
  });

  it("al montar no le roba el foco a la página", () => {
    render(<Estacion />);
    expect(document.activeElement).toBe(document.body);
  });

  it("«Continuar» deja la 1 en una línea con el favicon, su respuesta y «Cambiar», abre la 2 y le pasa el foco", () => {
    render(<Estacion />);
    fireEvent.click(screen.getByRole("button", { name: "Elegir Agenda" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    const primera = seccion(/¿Qué hará tu agente\?/);
    expect(within(primera).getByText("Agenda")).toBeTruthy();
    expect(primera.querySelector('svg[viewBox="-188.3 116.4 376.6 376.6"]')).toBeTruthy();
    expect(within(primera).getByRole("button", { name: "Cambiar: ¿Qué hará tu agente?" }).textContent).toBe("Cambiar");
    expect(within(primera).queryByText(/Pregunta 1 de 3/)).toBeNull();

    const segunda = seccion(/¿Cómo se llama\?/);
    expect(within(segunda).getByText("Pregunta 2 de 3")).toBeTruthy();
    expect(document.activeElement).toBe(within(segunda).getByRole("heading", { level: 2 }));
  });

  it("«Cambiar» reabre la 1 con lo elegido, le pasa el foco y la 2 conserva lo que tenía", () => {
    render(<Estacion />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Nombre del agente" }), { target: { value: "Tomás" } });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar: ¿Qué hará tu agente?" }));

    const primera = seccion(/¿Qué hará tu agente\?/);
    expect(within(primera).getByText("Pregunta 1 de 3")).toBeTruthy();
    expect(document.activeElement).toBe(within(primera).getByRole("heading", { level: 2 }));
    // La 2 vuelve a pendiente, pero lo que escribió sigue ahí al reabrirla.
    expect(within(seccion(/¿Cómo se llama\?/)).queryByRole("textbox")).toBeNull();
    fireEvent.click(within(primera).getByRole("button", { name: "Continuar" }));
    expect((screen.getByRole("textbox", { name: "Nombre del agente" }) as HTMLInputElement).value).toBe("Tomás");
  });

  it("no deja continuar sin lo que pide la pregunta", () => {
    render(<Estacion />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Nombre del agente" }), { target: { value: "  " } });
    expect((screen.getByRole("button", { name: "Continuar" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("la última dice «Listo»: deja todas respondidas, avisa que terminó y el foco queda en la última", () => {
    const onTerminar = vi.fn();
    render(<Estacion onTerminar={onTerminar} />);
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(onTerminar).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("button", { name: /^Cambiar: / })).toHaveLength(3);
    expect(document.activeElement).toBe(within(seccion(/tu negocio/)).getByRole("heading", { level: 2 }));
  });

  it("controlada: avisa el índice abierto para el pie («Faltan 2 preguntas»)", () => {
    const onAbrir = vi.fn();
    render(
      <ListaDePreguntas
        abierta={0}
        onAbrir={onAbrir}
        preguntas={[
          { id: "a", titulo: "Primera", contenido: null },
          { id: "b", titulo: "Segunda", contenido: null },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(onAbrir).toHaveBeenCalledWith(1);
    // Controlada, la lista no cambia sola.
    expect(screen.getByText("Pregunta 1 de 2")).toBeTruthy();
  });

  it("textoDeFaltan cuenta lo que queda", () => {
    expect(textoDeFaltan(2)).toBe("Faltan 2 preguntas");
    expect(textoDeFaltan(1)).toBe("Falta 1 pregunta");
    expect(textoDeFaltan(0)).toBe("Listo");
  });

  it("dos listas en la misma página no repiten ids y no tienen violaciones graves de axe", async () => {
    const { container } = render(
      <>
        <Estacion />
        <Estacion />
      </>,
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Continuar" })[0]);
    const ids = [...container.querySelectorAll("[id]")].map((e) => e.id);
    expect(ids.length).toBe(new Set(ids).size);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe("PreguntaDelRecorrido", () => {
  it("en `h3` cuando la página ya usa `h2`", () => {
    render(<PreguntaDelRecorrido estado="abierta" numero={1} total={1} titulo="¿Dónde atiende?" nivel="h3" onContinuar={() => {}} />);
    expect(screen.getByRole("heading", { level: 3, name: "¿Dónde atiende?" })).toBeTruthy();
  });
});

describe("OpcionesAvanzadas", () => {
  it("es un plegable cerrado con «Opciones avanzadas» y la línea de qué hay adentro; se abre en la misma página", () => {
    const { container } = render(
      <OpcionesAvanzadas descripcion="Tools HTTP, acciones y topes por conversación.">
        <p>Tope por conversación</p>
      </OpcionesAvanzadas>,
    );
    const detalles = container.querySelector("details") as HTMLDetailsElement;
    expect(detalles.open).toBe(false);
    const resumen = container.querySelector("summary") as HTMLElement;
    expect(resumen.textContent).toBe("Opciones avanzadasTools HTTP, acciones y topes por conversación.");
    fireEvent.click(resumen);
    expect(detalles.open).toBe(true);
    expect(screen.getByText("Tope por conversación")).toBeTruthy();
  });
});

describe("CelularDeVistaPrevia", () => {
  it("muestra el chat simulado de la estación, con la caja de texto y el fondo de canales como adorno", () => {
    const { container } = render(<CelularDeVistaPrevia tipo="ventas" estacion="habilidades" agente="Laura" negocio="La Espiga" />);
    const celular = screen.getByRole("region", { name: "Vista previa del agente en el celular" });
    expect(within(celular).getByRole("region", { name: "Vista previa en WhatsApp" })).toBeTruthy();
    expect(within(celular).getByText("Escribe como un cliente…").closest("[aria-hidden]")).toBeTruthy();
    const fondo = container.querySelector('svg[viewBox="0 0 440 860"]');
    expect(fondo?.getAttribute("aria-hidden")).toBe("true");
    expect(fondo?.textContent).toContain("WhatsApp");
    expect(fondo?.textContent).toContain("CRM");
  });

  it("sin estación muestra `sinChat` en la pantalla", () => {
    render(<CelularDeVistaPrevia tipo="ventas" agente="Laura" negocio="La Espiga" sinChat="La última prueba es de verdad." />);
    expect(screen.getByText("La última prueba es de verdad.")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Vista previa en WhatsApp" })).toBeNull();
  });

  it("el aviso se cierra con su ×", () => {
    const onCerrarAviso = vi.fn();
    render(
      <CelularDeVistaPrevia
        tipo="ventas"
        estacion="revisar"
        agente="Laura"
        negocio="La Espiga"
        aviso="Escribe aquí para probar a Laura"
        onCerrarAviso={onCerrarAviso}
      />,
    );
    expect(screen.getByRole("status").textContent).toContain("Escribe aquí para probar a Laura");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(screen.queryByText("Escribe aquí para probar a Laura")).toBeNull();
    expect(onCerrarAviso).toHaveBeenCalledTimes(1);
  });

  it("el aviso también se cierra al tocar una frase de prueba", () => {
    vi.useFakeTimers();
    try {
      render(<CelularDeVistaPrevia tipo="ventas" estacion="revisar" agente="Laura" negocio="La Espiga" aviso="Escribe aquí para probar a Laura" />);
      const frases = screen.getByRole("group", { name: /Pruebas de/ });
      fireEvent.click(within(frases).getAllByRole("button")[0]);
      expect(screen.queryByText("Escribe aquí para probar a Laura")).toBeNull();
      act(() => {
        vi.runAllTimers();
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("no tiene violaciones graves de axe, con aviso", async () => {
    const { container } = render(
      <CelularDeVistaPrevia tipo="agenda" estacion="tipo" agente="Tomás" negocio="La Espiga" aviso="Escribe aquí para probar a Tomás" />,
    );
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe("BurbujaDePrueba", () => {
  function Pagina() {
    return (
      <BurbujaDePrueba>
        <CelularDeVistaPrevia tipo="ventas" estacion="tipo" agente="Laura" negocio="La Espiga" />
      </BurbujaDePrueba>
    );
  }

  it("es un botón fijo abajo a la derecha, solo por debajo de 1280 px", () => {
    render(<Pagina />);
    const burbuja = screen.getByRole("button", { name: "Probar el chat" });
    expect(burbuja.className).toContain("fixed");
    expect(burbuja.className).toContain("bottom-[92px]");
    expect(burbuja.className).toContain("right-5");
    expect(burbuja.className).toContain("xl:hidden");
    expect(burbuja.getAttribute("aria-haspopup")).toBe("dialog");
  });

  it("abre el celular en un panel lateral con nombre; Escape lo cierra y el foco vuelve a la burbuja", async () => {
    render(<Pagina />);
    const burbuja = screen.getByRole("button", { name: "Probar el chat" });
    burbuja.focus();
    fireEvent.click(burbuja);
    const panel = screen.getByRole("dialog", { name: "Probar el chat" });
    expect(within(panel).getByRole("region", { name: "Vista previa del agente en el celular" })).toBeTruthy();
    // El foco entra al panel (foco atrapado por el diálogo).
    expect(panel.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(panel, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(burbuja));
  });

  it("se cierra con la × y devuelve el foco a la burbuja", async () => {
    render(<Pagina />);
    const burbuja = screen.getByRole("button", { name: "Probar el chat" });
    burbuja.focus();
    fireEvent.click(burbuja);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(burbuja));
  });

  it("con aviso lleva un punto y lo dice en texto", () => {
    render(
      <BurbujaDePrueba conAviso>
        <p>celular</p>
      </BurbujaDePrueba>,
    );
    expect(screen.getByRole("button", { name: "Probar el chat, tiene un aviso" })).toBeTruthy();
  });

  it("`enLinea` (catálogo) no es fija", () => {
    render(
      <BurbujaDePrueba enLinea>
        <p>celular</p>
      </BurbujaDePrueba>,
    );
    expect(screen.getByRole("button", { name: "Probar el chat" }).className).not.toContain("fixed");
  });
});
