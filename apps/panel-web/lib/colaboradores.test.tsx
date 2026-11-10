// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { NewCollaboratorDialog } from "@/app/(app)/colaboradores/_components/new-collaborator-dialog";
import { TablaDeColaboradores } from "@/app/(app)/colaboradores/_components/tabla-de-colaboradores";
import { FeedbackProviders } from "@/components/ui/providers";
import type { CollaboratorItem, PackProfile } from "@/lib/api/types";
import { resetToasts } from "@/lib/toast-store";

import {
  filtrarPorNegocio,
  gruposDePermisos,
  mensajeDeAlta,
  negociosDeFilas,
  perfilDePack,
  permisoLegible,
  permisosAGuardar,
  puedeActuarSobre,
  resumenDePerfiles,
  resumenDePermisos,
  rolDeCuenta,
  seccionesOtorgables,
} from "./colaboradores";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/colaboradores",
}));

const NORTE = { slug: "tienda-norte", name: "Tienda Norte" };
const SUR = { slug: "tienda-sur", name: "Tienda Sur" };

function cuenta(extra: Partial<CollaboratorItem>): CollaboratorItem {
  return {
    id: "c-1",
    email: "cuenta@test",
    username: null,
    nombre: null,
    telefono: null,
    avatar_url: null,
    role: "colaborador",
    active: true,
    is_self: false,
    is_platform_master: false,
    permissions: [],
    links: [{ role: "colaborador", ...NORTE }],
    pack_profiles: [],
    ...extra,
  };
}

const YO = cuenta({ id: "yo", email: "duena@test", role: "owner", is_self: true, links: [{ role: "owner", ...NORTE }] });
const OTRO_DUENO = cuenta({ id: "dueno2", email: "socio@test", links: [{ role: "owner", ...NORTE }] });
const MASTER = cuenta({ id: "master", email: "master@test", role: "master", is_platform_master: true, links: [] });
const TESTER = cuenta({ id: "tester", email: "tester@test", role: "tester", links: [] });
const OPERADOR = cuenta({
  id: "op",
  email: "operador@test",
  permissions: [
    { section: "conversations", access: "write", scope: "tienda-norte" },
    { section: "plugins", access: "none", scope: "*" },
  ],
});
const DEL_SUR = cuenta({ id: "sur", email: "sur@test", links: [{ role: "colaborador", ...SUR }] });

const PERFIL_GESTOR: PackProfile = {
  pack: "pack_cobranza",
  role_id: "gestor",
  ref_id: "g-1",
  etiqueta: "Gestor",
  resumen: {
    estatus: "activo",
    carteras: [
      { id: "c1", nombre: "Ruta A" },
      { id: "c2", nombre: "Ruta B" },
    ],
    permisos_activos: 3,
    permisos_total: 14,
  },
  edit: { kind: "cobranza_gestor_permisos", ref_id: "g-1" },
};

