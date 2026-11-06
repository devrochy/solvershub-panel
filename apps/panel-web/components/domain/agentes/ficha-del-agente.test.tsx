// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

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

describe("pestaña Conexiones del agente (HU-UX-09)", () => {
  it("muestra conexión, tipo, rol, prioridad, principal y estado; cada fila lleva a la ficha de la conexión", async () => {
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
    expect(encabezados.join("|")).toMatch(/Conexión\|Tipo\|Rol\|Prioridad.*\|Principal.*\|Estado/);
    expect(screen.getByRole("link", { name: "WhatsApp tienda" }).getAttribute("href")).toBe("/conexiones/c-1");
    expect(screen.getByRole("link", { name: "Chat web" }).getAttribute("href")).toBe("/conexiones/c-2");
    const filas = within(tabla).getAllByRole("row").slice(1);
    expect(filas[0].textContent).toContain("Sí");
    expect(filas[0].textContent).toContain("v3 activa");
    expect(filas[1].textContent).toContain("No");
    expect(filas[1].textContent).toContain("Sin versión activa");
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

  it("si la consola no responde, lo dice y lista las conexiones del resumen", () => {
    render(
      <ConexionesDelAgente filas={[]} nombre="Ventas" publicado asignarHref={null} error="Sin permiso" respaldo={[{ id: "c-9", label: "Tienda" }]} />,
    );
    expect(screen.getByRole("alert").textContent).toContain("Sin permiso");
    expect(screen.getByRole("link", { name: "Tienda" }).getAttribute("href")).toBe("/conexiones/c-9");
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("cabecera de la ficha del agente (HU-UX-09)", () => {
  it("el selector marca el agente actual y enlaza a los demás", async () => {
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
    const nav = screen.getByRole("navigation", { name: "Tus agentes" });
    expect(within(nav).getByRole("link", { name: /Ventas/ }).getAttribute("aria-current")).toBe("page");
    expect(within(nav).getByRole("link", { name: /General/ }).getAttribute("href")).toBe("/agentes/general");
    expect(within(nav).getByRole("link", { name: /Agenda/ }).textContent).toContain("borrador");
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("con un solo agente no hay selector", () => {
    const { container } = render(<SelectorDeAgentes actual="a" agentes={[{ ref: "a", key: "x", name: "X", published: true }]} />);
    expect(container.innerHTML).toBe("");
  });

  it("indicadores de 7 días: conversaciones, resueltas sin persona y consumo en dinero", async () => {
    const { container } = render(
      <IndicadoresDelAgente
        conversaciones={{ valor: 42 }}
        resueltas={{ valor: { porcentaje: 92.5, turnos: 120 } }}
        consumo={{ valor: { costoUsd: 1.5, turnos: 120 } }}
      />,
    );
    const seccion = screen.getByRole("region", { name: "Indicadores de los últimos 7 días" });
    expect(seccion.textContent).toContain("Conversaciones · 7 días42");
    expect(seccion.textContent).toContain("92,5 %");
    expect(seccion.textContent).toMatch(/US\$\s?1,50|1,50\s?US\$/);
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("sin ver costos el consumo va en respuestas; sin muestra no inventa un porcentaje; sin permiso no se muestra", () => {
    render(
      <IndicadoresDelAgente
        conversaciones={null}
        resueltas={{ valor: { porcentaje: null, turnos: 4 } }}
        consumo={{ valor: { costoUsd: null, turnos: 4 } }}
      />,
    );
    const seccion = screen.getByRole("region");
    expect(seccion.textContent).not.toContain("Conversaciones");
    expect(seccion.textContent).toContain("Muestra pequeña: 4 respuestas.");
    expect(seccion.textContent).not.toContain("US$");
    expect(seccion.textContent).toContain("Respuestas del agente.");
  });

  it("un indicador que falla se explica sin tumbar los demás", () => {
    render(<IndicadoresDelAgente conversaciones={{ error: "Sin datos por ahora." }} resueltas={null} consumo={null} />);
    expect(screen.getByRole("alert").textContent).toBe("Sin datos por ahora.");
  });
});

describe("pestaña Probar del agente (HU-UX-09)", () => {
  it("abre el chat por la conexión elegida y deja cambiarla", async () => {
    const { container } = render(
      <ProbarAgente
        nombre="Ventas"
        conexion={fila()}
        opciones={[
          { id: "c-1", label: "WhatsApp tienda", href: "/agentes/a?tab=probar&conexion=c-1" },
          { id: "c-2", label: "Chat web", href: "/agentes/a?tab=probar&conexion=c-2" },
        ]}
        asignarHref={null}
      />,
    );
    expect(screen.getByTestId("chat").textContent).toBe("c-1");
    const nav = screen.getByRole("navigation", { name: "Conexión de la prueba" });
    expect(within(nav).getByRole("link", { name: "WhatsApp tienda" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByText(/lo que tengas sin publicar no entra/)).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("avisa si el agente no atiende ahí o no está en la versión activa", () => {
    const { rerender } = render(
      <ProbarAgente nombre="Ventas" conexion={fila({ atiende: false, estado: { label: "Deshabilitado aquí", tono: "neutral" } })} opciones={[]} asignarHref={null} />,
    );
    expect(screen.getByRole("status").textContent).toContain("la prueba la responde otro agente");
    rerender(<ProbarAgente nombre="Ventas" conexion={fila({ version: null })} opciones={[]} asignarHref={null} />);
    expect(screen.getByRole("status").textContent).toContain("todavía no está en la versión activa");
  });

  it("sin conexiones no hay chat: pide asignarlo a una", () => {
    render(<ProbarAgente nombre="Ventas" conexion={null} opciones={[]} asignarHref="/agentes/a/editar?paso=publicar" />);
    expect(screen.queryByTestId("chat")).toBeNull();
    expect(screen.getByRole("link", { name: "Asignar a una conexión" }).getAttribute("href")).toBe("/agentes/a/editar?paso=publicar");
  });
});
