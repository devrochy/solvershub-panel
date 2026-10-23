import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { CuentaDeInstagram, EstadoInstagram } from "@/lib/instagram-alta";

import { InstagramAlta } from "./_components/instagram-alta";
import { InstagramCuentas } from "./_components/instagram-cuentas";
import { InstagramLogin } from "./_components/instagram-login";

export const metadata = { title: "Conectar Instagram" };

export default async function ConectarInstagramPage() {
  const [res, cuentasRes] = await Promise.all([
    apiFetch<EstadoInstagram>("/admin/meta/instagram"),
    apiFetch<{ accounts: CuentaDeInstagram[] }>("/admin/meta/instagram/accounts"),
  ]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar el alta de Instagram: {res.error}
      </p>
    );
  }
  const cuentas = cuentasRes.ok ? cuentasRes.data.accounts : [];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/conexiones">← Conexiones</Link>
        </Button>
      </div>
      <PageHeader
        title="Conectar Instagram"
        description="Conecta la cuenta profesional de Instagram de tu negocio para atender sus mensajes directos con tu asistente."
      />

      {!cuentasRes.ok && (
        <p role="alert" className="text-status-danger-fg">
          No se pudieron cargar tus cuentas de Instagram: {cuentasRes.error}
        </p>
      )}
      {cuentas.length > 0 && (
        <section aria-labelledby="titulo-cuentas" className="flex flex-col gap-3">
          <h2 id="titulo-cuentas" className="font-display text-base font-semibold text-headline">
            Tus cuentas
          </h2>
          <InstagramCuentas cuentas={cuentas} />
        </section>
      )}

      <section aria-labelledby="titulo-conectar" className="flex flex-col gap-4">
        <h2 id="titulo-conectar" className="font-display text-base font-semibold text-headline">
          {cuentas.length > 0 ? "Conectar otra cuenta" : "Conectar una cuenta"}
        </h2>
        {res.data.login_available ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-headline">Con Instagram</h3>
              <InstagramLogin />
            </div>
            <div className="flex flex-col gap-2 border-t border-border-soft pt-6">
              <h3 className="text-sm font-medium text-headline">Con la Página de Facebook vinculada</h3>
              <InstagramAlta estado={res.data} />
            </div>
          </div>
        ) : (
          <InstagramAlta estado={res.data} />
        )}
      </section>
    </div>
  );
}
