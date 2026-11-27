// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { EditorDeAgente } from "@/components/domain/agentes/recorrido/editor-de-agente";
import { FeedbackProviders } from "@/components/ui/providers";
import type { AgentDetail, LlmModelCatalog, RegistroDePrueba, Superpower } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

/** HU-UX-30: estación 4 · Datos para probar de la ruta, como carga guiada, una pregunta a la vez. */

const PEDIDO: Superpower = {
  id: "pack_commerce.tomar_pedido",
  version: "1.2.0",
  skill: "pack_commerce",
  title: "Tomar pedidos",
  description: "Pedidos del catálogo.",
  phrases: ["quiero pedir dos hamburguesas", "me lo mandan a la casa", "quiero hacer un pedido"],
  group: "ventas",
  group_label: "Ventas",
};

const BASE = {
  contract: "agentspec/3",
  description: "Ventas",
  persona: { inheritConnectionVoice: true, maxLength: 500, forbiddenPhrases: [] },
  model: { primary: "deepseek-flash", temperature: 0.3, fallback: "gpt-4o-mini" },
  procedures: [{ id: PEDIDO.id, version: "^1.0" }],
  memory: { shortTermTurns: 30, readScopes: ["customer", "connection", "tenant"], writeNamespaces: [] },
  tools: [{ tool: "crear_pedido", enabled: true }],
};

const ID = "11111111-1111-4111-8111-111111111111";
const agenteDe = (key: "ventas" | "agenda", name: string) =>
  ({
    id: ID,
    key,
    kind: "specialist",
    contract: "agentspec/3",
    name,
    description: "",
    status: "active",
    latest_version: null,
    created_at: "2026-10-18T00:00:00Z",
    draft: { content: BASE, lock_version: 1, base_version_id: null, updated_at: "2026-10-18T00:00:00Z" },
    versions: [],
  }) as unknown as AgentDetail;

const modelos = { items: [], min_phrases: 3, business_model: "deepseek-flash" } as unknown as LlmModelCatalog;

const PLANTILLA = {
  id: "productos",
  titulo: "Productos",
  ayuda: "",
  columna_clave: "sku",
  columnas: [
    { nombre: "sku", descripcion: "", obligatoria: true },
    { nombre: "nombre", descripcion: "", obligatoria: true },
    { nombre: "precio", descripcion: "", obligatoria: true },
    { nombre: "talla", descripcion: "", obligatoria: false },
    { nombre: "imagen", descripcion: "", obligatoria: false },
  ],
  tope_filas: 500,
  tope_bytes: 1_000_000,
  en_produccion: true,
  importa_fotos: true,
};

const MAPEO = {
  plantilla: PLANTILLA,
  mapeo: [
    { cabecera: "Referencia", columna: "sku", origen: "heuristica" },
    { cabecera: "Producto", columna: "nombre", origen: "heuristica" },
    { cabecera: "Valor", columna: "precio", origen: "ia" },
    { cabecera: "Medida", columna: null, origen: "ninguno" },
  ],
  columnas_faltantes: [],
  ia: { usada: true, motivo_fallo: null },
  filas: [
    { fila: 2, valores: { sku: "CAM-01", nombre: "Camiseta básica", precio: "35000" } },
    { fila: 3, valores: { sku: "GOR-02", nombre: "Gorra bordada", precio: "18000" } },
    { fila: 4, valores: { sku: "MED-03", nombre: "Medias", precio: "12000" } },
  ],
  vista_previa: { total_filas: 3, nuevas: 3, existentes: 0, con_errores: 0, errores: [], errores_total: 0 },
};
const CSV = "Referencia;Producto;Valor;Medida\nCAM-01;Camiseta básica;35000;M\nGOR-02;Gorra bordada;18000;Única\nMED-03;Medias;12000;S\n";

/** Lo que responde la API según el entorno: en test genera con IA y lista registros; fuera, no. */
type Escenario = { entorno: "test" | "prod"; plantilla: typeof PLANTILLA | null };
let escenario: Escenario;
let registros: RegistroDePrueba[];
const fetchMock = vi.fn();
const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status });

