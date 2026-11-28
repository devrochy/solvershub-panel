// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DetalleDelReporte } from "@/app/(app)/reportes/_components/detalle-del-reporte";
import { opcionesDeAlcance, opcionesDeEstado } from "@/app/(app)/reportes/_components/filtros";
import { ListaDeReportes } from "@/app/(app)/reportes/_components/lista-de-reportes";
import type { FeedbackReporte, FeedbackReporteResumen } from "@/lib/api/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/reportes",
  useSearchParams: () => new URLSearchParams(),
}));

const YO = "11111111-1111-4111-8111-111111111111";
const OTRA = "22222222-2222-4222-8222-222222222222";

function resumen(extra: Partial<FeedbackReporteResumen>): FeedbackReporteResumen {
  return {
    id: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
    autor_admin_id: YO,
    tipo: "error",
    area: "conversations",
    titulo: "El chat no carga",
    descripcion: "Abro un chat y queda en blanco.",
    estado: "recibido",
    motivo_codigo: null,
    motivo: null,
    creditos_otorgados: null,
    created_at: "2026-11-27T15:00:00Z",
    decidido_en: null,
    adjuntos_total: 1,
    ...extra,
  };
}

const AREAS = { conversations: "Conversaciones", agents: "Agentes" };
const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Mis reportes", () => {
  it("muestra estado, tipo, fecha y créditos; el duplicado lleva su etiqueta sin enlace", () => {
    render(
      <ListaDeReportes
        inicial={{
          items: [
            resumen({ estado: "aprobado", creditos_otorgados: 5000, decidido_en: "2026-11-28T10:00:00Z" }),
            resumen({ id: "7f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", titulo: "Otra vez lo mismo", estado: "rechazado", motivo_codigo: "duplicado", motivo: "Ya estaba." }),
          ],
          next_cursor: null,
        }}
        query=""
        areas={AREAS}
        zona="America/Bogota"
        propios
        adminId={YO}
      />,
    );
    const filas = screen.getAllByRole("row").slice(1);
    expect(within(filas[0]).getByText("Aprobado")).toBeTruthy();
    expect(within(filas[0]).getByText("+5.000 créditos")).toBeTruthy();
    expect(within(filas[0]).getByText("Error")).toBeTruthy();
    expect(within(filas[0]).getByText("Conversaciones")).toBeTruthy();
    expect(within(filas[1]).getByText("Rechazado")).toBeTruthy();
    expect(within(filas[1]).getByText("Duplicado")).toBeTruthy();
    // La fila abre su propio detalle; nada enlaza al reporte original.
    const enlaces = within(filas[1]).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(enlaces).toEqual(["/reportes/7f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"]);
  });

  it("sin reportes, invita a reportar", () => {
    render(<ListaDeReportes inicial={{ items: [], next_cursor: null }} query="" areas={AREAS} zona="America/Bogota" propios adminId={YO} />);
    expect(screen.getByText("Todavía no enviaste reportes")).toBeTruthy();
  });

  it("«Cargar más» sigue el cursor por el BFF con el mismo filtro", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ items: [resumen({ id: "8f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", titulo: "Segunda página", autor_admin_id: OTRA })], next_cursor: null }), {
        status: 200,
      }),
    );
    render(
      <ListaDeReportes
        inicial={{ items: [resumen({})], next_cursor: "c2" }}
        query="?alcance=negocio&estado=recibido"
        areas={AREAS}
        zona="America/Bogota"
        propios={false}
        adminId={YO}
      />,
    );
    // En los del negocio se marca cuál es tuyo.
    expect(screen.getByText("Conversaciones · tuyo")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cargar más" }));
    await screen.findByText("Segunda página");
    expect(fetchMock).toHaveBeenCalledWith("/api/feedback/reports?alcance=negocio&estado=recibido&cursor=c2");
    expect(screen.queryByRole("button", { name: "Cargar más" })).toBeNull();
  });

  it("los filtros conservan el otro filtro en la URL", () => {
    expect(opcionesDeAlcance("aprobado").map((o) => o.href)).toEqual(["/reportes?estado=aprobado", "/reportes?alcance=negocio&estado=aprobado"]);
    expect(opcionesDeEstado("negocio")[0].href).toBe("/reportes?alcance=negocio");
    expect(opcionesDeEstado("mios").map((o) => o.value)).toEqual(["todos", "recibido", "en_revision", "aprobado", "rechazado"]);
  });
});

