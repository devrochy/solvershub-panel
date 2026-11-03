import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { middleware } from "@/middleware";

function post(url: string, headers: Record<string, string>) {
  return new NextRequest(url, { method: "POST", headers });
}

describe("middleware de origen (HU-ARCH-04)", () => {
  it("detrás del proxy (Next ve http) deja pasar el Origin https del mismo host", async () => {
    const res = middleware(
      post("http://test.solvershub.site/api/meta/connections/x/numbers", {
        host: "test.solvershub.site",
        origin: "https://test.solvershub.site",
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("un origen ajeno da 403 con `error` de texto", async () => {
    const res = middleware(
      post("http://test.solvershub.site/api/session", {
        host: "test.solvershub.site",
        origin: "https://evil.example",
      }),
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Origen no permitido." });
  });
});

describe("middleware de la Wiki (/ayuda)", () => {
  const get = (path: string, cookie?: string) =>
    new NextRequest(`http://test.solvershub.site${path}`, {
      headers: { host: "test.solvershub.site", "x-forwarded-proto": "https", ...(cookie ? { cookie } : {}) },
    });

  it("sin cookie de sesión redirige al login y recuerda a dónde volver", () => {
    const res = middleware(get("/ayuda/02-guia-de-usuario/01-interfaz-y-navegacion?x=1"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://test.solvershub.site/login?volver=%2Fayuda%2F02-guia-de-usuario%2F01-interfaz-y-navegacion%3Fx%3D1",
    );
  });

  it("la portada de la Wiki también lo exige", () => {
    const res = middleware(get("/ayuda"));
    expect(res.headers.get("location")).toBe("https://test.solvershub.site/login?volver=%2Fayuda");
  });

  it("con cookie de sesión deja pasar (la página decide qué páginas ve cada rol)", () => {
    const res = middleware(get("/ayuda/05-operaciones-devops/06-seguridad", "panel_session=abc"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
});
