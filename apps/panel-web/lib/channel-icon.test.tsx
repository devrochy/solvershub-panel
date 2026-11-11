// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { ChannelIcon, channelMeta } from "@/components/domain/channel-icon";

afterEach(cleanup);

describe("icono de canal «bounded y desvanecido» (ACP-13)", () => {
  it("las redes llevan su logo oficial y todos van en el tono de la marca", () => {
    for (const id of ["whatsapp", "whatsapp_waweb", "instagram_meta", "messenger"]) {
      const { container, unmount } = render(<ChannelIcon id={id} />);
      const caja = container.firstElementChild as HTMLElement;
      expect(caja.className).toMatch(/bg-link\/14/);
      expect(caja.className).toMatch(/border-link\/30/);
      expect(caja.className).toMatch(/text-link/);
      // El logo oficial es un solo trazo relleno (Simple Icons), no un icono de línea.
      expect(caja.querySelector("svg")?.getAttribute("fill")).toBe("currentColor");
      unmount();
    }
  });

  it("los canales sin marca usan un icono genérico y conservan su nombre", () => {
    const { container } = render(<ChannelIcon id="webchat" size="lg" />);
    expect((container.firstElementChild as HTMLElement).getAttribute("title")).toBe("Chat web");
    expect(container.querySelector("svg")?.getAttribute("fill")).not.toBe("currentColor");
    expect(channelMeta("desconocido").label).toBe("desconocido");
  });
});
