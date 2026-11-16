import { describe, expect, it } from "vitest";

import {
  accionesDePlantilla,
  avisoDesconectado,
  cuerpoDePlantilla,
  erroresDePlantilla,
  estadoPlantillaTwilio,
  errorDeJoinCode,
  erroresDeCredenciales,
  esSandbox,
  estadoTwilio,
  etiquetaDeSender,
  mensajeDeUnion,
  mensajeErrorTwilio,
  motivoDeSender,
  numeroLegible,
  puedeEscribirTwilio,
  rutaTwilioDeBackend,
  totalDeMoneda,
  variablesDeCuerpo,
  webhookPrevio,
} from "@/lib/conexion-twilio";

const ID = "3f1c2a7e-5b8d-4c1e-9a2b-0d4e6f8a1b2c";
const SID = `AC${"a".repeat(32)}`;

describe("WhatsApp vía Twilio: permisos y credenciales", () => {
  it("escriben el propietario o el master, y solo con Conexiones en escritura (como require_owner_or_master)", () => {
    expect(puedeEscribirTwilio({ role: "master", tenant: null, permissions: { connections: "write" } } as never)).toBe(true);
    expect(puedeEscribirTwilio({ role: "admin", tenant: { role: "owner" }, permissions: { connections: "write" } } as never)).toBe(true);
    expect(puedeEscribirTwilio({ role: "admin", tenant: { role: "manager" }, permissions: { connections: "write" } } as never)).toBe(false);
    expect(puedeEscribirTwilio({ role: "admin", tenant: { role: "owner" }, permissions: { connections: "read" } } as never)).toBe(false);
  });

  it("el Account SID empieza por AC y tiene 34 caracteres; el token no puede ir vacío", () => {
    expect(erroresDeCredenciales(SID, "tok")).toEqual({});
    expect(erroresDeCredenciales(`  ${SID} `, "tok")).toEqual({});
    expect(erroresDeCredenciales("", "")).toEqual({
      account_sid: expect.stringContaining("Pega"),
      auth_token: expect.stringContaining("Auth Token"),
    });
    expect(erroresDeCredenciales(`XE${"a".repeat(32)}`, "tok").account_sid).toContain("AC");
    expect(erroresDeCredenciales("AC123", "tok").account_sid).toContain("34");
  });

  it("los códigos estables de la API tienen su mensaje; uno desconocido usa el texto de la API", () => {
    expect(mensajeErrorTwilio("twilio_credentials_invalid", "x")).toContain("Auth Token");
    expect(mensajeErrorTwilio("fuera_de_ventana", "x")).toContain("24 h");
    expect(mensajeErrorTwilio("daily_limit", "x")).toContain("10");
    expect(mensajeErrorTwilio("otro", "texto de la API")).toBe("texto de la API");
    expect(mensajeErrorTwilio(undefined, "texto")).toBe("texto");
  });
});

describe("WhatsApp vía Twilio: alta guiada", () => {
  it("cada número dice por qué no se puede elegir", () => {
    expect(motivoDeSender({ motivo: "no_online", status: "OFFLINE" })).toContain("OFFLINE");
    expect(motivoDeSender({ motivo: "ya_conectado_aqui", status: "ONLINE" })).toContain("este negocio");
    expect(motivoDeSender({ motivo: "", status: "ONLINE" })).toBe("");
    expect(etiquetaDeSender({ e164: "+573005550101", display_name: "Ventas" })).toBe("+573005550101 · Ventas");
    expect(etiquetaDeSender({ e164: "+573005550101", display_name: " " })).toBe("+573005550101");
  });

  it("la dirección previa sale de details.previous_webhook (objeto por campo o texto)", () => {
    expect(webhookPrevio({ previous_webhook: { callback_url: "https://otro.example/wa" } })).toBe("https://otro.example/wa");
    expect(webhookPrevio({ previous_webhook: "https://otro.example/wa" })).toBe("https://otro.example/wa");
    expect(webhookPrevio({ previous_webhook: {} })).toBeNull();
    expect(webhookPrevio(undefined)).toBeNull();
  });
});

