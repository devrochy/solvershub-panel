import { describe, expect, it } from "vitest";

import type { FeedbackLimites } from "@/lib/api/types";
import {
  areaDeLaRuta,
  areasDelCatalogo,
  ayudaDeAdjuntos,
  campoDelError,
  esDuplicado,
  mensajeDeEnvio,
  queryDeReportes,
  segundosDeEspera,
  sumarAdjuntos,
  validarReporte,
} from "@/lib/feedback";

const MB = 1024 * 1024;
const LIMITES: FeedbackLimites = {
  max_adjuntos: 5,
  max_bytes_por_archivo: 8 * MB,
  max_bytes_total: 25 * MB,
  mimetypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
};

function archivo(nombre: string, bytes: number, lastModified = 1): File {
  const f = new File(["x"], nombre, { type: "image/png", lastModified });
  Object.defineProperty(f, "size", { value: bytes });
  return f;
}

describe("formulario «Reportar un problema»", () => {
  it("valida tipo, área, título (3–120) y descripción (10–2000) como el backend", () => {
    expect(validarReporte({ tipo: "", area: "", titulo: " a ", descripcion: "corta" })).toEqual({
      tipo: expect.any(String),
      area: expect.any(String),
      titulo: "Escribe un título de al menos 3 caracteres.",
      descripcion: "Cuéntanos un poco más: al menos 10 caracteres.",
    });
    expect(validarReporte({ tipo: "error", area: "otra", titulo: "x".repeat(121), descripcion: "y".repeat(2001) })).toEqual({
      titulo: "El título admite hasta 120 caracteres.",
      descripcion: "La descripción admite hasta 2000 caracteres.",
    });
    expect(validarReporte({ tipo: "idea", area: "otra", titulo: "Hola", descripcion: "Diez letras" })).toEqual({});
  });

  it("suma adjuntos sin pasar de 5 ni de 25 MB, y sin repetir", () => {
    const tres = [archivo("a.png", 8 * MB), archivo("b.png", 8 * MB), archivo("c.png", 8 * MB)];
    const r = sumarAdjuntos(tres, [archivo("d.png", 2 * MB), archivo("a.png", 8 * MB)], LIMITES);
    expect(r.archivos.map((f) => f.name)).toEqual(["a.png", "b.png", "c.png"]);
    expect(r.avisos).toEqual(["«d.png» no cabe: los adjuntos suman más de 25 MB.", "«a.png» ya está adjunto."]);

    const cinco = Array.from({ length: 5 }, (_, i) => archivo(`f${i}.png`, MB));
    const lleno = sumarAdjuntos(cinco, [archivo("g.png", MB), archivo("h.png", MB)], LIMITES);
    expect(lleno.archivos).toHaveLength(5);
    expect(lleno.avisos).toEqual(["Puedes adjuntar hasta 5 archivos."]);
  });

  it("dos capturas pegadas con el mismo nombre no se confunden si cambian tamaño o fecha", () => {
    const r = sumarAdjuntos([archivo("image.png", 100, 1)], [archivo("image.png", 100, 2)], LIMITES);
    expect(r.archivos).toHaveLength(2);
  });

  it("explica los límites del catálogo", () => {
    expect(ayudaDeAdjuntos(LIMITES)).toBe("Imágenes o PDF: hasta 5, de 8 MB cada uno y 25 MB en total.");
    expect(ayudaDeAdjuntos({ ...LIMITES, mimetypes: ["image/png"] })).toMatch(/^Imágenes: /);
  });

  it("nombra las áreas como el menú, en orden y con «Otra» al final", () => {
    const areas = areasDelCatalogo({
      areas: [
        { clave: "otra", etiqueta: "Otra" },
        { clave: "plugins", etiqueta: "Plugins" },
        { clave: "dashboard", etiqueta: "Dashboard" },
        { clave: "pack_cobranza:reportes", etiqueta: "pack_cobranza:reportes" },
        { clave: "pack_cobranza:clientes", etiqueta: "pack_cobranza:clientes" },
        { clave: "leads", etiqueta: "Leads" },
        { clave: "pack_subscriptions:suscripciones", etiqueta: "pack_subscriptions:suscripciones" },
      ],
    });
    expect(areas.map((a) => a.etiqueta)).toEqual([
      "Clientes",
      "Cobranza · Clientes",
      "Cobranza · Reportes",
      "Habilidades",
      "Resumen",
      "Suscripciones",
      "Otra",
    ]);
  });

  it("preselecciona el área de la sección donde está la persona, si el catálogo la tiene", () => {
    const areas = [{ clave: "conversations" }, { clave: "otra" }];
    expect(areaDeLaRuta("/conversaciones", areas)).toBe("conversations");
    expect(areaDeLaRuta("/agentes", areas)).toBe("");
    expect(areaDeLaRuta("/reportes", areas)).toBe("");
  });
});

describe("errores del envío", () => {
  it("422, 413 y 429 dicen qué pasó y cómo seguir", () => {
    expect(mensajeDeEnvio(422, { code: "adjunto_invalido", error: "x" })).toMatch(/no es una imagen o un PDF válido/);
    expect(mensajeDeEnvio(413, { code: "adjuntos_muy_grandes" })).toMatch(/pesan demasiado en total/);
    expect(mensajeDeEnvio(413, null)).toBe("Los adjuntos pesan demasiado. Quita alguno y vuelve a enviar.");
    expect(mensajeDeEnvio(429, { code: "demasiados_reportes" }, 1800)).toBe(
      "Enviaste varios reportes seguidos. Vuelve a intentarlo en 30 minutos.",
    );
    expect(mensajeDeEnvio(429, { code: "demasiados_reportes_del_negocio" }, 7200)).toMatch(/en 2 horas\.$/);
    expect(mensajeDeEnvio(503, { code: "almacenamiento_no_disponible" }, 30)).toMatch(/no se envió nada\. Vuelve a intentarlo en un minuto\./);
    // Código desconocido: el mensaje de la API.
    expect(mensajeDeEnvio(422, { code: "otro", error: "Mensaje de la API." })).toBe("Mensaje de la API.");
  });

  it("los códigos de validación apuntan a su campo", () => {
    expect(campoDelError("titulo_invalido")).toBe("titulo");
    expect(campoDelError("area_invalida")).toBe("area");
    expect(campoDelError("adjunto_invalido")).toBeNull();
    expect(campoDelError(undefined)).toBeNull();
  });

  it("lee `Retry-After` en segundos y nada más", () => {
    expect(segundosDeEspera("120")).toBe(120);
    expect(segundosDeEspera("Wed, 21 Oct 2026 07:28:00 GMT")).toBeNull();
    expect(segundosDeEspera(null)).toBeNull();
  });
});

describe("Mis reportes", () => {
  it("«Duplicado» solo en un rechazo por duplicado", () => {
    expect(esDuplicado({ estado: "rechazado", motivo_codigo: "duplicado" })).toBe(true);
    expect(esDuplicado({ estado: "rechazado", motivo_codigo: "otro" })).toBe(false);
    expect(esDuplicado({ estado: "aprobado", motivo_codigo: null })).toBe(false);
  });

  it("la query lleva solo valores que la API conoce", () => {
    expect(queryDeReportes({ alcance: "negocio", estado: "aprobado" })).toBe("?alcance=negocio&estado=aprobado");
    expect(queryDeReportes({ alcance: "mios", estado: "todos" })).toBe("");
    expect(queryDeReportes({ estado: "constructor" })).toBe("");
    expect(queryDeReportes({ cursor: "c".repeat(201) })).toBe("");
  });
});
