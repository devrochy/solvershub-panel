// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { EventTemplatesEditor } from "@/app/(app)/plantillas/eventos/_components/event-templates-editor";
import { FeedbackProviders } from "@/components/ui/providers";
import type { MessageTemplatesSettings } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

// Editor de avisos por evento con el texto por canal (ADR-0178 D2): los textos guardados se muestran, se editan
// por canal con sus límites, el QR no se admite en los 3 eventos de cobranza y al guardar viaja el conjunto completo
// (un evento al que se le vacían los textos se manda con `{}`, porque la API conserva lo guardado si no llega).

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/plantillas/eventos",
  useSearchParams: () => new URLSearchParams(),
}));

const VARIABLES_CITA = { "cliente.nombre": "Nombre del cliente", "cita.fecha": "Fecha de la cita" };
const VARIABLES_COBRO = { "cliente.nombre": "Nombre del cliente", "cargo.monto": "Monto del cargo" };

function ajustes(mapping: MessageTemplatesSettings["mapping"] = {}): MessageTemplatesSettings {
  return {
    events: [
      { event: "appointment.reminder", variables: VARIABLES_CITA },
      { event: "subscription.charge_reminder", variables: VARIABLES_COBRO },
    ],
    mapping,
    templates: [],
  };
}

const entrada = (resto: Partial<MessageTemplatesSettings["mapping"][string]> = {}) => ({
  template: "",
  language: "es",
  variables: [] as string[],
  fallback_text: "",
  fallback_text_by_channel: {},
  ...resto,
});

let cuerpos: { mapping: MessageTemplatesSettings["mapping"] }[];

