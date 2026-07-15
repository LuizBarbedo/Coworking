"use client";

import { useEffect } from "react";

import { registrarVisita } from "@/app/actions";
import { extrairOrigem } from "@/lib/origem";

// Marca a sessão de navegação pra contar cada visitante uma vez só,
// mesmo com recarregamentos (e com o efeito duplo do strict mode).
const CHAVE_VISITA = "csmg-visita-registrada";

/** Conta a visita à landing (anônima, uma por sessão). Não renderiza nada. */
export function RegistroVisita() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(CHAVE_VISITA)) return;
      sessionStorage.setItem(CHAVE_VISITA, "1");
    } catch {
      // sem sessionStorage (modo privado): conta mesmo assim
    }
    void registrarVisita(
      extrairOrigem(
        new URLSearchParams(window.location.search),
        document.referrer,
        window.location.hostname,
      ),
    );
  }, []);

  return null;
}
