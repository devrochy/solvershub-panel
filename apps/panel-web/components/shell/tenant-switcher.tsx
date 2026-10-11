"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { TenantOption } from "@/lib/api/types";

export function TenantSwitcher({
  current,
  count,
}: {
  current: TenantOption | null;
  count: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(value: string) {
    setQuery(value);
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants?q=${encodeURIComponent(value)}`);
      const json = (await res.json().catch(() => null)) as { items?: TenantOption[] } | null;
      setResults(json?.items ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function choose(id: string) {
    setOpen(false);
    await fetch("/api/tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: id }),
    });
    router.refresh();
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void search("");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md border border-border-strong px-3 py-1.5 text-sm text-headline hover:bg-surface-raised"
      >
        <span className="max-w-[9rem] truncate sm:max-w-[18rem]">{current?.name ?? "Selecciona negocio"}</span>
        <Badge variant="neutral">{count}</Badge>
        <ChevronsUpDown className="h-4 w-4 text-body" aria-hidden />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-md border border-border bg-surface p-2 shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => void search(e.target.value)}
            placeholder="Buscar negocio…"
            aria-label="Buscar negocio"
            className="mb-2 h-9 w-full rounded-md border border-border-strong bg-bg-deep px-3 text-sm text-headline"
          />
          <ul role="listbox" className="max-h-72 overflow-auto">
            {loading && <li className="px-2 py-1.5 text-sm text-body">Buscando…</li>}
            {!loading && results.length === 0 && (
              <li className="px-2 py-1.5 text-sm text-body">Sin resultados.</li>
            )}
            {results.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={t.active}
                  onClick={() => void choose(t.id)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm text-body hover:bg-surface-raised hover:text-headline"
                >
                  <span className="truncate">{t.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-body/60">{t.role}</span>
                    {t.active && <Check className="h-4 w-4 text-link" aria-hidden />}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
