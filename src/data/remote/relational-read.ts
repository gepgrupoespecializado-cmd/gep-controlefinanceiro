/**
 * Leitura relacional (Etapa 03 — Fase B).
 *
 * Reconstrói exatamente o formato de estado esperado pelo aplicativo a partir
 * das tabelas próprias. Nenhuma tela conhece esta camada: ela devolve o mesmo
 * objeto que antes vinha do bloco JSON.
 *
 * Regra de identidade: o identificador lógico usado pelas telas e pelos PDFs é
 * `legacy_id` quando existe; caso contrário é o próprio UUID da linha. As
 * relações são remontadas com esses mesmos identificadores lógicos.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  Agendamento,
  Cliente,
  DB,
  Empresa,
  HistoricoEntry,
  Lancamento,
  ModeloDescricao,
  Orcamento,
  OrcamentoItem,
  Relatorio,
  Servico,
} from "@/types/models";

type Row = Record<string, any>;

const PAGE = 1000;

/** Identificador lógico de uma linha. */
function logico(row: Row): string {
  return (row["legacy_id"] as string | null) ?? String(row["id"]);
}

/** Referência lógica: prioriza o identificador antigo guardado na linha. */
function refLogica(legacy: unknown, uuid: unknown): string | undefined {
  if (typeof legacy === "string" && legacy) return legacy;
  if (typeof uuid === "string" && uuid) return uuid;
  return undefined;
}

function txt(v: unknown): string | undefined {
  return typeof v === "string" && v.length ? v : undefined;
}

function num(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function lista(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]) : [];
}

async function buscarTudo(tabela: string, org: string, ordem: string): Promise<Row[]> {
  const client = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (c: string, v: string) => {
          order: (c: string, o?: { ascending?: boolean }) => {
            range: (a: number, b: number) => Promise<{ data: Row[] | null; error: { message: string } | null }>;
          };
        };
      };
    };
  };
  const saida: Row[] = [];
  for (let inicio = 0; ; inicio += PAGE) {
    const { data, error } = await client
      .from(tabela)
      .select("*")
      .eq("organization_id", org)
      .order(ordem, { ascending: true })
      .range(inicio, inicio + PAGE - 1);
    if (error) throw new Error(`${tabela}: ${error.message}`);
    const lote = data ?? [];
    saida.push(...lote);
    if (lote.length < PAGE) break;
  }
  return saida;
}

function montarCliente(r: Row): Cliente {
  return {
    id: logico(r),
    nome: String(r["nome"] ?? ""),
    telefone: txt(r["telefone"]),
    whatsapp: txt(r["whatsapp"]),
    email: txt(r["email"]),
    documento: txt(r["documento"]),
    endereco: txt(r["endereco"]),
    cep: txt(r["cep"]),
    rua: txt(r["rua"]),
    numero: txt(r["numero"]),
    complemento: txt(r["complemento"]),
    bairro: txt(r["bairro"]),
    cidade: txt(r["cidade"]),
    estado: txt(r["estado"]),
    observacoes: txt(r["observacoes"]),
    frequencia: (r["frequencia"] ?? "avulso") as Cliente["frequencia"],
    criadoEm: (r["criado_em"] as string) ?? (r["created_at"] as string) ?? new Date().toISOString(),
    arquivado: !!r["arquivado"],
  };
}

function montarServico(r: Row): Servico {
  return {
    id: logico(r),
    nome: String(r["nome"] ?? ""),
    descricao: txt(r["descricao"]),
    valor: num(r["valor"]) ?? 0,
    tempoEstimado: txt(r["tempo_estimado"]),
    arquivado: !!r["arquivado"],
  };
}

function montarItem(r: Row): OrcamentoItem {
  return {
    servicoId: refLogica(r["service_legacy_id"], r["service_id"]),
    descricao: String(r["descricao"] ?? ""),
    quantidade: num(r["quantidade"]) ?? 1,
    valorUnit: num(r["valor_unit"]) ?? 0,
    categoria: txt(r["categoria"]),
    unidade: txt(r["unidade"]),
    escopo: txt(r["escopo"]),
  };
}

