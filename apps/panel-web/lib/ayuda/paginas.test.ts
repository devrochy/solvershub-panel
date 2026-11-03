import { describe, expect, it } from "vitest";

import { PAGINAS_DE_AYUDA } from "@/lib/ayuda/contenido";
import { buscarPagina, hrefDeAyuda, indiceVisible, seccionesDeIndice, slugDeSegmentos, type PaginaAyuda } from "@/lib/ayuda/paginas";

const pagina = (slug: string, acceso: string, seccion = "Guía", orden = 1): PaginaAyuda => ({
  ruta: `${slug || "index"}.md`,
  slug,
  titulo: `Título ${slug || "portada"}`,
  proposito: "",
  publico: "",
  acceso,
  seccion: slug ? seccion : "",
  orden,
  html: "<h1>x</h1>",
});

const PAGINAS = [
  pagina("", "usuario", "", 0),
  pagina("guia/uso", "usuario", "Guía", 1),
  pagina("admin/equipo", "administrador", "Administración", 2),
  pagina("tec/secretos", "tecnico", "Técnica", 3),
];

describe("indiceVisible: el menú solo lista lo que el nivel puede ver", () => {
  it("usuario", () => {
    expect(indiceVisible(PAGINAS, "usuario").map((p) => p.slug)).toEqual(["", "guia/uso"]);
  });
  it("administrador", () => {
    expect(indiceVisible(PAGINAS, "administrador").map((p) => p.slug)).toEqual(["", "guia/uso", "admin/equipo"]);
  });
  it("tecnico", () => {
    expect(indiceVisible(PAGINAS, "tecnico").map((p) => p.slug)).toEqual(["", "guia/uso", "admin/equipo", "tec/secretos"]);
  });
  it("el índice no lleva el HTML", () => {
    expect(Object.keys(indiceVisible(PAGINAS, "tecnico")[0])).not.toContain("html");
  });
  it("sin páginas de un nivel superior no queda ni su sección", () => {
    const secciones = seccionesDeIndice(indiceVisible(PAGINAS, "usuario")).map((s) => s.titulo);
    expect(secciones).toEqual(["Guía"]);
  });
});

describe("buscarPagina: 404 de nivel superior (no 403)", () => {
  it("devuelve la página si el nivel la alcanza", () => {
    expect(buscarPagina(PAGINAS, ["guia", "uso"], "usuario")?.slug).toBe("guia/uso");
    expect(buscarPagina(PAGINAS, undefined, "usuario")?.slug).toBe("");
  });

  it("una página de nivel superior da null, igual que una que no existe", () => {
    expect(buscarPagina(PAGINAS, ["tec", "secretos"], "usuario")).toBeNull();
    expect(buscarPagina(PAGINAS, ["admin", "equipo"], "usuario")).toBeNull();
    expect(buscarPagina(PAGINAS, ["tec", "secretos"], "administrador")).toBeNull();
    expect(buscarPagina(PAGINAS, ["no", "existe"], "usuario")).toBeNull();
    expect(buscarPagina(PAGINAS, ["tec", "secretos"], "tecnico")?.slug).toBe("tec/secretos");
  });

  it("rechaza rutas con `..`, barras o codificación inválida", () => {
    expect(buscarPagina(PAGINAS, ["guia", "..", "tec", "secretos"], "tecnico")).toBeNull();
    expect(buscarPagina(PAGINAS, ["guia%2F..%2Ftec"], "tecnico")).toBeNull();
    expect(buscarPagina(PAGINAS, ["%E0%A4%A"], "tecnico")).toBeNull();
    expect(buscarPagina(PAGINAS, [""], "tecnico")).toBeNull();
  });
});

describe("slug y enlaces", () => {
  it("slugDeSegmentos", () => {
    expect(slugDeSegmentos(undefined)).toBe("");
    expect(slugDeSegmentos([])).toBe("");
    expect(slugDeSegmentos(["a", "b"])).toBe("a/b");
  });
  it("hrefDeAyuda", () => {
    expect(hrefDeAyuda("")).toBe("/ayuda");
    expect(hrefDeAyuda("a/b")).toBe("/ayuda/a/b");
  });
});

describe("la Wiki real (contenido generado)", () => {
  const niveles = (n: "usuario" | "administrador" | "tecnico") => indiceVisible(PAGINAS_DE_AYUDA, n);

  it("un usuario no ve páginas técnicas ni de administración; un técnico las ve todas", () => {
    const usuario = niveles("usuario");
    expect(usuario.length).toBeGreaterThan(0);
    expect(usuario.every((p) => p.acceso === "usuario")).toBe(true);
    expect(niveles("administrador").every((p) => p.acceso !== "tecnico")).toBe(true);
    expect(niveles("tecnico")).toHaveLength(PAGINAS_DE_AYUDA.length);
    expect(usuario.length).toBeLessThan(niveles("administrador").length);
    expect(niveles("administrador").length).toBeLessThan(niveles("tecnico").length);
  });

  it("una página técnica real da null para el usuario y existe para el técnico", () => {
    const tecnica = PAGINAS_DE_AYUDA.find((p) => p.acceso === "tecnico");
    expect(tecnica).toBeTruthy();
    const segmentos = tecnica!.slug.split("/");
    expect(buscarPagina(PAGINAS_DE_AYUDA, segmentos, "usuario")).toBeNull();
    expect(buscarPagina(PAGINAS_DE_AYUDA, segmentos, "administrador")).toBeNull();
    expect(buscarPagina(PAGINAS_DE_AYUDA, segmentos, "tecnico")?.titulo).toBe(tecnica!.titulo);
  });
});
