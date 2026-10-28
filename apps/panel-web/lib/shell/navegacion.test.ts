import { describe, expect, it } from "vitest";

import { NAV_GROUPS } from "@/components/shell/nav";

import { gruposVisibles, hojaDe, itemActivo, migasPara, pestanasPara, rutasDelMenu } from "./navegacion";
import { cookieModoSidebar, leerModoSidebar } from "./preferencias";
import { puedeVerRuta } from "./sesion";

const TODO = Object.fromEntries(rutasDelMenu().map((r) => [hojaDe(r).section, "write"]));
const grupos = gruposVisibles(TODO);
const etiquetas = (gs: ReturnType<typeof gruposVisibles>) => gs.flatMap((g) => g.visible.map((i) => i.label));

/**
 * Rutas del menú anterior (origin/main antes de HU-UX-02) con su clave de RBAC. El menú v2
 * solo las reagrupa: si una ruta dejara de estar en el menú, `puedeVerRuta` dejaría de
 * protegerla. Horario cambia a la clave que define el backend (`pack_calendar:configuracion`).
 */
const RUTAS_ANTERIORES: [string, string, boolean][] = [
  ["/dashboard", "dashboard", false], ["/agentes", "agents", false], ["/conversaciones", "conversations", false],
  ["/escalaciones", "escalations", false], ["/leads", "leads", false], ["/conexiones", "connections", false],
  ["/habilidades", "plugins", false], ["/colaboradores", "collaborators", false], ["/configuracion", "settings", false],
  ["/costos", "costs", false], ["/plan", "plan", false], ["/cobranza", "pack_cobranza:resumen", false],
  ["/cobranza/gestores", "pack_cobranza:gestores", false], ["/cobranza/carteras", "pack_cobranza:carteras", false],
  ["/cobranza/clientes", "pack_cobranza:clientes", false],
  ["/cobranza/pagos", "pack_cobranza:cobros", false], ["/cobranza/promesas", "pack_cobranza:promesas", false],
  ["/cobranza/reportes", "pack_cobranza:reportes", false],
  ["/cobranza/monitoreo", "pack_cobranza:monitoreo", false], ["/cobranza/reglas", "pack_cobranza:reglas", false],
  ["/cobranza/alertas", "pack_cobranza:alertas", false], ["/cobranza/auditoria", "pack_cobranza:auditoria", false],
  ["/cobranza/dispositivos", "pack_cobranza:dispositivos", false], ["/comercio", "pack_commerce", false],
  ["/comercio/productos", "pack_commerce", false], ["/comercio/categorias", "pack_commerce", false],
  ["/comercio/promociones", "pack_commerce", false], ["/comercio/pedidos", "pack_commerce", false],
  // HU-CAL-08: Agenda es una sola vista; las rutas viejas (`/calendario/citas|tipos|horario|bloqueos`)
  // redirigen a ella y ya no son ítems del menú.
  ["/calendario", "pack_calendar:citas", false], ["/asistente", "connections", false], ["/mensajes", "connections", false],
  ["/dlq", "settings", false], ["/tenants", "tenants", false], ["/plataforma/meta", "tenants", false],
  ["/plataforma/meta/embedded-signup", "tenants", false], ["/tenants/alta-automatica", "tenants", true],
  ["/pruebas", "qa", false],
  // Nuevas después del menú v2.
  ["/comercio/aliados", "pack_commerce", false],
  // SPEC-35 (D-43): entrada propia «Suscripciones».
  ["/suscripciones", "pack_subscriptions:suscripciones", false], ["/suscripciones/lista", "pack_subscriptions:suscripciones", false],
  ["/suscripciones/clientes", "pack_subscriptions:suscripciones", false], ["/suscripciones/pagos", "pack_subscriptions:suscripciones", false],
  // HU-AOS-26: permisos entre agentes y «Probar una frase».
  ["/agentes/colaboracion", "settings", false],
  // HU-AOS-29: tablero de fiabilidad.
  ["/agentes/calidad", "agents", false],
  // HU-CRM-12: lista de clientes de Ventas y de Agenda; exigen la sección `leads`, como Clientes.
  ["/comercio/clientes", "leads", false], ["/calendario/clientes", "leads", false],
];