describe("WhatsApp vía Twilio: ficha", () => {
  it("estado en palabras con su tono", () => {
    expect(estadoTwilio("connected")).toMatchObject({ label: "Funciona", tono: "success" });
    expect(estadoTwilio("degraded")).toMatchObject({ label: "Con avisos", tono: "warning" });
    expect(estadoTwilio("revoked")).toMatchObject({ label: "No funciona", tono: "danger" });
    expect(estadoTwilio("error").tono).toBe("danger");
    expect(estadoTwilio("pending").tono).toBe("info");
    expect(estadoTwilio("raro")).toMatchObject({ label: "raro", tono: "neutral" });
  });

  it("el costo se muestra en positivo (Twilio informa el débito en negativo) y en su moneda", () => {
    expect(totalDeMoneda({ moneda: "USD", total: "-0.0500" })).toBe(totalDeMoneda({ moneda: "USD", total: "0.05" }));
    expect(totalDeMoneda({ moneda: "USD", total: "-0.0500" })).toContain("0,05");
    expect(totalDeMoneda({ moneda: "", total: "1" })).toContain("1");
    expect(totalDeMoneda({ moneda: "USD", total: "nada" })).toBe("nada USD");
  });
});

describe("WhatsApp vía Twilio: rutas del BFF (lista cerrada)", () => {
  it("alta y descubrimiento", () => {
    expect(rutaTwilioDeBackend("POST", [])).toBe("/admin/connections/twilio");
    expect(rutaTwilioDeBackend("POST", ["discover"])).toBe("/admin/connections/twilio/discover");
    expect(rutaTwilioDeBackend("GET", [])).toBeNull();
    expect(rutaTwilioDeBackend("GET", ["discover"])).toBeNull();
  });

  it("acciones de una conexión, solo con id UUID", () => {
    expect(rutaTwilioDeBackend("GET", [ID])).toBe(`/admin/connections/twilio/${ID}`);
    for (const accion of ["refresh", "webhooks", "test-message", "disconnect"]) {
      expect(rutaTwilioDeBackend("POST", [ID, accion])).toBe(`/admin/connections/twilio/${ID}/${accion}`);
    }
    expect(rutaTwilioDeBackend("PUT", [ID, "credentials"])).toBe(`/admin/connections/twilio/${ID}/credentials`);
    expect(rutaTwilioDeBackend("POST", ["no-es-uuid", "refresh"])).toBeNull();
    expect(rutaTwilioDeBackend("GET", [ID, "disconnect"])).toBeNull();
    expect(rutaTwilioDeBackend("PUT", [ID, "disconnect"])).toBeNull();
    expect(rutaTwilioDeBackend("POST", ["no-es-uuid", "disconnect"])).toBeNull();
    expect(rutaTwilioDeBackend("GET", [ID, "credentials"])).toBeNull();
    expect(rutaTwilioDeBackend("POST", [ID, "refresh", "x"])).toBeNull();
  });

  it("costos con los días acotados a 1–90", () => {
    expect(rutaTwilioDeBackend("GET", [ID, "costs"])).toBe(`/admin/connections/twilio/${ID}/costs?dias=30`);
    expect(rutaTwilioDeBackend("GET", [ID, "costs"], "7")).toBe(`/admin/connections/twilio/${ID}/costs?dias=7`);
    expect(rutaTwilioDeBackend("GET", [ID, "costs"], "500")).toBe(`/admin/connections/twilio/${ID}/costs?dias=90`);
    expect(rutaTwilioDeBackend("GET", [ID, "costs"], "abc")).toBe(`/admin/connections/twilio/${ID}/costs?dias=30`);
  });
});

