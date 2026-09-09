/**
 * Regras de negócio puras (Etapa 01).
 *
 * Nenhuma função aqui lê ou grava estado: recebem os dados necessários e
 * devolvem o resultado. O comportamento é idêntico ao que hoje está embutido
 * em src/lib/store.ts — apenas isolado para permitir a Etapa 02 e testes.
 */

import type {
  Agendamento,
  Lancamento,
  Orcamento,
  OrcamentoItem,
  PagamentoStatus,
  Relatorio,
} from "../types/models";
import { formaPagamentoLabel, recorrenciaDias } from "../types/models";

const lista = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** Numeração formatada de documentos (ORC-000001, RPS-000001). */
export const numeroDocumento = (prefixo: string, numero: number) =>
  `${prefixo}-${String(Number(numero) || 0).padStart(6, "0")}`;

/* ---------- Cálculos financeiros ---------- */

export const subtotalOrcamento = (o: Orcamento) =>
  lista<OrcamentoItem>(o.itens).reduce(
    (sum, i) => sum + (Number(i.quantidade) || 0) * (Number(i.valorUnit) || 0),
    0,
  );

export const totalOrcamento = (o: Orcamento) =>
  Math.max(0, subtotalOrcamento(o) - (Number(o.desconto) || 0));

export function validadeOrcamento(o: Orcamento): { emissao: Date; vencimento: Date } {
  const emissao = new Date(o.criadoEm);
  const vencimento = new Date(emissao);
  vencimento.setDate(vencimento.getDate() + (o.validadeDias ?? 7));
  return { emissao, vencimento };
}

export function statusPagamento(l: Lancamento): PagamentoStatus {
  if (l.pago) return "recebido";
  if (l.vencimento && new Date(l.vencimento) < new Date()) return "vencido";
  return "pendente";
}

/* ---------- Auditoria ---------- */

export function diffPatch<T extends Record<string, any>>(
  before: T,
  patch: Partial<T>,
): { campo: string; antes: string; depois: string }[] {
  const out: { campo: string; antes: string; depois: string }[] = [];
  for (const k of Object.keys(patch)) {
    const a = before[k];
    const b = (patch as any)[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out.push({
        campo: k,
        antes: a == null ? "—" : typeof a === "object" ? JSON.stringify(a) : String(a),
        depois: b == null ? "—" : typeof b === "object" ? JSON.stringify(b) : String(b),
      });
    }
  }
  return out;
}

/* ---------- Receita automática ---------- */

/** Previsão de receita ao aprovar um orçamento (vencimento em 15 dias). */
export function novaReceitaDeOrcamento(
  o: Orcamento,
  clienteNome: string,
  agora: Date = new Date(),
): Omit<Lancamento, "id"> | null {
  const valor = totalOrcamento(o);
  if (valor <= 0) return null;
  const venc = new Date(agora);
  venc.setDate(venc.getDate() + 15);
  return {
    tipo: "entrada",
    descricao: `Orçamento ${numeroDocumento("ORC", o.numero)} — ${clienteNome}`,
    valor,
    data: agora.toISOString(),
    categoria: "Orçamento aprovado",
    pago: false,
    vencimento: venc.toISOString(),
    origemTipo: "orcamento",
    origemId: o.id,
  };
}

/** Entrada recebida ao concluir um agendamento. */
export function novaReceitaDeAgendamento(
  a: Agendamento,
  clienteNome: string,
  agora: Date = new Date(),
): Omit<Lancamento, "id"> | null {
  const valor = a.valor ?? 0;
  if (valor <= 0) return null;
  return {
    tipo: "entrada",
    descricao: `Serviço concluído — ${a.titulo} (${clienteNome})`,
    valor,
    data: agora.toISOString(),
    categoria: "Serviço",
    pago: true,
    origemTipo: "agendamento",
    origemId: a.id,
  };
}

/* ---------- Recorrência de agenda ---------- */

export function proximoAgendamentoPorRecorrencia(
  a: Agendamento,
  base: Date,
): Omit<Agendamento, "id"> | null {
  const rec = a.recorrencia ?? "nenhuma";
  if (rec === "nenhuma") return null;
  const dias = rec === "personalizada" ? (a.intervaloDias ?? 0) : recorrenciaDias[rec];
  if (!dias || dias <= 0) return null;
  const next = new Date(base);
  next.setDate(next.getDate() + dias);
  return {
    clienteId: a.clienteId,
    servicoId: a.servicoId,
    titulo: a.titulo,
    data: next.toISOString(),
    observacoes: a.observacoes,
    status: "agendado",
    valor: a.valor,
    horaInicio: a.horaInicio,
    horaFim: a.horaFim,
    responsavel: a.responsavel,
    endereco: a.endereco,
    orcamentoId: a.orcamentoId,
    recorrencia: a.recorrencia,
    intervaloDias: a.intervaloDias,
  };
}

/* ---------- Sincronização financeira do relatório ---------- */

export type SincronizacaoFinanceira =
  | { tipo: "nenhum" }
  | { tipo: "atualizar"; lancamentoId: string; patch: Partial<Lancamento>; descricao: string; resumo: string }
  | { tipo: "criar"; lancamento: Omit<Lancamento, "id">; resumo: string };

export function planejarSincronizacaoFinanceira(
  r: Relatorio,
  ag: Agendamento | undefined,
  clienteNome: string,
  existente: Lancamento | undefined,
  agora: Date = new Date(),
): SincronizacaoFinanceira {
  if (r.valorRecebido == null && r.situacaoPagamento == null) return { tipo: "nenhum" };
  if (!ag) return { tipo: "nenhum" };

  const valor = r.valorRecebido ?? r.valorOrcamento ?? ag.valor ?? 0;
  const pago = (r.situacaoPagamento ?? "pago") === "pago";
  const desc = `Serviço concluído — ${ag.titulo} (${clienteNome})`;
  const categoria =
    r.formasPagamentoRecebimento && r.formasPagamentoRecebimento.length
      ? r.formasPagamentoRecebimento.map((f) => formaPagamentoLabel[f]).join(", ")
      : "Serviço";
  const resumo = `${pago ? "Recebido" : "Pendente"} · ${categoria}`;

  if (existente) {
    return {
      tipo: "atualizar",
      lancamentoId: existente.id,
      descricao: desc,
      resumo,
      patch: {
        valor,
        pago,
        categoria,
        descricao: desc,
        data: r.dataPagamento ?? existente.data,
        atualizadoEm: agora.toISOString(),
      },
    };
  }

  if (valor > 0) {
    return {
      tipo: "criar",
      resumo,
      lancamento: {
        tipo: "entrada",
        descricao: desc,
        valor,
        data: r.dataPagamento ?? agora.toISOString(),
        categoria,
        pago,
        origemTipo: "agendamento",
        origemId: ag.id,
      },
    };
  }

  return { tipo: "nenhum" };
}
