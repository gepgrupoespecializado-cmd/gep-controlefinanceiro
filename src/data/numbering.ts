/**
 * Numeração de orçamentos e relatórios por empresa (Etapa 02).
 *
 * O número é resolvido no banco pela função `next_number`, que incrementa o
 * contador da empresa de forma atômica. Como as telas gravam de forma
 * síncrona, mantemos um pequeno lote reservado em memória: cada gravação
 * consome um número já reservado e o lote é reabastecido em segundo plano.
 * Sem conexão ou sem empresa ativa, o contador local continua valendo.
 */
import { supabase } from "@/integrations/supabase/client";

import type { SyncScope } from "./cloud-sync";

export type NumeroTipo = "orcamento" | "relatorio";

const pool: Record<NumeroTipo, number[]> = { orcamento: [], relatorio: [] };
const carregando: Record<NumeroTipo, boolean> = { orcamento: false, relatorio: false };
let ativo = false;
let generation = 0;
let activeScope: SyncScope | null = null;

const TAMANHO_LOTE = 2;

async function reservar(
  tipo: NumeroTipo,
  scope: SyncScope,
): Promise<number | null> {
  scope.assertCurrent();
  const { data, error } = await supabase
    .rpc("next_number", { _tipo: tipo })
    .abortSignal(scope.signal);
  scope.assertCurrent();
  if (error || typeof data !== "number") return null;
  return data;
}

async function abastecer(tipo: NumeroTipo) {
  const scope = activeScope;
  const started = generation;
  const valid = () => ativo && started === generation && !!scope?.isCurrent();
  if (!scope || !valid() || carregando[tipo]) return;
  carregando[tipo] = true;
  try {
    while (valid() && pool[tipo].length < TAMANHO_LOTE) {
      const n = await reservar(tipo, scope);
      if (!valid()) return;
      if (n === null) break;
      pool[tipo].push(n);
    }
  } catch (error) {
    if (valid()) console.warn("Falha ao reservar numeração.", error);
  } finally {
    if (valid()) carregando[tipo] = false;
  }
}

/** Consome um número já reservado; devolve null quando não há reserva. */
export function proximoNumero(tipo: NumeroTipo): number | null {
  if (!ativo || !activeScope?.isCurrent()) return null;
  const n = pool[tipo].shift() ?? null;
  void abastecer(tipo);
  return n;
}

/**
 * Liga a numeração remota para a empresa ativa, garantindo que o contador do
 * banco nunca fique atrás dos números já usados neste dispositivo.
 */
export async function iniciarNumeracao(
  base: { orcamento: number; relatorio: number },
  scope: SyncScope,
) {
  scope.assertCurrent();
  pararNumeracao();
  const started = generation;
  activeScope = scope;
  ativo = true;
  pool.orcamento = [];
  pool.relatorio = [];
  await Promise.all([
    supabase
      .rpc("seed_counter", {
        _tipo: "orcamento",
        _proximo: Math.max(base.orcamento, 1),
      })
      .abortSignal(scope.signal),
    supabase
      .rpc("seed_counter", {
        _tipo: "relatorio",
        _proximo: Math.max(base.relatorio, 1),
      })
      .abortSignal(scope.signal),
  ]);
  scope.assertCurrent();
  if (started !== generation) return;
  await Promise.all([abastecer("orcamento"), abastecer("relatorio")]);
  scope.assertCurrent();
}

export function pararNumeracao() {
  generation++;
  activeScope = null;
  carregando.orcamento = false;
  carregando.relatorio = false;
  ativo = false;
  pool.orcamento = [];
  pool.relatorio = [];
}
