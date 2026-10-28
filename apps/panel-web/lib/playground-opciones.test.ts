import { describe, expect, it } from "vitest";

import { avisoDeToque, esPayloadDeOpciones, leerInteractivo, mensajeDeErrorPlayground } from "@/lib/playground-opciones";

describe("esPayloadDeOpciones", () => {
  it("acepta opt:, optc: y optn: y rechaza todo lo demás", () => {
    expect(esPayloadDeOpciones("opt:abc.def")).toBe(true);
    expect(esPayloadDeOpciones("optc:abc.def")).toBe(true);
    expect(esPayloadDeOpciones("optn:abc.def")).toBe(true);
    for (const malo of ["", "opt:", "hola", "opt: espacio", "optx:abc", "OPT:abc", `opt:${"a".repeat(260)}`, null, 3, undefined]) {
      expect(esPayloadDeOpciones(malo)).toBe(false);
    }
  });
});

describe("leerInteractivo", () => {
  it("lee botones (≤3) con sus ids firmados", () => {
    const r = leerInteractivo({ type: "button", body: "¿Confirmas?", footer: "Gracias", buttons: [{ id: "opt:a", title: "Sí" }, { id: "opt:b", title: "No" }] });
    expect(r).toEqual({ tipo: "botones", cuerpo: "¿Confirmas?", pie: "Gracias", boton: null, opciones: [{ id: "opt:a", titulo: "Sí" }, { id: "opt:b", titulo: "No" }] });
  });

  it("lee una lista (4–10) con el texto de su botón", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ id: `opt:${i}`, title: `Opción ${i}` }));
    const r = leerInteractivo({ type: "list", body: "Elige", button: "Ver opciones", rows });
    expect(r?.tipo).toBe("lista");
    expect(r?.boton).toBe("Ver opciones");
    expect(r?.opciones).toHaveLength(5);
    expect(r?.pie).toBeNull();
  });

  it("un mensaje sin interactivo o con opciones mal formadas se pinta como texto", () => {
    expect(leerInteractivo(null)).toBeNull();
    expect(leerInteractivo(undefined)).toBeNull();
    expect(leerInteractivo({ type: "button", body: "x", buttons: [] })).toBeNull();
    expect(leerInteractivo({ type: "button", body: "x", buttons: [{ id: 1, title: "a" }, { title: "b" }, "c"] })).toBeNull();
    expect(leerInteractivo({ type: "list", body: "x", buttons: [{ id: "opt:a", title: "a" }] })).toBeNull();
  });
});

describe("avisoDeToque", () => {
  it("no avisa cuando salió bien y el resultado ya se ve en el chat", () => {
    expect(avisoDeToque("ok", 1)).toBeNull();
    expect(avisoDeToque("confirm_requested", 1)).toBeNull();
  });

  it("nunca deja un toque en silencio: un ok sin mensajes y cada outcome descartado se explican", () => {
    expect(avisoDeToque("ok", 0)?.texto).toMatch(/se ejecutó/);
    for (const o of ["bad_signature", "unknown_send", "foreign_conversation"]) {
      expect(avisoDeToque(o, 0)).toMatchObject({ tono: "warning", texto: expect.stringMatching(/descartó/) });
    }
    expect(avisoDeToque("tool_error", 1)?.tono).toBe("danger");
    expect(avisoDeToque("denied", 0)?.texto).toMatch(/permiso/);
    expect(avisoDeToque("duplicate", 0)?.texto).toMatch(/ya se usó/);
    expect(avisoDeToque("expired", 0)?.texto).toMatch(/venció/);
    expect(avisoDeToque("algo_nuevo_del_backend", 0)?.tono).toBe("danger");
  });
});

describe("mensajeDeErrorPlayground", () => {
  const e = (status: number, code: string | undefined, mensaje = "Mensaje de la API.") => ({ status, code, mensaje });

  it("explica la bandera apagada y a quién pedirla", () => {
    const m = mensajeDeErrorPlayground(e(404, "opciones_directas_no_habilitadas"));
    expect(m).toMatch(/no están activadas/);
    expect(m).toMatch(/master/);
  });

  it("traduce los permisos, la sesión y los códigos del envío", () => {
    expect(mensajeDeErrorPlayground(e(403, "forbidden"))).toMatch(/propietario o un master/);
    expect(mensajeDeErrorPlayground(e(401, undefined))).toMatch(/sesión/);
    expect(mensajeDeErrorPlayground(e(409, "no_publicada"))).toMatch(/Publica/);
    expect(mensajeDeErrorPlayground(e(409, "pausada"))).toMatch(/pausa/);
    expect(mensajeDeErrorPlayground(e(422, "contexto_incompleto"))).toMatch(/Faltan datos/);
    expect(mensajeDeErrorPlayground(e(422, "payload_invalido"))).toMatch(/no es de una plantilla/);
    expect(mensajeDeErrorPlayground(e(404, "not_found"))).toMatch(/ya no existe/);
  });

  it("un 5xx o sin red es genérico; otro código deja el mensaje de la API", () => {
    expect(mensajeDeErrorPlayground(e(502, undefined))).toMatch(/Inténtalo de nuevo/);
    expect(mensajeDeErrorPlayground(e(0, undefined))).toMatch(/Inténtalo de nuevo/);
    expect(mensajeDeErrorPlayground(e(400, "otro", "Dato inválido."))).toBe("Dato inválido.");
  });
});
