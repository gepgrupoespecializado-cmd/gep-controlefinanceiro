import { useSyncExternalStore } from "react";
import { uid } from "./format";

/* ---------- Types ---------- */
export type ClienteFreq = "semanal" | "quinzenal" | "mensal" | "trimestral" | "avulso";

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  endereco?: string;
  observacoes?: string;
  frequencia: ClienteFreq;
  criadoEm: string;
  arquivado?: boolean;
  atualizadoEm?: string;
}

export interface Servico {
  id: string;
  nome: string;
  descricao?: string;
  valor: number;
  tempoEstimado?: string;
  arquivado?: boolean;
  atualizadoEm?: string;
}

export type OrcamentoStatus = "rascunho" | "enviado" | "aprovado" | "recusado";

export interface OrcamentoItem {
  servicoId?: string;
  descricao: string;
  quantidade: number;
  valorUnit: number;
}

export interface Orcamento {
  id: string;
  numero: number;
  clienteId: string;
  itens: OrcamentoItem[];
  prazo?: string;
  observacoes?: string;
  descricaoServicos: string;
  validadeDias: number;
  status: OrcamentoStatus;
  criadoEm: string;
  arquivado?: boolean;
  atualizadoEm?: string;
}

export type AgendaStatus = "agendado" | "em_andamento" | "concluido" | "cancelado";

export interface Agendamento {
  id: string;
  clienteId: string;
  servicoId?: string;
  titulo: string;
  data: string; // ISO datetime
  observacoes?: string;
  status: AgendaStatus;
  valor?: number;
  arquivado?: boolean;
  atualizadoEm?: string;
}

export type LancamentoTipo = "entrada" | "saida";
export type PagamentoStatus = "recebido" | "pendente" | "vencido";
export interface Lancamento {
  id: string;
  tipo: LancamentoTipo;
  descricao: string;
  valor: number;
  data: string;
  categoria?: string;
  pago?: boolean;
  vencimento?: string;
  origemTipo?: "orcamento" | "agendamento" | "manual";
  origemId?: string;
  arquivado?: boolean;
  atualizadoEm?: string;
}

export interface Empresa {
  nome: string;
  cnpj?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  endereco?: string;
  redesSociais?: string;
  logoDataUrl?: string;
  temaPdf?: PdfTema;
  corPdf?: string; // hex, ex: "#0b1b3d"
}

export type PdfTema = "classico" | "moderno" | "executivo" | "simples";

export interface ModeloDescricao {
  id: string;
  nome: string;
  conteudo: string;
  favorito?: boolean;
  criadoEm: string;
}

export type HistoricoEntidade =
  | "cliente" | "servico" | "orcamento" | "agendamento" | "lancamento" | "empresa";

export interface HistoricoEntry {
  id: string;
  entidade: HistoricoEntidade;
  entidadeId: string;
  entidadeNome: string;
  acao: "criado" | "editado" | "arquivado" | "restaurado" | "excluido" | "status";
  campo?: string;
  antes?: string;
  depois?: string;
  data: string;
  usuario: string;
}

export interface DB {
  clientes: Cliente[];
  servicos: Servico[];
  orcamentos: Orcamento[];
  proximoOrcamento: number;
  agendamentos: Agendamento[];
  lancamentos: Lancamento[];
  empresa: Empresa;
  historico: HistoricoEntry[];
  modelos: ModeloDescricao[];
}

const KEY = "gep_db_v3";
const USUARIO_PADRAO = "Operador";

const modeloPadrao = (nome: string, conteudo: string): ModeloDescricao => ({
  id: uid(), nome, conteudo, criadoEm: new Date().toISOString(),
});

const MODELOS_SEED: ModeloDescricao[] = [
  modeloPadrao(
    "Limpeza Técnica de Vidros",
    "• Limpeza técnica de todos os vidros internos e externos.\n• Remoção de manchas de chuva, poeira, gordura e resíduos superficiais.\n• Limpeza de esquadrias e acabamentos próximos aos vidros.\n• Utilização de produtos profissionais específicos para vidros.\n• Execução realizada por equipe especializada utilizando equipamentos adequados e procedimentos seguros.",
  ),
  modeloPadrao(
    "Limpeza Pós-Obra",
    "• Remoção de poeira, respingos de tinta, cimento e demais resíduos da obra.\n• Limpeza profunda de pisos, paredes, vidros, esquadrias e bancadas.\n• Higienização de banheiros, cozinhas e áreas comuns.\n• Aplicação de produtos profissionais e equipamentos adequados.\n• Equipe técnica especializada com todos os EPIs necessários.",
  ),
  modeloPadrao(
    "Limpeza de Fachadas",
    "• Limpeza técnica completa da fachada (vidros, pastilhas, ACM e/ou pintura).\n• Remoção de poeira, fuligem e poluição urbana.\n• Trabalho em altura com equipe especializada NR-35 e NR-18.\n• Utilização de cadeiras suspensas, andaimes ou balancins conforme projeto.\n• Produtos específicos para cada tipo de revestimento.",
  ),
  modeloPadrao(
    "Limpeza Comercial",
    "• Higienização completa de salas, recepção, banheiros e áreas comuns.\n• Limpeza de mobiliário, vidros, pisos e superfícies de contato.\n• Recolhimento e descarte adequado de resíduos.\n• Reposição de materiais de higiene (quando contratado).\n• Equipe uniformizada e treinada.",
  ),
  modeloPadrao(
    "Limpeza Residencial",
    "• Limpeza geral de todos os cômodos da residência.\n• Higienização de banheiros, cozinha e áreas de serviço.\n• Limpeza de vidros internos, espelhos e superfícies.\n• Aspiração e lavagem de pisos.\n• Organização leve dos ambientes.",
  ),
  modeloPadrao(
    "Limpeza de Sacadas e Varandas",
    "• Limpeza de pisos, paredes e guarda-corpos.\n• Higienização de vidros e esquadrias.\n• Remoção de poeira, manchas e resíduos externos.\n• Produtos apropriados para áreas externas.",
  ),
  modeloPadrao(
    "Limpeza de Vitrines",
    "• Limpeza técnica de vitrines internas e externas.\n• Remoção de manchas, gordura, poeira e marcas de chuva.\n• Polimento final para acabamento cristalino.\n• Equipe treinada para atendimento em horários comerciais.",
  ),
  modeloPadrao(
    "Limpeza de Academias",
    "• Higienização completa de aparelhos, halteres e equipamentos.\n• Limpeza de pisos, espelhos, vidros e bancadas.\n• Desinfecção de banheiros e vestiários.\n• Produtos bactericidas e procedimentos sanitários.",
  ),
];

