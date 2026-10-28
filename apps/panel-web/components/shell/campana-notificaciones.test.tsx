// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { CampanaNotificaciones, textoDelContador } from "@/components/shell/campana-notificaciones";
import { ShellProvider } from "@/components/shell/shell-context";
import { FeedbackProviders } from "@/components/ui/providers";
import type { NotificacionItem, NotificacionPagina } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/dashboard",
}));

class ResizeObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const item = (id: string, extra: Partial<NotificacionItem> = {}): NotificacionItem => ({
  id,
  event_key: "core.escalation",
  category: "conversaciones",
  severity: "critical",
  title: `Aviso ${id}`,
  body: "Un cliente pidió atención humana.",
  target: { entity: "conversacion", id: "c1", section: "escalations" },
  data: {},
  created_at: new Date().toISOString(),
  read: false,
  ...extra,
});

let pagina: NotificacionPagina;
let silenciadoHasta: string | null = null;
let llamadas: { url: string; metodo: string; cuerpo?: unknown }[];

function responder(url: string, init?: RequestInit): Response {
  const metodo = init?.method ?? "GET";
  llamadas.push({ url, metodo, cuerpo: init?.body ? JSON.parse(String(init.body)) : undefined });
  if (url.startsWith("/api/notificaciones/unread-count")) return Response.json({ unread_count: pagina.unread_count });
  if (url.startsWith("/api/notificaciones/preferences"))
    return Response.json({ categories: ["conversaciones", "ventas", "cobros", "agenda", "sistema"], push_off_categories: ["ventas"], muted_until: silenciadoHasta });
  if (url.startsWith("/api/notificaciones/read")) return Response.json({ unread_count: 0 });
  if (metodo === "DELETE") return new Response(null, { status: 204 });
  if (url.startsWith("/api/notificaciones")) return Response.json(pagina);
  return new Response(null, { status: 404 });
}

function montar() {
  return render(
    <ShellProvider permisos={{ conversations: "write", escalations: "write" }}>
      <FeedbackProviders>
        <header>
          <CampanaNotificaciones />
        </header>
      </FeedbackProviders>
    </ShellProvider>,
  );
}

