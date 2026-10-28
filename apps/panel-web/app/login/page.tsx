import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/_components/login-form";
import { TarjetaDeAcceso } from "@/components/domain/tarjeta-de-acceso";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage() {
  const res = await apiFetch<Me>("/admin/me");
  if (res.ok) redirect("/dashboard");

  return (
    <TarjetaDeAcceso titulo="Inicia sesión">
      <LoginForm />
      <Link
        href="/recuperar"
        className="mt-6 block text-center text-sm font-medium text-link underline-offset-4 hover:underline"
      >
        ¿Olvidaste tu contraseña?
      </Link>
    </TarjetaDeAcceso>
  );
}
