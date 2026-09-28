import { cookies } from "next/headers";

import { LogoutButton } from "@/components/shell/logout-button";
import { TenantSwitcher } from "@/components/shell/tenant-switcher";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import type { Me } from "@/lib/api/types";
import { THEME_COOKIE, normalizeTheme } from "@/lib/theme";

export async function Topbar({ me }: { me: Me }) {
  const store = await cookies();
  const theme = normalizeTheme(store.get(THEME_COOKIE)?.value);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border-soft bg-surface px-6">
      <TenantSwitcher current={me.tenant} count={me.tenant_count} />
      <div className="flex items-center gap-3">
        <span className="text-sm text-body">{me.username ?? me.email}</span>
        <ThemeToggle initialTheme={theme} />
        <LogoutButton />
      </div>
    </header>
  );
}
