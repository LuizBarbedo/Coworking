import { afterEach, describe, expect, it, vi } from "vitest";
import { dispararEventoMeta } from "./meta-pixel";

type ComFbq = typeof globalThis & { fbq?: unknown };

afterEach(() => {
  delete (globalThis as ComFbq).fbq;
});

describe("dispararEventoMeta", () => {
  it("chama o fbq com o evento quando o pixel está carregado", () => {
    const fbq = vi.fn();
    (globalThis as ComFbq).fbq = fbq;

    dispararEventoMeta("CompleteRegistration");

    expect(fbq).toHaveBeenCalledWith("track", "CompleteRegistration");
  });

  it("não quebra quando o pixel não carregou", () => {
    expect(() => dispararEventoMeta("CompleteRegistration")).not.toThrow();
  });

  it("não propaga erro do pixel", () => {
    (globalThis as ComFbq).fbq = () => {
      throw new Error("bloqueado por extensão");
    };

    expect(() => dispararEventoMeta("CompleteRegistration")).not.toThrow();
  });
});
