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
  it("muestra el agente, el modelo, las habilidades y el costo de IA con los días del plan", () => {
    render(<EstadoDelSistema d={con({ bot_paused: false, llm_label: "deepseek · deepseek-chat" })} />);

    expect(within(screen.getByRole("link", { name: /Agente/ })).getByText("Activo")).toBeTruthy();
    expect(screen.getByText("deepseek · deepseek-chat")).toBeTruthy();
    const costo = screen.getByRole("link", { name: /Costo IA · 30 días/ });
    expect(costo.getAttribute("href")).toBe("/costos");
    expect(within(costo).getByText(/12,40/)).toBeTruthy();
    expect(within(costo).getByText("11 días restantes del plan")).toBeTruthy();
  });

  it("un asistente pausado se marca como tal", () => {
    render(<EstadoDelSistema d={con({ bot_paused: true })} />);
    expect(within(screen.getByRole("link", { name: /Agente/ })).getByText("Pausado")).toBeTruthy();
  });

  it("sin plan o sin días restantes, no inventa el texto", () => {
    render(<EstadoDelSistema d={con({ billing: null })} />);
    expect(screen.getByRole("link", { name: /Costo IA · 30 días/ })).toBeTruthy();
    expect(screen.queryByText(/restantes del plan/)).toBeNull();
  });

  it("dice «1 día» en singular", () => {
    render(
      <EstadoDelSistema
        d={con({ billing: { plan_name: "Básico", status: "active", operational: true, days_left: 1, has_plan: true } })}
      />,
    );
    expect(screen.getByText("1 día restante del plan")).toBeTruthy();
  });

  it("no tiene violaciones graves de accesibilidad", async () => {
    const { container } = render(<EstadoDelSistema d={dashboard} />);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
