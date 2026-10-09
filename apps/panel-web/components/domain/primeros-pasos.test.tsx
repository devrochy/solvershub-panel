// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import type { PasoPrimerosPasos, PrimerosPasos as Datos } from "@/lib/api/types";

import { PrimerosPasos } from "./primeros-pasos";

function datos(pasos: PasoPrimerosPasos[]): Datos {
  return {
    alta_en: "2026-10-09T12:00:00Z",
    origen: "aprovisionamiento",
    completos: pasos.filter((p) => p.estado === "completo").length,
    total: pasos.length,
    pasos,
  };
}

const PASOS: PasoPrimerosPasos[] = [
  { clave: "datos_negocio", estado: "completo", puede_actuar: true, completado_en: "2026-10-09T12:05:00Z" },
  { clave: "whatsapp", estado: "en_curso", motivo: "sin_verificar", puede_actuar: true },
  { clave: "catalogo", estado: "pendiente", motivo: "sin_contenido", tipo: "catalogo", pack: "pack_commerce", puede_actuar: true },
  { clave: "probar_asistente", estado: "pendiente", motivo: "sin_pruebas", puede_actuar: false },
  { clave: "equipo", estado: "pendiente", motivo: "sin_invitaciones", puede_actuar: true },
  {
    clave: "configurar_pack_payments",
    estado: "pendiente",
    motivo: "faltan_datos",
    pack: "pack_payments",
    titulo: "Pagos en línea",
    explicacion: "Configura tus llaves de Wompi (sandbox o producción).",
    puede_actuar: true,
  },
];

function fila(nombre: string): HTMLElement {
  const item = screen.getByText(nombre).closest("li");
  if (!item) throw new Error(`sin fila para ${nombre}`);
  return item;
}

describe("PrimerosPasos (HU-SH-06)", () => {
  beforeEach(() => {
    document.cookie = "panel_pasos_plegados=; path=/; max-age=0";
  });

  it("muestra el avance calculado y cada paso en lenguaje de negocio", () => {
    render(<PrimerosPasos datos={datos(PASOS)} />);

    expect(screen.getByRole("region", { name: "Primeros pasos" })).toBeTruthy();
    expect(screen.getByText(/1 de 6 listos/)).toBeTruthy();
    const barra = screen.getByRole("progressbar", { name: "Avance de los primeros pasos" });
    expect(barra.getAttribute("aria-valuenow")).toBe("1");
    expect(barra.getAttribute("aria-valuemax")).toBe("6");
    for (const titulo of ["Describe tu negocio", "Conecta tu WhatsApp", "Carga tu catálogo", "Prueba tu asistente", "Invita a tu equipo"]) {
      expect(screen.getByText(titulo)).toBeTruthy();
    }
    // Ninguna clave ni motivo crudo a la vista.
    expect(screen.queryByText(/sin_verificar|datos_negocio|faltan_datos/)).toBeNull();
  });

  it("un paso listo no ofrece acción y dice su estado en texto", () => {
    render(<PrimerosPasos datos={datos(PASOS)} />);
    const listo = fila("Describe tu negocio");
    expect(within(listo).queryByRole("link")).toBeNull();
    expect(within(listo).getAllByText("Listo").length).toBeGreaterThan(0);
  });

  it("cada paso pendiente lleva a donde se resuelve", () => {
    render(<PrimerosPasos datos={datos(PASOS)} />);
    expect(within(fila("Conecta tu WhatsApp")).getByRole("link", { name: "Revisar conexión" }).getAttribute("href")).toBe(
      "/conexiones/meta",
    );
    expect(within(fila("Carga tu catálogo")).getByRole("link", { name: "Cargar productos" }).getAttribute("href")).toBe(
      "/comercio/productos",
    );
    expect(within(fila("Invita a tu equipo")).getByRole("link", { name: "Invitar" }).getAttribute("href")).toBe(
      "/colaboradores",
    );
  });

  it("sin permiso para actuar, la acción no se muestra (nunca un 403 por diseño)", () => {
    render(<PrimerosPasos datos={datos(PASOS)} />);
    expect(within(fila("Prueba tu asistente")).queryByRole("link")).toBeNull();
  });

  it("una habilidad pendiente aparece como paso con su explicación", () => {
    render(<PrimerosPasos datos={datos(PASOS)} />);
    const pagos = fila("Configura Pagos en línea");
    expect(within(pagos).getByText(/llaves de Wompi/)).toBeTruthy();
    expect(within(pagos).getByRole("link", { name: "Configurar" }).getAttribute("href")).toBe("/habilidades/pack_payments");
  });

  it("se pliega con el teclado y recuerda la preferencia", () => {
    render(<PrimerosPasos datos={datos(PASOS)} />);
    const boton = screen.getByRole("button", { name: "Ocultar pasos" });
    expect(boton.getAttribute("aria-expanded")).toBe("true");
    const lista = document.getElementById(boton.getAttribute("aria-controls") ?? "");
    expect(lista?.hidden).toBe(false);

    fireEvent.click(boton);
    expect(screen.getByRole("button", { name: "Mostrar pasos" }).getAttribute("aria-expanded")).toBe("false");
    expect(lista?.hidden).toBe(true);
    expect(document.cookie).toContain("panel_pasos_plegados=1");
  });

  it("ofrece volver a ver el recorrido", () => {
    const verRecorrido = vi.fn();
    render(<PrimerosPasos datos={datos(PASOS)} onVerRecorrido={verRecorrido} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver recorrido" }));
    expect(verRecorrido).toHaveBeenCalledOnce();
  });
});
