import { describe, expect, it } from "vitest";

import {
  calidadNumeroLabel,
  canalLabel,
  citaLabel,
  escalacionCodigo,
  escalacionLabel,
  estadoNumeroMetaLabel,
  rolLabel,
  seccionLabel,
  verificacionNumeroLabel,
} from "./labels";

describe("labels (HU-UI-02)", () => {
  it("etiqueta canales conocidos y cae al id", () => {
    expect(canalLabel("whatsapp")).toBe("WhatsApp");
    expect(canalLabel("whatsapp_waweb")).toBe("WhatsApp Web (QR)");
    expect(canalLabel("telegram")).toBe("telegram");
    expect(canalLabel(null)).toBe("Canal");
  });

  it("etiqueta estados de cita en español claro", () => {
    expect(citaLabel("scheduled")).toBe("Agendada");
    expect(citaLabel("cancelled")).toBe("Cancelada");
    expect(citaLabel("no_show")).toBe("No asistió");
    expect(citaLabel("desconocido")).toBe("Desconocido");
  });

  it("etiqueta roles", () => {
    expect(rolLabel("master")).toBe("Master");
    expect(rolLabel("gestor")).toBe("Gestor");
    expect(rolLabel("colaborador")).toBe("Colaborador");
  });

  it("etiqueta motivos de escalación, incluidos los tool:* (HU-UX-17)", () => {
    expect(escalacionLabel("send_failed")).toBe("No se pudo enviar el mensaje");
    expect(escalacionLabel("turns_unresolved")).toBe("Varios turnos sin resolver");
    expect(escalacionLabel("keyword")).toBe("Pidió hablar con una persona");
    expect(escalacionLabel("tool:queja")).toBe("Queja");
    expect(escalacionLabel("tool:monto_alto")).toBe("Monto alto");
    // No todo `tool:*` es «Solicitud manual»: el texto libre de antes queda como «Otro».
    expect(escalacionLabel("tool:manual")).toBe("Otro");
    expect(escalacionLabel("tool:el cliente quiere al gerente")).toBe("Otro");
    expect(escalacionLabel("plugin:crear_pedido")).toBe("Acción de Crear pedido");
    expect(escalacionLabel("regla:sin_descuentos")).toBe("Regla del negocio");
    expect(escalacionLabel(null)).toBe("Sin motivo");
  });

  it("clasifica motivos crudos con los mismos códigos que el backend", () => {
    expect(escalacionCodigo("tool:queja")).toBe("queja");
    expect(escalacionCodigo("tool:otro")).toBe("otro");
    expect(escalacionCodigo("llm_error")).toBe("falla_ia");
    expect(escalacionCodigo("guardrail")).toBe("verificacion");
    expect(escalacionCodigo("precio: no verificado")).toBe("verificacion");
    expect(escalacionCodigo("algo_nuevo")).toBe("otro");
    expect(escalacionCodigo(undefined)).toBe("otro");
  });

  it("etiqueta claves de permiso con humanización de fallback", () => {
    expect(seccionLabel("pack_cobranza:suscripciones")).toBe("Suscripciones");
    expect(seccionLabel("pack_commerce:pedidos")).toBe("Pedidos");
    expect(seccionLabel("pack_xyz:otra_cosa")).toBe("Otra cosa");
  });

  it("etiqueta en español las claves reales que manda /admin/me", () => {
    expect(seccionLabel("collaborators")).toBe("Colaboradores");
    expect(seccionLabel("settings")).toBe("Configuración");
    expect(seccionLabel("tenants")).toBe("Negocios");
    expect(seccionLabel("pack_commerce")).toBe("Comercio");
    expect(seccionLabel("pack_calendar:conexion")).toBe("Calendario · Conexión");
    expect(seccionLabel("pack_cobranza:alertas")).toBe("Cobranza · Alertas");
    expect(seccionLabel("pack_subscriptions:suscripciones")).toBe("Suscripciones");
  });

  it("etiqueta estado, verificación y calidad de números de Meta", () => {
    expect(estadoNumeroMetaLabel("CONNECTED")).toBe("Conectado");
    expect(estadoNumeroMetaLabel("PENDING")).toBe("Pendiente");
    expect(estadoNumeroMetaLabel("NEW_STATE")).toBe("New state");
    expect(estadoNumeroMetaLabel(null)).toBe("Sin dato");
    expect(verificacionNumeroLabel("VERIFIED")).toBe("Verificado");
    expect(verificacionNumeroLabel("EXPIRED")).toBe("Código vencido");
    expect(calidadNumeroLabel("GREEN")).toBe("Alta");
    expect(calidadNumeroLabel(undefined)).toBe("Sin datos");
  });
});