function responder(url: string, init?: RequestInit): Response {
  const metodo = init?.method ?? "GET";
  const ruta = url.replace(`/api/agentes/${ID}/`, "");
  const prod = escenario.entorno === "prod";
  if (ruta === "datos-de-prueba/registros") {
    return prod ? json({ error: "No existe." }, 404) : json({ lote: null, registros, total: registros.length, sin_detalle: 0 });
  }
  if (ruta === "datos-de-prueba") {
    if (prod) return json({ error: "No existe." }, 404);
    if (metodo === "POST") {
      registros = [
        { tipo: "producto", nombre: "Pan de bono", detalle: "$2.500", origen: "llm" },
        { tipo: "producto", nombre: "Almojábana", detalle: "$2.800", origen: "llm" },
      ];
      return json({ lote_id: "l", modo: "agente", origen: "llm", motivo_plantilla: null, creado_en: "", conteos: { producto: 2 }, retirados: {} });
    }
    if (metodo === "DELETE") {
      registros = registros.filter((r) => r.origen === "importacion");
      return json({ retirados: {} });
    }
    return json({ disponible: true, motivo: null, falta_descripcion: false, forma: null, lote: null });
  }
  if (ruta === "importar-datos") {
    if (metodo === "DELETE") {
      registros = registros.filter((r) => r.origen !== "importacion");
      return json({ retirados: {} });
    }
    return escenario.plantilla
      ? json({ disponible: true, motivo: null, plantilla: escenario.plantilla, importado: null })
      : json({ disponible: false, motivo: "Fuera de pruebas solo se importan productos.", plantilla: null, importado: null });
  }
  if (ruta.startsWith("importar-datos/fotos/cotizacion")) {
    return json({ fotos: 1, creditos: 2, por_foto: 2, llave_propia: false, usado: 96, limite: 100, disponible: 4, alcanza: true });
  }
  if (ruta === "importar-datos/mapear") return json(MAPEO);
  if (ruta === "importar-datos/filas/validar") {
    const filas = JSON.parse(String(init?.body)).filas;
    return json({ total_filas: filas.length, nuevas: filas.length, existentes: 0, con_errores: 0, errores: [], errores_total: 0 });
  }
  if (ruta === "importar-datos/filas") {
    const filas = JSON.parse(String(init?.body)).filas as { valores: Record<string, string> }[];
    if (!prod) {
      registros = filas.map((f) => ({ tipo: "producto", nombre: f.valores.nombre, detalle: `$${f.valores.precio}`, origen: "importacion" }));
    }
    return json({ lote_id: "i", plantilla: "productos", creado_en: "", creadas: filas.length, existentes: 0, con_errores: 0, conteos: {} }, 201);
  }
  return json({ lockVersion: 2, content: BASE });
}

beforeEach(() => {
  escenario = { entorno: "test", plantilla: PLANTILLA };
  registros = [];
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string, init?: RequestInit) => responder(String(url), init));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function abrir(agente = agenteDe("ventas", "Laura")) {
  return render(
    <FeedbackProviders>
      <EditorDeAgente
        agente={agente}
        superpoderes={[PEDIDO]}
        modelos={modelos}
        destinos={[]}
        destinosError={null}
        puedeActivar
        modo="crear"
        pasoInicial="conocimiento"
        negocio={{ nombre: "La Espiga", voz: null, resumenDeVoz: null, horario: null, motivos: null }}
      />
    </FeedbackProviders>,
  );
}

const radio = (nombre: RegExp) => screen.getByRole("radio", { name: nombre }) as HTMLInputElement;
const boton = (nombre: string | RegExp) => screen.getByRole("button", { name: nombre }) as HTMLButtonElement;
const seguir = () => boton(/Guardar y seguir: Revisar y publicar/);
const llamadas = (fin: string, metodo = "GET") =>
  fetchMock.mock.calls.filter(([u, init]) => String(u).endsWith(fin) && ((init as RequestInit | undefined)?.method ?? "GET") === metodo);

async function subirCsv() {
  const archivo = new File([CSV], "productos.csv", { type: "text/csv" });
  fireEvent.change(screen.getByLabelText("Tu archivo CSV"), { target: { files: [archivo] } });
  await screen.findByText(/Leímos 3 filas/);
}

