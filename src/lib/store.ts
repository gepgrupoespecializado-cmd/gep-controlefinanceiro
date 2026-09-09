import { useEffect, useSyncExternalStore } from "react";
import { uid } from "./format";

/* ---------- Types (definições em src/types/models.ts) ---------- */
import type {
  Agendamento, AgendaStatus, Cliente, ClienteFreq, DB, Empresa, FormaPagamento,
  HistoricoEntidade, HistoricoEntry, Lancamento, LancamentoTipo, ModeloDescricao,
  Orcamento, OrcamentoItem, OrcamentoStatus, PagamentoStatus, PdfTema, Recorrencia,
  Relatorio, RelatorioStatus, Servico, SituacaoPagamento,
} from "../types/models";
import {
  formaPagamentoLabel, recorrenciaDias, recorrenciaLabel, relatorioStatusLabel,
} from "../types/models";
import {
  diffPatch,
  novaReceitaDeAgendamento,
  novaReceitaDeOrcamento,
  planejarSincronizacaoFinanceira,
  proximoAgendamentoPorRecorrencia,
} from "../domain/rules";

export type {
  Agendamento, AgendaStatus, Cliente, ClienteFreq, DB, Empresa, FormaPagamento,
  HistoricoEntidade, HistoricoEntry, Lancamento, LancamentoTipo, ModeloDescricao,
  Orcamento, OrcamentoItem, OrcamentoStatus, PagamentoStatus, PdfTema, Recorrencia,
  Relatorio, RelatorioStatus, Servico, SituacaoPagamento,
} from "../types/models";
export { formaPagamentoLabel, recorrenciaDias, recorrenciaLabel, relatorioStatusLabel };
export {
  statusPagamento, subtotalOrcamento, totalOrcamento, validadeOrcamento,
} from "../domain/rules";


export const situacaoPagamentoLabel: Record<SituacaoPagamento, string> = {
  pago: "Pago",
  parcial: "Parcial",
  pendente: "Pendente",
};

/** Unidades disponíveis para os itens do orçamento. */
export const UNIDADES_ORCAMENTO = [
  "Serviço", "Unidade", "m²", "Janela", "Vitrine", "Ambiente", "Hora", "Visita",
] as const;
export type UnidadeOrcamento = (typeof UNIDADES_ORCAMENTO)[number];


/** Opções de validade da proposta (dias). */
export const VALIDADE_OPCOES = [3, 5, 7, 10, 15, 30] as const;

export const CONDICOES_PADRAO = [
  "Serviço realizado mediante agendamento prévio.",
  "Execução condicionada às condições adequadas de acesso e segurança.",
  "Orçamento baseado nas condições observadas no momento da avaliação.",
  "Alterações no escopo poderão gerar revisão do valor.",
];

export const NAO_INCLUSO_SUGESTOES = [
  "Remoção de películas.",
  "Remoção de adesivos.",
  "Restauração ou polimento de vidros.",
  "Tratamento de manchas permanentes.",
  "Serviços adicionais não descritos nesta proposta.",
];

export const DIFERENCIAL_PADRAO =
  "Nosso objetivo é entregar vidros limpos, transparentes e com excelente acabamento, valorizando a aparência do ambiente e proporcionando uma apresentação mais profissional.";

/** Modelos de escopo prontos (editáveis após aplicar). */
export const ESCOPO_MODELOS: { nome: string; itens: string[] }[] = [
  {
    nome: "Limpeza de janelas",
    itens: [
      "Limpeza dos vidros internos e externos contemplados na avaliação.",
      "Remoção de poeira, gordura e resíduos superficiais.",
      "Limpeza de esquadrias e acabamentos próximos aos vidros.",
      "Utilização de produtos profissionais específicos.",
      "Execução realizada por profissional especializado.",
    ],
  },
  {
    nome: "Vitrines",
    itens: [
      "Limpeza interna e externa das vitrines contempladas na avaliação.",
      "Remoção de marcas de dedos.",
      "Remoção de poeira e resíduos superficiais.",
      "Limpeza de bordas e acabamentos.",
      "Finalização para melhor apresentação visual.",
    ],
  },
  {
    nome: "Limpeza pós-obra",
    itens: [
      "Remoção de resíduos de obra nas superfícies contempladas na avaliação.",
      "Remoção de poeira e resíduos superficiais.",
      "Limpeza de esquadrias e acabamentos.",
      "Utilização de produtos e equipamentos adequados.",
    ],
  },
];




export const pdfTemaPreset: Record<PdfTema, { principal: string; secundaria: string }> = {
  azul_corporativo: { principal: "#1d4ed8", secundaria: "#60a5fa" },
  azul_escuro:      { principal: "#0b1b3d", secundaria: "#3b82f6" },
  verde_empresarial:{ principal: "#0f5132", secundaria: "#34d399" },
  cinza_executivo:  { principal: "#374151", secundaria: "#9ca3af" },
  preto_premium:    { principal: "#111111", secundaria: "#9ca3af" },
  classico:         { principal: "#0b1b3d", secundaria: "#3b82f6" },
  moderno:          { principal: "#1d4ed8", secundaria: "#60a5fa" },
  executivo:        { principal: "#0b1b3d", secundaria: "#9ca3af" },
  simples:          { principal: "#111111", secundaria: "#6b7280" },
  // Modelos mensais — cor principal segue a campanha do mês
  mes_01: { principal: "#0D47A1", secundaria: "#F5F5F5" }, // Janeiro Branco (títulos em azul-marinho)
  mes_02: { principal: "#7B1FA2", secundaria: "#CE93D8" }, // Fevereiro Roxo
  mes_03: { principal: "#0D47A1", secundaria: "#5472D3" }, // Março Azul-Marinho
  mes_04: { principal: "#2E7D32", secundaria: "#81C784" }, // Abril Verde
  mes_05: { principal: "#F9A825", secundaria: "#FFD54F" }, // Maio Amarelo Ouro
  mes_06: { principal: "#C62828", secundaria: "#EF9A9A" }, // Junho Vermelho
  mes_07: { principal: "#00897B", secundaria: "#4DB6AC" }, // Julho Verde-Esmeralda
  mes_08: { principal: "#B8860B", secundaria: "#E6C260" }, // Agosto Dourado
  mes_09: { principal: "#FDD835", secundaria: "#FFF176" }, // Setembro Amarelo
  mes_10: { principal: "#E91E63", secundaria: "#F48FB1" }, // Outubro Rosa
  mes_11: { principal: "#1565C0", secundaria: "#64B5F6" }, // Novembro Azul
  mes_12: { principal: "#B71C1C", secundaria: "#B8860B" }, // Dezembro Vermelho Natalino + dourado
};

