import { describe, expect, it } from "vitest";

import {
  columnasDeSoloLectura,
  consultaClientes,
  datosDelPerfil,
  datosFueraDelPerfil,
  enlaceTelefono,
  enlaceWhatsApp,
  etiquetaClasificacion,
  etiquetaDeDato,
  etiquetaTipoDocumento,
  filtrosCon,
  filtrosDePacks,
  mismoTelefono,
  normalizarClave,
  ordenValido,
  origenDelDato,
  pestanasDeFaceta,
  puedeEnviarPlantilla,
  segmentoDelFiltro,
  telefonoVisible,
  textoDeActividad,
  textoDeDato,
  ubicacionVisible,
  valorDeFiltro,
} from "./clientes";

describe("consultaClientes", () => {
  it("arma la query de la API sin vacíos", () => {
    const qs = consultaClientes({
      q: "  ana ",
      channel: "whatsapp",
      connection_id: "c1",
      filtro: ["clasificacion:fiel", "", "estado_lead:"],
      page: "2",
      cliente: "x",
    });
    expect(qs.toString()).toBe("q=ana&channel=whatsapp&connection_id=c1&filtro=clasificacion%3Afiel&page=2");
  });

  it("el CSV no lleva página", () => {
    expect(consultaClientes({ page: "3", filtro: "clasificacion:nuevo" }, { conPagina: false }).toString()).toBe(
      "filtro=clasificacion%3Anuevo",
    );
  });
});

describe("filtros de packs", () => {
  it("acepta uno o varios y lee el valor por clave", () => {
    expect(filtrosDePacks("clasificacion:fiel")).toEqual(["clasificacion:fiel"]);
    expect(filtrosDePacks(undefined)).toEqual([]);
    expect(valorDeFiltro(["clasificacion:fiel", "estado_lead:nuevo"], "estado_lead")).toBe("nuevo");
    expect(valorDeFiltro("clasificacion:fiel", "estado_lead")).toBe("");
  });
});

describe("ficha", () => {
  it("etiquetas y valores legibles", () => {
    expect(etiquetaDeDato("direccion")).toBe("Dirección");
    expect(etiquetaDeDato("direccion_entrega")).toBe("Direccion entrega");
    expect(origenDelDato("human")).toBe("Persona");
    expect(origenDelDato("tool")).toBe("Asistente");
    expect(textoDeDato(true)).toBe("Sí");
    expect(textoDeDato(null)).toBe("—");
  });

  it("normaliza la clave de un dato nuevo", () => {
    expect(normalizarClave("  Dirección de Entrega ")).toBe("direccion_de_entrega");
    expect(normalizarClave("¿?")).toBe("");
  });

  it("no repite el teléfono del canal ni el nombre en lo que sabemos", () => {
    const d = (key: string, value: unknown, namespace = "perfil") => ({ namespace, key, value });
    const datos = [d("name", "Ana"), d("phone", "+57 300 111 2233"), d("email", "a@x.co"), d("x", 1, "pack")];
    expect(datosDelPerfil({ telefono: "573001112233", datos }).map((x) => x.key)).toEqual(["email"]);
    expect(datosDelPerfil({ telefono: "573009999999", datos }).map((x) => x.key)).toEqual(["phone", "email"]);
    expect(datosDelPerfil({ telefono: null, datos }).map((x) => x.key)).toEqual(["phone", "email"]);
    // Con o sin indicativo es el mismo número.
    expect(datosDelPerfil({ telefono: "+573001112233", datos: [d("phone", "300 111 2233")] })).toEqual([]);
    expect(mismoTelefono("123", "123")).toBe(false);
  });

  it("las columnas editables no se repiten como solo lectura", () => {
    const cols = [{ key: "clasificacion" }, { key: "estado_lead" }, { key: "interes" }];
    expect(columnasDeSoloLectura(cols, [{ key: "estado_lead" }, { key: "interes" }])).toEqual([{ key: "clasificacion" }]);
    expect(columnasDeSoloLectura(cols, undefined)).toHaveLength(3);
  });
});

