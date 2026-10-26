"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { NotificacionItem, NotificacionPagina, NotificacionPreferencias } from "@/lib/api/types";
import { usePolling } from "@/lib/conversaciones/en-vivo";
import { toast } from "@/lib/toast-store";

/** Contador de la campana y lista abierta: cada 20 s, solo con la pestaña visible (ADR-0167). */
export const INTERVALO_NOTIFICACIONES_MS = 20_000;
const PAGINA = 20;

export type Pestana = "todas" | "no_leidas";

async function pedir<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init });
    if (!res.ok) return null;
    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function unir(actuales: NotificacionItem[], nuevas: NotificacionItem[]): NotificacionItem[] {
  const porId = new Map(actuales.map((n) => [n.id, n]));
  for (const n of nuevas) porId.set(n.id, n);
  return [...porId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
}

/**
 * Estado del centro de notificaciones: contador (siempre), lista (solo abierto), acciones con
 * rollback y preferencias. Se monta con `key` por negocio: al cambiar de negocio arranca limpio.
 */
export function useNotificaciones({ abierto }: { abierto: boolean }) {
  const [noLeidas, setNoLeidas] = useState(0);
  const [items, setItems] = useState<NotificacionItem[]>([]);
  const [siguiente, setSiguiente] = useState<string | null>(null);
  // Filtro («pestaña|categoría») cuya primera página ya llegó: mientras no coincida con el vigente, se está cargando.
  const [cargadoPara, setCargadoPara] = useState<string | null>(null);
  // Ids que ya estaban al cargar la lista; lo que llega después entra con un fade corto.
  const [conocidas, setConocidas] = useState<ReadonlySet<string>>(new Set());
  const [ahora, setAhora] = useState(() => new Date());
  const [fallo, setFallo] = useState(false);
  const [pestana, setPestana] = useState<Pestana>("todas");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [preferencias, setPreferencias] = useState<NotificacionPreferencias | null>(null);
  const filtroRef = useRef({ pestana, categoria });
  useEffect(() => {
    filtroRef.current = { pestana, categoria };
  }, [pestana, categoria]);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const consultaDeFiltros = useCallback((cursor?: string | null) => {
    const { pestana: p, categoria: c } = filtroRef.current;
    const qs = new URLSearchParams({ limit: String(PAGINA) });
    if (p === "no_leidas") qs.set("unread", "true");
    if (c) qs.set("category", c);
    if (cursor) qs.set("cursor", cursor);
    return `/api/notificaciones?${qs}`;
  }, []);

  /** Primera página con los filtros vigentes; reemplaza la lista (o la une si `unirConActuales`). */
  const recargar = useCallback(
    async (unirConActuales = false) => {
      const pagina = await pedir<NotificacionPagina>(consultaDeFiltros());
      if (!pagina) {
        setFallo(true);
        return;
      }
      setFallo(false);
      setAhora(new Date());
      setNoLeidas(pagina.unread_count);
      setItems((actuales) => (unirConActuales ? unir(actuales, pagina.items) : pagina.items));
      if (!unirConActuales) {
        setSiguiente(pagina.next_cursor ?? null);
        setConocidas(new Set(pagina.items.map((i) => i.id)));
      }
    },
    [consultaDeFiltros],
  );

  // Contador de la campana: siempre, con la pestaña visible.
  const consultarContador = useCallback(async () => {
    const r = await pedir<{ unread_count: number }>("/api/notificaciones/unread-count");
    if (r) setNoLeidas(r.unread_count);
  }, []);
  usePolling(consultarContador, INTERVALO_NOTIFICACIONES_MS);
  // Primera lectura al montar (el polling espera un intervalo): diferida un tick.
  useEffect(() => {
    const id = window.setTimeout(() => void consultarContador(), 0);
    return () => window.clearTimeout(id);
  }, [consultarContador]);

  // Abierto: carga al abrir y al cambiar de filtro; refresca cada 20 s sin perder lo cargado.
  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    const clave = `${pestana}|${categoria ?? ""}`;
    // Diferido un tick: la carga actualiza estado y no debe hacerlo de forma síncrona en el efecto.
    const id = window.setTimeout(() => {
      void recargar().finally(() => {
        if (vigente) setCargadoPara(clave);
      });
    }, 0);
    return () => {
      vigente = false;
      window.clearTimeout(id);
    };
  }, [abierto, pestana, categoria, recargar]);
  const cargando = abierto && cargadoPara !== `${pestana}|${categoria ?? ""}`;
  usePolling(
    useCallback(async () => {
      await recargar(true);
    }, [recargar]),
    INTERVALO_NOTIFICACIONES_MS,
    abierto,
  );

  const cargarMas = useCallback(async () => {
    if (!siguiente) return;
    const pagina = await pedir<NotificacionPagina>(consultaDeFiltros(siguiente));
    if (!pagina) return;
    setItems((actuales) => unir(actuales, pagina.items));
    setSiguiente(pagina.next_cursor ?? null);
    setNoLeidas(pagina.unread_count);
  }, [siguiente, consultaDeFiltros]);

  const marcarLeida = useCallback(async (id: string) => {
    // El actualizador de `setItems` corre diferido: la decisión se toma sobre el espejo.
    if (itemsRef.current.find((n) => n.id === id)?.read !== false) return;
    setItems((actuales) => actuales.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setNoLeidas((n) => Math.max(0, n - 1));
    const r = await pedir<{ unread_count: number }>("/api/notificaciones/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    if (r) setNoLeidas(r.unread_count);
    else {
      setItems((actuales) => actuales.map((n) => (n.id === id ? { ...n, read: false } : n)));
      setNoLeidas((n) => n + 1);
    }
  }, []);

  const marcarTodas = useCallback(async () => {
    const antes = { items, noLeidas };
    setItems((actuales) => actuales.map((n) => ({ ...n, read: true })));
    setNoLeidas(0);
    const r = await pedir<{ unread_count: number }>("/api/notificaciones/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (r) {
      setNoLeidas(r.unread_count);
      // En la pestaña «No leídas» la lista queda vacía.
      void recargar();
    } else {
      setItems(antes.items);
      setNoLeidas(antes.noLeidas);
      toast.error("No se pudieron marcar como leídas.");
    }
  }, [items, noLeidas, recargar]);

  const archivar = useCallback(
    async (id: string) => {
      const previas = items;
      const eraNoLeida = items.find((n) => n.id === id)?.read === false;
      setItems((actuales) => actuales.filter((n) => n.id !== id));
      if (eraNoLeida) setNoLeidas((n) => Math.max(0, n - 1));
      const r = await pedir<object>(`/api/notificaciones/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!r) {
        setItems(previas);
        if (eraNoLeida) setNoLeidas((n) => n + 1);
        toast.error("No se pudo archivar la notificación.");
      }
    },
    [items],
  );

  const cargarPreferencias = useCallback(async () => {
    const p = await pedir<NotificacionPreferencias>("/api/notificaciones/preferences");
    if (p) setPreferencias(p);
  }, []);

  const guardarPushApagado = useCallback(
    async (apagadas: string[]) => {
      const previas = preferencias;
      setPreferencias((p) => (p ? { ...p, push_off_categories: apagadas } : p));
      const r = await pedir<NotificacionPreferencias>("/api/notificaciones/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ push_off_categories: apagadas }),
      });
      if (r) setPreferencias(r);
      else {
        setPreferencias(previas);
        toast.error("No se pudo guardar la preferencia.");
      }
    },
    [preferencias],
  );

  const silenciar = useCallback(async (minutos: number | null) => {
    const r = await pedir<NotificacionPreferencias>("/api/notificaciones/mute", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes: minutos }),
    });
    if (r) setPreferencias(r);
    else toast.error("No se pudo cambiar el silencio.");
  }, []);

  return {
    noLeidas,
    items,
    siguiente,
    cargando,
    conocidas,
    ahora,
    fallo,
    pestana,
    setPestana,
    categoria,
    setCategoria,
    preferencias,
    cargarPreferencias,
    cargarMas,
    recargar,
    marcarLeida,
    marcarTodas,
    archivar,
    guardarPushApagado,
    silenciar,
  };
}
