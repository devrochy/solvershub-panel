// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ConsentimientoDelCliente } from "@/components/domain/cliente/consentimiento";
import { FeedbackProviders } from "@/components/ui/providers";
import type { Consentimiento } from "@/lib/api/types";
import { esPropietarioOPlataforma } from "@/lib/clientes";
import {
  AVISO_BAJA_DEL_CLIENTE,
  AVISO_SOLO_PROPIETARIO,
  esBajaDelCliente,
  mensajeDeErrorAlGuardarConsentimiento,
} from "@/lib/consentimiento-promos";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
}));

const fetchMock = vi.fn();

function fila(estado: "otorgado" | "revocado", origen: string): Consentimiento["historial"][number] {
  return { estado, origen, evidencia: "", quien: "alguien", created_at: "2026-11-07T10:00:00Z" } as Consentimiento["historial"][number];
}
const sinRegistro: Consentimiento = { estado: "sin_registro", historial: [] };
const otorgado: Consentimiento = { estado: "otorgado", historial: [fila("otorgado", "ficha")] };
const bajaFicha: Consentimiento = { estado: "revocado", historial: [fila("revocado", "ficha")] };
const bajaPalabra: Consentimiento = { estado: "revocado", historial: [fila("revocado", "palabra_de_baja")] };
const baja131050: Consentimiento = { estado: "revocado", historial: [fila("revocado", "meta_131050")] };

