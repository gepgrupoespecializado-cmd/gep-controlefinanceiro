/**
 * Contratos de repositório (Etapa 01).
 *
 * São apenas interfaces: definem o que a Etapa 02 precisará implementar contra
 * um banco remoto. A implementação atual (src/data/local) usa o armazenamento
 * do navegador e mantém o formato gep_db_v3.
 *
 * Nesta etapa as operações são síncronas para preservar exatamente o
 * comportamento das telas. A Etapa 02 introduzirá variantes assíncronas de
 * forma controlada.
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
} from "../../types/models";

/** Escopo da consulta: identifica a empresa dona dos registros. */
export interface RepositoryScope {
  empresaId: string;
}

export interface Repository<T extends { id: string }, TCreate = Omit<T, "id">> {
  list(scope: RepositoryScope): T[];
  getById(scope: RepositoryScope, id: string): T | undefined;
  create(scope: RepositoryScope, input: TCreate): string;
  update(scope: RepositoryScope, id: string, patch: Partial<T>): void;
  archive(scope: RepositoryScope, id: string, arquivado?: boolean): void;
  remove(scope: RepositoryScope, id: string): void;
}

export type ClienteRepository = Repository<Cliente, Omit<Cliente, "id" | "criadoEm">>;
export type ServicoRepository = Repository<Servico>;
export type AgendamentoRepository = Repository<Agendamento>;
export type LancamentoRepository = Repository<Lancamento>;

export interface OrcamentoRepository
  extends Repository<Orcamento, Omit<Orcamento, "id" | "numero" | "criadoEm">> {
  /** Próximo número sequencial. Na Etapa 02 será resolvido por empresa no banco. */
  nextNumber(scope: RepositoryScope): number;
}

export interface RelatorioRepository
  extends Repository<Relatorio, Omit<Relatorio, "id" | "numero" | "criadoEm">> {
  nextNumber(scope: RepositoryScope): number;
  listByCliente(scope: RepositoryScope, clienteId: string): Relatorio[];
}

export type ModeloRepository = Repository<ModeloDescricao, Omit<ModeloDescricao, "id" | "criadoEm">>;

/** A empresa é um registro único por conta. */
export interface EmpresaRepository {
  get(scope: RepositoryScope): Empresa;
  save(scope: RepositoryScope, patch: Partial<Empresa>): void;
}

/** Auditoria: somente escrita e leitura, sem edição. */
export interface HistoricoRepository {
  list(scope: RepositoryScope): HistoricoEntry[];
  clear(scope: RepositoryScope): void;
}
