import { describe, expect, it } from "vitest";

import { NAV_GROUPS } from "@/components/shell/nav";

import {
  accionesDePaleta,
  destinoDeAtajo,
  esCampoEditable,
  filtrar,
  normalizar,
  rutaDeResultado,
  seccionesDePaleta,
} from "./paleta";
import { cookieAtajos, leerAtajosActivos } from "./preferencias";

const TODO = Object.fromEntries(NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.section, "write"])));
const labels = (entradas: { label: string }[]) => entradas.map((e) => e.label);

describe("índice de la paleta: permisos (HU-DS-05)", () => {
  it("con permiso de cobranza, «prom» encuentra Cobranza › Promesas primero", () => {
    const secciones = seccionesDePaleta(TODO);
    const encontradas = filtrar(secciones, "prom", (s) => [s.nombre, s.grupo]);
    expect(encontradas[0]).toMatchObject({ label: "Cobranza › Promesas", href: "/cobranza/promesas" });
  });

  it("un colaborador sin permiso de cobranza no ve ninguna sección de cobranza", () => {
    const colaborador = { conversations: "write", escalations: "read", leads: "read", pack_commerce: "read" };
    const secciones = seccionesDePaleta(colaborador);
    expect(secciones.some((s) => s.href.startsWith("/cobranza"))).toBe(false);
    expect(labels(filtrar(secciones, "prom", (s) => [s.nombre, s.grupo]))).toEqual(["Comercio › Promociones"]);
  });

  it("solo la sección que permite el permiso, aunque el pack tenga más", () => {
    const secciones = seccionesDePaleta({ "pack_cobranza:clientes": "read" });
    expect(labels(secciones)).toEqual(["Cobranza › Clientes"]);
  });

  it("un pack apagado para el negocio no aparece, aunque haya permiso", () => {
    const secciones = seccionesDePaleta(TODO, { pack_cobranza: { enabled: false }, pack_commerce: { enabled: true } });
    expect(secciones.some((s) => s.href.startsWith("/cobranza"))).toBe(false);
    expect(secciones.some((s) => s.href === "/comercio/pedidos")).toBe(true);
  });

  it("sin permisos no hay secciones, y las rutas no se repiten", () => {
    expect(seccionesDePaleta(null)).toEqual([]);
    const hrefs = seccionesDePaleta(TODO).map((s) => s.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("acciones rápidas", () => {
  it("«pausar» aparece solo con escritura en Configuración", () => {
    const conEscritura = accionesDePaleta({ puedeEditarAsistente: true, asistentePausado: false, atajosActivos: true });
    expect(filtrar(conEscritura, "pausar", (a) => [a.label, ...a.palabras])[0]?.id).toBe("pausar-asistente");
    const sinEscritura = accionesDePaleta({ puedeEditarAsistente: false, asistentePausado: false, atajosActivos: true });
    expect(sinEscritura.some((a) => a.id === "pausar-asistente" || a.id === "reactivar-asistente")).toBe(false);
  });

  it("con el asistente pausado ofrece reactivarlo, y el interruptor de atajos dice lo que hará", () => {
    const acciones = accionesDePaleta({ puedeEditarAsistente: true, asistentePausado: true, atajosActivos: false });
    expect(acciones.map((a) => a.id)).toContain("reactivar-asistente");
    expect(acciones.find((a) => a.id === "alternar-atajos")?.label).toBe("Encender atajos de una tecla");
  });
});

describe("filtro", () => {
  it("ignora tildes y mayúsculas", () => {
    expect(normalizar("  Configuración ")).toBe("configuracion");
    const secciones = seccionesDePaleta(TODO);
    expect(labels(filtrar(secciones, "CONFIGURACION", (s) => [s.nombre, s.grupo]))).toContain("Configuración › Configuración");
  });

  it("el nombre de la sección gana sobre su grupo", () => {
    const secciones = seccionesDePaleta(TODO);
    const co = labels(filtrar(secciones, "co", (s) => [s.nombre, s.grupo]));
    expect(co.slice(0, 2)).toEqual(["Operación › Conversaciones", "Configuración › Conexiones"]);
    expect(co.indexOf("Cobranza › Carteras")).toBeGreaterThan(co.indexOf("Negocio › Costos LLM"));
  });

  it("el inicio de palabra gana sobre una coincidencia en medio", () => {
    const entradas = [{ label: "Comercio › Categorías" }, { label: "Calendario › Tipos de cita" }];
    expect(labels(filtrar(entradas, "cat", (e) => [e.label]))).toEqual(["Comercio › Categorías"]);
    expect(labels(filtrar(entradas, "ita", (e) => [e.label]))).toEqual(["Calendario › Tipos de cita"]);
  });

  it("sin consulta conserva el orden del menú", () => {
    const entradas = [{ label: "b" }, { label: "a" }];
    expect(labels(filtrar(entradas, "", (e) => [e.label]))).toEqual(["b", "a"]);
  });
});

describe("resultados de la búsqueda", () => {
  it("lleva a la ficha cuando existe y a la lista cuando no", () => {
    expect(rutaDeResultado({ id: "c1", tipo: "conversacion", titulo: "Ana", subtitulo: "" })).toBe("/conversaciones/c1");
    expect(rutaDeResultado({ id: "k1", tipo: "cliente_cobranza", titulo: "Ana", subtitulo: "" })).toBe(
      "/cobranza/clientes/k1",
    );
    expect(
      rutaDeResultado({ id: "p1", tipo: "promesa", titulo: "Ana", subtitulo: "", extra: { clienteId: "k1" } }),
    ).toBe("/cobranza/clientes/k1");
    expect(rutaDeResultado({ id: "l1", tipo: "cliente", titulo: "Ana Pérez", subtitulo: "" })).toBe(
      "/leads?q=Ana%20P%C3%A9rez",
    );
    expect(rutaDeResultado({ id: "o1", tipo: "pedido", titulo: "#12", subtitulo: "" })).toBe("/comercio/pedidos");
    expect(rutaDeResultado({ id: "x", tipo: "desconocido", titulo: "", subtitulo: "" })).toBeNull();
  });
});

describe("atajos g + letra", () => {
  it("van a la primera sección permitida y no hacen nada sin permiso", () => {
    const todo = seccionesDePaleta(TODO);
    expect(destinoDeAtajo("i", todo)).toBe("/dashboard");
    expect(destinoDeAtajo("v", todo)).toBe("/cobranza");
    const soloComercio = seccionesDePaleta({ pack_commerce: "read" });
    expect(destinoDeAtajo("v", soloComercio)).toBe("/comercio");
    expect(destinoDeAtajo("c", soloComercio)).toBeNull();
    expect(destinoDeAtajo("z", todo)).toBeNull();
  });

  it("los campos editables no disparan atajos", () => {
    expect(esCampoEditable({ tagName: "INPUT" } as unknown as EventTarget)).toBe(true);
    expect(esCampoEditable({ tagName: "DIV", isContentEditable: true } as unknown as EventTarget)).toBe(true);
    expect(esCampoEditable({ tagName: "BUTTON" } as unknown as EventTarget)).toBe(false);
    expect(esCampoEditable(null)).toBe(false);
  });

  it("la preferencia de atajos va encendida por defecto", () => {
    expect(leerAtajosActivos(undefined)).toBe(true);
    expect(leerAtajosActivos("apagados")).toBe(false);
    expect(cookieAtajos(false)).toContain("panel_atajos=apagados");
  });
});
