import { notFound } from "next/navigation";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
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
    return <ErrorDeCarga titulo="No pudimos cargar los testers" detalle={res.error} />;
  }
  return <GestionDeTesters inicial={res.data} />;
}