/** Metadados dos 12 modelos mensais de PDF. */
export const pdfMesInfo: {
  mes: number; key: PdfTema; nome: string; campanha: string; emoji: string;
}[] = [
  { mes: 1,  key: "mes_01", nome: "Janeiro Branco",     campanha: "Saúde Mental",         emoji: "🤍" },
  { mes: 2,  key: "mes_02", nome: "Fevereiro Roxo",     campanha: "Conscientização",      emoji: "💜" },
  { mes: 3,  key: "mes_03", nome: "Março Azul-Marinho", campanha: "Ciclo Corporativo",    emoji: "🔵" },
  { mes: 4,  key: "mes_04", nome: "Abril Verde",        campanha: "Segurança no Trabalho",emoji: "🍃" },
  { mes: 5,  key: "mes_05", nome: "Maio Amarelo",       campanha: "Atenção e Segurança",  emoji: "💛" },
  { mes: 6,  key: "mes_06", nome: "Junho Vermelho",     campanha: "Solidariedade",        emoji: "❤️" },
  { mes: 7,  key: "mes_07", nome: "Julho Esmeralda",    campanha: "Renovação",            emoji: "💚" },
  { mes: 8,  key: "mes_08", nome: "Agosto Dourado",     campanha: "Premium",              emoji: "✨" },
  { mes: 9,  key: "mes_09", nome: "Setembro Amarelo",   campanha: "Valorização da Vida",  emoji: "🌻" },
  { mes: 10, key: "mes_10", nome: "Outubro Rosa",       campanha: "Prevenção",            emoji: "🌸" },
  { mes: 11, key: "mes_11", nome: "Novembro Azul",      campanha: "Saúde do Homem",       emoji: "💙" },
  { mes: 12, key: "mes_12", nome: "Dezembro Vermelho",  campanha: "Solidariedade / Natal",emoji: "🎄" },
];

/**
 * Resolve o tema efetivo do PDF considerando o modo mensal.
 * - "auto": usa o mês atual
 * - "manual": usa `pdfMesManual`
 * - "off" / indefinido: usa o `temaPdf` configurado
 */
export function resolvePdfTemaAtivo(empresa: Empresa, override?: PdfTema): PdfTema {
  if (override) return override;
  const modo = empresa.pdfMesModo ?? "off";
  if (modo === "auto") {
    const mm = new Date().getMonth() + 1;
    return (`mes_${String(mm).padStart(2, "0")}` as PdfTema);
  }
  if (modo === "manual" && empresa.pdfMesManual && empresa.pdfMesManual >= 1 && empresa.pdfMesManual <= 12) {
    return (`mes_${String(empresa.pdfMesManual).padStart(2, "0")}` as PdfTema);
  }
  return empresa.temaPdf ?? "azul_escuro";
}


const KEY = "gep_db_v3";
const USUARIO_PADRAO = "Operador";

// IMPORTANT: seed data is evaluated at module scope. In Cloudflare Workers
// the global scope forbids crypto.randomUUID() / Math.random() / new Date(),
// so we must use deterministic, static values here.
const modeloPadrao = (id: string, nome: string, conteudo: string): ModeloDescricao => ({
  id: `seed-modelo-${id}`,
  nome,
  conteudo,
  criadoEm: "1970-01-01T00:00:00.000Z",
});

const MODELOS_SEED: ModeloDescricao[] = [
  modeloPadrao(
    "vidros",
    "Limpeza Técnica de Vidros",
    "• Limpeza técnica de todos os vidros internos e externos.\n• Remoção de manchas de chuva, poeira, gordura e resíduos superficiais.\n• Limpeza de esquadrias e acabamentos próximos aos vidros.\n• Utilização de produtos profissionais específicos para vidros.\n• Execução realizada por equipe especializada utilizando equipamentos adequados e procedimentos seguros.",
  ),
  modeloPadrao(
    "pos-obra",
    "Limpeza Pós-Obra",
    "• Remoção de poeira, respingos de tinta, cimento e demais resíduos da obra.\n• Limpeza profunda de pisos, paredes, vidros, esquadrias e bancadas.\n• Higienização de banheiros, cozinhas e áreas comuns.\n• Aplicação de produtos profissionais e equipamentos adequados.\n• Equipe técnica especializada com todos os EPIs necessários.",
  ),
  modeloPadrao(
    "fachadas",
    "Limpeza de Fachadas",
    "• Limpeza técnica completa da fachada (vidros, pastilhas, ACM e/ou pintura).\n• Remoção de poeira, fuligem e poluição urbana.\n• Trabalho em altura com equipe especializada NR-35 e NR-18.\n• Utilização de cadeiras suspensas, andaimes ou balancins conforme projeto.\n• Produtos específicos para cada tipo de revestimento.",
  ),
  modeloPadrao(
    "comercial",
    "Limpeza Comercial",
    "• Higienização completa de salas, recepção, banheiros e áreas comuns.\n• Limpeza de mobiliário, vidros, pisos e superfícies de contato.\n• Recolhimento e descarte adequado de resíduos.\n• Reposição de materiais de higiene (quando contratado).\n• Equipe uniformizada e treinada.",
  ),
  modeloPadrao(
    "residencial",
    "Limpeza Residencial",
    "• Limpeza geral de todos os cômodos da residência.\n• Higienização de banheiros, cozinha e áreas de serviço.\n• Limpeza de vidros internos, espelhos e superfícies.\n• Aspiração e lavagem de pisos.\n• Organização leve dos ambientes.",
  ),
  modeloPadrao(
    "sacadas",
    "Limpeza de Sacadas e Varandas",
    "• Limpeza de pisos, paredes e guarda-corpos.\n• Higienização de vidros e esquadrias.\n• Remoção de poeira, manchas e resíduos externos.\n• Produtos apropriados para áreas externas.",
  ),
  modeloPadrao(
    "vitrines",
    "Limpeza de Vitrines",
    "• Limpeza técnica de vitrines internas e externas.\n• Remoção de manchas, gordura, poeira e marcas de chuva.\n• Polimento final para acabamento cristalino.\n• Equipe treinada para atendimento em horários comerciais.",
  ),
  modeloPadrao(
    "academias",
    "Limpeza de Academias",
    "• Higienização completa de aparelhos, halteres e equipamentos.\n• Limpeza de pisos, espelhos, vidros e bancadas.\n• Desinfecção de banheiros e vestiários.\n• Produtos bactericidas e procedimentos sanitários.",
  ),
];

