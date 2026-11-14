// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { PasoDatos } from "@/app/(app)/agentes/nuevo/_components/paso-datos";
import { PasoLoCargado } from "@/app/(app)/agentes/nuevo/_components/paso-lo-cargado";
import { FeedbackProviders } from "@/components/ui/providers";
import type { CotizacionFotos, MapeoPropuesto, PlantillaImportacion } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

import {
  avisoDeIa,
  columnasVisibles,
  cuerpoDePrecarga,
  editarCelda,
  filaDesdeFoto,
  filasDesdeMapeo,
  registrosDesdeFilas,
  sugerenciasDePrueba,
  textoDeCotizacion,
} from "./carga-de-datos";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }) }));

const PLANTILLA: PlantillaImportacion = {
  id: "productos",
  titulo: "Productos",
  ayuda: "",
  columna_clave: "sku",
  columnas: [
    { nombre: "sku", descripcion: "", obligatoria: true },
    { nombre: "nombre", descripcion: "", obligatoria: true },
    { nombre: "precio", descripcion: "", obligatoria: true },
    { nombre: "categoria", descripcion: "", obligatoria: false },
    { nombre: "imagen", descripcion: "", obligatoria: false },
  ],
  tope_filas: 500,
  tope_bytes: 1_000_000,
  en_produccion: true,
  importa_fotos: true,
};

const MAPEO: MapeoPropuesto = {
  plantilla: PLANTILLA,
  mapeo: [
    { cabecera: "Referencia", columna: "sku", origen: "heuristica" },
    { cabecera: "Producto", columna: "nombre", origen: "heuristica" },
    { cabecera: "Valor con IVA", columna: "precio", origen: "ia" },
    { cabecera: "Talla", columna: null, origen: "ninguno" },
  ],
  columnas_faltantes: [],
  ia: { usada: true, motivo_fallo: null },
  filas: [
    { fila: 2, valores: { sku: "A1", nombre: "Camiseta", precio: "35000" } },
    { fila: 3, valores: { sku: "A2", nombre: "Gorra", precio: "" } },
  ],
  vista_previa: {
    total_filas: 2,
    nuevas: 2,
    existentes: 0,
    con_errores: 0,
    errores: [],
    errores_total: 0,
    columnas_ignoradas: ["Talla"],
    columnas_faltantes: [],
  },
};

describe("lógica de la precarga", () => {
  it("marca «IA» solo en las celdas que llegaron por una columna que propuso la IA", () => {
    const filas = filasDesdeMapeo(MAPEO);
    expect(filas[0].inferidas).toEqual(["precio"]);
    expect(filas[1].inferidas).toEqual([]); // celda vacía: no hay nada que revisar
    expect(avisoDeIa(MAPEO)).toMatch(/La IA propuso 1 columna/);
    expect(avisoDeIa({ ...MAPEO, ia: { usada: false, motivo_fallo: "proveedor" } })).toMatch(/no pudo ayudar/);
  });

  it("al editar una celda deja de ser «IA» y el cuerpo lleva solo fila y valores", () => {
    const filas = editarCelda(filasDesdeMapeo(MAPEO), 2, "precio", "36000");
    expect(filas[0].inferidas).toEqual([]);
    expect(cuerpoDePrecarga(filas, true)).toEqual({
      filas: [
        { fila: 2, valores: { sku: "A1", nombre: "Camiseta", precio: "36000" } },
        { fila: 3, valores: { sku: "A2", nombre: "Gorra", precio: "" } },
      ],
      solo_validas: true,
    });
  });

  it("la foto va en la columna interna y no se muestra como texto", () => {
    expect(columnasVisibles(PLANTILLA)).toEqual(["sku", "nombre", "precio", "categoria"]);
    const fila = filaDesdeFoto(
      { image_key: "k", image_url: "https://x/f.jpg", valores: { sku: "FOTO-1", nombre: "Taza", imagen: "k" }, creditos: 2, repetida: false },
      4,
    );
    expect(fila).toMatchObject({ fila: 4, imagenUrl: "https://x/f.jpg" });
    expect(fila.inferidas).toEqual(["sku", "nombre"]);
  });

  it("cotización legible con y sin llave propia", () => {
    const c: CotizacionFotos = { fotos: 3, creditos: 6, por_foto: 2, llave_propia: false, usado: 100, limite: 2500, disponible: 2400, alcanza: true };
    expect(textoDeCotizacion(c)).toBe("Reconocer 3 fotos cuesta 6 créditos. Te quedan 2400 créditos este mes.");
    expect(textoDeCotizacion({ ...c, llave_propia: true, limite: null })).toMatch(/propia llave.*\.$/);
  });

  it("lista y frases para probar a partir de lo cargado", () => {
    const registros = registrosDesdeFilas(filasDesdeMapeo(MAPEO));
    expect(registros.map((r) => r.nombre)).toEqual(["Camiseta", "Gorra"]);
    expect(registros[0].detalle).toBe("35000");
    expect(sugerenciasDePrueba(registros)).toEqual(["¿Tienen Camiseta?", "¿Cuánto cuesta Gorra?"]);
    expect(sugerenciasDePrueba([{ tipo: "tipo", nombre: "Corte" }])).toEqual(["Quiero agendar Corte para mañana"]);
  });
});

function respuesta(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), { status });
}

const IMPORTACION = { disponible: true, plantilla: PLANTILLA, importado: null };

