import { describe, expect, it } from "vitest";

import { urlAvatarPropio } from "./avatar-version";

describe("avatar propio", () => {
  it("usa la preview recién subida y, si no, el BFF con cache-busting", () => {
    expect(urlAvatarPropio(null, { version: 0, preview: null })).toBeNull();
    expect(urlAvatarPropio("avatares/x.png", { version: 3, preview: null })).toBe("/api/perfil/avatar?v=3");
    expect(urlAvatarPropio("avatares/x.png", { version: 0, preview: "blob:foto" })).toBe("blob:foto");
    expect(urlAvatarPropio(null, { version: 0, preview: "blob:foto" })).toBe("blob:foto");
  });
});
