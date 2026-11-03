import { describe, expect, it } from "vitest";

import { resolverDocsUrl } from "@/lib/docs-url";

describe("resolverDocsUrl", () => {
  it("sin valor no hay enlace", () => {
    expect(resolverDocsUrl(undefined)).toBeNull();
    expect(resolverDocsUrl(null)).toBeNull();
    expect(resolverDocsUrl("   ")).toBeNull();
  });

  it("acepta una ruta del propio panel", () => {
    expect(resolverDocsUrl("/ayuda")).toBe("/ayuda");
    expect(resolverDocsUrl("  /ayuda/guia  ")).toBe("/ayuda/guia");
  });

  it("acepta una URL https absoluta", () => {
    expect(resolverDocsUrl("https://ayuda.ejemplo.test/inicio")).toBe("https://ayuda.ejemplo.test/inicio");
  });

  it("rechaza lo que no sea ruta propia ni https", () => {
    expect(resolverDocsUrl("http://ayuda.ejemplo.test")).toBeNull();
    expect(resolverDocsUrl("javascript:alert(1)")).toBeNull();
    expect(resolverDocsUrl("data:text/html,hola")).toBeNull();
    expect(resolverDocsUrl("//otro-sitio.test/x")).toBeNull();
    expect(resolverDocsUrl("/\\otro-sitio.test")).toBeNull();
    expect(resolverDocsUrl("ayuda")).toBeNull();
  });
});