function montarOrcamento(r: Row, itens: OrcamentoItem[]): Orcamento {
  return {
    id: logico(r),
    numero: num(r["numero"]) ?? 1,
    clienteId: refLogica(r["customer_legacy_id"], r["customer_id"]) ?? "",
    itens,
    prazo: txt(r["prazo"]),
    observacoes: txt(r["observacoes"]),
    descricaoServicos: String(r["descricao_servicos"] ?? ""),
    validadeDias: num(r["validade_dias"]) ?? 15,
    formasPagamento: lista(r["formas_pagamento"]) as Orcamento["formasPagamento"],
    status: (r["status"] ?? "rascunho") as Orcamento["status"],
    criadoEm: (r["criado_em"] as string) ?? (r["created_at"] as string) ?? new Date().toISOString(),
    arquivado: !!r["arquivado"],
    escopo: lista(r["escopo"]),
    naoIncluso: lista(r["nao_incluso"]),
    condicoes: lista(r["condicoes"]),
    diferencial: txt(r["diferencial"]),
    desconto: num(r["desconto"]),
    dataPrevista: txt(r["data_prevista"]),
    horaPrevista: txt(r["hora_prevista"]),
    fotosAntes: lista(r["fotos_antes"]),
    fotosDepois: lista(r["fotos_depois"]),
    versao: num(r["versao"]),
  };
}

function montarAgendamento(r: Row): Agendamento {
  return {
    id: logico(r),
    clienteId: refLogica(r["customer_legacy_id"], r["customer_id"]) ?? "",
    servicoId: refLogica(r["service_legacy_id"], r["service_id"]),
    titulo: String(r["titulo"] ?? ""),
    data: (r["data_texto"] as string) ?? (r["data"] as string) ?? "",
    observacoes: txt(r["observacoes"]),
    status: (r["status"] ?? "agendado") as Agendamento["status"],
    valor: num(r["valor"]),
    horaInicio: txt(r["hora_inicio"]),
    horaFim: txt(r["hora_fim"]),
    responsavel: txt(r["responsavel"]),
    endereco: txt(r["endereco"]),
    orcamentoId: refLogica(r["quote_legacy_id"], r["quote_id"]),
    recorrencia: (txt(r["recorrencia"]) ?? undefined) as Agendamento["recorrencia"],
    intervaloDias: num(r["intervalo_dias"]),
    relatorioId: refLogica(r["report_legacy_id"], r["report_id"]),
    arquivado: !!r["arquivado"],
  };
}

function montarRelatorio(r: Row, fotos: Row[]): Relatorio {
  const grupo = (tipo: string) =>
    fotos
      .filter((f) => f["tipo"] === tipo)
      .sort((a, b) => (num(a["posicao"]) ?? 0) - (num(b["posicao"]) ?? 0))
      .map((f) => String(f["conteudo"] ?? ""));
  return {
    id: logico(r),
    numero: num(r["numero"]) ?? 1,
    agendamentoId: refLogica(r["appointment_legacy_id"], r["appointment_id"]) ?? "",
    clienteId: refLogica(r["customer_legacy_id"], r["customer_id"]) ?? "",
    orcamentoId: refLogica(r["quote_legacy_id"], r["quote_id"]),
    servicoExecutado: String(r["servico_executado"] ?? ""),
    descricao: String(r["descricao"] ?? ""),
    observacoes: txt(r["observacoes"]),
    status: (r["status"] ?? "sucesso") as Relatorio["status"],
    dataExecucao: String(r["data_execucao"] ?? ""),
    horaInicio: txt(r["hora_inicio"]),
    horaFim: txt(r["hora_fim"]),
    responsavel: txt(r["responsavel"]),
    valor: num(r["valor"]),
    fotosAntes: grupo("antes"),
    fotosDurante: grupo("durante"),
    fotosDepois: grupo("depois"),
    assinaturaTecnico: txt(r["assinatura_tecnico"]),
    assinaturaCliente: txt(r["assinatura_cliente"]),
    criadoEm: (r["criado_em"] as string) ?? (r["created_at"] as string) ?? new Date().toISOString(),
    arquivado: !!r["arquivado"],
    valorOrcamento: num(r["valor_orcamento"]),
    valorRecebido: num(r["valor_recebido"]),
    formasPagamentoRecebimento: lista(
      r["formas_pagamento_recebimento"],
    ) as Relatorio["formasPagamentoRecebimento"],
    parcelas: num(r["parcelas"]),
    taxaCartao: num(r["taxa_cartao"]),
    observacoesFinanceiras: txt(r["observacoes_financeiras"]),
    dataPagamento: txt(r["data_pagamento"]),
    situacaoPagamento: (txt(r["situacao_pagamento"]) ?? undefined) as Relatorio["situacaoPagamento"],
    recebidoPor: txt(r["recebido_por"]),
  };
}

