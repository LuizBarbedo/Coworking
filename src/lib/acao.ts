// Estado padrão das server actions com feedback: sucesso com mensagem,
// erro com mensagem, ou undefined (ainda não submetido / redirect).

export type AcaoState = { ok: string } | { error: string } | undefined;
