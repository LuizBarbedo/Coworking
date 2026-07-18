"use client";

// Abas do hub de administração: cada aba é uma rota; o layout monta a lista
// já filtrada pelas permissões da sessão. Client só pra destacar a ativa.

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AbaMaster = { href: string; rotulo: string };

export function NavMaster({ abas }: { abas: AbaMaster[] }) {
  const pathname = usePathname();
  if (abas.length < 2) return null;

  return (
    <nav
      aria-label="Áreas da administração"
      className="flex gap-1 overflow-x-auto border-b border-slate-200"
    >
      {abas.map((aba) => {
        // A home ("/master") só fica ativa em rota exata; as demais valem
        // pros filhos (ex.: /master/equipe/…).
        const ativo =
          aba.href === "/master"
            ? pathname === "/master" || pathname.startsWith("/master/modulos") || pathname.startsWith("/master/disciplinas")
            : pathname.startsWith(aba.href);
        return (
          <Link
            key={aba.href}
            href={aba.href}
            aria-current={ativo ? "page" : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              ativo
                ? "border-brand-600 text-brand-900 dark:text-brand-100"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {aba.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