beforeEach(() => {
  llamadas = [];
  silenciadoHasta = null;
  pagina = { items: [item("a"), item("b", { severity: "info", category: "ventas", read: true })], next_cursor: null, unread_count: 1 };
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => responder(String(url), init)));
  vi.stubGlobal("ResizeObserver", ResizeObserverFalso);
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener: () => undefined, removeEventListener: () => undefined }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("campana de notificaciones", () => {
  it("tope 99+", () => {
    expect(textoDelContador(7)).toBe("7");
    expect(textoDelContador(100)).toBe("99+");
  });

  it("consulta el contador al montar y lo pone en el nombre accesible", async () => {
    montar();
    expect(await screen.findByRole("button", { name: "Notificaciones, 1 sin leer" })).toBeTruthy();
    expect(llamadas.some((l) => l.url.startsWith("/api/notificaciones/unread-count"))).toBe(true);
  });

  it("al abrir lista con icono de categoría, severidad y estado de lectura", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Notificaciones/ }));
    const dialogo = await screen.findByRole("dialog", { name: "Notificaciones" });
    const filas = await within(dialogo).findAllByRole("listitem");
    expect(filas).toHaveLength(2);
    expect(filas[0].getAttribute("data-severidad")).toBe("critical");
    expect(within(filas[0]).getByText("Urgente")).toBeTruthy();
    expect(within(filas[0]).getByText("No leída")).toBeTruthy();
    expect(within(filas[1]).queryByText("No leída")).toBeNull();
    // Enlace a la conversación, porque el usuario ve ese módulo.
    expect(within(filas[0]).getByRole("link").getAttribute("href")).toBe("/conversaciones?c=c1");
  });

  it("marca leída al abrir una fila y deja de contarla", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Notificaciones/ }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click((await within(dialogo).findAllByRole("link"))[0]);
    await waitFor(() => expect(llamadas.some((l) => l.url === "/api/notificaciones/read" && l.metodo === "POST")).toBe(true));
    expect(llamadas.find((l) => l.url === "/api/notificaciones/read")?.cuerpo).toEqual({ ids: ["a"] });
  });

  it("archiva con rollback invisible al usuario: la fila sale de la lista", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Notificaciones/ }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(await within(dialogo).findByRole("button", { name: "Archivar: Aviso a" }));
    await waitFor(() => expect(within(dialogo).queryByText("Aviso a")).toBeNull());
    expect(llamadas.some((l) => l.url === "/api/notificaciones/a" && l.metodo === "DELETE")).toBe(true);
  });

  it("filtra por categoría y por no leídas pidiéndolo al servidor", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Notificaciones/ }));
    const dialogo = await screen.findByRole("dialog");
    await within(dialogo).findAllByRole("listitem");
    fireEvent.click(within(dialogo).getByRole("button", { name: "Ventas" }));
    await waitFor(() => expect(llamadas.some((l) => l.url.includes("category=ventas"))).toBe(true));
    fireEvent.click(within(dialogo).getByRole("tab", { name: /No leídas/ }));
    await waitFor(() => expect(llamadas.some((l) => l.url.includes("unread=true"))).toBe(true));
  });

  it("preferencias: apaga el push de una categoría y silencia", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Notificaciones/ }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(await within(dialogo).findByRole("button", { name: "Preferencias de notificaciones" }));
    const interruptor = await within(dialogo).findByRole("switch", { name: "Avisos push de Cobros" });
    await waitFor(() => expect(interruptor.hasAttribute("disabled")).toBe(false));
    fireEvent.click(interruptor);
    await waitFor(() => {
      const put = llamadas.find((l) => l.url === "/api/notificaciones/preferences" && l.metodo === "PUT");
      expect(put?.cuerpo).toEqual({ push_off_categories: ["ventas", "cobros"] });
    });
    fireEvent.click(within(dialogo).getByRole("button", { name: "1 hora" }));
    await waitFor(() => expect(llamadas.find((l) => l.url === "/api/notificaciones/mute")?.cuerpo).toEqual({ minutes: 60 }));
  });

  it("el texto del silencio no repite el punto final (\"a. m..\")", async () => {
    silenciadoHasta = new Date(Date.now() + 3600_000).toISOString();
    montar();
    fireEvent.click(screen.getByRole("button", { name: /Notificaciones/ }));
    const dialogo = await screen.findByRole("dialog");
    fireEvent.click(await within(dialogo).findByRole("button", { name: "Preferencias de notificaciones" }));
    const texto = (await within(dialogo).findByText(/^Silenciados hasta /)).textContent ?? "";
    expect(texto.endsWith(".")).toBe(true);
    expect(texto.endsWith("..")).toBe(false);
  });

  it("sin notificaciones muestra un estado vacío que orienta", async () => {
    pagina = { items: [], next_cursor: null, unread_count: 0 };
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Notificaciones" }));
    expect(await screen.findByText("Aún no hay notificaciones")).toBeTruthy();
  });

  it("cierra con animación de salida: sigue montada en data-state=closed hasta el animationend", async () => {
    // jsdom no resuelve `animation-name` desde globals.css: se simula solo esa lectura para el
    // popover en `closed` (la salida real es `sh-notif-sale`). El resto es el flujo real de Radix.
    const original = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((el: Element, pseudo?: string | null) => {
      const estilos = original(el, pseudo);
      if (el.classList.contains("sh-notif-popover")) {
        // Radix guarda este objeto al montar: el nombre se decide al leerlo, según el estado actual.
        return new Proxy(estilos, {
          get: (t, k) => {
            if (k === "animationName") return el.getAttribute("data-state") === "closed" ? "sh-notif-sale" : "none";
            const valor = Reflect.get(t, k) as unknown;
            return typeof valor === "function" ? valor.bind(t) : valor;
          },
        });
      }
      return estilos;
    });
    try {
      montar();
      fireEvent.click(screen.getByRole("button", { name: /Notificaciones/ }));
      const dialogo = await screen.findByRole("dialog", { name: "Notificaciones" });
      await within(dialogo).findAllByRole("listitem");
      expect(dialogo.getAttribute("data-state")).toBe("open");

      fireEvent.keyDown(dialogo, { key: "Escape" });
      // Aún en pantalla, ya en estado de salida: eso es lo que la animación CSS consume.
      expect(screen.getByRole("dialog", { name: "Notificaciones" }).getAttribute("data-state")).toBe("closed");

      // Al terminar la animación de salida, Radix la desmonta.
      const fin = new Event("animationend", { bubbles: true });
      Object.defineProperty(fin, "animationName", { value: "sh-notif-sale" });
      act(() => {
        dialogo.dispatchEvent(fin);
      });
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("sin violaciones graves de accesibilidad (cerrada y abierta)", async () => {
    const { container } = montar();
    expect(await violacionesGraves(container)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: /Notificaciones/ }));
    const dialogo = await screen.findByRole("dialog");
    await within(dialogo).findAllByRole("listitem");
    expect(await violacionesGraves(dialogo)).toEqual([]);
  });
});
