import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const res = await apiFetch<Me>("/admin/me");
  if (!res.ok) redirect("/login");
  const me = res.data;

  return (
    <div className="flex min-h-screen">
      <Sidebar me={me} />
      <div className="flex flex-1 flex-col">
        <Topbar me={me} />
        <main className="flex-1 px-6 py-8">
          <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