describe("WhatsApp vía Twilio: desconectar", () => {
  it("el aviso dice qué pasó con los webhooks", () => {
    expect(avisoDesconectado(true, true)).toContain("volvieron");
    expect(avisoDesconectado(false, true)).toContain("otra dirección");
    expect(avisoDesconectado(false, false)).toContain("quedaron como estaban");
  });

  it("los errores de la desconexión salen en palabras", () => {
    expect(mensajeErrorTwilio("webhooks_no_restaurados", "x")).toContain("no se desconectó nada");
    expect(mensajeErrorTwilio("password_incorrect", "x")).toBe("La contraseña no es correcta.");
    expect(mensajeErrorTwilio("password_required", "x")).toContain("contraseña");
  });
});

describe("WhatsApp vía Twilio: Sandbox (HU-CONN-20)", () => {
  it("el BFF reenvía capabilities, el alta del sandbox y el PATCH del código, y nada más", () => {
    expect(rutaTwilioDeBackend("GET", ["capabilities"])).toBe("/admin/connections/twilio/capabilities");
    expect(rutaTwilioDeBackend("POST", ["sandbox"])).toBe("/admin/connections/twilio/sandbox");
    expect(rutaTwilioDeBackend("PATCH", [ID, "sandbox"])).toBe(`/admin/connections/twilio/${ID}/sandbox`);
    expect(rutaTwilioDeBackend("POST", ["capabilities"])).toBeNull();
    expect(rutaTwilioDeBackend("GET", ["sandbox"])).toBeNull();
    expect(rutaTwilioDeBackend("PATCH", ["no-es-uuid", "sandbox"])).toBeNull();
    expect(rutaTwilioDeBackend("PATCH", [ID, "credentials"])).toBeNull();
    expect(rutaTwilioDeBackend("PATCH", [])).toBeNull();
  });

  it("un sandbox pendiente pide pegar las direcciones; uno conectado se ve como cualquiera", () => {
    expect(estadoTwilio("pending", "sandbox").label).toBe("Falta un paso");
    expect(estadoTwilio("pending", "sandbox").detalle).toContain("consola de Twilio");
    expect(estadoTwilio("pending", "sender").label).toBe("Sin terminar");
    expect(estadoTwilio("connected", "sandbox").label).toBe("Funciona");
    expect(esSandbox({ modo: "sandbox" })).toBe(true);
    expect(esSandbox({ modo: "sender" })).toBe(false);
  });

  it("el código de unión es opcional y con el formato de Twilio", () => {
    expect(errorDeJoinCode("")).toBeUndefined();
    expect(errorDeJoinCode("cloud-forgotten")).toBeUndefined();
    expect(errorDeJoinCode("Cloud-Forgotten")).toBeUndefined();
    expect(errorDeJoinCode("join cloud")).toBeDefined();
    expect(errorDeJoinCode("-x")).toBeDefined();
    expect(errorDeJoinCode("a".repeat(65))).toBeDefined();
  });

  it("muestra el mensaje para unirse y el número legible", () => {
    expect(mensajeDeUnion("cloud-forgotten")).toBe("join cloud-forgotten");
    expect(mensajeDeUnion(null)).toBe("join <tu código>");
    expect(numeroLegible("+14155238886")).toBe("+1 415 523 8886");
    expect(numeroLegible("+573001234567")).toBe("+573001234567");
  });

  it("al desconectar un sandbox recuerda borrar las direcciones de la consola", () => {
    expect(avisoDesconectado(false, true, true)).toContain("Sandbox settings");
    expect(avisoDesconectado(true, true)).toContain("volvieron");
  });

  it("traduce los errores propios del sandbox", () => {
    expect(mensajeErrorTwilio("join_code_invalido", "x")).toContain("join");
    expect(mensajeErrorTwilio("no_aplica_sandbox", "x")).toContain("preaprobadas");
    // El 422 de participante sin unir trae el código exacto en el texto de la API: se muestra tal cual.
    expect(mensajeErrorTwilio("participante_no_unido", "Envía «join abc»")).toBe("Envía «join abc»");
  });
});

