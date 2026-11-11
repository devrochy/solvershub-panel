// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { catalogoHabilitado } from "@/lib/catalogo";
import { violacionesGraves } from "@/lib/testing/axe";

import { Avatar, iniciales } from "./avatar";
import { Badge } from "./badge";
import { Breadcrumbs } from "./breadcrumbs";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { DataTable, type Column } from "./data-table";
import { Field } from "./field";
import { Input } from "./input";
import { KpiTile, textoDelta } from "./kpi-tile";
import { RadioGroup } from "./radio-group";
import { SearchInput } from "./search-input";
import { Sheet, SheetContent, SheetTrigger } from "./sheet";
import { Tabs } from "@/components/ui/tabs";
import { TabLinks } from "./tab-links";

// El catálogo muestra `ErrorDeCarga`, cuyo «Reintentar» usa el router.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/catalogo",
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(cleanup);

describe("Badge (HU-DS-03)", () => {
  it("con tono de estado lleva su ícono aunque no se pase", () => {
    const { container } = render(<Badge variant="danger">En mora</Badge>);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("En mora")).toBeTruthy();
  });

  it("el ícono del estado se puede reemplazar, y los tonos neutros no lo llevan", () => {
    const { container, rerender } = render(
      <Badge variant="success" icon={<span data-testid="propio" />}>
        Pagado
      </Badge>,
    );
    expect(screen.getByTestId("propio")).toBeTruthy();
    rerender(<Badge>Neutral</Badge>);
    expect(container.querySelector("svg")).toBeNull();
  });

  it("el tipo no deja quitar el ícono de un estado", () => {
    // @ts-expect-error con tono de estado el ícono es obligatorio (no se puede anular)
    render(<Badge variant="warning" icon={null}>Por vencer</Badge>);
    // En los tonos neutros sí se puede.
    render(<Badge variant="neutral" icon={null}>Neutral</Badge>);
  });
});

describe("Button", () => {
  it("en carga queda ocupado, deshabilitado y con su texto", () => {
    render(<Button loading>Guardar</Button>);
    const boton = screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(boton.getAttribute("aria-busy")).toBe("true");
  });
});

describe("Avatar", () => {
  it("usa las iniciales con el nombre como texto alternativo", () => {
    expect(iniciales("Ana María Prueba")).toBe("AP");
    expect(iniciales("Luis")).toBe("LU");
    render(<Avatar name="Ana Prueba" status="online" />);
    expect(screen.getByRole("img", { name: "Ana Prueba" }).textContent).toBe("AP");
    expect(screen.getByText("En línea")).toBeTruthy();
  });
});

describe("Breadcrumbs", () => {
  it("enlaza los niveles y marca la página actual", () => {
    render(<Breadcrumbs items={[{ label: "Cobranza", href: "/cobranza" }, { label: "Carteras", href: "/cobranza/carteras" }, { label: "Norte" }]} />);
    const nav = screen.getByRole("navigation", { name: "Migas de pan" });
    expect(within(nav).getAllByRole("link", { name: "Cobranza" })[0].getAttribute("href")).toBe("/cobranza");
    expect(within(nav).getByText("Norte").getAttribute("aria-current")).toBe("page");
  });
});

