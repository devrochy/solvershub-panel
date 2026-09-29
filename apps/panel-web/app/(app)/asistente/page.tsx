import { PageHeader } from "@/components/ui/page-header";
import { ChatPrueba } from "./_components/chat-prueba";

export const metadata = { title: "Probar asistente" };

export default function AsistentePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Probar asistente"
        description="Playground: el mismo runtime del asistente, sin canal. No envía mensajes ni consume métricas."
      />
      <ChatPrueba />
    </div>
  );
}
