// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import type { Dashboard } from "@/lib/api/types";
import { dashboard } from "@/lib/testing/fixtures";
import { violacionesGraves } from "@/lib/testing/axe";

import { EstadoDelSistema } from "./estado-del-sistema";

afterEach(cleanup);

function con(parcial: Partial<Dashboard>): Dashboard {
  return { ...dashboard, ...parcial };
}

describe("EstadoDelSistema", () => {
  it("el modelo solo lo ve la plataforma", () => {
    const d = con({ llm_label: "deepseek · deepseek-chat" });
    const { rerender } = render(<EstadoDelSistema d={d} />);
    expect(screen.queryByText("deepseek · deepseek-chat")).toBeNull();
    rerender(<EstadoDelSistema d={d} esPlataforma />);
    expect(screen.getByText("deepseek · deepseek-chat")).toBeTruthy();
  });

  it("muestra el agente, las habilidades y el plan con sus días; el costo de IA solo al master", () => {
    const { rerender } = render(<EstadoDelSistema d={con({ bot_paused: false })} />);
    expect(screen.queryByRole("link", { name: /Costo IA, 30 días/ })).toBeNull();
    rerender(<EstadoDelSistema d={con({ bot_paused: false })} esPlataforma />);

    expect(within(screen.getByRole("link", { name: /Agente/ })).getByText("Activo")).toBeTruthy();
    const costo = screen.getByRole("link", { name: /Costo IA, 30 días/ });
    expect(costo.getAttribute("href")).toBe("/costos");
    expect(within(costo).getByText(/12,40/)).toBeTruthy();
    expect(within(screen.getByRole("link", { name: /Plan/ })).getByText("11 días restantes")).toBeTruthy();
  });

  it("un asistente pausado se marca como tal", () => {
    render(<EstadoDelSistema d={con({ bot_paused: true })} />);
    expect(within(screen.getByRole("link", { name: /Agente/ })).getByText("Pausado")).toBeTruthy();
  });

  it("sin plan o sin días restantes, no inventa el texto", () => {
    render(<EstadoDelSistema d={con({ billing: null })} esPlataforma />);
    expect(screen.getByRole("link", { name: /Costo IA, 30 días/ })).toBeTruthy();
    expect(screen.queryByText(/restantes/)).toBeNull();
  });

  it("dice «1 día» en singular", () => {
    render(
      <EstadoDelSistema
        d={con({ billing: { plan_name: "Básico", status: "active", operational: true, days_left: 1, has_plan: true } })}
      />,
    );
    expect(screen.getByText("1 día restante")).toBeTruthy();
  });

  it("no tiene violaciones graves de accesibilidad", async () => {
    const { container } = render(<EstadoDelSistema d={dashboard} />);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
