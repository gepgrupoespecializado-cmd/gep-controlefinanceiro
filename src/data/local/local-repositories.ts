/**
 * Adaptador local dos repositórios (Etapa 01).
 *
 * Implementa os contratos de src/data/repositories/contracts.ts sobre o
 * armazenamento atual do navegador (chave gep_db_v3), delegando à fachada
 * src/lib/store.ts para preservar exatamente o comportamento existente:
 * auditoria, numeração, receita automática, recorrência e sincronização
 * financeira continuam sendo aplicadas pelas mesmas funções de hoje.
 *
 * O parâmetro `scope` ainda não filtra nada porque o app é monoempresa e
 * local; ele existe para que a Etapa 02 substitua este adaptador por um de
 * banco remoto sem alterar as chamadas.
 */

import { db, getDBSnapshot, relatorios as relatoriosFacade } from "../../lib/store";
import type {
  AgendamentoRepository,
  ClienteRepository,
  EmpresaRepository,
  HistoricoRepository,
  LancamentoRepository,
  ModeloRepository,
  OrcamentoRepository,
  RelatorioRepository,
  ServicoRepository,
} from "../repositories/contracts";

export const clienteRepositoryLocal: ClienteRepository = {
  list: () => getDBSnapshot().clientes,
  getById: (_s, id) => getDBSnapshot().clientes.find((c) => c.id === id),
  create: (_s, input) => db.addCliente(input),
  update: (_s, id, patch) => db.updateCliente(id, patch),
  archive: (_s, id, arquivado = true) => db.arquivarCliente(id, arquivado),
  remove: (_s, id) => db.removeCliente(id),
};

export const servicoRepositoryLocal: ServicoRepository = {
  list: () => getDBSnapshot().servicos,
  getById: (_s, id) => getDBSnapshot().servicos.find((x) => x.id === id),
  create: (_s, input) => {
    db.addServico(input);
    return getDBSnapshot().servicos[0]?.id ?? "";
  },
  update: (_s, id, patch) => db.updateServico(id, patch),
  archive: (_s, id, arquivado = true) => db.arquivarServico(id, arquivado),
  remove: (_s, id) => db.removeServico(id),
};

export const orcamentoRepositoryLocal: OrcamentoRepository = {
  list: () => getDBSnapshot().orcamentos,
  getById: (_s, id) => getDBSnapshot().orcamentos.find((x) => x.id === id),
  create: (_s, input) => {
    db.addOrcamento(input);
    return getDBSnapshot().orcamentos[0]?.id ?? "";
  },
  update: (_s, id, patch) => db.updateOrcamento(id, patch),
  archive: (_s, id, arquivado = true) => db.arquivarOrcamento(id, arquivado),
  remove: (_s, id) => db.removeOrcamento(id),
  nextNumber: () => getDBSnapshot().proximoOrcamento,
};

export const agendamentoRepositoryLocal: AgendamentoRepository = {
  list: () => getDBSnapshot().agendamentos,
  getById: (_s, id) => getDBSnapshot().agendamentos.find((x) => x.id === id),
  create: (_s, input) => {
    db.addAgendamento(input);
    return getDBSnapshot().agendamentos[0]?.id ?? "";
  },
  update: (_s, id, patch) => db.updateAgendamento(id, patch),
  archive: (_s, id, arquivado = true) => db.arquivarAgendamento(id, arquivado),
  remove: (_s, id) => db.removeAgendamento(id),
};

export const lancamentoRepositoryLocal: LancamentoRepository = {
  list: () => getDBSnapshot().lancamentos,
  getById: (_s, id) => getDBSnapshot().lancamentos.find((x) => x.id === id),
  create: (_s, input) => {
    db.addLancamento(input);
    return getDBSnapshot().lancamentos[0]?.id ?? "";
  },
  update: (_s, id, patch) => db.updateLancamento(id, patch),
  archive: (_s, id, arquivado = true) => db.arquivarLancamento(id, arquivado),
  remove: (_s, id) => db.removeLancamento(id),
};

export const relatorioRepositoryLocal: RelatorioRepository = {
  list: () => getDBSnapshot().relatorios,
  getById: (_s, id) => getDBSnapshot().relatorios.find((x) => x.id === id),
  create: (_s, input) => relatoriosFacade.add(input),
  update: (_s, id, patch) => relatoriosFacade.update(id, patch),
  archive: (_s, id, arquivado = true) => relatoriosFacade.update(id, { arquivado }),
  remove: (_s, id) => relatoriosFacade.update(id, { arquivado: true }),
  nextNumber: () => getDBSnapshot().proximoRelatorio,
  listByCliente: (_s, clienteId) => relatoriosFacade.porCliente(clienteId),
};

export const modeloRepositoryLocal: ModeloRepository = {
  list: () => getDBSnapshot().modelos,
  getById: (_s, id) => getDBSnapshot().modelos.find((x) => x.id === id),
  create: (_s, input) => {
    db.addModelo(input);
    return getDBSnapshot().modelos[0]?.id ?? "";
  },
  update: (_s, id, patch) => db.updateModelo(id, patch),
  archive: (_s, id) => db.removeModelo(id),
  remove: (_s, id) => db.removeModelo(id),
};

export const empresaRepositoryLocal: EmpresaRepository = {
  get: () => getDBSnapshot().empresa,
  save: (_s, patch) => db.updateEmpresa(patch),
};

export const historicoRepositoryLocal: HistoricoRepository = {
  list: () => getDBSnapshot().historico,
  clear: () => db.limparHistorico(),
};
