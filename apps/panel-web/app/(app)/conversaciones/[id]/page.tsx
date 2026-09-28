import Link from "next/link";
import { notFound } from "next/navigation";

import { ConversationActions } from "@/app/(app)/conversaciones/_components/conversation-actions";
import { MessageThread } from "@/app/(app)/conversaciones/_components/message-thread";
import { BinaryBadge, CONVERSATION_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/server";
import type { ConversationDetail } from "@/lib/api/types";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await apiFetch<ConversationDetail>(`/admin/conversations/${id}`);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return (
      <p role="alert" className="text-danger">
        No se pudo cargar la conversación: {res.error}
      </p>
    );
  }
  const conversation = res.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/conversaciones">← Volver</Link>
        </Button>
        <h1 className="font-display text-xl font-semibold text-headline">
          {conversation.customer_name ?? conversation.external_id ?? "Cliente"}
        </h1>
        <Badge variant="neutral">{conversation.channel}</Badge>
        <StatusBadge value={conversation.status} map={CONVERSATION_STATUS} />
        <BinaryBadge
          active={!conversation.bot_paused}
          activeLabel="Agente activo"
          inactiveLabel="Agente pausado"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
        </CardHeader>
        <CardContent>
          <ConversationActions
            conversationId={conversation.id}
            botPaused={conversation.bot_paused}
            status={conversation.status}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <MessageThread messages={conversation.messages} />
        </CardContent>
      </Card>
    </div>
  );
}