const seed: DB = {
  clientes: [],
  servicos: [
    { id: "seed-servico-vidros", nome: "Limpeza Técnica de Vidros", valor: 350, tempoEstimado: "3h" },
    { id: "seed-servico-pos-obra", nome: "Limpeza Pós-Obra", valor: 800, tempoEstimado: "6h" },
    { id: "seed-servico-fachadas", nome: "Limpeza de Fachadas", valor: 1200, tempoEstimado: "8h" },
    { id: "seed-servico-comercial", nome: "Limpeza Comercial", valor: 500, tempoEstimado: "4h" },
    { id: "seed-servico-residencial", nome: "Limpeza Residencial", valor: 280, tempoEstimado: "3h" },
  ],
  orcamentos: [],
  proximoOrcamento: 1,
  agendamentos: [],
  lancamentos: [],
  empresa: {
    nome: "GEP Serviços Especializado",
    cnpj: "",
    telefone: "",
    whatsapp: "",
    email: "",
    endereco: "",
    redesSociais: "",
    temaPdf: "classico",
    corPdf: "#0b1b3d",
  },
  historico: [],
  modelos: MODELOS_SEED,
  relatorios: [],
  proximoRelatorio: 1,
};

const asArray = <T,>(value: unknown, fallback: T[] = []): T[] =>
  Array.isArray(value) ? value : fallback;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const asRecordArray = <T,>(
  value: unknown,
  mapper: (item: Record<string, unknown>) => T,
  fallback: T[] = [],
): T[] => (Array.isArray(value) ? value.filter(isRecord).map(mapper) : fallback);

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

const asNumber = (value: unknown, fallback: number) => {
  const n = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value.replace(",", "."))
      : NaN;
  return Number.isFinite(n) ? n : fallback;
};

const valid = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;

const CLIENTE_FREQS = ["semanal", "quinzenal", "mensal", "trimestral", "avulso"] as const satisfies readonly ClienteFreq[];
const ORCAMENTO_STATUS = ["rascunho", "enviado", "aprovado", "recusado"] as const satisfies readonly OrcamentoStatus[];
const FORMAS_PAGAMENTO = ["pix", "dinheiro", "debito", "credito", "transferencia", "boleto", "outro"] as const satisfies readonly FormaPagamento[];
const AGENDA_STATUS = ["agendado", "em_andamento", "concluido", "cancelado"] as const satisfies readonly AgendaStatus[];
const RECORRENCIAS = ["nenhuma", "semanal", "quinzenal", "mensal", "trimestral", "personalizada"] as const satisfies readonly Recorrencia[];
const RELATORIO_STATUS = ["sucesso", "observacoes", "retorno"] as const satisfies readonly RelatorioStatus[];
const SITUACOES_PAGAMENTO = ["pago", "parcial", "pendente"] as const satisfies readonly SituacaoPagamento[];
const LANCAMENTO_TIPOS = ["entrada", "saida"] as const satisfies readonly LancamentoTipo[];
const ORIGENS_LANCAMENTO = ["orcamento", "agendamento", "manual"] as const;
const PDF_TEMAS = [
  "azul_corporativo", "azul_escuro", "verde_empresarial", "cinza_executivo", "preto_premium",
  "classico", "moderno", "executivo", "simples",
  "mes_01", "mes_02", "mes_03", "mes_04", "mes_05", "mes_06",
  "mes_07", "mes_08", "mes_09", "mes_10", "mes_11", "mes_12",
] as const satisfies readonly PdfTema[];
const PDF_MES_MODOS = ["auto", "manual", "off"] as const;
const HISTORICO_ENTIDADES = ["cliente", "servico", "orcamento", "agendamento", "lancamento", "empresa"] as const satisfies readonly HistoricoEntidade[];
const HISTORICO_ACOES = ["criado", "editado", "arquivado", "restaurado", "excluido", "status"] as const;

function stringArray(value: unknown): string[] {
  return asArray<unknown>(value).filter((item): item is string => typeof item === "string");
}

function normalizeCliente(c: Record<string, unknown>, now: string): Cliente {
  return {
    id: asString(c.id, uid()),
    nome: asString(c.nome, "Cliente sem nome"),
    telefone: asOptionalString(c.telefone),
    whatsapp: asOptionalString(c.whatsapp),
    email: asOptionalString(c.email),
    documento: asOptionalString(c.documento),
    endereco: asOptionalString(c.endereco),
    cep: asOptionalString(c.cep),
    rua: asOptionalString(c.rua),
    numero: asOptionalString(c.numero),
    complemento: asOptionalString(c.complemento),
    bairro: asOptionalString(c.bairro),
    cidade: asOptionalString(c.cidade),
    estado: asOptionalString(c.estado),
    observacoes: asOptionalString(c.observacoes),
    frequencia: valid(c.frequencia, CLIENTE_FREQS, "avulso"),
    criadoEm: asString(c.criadoEm, now),
    arquivado: asBoolean(c.arquivado, false),
    atualizadoEm: asOptionalString(c.atualizadoEm),
  };
}

