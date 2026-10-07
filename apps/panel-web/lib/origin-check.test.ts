import { describe, expect, it } from "vitest";

import { origenPermitido, parseExtraOrigins } from "@/lib/origin-check";

function headers(values: Record<string, string>) {
  const h = new Headers(values);
  return { get: (name: string) => h.get(name) };
}

describe("origenPermitido", () => {
  it("detrás del proxy: Origin https y host del contenedor por http es el mismo host", () => {
    // Cloudflare/Traefik terminan el TLS: Next ve http, el navegador manda https.
    expect(origenPermitido("https://test.solvershub.site", headers({ host: "test.solvershub.site" }))).toBe(true);
  });

  it("manda x-forwarded-host sobre host", () => {
    const h = headers({ host: "10.0.1.7:3000", "x-forwarded-host": "test.solvershub.site" });
    expect(origenPermitido("https://test.solvershub.site", h)).toBe(true);
    expect(origenPermitido("http://10.0.1.7:3000", h)).toBe(false);
  });

  it("con varios proxies toma el primer x-forwarded-host", () => {
    const h = headers({ "x-forwarded-host": "test.solvershub.site, interno:3000" });
    expect(origenPermitido("https://test.solvershub.site", h)).toBe(true);
  });

  it("rechaza un origen ajeno", () => {
    expect(origenPermitido("https://evil.example", headers({ host: "test.solvershub.site" }))).toBe(false);
    // Mismo nombre con otro puerto tampoco es el mismo host.
    expect(origenPermitido("https://test.solvershub.site:8443", headers({ host: "test.solvershub.site" }))).toBe(false);
  });

  it("ORIGINS_PERMITIDAS suma orígenes sin quitar la regla por host", () => {
    const h = headers({ host: "test.solvershub.site" });
    const extra = parseExtraOrigins(" https://app.solvershub.site , ");
    expect(extra).toEqual(["https://app.solvershub.site"]);
    expect(origenPermitido("https://app.solvershub.site", h, extra)).toBe(true);
    expect(origenPermitido("https://test.solvershub.site", h, extra)).toBe(true);
  });

  it("sin Origin pasa (curl, webhooks, el backend)", () => {
    expect(origenPermitido(null, headers({ host: "test.solvershub.site" }))).toBe(true);
  });

  it("rechaza un Origin malformado o sin host esperado", () => {
    expect(origenPermitido("null", headers({ host: "test.solvershub.site" }))).toBe(false);
    expect(origenPermitido("https://test.solvershub.site", headers({}))).toBe(false);
  });
});
