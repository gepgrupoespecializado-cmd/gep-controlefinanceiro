/**
 * Modelos de domínio do sistema (Etapa 01).
 *
 * Somente tipos e rótulos estáveis. Nenhuma dependência de armazenamento,
 * React ou browser — para que a Etapa 02 possa reaproveitar integralmente.
 */

export type ClienteFreq = "semanal" | "quinzenal" | "mensal" | "trimestral" | "avulso";

export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  /** CPF ou CNPJ do cliente (exibido no PDF quando informado). */
  documento?: string;
  endereco?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
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

export type FormaPagamento =
  | "pix"
  | "dinheiro"
  | "debito"
  | "credito"
  | "transferencia"
  | "boleto"
  | "outro";

export const formaPagamentoLabel: Record<FormaPagamento, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  debito: "Cartão de Débito",
  credito: "Cartão de Crédito",
  transferencia: "Transferência Bancária",
  boleto: "Boleto",
  outro: "Outro",
};

export type SituacaoPagamento = "pago" | "parcial" | "pendente";

export interface OrcamentoItem {
  servicoId?: string;
  descricao: string;
  quantidade: number;
  valorUnit: number;
  /** Categoria comercial (ex.: "Limpeza Especializada de Vidros"). */
  categoria?: string;
  /** Unidade de medida do item (Serviço, m², Janela...). */
  unidade?: string;
  /** Escopo resumido do item, exibido na coluna ESCOPO do PDF. */
  escopo?: string;
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
  formasPagamento: FormaPagamento[];
  status: OrcamentoStatus;
  criadoEm: string;
  arquivado?: boolean;
  atualizadoEm?: string;
  /** Proposta comercial (novo modelo) — itens do escopo do serviço. */
  escopo?: string[];
  /** Itens que não fazem parte da proposta. */
  naoIncluso?: string[];
  /** Condições de execução do serviço. */
  condicoes?: string[];
  /** Mensagem curta de diferencial GEP. */
  diferencial?: string;
  /** Desconto em R$ aplicado sobre o subtotal. */
  desconto?: number;
  /** Agendamento previsto (opcional). */
  dataPrevista?: string; // YYYY-MM-DD
  horaPrevista?: string; // HH:MM
  /** Registro fotográfico (data URLs). */
  fotosAntes?: string[];
  fotosDepois?: string[];
  /** Versão do documento — incrementa a cada alteração. */
  versao?: number;
}

export type AgendaStatus = "agendado" | "em_andamento" | "concluido" | "cancelado";

export type Recorrencia =
  | "nenhuma"
  | "semanal"
  | "quinzenal"
  | "mensal"
  | "trimestral"
  | "personalizada";

export const recorrenciaDias: Record<Recorrencia, number> = {
  nenhuma: 0,
  semanal: 7,
  quinzenal: 14,
  mensal: 30,
  trimestral: 90,
  personalizada: 0,
};

export const recorrenciaLabel: Record<Recorrencia, string> = {
  nenhuma: "Sem recorrência",
  semanal: "Retorno semanal",
  quinzenal: "Retorno quinzenal",
  mensal: "Retorno mensal",
  trimestral: "Retorno trimestral",
  personalizada: "Retorno personalizado",
};

export interface Agendamento {
  id: string;
  clienteId: string;
  servicoId?: string;
  titulo: string;
  data: string; // ISO datetime
  observacoes?: string;
  status: AgendaStatus;
  valor?: number;
  horaInicio?: string;
  horaFim?: string;
  responsavel?: string;
  endereco?: string;
  orcamentoId?: string;
  recorrencia?: Recorrencia;
  intervaloDias?: number;
  relatorioId?: string;
  arquivado?: boolean;
  atualizadoEm?: string;
}

export type RelatorioStatus = "sucesso" | "observacoes" | "retorno";

export const relatorioStatusLabel: Record<RelatorioStatus, string> = {
  sucesso: "Concluído com Sucesso",
  observacoes: "Concluído com Observações",
  retorno: "Retorno Programado",
};

export interface Relatorio {
  id: string;
  numero: number;
  agendamentoId: string;
  clienteId: string;
  orcamentoId?: string;
  servicoExecutado: string;
  descricao: string;
  observacoes?: string;
  status: RelatorioStatus;
  dataExecucao: string;
  horaInicio?: string;
  horaFim?: string;
  responsavel?: string;
  valor?: number;
  fotosAntes: string[];
  fotosDurante: string[];
  fotosDepois: string[];
  assinaturaTecnico?: string;
  assinaturaCliente?: string;
  criadoEm: string;
  arquivado?: boolean;
  // ===== Encerramento financeiro =====
  valorOrcamento?: number;
  valorRecebido?: number;
  formasPagamentoRecebimento?: FormaPagamento[];
  parcelas?: number;
  taxaCartao?: number;
  observacoesFinanceiras?: string;
  dataPagamento?: string;
  situacaoPagamento?: SituacaoPagamento;
  recebidoPor?: string;
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

export type PdfTema =
  | "azul_corporativo"
  | "azul_escuro"
  | "verde_empresarial"
  | "cinza_executivo"
  | "preto_premium"
  // legados (mantidos para compatibilidade)
  | "classico"
  | "moderno"
  | "executivo"
  | "simples"
  // 12 cores anuais (campanhas nacionais + corporativas)
  | "mes_01" | "mes_02" | "mes_03" | "mes_04" | "mes_05" | "mes_06"
  | "mes_07" | "mes_08" | "mes_09" | "mes_10" | "mes_11" | "mes_12";

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
  corSecundariaPdf?: string; // hex — títulos/bordas/destaques
  /** Modo do modelo mensal do PDF (12 cores anuais). */
  pdfMesModo?: "auto" | "manual" | "off";
  /** Mês selecionado manualmente (1-12) quando pdfMesModo = "manual". */
  pdfMesManual?: number;
  /** Configuração de Custos da Empresa — usada na Calculadora de Precificação. */
  custosPadrao?: {
    valorHora?: number;
    margemLucro?: number; // %
    taxaCartao?: number; // %
    custoOperacionalMensal?: number;
    valorKm?: number;
    valorMinimoAtendimento?: number;
    imposto?: number; // %
  };
}

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
  relatorios: Relatorio[];
  proximoRelatorio: number;
}