function normalizeServico(s: Record<string, unknown>): Servico {
  return {
    id: asString(s.id, uid()),
    nome: asString(s.nome, "Serviço sem nome"),
    descricao: asOptionalString(s.descricao),
    valor: asNumber(s.valor, 0),
    tempoEstimado: asOptionalString(s.tempoEstimado),
    arquivado: asBoolean(s.arquivado, false),
    atualizadoEm: asOptionalString(s.atualizadoEm),
  };
}

function asStringList(v: unknown): string[] {
  return asArray<unknown>(v)
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
}

function normalizeOrcamentoItem(i: Record<string, unknown>): OrcamentoItem {
  return {
    servicoId: asOptionalString(i.servicoId),
    descricao: asString(i.descricao, "Item sem descrição"),
    quantidade: asNumber(i.quantidade, 1),
    valorUnit: asNumber(i.valorUnit, 0),
    categoria: asOptionalString(i.categoria),
    unidade: asOptionalString(i.unidade),
    escopo: asOptionalString(i.escopo),
  };
}

function normalizeOrcamento(o: Record<string, unknown>, now: string): Orcamento {
  return {
    id: asString(o.id, uid()),
    numero: asNumber(o.numero, 1),
    clienteId: asString(o.clienteId),
    itens: asRecordArray(o.itens, normalizeOrcamentoItem),
    prazo: asOptionalString(o.prazo),
    observacoes: asOptionalString(o.observacoes),
    descricaoServicos: asString(o.descricaoServicos),
    validadeDias: asNumber(o.validadeDias, 7),
    formasPagamento: asArray<unknown>(o.formasPagamento)
      .filter((f): f is FormaPagamento => typeof f === "string" && FORMAS_PAGAMENTO.includes(f as FormaPagamento)),
    status: valid(o.status, ORCAMENTO_STATUS, "rascunho"),
    criadoEm: asString(o.criadoEm, now),
    arquivado: asBoolean(o.arquivado, false),
    atualizadoEm: asOptionalString(o.atualizadoEm),
    escopo: asStringList(o.escopo),
    naoIncluso: asStringList(o.naoIncluso),
    condicoes: asStringList(o.condicoes),
    diferencial: asOptionalString(o.diferencial),
    desconto: typeof o.desconto === "number" && Number.isFinite(o.desconto) ? o.desconto : undefined,
    dataPrevista: asOptionalString(o.dataPrevista),
    horaPrevista: asOptionalString(o.horaPrevista),
    fotosAntes: asStringList(o.fotosAntes),
    fotosDepois: asStringList(o.fotosDepois),
    versao: asNumber(o.versao, 1),
  };
}

function normalizeAgendamento(a: Record<string, unknown>, now: string): Agendamento {
  return {
    id: asString(a.id, uid()),
    clienteId: asString(a.clienteId),
    servicoId: asOptionalString(a.servicoId),
    titulo: asString(a.titulo, "Serviço agendado"),
    data: asString(a.data, now),
    observacoes: asOptionalString(a.observacoes),
    status: valid(a.status, AGENDA_STATUS, "agendado"),
    valor: asNumber(a.valor, 0),
    horaInicio: asOptionalString(a.horaInicio),
    horaFim: asOptionalString(a.horaFim),
    responsavel: asOptionalString(a.responsavel),
    endereco: asOptionalString(a.endereco),
    orcamentoId: asOptionalString(a.orcamentoId),
    recorrencia: valid(a.recorrencia, RECORRENCIAS, "nenhuma"),
    intervaloDias: asNumber(a.intervaloDias, 7),
    relatorioId: asOptionalString(a.relatorioId),
    arquivado: asBoolean(a.arquivado, false),
    atualizadoEm: asOptionalString(a.atualizadoEm),
  };
}

function normalizeLancamento(l: Record<string, unknown>, now: string): Lancamento {
  return {
    id: asString(l.id, uid()),
    tipo: valid(l.tipo, LANCAMENTO_TIPOS, "entrada"),
    descricao: asString(l.descricao, "Lançamento"),
    valor: asNumber(l.valor, 0),
    data: asString(l.data, now),
    categoria: asOptionalString(l.categoria),
    pago: asBoolean(l.pago, false),
    vencimento: asOptionalString(l.vencimento),
    origemTipo: typeof l.origemTipo === "string" && ORIGENS_LANCAMENTO.includes(l.origemTipo as typeof ORIGENS_LANCAMENTO[number]) ? l.origemTipo as Lancamento["origemTipo"] : undefined,
    origemId: asOptionalString(l.origemId),
    arquivado: asBoolean(l.arquivado, false),
    atualizadoEm: asOptionalString(l.atualizadoEm),
  };
}

function normalizeRelatorio(r: Record<string, unknown>, now: string): Relatorio {
  return {
    id: asString(r.id, uid()),
    numero: asNumber(r.numero, 1),
    agendamentoId: asString(r.agendamentoId),
    clienteId: asString(r.clienteId),
    orcamentoId: asOptionalString(r.orcamentoId),
    servicoExecutado: asString(r.servicoExecutado, "Serviço executado"),
    descricao: asString(r.descricao),
    observacoes: asOptionalString(r.observacoes),
    status: valid(r.status, RELATORIO_STATUS, "sucesso"),
    dataExecucao: asString(r.dataExecucao, now),
    horaInicio: asOptionalString(r.horaInicio),
    horaFim: asOptionalString(r.horaFim),
    responsavel: asOptionalString(r.responsavel),
    valor: asNumber(r.valor, 0),
    fotosAntes: stringArray(r.fotosAntes),
    fotosDurante: stringArray(r.fotosDurante),
    fotosDepois: stringArray(r.fotosDepois),
    assinaturaTecnico: asOptionalString(r.assinaturaTecnico),
    assinaturaCliente: asOptionalString(r.assinaturaCliente),
    criadoEm: asString(r.criadoEm, now),
    arquivado: asBoolean(r.arquivado, false),
    valorOrcamento: asNumber(r.valorOrcamento, 0),
    valorRecebido: asNumber(r.valorRecebido, 0),
    formasPagamentoRecebimento: asArray<unknown>(r.formasPagamentoRecebimento)
      .filter((f): f is FormaPagamento => typeof f === "string" && FORMAS_PAGAMENTO.includes(f as FormaPagamento)),
    parcelas: asNumber(r.parcelas, 1),
    taxaCartao: asNumber(r.taxaCartao, 0),
    observacoesFinanceiras: asOptionalString(r.observacoesFinanceiras),
    dataPagamento: asOptionalString(r.dataPagamento),
    situacaoPagamento: valid(r.situacaoPagamento, SITUACOES_PAGAMENTO, "pendente"),
    recebidoPor: asOptionalString(r.recebidoPor),
  };
}