describe("reglas de Colaboradores (lógica pura)", () => {
  it("permisos en texto claro, con el negocio solo para quien ve varios", () => {
    const permiso = { section: "conversations", access: "write", scope: "tienda-norte" };
    expect(permisoLegible(permiso)).toBe("Conversaciones: escritura");
    expect(permisoLegible(permiso, { "tienda-norte": "Tienda Norte" })).toBe("Conversaciones: escritura · Tienda Norte");
    expect(permisoLegible({ section: "plugins", access: "read", scope: "*" }, {})).toBe("Habilidades: lectura");
    expect(permisoLegible({ section: "plugins", access: "none", scope: "*" })).toBe("Habilidades: sin acceso");
  });

  it("un dueño no actúa sobre otros dueños ni sobre cuentas de plataforma; el master sí", () => {
    expect(puedeActuarSobre(OPERADOR, false)).toBe(true);
    expect(puedeActuarSobre(YO, false)).toBe(true);
    expect(puedeActuarSobre(OTRO_DUENO, false)).toBe(false);
    expect(puedeActuarSobre(MASTER, false)).toBe(false);
    expect(puedeActuarSobre(TESTER, false)).toBe(false);
    for (const fila of [OTRO_DUENO, MASTER, TESTER]) expect(puedeActuarSobre(fila, true)).toBe(true);
  });

  it("negocios de las filas y filtro", () => {
    const filas = [YO, OPERADOR, DEL_SUR];
    expect(negociosDeFilas(filas)).toEqual([NORTE, SUR]);
    expect(filtrarPorNegocio(filas, "tienda-sur").map((f) => f.id)).toEqual(["sur"]);
    expect(filtrarPorNegocio(filas, "")).toHaveLength(3);
  });

  it("un dueño no otorga plataforma, pruebas ni la gestión de cuentas", () => {
    const permisos = { dashboard: "write", collaborators: "write", tenants: "write", qa: "write", plugins: null };
    expect(seccionesOtorgables(permisos, false)).toEqual(["dashboard"]);
    expect(seccionesOtorgables(permisos, true)).toEqual(["collaborators", "dashboard", "qa", "tenants"]);
  });

  it("el aviso del alta distingue cuenta creada de invitación enviada", () => {
    expect(mensajeDeAlta("invitado")).toMatch(/se le envió una invitación/);
    expect(mensajeDeAlta("creado")).toMatch(/Cuenta creada/);
  });

  it("rol y permisos en palabras (EQU-02, EQU-06)", () => {
    expect(rolDeCuenta(cuenta({ role: "collaborator" }))).toBe("Colaborador");
    expect(rolDeCuenta(OTRO_DUENO)).toBe("Dueño");
    expect(rolDeCuenta(MASTER)).toBe("Master");
    expect(resumenDePermisos(YO)).toBe("Acceso total");
    expect(resumenDePermisos(cuenta({}))).toBe("Según su rol");
    expect(resumenDePermisos(OPERADOR)).toBe("Según su rol, con 2 cambios");
  });

  it("permisos agrupados y nombrados como el menú (EQU-05)", () => {
    const grupos = gruposDePermisos([
      "costs",
      "leads",
      "pack_cobranza:clientes",
      "pack_calendar:tipos",
      "pack_calendar:citas",
      "settings",
      "dashboard",
      "algo_nuevo",
    ]);
    expect(grupos.map((g) => g.label)).toEqual(["Operación", "Negocio", "Cuenta", "Otras"]);
    expect(grupos[0].filas.map((f) => f.label)).toEqual(["Resumen", "Clientes"]);
    expect(grupos[1].filas.map((f) => f.label)).toEqual(["Agenda", "Agenda · Tipos de cita", "Cobranza · Clientes"]);
    expect(grupos[2].filas.map((f) => f.label)).toEqual(["Consumo y plan · Costos", "Configuración"]);
    expect(grupos[3].filas.map((f) => f.label)).toEqual(["Algo nuevo"]);
  });

  it("solo se guarda lo cambiado para la persona: lo demás vuelve a su rol", () => {
    const estado = {
      conversations: { access: "write", heredado: false },
      leads: { access: "read", heredado: true },
      plugins: { access: "", heredado: true },
    };
    expect(permisosAGuardar(estado, ["conversations", "leads", "plugins"])).toEqual({ conversations: "write" });
  });

  it("perfil de cobranza resumido para la fila (EQU-09)", () => {
    expect(resumenDePerfiles(cuenta({ pack_profiles: [PERFIL_GESTOR] }))).toBe("Gestor · 2 carteras");
    expect(resumenDePerfiles(cuenta({ pack_profiles: [{ ...PERFIL_GESTOR, resumen: { estatus: "suspendido", carteras: [] } }] }))).toBe(
      "Gestor · suspendido · sin carteras",
    );
    expect(resumenDePerfiles(cuenta({ pack_profiles: [{ ...PERFIL_GESTOR, resumen: null }] }))).toBe("Gestor");
    expect(resumenDePerfiles(cuenta({}))).toBeNull();
  });
});