beforeEach(() => {
  cuerpos = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.body) cuerpos.push(JSON.parse(String(init.body)));
      return new Response("{}", { status: 200 });
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function pintar(inicial: MessageTemplatesSettings) {
  return render(
    <FeedbackProviders>
      <EventTemplatesEditor initial={inicial} />
    </FeedbackProviders>,
  );
}
const campo = (evento: string, tipo: string) =>
  screen.getByLabelText(new RegExp(`^${tipo}`), { selector: `#ev-${evento.replace(/\./g, "\\.")}-canal-${canalDe(tipo)}` });
function canalDe(etiqueta: string): string {
  return { "WhatsApp por QR": "whatsapp_waweb", "Chat web": "webchat", Messenger: "messenger_meta", Instagram: "instagram_meta" }[etiqueta]!;
}
const guardar = () => fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

describe("editor de avisos por evento: texto por canal", () => {
  it("muestra un campo por canal en cada evento, con el límite y las variables del evento", () => {
    pintar(ajustes());
    for (const etiqueta of ["WhatsApp por QR", "Chat web", "Messenger", "Instagram"]) {
      const c = campo("appointment.reminder", etiqueta) as HTMLTextAreaElement;
      expect(c.maxLength).toBe(1000);
      expect(c.disabled).toBe(false);
    }
    expect(screen.getAllByText(/0\/1000 caracteres/).length).toBeGreaterThanOrEqual(4);
    expect(screen.getAllByText(/\{cliente\.nombre\}, \{cita\.fecha\}/).length).toBeGreaterThan(0);
    // Aviso de que depende de la bandera del negocio.
    expect(screen.getByText(/solo se envían cuando el equipo de SolversHub activa los avisos por canal/)).toBeTruthy();
  });

  it("deshabilita y explica el QR en los eventos de cobranza, pero no los demás canales", () => {
    pintar(ajustes());
    const qr = campo("subscription.charge_reminder", "WhatsApp por QR") as HTMLTextAreaElement;
    expect(qr.disabled).toBe(true);
    expect(screen.getByText(/Los avisos de cobro no salen por QR/)).toBeTruthy();
    expect((campo("subscription.charge_reminder", "Chat web") as HTMLTextAreaElement).disabled).toBe(false);
    expect((campo("appointment.reminder", "WhatsApp por QR") as HTMLTextAreaElement).disabled).toBe(false);
  });

  it("carga los textos guardados y cuenta los caracteres", () => {
    pintar(ajustes({ "appointment.reminder": entrada({ fallback_text_by_channel: { webchat: "Hola {cliente.nombre}" } }) }));
    expect((campo("appointment.reminder", "Chat web") as HTMLTextAreaElement).value).toBe("Hola {cliente.nombre}");
    expect(screen.getByText(/21\/1000 caracteres/)).toBeTruthy();
  });

  it("guarda el texto escrito por canal junto al resto del evento", async () => {
    pintar(ajustes());
    fireEvent.change(campo("appointment.reminder", "WhatsApp por QR"), { target: { value: "  Te esperamos el {cita.fecha}  " } });
    fireEvent.change(campo("appointment.reminder", "Instagram"), { target: { value: "Hola {cliente.nombre}" } });
    guardar();
    await waitFor(() => expect(cuerpos).toHaveLength(1));
    expect(cuerpos[0].mapping).toEqual({
      "appointment.reminder": entrada({
        fallback_text_by_channel: { whatsapp_waweb: "Te esperamos el {cita.fecha}", instagram_meta: "Hola {cliente.nombre}" },
      }),
    });
  });

  it("guardar sin tocar nada reenvía los textos guardados: no se pierden", async () => {
    const guardados = { whatsapp_waweb: "Te esperamos", webchat: "Hola" };
    pintar(
      ajustes({
        "appointment.reminder": entrada({ fallback_text: "Respaldo de WhatsApp", fallback_text_by_channel: guardados }),
        "subscription.charge_reminder": entrada({ fallback_text_by_channel: { messenger_meta: "Pagá aquí" } }),
      }),
    );
    guardar();
    await waitFor(() => expect(cuerpos).toHaveLength(1));
    expect(cuerpos[0].mapping).toEqual({
      "appointment.reminder": entrada({ fallback_text: "Respaldo de WhatsApp", fallback_text_by_channel: guardados }),
      "subscription.charge_reminder": entrada({ fallback_text_by_channel: { messenger_meta: "Pagá aquí" } }),
    });
  });

  it("vaciar los textos de un evento sin plantilla ni respaldo lo manda con {} para que la API los borre", async () => {
    pintar(ajustes({ "appointment.reminder": entrada({ fallback_text_by_channel: { webchat: "Hola" } }) }));
    fireEvent.change(campo("appointment.reminder", "Chat web"), { target: { value: "" } });
    guardar();
    await waitFor(() => expect(cuerpos).toHaveLength(1));
    expect(cuerpos[0].mapping).toEqual({ "appointment.reminder": entrada({ fallback_text_by_channel: {} }) });
  });

  it("un evento sin nada escrito no viaja", async () => {
    pintar(ajustes());
    guardar();
    await waitFor(() => expect(cuerpos).toHaveLength(1));
    expect(cuerpos[0].mapping).toEqual({});
  });

  it("no manda texto de QR en un evento de cobranza", async () => {
    pintar(ajustes());
    fireEvent.change(campo("subscription.charge_reminder", "Chat web"), { target: { value: "Paga aquí" } });
    guardar();
    await waitFor(() => expect(cuerpos).toHaveLength(1));
    expect(cuerpos[0].mapping["subscription.charge_reminder"].fallback_text_by_channel).toEqual({ webchat: "Paga aquí" });
  });

  it("una variable que el evento no permite se marca y bloquea el guardado", async () => {
    pintar(ajustes());
    fireEvent.change(campo("appointment.reminder", "Chat web"), { target: { value: "Debes {cargo.monto}" } });
    expect(screen.getByRole("alert").textContent).toMatch(/Variables no permitidas en este aviso: \{cargo\.monto\}/);
    expect((screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(campo("appointment.reminder", "Chat web"), { target: { value: "Cita el {cita.fecha}" } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect((screen.getByRole("button", { name: "Guardar" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("sin violaciones graves de accesibilidad", async () => {
    const { container } = pintar(ajustes());
    expect(await violacionesGraves(container)).toEqual([]);
    expect(within(container).getAllByRole("group").length).toBe(2);
  });
});
