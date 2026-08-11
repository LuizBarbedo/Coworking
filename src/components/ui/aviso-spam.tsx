// Aviso pra quem está esperando um e-mail da plataforma: cair no spam é o
// principal motivo de inscrito "sem e-mail" — o acesso inteiro depende dele.
export function AvisoSpam({ titulo }: { titulo: string }) {
  return (
    <div className="rounded-xl border border-ambar-400/40 bg-ambar-100/50 p-4 text-sm text-slate-700 dark:border-brand-700 dark:bg-brand-900/40">
      <p className="font-semibold">{titulo}</p>
      <p className="mt-1">
        Procure por <strong>&ldquo;Coworking Social&rdquo;</strong> na caixa de{" "}
        <strong>spam</strong> (ou na aba Promoções). Se encontrar, marque como{" "}
        <strong>&ldquo;não é spam&rdquo;</strong> pra os próximos avisos
        chegarem na sua caixa de entrada.
      </p>
    </div>
  );
}