describe("detalle de un reporte", () => {
  const base: FeedbackReporte = {
    ...resumen({}),
    adjuntos: [
      {
        id: "a1",
        mimetype: "image/png",
        bytes: 204800,
        nombre_original: "captura.png",
        url: "https://api.test/api/v1/files/firma-1",
        url_expira_en: "2026-11-27T15:10:00Z",
      },
      {
        id: "a2",
        mimetype: "application/pdf",
        bytes: 3 * 1024 * 1024,
        nombre_original: null,
        url: "https://api.test/api/v1/files/firma-2",
        url_expira_en: "2026-11-27T15:10:00Z",
      },
    ],
  };
  const MIGAS = [{ label: "Cuenta" }, { label: "Mis reportes", href: "/reportes" }];

  it("muestra la evidencia con sus URLs firmadas, en pestaña nueva", () => {
    render(<DetalleDelReporte reporte={base} area="Conversaciones" zona="America/Bogota" migas={MIGAS} />);
    const evidencia = screen.getByRole("region", { name: "Evidencia" });
    const enlaces = within(evidencia).getAllByRole("link");
    expect(enlaces.map((a) => a.getAttribute("href"))).toEqual([
      "https://api.test/api/v1/files/firma-1",
      "https://api.test/api/v1/files/firma-2",
    ]);
    expect(enlaces[0].getAttribute("target")).toBe("_blank");
    expect(enlaces[0].getAttribute("rel")).toContain("noopener");
    expect(within(evidencia).getByText("captura.png")).toBeTruthy();
    expect(within(evidencia).getByText("Adjunto 2")).toBeTruthy();
    expect(within(evidencia).getByText("3 MB")).toBeTruthy();
    expect(screen.queryByText("Por qué no lo aprobamos")).toBeNull();
    expect(screen.getByText("Pendiente")).toBeTruthy();
  });

  it("un rechazo por duplicado dice el motivo y la etiqueta, sin enlace al original", () => {
    render(
      <DetalleDelReporte
        reporte={{ ...base, adjuntos: [], estado: "rechazado", motivo_codigo: "duplicado", motivo: "Ya lo teníamos anotado.", decidido_en: "2026-11-28T10:00:00Z" }}
        area="Conversaciones"
        zona="America/Bogota"
        migas={MIGAS}
      />,
    );
    const motivo = screen.getByRole("region", { name: "Por qué no lo aprobamos" });
    expect(within(motivo).getByText("Ya lo habían reportado")).toBeTruthy();
    expect(within(motivo).getByText("Ya lo teníamos anotado.")).toBeTruthy();
    expect(within(motivo).queryByRole("link")).toBeNull();
    expect(screen.getByText("Duplicado")).toBeTruthy();
    expect(screen.getByText("Sin adjuntos.")).toBeTruthy();
  });

  it("un aprobado muestra los créditos de regalo", () => {
    render(
      <DetalleDelReporte
        reporte={{ ...base, estado: "aprobado", creditos_otorgados: 3000, decidido_en: "2026-11-28T10:00:00Z" }}
        area="Conversaciones"
        zona="America/Bogota"
        migas={MIGAS}
      />,
    );
    expect(screen.getByText("+3.000 créditos")).toBeTruthy();
    expect(screen.getByText("Ya están en el saldo de tu negocio.")).toBeTruthy();
  });
});
