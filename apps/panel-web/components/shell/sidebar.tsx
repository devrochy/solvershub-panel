"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

import { CORE_NAV, PACKS_NAV, TOOLS_NAV, type NavItem } from "@/components/shell/nav";
import type { Me } from "@/lib/api/types";
import { cn } from "@/lib/utils";

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  const base = "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150";

  if (!item.ready) {
    return (
      <span aria-disabled="true" className={cn(base, "cursor-not-allowed text-text-soft/60")}>
        <Icon className="h-4 w-4" aria-hidden />
        <span className="flex-1">{item.label}</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        base,
        active ? "bg-surface text-headline shadow-sm" : "text-body hover:bg-hover hover:text-headline",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className="flex-1">{item.label}</span>
      {item.legacy && (
        <ArrowUpRight className="h-3.5 w-3.5 text-text-soft" aria-label="Abre el panel clásico" />
      )}
    </Link>
  );
}

function NavGroup({
  title,
  items,
  pathname,
  permissions,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  permissions: Record<string, string | null>;
}) {
  const visible = items.filter((item) => permissions[item.section]);
  if (visible.length === 0) return null;

  return (
    <div className="mt-5 flex flex-col gap-0.5">
      <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-text-soft">
        {title}
      </p>
      {visible.map((item) => (
        <NavRow
          key={item.href}
          item={item}
          active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
        />
      ))}
    </div>
  );
}

export function Sidebar({ me }: { me: Me }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border-soft bg-bg-deep px-3 py-4">
      <Link href="/dashboard" className="mb-6 flex items-center gap-3 px-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-wordmark.svg" alt="SolversHub" className="h-6 w-auto" />
      </Link>

      <nav aria-label="Secciones del panel" className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {CORE_NAV.filter((item) => me.permissions?.[item.section]).map((item) => (
          <NavRow
            key={item.href}
            item={item}
            active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
          />
        ))}

        <NavGroup title="Herramientas" items={TOOLS_NAV} pathname={pathname} permissions={me.permissions} />
        <NavGroup title="Packs" items={PACKS_NAV} pathname={pathname} permissions={me.permissions} />
      </nav>

      <div className="mt-4 px-3 pt-2 text-xs text-text-soft">SolversHub · un producto de Roshi</div>
    </aside>
  );
}
