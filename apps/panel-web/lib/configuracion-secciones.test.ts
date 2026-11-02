import { describe, expect, it } from "vitest";

import {
  ALIAS_TABS,
  consultaConSeccion,
  GRUPOS_MENU,
  igualProfundo,
  puedeEditarConfiguracion,
  resolverSeccion,
  SECCIONES,
  seccionesConErrores,
  seccionesVisibles,
} from "@/lib/configuracion-secciones";

describe("secciones de Configuración", () => {
  it("el menú tiene 4 grupos y cada sección pertenece a uno", () => {
    expect(GRUPOS_MENU.map((g) => g.titulo)).toEqual(["Mi negocio", "Cómo responde", "Canales y medios", "Avanzado"]);
    for (const seccion of SECCIONES) expect(GRUPOS_MENU.some((g) => g.id === seccion.grupo)).toBe(true);
  });

  it("la pestaña de herramientas ya no se llama «Habilidades» (choca con /habilidades)", () => {
    expect(SECCIONES.map((s) => s.titulo)).not.toContain("Habilidades");
    expect(SECCIONES.find((s) => s.id === "herramientas")?.titulo).toBe("Herramientas del agente");
  });

  it("los grupos del catálogo de Identidad se reparten sin repetirse ni perderse", () => {
    const pintados = SECCIONES.flatMap((s) => s.gruposIdentidad ?? []);
    expect(new Set(pintados).size).toBe(pintados.length);
    expect([...pintados].sort()).toEqual(["calidad", "escalamiento", "horario", "identidad", "respuesta", "voz"]);
  });

  it("WhatsApp Web solo aparece para quien lo tiene (master)", () => {
    expect(seccionesVisibles({ waweb: false }).map((s) => s.id)).not.toContain("whatsapp-web");
    expect(seccionesVisibles({ waweb: true }).map((s) => s.id)).toContain("whatsapp-web");
  });
});

describe("URL → sección", () => {
  it("?seccion= manda sobre ?tab=", () => {
    expect(resolverSeccion({ seccion: "horario", tab: "brain" })).toBe("horario");
  });

  it("?tab= acepta los ids de la antigua pantalla y los del panel clásico", () => {
    expect(resolverSeccion({ tab: "identity" })).toBe("identidad");
    expect(resolverSeccion({ tab: "brain" })).toBe("cerebro");
    expect(resolverSeccion({ tab: "skills" })).toBe("herramientas");
    expect(resolverSeccion({ tab: "habilidades" })).toBe("herramientas");
    expect(resolverSeccion({ tab: "advanced" })).toBe("agentspec");
    expect(resolverSeccion({ tab: "avanzado" })).toBe("agentspec");
    expect(resolverSeccion({ tab: "web-chat" })).toBe("chat-web");
    expect(resolverSeccion({ tab: "media" })).toBe("multimedia");
    expect(resolverSeccion({ tab: "a11y" })).toBe("accesibilidad");
    expect(resolverSeccion({ tab: "datos-cliente" })).toBe("datos-cliente");
  });

  it("los enlaces que ya existen en el panel siguen llegando a su sección", () => {
    // dashboard (?tab=advanced), agentes sin datos (?tab=web-chat), datos de prueba (?tab=identidad).
    for (const tab of ["advanced", "web-chat", "identidad", "datos-cliente"]) {
      expect(resolverSeccion({ tab })).toBe(ALIAS_TABS[tab]);
    }
  });

  it("un valor desconocido o una sección no disponible cae en Identidad", () => {
    expect(resolverSeccion({ seccion: "nada" })).toBe("identidad");
    expect(resolverSeccion(undefined)).toBe("identidad");
    expect(resolverSeccion({ seccion: "whatsapp-web" }, new Set(["identidad"]))).toBe("identidad");
  });
});

describe("sección → URL", () => {
  it("pone ?seccion=, conserva lo demás y retira ?tab=", () => {
    expect(consultaConSeccion("?tab=brain&x=1", "memoria")).toBe("?x=1&seccion=memoria");
    expect(consultaConSeccion("", "horario")).toBe("?seccion=horario");
  });
});

describe("errores de validación entre secciones", () => {
  it("dice en qué secciones están los campos con error", () => {
    const grupos: Record<string, "voz" | "horario"> = { persona_tone: "voz", business_ranges: "horario" };
    expect(seccionesConErrores(["persona_tone", "business_ranges"], (c) => grupos[c])).toEqual(["horario", "voz"]);
    expect(seccionesConErrores(["desconocida"], () => undefined)).toEqual([]);
  });
});

describe("permisos y comparación", () => {
  it("edita el master o quien tiene `settings` en escritura", () => {
    expect(puedeEditarConfiguracion({ role: "master", permissions: {} })).toBe(true);
    expect(puedeEditarConfiguracion({ role: "viewer", permissions: { settings: "write" } })).toBe(true);
    expect(puedeEditarConfiguracion({ role: "viewer", permissions: { settings: "read" } })).toBe(false);
    expect(puedeEditarConfiguracion(null)).toBe(false);
  });

  it("igualProfundo no depende del orden de las claves", () => {
    expect(igualProfundo({ a: 1, b: [{ x: 1, y: 2 }] }, { b: [{ y: 2, x: 1 }], a: 1 })).toBe(true);
    expect(igualProfundo({ a: 1 }, { a: 2 })).toBe(false);
    expect(igualProfundo([1, 2], [1, 2, 3])).toBe(false);
  });
});
