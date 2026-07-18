"use client";

// Gerador de link de campanha: monta a URL com UTMs já normalizadas e
// encodadas — evita anúncio no ar com colchete duplamente escapado.

import { useState } from "react";

import { montarUrlCampanha } from "@/lib/campanha";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200";

function Campo({
  id,
  rotulo,
  valor,
  aoMudar,
  placeholder,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium text-slate-500"
      >
        {rotulo}
      </label>
      <input
        id={id}
        type="text"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

export function GeradorUtm({ enderecoBase }: { enderecoBase: string }) {
  const [base, setBase] = useState(enderecoBase);
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [copiado, setCopiado] = useState(false);

  const url = montarUrlCampanha(base, { source, medium, campaign });
  const preenchido = [source, medium, campaign].some((v) => v.trim());

  async function copiar() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-superficie p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
        Gerador de link de campanha
      </h3>
      <p className="mt-1 text-xs text-slate-400">
        Monte o link com UTMs pros anúncios e divulgações — o painel passa a
        atribuir as visitas e inscrições à campanha certa.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo
            id="utm-base"
            rotulo="Página de destino"
            valor={base}
            aoMudar={setBase}
          />
        </div>
        <Campo
          id="utm-source"
          rotulo="Fonte (utm_source) — de onde vem"
          valor={source}
          aoMudar={setSource}
          placeholder="instagram, whatsapp…"
        />
        <Campo
          id="utm-medium"
          rotulo="Meio (utm_medium) — que tipo de tráfego"
          valor={medium}
          aoMudar={setMedium}
          placeholder="paid_social, mensagem…"
        />
        <div className="sm:col-span-2">
          <Campo
            id="utm-campaign"
            rotulo="Campanha (utm_campaign) — qual ação"
            valor={campaign}
            aoMudar={setCampaign}
            placeholder="lancamento-julho"
          />
        </div>
      </div>

      {preenchido ? (
        url ? (
          <div className="mt-4 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
              {url}
            </code>
            <button
              type="button"
              onClick={copiar}
              className="shrink-0 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]"
            >
              {copiado ? "Copiado!" : "Copiar"}
            </button>
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            Endereço de destino inválido — confira a URL da página.
          </p>
        )
      ) : null}
    </section>
  );
}
