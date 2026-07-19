"use client";

import { useEffect, useState, useTransition } from "react";
import { registerInscription, type RegistrationPayload } from "@/app/actions";
import { maskCPF } from "@/lib/cpf";
import { maskPhone } from "@/lib/phone";
import { extrairOrigem, type Origem } from "@/lib/origem";
import { RodaSpinner } from "@/components/marca/roda-spinner";

type FieldKey = keyof RegistrationPayload;

const initialValues: RegistrationPayload = {
  nome: "",
  cpf: "",
  email: "",
  telefone: "",
};

// Guarda a origem na sessão: quem chega pelo anúncio e navega antes de
// preencher o formulário não perde as UTMs da URL.
const CHAVE_ORIGEM = "csmg-origem";

function capturarOrigem(): Origem {
  const daUrl = extrairOrigem(
    new URLSearchParams(window.location.search),
    document.referrer,
    window.location.hostname,
  );
  try {
    if (daUrl.source || daUrl.medium || daUrl.campaign) {
      sessionStorage.setItem(CHAVE_ORIGEM, JSON.stringify(daUrl));
      return daUrl;
    }
    const salva = sessionStorage.getItem(CHAVE_ORIGEM);
    if (salva) return JSON.parse(salva) as Origem;
  } catch {
    // sessionStorage indisponível (modo privado etc.) — segue sem persistir
  }
  return daUrl;
}

export function RegistrationForm() {
  const [values, setValues] = useState<RegistrationPayload>(initialValues);

  // Persiste as UTMs assim que a página abre; a leitura acontece no submit.
  useEffect(() => {
    capturarOrigem();
  }, []);
  const [fieldError, setFieldError] = useState<{ field?: FieldKey; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const update = (field: FieldKey, raw: string) => {
    let value = raw;
    if (field === "cpf") value = maskCPF(raw);
    if (field === "telefone") value = maskPhone(raw);
    setValues((prev) => ({ ...prev, [field]: value }));
    if (fieldError?.field === field) setFieldError(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldError(null);

    startTransition(async () => {
      const result = await registerInscription({
        ...values,
        origem: capturarOrigem(),
      });
      if (result.ok) {
        // Página de destino dedicada: o Google Ads (e um futuro pixel da
        // Meta) conta a conversão pelo carregamento da URL. Navegação de
        // página cheia DE PROPÓSITO — garante o page_view da tag; a
        // matrícula vai por sessionStorage, nunca pela URL.
        try {
          sessionStorage.setItem("csmg-matricula", result.matricula);
        } catch {
          // sem storage, a página mostra a mensagem genérica (vai por e-mail)
        }
        window.location.assign("/inscricao-realizada");
        return;
      }
      setFieldError({ field: result.field, message: result.error });
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-brand-100 bg-superficie p-6 shadow-sm dark:border-brand-800 sm:p-8"
    >
      <h2 className="font-display text-xl font-bold tracking-tight text-brand-900 dark:text-brand-100 sm:text-2xl">
        Faça sua inscrição
      </h2>
      <p className="mt-1 text-sm text-brand-800/70 dark:text-brand-100/70">
        Preencha seus dados para garantir acesso gratuito à plataforma.
      </p>

      <div className="mt-6 grid gap-5">
        <Field
          id="nome"
          label="Nome completo"
          autoComplete="name"
          value={values.nome}
          onChange={(v) => update("nome", v)}
          error={fieldError?.field === "nome" ? fieldError.message : undefined}
        />
        <Field
          id="cpf"
          label="CPF"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          value={values.cpf}
          onChange={(v) => update("cpf", v)}
          error={fieldError?.field === "cpf" ? fieldError.message : undefined}
        />
        <Field
          id="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          value={values.email}
          onChange={(v) => update("email", v)}
          error={fieldError?.field === "email" ? fieldError.message : undefined}
        />
        <Field
          id="telefone"
          label="Telefone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(00) 00000-0000"
          value={values.telefone}
          onChange={(v) => update("telefone", v)}
          error={fieldError?.field === "telefone" ? fieldError.message : undefined}
        />
      </div>

      {fieldError && !fieldError.field && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {fieldError.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-600 dark:hover:bg-brand-500"
      >
        {isPending ? (
          <>
            <RodaSpinner className="h-4 w-4" />
            Enviando…
          </>
        ) : (
          "Quero me inscrever"
        )}
      </button>

      <p className="mt-4 text-center text-xs text-brand-800/60 dark:text-brand-100/60">
        Seus dados são tratados conforme a LGPD.
      </p>
    </form>
  );
}

type FieldProps = {
  id: FieldKey;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  error?: string;
};

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  error,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-brand-900 dark:text-brand-100"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded-lg border bg-superficie px-3.5 py-2.5 text-sm text-brand-900 transition placeholder:text-brand-900/30 focus:outline-none focus:ring-2 dark:text-brand-100 dark:placeholder:text-brand-100/30 ${
          error
            ? "border-red-400 focus:ring-red-200"
            : "border-brand-100 focus:border-brand-500 focus:ring-brand-200 dark:border-brand-700"
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
