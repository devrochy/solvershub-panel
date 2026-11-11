// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
// El chat de prueba pide su historial al montar: aquí basta con saber por qué conexión se abrió.
vi.mock("@/app/(app)/asistente/_components/chat-prueba", () => ({
  ChatPrueba: ({ conexionId }: { conexionId?: string }) => <div data-testid="chat">{conexionId}</div>,
}));

import type { ConexionDelAgente } from "@/lib/agentes-ficha";
import { violacionesGraves } from "@/lib/testing/axe";

import { ConexionesDelAgente } from "./conexiones-del-agente";
import { IndicadoresDelAgente } from "./indicadores-del-agente";
import { ProbarAgente } from "./probar-agente";
import { SelectorDeAgentes } from "./selector-de-agentes";

afterEach(cleanup);

function fila(cambios: Partial<ConexionDelAgente> = {}): ConexionDelAgente {
  return {
    id: "c-1",
    label: "WhatsApp tienda",
    tipo: "WhatsApp oficial (Meta)",
    rol: "Especialista",
    prioridad: 100,
    principal: true,
    atiende: true,
    estado: { label: "Sana", tono: "success" },
    version: 3,
    ...cambios,
  };
}

describe("pestaña Dónde atiende del agente (HU-UX-09, AGT-08)", () => {
  it("dice en palabras cuándo atiende y el estado; cada fila abre la ficha de la conexión", async () => {
    const { container } = render(
      <ConexionesDelAgente
        filas={[fila(), fila({ id: "c-2", label: "Chat web", tipo: "Chat web", principal: false, prioridad: 200, estado: { label: "Pausada", tono: "neutral" }, version: null })]}
        nombre="Ventas"
        publicado
        asignarHref="/agentes/a-1/editar?paso=publicar"
      />,
    );
    const tabla = screen.getByRole("table");
    const encabezados = within(tabla).getAllByRole("columnheader").map((h) => h.textContent?.trim());
    expect(encabezados.join("|")).toMatch(/Conexión\|Cuándo atiende.*\|Estado/);
    expect(encabezados.join("|")).not.toMatch(/Prioridad|Principal/);
    expect(screen.getAllByRole("link", { name: "Abrir la conexión WhatsApp tienda" })[0].getAttribute("href")).toBe("/conexiones/c-1");
    expect(screen.getAllByRole("link", { name: "Abrir la conexión Chat web" })[0].getAttribute("href")).toBe("/conexiones/c-2");
    const filas = within(tabla).getAllByRole("row").slice(1);
    expect(filas[0].textContent).toContain("Atiende primero");
    expect(filas[1].textContent).toContain("Cuando la conversación es de su tema");
    expect(tabla.textContent).not.toMatch(/v3|200/);
    expect(screen.getByRole("link", { name: "Asignar a una conexión" }).getAttribute("href")).toBe("/agentes/a-1/editar?paso=publicar");
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("sin conexiones avisa que un agente publicado necesita al menos una (D-35)", async () => {
    const { container } = render(<ConexionesDelAgente filas={[]} nombre="Ventas" publicado asignarHref="/agentes/a-1/editar?paso=publicar" />);
    const aviso = screen.getByRole("status");
    expect(aviso.textContent).toContain("no atiende a nadie");
    expect(aviso.textContent).toContain("necesita al menos una conexión");
    expect(within(aviso).getByRole("link", { name: "Asignar a una conexión" })).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("sin permiso de edición no ofrece asignar", () => {
    render(<ConexionesDelAgente filas={[]} nombre="Ventas" publicado={false} asignarHref={null} />);
    expect(screen.getByRole("status").textContent).toContain("todavía no está en ninguna conexión");
    expect(screen.queryByRole("link", { name: "Asignar a una conexión" })).toBeNull();
  });

  it("si la consola no responde, lo dice sin jerga y lista las conexiones del resumen", () => {
    render(
      <ConexionesDelAgente filas={[]} nombre="Ventas" publicado asignarHref={null} error="Sin permiso" respaldo={[{ id: "c-9", label: "Tienda" }]} />,
    );
    expect(screen.getByRole("status").textContent).toContain("No pudimos ver cómo atiende en cada conexión");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("link", { name: "Tienda" }).getAttribute("href")).toBe("/conexiones/c-9");
  });
});

describe("cabecera de la ficha del agente (HU-UX-09, AGT-02, AGT-03)", () => {
  it("el agente se cambia desde un menú junto al título", async () => {
    const { container } = render(
      <SelectorDeAgentes
        actual="a-2"
        agentes={[
          { ref: "general", key: "general", name: "General", published: true },
          { ref: "a-2", key: "ventas", name: "Ventas", published: true },
          { ref: "a-3", key: "agenda", name: "Agenda", published: false },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "Cambiar de agente" })).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("con un solo agente no hay selector", () => {
    const { container } = render(<SelectorDeAgentes actual="a" agentes={[{ ref: "a", key: "x", name: "X", published: true }]} />);
    expect(container.innerHTML).toBe("");
  });

  it("los indicadores van en una frase y en créditos, sin dólares para el dueño", async () => {
    const { container } = render(
      <IndicadoresDelAgente
        conversaciones={{ valor: 48 }}
        resueltas={{ valor: { porcentaje: 95, turnos: 120 } }}
        creditosDelMes={{ valor: 3200 }}
      />,
    );
    expect(container.textContent).toBe("48 conversaciones esta semana · 95 % sin pasar a una persona · 3.200 créditos este mes");
    expect(container.textContent).not.toContain("US$");
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("el master ve además el costo de proveedor", () => {
    const { container } = render(
      <IndicadoresDelAgente conversaciones={{ valor: 1 }} resueltas={null} creditosDelMes={null} costoUsd={{ valor: 1.5 }} />,
    );
    expect(container.textContent).toMatch(/^1 conversación esta semana · (US\$\s?1,50|1,50\s?US\$) de proveedor esta semana$/);
  });

  it("sin muestra no inventa un porcentaje; sin permiso no se muestra; si todo falla lo dice", () => {
    const { container, rerender } = render(
      <IndicadoresDelAgente conversaciones={null} resueltas={{ valor: { porcentaje: null, turnos: 4 } }} creditosDelMes={{ valor: 12 }} />,
    );
    expect(container.textContent).toBe("12 créditos este mes");
    rerender(<IndicadoresDelAgente conversaciones={{ error: "Sin datos por ahora." }} resueltas={null} creditosDelMes={null} />);
    expect(container.textContent).toBe("Todavía no hay cifras de esta semana.");
    rerender(<IndicadoresDelAgente conversaciones={null} resueltas={null} creditosDelMes={null} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("«Probar» del agente (HU-UX-09, AGT-10)", () => {
  it("es un botón que abre el chat en un cajón por la conexión principal y deja cambiarla", async () => {
    const { baseElement } = render(
      <ProbarAgente nombre="Ventas" conexiones={[fila(), fila({ id: "c-2", label: "Chat web", principal: false })]} inicial={fila()} asignarHref={null} />,
    );
    expect(screen.queryByTestId("chat")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Probar" }));
    expect(screen.getByRole("dialog", { name: "Probar a Ventas" })).toBeTruthy();
    expect(screen.getByTestId("chat").textContent).toBe("c-1");
    fireEvent.click(screen.getByRole("button", { name: "Chat web" }));
    expect(screen.getByTestId("chat").textContent).toBe("c-2");
    expect(await violacionesGraves(baseElement)).toEqual([]);
  });

  it("abre solo con los enlaces de antes (?tab=probar) y avisa si el agente no atiende ahí", () => {
    render(
      <ProbarAgente
        nombre="Ventas"
        conexiones={[fila({ atiende: false, estado: { label: "Apagado en esta conexión", tono: "neutral" } })]}
        inicial={fila({ atiende: false, estado: { label: "Apagado en esta conexión", tono: "neutral" } })}
        asignarHref={null}
        abierto
      />,
    );
    expect(screen.getByRole("status").textContent).toContain("la prueba la responde otro agente");
    cleanup();
    render(<ProbarAgente nombre="Ventas" conexiones={[fila({ version: null })]} inicial={fila({ version: null })} asignarHref={null} abierto />);
    expect(screen.getByRole("status").textContent).toContain("todavía no está publicado en WhatsApp tienda");
  });

  it("sin conexiones no hay chat: pide asignarlo a una", () => {
    render(<ProbarAgente nombre="Ventas" conexiones={[]} inicial={null} asignarHref="/agentes/a/editar?paso=publicar" abierto />);
    expect(screen.queryByTestId("chat")).toBeNull();
    expect(screen.getByRole("link", { name: "Asignar a una conexión" }).getAttribute("href")).toBe("/agentes/a/editar?paso=publicar");
  });
});