describe("línea de tiempo", () => {
  it("enlaza cada tipo de evento a su sección", async () => {
    const { enlaceDeEvento } = await import("./clientes");
    expect(enlaceDeEvento("conversation", "c 1")).toBe("/conversaciones?c=c%201");
    expect(enlaceDeEvento("order", "o1")).toBe("/comercio/pedidos");
    expect(enlaceDeEvento("appointment", "a1")).toBe("/calendario");
    expect(enlaceDeEvento("otro", "x")).toBeNull();
    expect(enlaceDeEvento(null, "x")).toBeNull();
  });
});

describe("segmentoDelFiltro", () => {
  const filtros = [
    { key: "clasificacion", options: [{ value: "frecuente", label: "Frecuente" }, { value: "nuevo", label: "Nuevo" }] },
    { key: "estado_lead", options: [{ value: "nuevo", label: "Nuevo" }] },
  ];

  it("toma la clasificación del filtro con su etiqueta", () => {
    expect(segmentoDelFiltro(["estado_lead:nuevo", "clasificacion:frecuente"], filtros)).toEqual({
      value: "frecuente",
      label: "Frecuente",
    });
  });

  it("el estado del lead no cuenta como segmento aunque se llame igual", () => {
    expect(segmentoDelFiltro("estado_lead:nuevo", filtros)).toBeNull();
  });

  it("sin el filtro de clasificación (pack apagado) o con un valor desconocido no hay segmento", () => {
    expect(segmentoDelFiltro("clasificacion:frecuente", [])).toBeNull();
    expect(segmentoDelFiltro("clasificacion:otro", filtros)).toBeNull();
    expect(segmentoDelFiltro(undefined, filtros)).toBeNull();
  });
});

describe("perfil base (tanda 1A)", () => {
  it("muestra el teléfono con indicativo y la ubicación corta", () => {
    expect(telefonoVisible({ phone_indicativo: "+57", phone_local: "3001234567" })).toBe("+57 3001234567");
    expect(telefonoVisible({ phone_e164: "+573001234567" })).toBe("+573001234567");
    expect(telefonoVisible({})).toBe("—");
    expect(ubicacionVisible({ municipio: "Cali", departamento: "Valle" })).toBe("Cali, Valle");
    expect(ubicacionVisible({ address: "Calle 1" })).toBe("Calle 1");
    expect(ubicacionVisible({})).toBe("—");
  });

  it("traduce clasificación y tipo de documento", () => {
    expect(etiquetaClasificacion("vip")).toBe("VIP");
    expect(etiquetaClasificacion(null)).toBe("Sin clasificar");
    expect(etiquetaClasificacion("otro", "Etiqueta API")).toBe("Etiqueta API");
    expect(etiquetaTipoDocumento("cc")).toBe("Cédula de ciudadanía");
    expect(etiquetaTipoDocumento(null)).toBe("—");
  });

  it("no repite en otros datos lo que ya muestra el perfil", () => {
    const datos = [
      { namespace: "perfil", key: "full_name", value: "Ana" },
      { namespace: "perfil", key: "email", value: "a@x.co" },
      { namespace: "perfil", key: "preferencia", value: "WhatsApp" },
      { namespace: "ventas", key: "interes", value: "plan" },
    ];
    expect(datosFueraDelPerfil(datos).map((d) => `${d.namespace}:${d.key}`)).toEqual([
      "perfil:preferencia",
      "ventas:interes",
    ]);
  });
});

describe("enlaces de contacto (HU-CRM-17)", () => {
  it("arma tel: y wa.me solo con dígitos, con el indicativo del perfil", () => {
    const perfil = { phone_e164: "+57 300 000-0000" };
    expect(enlaceTelefono(perfil)).toBe("tel:+573000000000");
    expect(enlaceWhatsApp(perfil)).toBe("https://wa.me/573000000000");
  });

  it("usa indicativo y número local cuando no hay e164", () => {
    expect(enlaceWhatsApp({ phone_indicativo: "+57", phone_local: "3001112233" })).toBe("https://wa.me/573001112233");
  });

  it("sin teléfono usable devuelve null para ocultar la acción", () => {
    expect(enlaceTelefono({})).toBeNull();
    expect(enlaceWhatsApp({ phone: "—" })).toBeNull();
    expect(enlaceWhatsApp({ phone: "123" })).toBeNull();
  });
});