describe("Estación 4 · Datos para probar como carga guiada (HU-UX-30)", () => {
  it("en test, un agente de Ventas ve las cuatro formas, con IA recomendada y elegida", async () => {
    const { container } = abrir();
    expect(await screen.findByRole("heading", { level: 2, name: "¿Cómo le damos productos para probar?" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "¿Con qué productos probamos a Laura?" })).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(radio(/Generar con IA/).checked).toBe(true);
    expect(radio(/Subir un archivo \(CSV\)/)).toBeTruthy();
    expect(radio(/Desde fotos/)).toBeTruthy();
    expect(radio(/Lo hago después/)).toBeTruthy();
    expect(screen.getByText("Recomendado").closest("label")?.textContent).toContain("Generar con IA");
    expect(screen.getByText("Faltan 3 preguntas")).toBeTruthy();
    expect(seguir().disabled).toBe(true);
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("fuera de test, un agente de Agenda solo ve «Lo hago después» y sin opciones avanzadas", async () => {
    escenario = { entorno: "prod", plantilla: null };
    abrir(agenteDe("agenda", "Tomás"));
    expect(await screen.findByRole("heading", { level: 2, name: "¿Cómo le damos servicios para probar?" })).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    expect(radio(/Lo hago después/).checked).toBe(true);
    expect(screen.queryByText("Recomendado")).toBeNull();
    expect(screen.getByText(/no hay datos que cargar desde aquí/)).toBeTruthy();
    expect(screen.queryByText("Opciones avanzadas")).toBeNull();
  });

  it("fuera de test, Ventas importa por CSV o fotos pero no genera con IA", async () => {
    escenario = { entorno: "prod", plantilla: PLANTILLA };
    abrir();
    await screen.findByRole("heading", { level: 2, name: "¿Cómo le damos productos para probar?" });
    expect(screen.queryByRole("radio", { name: /Generar con IA/ })).toBeNull();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(radio(/Subir un archivo \(CSV\)/).checked).toBe(true);
    expect(screen.getByText("Recomendado").closest("label")?.textContent).toContain("Subir un archivo");
  });

  it("«Lo hago después» deja una sola pregunta; con «Listo» la estación queda terminada y pasa a Revisar y publicar", async () => {
    abrir();
    await screen.findByRole("heading", { level: 2, name: "¿Cómo le damos productos para probar?" });
    fireEvent.click(radio(/Lo hago después/));
    expect(screen.getByText("Falta 1 pregunta")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Genera productos de ejemplo/ })).toBeNull();
    fireEvent.click(boton("Listo"));
    expect(screen.getByText("Lo hago después")).toBeTruthy();
    expect(screen.queryByText(/Falta/)).toBeNull();
    expect(seguir().disabled).toBe(false);
    fireEvent.click(seguir());
    expect(await screen.findByRole("heading", { level: 1, name: "Revisa y publica a Laura" })).toBeTruthy();
    // Nada se cargó: ni se generó ni se importó.
    expect(llamadas("/datos-de-prueba", "POST")).toHaveLength(0);
    expect(llamadas("/importar-datos/filas", "POST")).toHaveLength(0);
  });

  it("con IA genera, no deja seguir antes, y la prueba muestra lo generado", async () => {
    abrir();
    await screen.findByRole("heading", { level: 2, name: "¿Cómo le damos productos para probar?" });
    fireEvent.click(boton("Continuar"));
    expect(screen.getByRole("heading", { level: 2, name: "Genera productos de ejemplo" })).toBeTruthy();
    expect(boton("Continuar").disabled).toBe(true);
    fireEvent.click(boton(/Generar productos/));
    expect(await screen.findByText(/Listo: 2 productos, generados con IA/)).toBeTruthy();
    fireEvent.click(boton("Continuar"));
    const prueba = screen.getByRole("heading", { level: 2, name: "Pruébalo con tus productos" }).closest("section") as HTMLElement;
    expect(within(prueba).getByText("Pan de bono")).toBeTruthy();
    expect(within(prueba).getByText("Almojábana")).toBeTruthy();
    // El celular sugiere frases con lo cargado.
    expect(screen.getByRole("button", { name: "¿Cuánto vale Pan de bono?" })).toBeTruthy();
    fireEvent.click(boton("Listo"));
    expect(seguir().disabled).toBe(false);
  });

  it("revisa lo que va a cargar: filas editables, quitar una y confirmar; después prueba con lo importado", async () => {
    abrir();
    await screen.findByRole("heading", { level: 2, name: "¿Cómo le damos productos para probar?" });
    fireEvent.click(radio(/Subir un archivo \(CSV\)/));
    expect(screen.getByText("Faltan 4 preguntas")).toBeTruthy();
    fireEvent.click(boton("Continuar"));
    expect(screen.getByRole("heading", { level: 2, name: "Sube tu archivo" })).toBeTruthy();
    expect(boton("Continuar").disabled).toBe(true);
    await subirCsv();
    expect(screen.getByText(/No reconocimos «Medida»/)).toBeTruthy();
    fireEvent.click(boton("Continuar"));
    expect(screen.getByRole("heading", { level: 2, name: "Revisa lo que vamos a cargar" })).toBeTruthy();
    expect(boton("Continuar").disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("nombre de la fila 2"), { target: { value: "Camiseta azul" } });
    fireEvent.click(boton("Quitar la fila 4"));
    fireEvent.click(boton("Revisar 2 filas"));
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar e importar 2 filas" }));
    expect(await screen.findByText("Listo: 2 productos importados.")).toBeTruthy();
    const enviado = JSON.parse(String(llamadas("/importar-datos/filas", "POST")[0][1]?.body));
    expect(enviado.filas.map((f: { valores: { nombre: string } }) => f.valores.nombre)).toEqual(["Camiseta azul", "Gorra bordada"]);
    fireEvent.click(boton("Continuar"));
    const prueba = screen.getByRole("heading", { level: 2, name: "Pruébalo con tus productos" }).closest("section") as HTMLElement;
    await waitFor(() => expect(within(prueba).getByText("Camiseta azul")).toBeTruthy());
    expect(screen.getByText("Falta 1 pregunta")).toBeTruthy();
  });

  it("con fotos, la segunda pregunta es «Sube las fotos de tus productos»", async () => {
    abrir();
    await screen.findByRole("heading", { level: 2, name: "¿Cómo le damos productos para probar?" });
    fireEvent.click(radio(/Desde fotos/));
    fireEvent.click(boton("Continuar"));
    expect(screen.getByRole("heading", { level: 2, name: "Sube las fotos de tus productos" })).toBeTruthy();
    expect(screen.getByText("Revisa lo que vamos a cargar", { exact: false })).toBeTruthy();
  });
});