describe("WhatsApp vía Twilio: plantillas (HU-CONN-14)", () => {
  const TID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
  const BASE = `/admin/connections/twilio/${ID}/templates`;
  const valida = { nombre: "recordatorio_cita", idioma: "es", categoria: "UTILITY", cuerpo: "Hola {{1}}, tu cita es el {{2}}.", ejemplos: { "1": "Ana", "2": "lunes" } };

  it("rutas del BFF: listar, crear, sincronizar, enviar, refrescar y borrar; nada más", () => {
    expect(rutaTwilioDeBackend("GET", [ID, "templates"])).toBe(BASE);
    expect(rutaTwilioDeBackend("POST", [ID, "templates"])).toBe(BASE);
    expect(rutaTwilioDeBackend("POST", [ID, "templates", "sync"])).toBe(`${BASE}/sync`);
    expect(rutaTwilioDeBackend("POST", [ID, "templates", TID, "submit"])).toBe(`${BASE}/${TID}/submit`);
    expect(rutaTwilioDeBackend("POST", [ID, "templates", TID, "refresh"])).toBe(`${BASE}/${TID}/refresh`);
    expect(rutaTwilioDeBackend("DELETE", [ID, "templates", TID])).toBe(`${BASE}/${TID}`);

    expect(rutaTwilioDeBackend("DELETE", [ID, "templates"])).toBeNull();
    expect(rutaTwilioDeBackend("GET", [ID, "templates", "sync"])).toBeNull();
    expect(rutaTwilioDeBackend("DELETE", [ID, "templates", "sync"])).toBeNull();
    expect(rutaTwilioDeBackend("DELETE", [ID, "templates", "no-es-uuid"])).toBeNull();
    expect(rutaTwilioDeBackend("GET", [ID, "templates", TID])).toBeNull();
    expect(rutaTwilioDeBackend("POST", [ID, "templates", TID, "otra"])).toBeNull();
    expect(rutaTwilioDeBackend("GET", [ID, "templates", TID, "submit"])).toBeNull();
    expect(rutaTwilioDeBackend("POST", [ID, "templates", "no-es-uuid", "submit"])).toBeNull();
    expect(rutaTwilioDeBackend("POST", [ID, "templates", TID, "submit", "x"])).toBeNull();
    expect(rutaTwilioDeBackend("GET", ["no-es-uuid", "templates"])).toBeNull();
    // Borrar fuera de las plantillas no existe en la lista cerrada.
    expect(rutaTwilioDeBackend("DELETE", [ID])).toBeNull();
  });

  it("las variables se leen como el backend (con espacios dentro de las llaves, sin repetir)", () => {
    expect(variablesDeCuerpo("Hola {{1}} y {{ 2 }}, otra vez {{1}}")).toEqual([1, 2]);
    expect(variablesDeCuerpo("Sin variables")).toEqual([]);
    expect(variablesDeCuerpo("{{3}} {{1}}")).toEqual([1, 3]);
  });

  it("una plantilla válida no tiene errores", () => {
    expect(erroresDePlantilla(valida)).toEqual({});
    expect(erroresDePlantilla({ ...valida, cuerpo: "Sin variables", ejemplos: {} })).toEqual({});
    expect(erroresDePlantilla({ ...valida, idioma: "es_CO" })).toEqual({});
  });

  it("nombre, idioma, categoría y mensaje siguen las reglas de WhatsApp", () => {
    expect(erroresDePlantilla({ ...valida, nombre: "Recordatorio Cita" }).nombre).toContain("minúsculas");
    expect(erroresDePlantilla({ ...valida, nombre: "a".repeat(65) }).nombre).toBeDefined();
    expect(erroresDePlantilla({ ...valida, idioma: "español" }).idioma).toBeDefined();
    expect(erroresDePlantilla({ ...valida, idioma: "es_co" }).idioma).toBeDefined();
    expect(erroresDePlantilla({ ...valida, categoria: "OTRA" }).categoria).toBeDefined();
    expect(erroresDePlantilla({ ...valida, cuerpo: "   ", ejemplos: {} }).cuerpo).toContain("Escribe");
    expect(erroresDePlantilla({ ...valida, cuerpo: "x".repeat(1025), ejemplos: {} }).cuerpo).toContain("1024");
  });

  it("las variables van de {{1}} en adelante sin saltos", () => {
    const e = erroresDePlantilla({ ...valida, cuerpo: "Hola {{1}}, {{3}}", ejemplos: { "1": "Ana", "3": "x" } });
    expect(e.cuerpo).toContain("sin saltos");
    expect(e.cuerpo).toContain("{{3}}");
    expect(erroresDePlantilla({ ...valida, cuerpo: "Hola {{2}}", ejemplos: { "2": "Ana" } }).cuerpo).toContain("sin saltos");
  });

  it("cada variable trae su ejemplo, corto, y no sobran ejemplos", () => {
    expect(erroresDePlantilla({ ...valida, ejemplos: { "1": "Ana" } }).ejemplos).toContain("{{2}}");
    expect(erroresDePlantilla({ ...valida, ejemplos: { "1": "Ana", "2": "  " } }).ejemplos).toContain("{{2}}");
    expect(erroresDePlantilla({ ...valida, ejemplos: { "1": "Ana", "2": "x".repeat(257) } }).ejemplos).toContain("256");
    expect(erroresDePlantilla({ ...valida, ejemplos: { "1": "Ana", "2": "lunes", "3": "x" } }).ejemplos).toContain("ya no usa");
  });

  it("el cuerpo del POST lleva solo los ejemplos de las variables del texto, sin espacios", () => {
    expect(
      cuerpoDePlantilla({ ...valida, nombre: " recordatorio_cita ", ejemplos: { "1": " Ana ", "2": "lunes", "3": "viejo" } }),
    ).toEqual({ ...valida, ejemplos: { "1": "Ana", "2": "lunes" } });
  });

  it("el estado de la aprobación sale en palabras y con tono", () => {
    expect(estadoPlantillaTwilio("approved")).toEqual({ label: "Aprobada", tono: "success" });
    expect(estadoPlantillaTwilio("rejected").tono).toBe("danger");
    expect(estadoPlantillaTwilio("pending").label).toBe("En revisión");
    expect(estadoPlantillaTwilio("unsubmitted").label).toBe("Sin enviar");
    expect(estadoPlantillaTwilio("nuevo")).toEqual({ label: "nuevo", tono: "neutral" });
  });

  it("acciones: enviar solo sin enviar y creada en Twilio; en el Sandbox no se envía ni se borra", () => {
    const creada = { estado: "unsubmitted", content_sid: `HX${"a".repeat(32)}` };
    expect(accionesDePlantilla(creada, false)).toEqual({ enviar: true, refrescar: true, borrar: true });
    expect(accionesDePlantilla({ ...creada, estado: "pending" }, false)).toEqual({ enviar: false, refrescar: true, borrar: true });
    expect(accionesDePlantilla({ estado: "creating", content_sid: null }, false)).toEqual({ enviar: false, refrescar: false, borrar: true });
    expect(accionesDePlantilla({ ...creada, estado: "approved" }, true)).toEqual({ enviar: false, refrescar: true, borrar: false });
    expect(accionesDePlantilla(creada, true).enviar).toBe(false);
  });

  it("los errores de las plantillas salen en palabras", () => {
    expect(mensajeErrorTwilio("nombre_en_uso", "x")).toContain("otro nombre");
    expect(mensajeErrorTwilio("sync_rate_limited", "x")).toContain("minuto");
    expect(mensajeErrorTwilio("plantilla_sin_crear", "x")).toContain("todavía no existe");
  });
});
