import Image from "next/image";

/**
 * Faixa de patrocinadores/realização exibida nas plataformas de inscrição e de
 * ensino. A ordem segue o material de referência (logo marca/Ordem.jpeg):
 * 1ª linha — Prefeitura do Rio · Integração Metropolitana · integra.Rio
 * 2ª linha — Oroborus Consplan · IVIG (COPPE/UFRJ) · Fundação I²G
 */
export function Patrocinadores() {
  return (
    <section className="border-t border-brand-100 bg-superficie dark:border-slate-200">
      {/* Logomarcas institucionais pedem fundo claro: no tema escuro a faixa
          vira um cartão branco deliberado, não um vazamento de tema. */}
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-8 dark:rounded-2xl dark:bg-white dark:my-6 dark:max-w-4xl dark:px-8">
        {/* 1ª linha: banner oficial "Patrocínio" (Prefeitura · Integração · integra.Rio) */}
        <Image
          src="/patrocinadores/01-prefeitura-integra.jpeg"
          alt="Patrocínio: Prefeitura do Rio · Integração Metropolitana · integra.Rio"
          width={1206}
          height={173}
          className="h-auto w-full max-w-3xl"
        />

        {/* 2ª linha: demais logomarcas */}
        <ul className="flex w-full max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-6">
          <li>
            <Image
              src="/patrocinadores/02-oroborus-consplan.jpeg"
              alt="Oroborus Consplan"
              width={328}
              height={184}
              className="h-9 w-auto rounded-md object-contain"
            />
          </li>
          <li>
            <Image
              src="/patrocinadores/03-ivig.jpeg"
              alt="Instituto Virtual Internacional de Mudanças Globais (IVIG) — COPPE/UFRJ"
              width={1600}
              height={1251}
              className="h-12 w-auto object-contain"
            />
          </li>
          <li>
            <Image
              src="/patrocinadores/04-fundacao-i2g.jpeg"
              alt="Fundação Interdisciplinar Virtual de Inovação e Mudanças Globais (Fundação I²G)"
              width={1280}
              height={583}
              className="h-11 w-auto object-contain"
            />
          </li>
        </ul>
      </div>
    </section>
  );
}
