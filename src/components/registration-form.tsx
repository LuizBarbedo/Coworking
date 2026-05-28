"use client";

import { useState, useTransition } from "react";
import { registerInscription, type RegistrationPayload } from "@/app/actions";
import { maskCPF } from "@/lib/cpf";
import { maskPhone } from "@/lib/phone";

type FieldKey = keyof RegistrationPayload;

const initialValues: RegistrationPayload = {
  nome: "",
  cpf: "",
  email: "",
  telefone: "",
};

export function RegistrationForm() {
  const [values, setValues] = useState<RegistrationPayload>(initialValues);
  const [fieldError, setFieldError] = useState<{ field?: FieldKey; message: string } | null>(null);
  const [success, setSuccess] = useState(false);
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
    setSuccess(false);

    startTransition(async () => {
      const result = await registerInscription(values);
      if (result.ok) {
        setSuccess(true);
        setValues(initialValues);
        return;
      }
      setFieldError({ field: result.field, message: result.error });
    });
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-brand-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-brand-900">
          Inscrição recebida!
        </h2>
        <p className="mt-3 text-brand-800/80">
          Em breve você receberá no seu e-mail os próximos passos para acessar
          os cursos.
        </p>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="mt-6 text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
        >
          Fazer outra inscrição
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-2xl border border-brand-100 bg-white p-6 shadow-sm sm:p-8"
    >
      <h2 className="text-xl font-semibold text-brand-900 sm:text-2xl">
        Faça sua inscrição
      </h2>
      <p className="mt-1 text-sm text-brand-800/70">
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
        className="mt-7 inline-flex w-full items-center justify-center rounded-lg bg-brand-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Enviando..." : "Quero me inscrever"}
      </button>

      <p className="mt-4 text-center text-xs text-brand-800/60">
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
        className="mb-1.5 block text-sm font-medium text-brand-900"
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
        className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-brand-900 placeholder:text-brand-900/30 focus:outline-none focus:ring-2 ${
          error
            ? "border-red-400 focus:ring-red-200"
            : "border-brand-100 focus:border-brand-500 focus:ring-brand-200"
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
