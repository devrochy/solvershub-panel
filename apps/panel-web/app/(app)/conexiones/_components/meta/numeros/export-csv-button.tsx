"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toCsv } from "@/lib/csv";
import { calidadNumeroLabel, estadoNumeroMetaLabel, verificacionNumeroLabel } from "@/lib/labels";

export type BusinessNumberRow = {
  waba_id: string;
  waba_name: string | null;
  is_connection_waba: boolean;
  phone_number_id: string;
  display_phone_number: string | null;
  verified_name: string | null;
  status: string | null;
  code_verification_status: string | null;
  platform_type: string | null;
  quality_rating: string | null;
  name_status: string | null;
  in_this_connection: boolean;
};

const COLUMNAS = [
  { header: "Cuenta de WhatsApp", value: (n: BusinessNumberRow) => n.waba_name ?? "" },
  { header: "WABA ID", value: (n: BusinessNumberRow) => n.waba_id },
  { header: "Número", value: (n: BusinessNumberRow) => n.display_phone_number ?? "" },
  { header: "Phone number ID", value: (n: BusinessNumberRow) => n.phone_number_id },
  { header: "Nombre verificado", value: (n: BusinessNumberRow) => n.verified_name ?? "" },
  { header: "Estado", value: (n: BusinessNumberRow) => estadoNumeroMetaLabel(n.status) },
  { header: "Verificación", value: (n: BusinessNumberRow) => verificacionNumeroLabel(n.code_verification_status) },
  { header: "Calidad", value: (n: BusinessNumberRow) => calidadNumeroLabel(n.quality_rating) },
  { header: "Plataforma", value: (n: BusinessNumberRow) => n.platform_type ?? "" },
  { header: "Cuenta de esta conexión", value: (n: BusinessNumberRow) => (n.is_connection_waba ? "Sí" : "No") },
  { header: "En esta conexión", value: (n: BusinessNumberRow) => (n.in_this_connection ? "Sí" : "No") },
];

/** Descarga los números del portafolio como CSV (se arma en el navegador con los datos ya cargados). */
export function ExportCsvButton({ rows }: { rows: BusinessNumberRow[] }) {
  function onExport() {
    const blob = new Blob([toCsv(rows, COLUMNAS)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `numeros-meta-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" onClick={onExport} disabled={rows.length === 0}>
      <Download className="h-4 w-4" aria-hidden />
      Exportar CSV
    </Button>
  );
}
