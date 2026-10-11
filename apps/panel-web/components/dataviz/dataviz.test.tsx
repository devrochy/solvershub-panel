// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { KpiTile } from "@/components/ui/kpi-tile";
import { violacionesGraves } from "@/lib/testing/axe";

import { BarChart, LineChart, ProgressRing, Sparkline, tonoDeProgreso, type ChartDatum, type ChartSeries } from ".";

afterEach(cleanup);

const SERIES: ChartSeries[] = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "web", label: "Web" },
  { key: "instagram", label: "Instagram" },
];

const DATOS: ChartDatum[] = [
  { x: "2026-10-05", values: { whatsapp: 120, web: 40, instagram: 18 } },
  { x: "2026-10-06", values: { whatsapp: 150, web: 52, instagram: 25 } },
  { x: "2026-10-07", values: { whatsapp: 98, web: null, instagram: 30 } },
];

/** Clase de color (`stroke-data-*` / `fill-data-*`) de la marca de cada serie dibujada. */
function coloresPorSerie(contenedor: HTMLElement, selector: string): Record<string, string> {
  const colores: Record<string, string> = {};
  contenedor.querySelectorAll<SVGElement>(selector).forEach((el) => {
    const serie = el.closest("[data-serie]")?.getAttribute("data-serie");
    const color = (el.getAttribute("class") ?? "").split(" ").find((c) => /^(stroke|fill)-data-/.test(c));
    if (serie && color) colores[serie] = color;
  });
  return colores;
}

