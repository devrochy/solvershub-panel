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
