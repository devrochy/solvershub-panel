// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { DatosDelAgente } from "@/components/domain/agentes/datos-del-agente";
import { estadoInicial } from "@/lib/datos-cliente";
import { politicaDatosCliente } from "@/lib/testing/fixtures";

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
    expect(screen.getByRole("heading", { name: "¿Qué datos pide este agente?" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ventas" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Agenda" })).toBeTruthy();
    const grupo = screen.getByRole("radiogroup", { name: "Dirección de entrega (Crear un pedido)" });
    expect(within(grupo).getByRole("radio", { name: "Recomendado" })).toHaveProperty("checked", true);
  });

  it("bloquea los datos que exige el sistema", () => {
    montar();
    const grupo = screen.getByRole("radiogroup", { name: "Correo electrónico (Agendar una cita)" });
    for (const radio of within(grupo).getAllByRole("radio")) expect(radio).toHaveProperty("disabled", true);
    expect(screen.getByText(/Lo exige el sistema/)).toBeTruthy();
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
});