describe("menú v2 (HU-UX-02)", () => {
  it("cada ruta del menú anterior sigue en el menú con la misma clave de permiso", () => {
    const actuales = rutasDelMenu().map((r) => {
      const hoja = hojaDe(r);
      return [hoja.href, hoja.section, Boolean(hoja.soloMaster)];
    });
    expect(actuales).toHaveLength(RUTAS_ANTERIORES.length);
    expect(new Set(actuales.map(([href]) => href)).size).toBe(actuales.length);
    for (const ruta of RUTAS_ANTERIORES) expect(actuales).toContainEqual(ruta);
  });

  it("las rutas que salieron del menú siguen protegidas por connections", () => {
    for (const ruta of ["/plantillas", "/plantillas/eventos", "/plantillas-opciones", "/plantillas-opciones/confirmar_cita", "/conexiones/requisitos", "/conexiones/produccion"]) {
      expect(
        puedeVerRuta(ruta, { permisos: { connections: "read" }, esMaster: false, negocioId: "t" }),
        ruta,
      ).toBe(true);
      expect(
        puedeVerRuta(ruta, { permisos: { connections: null }, esMaster: false, negocioId: "t" }),
        ruta,
      ).toBe(false);
    }
  });

  it("un dueño con todos los packs ve 12 entradas en 4 grupos (Suscripciones tiene la suya, D-43)", () => {
    const owner = { ...TODO, tenants: null, qa: null };
    const visibles = gruposVisibles(owner);
    expect(visibles.map((g) => g.group.label)).toEqual(["Operación", "Tu asistente", "Negocio", "Cuenta"]);
    expect(etiquetas(visibles)).toEqual([
      "Resumen", "Conversaciones", "Clientes", "Agentes", "Conexiones", "Agenda", "Ventas", "Suscripciones", "Cobranza",
      "Consumo y plan", "Equipo", "Configuración",
    ]);
  });

  it("una entrada se ve con una sola pestaña permitida y lleva a esa pestaña", () => {
    const soloCostos = gruposVisibles({ costs: "read" });
    expect(etiquetas(soloCostos)).toEqual(["Consumo y plan"]);
    expect(soloCostos[0].visible[0].href).toBe("/costos");
    expect(soloCostos[0].visible[0].tabs?.map((t) => t.label)).toEqual(["Costos"]);
  });

  it("cada entrada del menú tiene su propio ícono (la barra plegada se lee por íconos)", () => {
    const entradas = NAV_GROUPS.flatMap((g) => g.items);
    expect(new Set(entradas.map((i) => i.icon)).size).toBe(entradas.length);
  });
});