describe("LineChart (HU-DS-06)", () => {
  it("«Ver tabla» muestra los mismos datos en una tabla con encabezados", () => {
    render(<LineChart title="Conversaciones por canal" series={SERIES} data={DATOS} />);
    const boton = screen.getByRole("button", { name: "Ver tabla" });
    expect(boton.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(boton);

    expect(screen.getByRole("button", { name: "Ocultar tabla" }).getAttribute("aria-expanded")).toBe("true");
    const tabla = screen.getByRole("table");
    const encabezados = within(tabla).getAllByRole("columnheader").map((h) => h.textContent);
    expect(encabezados).toEqual(["Fecha", "WhatsApp", "Web", "Instagram"]);
    const filas = within(tabla).getAllByRole("row");
    expect(filas).toHaveLength(1 + DATOS.length);
    expect(within(filas[1]).getByText("5 oct")).toBeTruthy();
    expect(within(filas[2]).getByText("150")).toBeTruthy();
    // El valor que falta no se convierte en cero.
    expect(within(filas[3]).getByText("Sin dato")).toBeTruthy();
  });

  it("con el foco, ← → mueven el crosshair, muestran el tooltip y lo anuncian", () => {
    const { container } = render(<LineChart title="Conversaciones por canal" series={SERIES} data={DATOS} />);
    const grafico = screen.getByRole("group", { name: /Conversaciones por canal/ });
    const vivo = container.querySelector("[aria-live]") as HTMLElement;
    expect(container.querySelector("[data-crosshair]")).toBeNull();
    expect(vivo.textContent).toBe("");

    grafico.focus();
    fireEvent.keyDown(grafico, { key: "ArrowRight" });
    expect(container.querySelector("[data-crosshair]")?.getAttribute("data-crosshair")).toBe("0");
    expect(vivo.textContent).toBe("5 oct: WhatsApp 120, Web 40, Instagram 18");

    fireEvent.keyDown(grafico, { key: "ArrowRight" });
    fireEvent.keyDown(grafico, { key: "ArrowRight" });
    fireEvent.keyDown(grafico, { key: "ArrowRight" }); // no pasa del último
    expect(container.querySelector("[data-crosshair]")?.getAttribute("data-crosshair")).toBe("2");
    expect(vivo.textContent).toBe("7 oct: WhatsApp 98, Web Sin dato, Instagram 30");

    fireEvent.keyDown(grafico, { key: "ArrowLeft" });
    expect(vivo.textContent).toMatch(/^6 oct: WhatsApp 150/);
    fireEvent.keyDown(grafico, { key: "Home" });
    expect(vivo.textContent).toMatch(/^5 oct/);
    fireEvent.keyDown(grafico, { key: "Escape" });
    expect(container.querySelector("[data-crosshair]")).toBeNull();
    expect(vivo.textContent).toBe("");
  });

  it("el puntero ubica el crosshair en la fecha más cercana y lo quita al salir", () => {
    const { container } = render(<LineChart title="Canales" series={SERIES} data={DATOS} />);
    const svg = screen.getByRole("group").querySelector("svg") as SVGSVGElement;
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 240, right: 640, bottom: 240, x: 0, y: 0, toJSON: () => ({}) });

    fireEvent.pointerMove(svg, { clientX: 630, clientY: 100 });
    expect(container.querySelector("[data-crosshair]")?.getAttribute("data-crosshair")).toBe("2");
    fireEvent.pointerMove(svg, { clientX: 5, clientY: 100 });
    expect(container.querySelector("[data-crosshair]")?.getAttribute("data-crosshair")).toBe("0");
    expect(container.querySelector("[aria-live]")?.textContent).toMatch(/^5 oct/);
    fireEvent.pointerLeave(svg);
    expect(container.querySelector("[data-crosshair]")).toBeNull();
  });

  it("al filtrar una serie, las otras conservan su color", () => {
    const { container, rerender } = render(<LineChart title="Canales" series={SERIES} data={DATOS} />);
    const antes = coloresPorSerie(container, "path[stroke-width='2']");
    expect(antes).toEqual({ whatsapp: "stroke-data-1", web: "stroke-data-2", instagram: "stroke-data-3" });

    rerender(<LineChart title="Canales" series={SERIES} data={DATOS} visibleKeys={["whatsapp", "instagram"]} />);
    const despues = coloresPorSerie(container, "path[stroke-width='2']");
    expect(despues).toEqual({ whatsapp: "stroke-data-1", instagram: "stroke-data-3" });
    // La leyenda solo lista las visibles, con la misma muestra de color.
    const leyenda = screen.getByRole("list", { name: "Series" });
    expect(within(leyenda).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["WhatsApp", "Instagram"]);
  });

  it("leyenda con 2 o más series; una sola serie usa el color único, sin leyenda y con el valor final rotulado", () => {
    const { container } = render(
      <LineChart title="Conversaciones" series={[{ key: "total", label: "Total" }]} data={DATOS.map((d) => ({ x: d.x, values: { total: d.values.whatsapp } }))} area />,
    );
    expect(screen.queryByRole("list", { name: "Series" })).toBeNull();
    expect(container.querySelector("path.stroke-data-single")).not.toBeNull();
    expect(container.querySelector("path.fill-data-single")?.getAttribute("fill-opacity")).toBe("0.1");
    expect(container.querySelector("svg text.fill-headline")?.textContent).toBe("98");
  });

  it("con más de 4 series agrupa el resto en «Otros» con el color neutro", () => {
    const muchas = ["a", "b", "c", "d", "e"].map((k) => ({ key: k, label: k.toUpperCase() }));
    const { container } = render(
      <LineChart title="Muchas" series={muchas} data={[{ x: "2026-10-05", values: { a: 1, b: 2, c: 3, d: 4, e: 5 } }, { x: "2026-10-06", values: { a: 2, b: 3, c: 4, d: 5, e: 6 } }]} />,
    );
    expect(screen.getByRole("list", { name: "Series" }).textContent).toContain("Otros");
    expect(coloresPorSerie(container, "path[stroke-width='2']").__otros).toBe("stroke-data-axis");
  });

  it("sin datos lo dice y no ofrece tabla", () => {
    render(<LineChart title="Vacío" series={SERIES} data={[]} />);
    expect(screen.getByText("Sin datos para este período.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ver tabla" })).toBeNull();
  });

  it("la API no admite un segundo eje Y", () => {
    render(
      <>
        {/* @ts-expect-error un solo eje Y: no existe yAxisRight */}
        <LineChart title="Doble eje" series={SERIES} data={DATOS} yAxisRight />
        {/* @ts-expect-error un solo eje Y: no existe y2Format */}
        <BarChart title="Doble eje" series={SERIES} data={DATOS} y2Format="currency" />
        {/* @ts-expect-error yDomain es un solo dominio, no uno por eje */}
        <LineChart title="Doble eje" series={SERIES} data={DATOS} yDomain={[[0, 10], [0, 1000]]} />
      </>,
    );
    // @ts-expect-error una serie no elige eje
    const conEje: ChartSeries = { key: "sesiones", label: "Sesiones", axis: "right" };
    expect(conEje.key).toBe("sesiones");
  });

  it("no tiene violaciones graves de accesibilidad (gráfico y tabla)", async () => {
    const { container } = render(<LineChart title="Conversaciones por canal" series={SERIES} data={DATOS} area />);
    fireEvent.keyDown(screen.getByRole("group"), { key: "End" });
    fireEvent.click(screen.getByRole("button", { name: "Ver tabla" }));
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe("BarChart (HU-DS-06)", () => {
  it("barras agrupadas con extremo redondeado, colores por entidad y tooltip por barra", () => {
    const { container, rerender } = render(<BarChart title="Recaudo vs meta" series={SERIES} data={DATOS} />);
    expect(coloresPorSerie(container, "path[d^='M']")).toEqual({
      whatsapp: "fill-data-1",
      web: "fill-data-2",
      instagram: "fill-data-3",
    });
    // 3 categorías × 3 series, menos el valor que falta.
    expect(container.querySelectorAll("path[data-serie][d^='M']")).toHaveLength(8);

    const grafico = screen.getByRole("group", { name: /Recaudo vs meta/ });
    fireEvent.keyDown(grafico, { key: "ArrowRight" });
    fireEvent.keyDown(grafico, { key: "ArrowRight" });
    expect(container.querySelector("[aria-live]")?.textContent).toBe("5 oct: Web 40");

    rerender(<BarChart title="Recaudo vs meta" series={SERIES} data={DATOS} visibleKeys={["instagram"]} />);
    expect(coloresPorSerie(container, "path[d^='M']")).toEqual({ instagram: "fill-data-3" });
  });

  it("el puntero sobre el objetivo de una barra muestra su valor", () => {
    const { container } = render(
      <BarChart title="Ventas" series={[{ key: "v", label: "Ventas" }]} data={[{ x: "Lun", values: { v: 10 } }, { x: "Mar", values: { v: 30 } }]} yFormat="currency" />,
    );
    const objetivos = container.querySelectorAll("rect[fill='transparent']");
    fireEvent.pointerEnter(objetivos[1]);
    expect(container.querySelector("[aria-live]")?.textContent).toBe("Mar: Ventas $ 30");
    expect(container.querySelector("path.fill-data-single")).not.toBeNull();
  });

  it("«Ver tabla» y sin violaciones graves de accesibilidad", async () => {
    const { container } = render(<BarChart title="Recaudo" series={SERIES} data={DATOS} xHeader="Día" />);
    fireEvent.click(screen.getByRole("button", { name: "Ver tabla" }));
    expect(within(screen.getByRole("table")).getAllByRole("columnheader")[0].textContent).toBe("Día");
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe("Sparkline (HU-DS-06)", () => {
  it("junto a un valor escrito es decorativa; sola se anuncia con su resumen", () => {
    const { container, rerender } = render(<Sparkline values={[3, 5, 4, 8]} />);
    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    rerender(<Sparkline values={[3, 5, 4, 8]} label="Conversaciones: de 3 a 8" />);
    expect(screen.getByRole("img", { name: "Conversaciones: de 3 a 8" })).toBeTruthy();
  });

  it("sirve en la ranura de KpiTile sin violaciones graves", async () => {
    const { container } = render(
      <KpiTile
        label="Conversaciones (7 días)"
        value="1.284"
        delta={{ value: 12, versus: "los 7 días anteriores" }}
        sparkline={<Sparkline values={[120, 140, 132, 160, 171, 180, 204]} area />}
      />,
    );
    expect(container.querySelector("path.stroke-data-single")).not.toBeNull();
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe("ProgressRing (HU-DS-06)", () => {
  it("escribe el porcentaje y expone el valor real", () => {
    render(<ProgressRing label="Conversaciones del plan" value={1240} max={2000} caption="1.240 de 2.000" />);
    const anillo = screen.getByRole("progressbar", { name: "Conversaciones del plan" });
    expect(anillo.textContent).toBe("62 %");
    expect(anillo.getAttribute("aria-valuetext")).toBe("62 %: 1.240 de 2.000");
    expect(anillo.getAttribute("aria-valuenow")).toBe("1240");
  });

  it("el tono pasa a aviso y a exceso solo cuando significa estado", () => {
    expect(tonoDeProgreso(50)).toBe("normal");
    expect(tonoDeProgreso(80)).toBe("aviso");
    expect(tonoDeProgreso(112)).toBe("exceso");
    const { container } = render(<ProgressRing label="Consumo" value={112} />);
    expect(container.querySelector("[data-tono]")?.getAttribute("class")).toContain("stroke-status-danger-fg");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");
  });

  it("no tiene violaciones graves de accesibilidad", async () => {
    const { container } = render(<ProgressRing label="Consumo del plan" value={45} size={96} />);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
