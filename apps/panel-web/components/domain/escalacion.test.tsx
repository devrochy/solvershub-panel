// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { violacionesGraves } from "@/lib/testing/axe";

import { EscalacionFilters, MotivoBadge, motivoDe } from "./escalacion";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

afterEach(() => {
  cleanup();
  push.mockClear();
});

describe("motivos de escalación (HU-UX-17)", () => {
  it("usa la etiqueta de la API y, sin ella, el respaldo de lib/labels", () => {
    expect(motivoDe({ reason: "tool:queja", reason_code: "queja", reason_label: "Queja" }).etiqueta).toBe("Queja");
    expect(motivoDe({ reason: "plugin:crear_pedido" }).etiqueta).toBe("Acción de Crear pedido");
    expect(motivoDe({ reason: "keyword" }).codigo).toBe("palabra_clave");
  });

  it("los motivos de riesgo van con tono de advertencia", () => {
    expect(motivoDe({ reason: "tool:queja", reason_code: "queja" }).tono).toBe("warning");
    expect(motivoDe({ reason: "tool:monto_alto", reason_code: "monto_alto" }).tono).toBe("warning");
    expect(motivoDe({ reason: "send_failed", reason_code: "envio_fallido" }).tono).toBe("danger");
    expect(motivoDe({ reason: "keyword", reason_code: "palabra_clave" }).tono).toBe("info");
    expect(motivoDe({ reason: "tool:x", reason_code: "otro" }).tono).toBe("neutral");
  });

  it("el badge de riesgo lleva ícono (el color no va solo)", () => {
    const { container } = render(
      <MotivoBadge esc={{ reason: "tool:queja", reason_code: "queja", reason_label: "Queja" }} />,
    );
    expect(screen.getByText("Queja")).toBeTruthy();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("el filtro ofrece todos los motivos, marca el elegido y navega sin botón", async () => {
    const { container } = render(<EscalacionFilters motivo="queja" />);
    const select = screen.getByLabelText("Motivo") as HTMLSelectElement;
    expect(select.value).toBe("queja");
    expect(screen.getByRole("option", { name: "Monto alto" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Filtrar" })).toBeNull();
    fireEvent.change(select, { target: { value: "monto_alto" } });
    expect(push).toHaveBeenCalledWith("/escalaciones?reason_code=monto_alto");
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("el estado es el control segmentado en modo enlace y conserva el motivo", () => {
    render(<EscalacionFilters motivo="queja" estado="asignada" />);
    const filtro = screen.getByRole("navigation", { name: "Filtrar por estado" });
    const actual = within(filtro).getByRole("link", { current: "page" });
    expect(actual.textContent).toBe("Asignadas");
    expect(within(filtro).getByRole("link", { name: "Resueltas" }).getAttribute("href")).toBe(
      "/escalaciones?reason_code=queja&estado=resuelta",
    );
  });
});
