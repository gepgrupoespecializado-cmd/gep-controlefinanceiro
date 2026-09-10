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

export type NumeroTipo = "orcamento" | "relatorio";

const pool: Record<NumeroTipo, number[]> = { orcamento: [], relatorio: [] };
const carregando: Record<NumeroTipo, boolean> = { orcamento: false, relatorio: false };
let ativo = false;

const TAMANHO_LOTE = 2;

async function reservar(tipo: NumeroTipo): Promise<number | null> {
  const { data, error } = await supabase.rpc("next_number", { _tipo: tipo });
  if (error || typeof data !== "number") return null;
  return data;
}

async function abastecer(tipo: NumeroTipo) {
  if (!ativo || carregando[tipo]) return;
  carregando[tipo] = true;
  try {
    while (pool[tipo].length < TAMANHO_LOTE) {
      const n = await reservar(tipo);
      if (n === null) break;
      pool[tipo].push(n);
    }
  } finally {
    carregando[tipo] = false;
  }
}

/** Consome um número já reservado; devolve null quando não há reserva. */
export function proximoNumero(tipo: NumeroTipo): number | null {
  const n = pool[tipo].shift() ?? null;
  void abastecer(tipo);
  return n;
}

/**
 * Liga a numeração remota para a empresa ativa, garantindo que o contador do
 * banco nunca fique atrás dos números já usados neste dispositivo.
 */
export async function iniciarNumeracao(base: { orcamento: number; relatorio: number }) {
  ativo = true;
  pool.orcamento = [];
  pool.relatorio = [];
  await Promise.all([
    supabase.rpc("seed_counter", { _tipo: "orcamento", _proximo: Math.max(base.orcamento, 1) }),
    supabase.rpc("seed_counter", { _tipo: "relatorio", _proximo: Math.max(base.relatorio, 1) }),
  ]);
  await Promise.all([abastecer("orcamento"), abastecer("relatorio")]);
}

export function pararNumeracao() {
  ativo = false;
  pool.orcamento = [];
  pool.relatorio = [];
}
