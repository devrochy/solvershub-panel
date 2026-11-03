import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/_components/login-form";
import { TarjetaDeAcceso } from "@/components/domain/tarjeta-de-acceso";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";
import { destinoTrasLogin } from "@/lib/ruta-segura";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ volver?: string | string[] }> }) {
  // `volver`: la ruta del panel a la que se regresa al entrar (la Wiki manda aquí a quien no tiene sesión).
  const destino = destinoTrasLogin((await searchParams).volver);
  const res = await apiFetch<Me>("/admin/me");
  if (res.ok) redirect(destino);

  return (
    <TarjetaDeAcceso titulo="Inicia sesión">
      <LoginForm destino={destino} />
      <Link
        href="/recuperar"
        className="mt-6 block text-center text-sm font-medium text-link underline-offset-4 hover:underline"
      >
        ¿Olvidaste tu contraseña?
      </Link>
    </TarjetaDeAcceso>
  );
}
