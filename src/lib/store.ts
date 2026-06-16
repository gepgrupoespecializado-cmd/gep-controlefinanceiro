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
}

export interface Servico {
  id: string;
  nome: string;
  descricao?: string;
  valor: number;
  tempoEstimado?: string;
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
  status: OrcamentoStatus;
  criadoEm: string;
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
}

export type LancamentoTipo = "entrada" | "saida";
export interface Lancamento {
  id: string;
  tipo: LancamentoTipo;
  descricao: string;
  valor: number;
  data: string;
  categoria?: string;
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
}

export interface DB {
  clientes: Cliente[];
  servicos: Servico[];
  orcamentos: Orcamento[];
  proximoOrcamento: number;
  agendamentos: Agendamento[];
  lancamentos: Lancamento[];
  empresa: Empresa;
}

const KEY = "gep_db_v1";

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
  },
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

/* ---------- Mutations ---------- */
export const db = {
  /* Clientes */
  addCliente(c: Omit<Cliente, "id" | "criadoEm">) {
    state = {
      ...state,
      clientes: [{ ...c, id: uid(), criadoEm: new Date().toISOString() }, ...state.clientes],
    };
    persist();
  },
  updateCliente(id: string, patch: Partial<Cliente>) {
    state = {
      ...state,
      clientes: state.clientes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    };
    persist();
  },
  removeCliente(id: string) {
    state = { ...state, clientes: state.clientes.filter((c) => c.id !== id) };
    persist();
  },

  /* Serviços */
  addServico(s: Omit<Servico, "id">) {
    state = { ...state, servicos: [{ ...s, id: uid() }, ...state.servicos] };
    persist();
  },
  updateServico(id: string, patch: Partial<Servico>) {
    state = {
      ...state,
      servicos: state.servicos.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    };
    persist();
  },
  removeServico(id: string) {
    state = { ...state, servicos: state.servicos.filter((s) => s.id !== id) };
    persist();
  },

  /* Orçamentos */
  addOrcamento(o: Omit<Orcamento, "id" | "numero" | "criadoEm">) {
    const numero = state.proximoOrcamento;
    state = {
      ...state,
      proximoOrcamento: numero + 1,
      orcamentos: [
        { ...o, id: uid(), numero, criadoEm: new Date().toISOString() },
        ...state.orcamentos,
      ],
    };
    persist();
  },
  updateOrcamento(id: string, patch: Partial<Orcamento>) {
    state = {
      ...state,
      orcamentos: state.orcamentos.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    };
    persist();
  },
  removeOrcamento(id: string) {
    state = { ...state, orcamentos: state.orcamentos.filter((o) => o.id !== id) };
    persist();
  },
  duplicarOrcamento(id: string) {
    const o = state.orcamentos.find((x) => x.id === id);
    if (!o) return;
    const numero = state.proximoOrcamento;
    state = {
      ...state,
      proximoOrcamento: numero + 1,
      orcamentos: [
        { ...o, id: uid(), numero, criadoEm: new Date().toISOString(), status: "rascunho" },
        ...state.orcamentos,
      ],
    };
    persist();
  },

  /* Agenda */
  addAgendamento(a: Omit<Agendamento, "id">) {
    state = { ...state, agendamentos: [{ ...a, id: uid() }, ...state.agendamentos] };
    persist();
  },
  updateAgendamento(id: string, patch: Partial<Agendamento>) {
    state = {
      ...state,
      agendamentos: state.agendamentos.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    };
    persist();
  },
  removeAgendamento(id: string) {
    state = { ...state, agendamentos: state.agendamentos.filter((a) => a.id !== id) };
    persist();
  },

  /* Financeiro */
  addLancamento(l: Omit<Lancamento, "id">) {
    state = { ...state, lancamentos: [{ ...l, id: uid() }, ...state.lancamentos] };
    persist();
  },
  removeLancamento(id: string) {
    state = { ...state, lancamentos: state.lancamentos.filter((l) => l.id !== id) };
    persist();
  },

  /* Empresa */
  updateEmpresa(patch: Partial<Empresa>) {
    state = { ...state, empresa: { ...state.empresa, ...patch } };
    persist();
  },
};

export const totalOrcamento = (o: Orcamento) =>
  o.itens.reduce((sum, i) => sum + i.quantidade * i.valorUnit, 0);

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