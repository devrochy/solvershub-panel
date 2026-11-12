"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";

export const DropdownMenu = Menu.Root;
export const DropdownMenuTrigger = Menu.Trigger;

const SUPERFICIE = "z-50 min-w-44 rounded-md border border-border bg-surface p-1 shadow-elev-2 focus:outline-none";

/** Contenido del menú: flechas, Escape y foco devuelto al disparador (Radix). */
export function DropdownMenuContent({
  children,
  side = "bottom",
  align = "end",
  className,
}: {
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  className?: string;
}) {
  return (
    <Menu.Portal>
      <Menu.Content side={side} align={align} sideOffset={6} className={cn(SUPERFICIE, className)}>
        {children}
      </Menu.Content>
    </Menu.Portal>
  );
}

/** Ítem del menú. `tone="danger"` para lo destructivo (que además confirma con `useConfirm`). */
export function DropdownMenuItem({
  children,
  onSelect,
  icon,
  tone = "default",
  disabled,
}: {
  children: ReactNode;
  onSelect?: () => void;
  icon?: ReactNode;
  tone?: "default" | "danger";
  disabled?: boolean;
}) {
  return (
    <Menu.Item
      disabled={disabled}
      onSelect={onSelect}
      className={cn(
        "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
        "data-[highlighted]:bg-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        tone === "danger" ? "text-status-danger-fg" : "text-headline",
      )}
    >
      {icon && <span className="text-text-soft [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      {children}
    </Menu.Item>
  );
}

/** Ítem que navega: enlace real (abre en pestaña nueva, se ve en la barra de estado) con el foco por flechas de Radix. */
export function DropdownMenuLinkItem({
  href,
  children,
  current = false,
  disabled = false,
  scroll,
  onClick,
}: {
  href: string;
  children: ReactNode;
  current?: boolean;
  disabled?: boolean;
  /** false: abre algo encima de la misma página (`?param=`) sin subir la lista. */
  scroll?: boolean;
  onClick?: () => void;
}) {
  return (
    <Menu.Item asChild disabled={disabled}>
      <Link
        href={href}
        scroll={scroll}
        onClick={onClick}
        aria-current={current ? "page" : undefined}
        className={cn(
          "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
          "data-[highlighted]:bg-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          current ? "bg-surface-raised text-headline" : "text-body",
        )}
      >
        {children}
      </Link>
    </Menu.Item>
  );
}

/**
 * Ítem que abre un destino en una pestaña nueva (documentación, ayuda). Es un `<a>` real con
 * `rel="noopener noreferrer"`; el aviso «se abre en una pestaña nueva» va como texto solo para
 * lectores de pantalla y como `title` para quien pasa el puntero. `onClick` cierra el menú.
 */
export function DropdownMenuExternalLinkItem({
  href,
  children,
  avisoNuevaPestana,
  onClick,
}: {
  href: string;
  children: ReactNode;
  /** Texto accesible y tooltip: «se abre en una pestaña nueva». */
  avisoNuevaPestana: string;
  onClick?: () => void;
}) {
  return (
    <Menu.Item asChild>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={avisoNuevaPestana}
        onClick={onClick}
        className={cn(
          "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-body outline-none transition-colors",
          "data-[highlighted]:bg-hover",
        )}
      >
        {children}
        <ExternalLink aria-hidden className="ml-auto h-3.5 w-3.5 text-text-soft" />
        <span className="sr-only">{" "}({avisoNuevaPestana})</span>
      </a>
    </Menu.Item>
  );
}

export function DropdownMenuLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <Menu.Label className={cn("px-2 py-1.5 text-xs text-text-soft", className)}>{children}</Menu.Label>;
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className="my-1 h-px bg-border-soft" />;
}
