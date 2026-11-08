import { describe, expect, it } from "vitest";

import { enlacesDeObservabilidad, resolverObservabilidadUrl } from "@/lib/observabilidad-url";

describe("resolverObservabilidadUrl", () => {
  it("sin valor no hay enlace", () => {
    expect(resolverObservabilidadUrl(undefined)).toBeNull();
    expect(resolverObservabilidadUrl(null)).toBeNull();
    expect(resolverObservabilidadUrl("   ")).toBeNull();
  });

  it("acepta una URL https absoluta", () => {
    expect(resolverObservabilidadUrl("https://solvershub.grafana.net/")).toBe("https://solvershub.grafana.net/");
    expect(resolverObservabilidadUrl("  https://kibana.solvershub.site/app/discover  ")).toBe(
      "https://kibana.solvershub.site/app/discover",
    );
  });

  it("rechaza todo lo que no sea https", () => {
    expect(resolverObservabilidadUrl("http://kibana.solvershub.site")).toBeNull();
    expect(resolverObservabilidadUrl("javascript:alert(1)")).toBeNull();
    expect(resolverObservabilidadUrl("data:text/html,hola")).toBeNull();
    expect(resolverObservabilidadUrl("//otro-sitio.test/x")).toBeNull();
    // A diferencia de «Documentación», no hay rutas del propio panel.
    expect(resolverObservabilidadUrl("/ayuda")).toBeNull();
    expect(resolverObservabilidadUrl("kibana.solvershub.site")).toBeNull();
  });
});

describe("enlacesDeObservabilidad", () => {
  const env = {
    GRAFANA_URL: "https://solvershub.grafana.net/",
    KIBANA_URL: "https://kibana.solvershub.site/",
  };

  it("el master recibe las dos URLs validadas", () => {
    expect(enlacesDeObservabilidad({ role: "master" }, env)).toEqual({
      grafanaUrl: "https://solvershub.grafana.net/",
      kibanaUrl: "https://kibana.solvershub.site/",
    });
  });

  it("el master con una variable vacía o inválida solo recibe la otra", () => {
    expect(enlacesDeObservabilidad({ role: "master" }, { GRAFANA_URL: "http://inseguro.test", KIBANA_URL: env.KIBANA_URL })).toEqual({
      grafanaUrl: null,
      kibanaUrl: "https://kibana.solvershub.site/",
    });
    expect(enlacesDeObservabilidad({ role: "master" }, {})).toEqual({ grafanaUrl: null, kibanaUrl: null });
  });

  it("nadie más que el master las recibe, ni siquiera el tester", () => {
    for (const role of ["tester", "owner", "admin", "user", null, undefined]) {
      expect(enlacesDeObservabilidad({ role }, env)).toEqual({ grafanaUrl: null, kibanaUrl: null });
    }
    expect(enlacesDeObservabilidad(null, env)).toEqual({ grafanaUrl: null, kibanaUrl: null });
  });
});
