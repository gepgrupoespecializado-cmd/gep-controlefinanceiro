import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { DB } from '@/types/models';

const writes: Array<{ table: string; rows: Record<string, unknown>[] }> = [];
let block: Promise<void> | null = null;
let fail = false;
let failQuote = false;
let sequence = 402;
const savedNumbers = new Map<string, number>();
mock.module('@/integrations/supabase/client', () => ({
  supabase: {
    from(table: string) {
      return {
        upsert(rows: Record<string, unknown>[] | Record<string, unknown>) {
          const execute = async () => {
            if (table === 'customers' && block) await block;
            if ((table === 'customers' && fail) || (table === 'quotes' && failQuote)) return { data: null, error: { message: 'offline' } };
            const batch = Array.isArray(rows) ? rows : [rows];
            writes.push({ table, rows: batch });
            const data = batch.map(row => {
              if (table !== 'quotes') return row;
              const key = `${row.organization_id}:${row.id}`;
              const numero = savedNumbers.get(key) ?? (Number(row.numero) > 0 ? Number(row.numero) : ++sequence);
              savedNumbers.set(key, numero);
              return { id: row.id, numero };
            });
            return { data, error: null };
          };
          return { then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => execute().then(resolve, reject), select: execute };
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
  proximoOrcamento: 1, proximoRelatorio: 1, empresa: { nome: 'Empresa Teste', cnpj: '', telefone: '', whatsapp: '', email: '', endereco: '', redesSociais: '', corPdf: '' },
});
beforeEach(() => { writes.length = 0; block = null; fail = false; failQuote = false; sequence = 402; savedNumbers.clear(); resetRelacional(); });

describe('salvamento concorrente', () => {
  it('recebe 403 do banco, preserva 402 e reaproveita o número confirmado em snapshot concorrente', async () => {
    const snapshot = sample('cliente-numero');
    const quote = { id: 'quote-pending-unique', numero: 0, clienteId: 'cliente-numero', itens: [], descricaoServicos: 'Serviço', validadeDias: 7, formasPagamento: ['pix'] as const, status: 'rascunho' as const, criadoEm: '2026-10-10' };
    snapshot.orcamentos = [{ ...quote, formasPagamento: ['pix'] }, { ...quote, id: 'quote-old-unique', numero: 402, formasPagamento: ['pix'] }];
    const first = await sincronizarRelacional('org-number-test', snapshot, 'user');
    expect(first.get(quote.id)).toBe(403);
    expect(first.get('quote-old-unique')).toBe(402);
    const edited = { ...snapshot, orcamentos: snapshot.orcamentos.map(o => ({ ...o, observacoes: 'Edição concorrente' })) };
    const second = await sincronizarRelacional('org-number-test', edited, 'user');
    expect(second.get(quote.id)).toBe(403);
    expect(sequence).toBe(403);
    expect(writes.filter(w => w.table === 'quotes').at(-1)?.rows[0]?.numero).toBe(403);
  });
  it('falha de orçamento não confirma número e a repetição recebe o próximo', async () => {
    const snapshot = sample('retry-number');
    snapshot.orcamentos = [{ id: 'quote-retry-unique', numero: 0, clienteId: 'retry-number', itens: [], descricaoServicos: '', validadeDias: 7, formasPagamento: ['pix'], status: 'rascunho', criadoEm: '2026-10-10' }];
    failQuote = true;
    await expect(sincronizarRelacional('org-number-retry', snapshot, 'user')).rejects.toThrow('quotes');
    expect(sequence).toBe(402);
    failQuote = false;
    const numbers = await sincronizarRelacional('org-number-retry', snapshot, 'user');
    expect(numbers.get('quote-retry-unique')).toBe(403);
  });
  it('salva o nome cadastrado e a edição nas configurações da mesma empresa', async () => {
    const snapshot = sample('cliente');
    await sincronizarRelacional('org-a', snapshot, 'user');
    await sincronizarRelacional('org-a', { ...snapshot, empresa: { ...snapshot.empresa, nome: 'Empresa Renomeada' } }, 'user');
    expect(writes.filter(w => w.table === 'organization_settings').map(w => w.rows[0]?.empresa)).toEqual([
      snapshot.empresa,
      { ...snapshot.empresa, nome: 'Empresa Renomeada' },
    ]);
    expect(writes.filter(w => w.table === 'organization_settings').every(w => w.rows[0]?.organization_id === 'org-a')).toBe(true);
  });
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