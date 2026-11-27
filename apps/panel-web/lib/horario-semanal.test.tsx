// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { HorarioSemanal } from "@/components/domain/editor-de-franjas";
import type { Franja } from "@/lib/horario-atencion";

const semana: Franja[] = [
  ...[0, 1, 2, 3, 4].map((day) => ({ day, from: "08:00", to: "18:00" })),
  { day: 5, from: "08:00", to: "13:00" },
];

afterEach(cleanup);

describe("HorarioSemanal (variante minimalista)", () => {
  it("muestra la semana y solo abre el día que se pide", () => {
    render(<HorarioSemanal id="h" franjas={semana} onChange={() => undefined} />);

    expect(
      screen.getByText(
        "Lun a Vie, 8:00 a. m. – 6:00 p. m. · Sáb, 8:00 a. m. – 1:00 p. m. · Dom cerrado",
      ),
    ).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Editar el horario/ })).toHaveLength(6);

    fireEvent.click(screen.getByRole("button", { name: /^Lunes.*Editar el horario/ }));
    expect(screen.getByLabelText("Lunes: abre")).toBeTruthy();
    expect(screen.queryByLabelText("Martes: abre")).toBeNull();
  });

  it("«Atiende siempre» vacía la semana y, al apagarlo, vuelve la semana anterior", () => {
    const onChange = vi.fn();
    const { rerender } = render(<HorarioSemanal id="h" franjas={semana} onChange={onChange} />);

    fireEvent.click(screen.getByRole("switch", { name: "Atiende siempre" }));
    expect(onChange).toHaveBeenLastCalledWith([]);

    onChange.mockClear();
    rerender(<HorarioSemanal id="h" franjas={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("switch", { name: "Atiende siempre" }));
    const llamada = onChange.mock.calls.at(-1)?.[0] as Franja[];
    expect(llamada).toHaveLength(6);
    expect(llamada.some((f) => f.day === 0)).toBe(true);
    expect(llamada.some((f) => f.day === 6)).toBe(false);
  });

  it("copiar el lunes solo toca martes a viernes y conserva el sábado", () => {
    const onChange = vi.fn();
    render(
      <HorarioSemanal
        id="h"
        franjas={[
          { day: 0, from: "08:00", to: "18:00" },
          { day: 5, from: "08:00", to: "13:00" },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Lunes.*Editar el horario/ }));
    fireEvent.click(screen.getByRole("button", { name: "Copiar a martes–viernes" }));

    const llamada = onChange.mock.calls.at(-1)?.[0] as Franja[];
    expect(llamada.filter((f) => [1, 2, 3, 4].includes(f.day))).toHaveLength(4);
    expect(llamada.filter((f) => f.day === 5)).toEqual([{ day: 5, from: "08:00", to: "13:00" }]);
    expect(llamada.some((f) => f.day === 6)).toBe(false);
  });

  it("en modo informativo el asistente responde siempre y el horario es informativo", () => {
    const onChange = vi.fn();
    render(<HorarioSemanal id="h" franjas={[]} modoInformativo onChange={onChange} />);

    expect(screen.getByText("Sin horario para informar.")).toBeTruthy();
    expect(screen.queryByRole("switch", { name: "Atiende siempre" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Definir horario" }));
    expect((onChange.mock.calls.at(-1)?.[0] as Franja[]).length).toBe(6);
  });

  it("abre el día con cierre invertido y muestra el error", () => {
    render(
      <HorarioSemanal
        id="h"
        franjas={[{ day: 2, from: "18:00", to: "08:00" }]}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByRole("alert").textContent).toMatch(/cierre del miércoles/);
    expect(screen.getByLabelText("Miércoles: abre")).toBeTruthy();
    expect(screen.getByText(/Mié, revisar/)).toBeTruthy();
  });
});
