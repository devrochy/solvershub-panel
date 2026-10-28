"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronUp, LogOut, Palette, UserRound } from "lucide-react";

import { EVENTO_CAMBIAR_TEMA } from "@/components/shell/atajos-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/avatar";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import type { Me } from "@/lib/api/types";
import { useAvatarPerfil, urlAvatarPropio } from "@/lib/avatar-version";
import { THEME_COOKIE, toggleTheme, type ThemeName } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Tarjeta del usuario al pie del menú (D-SPEC-34): avatar + nombre en una tarjeta resaltada y
 * un submenú con el perfil, un interruptor de tema y cerrar sesión. En la barra plegada queda
 * solo el avatar.
 */
export function UserCard({
  me,
  initialTheme,
  collapsed = false,
  onNavigate,
}: {
  me: Me;
  initialTheme: ThemeName;
  collapsed?: boolean;
  /** El cajón móvil lo usa para cerrarse al elegir una sección. */
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [theme, setTheme] = useState<ThemeName>(initialTheme);
  const { version, preview } = useAvatarPerfil();
  const nombre = me.nombre?.trim() || me.username || me.email;
  const src = urlAvatarPropio(me.avatar_url, { version, preview });

  function aplicarTema(next: ThemeName) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

  // La paleta de comandos (Ctrl+K) también cambia el tema: escuchamos su evento aquí.
  const alternarTema = useEffectEvent(() => aplicarTema(toggleTheme(theme)));
  useEffect(() => {
    window.addEventListener(EVENTO_CAMBIAR_TEMA, alternarTema);
    return () => window.removeEventListener(EVENTO_CAMBIAR_TEMA, alternarTema);
  }, []);

  async function salir() {
    await fetch("/api/session", { method: "DELETE" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={collapsed ? nombre : undefined}
          aria-label={collapsed ? nombre : "Menú de tu cuenta"}
          className={cn(
            "flex items-center rounded-xl border transition-[background-color,border-color,box-shadow]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
            collapsed
              ? "h-11 w-11 justify-center border-border-soft bg-surface hover:border-border-strong"
              : "w-full gap-3 border-border-soft bg-surface p-2.5 text-left shadow-elev-1 hover:border-border-strong hover:bg-surface-2",
          )}
        >
          <Avatar name={nombre} src={src} size="sm" />
          {!collapsed && (
            <>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-headline">{nombre}</span>
                <span className="truncate text-xs text-text-soft">{me.email}</span>
              </span>
              <ChevronUp aria-hidden className="h-4 w-4 shrink-0 text-text-soft" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align={collapsed ? "start" : "end"} className="w-64">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-medium text-headline">{nombre}</span>
          <span className="block truncate">{me.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLinkItem href="/perfil" current={pathname === "/perfil"} onClick={onNavigate}>
          <UserRound className="h-4 w-4 text-text-soft" aria-hidden />
          Editar perfil
        </DropdownMenuLinkItem>
        <div className="flex items-center justify-between gap-3 px-2 py-1.5">
          <span className="flex items-center gap-2 text-sm text-body">
            <Palette className="h-4 w-4 text-text-soft" aria-hidden />
            Tema
          </span>
          <ThemeSwitch
            oscuro={theme === "sh-dark"}
            onChange={(oscuro) => aplicarTema(oscuro ? "sh-dark" : "sh-light")}
          />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void salir()} tone="danger" icon={<LogOut aria-hidden />}>
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