describe("Opciones avanzadas de la estación 4 (dueño, 2026-11-26)", () => {
  async function abrirAvanzadas() {
    abrir();
    await screen.findByRole("heading", { level: 2, name: "¿Cómo le damos productos para probar?" });
    fireEvent.click(screen.getByText("Opciones avanzadas"));
  }

  it("dice qué hay adentro y ofrece la plantilla CSV con las columnas del importador", async () => {
    await abrirAvanzadas();
    expect(screen.getByText("Plantilla CSV, columnas a mano, costo de las fotos y lo ya cargado.")).toBeTruthy();
    const enlace = screen.getByRole("link", { name: /Descargar la plantilla/ });
    expect(enlace.getAttribute("href")).toBe(`/api/agentes/${ID}/importar-datos/plantilla.csv`);
    expect(enlace.hasAttribute("download")).toBe(true);
    const columnas = within(screen.getByRole("list", { name: "Columnas de la plantilla" })).getAllByRole("listitem").map((l) => l.textContent);
    // Sin la columna interna de la foto; las obligatorias con *.
    expect(columnas).toEqual(["sku *", "nombre *", "precio *", "talla"]);
  });

  it("asigna a mano una columna que no se reconoció y rehace las filas con ella", async () => {
    await abrirAvanzadas();
    expect(screen.getByText(/Sube tu archivo en «Subir un archivo \(CSV\)»/)).toBeTruthy();
    fireEvent.click(radio(/Subir un archivo \(CSV\)/));
    fireEvent.click(boton("Continuar"));
    await subirCsv();
    const medida = screen.getByLabelText(/«Medida»/) as HTMLSelectElement;
    expect(medida.value).toBe("");
    expect(boton("Usar estas columnas").disabled).toBe(true);
    fireEvent.change(medida, { target: { value: "talla" } });
    fireEvent.click(boton("Usar estas columnas"));
    fireEvent.click(boton("Continuar"));
    expect((screen.getByLabelText("talla de la fila 2") as HTMLInputElement).value).toBe("M");
    expect((screen.getByLabelText("talla de la fila 3") as HTMLInputElement).value).toBe("Única");
    expect((screen.getByLabelText("nombre de la fila 4") as HTMLInputElement).value).toBe("Medias");
  });

  it("avisa el costo fijo de las fotos con la cifra de la cotización", async () => {
    await abrirAvanzadas();
    expect(await screen.findByText(/Cada foto cuesta 2 créditos\. Te quedan 4 este mes/)).toBeTruthy();
    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith("/importar-datos/fotos/cotizacion?fotos=1"))).toBe(true);
  });

  it("muestra lo ya cargado y lo borra por origen, con confirmación", async () => {
    registros = [
      { tipo: "producto", nombre: "Pan de bono", detalle: "$2.500", origen: "llm" },
      { tipo: "producto", nombre: "Camiseta", detalle: "$35000", origen: "importacion" },
    ];
    await abrirAvanzadas();
    const lista = screen.getByRole("list", { name: "Lo ya cargado" });
    expect(within(lista).getByText("Pan de bono")).toBeTruthy();
    expect(within(lista).getByText("Camiseta")).toBeTruthy();
    expect(screen.getByText(/Ya tiene 2 productos para probar/)).toBeTruthy();
    fireEvent.click(boton(/Borrar lo generado/));
    fireEvent.click(await screen.findByRole("button", { name: "Borrar" }));
    await waitFor(() => expect(llamadas("/datos-de-prueba", "DELETE")).toHaveLength(1));
    await waitFor(() => expect(within(screen.getByRole("list", { name: "Lo ya cargado" })).queryByText("Pan de bono")).toBeNull());
    fireEvent.click(boton(/Borrar lo importado/));
    fireEvent.click(await screen.findByRole("button", { name: "Borrar" }));
    await waitFor(() => expect(llamadas(`/agentes/${ID}/importar-datos`, "DELETE")).toHaveLength(1));
    expect(await screen.findByText("Todavía no tiene datos para probar.")).toBeTruthy();
  });
});
