import { describe, expect, it } from "vitest";

import { LIMITE_POR_HORA, podePostar } from "./rate-limit";

describe("podePostar", () => {
  it("libera abaixo do limite", () => {
    expect(podePostar(0)).toBe(true);
    expect(podePostar(LIMITE_POR_HORA - 1)).toBe(true);
  });

  it("bloqueia no limite e acima", () => {
    expect(podePostar(LIMITE_POR_HORA)).toBe(false);
    expect(podePostar(LIMITE_POR_HORA + 3)).toBe(false);
  });
});
