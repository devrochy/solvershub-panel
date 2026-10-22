"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronUp, LogOut, Moon, Sun, UserRound } from "lucide-react";

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
import type { Me } from "@/lib/api/types";
import { THEME_COOKIE, toggleTheme, type ThemeName } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Tarjeta del usuario al pie del menú (D-SPEC-34): avatar + nombre y un submenú para editar el
 * perfil, cambiar el tema y cerrar sesión. En la barra plegada queda solo el avatar.
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
  const nombre = me.nombre?.trim() || me.username || me.email;

  function cambiarTema() {
    const next = toggleTheme(theme);
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  }

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
            "flex items-center rounded-lg text-left transition-colors hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
            collapsed ? "h-10 w-10 justify-center" : "w-full gap-3 px-2 py-2",
          )}
        >
          <Avatar name={nombre} src={me.avatar_url ? "/api/perfil/avatar" : null} size="sm" />
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
      <DropdownMenuContent side="top" align={collapsed ? "start" : "end"} className="w-60">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-medium text-headline">{nombre}</span>
          <span className="block truncate">{me.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuLinkItem href="/perfil" current={pathname === "/perfil"} onClick={onNavigate}>
          <UserRound className="h-4 w-4 text-text-soft" aria-hidden />
          Editar perfil
        </DropdownMenuLinkItem>
        <DropdownMenuItem
          onSelect={cambiarTema}
          icon={theme === "sh-dark" ? <Sun aria-hidden /> : <Moon aria-hidden />}
        >
          {theme === "sh-dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void salir()} tone="danger" icon={<LogOut aria-hidden />}>
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