function montar(esPropietario?: boolean) {
  return render(
    <FeedbackProviders>
      <ConsentimientoDelCliente leadId="lead-1" esPropietario={esPropietario} />
    </FeedbackProviders>,
  );
}
const responde = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status });
const ACEPTO = { name: "Aceptó recibir promociones" };
const YA_NO = { name: "Ya no quiere promociones" };

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("quién ofrece «Aceptó recibir promociones» (D-SPEC-33-9)", () => {
  const sesiones = {
    propietario: { role: "user", tenant: { role: "owner" }, permissions: { leads: "write" } },
    master: { role: "master", permissions: {} },
    tester: { role: "tester", permissions: {} },
    colaboradorConClientesEnEscritura: { role: "user", tenant: { role: "colaborador" }, permissions: { leads: "write" } },
  };

  it.each([
    ["propietario", sesiones.propietario, true],
    ["master", sesiones.master, true],
    ["tester", sesiones.tester, true],
    ["colaborador con Clientes en escritura", sesiones.colaboradorConClientesEnEscritura, false],
  ] as const)("sin registro: %s", async (_nombre, me, visible) => {
    fetchMock.mockResolvedValue(responde(sinRegistro));
    montar(esPropietarioOPlataforma(me));
    expect(await screen.findByText("Sin consentimiento")).toBeTruthy();
    expect(Boolean(screen.queryByRole("button", ACEPTO))).toBe(visible);
    expect(Boolean(screen.queryByText(AVISO_SOLO_PROPIETARIO))).toBe(!visible);
  });

  it("sin la prop, por defecto no se ofrece (cerrado ante la duda)", async () => {
    fetchMock.mockResolvedValue(responde(sinRegistro));
    montar();
    expect(await screen.findByText("Sin consentimiento")).toBeTruthy();
    expect(screen.queryByRole("button", ACEPTO)).toBeNull();
  });

  it("el colaborador sí puede marcar que ya no acepta", async () => {
    fetchMock.mockResolvedValueOnce(responde(otorgado)).mockResolvedValueOnce(responde(bajaFicha, 201)).mockResolvedValueOnce(responde(bajaFicha));
    montar(false);
    fireEvent.click(await screen.findByRole("button", YA_NO));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ estado: "revocado" });
    expect(await screen.findByText("Se dio de baja")).toBeTruthy();
  });

  it("el colaborador ve una baja hecha desde la ficha pero no puede reactivarla", async () => {
    fetchMock.mockResolvedValue(responde(bajaFicha));
    montar(false);
    expect(await screen.findByText("Se dio de baja")).toBeTruthy();
    expect(screen.queryByRole("button", ACEPTO)).toBeNull();
    expect(screen.getByText(AVISO_SOLO_PROPIETARIO)).toBeTruthy();
  });

  it("el propietario marca que aceptó y se guarda", async () => {
    fetchMock.mockResolvedValueOnce(responde(sinRegistro)).mockResolvedValueOnce(responde(otorgado, 201)).mockResolvedValueOnce(responde(otorgado));
    montar(true);
    fireEvent.click(await screen.findByRole("button", ACEPTO));
    fireEvent.change(await screen.findByLabelText(/Detalle/), { target: { value: "Firmó la planilla" } });
    fireEvent.click(await screen.findByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ estado: "otorgado", como: "en_el_local", evidencia: "Firmó la planilla" });
    expect(await screen.findByText("Acepta promociones")).toBeTruthy();
  });

  it("el detalle es obligatorio con cualquier «Cómo lo obtuviste»: Guardar sigue apagado si está vacío o en blanco", async () => {
    fetchMock.mockResolvedValue(responde(sinRegistro));
    montar(true);
    fireEvent.click(await screen.findByRole("button", ACEPTO));
    const guardar = (await screen.findByRole("button", { name: "Guardar" })) as HTMLButtonElement;
    for (const como of ["en_el_local", "por_telefono", "por_escrito", "otro"]) {
      fireEvent.change(screen.getByLabelText("Cómo lo obtuviste"), { target: { value: como } });
      fireEvent.change(screen.getByLabelText(/Detalle|Cuéntalo/), { target: { value: "   " } });
      expect(guardar.disabled).toBe(true);
      fireEvent.change(screen.getByLabelText(/Detalle|Cuéntalo/), { target: { value: "Dijo que sí" } });
      expect(guardar.disabled).toBe(false);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("el propietario puede reactivar una baja que dejó un colaborador en la ficha", async () => {
    fetchMock.mockResolvedValue(responde(bajaFicha));
    montar(true);
    expect(await screen.findByRole("button", ACEPTO)).toBeTruthy();
    expect(screen.queryByText(AVISO_BAJA_DEL_CLIENTE)).toBeNull();
  });
});

describe("baja del cliente: no se reactiva desde la ficha", () => {
  it.each([
    ["palabra de baja", bajaPalabra],
    ["131050 de Meta", baja131050],
  ] as const)("%s: ni el propietario ni el master ven la acción y se explica por qué", async (_n, datos) => {
    fetchMock.mockResolvedValue(responde(datos));
    montar(true);
    expect(await screen.findByText("Se dio de baja")).toBeTruthy();
    expect(screen.queryByRole("button", ACEPTO)).toBeNull();
    expect(screen.queryByRole("button", YA_NO)).toBeNull();
    expect(screen.getByText(AVISO_BAJA_DEL_CLIENTE)).toBeTruthy();
    expect(screen.queryByText(AVISO_SOLO_PROPIETARIO)).toBeNull();
  });

  it("el colaborador ve la explicación de la baja del cliente, no la del propietario", async () => {
    fetchMock.mockResolvedValue(responde(bajaPalabra));
    montar(false);
    expect(await screen.findByText(AVISO_BAJA_DEL_CLIENTE)).toBeTruthy();
    expect(screen.queryByText(AVISO_SOLO_PROPIETARIO)).toBeNull();
  });

  it("si el cliente aceptó de nuevo después de una baja, vuelve el estado normal", async () => {
    fetchMock.mockResolvedValue(responde({ estado: "otorgado", historial: [fila("otorgado", "ficha"), fila("revocado", "palabra_de_baja")] }));
    montar(true);
    expect(await screen.findByRole("button", YA_NO)).toBeTruthy();
    expect(screen.queryByText(AVISO_BAJA_DEL_CLIENTE)).toBeNull();
  });
});

describe("errores del servidor", () => {
  async function guardarComoPropietario(respuesta: Response, despues: Consentimiento = sinRegistro) {
    fetchMock.mockResolvedValueOnce(responde(sinRegistro)).mockResolvedValueOnce(respuesta).mockResolvedValue(responde(despues));
    montar(true);
    fireEvent.click(await screen.findByRole("button", ACEPTO));
    fireEvent.change(await screen.findByLabelText(/Detalle/), { target: { value: "Firmó la planilla" } });
    fireEvent.click(await screen.findByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3));
  }

  it("409 baja_del_cliente se traduce y se vuelve a leer el estado", async () => {
    await guardarComoPropietario(responde({ error: "texto del servidor", code: "baja_del_cliente" }, 409), bajaPalabra);
    // El aviso sale en el toast y, tras releer el estado, también en la ficha.
    await waitFor(() => expect(screen.getAllByText(AVISO_BAJA_DEL_CLIENTE).length).toBe(2));
    expect(screen.queryByRole("button", ACEPTO)).toBeNull();
  });

  it("403 se traduce al mensaje del propietario", async () => {
    await guardarComoPropietario(responde({ error: "Forbidden" }, 403));
    expect(await screen.findByText(AVISO_SOLO_PROPIETARIO)).toBeTruthy();
  });
});

describe("lib/consentimiento-promos", () => {
  it("esBajaDelCliente solo si la última fila es una baja del cliente o de Meta", () => {
    expect(esBajaDelCliente(bajaPalabra)).toBe(true);
    expect(esBajaDelCliente(baja131050)).toBe(true);
    expect(esBajaDelCliente(bajaFicha)).toBe(false);
    expect(esBajaDelCliente(otorgado)).toBe(false);
    expect(esBajaDelCliente(sinRegistro)).toBe(false);
    expect(esBajaDelCliente(null)).toBe(false);
  });

  it("mensajeDeErrorAlGuardarConsentimiento", () => {
    expect(mensajeDeErrorAlGuardarConsentimiento(403, "x")).toBe(AVISO_SOLO_PROPIETARIO);
    expect(mensajeDeErrorAlGuardarConsentimiento(409, "x", "baja_del_cliente")).toBe(AVISO_BAJA_DEL_CLIENTE);
    expect(mensajeDeErrorAlGuardarConsentimiento(409, "Otro conflicto", "otro")).toBe("Otro conflicto");
    expect(mensajeDeErrorAlGuardarConsentimiento(500, "")).toBe("No se pudo guardar el consentimiento.");
  });
});
