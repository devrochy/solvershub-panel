import { describe, expect, it } from "vitest";

import {
  calidadNumeroLabel,
  canalLabel,
  citaLabel,
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

  it("etiqueta motivos de escalación, incluidos los tool:*", () => {
    expect(escalacionLabel("send_failed")).toBe("Fallo al enviar");
    expect(escalacionLabel("turns_unresolved")).toBe("Turnos sin resolver");
    expect(escalacionLabel("tool:manual")).toBe("Solicitud manual");
    expect(escalacionLabel(null)).toBe("Sin motivo");
  });

  it("etiqueta claves de permiso con humanización de fallback", () => {
    expect(seccionLabel("pack_cobranza:suscripciones")).toBe("Suscripciones");
    expect(seccionLabel("pack_commerce:pedidos")).toBe("Pedidos");
    expect(seccionLabel("pack_xyz:otra_cosa")).toBe("Otra cosa");
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