describe("navegación del shell (HU-DS-04)", () => {
  it("solo muestra los grupos con secciones permitidas", () => {
    const soloAtencion = gruposVisibles({ conversations: "write", escalations: "read" });
    expect(soloAtencion.map((g) => g.group.id)).toEqual(["operacion"]);
    expect(etiquetas(soloAtencion)).toEqual(["Conversaciones"]);
    expect(soloAtencion[0].visible[0].tabs?.map((t) => t.label)).toEqual(["Conversaciones", "Escalaciones"]);
  });

  it("un tester (ADR-0134) ve Pruebas y Equipo; sin la sección, Equipo se oculta", () => {
    const visibles = etiquetas(gruposVisibles(TODO));
    expect(visibles).toContain("Pruebas");
    expect(visibles).toContain("Equipo");
    expect(etiquetas(gruposVisibles({ ...TODO, collaborators: null }))).not.toContain("Equipo");
    expect(itemActivo("/pruebas/informes/1", grupos)?.item.label).toBe("Pruebas");
    // Un owner de negocio no tiene la sección `qa`: no ve Pruebas.
    expect(etiquetas(gruposVisibles({ ...TODO, qa: null }))).not.toContain("Pruebas");
  });

  it("Alta automática es solo del master, aunque tenga la sección `tenants`", () => {
    const pestanas = (esMaster: boolean) =>
      gruposVisibles({ tenants: "write" }, NAV_GROUPS, esMaster)[0].visible.flatMap((i) => i.tabs?.map((t) => t.label) ?? []);
    expect(pestanas(false)).toEqual(["Negocios", "App de Meta", "Embedded Signup"]);
    expect(pestanas(true)).toContain("Alta automática");
    expect(itemActivo("/tenants/alta-automatica", gruposVisibles(TODO, NAV_GROUPS, true))?.tab?.label).toBe("Alta automática");
  });

  it("la página activa es la más específica, y el ítem es su entrada", () => {
    expect(itemActivo("/cobranza/carteras/7", grupos)).toMatchObject({ item: { label: "Cobranza" }, tab: { label: "Carteras" } });
    expect(itemActivo("/cobranza", grupos)?.tab?.label).toBe("Resumen");
    expect(itemActivo("/conexiones/requisitos", grupos)).toMatchObject({ item: { label: "Conexiones" }, tab: null });
    expect(itemActivo("/dashboard", grupos)).toMatchObject({ item: { label: "Resumen" }, tab: null });
    expect(itemActivo("/no-existe", grupos)).toBeNull();
  });

  it("migas: grupo › entrada › pestaña, y el título en un detalle", () => {
    expect(migasPara("/cobranza/carteras", grupos)).toEqual([
      { label: "Negocio" },
      { label: "Cobranza", href: "/cobranza" },
      { label: "Carteras" },
    ]);
    expect(migasPara("/cobranza/carteras/7", grupos, "Cartera Norte")).toEqual([
      { label: "Negocio" },
      { label: "Cobranza", href: "/cobranza" },
      { label: "Carteras", href: "/cobranza/carteras" },
      { label: "Cartera Norte" },
    ]);
    // Un cliente cuelga de su cartera: los padres de datos van entre la pestaña y el título.
    expect(
      migasPara("/cobranza/carteras/7/clientes/42", grupos, "Ana Pérez", [
        { label: "Cartera Norte", href: "/cobranza/carteras/7" },
        { label: "Clientes", href: "/cobranza/carteras/7/clientes" },
      ]),
    ).toEqual([
      { label: "Negocio" },
      { label: "Cobranza", href: "/cobranza" },
      { label: "Carteras", href: "/cobranza/carteras" },
      { label: "Cartera Norte", href: "/cobranza/carteras/7" },
      { label: "Clientes", href: "/cobranza/carteras/7/clientes" },
      { label: "Ana Pérez" },
    ]);
    // En la portada de la entrada, la entrada no se enlaza a sí misma.
    expect(migasPara("/calendario", grupos)).toEqual([{ label: "Negocio" }, { label: "Agenda" }, { label: "Citas" }]);
    expect(migasPara("/calendario/clientes", grupos)).toEqual([
      { label: "Negocio" },
      { label: "Agenda", href: "/calendario" },
      { label: "Clientes" },
    ]);
    expect(migasPara("/dashboard", grupos)).toEqual([{ label: "Operación" }, { label: "Resumen" }]);
  });

  it("pestañas: las de la entrada y, con subgrupos, las del subgrupo actual", () => {
    expect(pestanasPara("/calendario", grupos).pestanas.map((p) => p.label)).toEqual(["Citas", "Clientes"]);
    const cobranza = pestanasPara("/cobranza/reglas", grupos);
    expect(cobranza.subgrupos).toEqual([
      { href: "/cobranza", label: "Resumen" },
      { href: "/cobranza/carteras", label: "Carteras" },
      { href: "/cobranza/pagos", label: "Actividad" },
      { href: "/cobranza/gestores", label: "Equipo" },
      { href: "/cobranza/monitoreo", label: "Asistente" },
    ]);
    expect(cobranza.subgrupoActual).toBe("/cobranza/monitoreo");
    expect(cobranza.pestanas.map((p) => p.label)).toEqual(["Monitoreo IA", "Reglas de negociación"]);
    // Carteras y Resumen son áreas de una sola sección: sin segunda fila. Clientes es una página oculta.
    expect(pestanasPara("/cobranza/carteras/7", grupos).pestanas).toEqual([]);
    expect(pestanasPara("/cobranza/clientes", grupos)).toMatchObject({ pestanas: [], subgrupoActual: "/cobranza/carteras" });
    expect(pestanasPara("/dashboard", grupos)).toEqual({ subgrupos: [], subgrupoActual: null, pestanas: [], ocultas: [] });
  });

  it("quien solo tiene Alertas de acceso sigue viéndolas en Equipo, sin 403", () => {
    const soloAlertas = gruposVisibles({ "pack_cobranza:alertas": "read" });
    expect(puedeVerRuta("/cobranza/alertas", { permisos: { "pack_cobranza:alertas": "read" }, esMaster: false, negocioId: "t" })).toBe(true);
    expect(puedeVerRuta("/cobranza/dispositivos", { permisos: { "pack_cobranza:alertas": "read" }, esMaster: false, negocioId: "t" })).toBe(false);
    expect(pestanasPara("/cobranza/alertas", soloAlertas).subgrupos).toEqual([]);
  });

  it("las pestañas respetan los permisos", () => {
    const parcial = gruposVisibles({ "pack_commerce": "read" });
    expect(pestanasPara("/comercio", parcial).pestanas.length).toBeGreaterThan(0);
    const sin = gruposVisibles({});
    expect(pestanasPara("/comercio", sin).pestanas).toEqual([]);
  });
});