function normalizeModelo(m: Record<string, unknown>, now: string): ModeloDescricao {
  return {
    id: asString(m.id, uid()),
    nome: asString(m.nome, "Modelo"),
    conteudo: asString(m.conteudo),
    favorito: asBoolean(m.favorito, false),
    criadoEm: asString(m.criadoEm, now),
  };
}

function normalizeHistorico(h: Record<string, unknown>, now: string): HistoricoEntry {
  return {
    id: asString(h.id, uid()),
    entidade: valid(h.entidade, HISTORICO_ENTIDADES, "cliente"),
    entidadeId: asString(h.entidadeId),
    entidadeNome: asString(h.entidadeNome, "Registro"),
    acao: valid(h.acao, HISTORICO_ACOES, "editado"),
    campo: asOptionalString(h.campo),
    antes: asOptionalString(h.antes),
    depois: asOptionalString(h.depois),
    data: asString(h.data, now),
    usuario: asString(h.usuario, USUARIO_PADRAO),
  };
}

function normalizeEmpresa(value: unknown): Empresa {
  const empresa = isRecord(value) ? value : {};
  const custos = isRecord(empresa.custosPadrao) ? empresa.custosPadrao : undefined;
  return {
    ...seed.empresa,
    nome: asString(empresa.nome, seed.empresa.nome),
    cnpj: asString(empresa.cnpj),
    telefone: asString(empresa.telefone),
    whatsapp: asString(empresa.whatsapp),
    email: asString(empresa.email),
    endereco: asString(empresa.endereco),
    redesSociais: asString(empresa.redesSociais),
    logoDataUrl: asOptionalString(empresa.logoDataUrl),
    temaPdf: valid(empresa.temaPdf, PDF_TEMAS, seed.empresa.temaPdf ?? "classico"),
    corPdf: asString(empresa.corPdf, seed.empresa.corPdf),
    corSecundariaPdf: asOptionalString(empresa.corSecundariaPdf),
    pdfMesModo: valid(empresa.pdfMesModo, PDF_MES_MODOS, "off"),
    pdfMesManual: (() => {
      const n = asNumber(empresa.pdfMesManual, 0);
      return n >= 1 && n <= 12 ? Math.floor(n) : undefined;
    })(),
    custosPadrao: custos ? {
      valorHora: asNumber(custos.valorHora, 0),
      margemLucro: asNumber(custos.margemLucro, 0),
      taxaCartao: asNumber(custos.taxaCartao, 0),
      custoOperacionalMensal: asNumber(custos.custoOperacionalMensal, 0),
      valorKm: asNumber(custos.valorKm, 0),
      valorMinimoAtendimento: asNumber(custos.valorMinimoAtendimento, 0),
      imposto: asNumber(custos.imposto, 0),
    } : seed.empresa.custosPadrao,
  };
}

function normalizeDB(parsed: Partial<DB> | null | undefined): DB {
  const source: Partial<DB> = parsed && typeof parsed === "object" ? parsed : {};
  const now = new Date().toISOString();
  const modelos = asRecordArray(source.modelos, (m) => normalizeModelo(m, now));

  return {
    ...seed,
    ...source,
    clientes: asRecordArray(source.clientes, (c) => normalizeCliente(c, now)),
    servicos: asRecordArray(source.servicos, normalizeServico, seed.servicos),
    orcamentos: asRecordArray(source.orcamentos, (o) => normalizeOrcamento(o, now)),
    proximoOrcamento: asNumber(source.proximoOrcamento, 1),
    agendamentos: asRecordArray(source.agendamentos, (a) => normalizeAgendamento(a, now)),
    lancamentos: asRecordArray(source.lancamentos, (l) => normalizeLancamento(l, now)),
    empresa: normalizeEmpresa(source.empresa),
    historico: asRecordArray(source.historico, (h) => normalizeHistorico(h, now)),
    modelos: modelos.length ? modelos : seed.modelos,
    relatorios: asRecordArray(source.relatorios, (r) => normalizeRelatorio(r, now)),
    proximoRelatorio: asNumber(source.proximoRelatorio, 1),
  };
}

function load(): DB {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw);
    return normalizeDB(parsed);
  } catch (error) {
    console.warn("Falha ao carregar dados locais; usando base segura.", error);
    return seed;
  }
}

let state: DB = seed;
let hydratedFromStorage = false;
const listeners = new Set<() => void>();

function hydrateFromStorageOnce() {
  if (hydratedFromStorage || typeof window === "undefined") return;
  hydratedFromStorage = true;
  try {
    state = load();
  } catch (error) {
    console.warn("Falha inesperada na hidratação dos dados locais.", error);
    state = seed;
  } finally {
    listeners.forEach((l) => l());
  }
}

function persist() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(normalizeDB(state)));
    } catch (error) {
      console.warn("Não foi possível salvar os dados locais.", error);
    }
  }
  listeners.forEach((l) => l());
}

function logHist(e: Omit<HistoricoEntry, "id" | "data" | "usuario">) {
  const entry: HistoricoEntry = {
    ...e, id: uid(), data: new Date().toISOString(), usuario: USUARIO_PADRAO,
  };
  state = { ...state, historico: [entry, ...state.historico].slice(0, 1000) };
}


