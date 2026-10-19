// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { violacionesGraves } from "@/lib/testing/axe";

import { EscalacionFilters, MotivoBadge, ResumenEscalacion, motivoDe } from "./escalacion";

afterEach(cleanup);

const LARGO =
  "El cliente quiere comprar 40 unidades con entrega en Medellín y pide factura a nombre de otra empresa; " +
  "ya preguntó dos veces por el descuento por volumen y no quiere seguir con el asistente.";

const BASE = {
  conversation_id: "00000000-0000-0000-0000-000000000001",
  created_at: "2026-10-13T15:00:00Z",
  customer_name: "Ana",
  external_id: null,
};

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

  it("muestra el resumen completo en un panel al hacer clic, sin violaciones de axe", async () => {
    render(
      <ResumenEscalacion
        esc={{ ...BASE, reason: "tool:el cliente quiere al gerente", reason_code: "otro", reason_label: "Otro", summary: LARGO }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: LARGO }));
    const panel = screen.getByRole("dialog", { name: "Escalación de Ana" });
    expect(panel.textContent).toContain(LARGO);
    // El texto libre de antes se ve como «motivo registrado».
    expect(panel.textContent).toContain("el cliente quiere al gerente");
    expect(await violacionesGraves(document.body)).toEqual([]);
  });

  it("sin resumen no hay botón", () => {
    render(<ResumenEscalacion esc={{ ...BASE, reason: "keyword", summary: "" }} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("el filtro ofrece todos los motivos y marca el elegido", async () => {
    const { container } = render(<EscalacionFilters motivo="queja" />);
    const select = screen.getByLabelText("Motivo") as HTMLSelectElement;
    expect(select.name).toBe("reason_code");
    expect(select.value).toBe("queja");
    expect(screen.getByRole("option", { name: "Monto alto" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Limpiar" })).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
