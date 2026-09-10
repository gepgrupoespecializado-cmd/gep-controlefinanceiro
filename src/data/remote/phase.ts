/**
 * Fases de armazenamento (Etapa 03).
 *
 * A  = leitura pelo bloco JSON (`app_data.payload`), espelho nas tabelas.
 * B  = leitura pelas tabelas, com gravação nos dois lugares (dual-write).
 * C  = leitura pelas tabelas; o bloco JSON deixa de receber novas gravações e
 *      permanece congelado como último backup (nada é apagado).
 *
 * A passagem de B para C é explícita e condicionada: só acontece quando todas
 * as pré-condições foram comprovadas na própria sessão. O caminho de volta
 * (C -> B) reativa a gravação dupla sem perder nada.
 */
import { supabase } from "@/integrations/supabase/client";

export type Fase = "A" | "B" | "C";

export function normalizarFase(v: unknown): Fase {
  return v === "B" || v === "C" ? v : "A";
}

/** Condições comprovadas nesta sessão para a virada B -> C. */
export type CondicoesFaseC = {
  /** Versão registrada hoje para a empresa. */
  fase: Fase;
  /** A reconstrução a partir das tabelas foi concluída sem erro. */
  leituraRelacionalOk: boolean;
  /** Comparação tabelas x bloco JSON sem divergências críticas. */
  semDivergencias: boolean;
  /** A sessão atual está realmente lendo das tabelas. */
  sessaoRealRelacional: boolean;
  /** Uma gravação nos dois destinos foi concluída com sucesso durante B. */
  dualWriteValidado: boolean;
};

export type AvaliacaoFaseC = { permitido: boolean; motivos: string[] };

/** Decisão pura: nada é gravado aqui. */
export function avaliarFaseC(c: CondicoesFaseC): AvaliacaoFaseC {
  const motivos: string[] = [];
  if (c.fase !== "B") motivos.push("empresa ainda não está na fase B");
  if (!c.leituraRelacionalOk) motivos.push("leitura pelas tabelas não foi concluída");
  if (!c.semDivergencias) motivos.push("tabelas e bloco de segurança ainda divergem");
  if (!c.sessaoRealRelacional) motivos.push("nenhuma sessão real carregou pelas tabelas");
  if (!c.dualWriteValidado) motivos.push("gravação dupla ainda não foi validada");
  return { permitido: motivos.length === 0, motivos };
}

async function gravarFase(org: string, fase: Fase) {
  const { error } = await supabase
    .from("organization_settings")
    .update({ data_version: fase })
    .eq("organization_id", org);
  return error ? error.message : null;
}

/**
 * Promove a empresa para a fase C quando todas as condições estiverem
 * comprovadas. Caso contrário mantém B e devolve os motivos.
 */
export async function promoverParaC(
  org: string,
  cond: CondicoesFaseC,
): Promise<{ promovido: boolean; motivos: string[] }> {
  const avaliacao = avaliarFaseC(cond);
  if (!avaliacao.permitido) return { promovido: false, motivos: avaliacao.motivos };
  const erro = await gravarFase(org, "C");
  if (erro) return { promovido: false, motivos: [erro] };
  return { promovido: true, motivos: [] };
}

/** Volta para B e reativa a gravação dupla. Nenhum dado é apagado. */
export async function reverterParaB(org: string): Promise<{ revertido: boolean; motivo?: string }> {
  const erro = await gravarFase(org, "B");
  return erro ? { revertido: false, motivo: erro } : { revertido: true };
}