function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

export function useDB(): DB {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => seed);

  useEffect(() => {
    hydrateFromStorageOnce();
  }, []);

  return snapshot;
}

/* ---------- Auto-financeiro helpers ---------- */
function nomeClienteLocal(id: string) {
  return state.clientes.find((c) => c.id === id)?.nome ?? "Cliente";
}

function criarReceitaDeOrcamento(o: Orcamento) {
  const base = novaReceitaDeOrcamento(o, nomeClienteLocal(o.clienteId));
  if (!base) return;
  const l: Lancamento = { ...base, id: uid() };
  state = { ...state, lancamentos: [l, ...state.lancamentos] };
  logHist({
    entidade: "lancamento", entidadeId: l.id, entidadeNome: l.descricao,
    acao: "criado", campo: "automático", depois: "Previsão de receita gerada",
  });
}

function criarReceitaDeAgendamento(a: Agendamento) {
  const base = novaReceitaDeAgendamento(a, nomeClienteLocal(a.clienteId));
  if (!base) return;
  const l: Lancamento = { ...base, id: uid() };
  state = { ...state, lancamentos: [l, ...state.lancamentos] };
  logHist({
    entidade: "lancamento", entidadeId: l.id, entidadeNome: l.descricao,
    acao: "criado", campo: "automático", depois: "Entrada gerada do agendamento",
  });
}

