// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { HorarioDelAgenteEditable } from "@/components/domain/agentes/horario-del-agente";
import { FeedbackProviders } from "@/components/ui/providers";
import { problemaDelHorario, type HorarioDelAgente } from "@/lib/horario-del-agente";
import { violacionesGraves } from "@/lib/testing/axe";

// SPEC-47, HU-AOS-82: «Heredado del negocio» o «Cambiar solo para este agente».

const NEGOCIO = { tz: "America/Bogota", ranges: [0, 1, 2, 3, 4].map((day) => ({ day, from: "09:00", to: "19:00" })) };
const HEREDADO: HorarioDelAgente = { schedule: null, business_hours: NEGOCIO, source: "negocio", lock_version: 4 };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function montar(inicial = HEREDADO, onLock = vi.fn()) {
  render(
    <FeedbackProviders>
      <HorarioDelAgenteEditable agenteId="a-1" inicial={inicial} lockVersion={4} onLockVersion={onLock} puedeEditar zonaDelNegocio="America/Bogota" />
    </FeedbackProviders>,
  );
  return onLock;
}

describe("horario del agente", () => {
  it("heredado: dice el horario del negocio y no hay nada que guardar", async () => {
    const { container } = render(
      <FeedbackProviders>
        <HorarioDelAgenteEditable agenteId="a-1" inicial={HEREDADO} lockVersion={4} onLockVersion={() => {}} puedeEditar zonaDelNegocio="America/Bogota" />
      </FeedbackProviders>,
    );
    expect(screen.getByText(/Usa el horario del negocio/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar horario del agente" }).hasAttribute("disabled")).toBe(true);
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("cambiar solo para este agente guarda su horario con el lock del borrador y lo devuelve al editor", async () => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const cuerpo = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ schedule: cuerpo.schedule, business_hours: NEGOCIO, source: "agente", lock_version: 5 }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetch);
    const onLock = montar();
    fireEvent.click(screen.getByRole("button", { name: "Cambiar solo para este agente" }));
    expect(screen.getByText(/los demás siguen con el del negocio/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guardar horario del agente" }));
    await waitFor(() => expect(onLock).toHaveBeenCalledWith(5));
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/agent-editor/a-1/schedule");
    const enviado = JSON.parse(String(init?.body));
    expect(enviado.lock_version).toBe(4);
    expect(enviado.schedule.tz).toBe("America/Bogota");
    expect(enviado.schedule.ranges).toHaveLength(5);
  });

  it("volver a heredar manda null", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ ...HEREDADO, lock_version: 6 }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const propio: HorarioDelAgente = { schedule: { tz: "America/Bogota", ranges: [{ day: 0, from: "08:00", to: "10:00" }] }, business_hours: NEGOCIO, source: "agente", lock_version: 4 };
    montar(propio);
    fireEvent.click(screen.getByRole("button", { name: "Heredado del negocio" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar horario del agente" }));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body)).schedule).toBeNull();
  });

  it("sin franjas no deja guardar", () => {
    expect(problemaDelHorario([])).toMatch(/al menos un día/);
    expect(problemaDelHorario([{ day: 0, from: "10:00", to: "09:00" }])).toMatch(/inicio anterior/);
    expect(problemaDelHorario([{ day: 0, from: "08:00", to: "09:00" }])).toBeNull();
  });
});
