import { describe, expect, it } from "vitest";

import {
  bloqueoDelAlta,
  codeDeLogin,
  esSeleccionable,
  motivoNoSeleccionable,
  nombreDePagina,
  resumirConexion,
  seleccionInicial,
  type PaginaDescubierta,
  type ResultadoConexion,
} from "@/lib/messenger-alta";

function pagina(p: Partial<PaginaDescubierta>): PaginaDescubierta {
  return { page_id: "1", name: "Mi Página", eligible: true, already_connected: false, ...p } as PaginaDescubierta;
}

describe("bloqueoDelAlta", () => {
  it("el plan sin Messenger bloquea antes que la configuración", () => {
    const b = bloqueoDelAlta({ plan_includes: false, meta_configured: false });
    expect(b?.titulo).toBe("Tu plan no incluye Messenger");
  });

  it("sin la app de Meta configurada avisa que no está disponible", () => {
    expect(bloqueoDelAlta({ plan_includes: true, meta_configured: false })?.titulo).toMatch(/no está disponible/);
  });

  it("con plan y app configurada no bloquea", () => {
    expect(bloqueoDelAlta({ plan_includes: true, meta_configured: true })).toBeNull();
  });
});

describe("selección de Páginas", () => {
  const paginas = [
    pagina({ page_id: "1" }),
    pagina({ page_id: "2", eligible: false, reason: "Te falta el rol de mensajes." }),
    pagina({ page_id: "3", already_connected: true }),
  ];

  it("solo se marcan las elegibles que no están conectadas", () => {
    expect(paginas.map(esSeleccionable)).toEqual([true, false, false]);
    expect(seleccionInicial(paginas)).toEqual(["1"]);
  });

  it("explica por qué una Página no se puede marcar", () => {
    expect(motivoNoSeleccionable(paginas[0])).toBeNull();
    expect(motivoNoSeleccionable(paginas[1])).toBe("Te falta el rol de mensajes.");
    expect(motivoNoSeleccionable(paginas[2])).toBe("Ya está conectada a este negocio.");
  });

  it("sin motivo de la API da uno genérico, nunca vacío", () => {
    expect(motivoNoSeleccionable(pagina({ eligible: false, reason: null }))).toMatch(/roles/);
  });

  it("nombra la Página por su nombre o, si no, por su ID", () => {
    expect(nombreDePagina("1", paginas)).toBe("Mi Página");
    expect(nombreDePagina("99", paginas)).toBe("Página 99");
  });
});

describe("codeDeLogin", () => {
  it("devuelve el code o vacío si se cerró el popup", () => {
    expect(codeDeLogin({ authResponse: { code: " abc " } })).toBe("abc");
    expect(codeDeLogin({ authResponse: null })).toBe("");
    expect(codeDeLogin(undefined)).toBe("");
  });
});

describe("resumirConexion", () => {
  const base: ResultadoConexion = {
    connection_id: "c",
    connected: [
      { page_id: "1", channel_connection_id: "x", subscribed: true, subscribed_fields: ["messages"] },
      { page_id: "2", channel_connection_id: "y", subscribed: false, subscribed_fields: [] },
    ],
    skipped: [{ page_id: "3", code: "insufficient_role", message: "Te falta un rol." }],
  };

  it("separa las que no quedaron suscritas y las omitidas", () => {
    const r = resumirConexion(base);
    expect(r.sinSuscripcion.map((p) => p.page_id)).toEqual(["2"]);
    expect(r.omitidas).toHaveLength(1);
    expect(r.recibiendo).toBe(true);
  });

  it("si ninguna quedó suscrita no hay Página recibiendo mensajes", () => {
    const r = resumirConexion({ ...base, connected: [base.connected[1]] });
    expect(r.recibiendo).toBe(false);
  });
});