describe("orden de la lista", () => {
  it("acepta solo los valores que conoce la API", () => {
    expect(ordenValido("actividad")).toBe("actividad");
    expect(ordenValido("nombre_desc")).toBe("nombre_desc");
    expect(ordenValido("por-el-color")).toBeNull();
    expect(ordenValido(undefined)).toBeNull();
  });
});

describe("textoDeActividad", () => {
  const ahora = new Date("2026-10-29T12:00:00Z");
  const hace = (min: number) => new Date(ahora.getTime() - min * 60_000).toISOString();

  it("escribe el tiempo transcurrido en español", () => {
    expect(textoDeActividad(hace(0), ahora)).toBe("Ahora");
    expect(textoDeActividad(hace(3), ahora)).toBe("Hace 3 min");
    expect(textoDeActividad(hace(125), ahora)).toBe("Hace 2 h");
    expect(textoDeActividad(hace(24 * 60 + 5), ahora)).toBe("Ayer");
    expect(textoDeActividad(hace(5 * 24 * 60), ahora)).toBe("Hace 5 días");
  });

  it("pasado un mes da la fecha y sin mensajes lo dice", () => {
    expect(textoDeActividad(hace(60 * 24 * 60), ahora)).toMatch(/2026/);
    expect(textoDeActividad(null, ahora)).toBe("Sin mensajes");
    expect(textoDeActividad(undefined, ahora)).toBe("Sin mensajes");
  });

  it("una hora futura (reloj desfasado) no da tiempos negativos", () => {
    expect(textoDeActividad(hace(-10), ahora)).toBe("Ahora");
  });
});

describe("pestanasDeFaceta", () => {
  const filtro = { options: [{ value: "nuevo", label: "Nuevo" }, { value: "perdido", label: "Perdido" }] };

  it("pone «Todas» primero y una pestaña por opción con su contador (cero si falta)", () => {
    const { pestanas, sinValor } = pestanasDeFaceta(filtro, { counts: { nuevo: 4 }, sin_valor: 2, total: 6 });
    expect(pestanas).toEqual([
      { value: "", label: "Todas", count: 6 },
      { value: "nuevo", label: "Nuevo", count: 4 },
      { value: "perdido", label: "Perdido", count: 0 },
    ]);
    expect(sinValor).toBe(2);
  });
});

describe("filtrosCon", () => {
  it("cambia solo la clave pedida y conserva las demás", () => {
    expect(filtrosCon(["estado_lead:nuevo", "clasificacion:fiel"], "estado_lead", "perdido")).toEqual([
      "clasificacion:fiel",
      "estado_lead:perdido",
    ]);
  });

  it("un valor vacío quita la clave", () => {
    expect(filtrosCon("estado_lead:nuevo", "estado_lead", "")).toEqual([]);
    expect(filtrosCon(undefined, "estado_lead", "")).toEqual([]);
  });
});

describe("puedeEnviarPlantilla", () => {
  it("propietario del negocio, plataforma y tester sí; el resto no", () => {
    expect(puedeEnviarPlantilla({ role: "user", tenant: { role: "owner" } })).toBe(true);
    expect(puedeEnviarPlantilla({ role: "master" })).toBe(true);
    expect(puedeEnviarPlantilla({ role: "tester" })).toBe(true);
    expect(puedeEnviarPlantilla({ role: "user", tenant: { role: "colaborador" } })).toBe(false);
    expect(puedeEnviarPlantilla(null)).toBe(false);
  });
});

it("la clasificación nuevo se muestra como Nuevo", () => {
  expect(etiquetaClasificacion("nuevo")).toBe("Nuevo");
});
