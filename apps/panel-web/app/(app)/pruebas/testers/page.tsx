import { notFound } from "next/navigation";

import { apiFetch } from "@/lib/api/server";
import type { Me, QaTestersOut } from "@/lib/api/types";

import { GestionDeTesters } from "../_components/testers";

export const metadata = { title: "Testers" };

/** Pruebas › Testers (HU-QA-04): invitar, reinvitar y revocar testers. Solo el master. */
export default async function TestersPage() {
  const me = await apiFetch<Me>("/admin/me");
  if (!me.ok || me.data.role !== "master") notFound();
  const res = await apiFetch<QaTestersOut>("/admin/qa/testers");
  if (!res.ok) {
    return <p role="alert" className="text-status-danger-fg">No se pudieron cargar los testers: {res.error}</p>;
  }
  return <GestionDeTesters inicial={res.data} />;
}
