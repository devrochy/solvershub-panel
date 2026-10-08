import { describe, expect, it } from "vitest";

import { clientIpHeaders } from "./client-ip";

describe("clientIpHeaders", () => {
  it("reenvía la cadena de X-Forwarded-For y CF-Connecting-IP tal cual", () => {
    const h = new Headers({
      "x-forwarded-for": "181.1.2.3, 172.18.0.4",
      "cf-connecting-ip": "181.1.2.3",
    });
    expect(clientIpHeaders(h)).toEqual({
      "X-Forwarded-For": "181.1.2.3, 172.18.0.4",
      "CF-Connecting-IP": "181.1.2.3",
    });
  });

  it("no inventa cabeceras si no llegaron", () => {
    expect(clientIpHeaders(new Headers())).toEqual({});
    expect(clientIpHeaders(new Headers({ "x-forwarded-for": "  " }))).toEqual({});
  });
});
