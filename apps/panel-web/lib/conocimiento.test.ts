import { describe, expect, it } from "vitest";

import { contenidoDesdeEstado, estadoDesdeBorrador, pasoDelCampo } from "@/lib/agentes-editor";
import {
  aplicarConocimiento,
  archivoAdmitido,
  conocimientoDesdeContenido,
  detalleDeDocumento,
  estadoDeDocumento,
  hayEnProceso,
  motivoDeFalla,
  tamanoLegible,
  usaConocimiento,
} from "@/lib/conocimiento";

// Conocimiento del agente (HU-AOS-49): estados legibles, archivos admitidos y lo que el editor
// escribe en el borrador para que el agente responda con sus documentos.

const BASE = {
  contract: "agentspec/3",
  model: { primary: "deepseek-v4-flash" },
  tools: [{ tool: "crear_pedido", enabled: true }],
  playbooks: [{ name: "ventas", description: "Ventas", pack: "pack_commerce" }],
};

describe("documentos", () => {
  it("estados y motivos en palabras del dueño", () => {
    expect(estadoDeDocumento("listo")).toEqual({ label: "Listo", tono: "success" });
    expect(estadoDeDocumento("fallido").tono).toBe("danger");
    expect(estadoDeDocumento("raro").label).toBe("Otro estado");
    expect(motivoDeFalla("sin_texto")).toMatch(/escaneado/);
    expect(motivoDeFalla("desconocido")).toMatch(/Vuelve a intentarlo/);
    expect(motivoDeFalla(null)).toBeNull();
  });

  it("revisa sola mientras haya algo en cola o procesando", () => {
    expect(hayEnProceso([{ estado: "listo" }, { estado: "procesando" }])).toBe(true);
    expect(hayEnProceso([{ estado: "pendiente" }])).toBe(true);
    expect(hayEnProceso([{ estado: "listo" }, { estado: "fallido" }])).toBe(false);
  });

  it("admite por extensión (los .md llegan sin tipo MIME)", () => {
    for (const nombre of ["faq.PDF", "politica.docx", "notas.md", "catalogo.txt"]) {
      expect(archivoAdmitido({ name: nombre })).toBe(true);
    }
    for (const nombre of ["foto.png", "hoja.xlsx", "sin-extension", "doc.pdf.exe"]) {
      expect(archivoAdmitido({ name: nombre })).toBe(false);
    }
  });

  it("tamaño y detalle legibles", () => {
    expect(tamanoLegible(800)).toBe("800 B");
    expect(tamanoLegible(2048)).toBe("2 KB");
    expect(tamanoLegible(3.5 * 1024 * 1024)).toBe("3,5 MB");
    expect(detalleDeDocumento({ bytes: 2048, paginas: 1, num_fragmentos: 3, estado: "listo" })).toBe(
      "2 KB · 1 página · 3 fragmentos",
    );
    expect(detalleDeDocumento({ bytes: 2048, paginas: null, num_fragmentos: 0, estado: "pendiente" })).toBe("2 KB");
  });
});

describe("borrador del agente", () => {
  it("sin la tool, el agente no usa conocimiento y el editor parte de los defaults", () => {
    expect(usaConocimiento(BASE)).toBe(false);
    expect(conocimientoDesdeContenido(BASE)).toEqual({ activo: false, modo: "hibrida", fragmentos: 4, umbral: null });
  });

  it("activar agrega la tool, el playbook del pack y el bloque `knowledge`, sin tocar lo demás", () => {
    const contenido = aplicarConocimiento(BASE, { activo: true, modo: "semantica", fragmentos: 6, umbral: null });
    expect(contenido.tools).toEqual([
      { tool: "crear_pedido", enabled: true },
      { tool: "buscar_conocimiento", enabled: true },
    ]);
    expect(contenido.playbooks).toEqual([
      BASE.playbooks[0],
      { name: "conocimiento", description: "Cómo responder con los documentos del negocio", pack: "pack_knowledge" },
    ]);
    // Sin umbral propio no se escribe `minScore`: la API usa el calibrado de cada modo.
    expect(contenido.knowledge).toEqual({ mode: "semantica", topK: 6 });
    expect(contenido.model).toEqual(BASE.model);
    expect(usaConocimiento(contenido)).toBe(true);
    expect(conocimientoDesdeContenido(contenido)).toEqual({ activo: true, modo: "semantica", fragmentos: 6, umbral: null });
  });

  it("es idempotente y conserva lo que ya tenía el binding", () => {
    const una = aplicarConocimiento(
      { ...BASE, tools: [...BASE.tools, { tool: "buscar_conocimiento", enabled: true, maxCallsPerConversation: 5 }] },
      { activo: true, modo: "hibrida", fragmentos: 4, umbral: 0.5 },
    );
    const dos = aplicarConocimiento(una, conocimientoDesdeContenido(una));
    expect(dos).toEqual(una);
    expect((una.tools as unknown[]).filter((t) => (t as { tool: string }).tool === "buscar_conocimiento")).toEqual([
      { tool: "buscar_conocimiento", enabled: true, maxCallsPerConversation: 5 },
    ]);
    expect(una.knowledge).toEqual({ mode: "hibrida", topK: 4, minScore: 0.5 });
  });

  it("desactivar quita la tool, el playbook y el bloque", () => {
    const activo = aplicarConocimiento(BASE, { activo: true, modo: "hibrida", fragmentos: 4, umbral: null });
    const apagado = aplicarConocimiento(activo, { activo: false, modo: "hibrida", fragmentos: 4, umbral: null });
    expect(apagado.tools).toEqual(BASE.tools);
    expect(apagado.playbooks).toEqual(BASE.playbooks);
    expect("knowledge" in apagado).toBe(false);
  });

  it("una tool deshabilitada no cuenta como activa", () => {
    expect(usaConocimiento({ tools: [{ tool: "buscar_conocimiento", enabled: false }] })).toBe(false);
  });

  it("el editor lee y escribe la sección con el resto del agente", () => {
    const estado = estadoDesdeBorrador({ name: "Ventas", description: "" }, BASE, []);
    expect(estado.conocimiento.activo).toBe(false);
    const contenido = contenidoDesdeEstado(BASE, { ...estado, conocimiento: { ...estado.conocimiento, activo: true } }, []);
    expect(usaConocimiento(contenido)).toBe(true);
    expect(contenido.knowledge).toEqual({ mode: "hibrida", topK: 4 });
    expect(pasoDelCampo("knowledge.topK")).toBe("memoria");
  });
});
