import { ChevronDown } from "lucide-react";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { CuentaDeInstagram, EstadoInstagram } from "@/lib/instagram-alta";

import { InstagramAlta } from "./_components/instagram-alta";
import { InstagramCuentas } from "./_components/instagram-cuentas";
import { InstagramLogin } from "./_components/instagram-login";

export const metadata = { title: "Conectar Instagram" };

/**
 * Alta de Instagram (CON-16): las cuentas ya conectadas arriba; para conectar otra, el inicio de
 * sesión con Instagram primero y la Página de Facebook vinculada plegada debajo.
 */
export default async function ConectarInstagramPage() {
  const [res, cuentasRes] = await Promise.all([
    apiFetch<EstadoInstagram>("/admin/meta/instagram"),
    apiFetch<{ accounts: CuentaDeInstagram[] }>("/admin/meta/instagram/accounts"),
  ]);
  if (!res.ok) {
    return <ErrorDeCarga titulo="No se pudo preparar la conexión de Instagram" detalle={res.error} />;
  }
  const cuentas = cuentasRes.ok ? cuentasRes.data.accounts : [];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Conectar Instagram"
        description="Conecta la cuenta profesional de Instagram de tu negocio para que tu agente responda sus mensajes directos."
      />

      {!cuentasRes.ok && <ErrorDeCarga titulo="No se pudieron cargar tus cuentas de Instagram" detalle={cuentasRes.error} />}
      {cuentas.length > 0 && (
        <section aria-labelledby="titulo-cuentas" className="flex flex-col gap-3">
          <h2 id="titulo-cuentas" className="font-display text-sh-block text-headline">
            Tus cuentas
          </h2>
          <InstagramCuentas cuentas={cuentas} />
        </section>
      )}

      <section aria-labelledby="titulo-conectar" className="flex flex-col gap-4">
        <h2 id="titulo-conectar" className="font-display text-sh-block text-headline">
          {cuentas.length > 0 ? "Conectar otra cuenta" : "Conectar una cuenta"}
        </h2>
        {res.data.login_available ? (
          <>
            <InstagramLogin />
            <details className="group rounded-lg border border-border-soft bg-surface">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-5 py-3">
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-headline">Con la Página de Facebook vinculada</span>
                  <span className="text-xs text-text-soft">Si tu cuenta de Instagram está unida a una Página de Facebook.</span>
                </span>
                <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-text-soft transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-border-soft px-5 py-5">
                <InstagramAlta estado={res.data} />
              </div>
            </details>
          </>
        ) : (
          <InstagramAlta estado={res.data} />
        )}
      </section>
    </div>
  );
}
