import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";
import { CLAVE_VALIDA, puedeEscribirOpciones } from "@/lib/plantillas-opciones";
import { ChatPrueba } from "./_components/chat-prueba";

export const metadata = { title: "Probar asistente" };

export default async function AsistentePage({ searchParams }: { searchParams: Promise<{ plantilla?: string | string[] }> }) {
  const { plantilla } = await searchParams;
  const inicial = typeof plantilla === "string" && CLAVE_VALIDA.test(plantilla) ? plantilla : undefined;
  // «Probar plantilla con opciones» ejecuta tools de verdad: solo para quien puede escribir (dueño o master), como el editor.
  const me = await apiFetch<Me>("/admin/me");
  const puedeProbarOpciones = me.ok && puedeEscribirOpciones(me.data);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Probar asistente"
        description="Escribe como un cliente y mira cómo responde tu asistente. No se envía nada ni cuenta en tus métricas. Para probar un agente en una conexión, usa «Probar» en su ficha."
      />
      <ChatPrueba probarOpciones={puedeProbarOpciones ? { plantillaInicial: inicial } : undefined} />
    </div>
  );
}
