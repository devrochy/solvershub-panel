"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import * as Menu from "@radix-ui/react-dropdown-menu";

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
  onClick,
}: {
  href: string;
  children: ReactNode;
  current?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <Menu.Item asChild disabled={disabled}>
      <Link
        href={href}
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

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return <Menu.Label className="px-2 py-1.5 text-xs text-text-soft">{children}</Menu.Label>;
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className="my-1 h-px bg-border-soft" />;
}