describe("Agenda en una sola vista (HU-CAL-08)", () => {
  it("Agenda abre en /calendario, su vista es una sola y se ve con el permiso de citas", () => {
    const agenda = grupos.flatMap((g) => g.visible).find((i) => i.label === "Agenda")!;
    expect(agenda.href).toBe("/calendario");
    // La única otra pestaña es Clientes (HU-CRM-12); las rutas viejas siguen sin ser pestañas.
    expect(agenda.tabs?.map((t) => t.href)).toEqual(["/calendario", "/calendario/clientes"]);
    expect(puedeVerRuta("/calendario", { permisos: { "pack_calendar:citas": "read" }, esMaster: false, negocioId: "t" })).toBe(true);
    expect(puedeVerRuta("/calendario", { permisos: { "pack_calendar:citas": null }, esMaster: false, negocioId: "t" })).toBe(false);
  });

  it("la pestaña Clientes de Agenda y de Ventas exige `leads`, sin 403 de diseño (HU-CRM-12)", () => {
    const conLeads = { permisos: { leads: "read" }, esMaster: false, negocioId: "t" };
    const sinLeads = { permisos: { "pack_calendar:citas": "read", pack_commerce: "read" }, esMaster: false, negocioId: "t" };
    for (const ruta of ["/calendario/clientes", "/comercio/clientes"]) {
      expect(puedeVerRuta(ruta, conLeads), ruta).toBe(true);
      expect(puedeVerRuta(ruta, sinLeads), ruta).toBe(false);
    }
    const sinClientes = gruposVisibles(sinLeads.permisos);
    expect(pestanasPara("/calendario", sinClientes).pestanas).toEqual([]);
    expect(pestanasPara("/comercio", sinClientes).pestanas.map((p) => p.label)).not.toContain("Clientes");
  });

  it("en /comercio/aliados (oculta, HU-CRM-03) se ven las pestañas de Ventas sin «Aliados»", () => {
    const ventas = pestanasPara("/comercio/aliados", grupos);
    expect(ventas.pestanas.map((p) => p.label)).toEqual(["Resumen", "Productos", "Categorías", "Promociones", "Pedidos", "Clientes"]);
    expect(ventas.ocultas).toEqual(["/comercio/aliados"]);
    expect(migasPara("/comercio/aliados", grupos)).toEqual([
      { label: "Negocio" },
      { label: "Ventas", href: "/comercio" },
      { label: "Aliados" },
    ]);
  });
});

describe("preferencia de la barra lateral", () => {
  it("sin cookie o con un valor raro, es auto", () => {
    expect(leerModoSidebar(undefined)).toBe("auto");
    expect(leerModoSidebar("lo-que-sea")).toBe("auto");
    expect(leerModoSidebar("plegada")).toBe("plegada");
    expect(cookieModoSidebar("expandida")).toMatch(/^panel_sidebar=expandida; path=\/; max-age=31536000; samesite=lax$/);
  });
});
