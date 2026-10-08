import { describe, expect, it } from 'bun:test';
import { recoverPending } from '@/data/pending-changes';
import type { DB } from '@/types/models';

function sample(): DB {
  return { clientes: [], servicos: [], orcamentos: [], agendamentos: [], lancamentos: [], relatorios: [], modelos: [], historico: [], proximoOrcamento: 1, proximoRelatorio: 1, empresa: { nome: 'GEP', cnpj: '', telefone: '', whatsapp: '', email: '', endereco: '', redesSociais: '', corPdf: '' } };
}
describe('recuperação após fechar antes de enviar', () => {
  it('recupera cliente e orçamento locais sem substituir registros novos de outro dispositivo', () => {
    const base = sample();
    const snapshot = sample();
    snapshot.clientes = [{ id: 'local', nome: 'Cliente local', frequencia: 'avulso', criadoEm: '2026-10-08' }];
    snapshot.orcamentos = [{ id: 'orc-local', numero: 2, clienteId: 'local', itens: [{ descricao: 'Serviço', quantidade: 2, valorUnit: 300 }], descricaoServicos: 'Serviço', validadeDias: 7, formasPagamento: ['pix'], status: 'rascunho', criadoEm: '2026-10-08' }];
    const remote = sample();
    remote.clientes = [{ id: 'remoto', nome: 'Cliente remoto', frequencia: 'mensal', criadoEm: '2026-10-08' }];
    remote.proximoOrcamento = 10;
    const recovered = recoverPending(remote, { base, snapshot });
    expect(recovered.clientes.map(c => c.id)).toEqual(['local', 'remoto']);
    expect(recovered.orcamentos[0]?.itens[0]?.valorUnit).toBe(300);
    expect(recovered.proximoOrcamento).toBe(10);
    expect(recoverPending(recovered, { base, snapshot })).toEqual(recovered);
  });
  it('não reverte alteração remota de registro que não foi editado localmente', () => {
    const base = sample();
    base.clientes = [{ id: 'a', nome: 'Anterior', frequencia: 'avulso', criadoEm: '2026-10-08' }];
    const remote = { ...base, clientes: [{ ...base.clientes[0], nome: 'Atualizado remoto' }] };
    expect(recoverPending(remote, { base, snapshot: base }).clientes[0]?.nome).toBe('Atualizado remoto');
  });
  it('reaplica remoções locais sem apagar novos registros remotos', () => {
    const base = sample();
    base.clientes = [{ id: 'a', nome: 'Removido', frequencia: 'avulso', criadoEm: '2026-10-08' }];
    expect(recoverPending(base, { base, snapshot: sample() }).clientes).toEqual([]);
  });
});