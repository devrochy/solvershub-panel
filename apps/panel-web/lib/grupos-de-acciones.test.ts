import { describe, expect, it } from "vitest";

import { ACCIONES_CONOCIDAS, GRUPOS_DE_ACCIONES, agruparAcciones, grupoDeAccion, nombreDeAccion } from "@/lib/grupos-de-acciones";

// Acciones de agent-core en develop (packages/pack-*/pack_*/skills.py y las del core) al 2026-11-12.
const DEL_BACKEND = [
  // pack_commerce
  "crear_lead", "calificar_lead", "actualizar_lead", "consultar_inventario", "recomendar_producto", "generar_cotizacion",
  "aplicar_promocion", "confirmar_cotizacion", "crear_pedido", "agregar_item_pedido", "consultar_estado_pedido",
  "confirmar_pago_pedido", "verificar_pago_pedido",
  // pack_calendar
  "create_calendar_event", "check_availability", "find_next_available", "update_calendar_event", "list_client_appointments",
  "cancel_calendar_event", "list_calendars", "list_appointment_types",
  // pack_cobranza
  "cob_consultar_saldo", "cob_estado_cuenta", "cob_evaluar_negociacion", "cob_registrar_promesa_pago", "cob_opciones_promesa",
  "cob_registrar_promesa_saldo", "cob_registrar_abono", "cob_consultar_suscripcion", "cob_crear_suscripcion",
  "cob_pausar_suscripcion", "cob_cancelar_suscripcion", "cob_renovar_suscripcion", "cob_link_suscripcion",
  // suscripciones (core)
  "sub_aplicar_cambio_plan", "sub_cambiar_plan", "sub_cancelar", "sub_confirmar_inscripcion", "sub_consultar",
  "sub_cotizar_cambio_plan", "sub_cotizar_inscripcion", "sub_inscribir", "sub_link_pago", "sub_listar_planes", "sub_pausar",
  // core
  "enviar_plantilla_opciones", "escalate_to_human", "get_conversation_usage", "get_customer_profile", "load_playbook",
  "remember_fact", "search_memories", "send_email", "set_conversation_note", "update_customer_profile",
  "consultar_datos_cliente", "responder_aviso_datos", "consultar_historial_cliente",
  // pack_knowledge
  "buscar_conocimiento",
];

describe("grupos de acciones", () => {
  it("ninguna acción del backend cae en «Otras acciones» y todas tienen nombre propio", () => {
    for (const tool of DEL_BACKEND) {
      expect(grupoDeAccion(tool).id, tool).not.toBe("otras");
      expect(ACCIONES_CONOCIDAS, tool).toContain(tool);
      expect(nombreDeAccion(tool), tool).not.toMatch(/_/);
    }
  });

  it("agrupa por lo que hacen", () => {
    expect(grupoDeAccion("crear_pedido").titulo).toBe("Pedidos");
    expect(grupoDeAccion("consultar_inventario").titulo).toBe("Catálogo");
    expect(grupoDeAccion("update_calendar_event").titulo).toBe("Citas");
    expect(grupoDeAccion("cob_registrar_abono").titulo).toBe("Cartera");
    expect(grupoDeAccion("cob_pausar_suscripcion").titulo).toBe("Suscripciones");
    expect(grupoDeAccion("verificar_pago_pedido").titulo).toBe("Pagos");
    expect(grupoDeAccion("crear_lead").titulo).toBe("Leads");
  });

  it("una acción nueva toma el grupo por su nombre y, si no, va a «Otras acciones»", () => {
    expect(grupoDeAccion("cob_algo_nuevo").id).toBe("cartera");
    expect(grupoDeAccion("cob_congelar_suscripcion").id).toBe("suscripciones");
    expect(grupoDeAccion("sub_algo").id).toBe("suscripciones");
    expect(grupoDeAccion("move_appointment").id).toBe("citas");
    expect(grupoDeAccion("duplicar_pedido").id).toBe("pedidos");
    expect(grupoDeAccion("consultar_clima").id).toBe("otras");
    expect(nombreDeAccion("consultar_clima")).toBe("Consultar clima");
  });

  it("el texto de los grupos no usa palabras técnicas", () => {
    for (const g of GRUPOS_DE_ACCIONES) expect(`${g.titulo} ${g.descripcion}`).not.toMatch(/\b(tools?|packs?|plugins?)\b/i);
  });

  it("agruparAcciones respeta el orden de los grupos y omite los vacíos", () => {
    const grupos = agruparAcciones([{ tool: "consultar_clima" }, { tool: "crear_lead" }, { tool: "crear_pedido" }, { tool: "generar_cotizacion" }]);
    expect(grupos.map((g) => g.grupo.id)).toEqual(["pedidos", "leads", "otras"]);
    expect(grupos[0].acciones.map((a) => a.tool)).toEqual(["crear_pedido", "generar_cotizacion"]);
  });
});