/* ---------- Mutations ---------- */
export const db = {
  /* Clientes */
  addCliente(c: Omit<Cliente, "id" | "criadoEm">): string {
    const novo: Cliente = { ...c, id: uid(), criadoEm: new Date().toISOString() };
    state = { ...state, clientes: [novo, ...state.clientes] };
    logHist({ entidade: "cliente", entidadeId: novo.id, entidadeNome: novo.nome, acao: "criado" });
    persist();
    return novo.id;
  },
  updateCliente(id: string, patch: Partial<Cliente>) {
    const atual = state.clientes.find((c) => c.id === id);
    if (!atual) return;
    const diffs = diffPatch(atual, patch);
    state = {
      ...state,
      clientes: state.clientes.map((c) =>
        c.id === id ? { ...c, ...patch, atualizadoEm: new Date().toISOString() } : c,
      ),
    };
    diffs.forEach((d) =>
      logHist({ entidade: "cliente", entidadeId: id, entidadeNome: atual.nome, acao: "editado", ...d }),
    );
    persist();
  },
  arquivarCliente(id: string, arquivado = true) {
    const c = state.clientes.find((x) => x.id === id); if (!c) return;
    state = { ...state, clientes: state.clientes.map((x) => x.id === id ? { ...x, arquivado } : x) };
    logHist({ entidade: "cliente", entidadeId: id, entidadeNome: c.nome, acao: arquivado ? "arquivado" : "restaurado" });
    persist();
  },
  removeCliente(id: string) {
    const c = state.clientes.find((x) => x.id === id);
    state = { ...state, clientes: state.clientes.filter((x) => x.id !== id) };
    if (c) logHist({ entidade: "cliente", entidadeId: id, entidadeNome: c.nome, acao: "excluido" });
    persist();
  },

  /* Serviços */
  addServico(s: Omit<Servico, "id">) {
    const novo: Servico = { ...s, id: uid() };
    state = { ...state, servicos: [novo, ...state.servicos] };
    logHist({ entidade: "servico", entidadeId: novo.id, entidadeNome: novo.nome, acao: "criado" });
    persist();
  },
  updateServico(id: string, patch: Partial<Servico>) {
    const atual = state.servicos.find((s) => s.id === id); if (!atual) return;
    const diffs = diffPatch(atual, patch);
    state = { ...state, servicos: state.servicos.map((s) => s.id === id ? { ...s, ...patch, atualizadoEm: new Date().toISOString() } : s) };
    diffs.forEach((d) => logHist({ entidade: "servico", entidadeId: id, entidadeNome: atual.nome, acao: "editado", ...d }));
    persist();
  },
  arquivarServico(id: string, arquivado = true) {
    const s = state.servicos.find((x) => x.id === id); if (!s) return;
    state = { ...state, servicos: state.servicos.map((x) => x.id === id ? { ...x, arquivado } : x) };
    logHist({ entidade: "servico", entidadeId: id, entidadeNome: s.nome, acao: arquivado ? "arquivado" : "restaurado" });
    persist();
  },
  removeServico(id: string) {
    const s = state.servicos.find((x) => x.id === id);
    state = { ...state, servicos: state.servicos.filter((s) => s.id !== id) };
    if (s) logHist({ entidade: "servico", entidadeId: id, entidadeNome: s.nome, acao: "excluido" });
    persist();
  },

  /* Orçamentos */
  addOrcamento(o: Omit<Orcamento, "id" | "numero" | "criadoEm">) {
    const numero = state.proximoOrcamento;
    const novo: Orcamento = { ...o, id: uid(), numero, criadoEm: new Date().toISOString() };
    state = {
      ...state,
      proximoOrcamento: numero + 1,
      orcamentos: [novo, ...state.orcamentos],
    };
    logHist({ entidade: "orcamento", entidadeId: novo.id, entidadeNome: `ORC-${String(numero).padStart(6, "0")}`, acao: "criado" });
    if (novo.status === "aprovado") criarReceitaDeOrcamento(novo);
    persist();
  },
  updateOrcamento(id: string, patch: Partial<Orcamento>) {
    const atual = state.orcamentos.find((o) => o.id === id); if (!atual) return;
    const diffs = diffPatch(atual, patch);
    const novo = {
      ...atual, ...patch,
      atualizadoEm: new Date().toISOString(),
      versao: diffs.length ? (atual.versao ?? 1) + 1 : (atual.versao ?? 1),
    };
    const nome = `ORC-${String(atual.numero).padStart(6, "0")}`;
    state = { ...state, orcamentos: state.orcamentos.map((o) => o.id === id ? novo : o) };
    diffs.forEach((d) => logHist({ entidade: "orcamento", entidadeId: id, entidadeNome: nome, acao: "editado", ...d }));
    if (patch.status && patch.status !== atual.status && patch.status === "aprovado") {
      const jaExiste = state.lancamentos.some((l) => l.origemTipo === "orcamento" && l.origemId === id);
      if (!jaExiste) criarReceitaDeOrcamento(novo);
    }
    persist();
  },
  arquivarOrcamento(id: string, arquivado = true) {
    const o = state.orcamentos.find((x) => x.id === id); if (!o) return;
    state = { ...state, orcamentos: state.orcamentos.map((x) => x.id === id ? { ...x, arquivado } : x) };
    logHist({ entidade: "orcamento", entidadeId: id, entidadeNome: `ORC-${String(o.numero).padStart(6, "0")}`, acao: arquivado ? "arquivado" : "restaurado" });
    persist();
  },
  removeOrcamento(id: string) {
    const o = state.orcamentos.find((x) => x.id === id);
    state = { ...state, orcamentos: state.orcamentos.filter((o) => o.id !== id) };
    if (o) logHist({ entidade: "orcamento", entidadeId: id, entidadeNome: `ORC-${String(o.numero).padStart(6, "0")}`, acao: "excluido" });
    persist();
  },
  duplicarOrcamento(id: string) {
    const o = state.orcamentos.find((x) => x.id === id);
    if (!o) return;
    const numero = state.proximoOrcamento;
    const novo: Orcamento = { ...o, id: uid(), numero, criadoEm: new Date().toISOString(), status: "rascunho", arquivado: false, versao: 1 };
    state = {
      ...state,
      proximoOrcamento: numero + 1,
      orcamentos: [novo, ...state.orcamentos],
    };
    logHist({ entidade: "orcamento", entidadeId: novo.id, entidadeNome: `ORC-${String(numero).padStart(6, "0")}`, acao: "criado", campo: "duplicado de", depois: `ORC-${String(o.numero).padStart(6, "0")}` });
    persist();
  },

  /* Agenda */
  addAgendamento(a: Omit<Agendamento, "id">) {
    const novo: Agendamento = { ...a, id: uid() };
    state = { ...state, agendamentos: [novo, ...state.agendamentos] };
    logHist({ entidade: "agendamento", entidadeId: novo.id, entidadeNome: novo.titulo, acao: "criado" });
    if (novo.status === "concluido") criarReceitaDeAgendamento(novo);
    persist();
  },
  updateAgendamento(id: string, patch: Partial<Agendamento>) {
    const atual = state.agendamentos.find((a) => a.id === id); if (!atual) return;
    const diffs = diffPatch(atual, patch);
    const novo = { ...atual, ...patch, atualizadoEm: new Date().toISOString() };
    state = { ...state, agendamentos: state.agendamentos.map((a) => a.id === id ? novo : a) };
    diffs.forEach((d) => logHist({ entidade: "agendamento", entidadeId: id, entidadeNome: atual.titulo, acao: "editado", ...d }));
    if (patch.status && patch.status !== atual.status && patch.status === "concluido") {
      const jaExiste = state.lancamentos.some((l) => l.origemTipo === "agendamento" && l.origemId === id);
      if (!jaExiste) criarReceitaDeAgendamento(novo);
    }
    persist();
  },
  arquivarAgendamento(id: string, arquivado = true) {
    const a = state.agendamentos.find((x) => x.id === id); if (!a) return;
    state = { ...state, agendamentos: state.agendamentos.map((x) => x.id === id ? { ...x, arquivado } : x) };
    logHist({ entidade: "agendamento", entidadeId: id, entidadeNome: a.titulo, acao: arquivado ? "arquivado" : "restaurado" });
    persist();
  },
  removeAgendamento(id: string) {
    const a = state.agendamentos.find((x) => x.id === id);
    state = { ...state, agendamentos: state.agendamentos.filter((a) => a.id !== id) };
    if (a) logHist({ entidade: "agendamento", entidadeId: id, entidadeNome: a.titulo, acao: "excluido" });
    persist();
  },

  /* Financeiro */
  addLancamento(l: Omit<Lancamento, "id">) {
    const novo: Lancamento = { ...l, id: uid() };
    state = { ...state, lancamentos: [novo, ...state.lancamentos] };
    logHist({ entidade: "lancamento", entidadeId: novo.id, entidadeNome: novo.descricao, acao: "criado" });
    persist();
  },
  updateLancamento(id: string, patch: Partial<Lancamento>) {
    const atual = state.lancamentos.find((l) => l.id === id); if (!atual) return;
    const diffs = diffPatch(atual, patch);
    state = { ...state, lancamentos: state.lancamentos.map((l) => l.id === id ? { ...l, ...patch, atualizadoEm: new Date().toISOString() } : l) };
    diffs.forEach((d) => logHist({ entidade: "lancamento", entidadeId: id, entidadeNome: atual.descricao, acao: "editado", ...d }));
    persist();
  },
  marcarRecebido(id: string, pago = true) {
    const l = state.lancamentos.find((x) => x.id === id); if (!l) return;
    state = { ...state, lancamentos: state.lancamentos.map((x) => x.id === id ? { ...x, pago, data: pago ? new Date().toISOString() : x.data } : x) };
    logHist({ entidade: "lancamento", entidadeId: id, entidadeNome: l.descricao, acao: "status", campo: "pago", antes: String(!!l.pago), depois: String(pago) });
    persist();
  },
  arquivarLancamento(id: string, arquivado = true) {
    const l = state.lancamentos.find((x) => x.id === id); if (!l) return;
    state = { ...state, lancamentos: state.lancamentos.map((x) => x.id === id ? { ...x, arquivado } : x) };
    logHist({ entidade: "lancamento", entidadeId: id, entidadeNome: l.descricao, acao: arquivado ? "arquivado" : "restaurado" });
    persist();
  },
  removeLancamento(id: string) {
    const l = state.lancamentos.find((x) => x.id === id);
    state = { ...state, lancamentos: state.lancamentos.filter((l) => l.id !== id) };
    if (l) logHist({ entidade: "lancamento", entidadeId: id, entidadeNome: l.descricao, acao: "excluido" });
    persist();
  },

  /* Empresa */
  updateEmpresa(patch: Partial<Empresa>) {
    const diffs = diffPatch(state.empresa, patch);
    state = { ...state, empresa: { ...state.empresa, ...patch } };
    diffs.forEach((d) => logHist({ entidade: "empresa", entidadeId: "empresa", entidadeNome: state.empresa.nome, acao: "editado", ...d }));
    persist();
  },

  /* Modelos de descrição */
  addModelo(m: Omit<ModeloDescricao, "id" | "criadoEm">) {
    const novo: ModeloDescricao = { ...m, id: uid(), criadoEm: new Date().toISOString() };
    state = { ...state, modelos: [novo, ...state.modelos] };
    persist();
  },
  updateModelo(id: string, patch: Partial<ModeloDescricao>) {
    state = { ...state, modelos: state.modelos.map((m) => m.id === id ? { ...m, ...patch } : m) };
    persist();
  },
  removeModelo(id: string) {
    state = { ...state, modelos: state.modelos.filter((m) => m.id !== id) };
    persist();
  },
  toggleFavoritoModelo(id: string) {
    state = { ...state, modelos: state.modelos.map((m) => m.id === id ? { ...m, favorito: !m.favorito } : m) };
    persist();
  },

  /* Histórico */
  limparHistorico() {
    state = { ...state, historico: [] };
    persist();
  },
};

