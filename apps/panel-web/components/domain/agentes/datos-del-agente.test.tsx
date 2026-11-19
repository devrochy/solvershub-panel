// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { DatosDelAgente } from "@/components/domain/agentes/datos-del-agente";
import { estadoInicial } from "@/lib/datos-cliente";
import { politicaDatosCliente } from "@/lib/testing/fixtures";
import { violacionesGraves } from "@/lib/testing/axe";

afterEach(cleanup);

function montar(overrides: Partial<Parameters<typeof DatosDelAgente>[0]> = {}) {
  const onNivel = vi.fn();
  const onRestablecer = vi.fn();
  const onHerramientas = vi.fn();
  const onMetodo = vi.fn();
  const onGuardar = vi.fn();
  render(
    <DatosDelAgente
      politica={politicaDatosCliente}
      estado={estadoInicial(politicaDatosCliente)}
      guardado={estadoInicial(politicaDatosCliente)}
      herramientas={false}
      metodos={["domicilio", "recoger_en_tienda"]}
      puedeEditar
      guardando={false}
      sinGuardar={false}
      onNivel={onNivel}
      onRestablecer={onRestablecer}
      onHerramientas={onHerramientas}
      onMetodo={onMetodo}
      onGuardar={onGuardar}
      {...overrides}
    />,
  );
  return { onNivel, onRestablecer, onHerramientas, onMetodo, onGuardar };
}

describe("DatosDelAgente", () => {
  it("muestra las operaciones del agente y el nivel actual de cada dato", () => {
    montar();
    // Como sección (dentro del h3 «Datos del cliente» de Habilidades): sin h2 propio, módulos en h4.
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
    expect(screen.getByRole("heading", { level: 4, name: "Ventas" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Agenda" })).toBeTruthy();
    const grupo = screen.getByRole("radiogroup", { name: "Dirección de entrega (Crear un pedido)" });
    expect(within(grupo).getByRole("radio", { name: "Recomendado" })).toHaveProperty("checked", true);
  });

  it("bloquea los datos que exige el sistema", () => {
    montar();
    const grupo = screen.getByRole("radiogroup", { name: "Correo electrónico (Agendar una cita)" });
    for (const radio of within(grupo).getAllByRole("radio")) expect(radio).toHaveProperty("disabled", true);
    expect(screen.getByText("Necesario para agendar una cita.")).toBeTruthy();
  });

  it("avisa el cambio de nivel y el interruptor de herramientas", () => {
    const { onNivel, onHerramientas } = montar();
    const grupo = screen.getByRole("radiogroup", { name: "Nombre (Crear un pedido)" });
    fireEvent.click(within(grupo).getByRole("radio", { name: "No pedir" }));
    expect(onNivel).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("switch", { name: /consulte los datos/ }));
    expect(onHerramientas).toHaveBeenCalledWith(true);
  });

  it("permite apagar un método de entrega, pero no el último", () => {
    const { onMetodo } = montar({ metodos: ["domicilio"] });
    const domicilio = screen.getByRole("switch", { name: "Ofrecer a domicilio" });
    expect(domicilio).toHaveProperty("disabled", true);
    const recoger = screen.getByRole("switch", { name: "Ofrecer recoger en tienda" });
    fireEvent.click(recoger);
    expect(onMetodo).toHaveBeenCalledWith("recoger_en_tienda", true);
  });

  it("muestra los datos de los superpoderes en solo lectura", () => {
    montar({
      politica: {
        ...politicaDatosCliente,
        procedimientos: [
          {
            id: "pack_commerce.tomar_pedido",
            titulo: "Tomar pedido",
            datos: [{ clave: "direccion", etiqueta: "Dirección", obligatorio: true, condicion: null, tipo: "string" }],
          },
        ],
      },
    });
    expect(screen.getByRole("heading", { name: "Datos que exige cada superpoder" })).toBeTruthy();
    expect(screen.getAllByText(/Dirección/).length).toBeGreaterThan(0);
  });

  it("como paso (HU-AOS-85): sin botón propio, títulos desde h3 y «Tipos de pedido»", async () => {
    const { container } = render(
      <div>
        <h2>¿Qué datos pide Laura?</h2>
        <DatosDelAgente
          politica={politicaDatosCliente}
          estado={estadoInicial(politicaDatosCliente)}
          guardado={estadoInicial(politicaDatosCliente)}
          herramientas={false}
          metodos={["domicilio", "recoger_en_tienda"]}
          puedeEditar
          guardando={false}
          sinGuardar
          onNivel={vi.fn()}
          onRestablecer={vi.fn()}
          onHerramientas={vi.fn()}
          onMetodo={vi.fn()}
          onCuantoPregunta={vi.fn()}
          onUsarRecomendado={vi.fn()}
          comoPaso
        />
      </div>,
    );
    expect(screen.queryByRole("button", { name: "Guardar datos del cliente" })).toBeNull();
    expect(screen.getByRole("heading", { level: 3, name: "Ventas" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "Tipos de pedido" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 4, name: /Crear un pedido/ })).toBeTruthy();
    // El fixture trae «Dirección» ajustada: la barra lo cuenta frente a lo recomendado.
    expect(screen.getByText(/1 cambio/)).toBeTruthy();
    // Todo es requerido por defecto: ningún nivel de «Cuánto pregunta» separa nada, así que no se ofrece.
    expect(screen.queryByRole("radiogroup", { name: "Cuánto pregunta" })).toBeNull();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("cada nivel muestra su ícono y la selección con ✓, no solo con color", () => {
    montar();
    const grupo = screen.getByRole("radiogroup", { name: "Nombre (Crear un pedido)" });
    const etiquetas = within(grupo).getAllByRole("radio").map((r) => r.closest("label") as HTMLElement);
    for (const etiqueta of etiquetas) expect(etiqueta.querySelector("svg")).toBeTruthy();
    const marcado = etiquetas.find((e) => (e.querySelector("input") as HTMLInputElement).checked) as HTMLElement;
    expect(marcado.querySelector("svg")?.getAttribute("class")).toContain("lucide-check");
  });

  it("muestra el error de los tipos de pedido", () => {
    montar({ errorDeMetodos: "Deja al menos un tipo de pedido para que pueda cerrar pedidos." });
    expect(screen.getByRole("alert").textContent).toMatch(/al menos un tipo de pedido/);
  });
});
