// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import type { Dashboard } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

import { ConversacionesRecientes } from "./conversaciones-recientes";

afterEach(cleanup);

type Reciente = Dashboard["recent"][number];

const AHORA = new Date("2026-11-06T12:00:00Z");

const ANA: Reciente = {
  id: "c1",
  customer_name: "Ana Pérez",
  external_id: "573001112233",
  status: "open",
  channel: "whatsapp",
  started_at: "2026-11-06T11:30:00Z",
};
const VISITANTE: Reciente = {
  id: "c2",
  customer_name: null,
  external_id: "web:cf7834ced6544a9190c389b73865c13f",
  status: "escalated",
  channel: "web",
  started_at: "2026-11-04T12:00:00Z",
};

describe("ConversacionesRecientes", () => {
  it("dice quién, cuándo empezó y en qué estado está", () => {
    render(<ConversacionesRecientes recientes={[ANA, VISITANTE]} ahora={AHORA} />);

    const ana = screen.getByRole("link", { name: /Ana Pérez/ });
    expect(ana.getAttribute("href")).toBe("/conversaciones/c1");
    expect(within(ana).getByText("hace 30 min")).toBeTruthy();
    expect(within(ana).getByText("Abierta")).toBeTruthy();

    const visitante = screen.getByRole("link", { name: /Visitante web · cf78/ });
    expect(within(visitante).getByText("hace 2 días")).toBeTruthy();
    expect(within(visitante).getByText("Escalada")).toBeTruthy();
    // El identificador crudo no se muestra.
    expect(screen.queryByText(/cf7834ced/)).toBeNull();
  });

  it("un servidor viejo, sin fecha ni canal, sigue mostrando la fila", () => {
    const { started_at: _s, channel: _c, ...sinExtras } = ANA;
    render(<ConversacionesRecientes recientes={[sinExtras]} ahora={AHORA} />);

    const fila = screen.getByRole("link", { name: /Ana Pérez/ });
    expect(within(fila).queryByText(/hace/)).toBeNull();
    expect(within(fila).getByText("Abierta")).toBeTruthy();
  });

  it("sin conversaciones, lo dice", () => {
    render(<ConversacionesRecientes recientes={[]} />);
    expect(screen.getByText("Aún no hay conversaciones.")).toBeTruthy();
  });

  it("no tiene violaciones graves de accesibilidad", async () => {
    const { container } = render(<ConversacionesRecientes recientes={[ANA, VISITANTE]} ahora={AHORA} />);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