function montarLancamento(r: Row): Lancamento {
  const origemTipo = txt(r["origem_tipo"]) as Lancamento["origemTipo"];
  const origemUuid =
    origemTipo === "orcamento"
      ? r["origin_quote_id"]
      : origemTipo === "agendamento"
        ? r["origin_appointment_id"]
        : null;
  return {
    id: logico(r),
    tipo: (r["tipo"] ?? "entrada") as Lancamento["tipo"],
    descricao: String(r["descricao"] ?? ""),
    valor: num(r["valor"]) ?? 0,
    data: String(r["data"] ?? ""),
    categoria: txt(r["categoria"]),
    pago: r["pago"] === null || r["pago"] === undefined ? undefined : !!r["pago"],
    vencimento: txt(r["vencimento"]),
    origemTipo,
    origemId: refLogica(r["origem_legacy_id"], origemUuid),
    arquivado: !!r["arquivado"],
  };
}

function montarModelo(r: Row): ModeloDescricao {
  return {
    id: logico(r),
    nome: String(r["nome"] ?? ""),
    conteudo: String(r["conteudo"] ?? ""),
    favorito: !!r["favorito"],
    criadoEm: (r["criado_em"] as string) ?? (r["created_at"] as string) ?? new Date().toISOString(),
  };
}

function montarHistorico(r: Row): HistoricoEntry {
  return {
    id: logico(r),
    entidade: r["entidade"] as HistoricoEntry["entidade"],
    entidadeId: String(r["entidade_id"] ?? ""),
    entidadeNome: String(r["entidade_nome"] ?? ""),
    acao: r["acao"] as HistoricoEntry["acao"],
    campo: txt(r["campo"]),
    antes: txt(r["antes"]),
    depois: txt(r["depois"]),
    data: (r["data"] as string) ?? (r["created_at"] as string) ?? new Date().toISOString(),
    usuario: String(r["usuario"] ?? "Sistema"),
  };
}

export type SnapshotRelacional = { db: Partial<DB>; contagens: Record<string, number> };

/** Lê os contadores da empresa; devolve null quando não houver linha. */
export async function lerContadores(org: string): Promise<{ orcamento: number; relatorio: number }> {
  const { data, error } = await supabase
    .from("organization_counters")
    .select("tipo, proximo")
    .eq("organization_id", org);
  if (error) throw new Error(`organization_counters: ${error.message}`);
  const mapa = new Map((data ?? []).map((r) => [r.tipo as string, Number(r.proximo)]));
  return {
    orcamento: mapa.get("orcamento") ?? 1,
    relatorio: mapa.get("relatorio") ?? 1,
  };
}

/**
 * Reconstrói o estado completo da empresa a partir das tabelas próprias.
 * Lança erro quando alguma leitura essencial falha — quem chama decide o
 * caminho alternativo.
 */
export async function lerRelacional(org: string): Promise<SnapshotRelacional> {
  const [
    clientesRows,
    servicosRows,
    orcamentosRows,
    itensRows,
    agendamentosRows,
    relatoriosRows,
    fotosRows,
    lancamentosRows,
    modelosRows,
    historicoRows,
    contadores,
  ] = await Promise.all([
    buscarTudo("customers", org, "created_at"),
    buscarTudo("services", org, "created_at"),
    buscarTudo("quotes", org, "numero"),
    buscarTudo("quote_items", org, "posicao"),
    buscarTudo("appointments", org, "created_at"),
    buscarTudo("service_reports", org, "numero"),
    buscarTudo("report_photos", org, "posicao"),
    buscarTudo("financial_transactions", org, "created_at"),
    buscarTudo("description_templates", org, "created_at"),
    buscarTudo("audit_logs", org, "created_at"),
    lerContadores(org),
  ]);

  const { data: cfg } = await supabase
    .from("organization_settings")
    .select("empresa")
    .eq("organization_id", org)
    .maybeSingle();

  const itensPorOrcamento = new Map<string, Row[]>();
  for (const it of itensRows) {
    const k = String(it["quote_id"]);
    const arr = itensPorOrcamento.get(k);
    if (arr) arr.push(it);
    else itensPorOrcamento.set(k, [it]);
  }
  const fotosPorRelatorio = new Map<string, Row[]>();
  for (const f of fotosRows) {
    const k = String(f["report_id"]);
    const arr = fotosPorRelatorio.get(k);
    if (arr) arr.push(f);
    else fotosPorRelatorio.set(k, [f]);
  }

  const orcamentos = orcamentosRows.map((o) =>
    montarOrcamento(
      o,
      (itensPorOrcamento.get(String(o["id"])) ?? [])
        .sort((a, b) => (num(a["posicao"]) ?? 0) - (num(b["posicao"]) ?? 0))
        .map(montarItem),
    ),
  );
  const relatorios = relatoriosRows.map((r) =>
    montarRelatorio(r, fotosPorRelatorio.get(String(r["id"])) ?? []),
  );

  const db: Partial<DB> = {
    clientes: clientesRows.map(montarCliente),
    servicos: servicosRows.map(montarServico),
    orcamentos,
    proximoOrcamento: contadores.orcamento,
    agendamentos: agendamentosRows.map(montarAgendamento),
    lancamentos: lancamentosRows.map(montarLancamento),
    relatorios,
    proximoRelatorio: contadores.relatorio,
    modelos: modelosRows.map(montarModelo),
    historico: historicoRows.map(montarHistorico),
  };
  if (cfg?.empresa) db.empresa = cfg.empresa as unknown as Empresa;

  return {
    db,
    contagens: {
      clientes: clientesRows.length,
      servicos: servicosRows.length,
      orcamentos: orcamentosRows.length,
      itens: itensRows.length,
      agendamentos: agendamentosRows.length,
      relatorios: relatoriosRows.length,
      fotos: fotosRows.length,
      lancamentos: lancamentosRows.length,
      modelos: modelosRows.length,
      historico: historicoRows.length,
    },
  };
}

