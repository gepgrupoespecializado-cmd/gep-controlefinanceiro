/**
 * Conversão dos modelos de domínio (Etapa 01) para as linhas das tabelas
 * relacionais (Etapa 03).
 *
 * Nada aqui conhece telas: apenas transforma o estado em memória em registros.
 * Os identificadores atuais são preservados quando já são UUID; caso contrário
 * é derivado um UUID estável a partir do identificador antigo, que continua
 * guardado na coluna `legacy_id`. A derivação é determinística, o que torna a
 * cópia inicial e a sincronização idempotentes.
 */
import type {
  Agendamento,
  Cliente,
  Empresa,
  HistoricoEntry,
  Lancamento,
  ModeloDescricao,
  Orcamento,
  Relatorio,
  Servico,
} from "@/types/models";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hash32(input: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/** UUID estável derivado do identificador antigo (mesma entrada, mesma saída). */
export function uuidFor(orgId: string, kind: string, legacyId: string): string {
  if (UUID_RE.test(legacyId)) return legacyId.toLowerCase();
  const base = `${orgId}:${kind}:${legacyId}`;
  const a = hash32(base, 0x811c9dc5);
  const b = hash32(base, 0x01000193);
  const c = hash32(base, 0x9e3779b9);
  const d = hash32(base, 0x85ebca6b);
  const hex = (a + b + c + d).slice(0, 32);
  // versão 5 e variante 8 apenas para manter o formato UUID válido
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    "5" + hex.slice(13, 16),
    "8" + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join("-");
}

export function legacyOf(id: string): string | null {
  return UUID_RE.test(id) ? null : id;
}

function ref(orgId: string, kind: string, id?: string | null): string | null {
  return id ? uuidFor(orgId, kind, id) : null;
}

function iso(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export type Row = Record<string, unknown>;

export function customerRow(org: string, c: Cliente): Row {
  return {
    id: uuidFor(org, "cliente", c.id),
    organization_id: org,
    legacy_id: legacyOf(c.id),
    nome: c.nome ?? "",
    telefone: c.telefone ?? null,
    whatsapp: c.whatsapp ?? null,
    email: c.email ?? null,
    documento: c.documento ?? null,
    endereco: c.endereco ?? null,
    cep: c.cep ?? null,
    rua: c.rua ?? null,
    numero: c.numero ?? null,
    complemento: c.complemento ?? null,
    bairro: c.bairro ?? null,
    cidade: c.cidade ?? null,
    estado: c.estado ?? null,
    observacoes: c.observacoes ?? null,
    frequencia: c.frequencia ?? "avulso",
    arquivado: !!c.arquivado,
    criado_em: iso(c.criadoEm),
  };
}

export function serviceRow(org: string, s: Servico): Row {
  return {
    id: uuidFor(org, "servico", s.id),
    organization_id: org,
    legacy_id: legacyOf(s.id),
    nome: s.nome ?? "",
    descricao: s.descricao ?? null,
    valor: s.valor ?? 0,
    tempo_estimado: s.tempoEstimado ?? null,
    arquivado: !!s.arquivado,
  };
}

export function quoteRow(org: string, o: Orcamento): Row {
  return {
    id: uuidFor(org, "orcamento", o.id),
    organization_id: org,
    legacy_id: legacyOf(o.id),
    numero: o.numero ?? 1,
    customer_id: ref(org, "cliente", o.clienteId),
    customer_legacy_id: o.clienteId ?? null,
    prazo: o.prazo ?? null,
    observacoes: o.observacoes ?? null,
    descricao_servicos: o.descricaoServicos ?? "",
    validade_dias: o.validadeDias ?? 15,
    formas_pagamento: o.formasPagamento ?? [],
    status: o.status ?? "rascunho",
    escopo: o.escopo ?? [],
    nao_incluso: o.naoIncluso ?? [],
    condicoes: o.condicoes ?? [],
    diferencial: o.diferencial ?? null,
    desconto: o.desconto ?? null,
    data_prevista: o.dataPrevista ?? null,
    hora_prevista: o.horaPrevista ?? null,
    fotos_antes: o.fotosAntes ?? [],
    fotos_depois: o.fotosDepois ?? [],
    versao: o.versao ?? null,
    arquivado: !!o.arquivado,
    criado_em: iso(o.criadoEm),
  };
}

export function quoteItemRows(org: string, o: Orcamento): Row[] {
  const quoteId = uuidFor(org, "orcamento", o.id);
  return (o.itens ?? []).map((it, i) => ({
    id: uuidFor(org, "item", `${o.id}#${i}`),
    organization_id: org,
    quote_id: quoteId,
    service_id: ref(org, "servico", it.servicoId ?? null),
    service_legacy_id: it.servicoId ?? null,
    posicao: i,
    descricao: it.descricao ?? "",
    quantidade: it.quantidade ?? 1,
    valor_unit: it.valorUnit ?? 0,
    categoria: it.categoria ?? null,
    unidade: it.unidade ?? null,
    escopo: it.escopo ?? null,
  }));
}

export function appointmentRow(org: string, a: Agendamento): Row {
  return {
    id: uuidFor(org, "agendamento", a.id),
    organization_id: org,
    legacy_id: legacyOf(a.id),
    customer_id: ref(org, "cliente", a.clienteId),
    customer_legacy_id: a.clienteId ?? null,
    service_id: ref(org, "servico", a.servicoId ?? null),
    service_legacy_id: a.servicoId ?? null,
    quote_id: ref(org, "orcamento", a.orcamentoId ?? null),
    quote_legacy_id: a.orcamentoId ?? null,
    report_id: ref(org, "relatorio", a.relatorioId ?? null),
    report_legacy_id: a.relatorioId ?? null,
    titulo: a.titulo ?? "",
    data: iso(a.data),
    data_texto: a.data ?? null,
    observacoes: a.observacoes ?? null,
    status: a.status ?? "agendado",
    valor: a.valor ?? null,
    hora_inicio: a.horaInicio ?? null,
    hora_fim: a.horaFim ?? null,
    responsavel: a.responsavel ?? null,
    endereco: a.endereco ?? null,
    recorrencia: a.recorrencia ?? null,
    intervalo_dias: a.intervaloDias ?? null,
    arquivado: !!a.arquivado,
  };
}

export function reportRow(org: string, r: Relatorio): Row {
  return {
    id: uuidFor(org, "relatorio", r.id),
    organization_id: org,
    legacy_id: legacyOf(r.id),
    numero: r.numero ?? 1,
    appointment_id: ref(org, "agendamento", r.agendamentoId ?? null),
    appointment_legacy_id: r.agendamentoId ?? null,
    customer_id: ref(org, "cliente", r.clienteId),
    customer_legacy_id: r.clienteId ?? null,
    quote_id: ref(org, "orcamento", r.orcamentoId ?? null),
    quote_legacy_id: r.orcamentoId ?? null,
    servico_executado: r.servicoExecutado ?? "",
    descricao: r.descricao ?? "",
    observacoes: r.observacoes ?? null,
    status: r.status ?? "sucesso",
    data_execucao: r.dataExecucao ?? null,
    hora_inicio: r.horaInicio ?? null,
    hora_fim: r.horaFim ?? null,
    responsavel: r.responsavel ?? null,
    valor: r.valor ?? null,
    assinatura_tecnico: r.assinaturaTecnico ?? null,
    assinatura_cliente: r.assinaturaCliente ?? null,
    valor_orcamento: r.valorOrcamento ?? null,
    valor_recebido: r.valorRecebido ?? null,
    formas_pagamento_recebimento: r.formasPagamentoRecebimento ?? [],
    parcelas: r.parcelas ?? null,
    taxa_cartao: r.taxaCartao ?? null,
    observacoes_financeiras: r.observacoesFinanceiras ?? null,
    data_pagamento: r.dataPagamento ?? null,
    situacao_pagamento: r.situacaoPagamento ?? null,
    recebido_por: r.recebidoPor ?? null,
    arquivado: !!r.arquivado,
    criado_em: iso(r.criadoEm),
  };
}

export function reportPhotoRows(org: string, r: Relatorio): Row[] {
  const reportId = uuidFor(org, "relatorio", r.id);
  const grupos: Array<["antes" | "durante" | "depois", string[]]> = [
    ["antes", r.fotosAntes ?? []],
    ["durante", r.fotosDurante ?? []],
    ["depois", r.fotosDepois ?? []],
  ];
  const rows: Row[] = [];
  for (const [tipo, fotos] of grupos) {
    fotos.forEach((conteudo, i) => {
      rows.push({
        id: uuidFor(org, "foto", `${r.id}#${tipo}#${i}`),
        organization_id: org,
        report_id: reportId,
        tipo,
        posicao: i,
        conteudo,
      });
    });
  }
  return rows;
}

export function transactionRow(org: string, l: Lancamento): Row {
  const origem = l.origemId ?? null;
  return {
    id: uuidFor(org, "lancamento", l.id),
    organization_id: org,
    legacy_id: legacyOf(l.id),
    tipo: l.tipo ?? "entrada",
    descricao: l.descricao ?? "",
    valor: l.valor ?? 0,
    data: l.data ?? null,
    categoria: l.categoria ?? null,
    pago: l.pago ?? null,
    vencimento: l.vencimento ?? null,
    origem_tipo: l.origemTipo ?? null,
    origem_legacy_id: origem,
    origin_quote_id: l.origemTipo === "orcamento" ? ref(org, "orcamento", origem) : null,
    origin_appointment_id: l.origemTipo === "agendamento" ? ref(org, "agendamento", origem) : null,
    arquivado: !!l.arquivado,
  };
}

export function templateRow(org: string, m: ModeloDescricao): Row {
  return {
    id: uuidFor(org, "modelo", m.id),
    organization_id: org,
    legacy_id: legacyOf(m.id),
    nome: m.nome ?? "",
    conteudo: m.conteudo ?? "",
    favorito: !!m.favorito,
    criado_em: iso(m.criadoEm),
  };
}

export function auditRow(org: string, h: HistoricoEntry, userId: string | null): Row {
  return {
    id: uuidFor(org, "historico", h.id),
    organization_id: org,
    legacy_id: legacyOf(h.id),
    entidade: h.entidade,
    entidade_id: h.entidadeId ?? null,
    entidade_nome: h.entidadeNome ?? null,
    acao: h.acao,
    campo: h.campo ?? null,
    antes: h.antes ?? null,
    depois: h.depois ?? null,
    data: iso(h.data),
    user_id: userId,
    usuario: h.usuario ?? null,
  };
}

export function settingsRow(org: string, e: Empresa): Row {
  return { organization_id: org, empresa: e as unknown as Record<string, unknown> };
}
