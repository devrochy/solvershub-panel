// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { MessageThread } from "@/app/(app)/conversaciones/_components/message-thread";
import type { MessageItem } from "@/lib/api/types";

function mensaje(overrides: Partial<MessageItem>): MessageItem {
  return {
    id: "m-1",
    direction: "inbound",
    sender_type: "customer",
    content: "",
    status: "sent",
    created_at: "2026-11-14T15:00:00Z",
    ...overrides,
  };
}

afterEach(cleanup);

describe("hilo de conversaciones con multimedia", () => {
  it("muestra el reproductor y la transcripción de un audio entrante", () => {
    render(
      <MessageThread
        messages={[
          mensaje({
            media_type: "audio/ogg",
            media_url: "https://api/files/audio.ogg",
            media_transcription: "hola, busco un casco",
            content: "[Nota de voz]",
          }),
        ]}
      />,
    );

    expect(screen.getByLabelText("Nota de voz del cliente")).toBeTruthy();
    expect(screen.getByText("hola, busco un casco")).toBeTruthy();
    expect(screen.queryByText("[Nota de voz]")).toBeNull();
  });

  it("una nota de voz saliente ofrece su transcripción plegada", () => {
    render(
      <MessageThread
        messages={[
          mensaje({
            direction: "outbound",
            sender_type: "agent",
            media_type: "audio/ogg",
            media_url: "https://api/files/respuesta.ogg",
            media_transcription: "respuesta en voz",
          }),
        ]}
      />,
    );

    expect(screen.getByLabelText("Nota de voz del agente")).toBeTruthy();
    expect(screen.getByText("Ver transcripción")).toBeTruthy();
    expect(screen.getByText("respuesta en voz")).toBeTruthy();
  });

  it("muestra la imagen con su descripción accesible", () => {
    render(
      <MessageThread
        messages={[
          mensaje({
            media_type: "image/jpeg",
            media_url: "https://api/files/foto.jpg",
            media_transcription: "casco integral negro",
            content: "[Imagen]",
          }),
        ]}
      />,
    );

    const imagen = screen.getByRole("img", { name: "Imagen: casco integral negro" });
    expect(imagen.getAttribute("src")).toBe("https://api/files/foto.jpg");
  });

  it("indica cuando la nota de voz todavía se está preparando", () => {
    render(
      <MessageThread
        messages={[
          mensaje({
            direction: "outbound",
            sender_type: "agent",
            media_type: "audio/tts",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Preparando nota de voz…")).toBeTruthy();
  });
});