/* ---------- Relatórios ---------- */
function gerarProximoAgendamentoDe(a: Agendamento, base: Date) {
  const proximo = proximoAgendamentoPorRecorrencia(a, base);
  if (!proximo) return;
  const novo: Agendamento = { ...proximo, id: uid() };
  state = { ...state, agendamentos: [novo, ...state.agendamentos] };
  logHist({
    entidade: "agendamento", entidadeId: novo.id, entidadeNome: novo.titulo,
    acao: "criado", campo: "recorrência", depois: recorrenciaLabel[a.recorrencia ?? "nenhuma"],
  });
}

export const relatorios = {
  add(r: Omit<Relatorio, "id" | "numero" | "criadoEm">): string {
    const numero = state.proximoRelatorio;
    const novo: Relatorio = {
      ...r,
      id: uid(),
      numero,
      criadoEm: new Date().toISOString(),
    };
    state = {
      ...state,
      proximoRelatorio: numero + 1,
      relatorios: [novo, ...state.relatorios],
      agendamentos: state.agendamentos.map((a) =>
        a.id === r.agendamentoId ? { ...a, relatorioId: novo.id, status: "concluido" } : a,
      ),
    };
    logHist({
      entidade: "agendamento", entidadeId: r.agendamentoId,
      entidadeNome: `Relatório RPS-${String(numero).padStart(6, "0")}`,
      acao: "criado", depois: relatorioStatusLabel[r.status],
    });
    const ag = state.agendamentos.find((a) => a.id === r.agendamentoId);
    if (ag) gerarProximoAgendamentoDe(ag, new Date(r.dataExecucao));
    sincronizarFinanceiroRelatorio(novo);
    persist();
    return novo.id;
  },
  update(id: string, patch: Partial<Relatorio>) {
    state = {
      ...state,
      relatorios: state.relatorios.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    };
    const novo = state.relatorios.find((r) => r.id === id);
    if (novo) sincronizarFinanceiroRelatorio(novo);
    persist();
  },
  porCliente(clienteId: string) {
    return state.relatorios.filter((r) => r.clienteId === clienteId && !r.arquivado);
  },
};

function sincronizarFinanceiroRelatorio(r: Relatorio) {
  const ag = state.agendamentos.find((a) => a.id === r.agendamentoId);
  const existente = ag
    ? state.lancamentos.find((l) => l.origemTipo === "agendamento" && l.origemId === ag.id)
    : undefined;
  const plano = planejarSincronizacaoFinanceira(
    r, ag, ag ? nomeClienteLocal(ag.clienteId) : "Cliente", existente,
  );

  if (plano.tipo === "atualizar") {
    state = {
      ...state,
      lancamentos: state.lancamentos.map((l) =>
        l.id === plano.lancamentoId ? { ...l, ...plano.patch } : l,
      ),
    };
    logHist({
      entidade: "lancamento", entidadeId: plano.lancamentoId, entidadeNome: plano.descricao,
      acao: "editado", campo: "encerramento", depois: plano.resumo,
    });
    return;
  }

  if (plano.tipo === "criar") {
    const l: Lancamento = { ...plano.lancamento, id: uid() };
    state = { ...state, lancamentos: [l, ...state.lancamentos] };
    logHist({
      entidade: "lancamento", entidadeId: l.id, entidadeNome: l.descricao,
      acao: "criado", campo: "encerramento", depois: plano.resumo,
    });
  }
}

/** Leitura direta do estado atual — usada pelo adaptador local (src/data/local). */
export function getDBSnapshot(): DB {
  return state;
}

export const freqLabel: Record<ClienteFreq, string> = {
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  trimestral: "Trimestral",
  avulso: "Avulso",
};

export const freqColor: Record<ClienteFreq, string> = {
  semanal: "bg-emerald-500 text-white",
  quinzenal: "bg-red-500 text-white",
  mensal: "bg-orange-500 text-white",
  trimestral: "bg-blue-500 text-white",
  avulso: "bg-slate-500 text-white",
};

export const statusAgendaLabel: Record<AgendaStatus, string> = {
  agendado: "Agendado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const statusOrcLabel: Record<OrcamentoStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

export const statusPagLabel: Record<PagamentoStatus, string> = {
  recebido: "Recebido",
  pendente: "Pendente",
  vencido: "Vencido",
};

export const statusPagColor: Record<PagamentoStatus, string> = {
  recebido: "bg-emerald-500 text-white",
  pendente: "bg-amber-500 text-white",
  vencido: "bg-red-500 text-white",
};