describe("TabLinks", () => {
  it("son enlaces con aria-current en la pestaña activa", () => {
    render(
      <TabLinks
        label="Secciones de agenda"
        current="/calendario/tipos"
        items={[
          { href: "/calendario/citas", label: "Citas" },
          { href: "/calendario/tipos", label: "Tipos" },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Tipos" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Citas" }).getAttribute("aria-current")).toBeNull();
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  const OCHO = ["Conversaciones", "Tareas", "Clientes y registros", "Consumo y calidad", "Conexiones", "Superpoderes", "Conocimiento", "Probar"];

  it("la compacta (HU-UX-09) tiene menos relleno, los mismos enlaces y pasa axe", async () => {
    const { container } = render(
      <TabLinks
        label="Secciones de Ventas"
        size="compact"
        current="/agentes/v?tab=probar"
        items={OCHO.map((nombre, i) => ({ label: nombre, href: i === 7 ? "/agentes/v?tab=probar" : `/agentes/v?tab=${i}` }))}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Secciones de Ventas" });
    expect(within(nav).getAllByRole("link")).toHaveLength(8);
    expect(screen.getByRole("link", { name: "Probar" }).getAttribute("aria-current")).toBe("page");
    for (const enlace of within(nav).getAllByRole("link")) expect(enlace.className).toMatch(/\bpx-3\b/);
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("la normal no cambia: px-4 y sin desplazar la fila", () => {
    render(<TabLinks label="Agenda" current="/b" items={[{ href: "/a", label: "A" }, { href: "/b", label: "B" }]} />);
    expect(screen.getByRole("link", { name: "B" }).className).toMatch(/\bpx-4\b/);
  });

  it("la compacta desplaza solo la fila hasta la pestaña activa, y no la página", () => {
    const caja = (left: number, right: number) => ({ left, right, top: 0, bottom: 44, width: right - left, height: 44, x: left, y: 0, toJSON: () => ({}) });
    const anchoFila = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(1100);
    const visible = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(900);
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return (this.tagName === "NAV" ? caja(0, 900) : caja(1000, 1080)) as DOMRect;
    });
    const scrollIntoView = vi.fn();
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    try {
      render(
        <TabLinks
          label="Secciones"
          size="compact"
          current="/p"
          items={[{ href: "/c", label: "Conversaciones" }, { href: "/p", label: "Probar" }]}
        />,
      );
      expect(screen.getByRole("navigation").scrollLeft).toBe(180);
      expect(scrollIntoView).not.toHaveBeenCalled();
    } finally {
      anchoFila.mockRestore();
      visible.mockRestore();
      rect.mockRestore();
      HTMLElement.prototype.scrollIntoView = original;
    }
  });

  it("las Tabs también desplazan solo su fila, y no la página", () => {
    const caja = (left: number, right: number) => ({ left, right, top: 0, bottom: 44, width: right - left, height: 44, x: left, y: 0, toJSON: () => ({}) });
    const anchoFila = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(1100);
    const visible = vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(900);
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return (this.getAttribute("role") === "tablist" ? caja(0, 900) : caja(1000, 1080)) as DOMRect;
    });
    const scrollIntoView = vi.fn();
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    try {
      render(<Tabs items={[{ id: "a", label: "Acceso" }, { id: "p", label: "Permisos" }]} value="p" onValueChange={() => undefined} />);
      expect(screen.getByRole("tablist").scrollLeft).toBe(180);
      expect(scrollIntoView).not.toHaveBeenCalled();
    } finally {
      anchoFila.mockRestore();
      visible.mockRestore();
      rect.mockRestore();
      HTMLElement.prototype.scrollIntoView = original;
    }
  });
});

describe("KpiTile", () => {
  it("escribe el delta contra qué compara", () => {
    expect(textoDelta({ value: 12, versus: "los 7 días anteriores" })).toBe("+12 % frente a los 7 días anteriores");
    expect(textoDelta({ value: -5.25, versus: "ayer" })).toBe("−5,3 % frente a ayer");
    expect(textoDelta({ value: 4, versus: "el mes anterior" })).toBe("+4 % frente al mes anterior");
  });

  it("con polarity up-bad, subir se marca como desfavorable", () => {
    render(<KpiTile label="Clientes en mora" value="8" delta={{ value: 10, versus: "la semana pasada" }} polarity="up-bad" />);
    expect(screen.getByText(/\+10 % frente a la semana pasada/).className).toMatch(/text-status-danger-fg/);
  });

  it("la variante hero pone la tendencia al lado de la cifra", () => {
    const { container } = render(
      <KpiTile label="Conversaciones" value="40" size="hero" sparkline={<span data-testid="tendencia" />} />,
    );
    expect(screen.getByTestId("tendencia")).toBeTruthy();
    expect(container.firstElementChild?.className).toMatch(/p-6/);
    expect(container.querySelector(".sm\\:flex-row")).not.toBeNull();
  });

  it("la compacta (HU-UX-09) es una fila en móvil y la normal desde sm; carga y error no cambian", async () => {
    const { container, rerender } = render(<KpiTile label="Consumo · 7 días" value="US$ 1,50" hint="120 respuestas." size="compact" />);
    const tarjeta = container.firstElementChild as HTMLElement;
    expect(tarjeta.className).toMatch(/\bgrid\b/);
    expect(tarjeta.className).toMatch(/sm:block/);
    expect(tarjeta.className).toMatch(/\bp-3\b.*sm:p-5/);
    expect(screen.getByText("US$ 1,50").className).toMatch(/text-sh-block.*sm:text-sh-hero/);
    expect(screen.getByText("120 respuestas.")).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
    rerender(<KpiTile label="Consumo · 7 días" size="compact" error="Sin datos por ahora." />);
    expect(screen.getByRole("alert").textContent).toBe("Sin datos por ahora.");
    expect((container.firstElementChild as HTMLElement).className).not.toMatch(/\bgrid\b/);
  });

  it("muestra carga, error y enlace a la lista", () => {
    const { container, rerender } = render(<KpiTile label="Recaudo" loading />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    rerender(<KpiTile label="Recaudo" error="No se pudo calcular." />);
    expect(screen.getByRole("alert").textContent).toBe("No se pudo calcular.");
    rerender(<KpiTile label="Por atender" value="3" href="/escalaciones" />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/escalaciones");
  });
});

describe("Field", () => {
  it("une el error con el control y lo marca inválido", () => {
    render(
      <Field label="Correo" htmlFor="correo" error="Escribe un correo válido.">
        <Input id="correo" />
      </Field>,
    );
    const campo = screen.getByLabelText(/Correo/);
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(document.getElementById(campo.getAttribute("aria-describedby") ?? "")?.textContent).toBe("Escribe un correo válido.");
  });
});

describe("SearchInput", () => {
  function Buscador() {
    const [valor, setValor] = useState("ana");
    return <SearchInput label="Buscar clientes" value={valor} onChange={setValor} shortcut="/" />;
  }

  it("limpia con el botón y con Escape, y el atajo enfoca", () => {
    render(<Buscador />);
    const campo = screen.getByRole("searchbox", { name: "Buscar clientes" }) as HTMLInputElement;
    fireEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect(campo.value).toBe("");
    fireEvent.change(campo, { target: { value: "luis" } });
    fireEvent.keyDown(campo, { key: "Escape" });
    expect(campo.value).toBe("");
    campo.blur();
    fireEvent.keyDown(window, { key: "/" });
    expect(document.activeElement).toBe(campo);
  });
});

describe("Checkbox y RadioGroup", () => {
  it("cambian de estado con su etiqueta", () => {
    const alCambiar = vi.fn();
    render(<Checkbox id="todos" label="Seleccionar todos" checked={false} onCheckedChange={alCambiar} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar todos" }));
    expect(alCambiar).toHaveBeenCalledWith(true);
  });

  it("el grupo de opciones tiene nombre y marca la elegida", () => {
    render(
      <RadioGroup
        label="Plan"
        name="plan"
        value="basico"
        options={[
          { value: "free", label: "Free" },
          { value: "basico", label: "Básico" },
        ]}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Plan" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Básico" }).getAttribute("aria-checked")).toBe("true");
  });
});

describe("Sheet", () => {
  it("abre un diálogo con nombre y se cierra con Escape", () => {
    render(
      <Sheet>
        <SheetTrigger>Ver detalle</SheetTrigger>
        <SheetContent title="Detalle del cliente">contenido</SheetContent>
      </Sheet>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));
    const dialogo = screen.getByRole("dialog", { name: "Detalle del cliente" });
    fireEvent.keyDown(dialogo, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("DataTable v2", () => {
  type Fila = { id: string; nombre: string };
  const columnas: Column<Fila>[] = [{ key: "nombre", header: "Nombre", cell: (f) => f.nombre }];
  const filas: Fila[] = [{ id: "1", nombre: "Ana" }];

  it("densidad compacta: filas de 40 px", () => {
    render(<DataTable columns={columnas} rows={filas} getRowKey={(f) => f.id} density="compact" />);
    expect(screen.getByText("Ana").closest("td")?.className).toMatch(/\bh-10\b/);
  });

  it("con alto máximo el encabezado queda fijo", () => {
    const { container } = render(<DataTable columns={columnas} rows={filas} getRowKey={(f) => f.id} maxHeight="max-h-40" />);
    expect(container.querySelector("thead")?.className).toMatch(/sticky/);
  });

  it("en carga dibuja filas esqueleto y avisa que está ocupada", () => {
    const { container } = render(<DataTable columns={columnas} rows={[]} getRowKey={(f) => f.id} loading loadingRows={3} />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(container.querySelectorAll("tbody tr")).toHaveLength(3);
  });

  it("con error lo explica y ofrece reintentar", () => {
    render(
      <DataTable
        columns={columnas}
        rows={[]}
        getRowKey={(f) => f.id}
        error="El servidor no respondió."
        errorAction={<button type="button">Reintentar</button>}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain("El servidor no respondió.");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });
});

describe("catálogo", () => {
  it("solo existe con PANEL_CATALOGO=1", () => {
    expect(catalogoHabilitado({ PANEL_CATALOGO: "1" })).toBe(true);
    expect(catalogoHabilitado({})).toBe(false);
    expect(catalogoHabilitado({ PANEL_CATALOGO: "true" })).toBe(false);
  });

  // axe sobre el catálogo completo es lento en el runner con cobertura: tiempo propio.
  it("no tiene violaciones graves de accesibilidad", async () => {
    const { Catalogo } = await import("@/app/(dev)/catalogo/_components/catalogo");
    const { container } = render(<Catalogo />);
    expect(await violacionesGraves(container)).toEqual([]);
  }, 30_000);
});
