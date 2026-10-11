import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import { notFound } from "next/navigation";

import { ConversationActions } from "@/app/(app)/conversaciones/_components/conversation-actions";
import { MessageThread } from "@/app/(app)/conversaciones/_components/message-thread";
import { RefreshButton } from "@/app/(app)/conversaciones/_components/refresh-button";
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
      <p role="alert" className="text-status-danger-fg">
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
        <div className="ml-auto">
          <RefreshButton />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
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

        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ficha del cliente</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-0 text-sm">
              <p className="text-body">
                Cliente:{" "}
                <span className="text-headline">
                  {conversation.customer_name ?? "—"}
                </span>
              </p>
              <p className="text-body">
                Identificador:{" "}
                <span className="font-mono text-xs text-headline">
                  {conversation.external_id ?? "—"}
                </span>
              </p>
              <p className="text-body">
                Canal: <Badge variant="neutral">{conversation.channel}</Badge>
              </p>
              <p className="text-body">
                Estado: <StatusBadge value={conversation.status} map={CONVERSATION_STATUS} />
              </p>
              <p className="text-body">
                Iniciada: <span className="text-headline">{formatDateTime(conversation.started_at)}</span>
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
