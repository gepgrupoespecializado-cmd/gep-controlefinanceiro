/**
 * Contexto de empresa ativa (Etapa 01).
 *
 * Hoje o sistema é monoempresa e local: sempre devolve o mesmo identificador.
 * Os contratos de repositório já recebem esse valor para que a Etapa 02 possa
 * trocar esta função pela conta autenticada sem mexer em telas ou regras.
 */

export const EMPRESA_LOCAL_ID = "local";

export function getEmpresaAtivaId(): string {
  return EMPRESA_LOCAL_ID;
}