/* ---------- Conferência antes de virar a chave ---------- */

function soma(valores: Array<number | undefined>): number {
  return Math.round(valores.reduce<number>((t, v) => t + (v ?? 0), 0) * 100) / 100;
}

export type Divergencia = { campo: string; relacional: number; payload: number };

/**
 * Compara o estado reconstruído com o bloco JSON em quantidades e totais
 * críticos. Uma lista vazia significa equivalência.
 */
export function compararSnapshots(rel: Partial<DB>, payload: Partial<DB>): Divergencia[] {
  const n = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  const out: Divergencia[] = [];
  const cmp = (campo: string, a: number, b: number) => {
    if (a !== b) out.push({ campo, relacional: a, payload: b });
  };

  cmp("clientes", n(rel.clientes), n(payload.clientes));
  cmp("servicos", n(rel.servicos), n(payload.servicos));
  cmp("orcamentos", n(rel.orcamentos), n(payload.orcamentos));
  cmp("agendamentos", n(rel.agendamentos), n(payload.agendamentos));
  cmp("lancamentos", n(rel.lancamentos), n(payload.lancamentos));
  cmp("relatorios", n(rel.relatorios), n(payload.relatorios));
  cmp("modelos", n(rel.modelos), n(payload.modelos));
  cmp("historico", n(rel.historico), n(payload.historico));

  const itens = (d: Partial<DB>) =>
    (d.orcamentos ?? []).reduce((t, o) => t + (o.itens?.length ?? 0), 0);
  cmp("itens_orcamento", itens(rel), itens(payload));

  const fotos = (d: Partial<DB>) =>
    (d.relatorios ?? []).reduce(
      (t, r) =>
        t + (r.fotosAntes?.length ?? 0) + (r.fotosDurante?.length ?? 0) + (r.fotosDepois?.length ?? 0),
      0,
    );
  cmp("fotos_relatorio", fotos(rel), fotos(payload));

  const totalLancamentos = (d: Partial<DB>) => soma((d.lancamentos ?? []).map((l) => l.valor));
  cmp("total_lancamentos", totalLancamentos(rel), totalLancamentos(payload));

  const totalOrcamentos = (d: Partial<DB>) =>
    soma(
      (d.orcamentos ?? []).map((o) =>
        (o.itens ?? []).reduce((t, i) => t + (i.quantidade ?? 0) * (i.valorUnit ?? 0), 0),
      ),
    );
  cmp("total_orcamentos", totalOrcamentos(rel), totalOrcamentos(payload));

  const ids = (list: Array<{ id: string }> | undefined) => (list ?? []).map((x) => x.id).sort();
  const mesmosIds = (campo: string, a: string[], b: string[]) => {
    if (a.length === b.length && a.some((v, i) => v !== b[i])) {
      out.push({ campo: `ids_${campo}`, relacional: a.length, payload: b.length });
    }
  };
  mesmosIds("clientes", ids(rel.clientes), ids(payload.clientes));
  mesmosIds("orcamentos", ids(rel.orcamentos), ids(payload.orcamentos));
  mesmosIds("agendamentos", ids(rel.agendamentos), ids(payload.agendamentos));
  mesmosIds("relatorios", ids(rel.relatorios), ids(payload.relatorios));
  mesmosIds("lancamentos", ids(rel.lancamentos), ids(payload.lancamentos));

  return out;
}
