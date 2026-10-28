"use client";

import { useState } from "react";
import { BellOff, CheckCheck, Settings2 } from "lucide-react";

import { FilaNotificacion } from "@/components/notificaciones/fila-notificacion";
import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { NotificacionItem } from "@/lib/api/types";
import {
  CATEGORIA,
  CATEGORIAS,
  OPCIONES_SILENCIO,
  agruparPorDia,
  minutosHastaManana,
  rutaDeNotificacion,
} from "@/lib/notificaciones/tipos";
import type { useNotificaciones } from "@/lib/notificaciones/use-notificaciones";
import { cn } from "@/lib/utils";

type Estado = ReturnType<typeof useNotificaciones>;

const PESTANAS = [
  { id: "todas", label: "Todas" },
  { id: "no_leidas", label: "No leídas" },
] as const;

/**
 * Contenido del centro de notificaciones (popover en escritorio, hoja en celular): pestañas
 * Todas / No leídas, filtro por categoría, lista agrupada por día y la vista de preferencias
 * (push por categoría y silencio). El feed muestra todo lo que el usuario puede ver; las
 * preferencias gobiernan solo el aviso push (ADR-0167).
 */
export function CentroDeNotificaciones({ n, onCerrar }: { n: Estado; onCerrar: () => void }) {
  const shell = useShell();
  const [verPreferencias, setVerPreferencias] = useState(false);
  const ahora = n.ahora;

  function abrirPreferencias() {
    setVerPreferencias(true);
    void n.cargarPreferencias();
  }

  function alAbrir(item: NotificacionItem) {
    void n.marcarLeida(item.id);
    onCerrar();
  }

  const grupos = agruparPorDia(n.items, ahora);

  if (verPreferencias) {
    return <Preferencias n={n} onVolver={() => setVerPreferencias(false)} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border-soft px-3 py-2">
        <div role="tablist" aria-label="Filtrar por lectura" className="flex gap-1">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={n.pestana === p.id}
              onClick={() => n.setPestana(p.id)}
              className={cn(
                "h-8 rounded-md px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-focus",
                n.pestana === p.id ? "bg-focus/10 font-medium text-headline" : "text-text-soft hover:bg-hover hover:text-headline",
              )}
            >
              {p.label}
              {p.id === "no_leidas" && n.noLeidas > 0 ? ` (${n.noLeidas > 99 ? "99+" : n.noLeidas})` : ""}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Marcar todas como leídas"
            title="Marcar todas como leídas"
            disabled={n.noLeidas === 0}
            onClick={() => void n.marcarTodas()}
          >
            <CheckCheck className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Preferencias de notificaciones"
            title="Preferencias"
            onClick={abrirPreferencias}
          >
            <Settings2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 gap-1.5 overflow-x-auto [scrollbar-width:none] border-b border-border-soft px-3 py-2" role="group" aria-label="Filtrar por categoría">
        <ChipCategoria activo={n.categoria === null} onClick={() => n.setCategoria(null)}>
          Todas
        </ChipCategoria>
        {CATEGORIAS.map((c) => {
          const Icono = CATEGORIA[c].icon;
          return (
            <ChipCategoria key={c} activo={n.categoria === c} onClick={() => n.setCategoria(n.categoria === c ? null : c)}>
              <Icono className="h-3.5 w-3.5" aria-hidden />
              {CATEGORIA[c].label}
            </ChipCategoria>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2" aria-busy={n.cargando}>
        {n.cargando && n.items.length === 0 ? (
          <div className="flex flex-col gap-3 p-2" aria-label="Cargando notificaciones">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-9 w-9 shrink-0" />
                <Skeleton className="flex-1" lines={3} />
              </div>
            ))}
          </div>
        ) : n.fallo && n.items.length === 0 ? (
          <EmptyState
            title="No se pudieron cargar las notificaciones"
            description="Revisa tu conexión e inténtalo de nuevo."
            action={
              <Button type="button" variant="outline" size="sm" onClick={() => void n.recargar()}>
                Reintentar
              </Button>
            }
          />
        ) : n.items.length === 0 ? (
          <EmptyState
            title={n.pestana === "no_leidas" ? "Estás al día" : "Aún no hay notificaciones"}
            description={
              n.pestana === "no_leidas"
                ? "No tienes notificaciones sin leer."
                : "Aquí aparecerán las escalaciones, los pedidos, los cobros y los avisos de tu negocio."
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {grupos.map((g) => (
              <section key={g.dia} aria-label={g.dia}>
                <h3 className="px-3 pb-1 pt-1 text-xs font-medium uppercase tracking-wide text-text-soft">{g.dia}</h3>
                <ul className="flex flex-col gap-0.5">
                  {g.items.map((item) => (
                    <FilaNotificacion
                      key={item.id}
                      item={item}
                      ahora={ahora}
                      nueva={!n.conocidas.has(item.id)}
                      href={rutaDeNotificacion(item.target, shell?.permisos, shell?.packs, shell?.esMaster)}
                      onAbrir={alAbrir}
                      onArchivar={(i) => void n.archivar(i.id)}
                    />
                  ))}
                </ul>
              </section>
            ))}
            {n.siguiente && (
              <Button type="button" variant="ghost" size="sm" className="self-center" onClick={() => void n.cargarMas()}>
                Ver más antiguas
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChipCategoria({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-pill border px-2.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-focus",
        activo
          ? "border-focus bg-focus/10 font-medium text-headline"
          : "border-control-border text-text-soft hover:bg-hover hover:text-headline",
      )}
    >
      {children}
    </button>
  );
}

function Preferencias({ n, onVolver }: { n: Estado; onVolver: () => void }) {
  const apagadas = n.preferencias?.push_off_categories ?? [];
  const silenciadoHasta = n.preferencias?.muted_until ? new Date(n.preferencias.muted_until) : null;
  const silenciado = silenciadoHasta !== null && silenciadoHasta.getTime() > n.ahora.getTime();

  function alternar(categoria: string, encendida: boolean) {
    const nuevas = encendida ? apagadas.filter((c) => c !== categoria) : [...new Set([...apagadas, categoria])];
    void n.guardarPushApagado(nuevas);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border-soft px-3 py-2">
        <Button type="button" variant="ghost" size="sm" onClick={onVolver}>
          ← Volver
        </Button>
        <h3 className="text-sm font-medium text-headline">Preferencias</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <p className="text-sm text-body">
          Aquí eliges qué avisos te llegan al celular (push). La lista de notificaciones siempre muestra todo lo que
          puedes ver.
        </p>
        <ul className="mt-4 flex flex-col gap-1">
          {CATEGORIAS.map((c) => {
            const Icono = CATEGORIA[c].icon;
            const encendida = !apagadas.includes(c);
            return (
              <li key={c} className="flex items-center justify-between gap-3 rounded-md p-2">
                <label htmlFor={`push-${c}`} className="flex flex-1 items-center gap-2 text-sm text-headline">
                  <Icono className="h-4 w-4 text-text-soft" aria-hidden />
                  {CATEGORIA[c].label}
                </label>
                <Switch
                  id={`push-${c}`}
                  checked={encendida}
                  disabled={n.preferencias === null}
                  onCheckedChange={(valor) => alternar(c, valor)}
                  aria-label={`Avisos push de ${CATEGORIA[c].label}`}
                />
              </li>
            );
          })}
        </ul>

        <div className="mt-6 border-t border-border-soft pt-4">
          <h4 className="flex items-center gap-2 text-sm font-medium text-headline">
            <BellOff className="h-4 w-4 text-text-soft" aria-hidden />
            Silenciar avisos push
          </h4>
          <p className="mt-1 text-sm text-text-soft">
            {silenciado && silenciadoHasta
              ? `Silenciados hasta ${silenciadoHasta
                .toLocaleString("es-CO", { weekday: "short", hour: "numeric", minute: "2-digit" })
                .replace(/\.$/, "")}.`
              : "Pausa los avisos al celular por un tiempo. Las notificaciones siguen apareciendo aquí."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {OPCIONES_SILENCIO.map((o) => (
              <Button
                key={o.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void n.silenciar(o.minutos === "manana" ? minutosHastaManana() : o.minutos)}
              >
                {o.label}
              </Button>
            ))}
            {silenciado && (
              <Button type="button" variant="ghost" size="sm" onClick={() => void n.silenciar(0)}>
                Reactivar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
