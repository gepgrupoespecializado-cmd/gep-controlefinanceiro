import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { DB } from '@/types/models';

const writes: Array<{ table: string; rows: Record<string, unknown>[] }> = [];
let block: Promise<void> | null = null;
let fail = false;
mock.module('@/integrations/supabase/client', () => ({
  supabase: {
    from(table: string) {
      return {
        async upsert(rows: Record<string, unknown>[] | Record<string, unknown>) {
          if (table === 'customers' && block) await block;
          if (table === 'customers' && fail) return { error: { message: 'offline' } };
          writes.push({ table, rows: Array.isArray(rows) ? rows : [rows] });
          return { error: null };
        },
        delete: () => ({ in: async () => ({ error: null }) }),
      };
    },
  },
}));
const { sincronizarRelacional, resetRelacional } = await import('@/data/remote/relational-sync');
const sample = (name: string): DB => ({
  clientes: [{ id: name, nome: name, frequencia: 'avulso', criadoEm: '2026-10-08' }],
  servicos: [], orcamentos: [], agendamentos: [], relatorios: [], lancamentos: [], modelos: [], historico: [],
  proximoOrcamento: 1, proximoRelatorio: 1, empresa: { nome: 'GEP', cnpj: '', telefone: '', whatsapp: '', email: '', endereco: '', redesSociais: '', corPdf: '' },
});
beforeEach(() => { writes.length = 0; block = null; fail = false; resetRelacional(); });

describe('salvamento concorrente', () => {
  it('grava o novo cliente e orçamento recebidos durante uma gravação anterior e aguarda ambos', async () => {
    let release: () => void = () => {};
    block = new Promise<void>(resolve => { release = resolve; });
    const first = sincronizarRelacional('org-a', sample('anterior'), 'user');
    await Promise.resolve();
    const next = sample('novo');
    next.orcamentos = [{ id: 'orc-novo', numero: 1, clienteId: 'novo', itens: [{ descricao: 'Vidros', quantidade: 1, valorUnit: 250 }], descricaoServicos: 'Vidros', validadeDias: 7, formasPagamento: ['pix'], status: 'rascunho', criadoEm: '2026-10-08' }];
    let finished = false;
    const second = sincronizarRelacional('org-a', next, 'user').then(() => { finished = true; });
    await Promise.resolve();
    expect(finished).toBe(false);
    release();
    await Promise.all([first, second]);
    expect(writes.filter(w => w.table === 'customers').map(w => w.rows[0]?.nome)).toEqual(['anterior', 'novo']);
    expect(writes.some(w => w.table === 'quotes' && w.rows[0]?.legacy_id === 'orc-novo')).toBe(true);
    expect(writes.some(w => w.table === 'quote_items' && w.rows[0]?.valor_unit === 250)).toBe(true);
  });
  it('propaga falha e permite repetir o mesmo snapshot', async () => {
    fail = true;
    await expect(sincronizarRelacional('org-a', sample('novo'), 'user')).rejects.toThrow('customers');
    fail = false;
    await sincronizarRelacional('org-a', sample('novo'), 'user');
    expect(writes.some(w => w.table === 'customers' && w.rows[0]?.nome === 'novo')).toBe(true);
  });
  it('mantém o escopo de cada empresa nas chamadas concorrentes', async () => {
    await Promise.all([sincronizarRelacional('org-a', sample('a'), 'user-a'), sincronizarRelacional('org-b', sample('b'), 'user-b')]);
    expect(writes.filter(w => w.table === 'customers').map(w => w.rows[0]?.organization_id)).toEqual(['org-a', 'org-b']);
  });
});