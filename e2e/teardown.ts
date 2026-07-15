import { limparDadosDeTeste } from "./helpers/dados";

// Teardown global: remove tudo que a suíte criou no banco (contas e
// inscrições e2e-*@example.com, visitas utm_source=e2e). Os números do
// painel /relatorios voltam ao que eram antes da rodada.
export default async function teardown(): Promise<void> {
  await limparDadosDeTeste();
}