describe("tabla de colaboradores", () => {
  afterEach(cleanup);

  it("para un dueño: rol y estado en palabras, la fila abre la ficha y sin acciones sobre otro dueño ni el master", () => {
    render(
      <FeedbackProviders>
        <TablaDeColaboradores filas={[YO, OTRO_DUENO, MASTER, OPERADOR]} secciones={["conversations"]} esMaster={false} />
      </FeedbackProviders>,
    );
    const tabla = screen.getByRole("table");
    expect(within(tabla).getByRole("link", { name: "Abrir la ficha de operador@test" }).getAttribute("href")).toBe(
      "/colaboradores?persona=op",
    );
    expect(within(tabla).getByRole("button", { name: "Más acciones de operador@test" })).toBeTruthy();
    expect(within(tabla).getByRole("button", { name: "Más acciones de duena@test" })).toBeTruthy();
    expect(within(tabla).queryByRole("button", { name: "Más acciones de socio@test" })).toBeNull();
    expect(within(tabla).queryByRole("button", { name: "Más acciones de master@test" })).toBeNull();
    // Sin interruptores ni íconos sueltos en la fila (EQU-04, EQU-08).
    expect(screen.queryByRole("switch")).toBeNull();
    expect(within(tabla).getAllByText("Activa").length).toBe(4);
    expect(within(tabla).getByText("Según su rol, con 2 cambios")).toBeTruthy();
    expect(within(tabla).getAllByText("Acceso total").length).toBe(3);
    // En el celular, una fila por persona con su rol y su estado (EQU-01).
    const lista = screen.getByRole("list", { name: "Personas del equipo" });
    expect(within(lista).getByText("Colaborador · Activa")).toBeTruthy();
  });

  it("para el master: conmutador «Todas las cuentas» que recarga la lista", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input).includes("?todos=1")) {
        return new Response(JSON.stringify([MASTER, OTRO_DUENO]), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <FeedbackProviders>
        <TablaDeColaboradores filas={[OTRO_DUENO]} secciones={["conversations"]} esMaster />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Todas las cuentas" }));
    await waitFor(() => expect(screen.getAllByText("master@test").length).toBeGreaterThan(0));
    vi.unstubAllGlobals();
  });

  it("la ficha agrupa los permisos, marca lo cambiado y guarda solo eso (EQU-05 a EQU-07)", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      void init;
      if (String(input).includes("/permissions")) {
        return new Response(
          JSON.stringify([
            { section: "conversations", access: "read", heredado: true },
            { section: "leads", access: "write", heredado: false },
          ]),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <FeedbackProviders>
        <TablaDeColaboradores
          filas={[OPERADOR]}
          secciones={["conversations", "leads"]}
          esMaster={false}
          abierta={{ id: "op", pestana: "permisos", contrasena: false }}
        />
      </FeedbackProviders>,
    );
    const ficha = await screen.findByRole("dialog", { name: "operador@test" });
    expect(within(ficha).getByRole("tab", { name: "Permisos", selected: true })).toBeTruthy();
    expect(await within(ficha).findByRole("heading", { name: "Operación" })).toBeTruthy();
    const conversaciones = within(ficha).getByRole("group", { name: "Acceso a Conversaciones" });
    expect(within(conversaciones).getByRole("button", { name: "Ver" }).getAttribute("aria-pressed")).toBe("true");
    expect(within(ficha).getAllByText(/Cambiado para esta persona/)).toHaveLength(1);
    expect((within(ficha).getByRole("button", { name: "Guardar permisos" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(within(conversaciones).getByRole("button", { name: "Editar" }));
    fireEvent.click(within(ficha).getByRole("button", { name: "Volver a lo de su rol en Clientes" }));
    expect(within(ficha).getByText("2 cambios sin guardar")).toBeTruthy();
    fireEvent.click(within(ficha).getByRole("button", { name: "Guardar permisos" }));

    await waitFor(() => {
      const guardado = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
      expect(guardado).toBeTruthy();
      const body = JSON.parse(String(guardado?.[1]?.body));
      expect(body.action).toBe("permissions");
      expect(body.permissions).toEqual({ conversations: "write" });
    });
    vi.unstubAllGlobals();
  });

  it("desde la ficha se desactiva el acceso, con confirmación", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <FeedbackProviders>
        <TablaDeColaboradores
          filas={[OPERADOR]}
          secciones={["conversations"]}
          esMaster={false}
          abierta={{ id: "op", pestana: "acceso", contrasena: false }}
        />
      </FeedbackProviders>,
    );
    const ficha = await screen.findByRole("dialog", { name: "operador@test" });
    fireEvent.click(within(ficha).getByRole("switch", { name: "Acceso de operador@test al panel" }));
    const confirmacion = await screen.findByRole("alertdialog");
    expect(within(confirmacion).getByText(/Deja de entrar al panel enseguida/)).toBeTruthy();
    fireEvent.click(within(confirmacion).getByRole("button", { name: "Desactivar el acceso" }));
    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
      expect(JSON.parse(String(post?.[1]?.body)).action).toBe("toggle");
    });
    vi.unstubAllGlobals();
  });

  it("restablecer la contraseña abre el campo en la ficha y la cambia", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      void input;
      void init;
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <FeedbackProviders>
        <TablaDeColaboradores
          filas={[OPERADOR]}
          secciones={["conversations"]}
          esMaster={false}
          abierta={{ id: "op", pestana: "acceso", contrasena: true }}
        />
      </FeedbackProviders>,
    );
    const ficha = await screen.findByRole("dialog", { name: "operador@test" });
    fireEvent.change(within(ficha).getByLabelText(/Nueva contraseña/), { target: { value: "clave-larga-1" } });
    fireEvent.click(within(ficha).getByRole("button", { name: "Cambiar la contraseña" }));
    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
      expect(JSON.parse(String(post?.[1]?.body))).toEqual({ action: "password", password: "clave-larga-1" });
    });
    vi.unstubAllGlobals();
  });

  it("un dueño no tiene pestaña de permisos: ya lo ve todo", async () => {
    render(
      <FeedbackProviders>
        <TablaDeColaboradores filas={[YO]} secciones={["conversations"]} esMaster={false} abierta={{ id: "yo", pestana: "permisos", contrasena: false }} />
      </FeedbackProviders>,
    );
    const ficha = await screen.findByRole("dialog", { name: "duena@test" });
    expect(within(ficha).queryByRole("tab")).toBeNull();
    expect(within(ficha).getByText("Ve y cambia todo el negocio.")).toBeTruthy();
    // Una misma no se desvincula ni se desactiva.
    expect(within(ficha).queryByRole("switch")).toBeNull();
    expect(within(ficha).queryByRole("button", { name: /Desvincular/ })).toBeNull();
  });
});

