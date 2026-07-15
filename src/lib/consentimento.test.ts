import { describe, expect, it } from "vitest";

import { interpretarConsentimento } from "./consentimento";

describe("interpretarConsentimento", () => {
  it("aceita as duas escolhas válidas", () => {
    expect(interpretarConsentimento("total")).toBe("total");
    expect(interpretarConsentimento("essencial")).toBe("essencial");
  });

  it("devolve nulo pra qualquer outro valor (sem decisão)", () => {
    expect(interpretarConsentimento(null)).toBe(null);
    expect(interpretarConsentimento(undefined)).toBe(null);
    expect(interpretarConsentimento("")).toBe(null);
    expect(interpretarConsentimento("sim")).toBe(null);
    expect(interpretarConsentimento(42)).toBe(null);
  });
});
