import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/leads/embudo/route";

// HU-CRM-24: «Ver más» del tablero. La API pagina de a 100; la ruta lee la o las páginas que cubren la
// posición pedida y devuelve 50 tarjetas ya armadas.

const llamadas: URLSearchParams[] = [];
let total = 250;
let falla = false;

vi.mock("@/lib/api/server", () => ({
  apiFetch: vi.fn(async (ruta: string) => {
    const qs = new URL(ruta, "http://local").searchParams;
    llamadas.push(qs);
    if (falla) return { ok: false, status: 502, error: "No se pudo contactar el backend." };
    const pagina = Number(qs.get("page") ?? 1);
    const tam = Number(qs.get("page_size"));
    const desde = (pagina - 1) * tam;
    const items = Array.from({ length: Math.max(0, Math.min(tam, total - desde)) }, (_, i) => ({
      id: `lead-${desde + i}`,
      perfil: { nombre_visible: `Cliente ${desde + i}` },
      ultima_actividad: null,
      extras: {},
    }));
    return { ok: true, status: 200, data: { items, total, has_more: desde + tam < total } };
  }),
}));

const pedir = (query: string) => GET(new Request(`http://local/api/leads/embudo?${query}`));
const BASE = "agente=ventas&clave=estado_lead&valor=nuevo";

beforeEach(() => {
  llamadas.length = 0;
  total = 250;
  falla = false;
});

describe("GET /api/leads/embudo", () => {
  it("desde una posición dentro de la primera página trae 50 tarjetas con una sola consulta", async () => {
    const res = await pedir(`${BASE}&desde=49&q=ana&filtro=clasificacion:fiel&orden=valor_desc`);
    const json = await res.json();
    expect(json.tarjetas).toHaveLength(50);
    expect(json.tarjetas[0].id).toBe("lead-49");
    expect(json.tarjetas[49].id).toBe("lead-98");
    expect(json.hay_mas).toBe(true);
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].get("page_size")).toBe("100");
    expect(llamadas[0].has("page")).toBe(false);
    expect(llamadas[0].get("q")).toBe("ana");
    expect(llamadas[0].getAll("filtro")).toEqual(["clasificacion:fiel", "estado_lead:nuevo"]);
    expect(llamadas[0].get("orden")).toBe("valor_desc");
  });

  it("una posición que cruza de página lee las dos y no se salta ni repite tarjetas", async () => {
    const res = await pedir(`${BASE}&desde=99`);
    const json = await res.json();
    expect(llamadas.map((l) => l.get("page") ?? "1")).toEqual(["1", "2"]);
    expect(json.tarjetas.map((t: { id: string }) => t.id)).toEqual(
      Array.from({ length: 50 }, (_, i) => `lead-${99 + i}`),
    );
  });

  it("al final de la lista dice que no hay más", async () => {
    total = 120;
    const json = await (await pedir(`${BASE}&desde=100`)).json();
    expect(json.tarjetas).toHaveLength(20);
    expect(json.hay_mas).toBe(false);
  });

  it("rechaza datos inválidos sin llamar a la API", async () => {
    for (const q of [`${BASE}&desde=-1`, `${BASE}&desde=x`, `${BASE}`, "agente=Ventas%2F..&clave=estado_lead&valor=nuevo&desde=0"]) {
      expect((await pedir(q)).status).toBe(400);
    }
    expect(llamadas).toHaveLength(0);
  });

  it("si la API falla devuelve su error", async () => {
    falla = true;
    const res = await pedir(`${BASE}&desde=0`);
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe("No se pudo contactar el backend.");
  });
});