describe("perfil de pack en la fila (ADR-0176)", () => {
  afterEach(cleanup);

  it("traduce el perfil de gestor: estatus, carteras, permisos y edición conocida", () => {
    expect(perfilDePack(PERFIL_GESTOR)).toEqual({
      clave: "pack_cobranza:g-1",
      etiqueta: "Gestor",
      detalle: {
        estatus: "activo",
        carteras: [
          { id: "c1", nombre: "Ruta A" },
          { id: "c2", nombre: "Ruta B" },
        ],
        permisos: { activos: 3, total: 14 },
      },
      edicion: { kind: "cobranza_gestor_permisos", refId: "g-1" },
    });
  });

  it("sin detalle (recortado por permiso) queda solo la etiqueta y no se edita", () => {
    const p = perfilDePack({ ...PERFIL_GESTOR, resumen: null, edit: null });
    expect(p.detalle).toBeNull();
    expect(p.edicion).toBeNull();
    expect(p.etiqueta).toBe("Gestor");
  });

  it("un resumen con otra forma o un `kind` desconocido no rompe: solo lectura", () => {
    const p = perfilDePack({
      ...PERFIL_GESTOR,
      resumen: { carteras: "no-es-lista", permisos_activos: "x", otra_cosa: 1 },
      edit: { kind: "otro_pack_otro_kind", ref_id: "z" },
    });
    expect(p.detalle).toEqual({ estatus: null, carteras: [], permisos: null });
    expect(p.edicion).toBeNull();
  });

  it("la fila resume «Gestor · 2 carteras» y la ficha trae carteras, permisos de campo y asignar", async () => {
    const gestor = cuenta({ id: "g", email: "gestor@test", pack_profiles: [PERFIL_GESTOR] });
    render(
      <FeedbackProviders>
        <TablaDeColaboradores filas={[YO, gestor]} secciones={["conversations"]} esMaster={false} abierta={{ id: "g", pestana: "acceso", contrasena: false }} />
      </FeedbackProviders>,
    );
    expect(screen.getByText("Gestor · 2 carteras")).toBeTruthy();
    const ficha = await screen.findByRole("dialog", { name: "gestor@test" });
    expect(within(ficha).getByText(/Ruta A, Ruta B/)).toBeTruthy();
    expect(within(ficha).getByText(/3 de 14 permisos de campo/)).toBeTruthy();
    expect(within(ficha).getByRole("button", { name: "Permisos de campo de gestor@test" })).toBeTruthy();
    expect(within(ficha).getByRole("link", { name: "Asignar carteras" }).getAttribute("href")).toBe("/cobranza/gestores");
  });

  it("sin ningún perfil la columna no existe", () => {
    render(
      <FeedbackProviders>
        <TablaDeColaboradores filas={[YO, OPERADOR]} secciones={["conversations"]} esMaster={false} />
      </FeedbackProviders>,
    );
    expect(screen.queryByRole("columnheader", { name: /En Cobranza/ })).toBeNull();
  });

  it("con el detalle recortado se ve que es gestor pero sin carteras ni permisos", async () => {
    const gestor = cuenta({
      id: "g",
      email: "gestor@test",
      pack_profiles: [{ ...PERFIL_GESTOR, resumen: null, edit: null }],
    });
    render(
      <FeedbackProviders>
        <TablaDeColaboradores filas={[gestor]} secciones={[]} esMaster={false} abierta={{ id: "g", pestana: "acceso", contrasena: false }} />
      </FeedbackProviders>,
    );
    const ficha = await screen.findByRole("dialog", { name: "gestor@test" });
    expect(within(ficha).getByText("Gestor")).toBeTruthy();
    expect(within(ficha).queryByText(/permisos de campo/)).toBeNull();
    expect(within(ficha).queryByRole("link", { name: "Asignar carteras" })).toBeNull();
  });

  it("editar los permisos usa el PUT existente y refresca la lista", async () => {
    refresh.mockClear();
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      if (init?.method === "PUT") return new Response(JSON.stringify({ activos: [] }), { status: 200 });
      return new Response(JSON.stringify({ catalogo: ["ver_cartera"], activos: ["ver_cartera"] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const gestor = cuenta({ id: "g", email: "gestor@test", pack_profiles: [PERFIL_GESTOR] });
    render(
      <FeedbackProviders>
        <TablaDeColaboradores filas={[gestor]} secciones={[]} esMaster={false} abierta={{ id: "g", pestana: "acceso", contrasena: false }} />
      </FeedbackProviders>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Permisos de campo de gestor@test" }));
    fireEvent.click(await screen.findByRole("button", { name: "Guardar permisos" }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT");
    expect(String(put?.[0])).toBe("/api/pack/cobranza/collectors/g-1/permissions");
    vi.unstubAllGlobals();
  });
});

describe("invitar a alguien (EQU-11)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    resetToasts();
    refresh.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function fetchPorRuta(rutas: Record<string, unknown>) {
    fetchMock.mockImplementation(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      const metodo = init?.method ?? "GET";
      for (const [fragmento, respuesta] of Object.entries(rutas)) {
        if (url.includes(fragmento)) return new Response(JSON.stringify(respuesta), { status: 200 });
      }
      if (url.includes("/api/invitations") && metodo === "POST") {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url.includes("/api/collaborators") && metodo === "POST") {
        return new Response(JSON.stringify({ ok: true, resultado: "creado" }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
  }

  async function abrirDialogo(esMaster = false) {
    render(
      <FeedbackProviders>
        <NewCollaboratorDialog esMaster={esMaster} />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Invitar a alguien" }));
    return await screen.findByRole("dialog");
  }

  it("si el correo ya existe, ofrece invitar y envía la invitación sin contraseña", async () => {
    fetchPorRuta({ "/existe": { existe: true } });
    const dialogo = await abrirDialogo();
    fireEvent.change(within(dialogo).getByLabelText(/Correo/), { target: { value: "socia@x.test" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Continuar" }));

    expect(await within(dialogo).findByText(/Ya existe una cuenta/)).toBeTruthy();
    expect(within(dialogo).queryByLabelText(/Contraseña/)).toBeNull();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Enviar invitación" }));

    await waitFor(() => {
      const llamada = fetchMock.mock.calls.find(([url]) => String(url).includes("/api/invitations"));
      expect(llamada).toBeTruthy();
      const body = JSON.parse(String(llamada?.[1]?.body));
      expect(body.email).toBe("socia@x.test");
      expect(body.password).toBeUndefined();
    });
  });

  it("crea una cuenta nueva con nombre, usuario y teléfono", async () => {
    fetchPorRuta({ "/existe": { existe: false }, "/username-disponible": { disponible: true } });
    const dialogo = await abrirDialogo();
    fireEvent.change(within(dialogo).getByLabelText(/Correo/), { target: { value: "ana@x.test" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Continuar" }));

    fireEvent.change(await within(dialogo).findByLabelText(/Nombre completo/), { target: { value: "Ana Pérez" } });
    fireEvent.change(within(dialogo).getByLabelText(/^Usuario/), { target: { value: "ana.perez" } });
    expect(await within(dialogo).findByText("Disponible")).toBeTruthy();
    fireEvent.change(within(dialogo).getByLabelText(/Contraseña/), { target: { value: "clave-larga-1" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Crear la cuenta" }));

    await waitFor(() => {
      const llamada = fetchMock.mock.calls.find(
        ([url, init]) => String(url).includes("/api/collaborators") && init?.method === "POST",
      );
      expect(llamada).toBeTruthy();
      const body = JSON.parse(String(llamada?.[1]?.body));
      expect(body.email).toBe("ana@x.test");
      expect(body.nombre).toBe("Ana Pérez");
      expect(body.username).toBe("ana.perez");
      expect(body.password).toBe("clave-larga-1");
    });
  });

  it("rechaza un correo inválido con un error en español y no llama a la API", async () => {
    const dialogo = await abrirDialogo();
    fireEvent.change(within(dialogo).getByLabelText(/Correo/), { target: { value: "ana@" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Continuar" }));
    expect(await within(dialogo).findByText(/Escribe un correo válido/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("avisa cuando el usuario ya está en uso", async () => {
    fetchPorRuta({ "/existe": { existe: false }, "/username-disponible": { disponible: false } });
    const dialogo = await abrirDialogo();
    fireEvent.change(within(dialogo).getByLabelText(/Correo/), { target: { value: "ana@x.test" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Continuar" }));
    fireEvent.change(await within(dialogo).findByLabelText(/^Usuario/), { target: { value: "ana.perez" } });
    expect(await within(dialogo).findByText(/ya está en uso/)).toBeTruthy();
  });

  it("los roles dicen qué hará la persona y se cambia el correo con un enlace", async () => {
    fetchPorRuta({ "/existe": { existe: false } });
    render(
      <FeedbackProviders>
        <NewCollaboratorDialog packRoles={[{ value: "gestor", label: "Gestor de cobranza" }]} />
      </FeedbackProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Invitar a alguien" }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.change(within(dialogo).getByLabelText(/Correo/), { target: { value: "ana@x.test" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Continuar" }));
    expect(await within(dialogo).findByRole("radio", { name: /Ayudar en el panel/ })).toBeTruthy();
    expect(within(dialogo).getByRole("radio", { name: /Salir a cobrar.*app del celular/ })).toBeTruthy();
    expect(within(dialogo).queryByText(/Rol de habilidad/)).toBeNull();
    expect(within(dialogo).queryByRole("button", { name: "Volver" })).toBeNull();
    fireEvent.click(within(dialogo).getByRole("button", { name: "Cambiar el correo" }));
    expect(within(dialogo).getByRole("button", { name: "Continuar" })).toBeTruthy();
  });

  it("un dueño no ve el rol Master; el master sí", async () => {
    fetchPorRuta({ "/existe": { existe: false }, "/username-disponible": { disponible: true } });
    const dialogo = await abrirDialogo();
    fireEvent.change(within(dialogo).getByLabelText(/Correo/), { target: { value: "ana@x.test" } });
    fireEvent.click(within(dialogo).getByRole("button", { name: "Continuar" }));
    await within(dialogo).findByRole("radiogroup");
    expect(within(dialogo).queryByRole("radio", { name: /Master/ })).toBeNull();
    cleanup();

    fetchPorRuta({ "/existe": { existe: false }, "/username-disponible": { disponible: true } });
    const deMaster = await abrirDialogo(true);
    fireEvent.change(within(deMaster).getByLabelText(/Correo/), { target: { value: "ana@x.test" } });
    fireEvent.click(within(deMaster).getByRole("button", { name: "Continuar" }));
    await within(deMaster).findByRole("radiogroup");
    expect(within(deMaster).getByRole("radio", { name: /Master/ })).toBeTruthy();
  });
});