const seed: DB = {
  clientes: [],
  servicos: [
    { id: uid(), nome: "Limpeza Técnica de Vidros", valor: 350, tempoEstimado: "3h" },
    { id: uid(), nome: "Limpeza Pós-Obra", valor: 800, tempoEstimado: "6h" },
    { id: uid(), nome: "Limpeza de Fachadas", valor: 1200, tempoEstimado: "8h" },
    { id: uid(), nome: "Limpeza Comercial", valor: 500, tempoEstimado: "4h" },
    { id: uid(), nome: "Limpeza Residencial", valor: 280, tempoEstimado: "3h" },
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
};

function load(): DB {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw);
    return { ...seed, ...parsed };
  } catch {
    return seed;
  }
}

let state: DB = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

function logHist(e: Omit<HistoricoEntry, "id" | "data" | "usuario">) {
  const entry: HistoricoEntry = {
    ...e, id: uid(), data: new Date().toISOString(), usuario: USUARIO_PADRAO,
  };
  state = { ...state, historico: [entry, ...state.historico].slice(0, 1000) };
}

function diffPatch<T extends Record<string, any>>(
  before: T, patch: Partial<T>,
): { campo: string; antes: string; depois: string }[] {
  const out: { campo: string; antes: string; depois: string }[] = [];
  for (const k of Object.keys(patch)) {
    const a = before[k]; const b = (patch as any)[k];
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

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return state;
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, getSnapshot, () => seed);
}

/* ---------- Auto-financeiro helpers ---------- */
function nomeClienteLocal(id: string) {
  return state.clientes.find((c) => c.id === id)?.nome ?? "Cliente";
}

function criarReceitaDeOrcamento(o: Orcamento) {
  const valor = totalOrcamento(o);
  if (valor <= 0) return;
  const venc = new Date(); venc.setDate(venc.getDate() + 15);
  const l: Lancamento = {
    id: uid(), tipo: "entrada",
    descricao: `Orçamento ORC-${String(o.numero).padStart(6, "0")} — ${nomeClienteLocal(o.clienteId)}`,
    valor, data: new Date().toISOString(),
    categoria: "Orçamento aprovado",
    pago: false, vencimento: venc.toISOString(),
    origemTipo: "orcamento", origemId: o.id,
  };
  state = { ...state, lancamentos: [l, ...state.lancamentos] };
  logHist({
    entidade: "lancamento", entidadeId: l.id, entidadeNome: l.descricao,
    acao: "criado", campo: "automático", depois: "Previsão de receita gerada",
  });
}

function criarReceitaDeAgendamento(a: Agendamento) {
  const valor = a.valor ?? 0;
  if (valor <= 0) return;
  const l: Lancamento = {
    id: uid(), tipo: "entrada",
    descricao: `Serviço concluído — ${a.titulo} (${nomeClienteLocal(a.clienteId)})`,
    valor, data: new Date().toISOString(),
    categoria: "Serviço",
    pago: true, origemTipo: "agendamento", origemId: a.id,
  };
  state = { ...state, lancamentos: [l, ...state.lancamentos] };
  logHist({
    entidade: "lancamento", entidadeId: l.id, entidadeNome: l.descricao,
    acao: "criado", campo: "automático", depois: "Entrada gerada do agendamento",
  });
}

/* ---------- Mutations ---------- */
export const db = {
  /* Clientes */
  addCliente(c: Omit<Cliente, "id" | "criadoEm">) {
    const novo: Cliente = { ...c, id: uid(), criadoEm: new Date().toISOString() };
    state = { ...state, clientes: [novo, ...state.clientes] };
    logHist({ entidade: "cliente", entidadeId: novo.id, entidadeNome: novo.nome, acao: "criado" });
    persist();
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
    const novo = { ...atual, ...patch, atualizadoEm: new Date().toISOString() };
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
    const novo: Orcamento = { ...o, id: uid(), numero, criadoEm: new Date().toISOString(), status: "rascunho", arquivado: false };
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

  /* Histórico */
  limparHistorico() {
    state = { ...state, historico: [] };
    persist();
  },
};

export const totalOrcamento = (o: Orcamento) =>
  o.itens.reduce((sum, i) => sum + i.quantidade * i.valorUnit, 0);

export function statusPagamento(l: Lancamento): PagamentoStatus {
  if (l.pago) return "recebido";
  if (l.vencimento && new Date(l.vencimento) < new Date()) return "vencido";
  return "pendente";
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