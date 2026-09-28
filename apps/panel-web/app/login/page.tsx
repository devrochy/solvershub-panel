import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login/_components/login-form";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage() {
  const res = await apiFetch<Me>("/admin/me");
  if (res.ok) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm rounded-lg border border-border-soft bg-surface p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-wordmark.svg" alt="SolversHub" className="mx-auto mb-2 h-7 w-auto" />
        <p className="mb-8 text-center text-sm text-body">Centro de soluciones</p>
        <LoginForm />
      </div>
    </main>
  );
}
