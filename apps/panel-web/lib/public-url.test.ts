import { describe, expect, it } from "vitest";

import { publicUrl } from "@/lib/public-url";

function pedido(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers });
}

describe("publicUrl", () => {
  it("usa el host y el protocolo que vio el proxy", () => {
    const url = publicUrl(
      pedido("http://0.0.0.0:3000/api/session/cerrar", {
        "x-forwarded-host": "test.solvershub.site",
        "x-forwarded-proto": "https",
      }),
      "/login",
    );
    expect(url.toString()).toBe("https://test.solvershub.site/login");
  });

  it("no filtra la dirección interna del contenedor aunque venga en request.url", () => {
    const url = publicUrl(
      pedido("http://0.0.0.0:3000/api/session/cerrar", { "x-forwarded-host": "test.solvershub.site" }),
      "/dashboard",
    );
    expect(url.host).toBe("test.solvershub.site");
    expect(url.toString()).not.toContain("0.0.0.0");
  });

  it("cae al header host cuando el proxy no manda x-forwarded-host", () => {
    const url = publicUrl(pedido("http://0.0.0.0:3000/", { host: "panel.test" }), "/login");
    expect(url.toString()).toBe("https://panel.test/login");
  });

  it("toma el primer host cuando hay varios proxies en la cadena", () => {
    const url = publicUrl(
      pedido("http://0.0.0.0:3000/", { "x-forwarded-host": "test.solvershub.site, proxy.interno" }),
      "/login",
    );
    expect(url.host).toBe("test.solvershub.site");
  });

  it("sin cabeceras de host conserva la URL de la petición", () => {
    const sinHost = { headers: new Headers(), url: "http://0.0.0.0:3000/api" } as Request;
    expect(publicUrl(sinHost, "/login").toString()).toBe("http://0.0.0.0:3000/login");
  });
});