function montarDatos(rutas: Record<string, (init?: RequestInit) => Response>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const ruta = Object.keys(rutas).find((r) => url.startsWith(r));
    return ruta ? rutas[ruta](init) : respuesta({ error: "No existe." }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  const onCargado = vi.fn();
  const r = render(
    <FeedbackProviders>
      <PasoDatos agenteId="a-1" onCargado={onCargado} />
    </FeedbackProviders>,
  );
  return { ...r, fetchMock, onCargado };
}

describe("paso «Datos»", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("en producción no ofrece generar; el CSV propone, se revisa y se importa", async () => {
    const { fetchMock, onCargado, container } = montarDatos({
      "/api/agentes/a-1/importar-datos/mapear": () => respuesta(MAPEO),
      "/api/agentes/a-1/importar-datos/filas/validar": () => respuesta(MAPEO.vista_previa),
      "/api/agentes/a-1/importar-datos/filas": () =>
        respuesta({ lote_id: "l", plantilla: "productos", creado_en: "", creadas: 2, existentes: 0, con_errores: 0, conteos: { producto: 2 } }, 201),
      "/api/agentes/a-1/importar-datos": () => respuesta(IMPORTACION),
    });
    fireEvent.click(await screen.findByRole("radio", { name: /Importar desde un archivo/ }));
    expect(screen.queryByRole("radio", { name: /Generar datos de prueba/ })).toBeNull();

    const archivo = new File(["Referencia;Producto\nA1;Camiseta"], "lista.csv", { type: "text/csv" });
    fireEvent.change(screen.getByLabelText("Tu archivo CSV"), { target: { files: [archivo] } });
    expect(await screen.findByText(/La IA propuso 1 columna/)).toBeTruthy();
    expect(screen.getAllByText("IA")).toHaveLength(1);
    expect((await violacionesGraves(container)).join("\n")).toBe("");

    fireEvent.change(screen.getByLabelText("precio de la fila 3"), { target: { value: "20000" } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar 2 filas" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar e importar 2 filas" }));
    await waitFor(() => expect(onCargado).toHaveBeenCalled());
    expect(onCargado.mock.calls[0][0].registros.map((r: { nombre: string }) => r.nombre)).toEqual(["Camiseta", "Gorra"]);

    const confirmar = fetchMock.mock.calls.find(([u]) => u === "/api/agentes/a-1/importar-datos/filas") as unknown as [string, RequestInit];
    expect(JSON.parse(confirmar[1].body as string).filas[1].valores.precio).toBe("20000");
  });

  it("las fotos se cotizan antes y se detienen cuando se acaba el crédito, sin perder las reconocidas", async () => {
    let subidas = 0;
    const { fetchMock } = montarDatos({
      "/api/agentes/a-1/importar-datos/fotos/cotizacion": () =>
        respuesta({ fotos: 2, creditos: 4, por_foto: 2, llave_propia: false, usado: 0, limite: 2500, disponible: 2500, alcanza: true }),
      "/api/agentes/a-1/importar-datos/fotos": () => {
        subidas += 1;
        return subidas === 1
          ? respuesta({ image_key: "k1", image_url: "https://x/1.jpg", valores: { sku: "FOTO-1", nombre: "Taza", precio: "", imagen: "k1" }, creditos: 2, repetida: false })
          : respuesta({ error: "No te alcanza el crédito.", code: "plan_limit_creditos" }, 409);
      },
      "/api/agentes/a-1/importar-datos": () => respuesta(IMPORTACION),
    });
    fireEvent.click(await screen.findByRole("radio", { name: /Importar desde fotos/ }));
    const fotos = [new File(["a"], "1.jpg", { type: "image/jpeg" }), new File(["b"], "2.jpg", { type: "image/jpeg" })];
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    fireEvent.change(input, { target: { files: fotos } });
    const boton = await screen.findByRole("button", { name: "Reconocer 2 fotos por 4 créditos" });
    expect(screen.getByText(/Te quedan 2500 créditos/)).toBeTruthy();
    fireEvent.click(boton);
    expect(await screen.findByText(/se reconocieron 1 de 2 fotos/)).toBeTruthy();
    expect((screen.getByLabelText("nombre de la fila 2") as HTMLInputElement).value).toBe("Taza");
    expect(screen.getByRole("img", { name: "Foto de Taza" })).toBeTruthy();
    expect(fetchMock.mock.calls.filter(([u]) => u === "/api/agentes/a-1/importar-datos/fotos")).toHaveLength(2);
  });

  it("en test genera datos de prueba y pasa a «Lo cargado»", async () => {
    const { onCargado } = montarDatos({
      "/api/agentes/a-1/datos-de-prueba": (init) =>
        init?.method === "POST"
          ? respuesta({ lote_id: "l", modo: "agente", origen: "llm", motivo_plantilla: null, creado_en: "", conteos: { producto: 3 }, retirados: {} })
          : respuesta({ disponible: true, falta_descripcion: false, lote: null }),
    });
    fireEvent.click(await screen.findByRole("radio", { name: /Generar datos de prueba/ }));
    expect(screen.queryByRole("radio", { name: /Importar desde un archivo/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Generar datos de prueba/ }));
    await waitFor(() => expect(onCargado).toHaveBeenCalledWith({ registros: [], resumen: expect.stringMatching(/3 productos/) }));
  });
});

describe("paso «Lo cargado»", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("en test muestra lo que devuelve la API, con frases para probar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        respuesta({ lote: null, total: 1, sin_detalle: 0, registros: [{ tipo: "producto", nombre: "Pan", detalle: "$3.000", origen: "llm" }] }),
      ),
    );
    render(<PasoLoCargado agenteId="a-1" locales={[]} resumen={null} />);
    expect(await screen.findByText("Pan")).toBeTruthy();
    expect(screen.getByText("«¿Tienen Pan?»")).toBeTruthy();
  });
});
