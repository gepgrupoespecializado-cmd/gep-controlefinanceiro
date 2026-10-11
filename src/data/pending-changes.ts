import type { DB } from '@/types/models';

export type PendingChanges = { base: DB; snapshot: DB };

const collections = ['clientes', 'servicos', 'orcamentos', 'agendamentos', 'lancamentos', 'relatorios', 'modelos', 'historico'] as const;

/** Replays only local changes, preserving unrelated changes made on another device. */
export function recoverPending(remote: DB, pending: PendingChanges): DB {
  const result = { ...remote };
  for (const key of collections) {
    const base = new Map(pending.base[key].map(row => [row.id, JSON.stringify(row)]));
    const local = new Map(pending.snapshot[key].map(row => [row.id, row]));
    const changed = pending.snapshot[key].filter(row => base.get(row.id) !== JSON.stringify(row));
    const changedIds = new Set(changed.map(row => row.id));
    const removed = new Set([...base.keys()].filter(id => !local.has(id)));
    // Each collection preserves its own domain type; assignments cannot mix collections.
    Object.assign(result, { [key]: [...changed, ...remote[key].filter(row => !changedIds.has(row.id) && !removed.has(row.id))] });
  }
  // A journal may predate the INSERT acknowledgement. Replay the edited content,
  // but never replace the database's confirmed document number with a placeholder.
  const remoteNumbers = new Map(remote.orcamentos.map(row => [row.id, row.numero]));
  result.orcamentos = result.orcamentos.map(row => {
    const confirmed = remoteNumbers.get(row.id);
    return confirmed !== undefined && confirmed > 0 ? { ...row, numero: confirmed } : row;
  });
  result.empresa = { ...remote.empresa };
  for (const key of Object.keys(pending.snapshot.empresa) as Array<keyof DB['empresa']>) {
    if (JSON.stringify(pending.base.empresa[key]) !== JSON.stringify(pending.snapshot.empresa[key])) {
      Object.assign(result.empresa, { [key]: pending.snapshot.empresa[key] });
    }
  }
  result.proximoOrcamento = Math.max(remote.proximoOrcamento, pending.snapshot.proximoOrcamento, ...result.orcamentos.map(row => row.numero + 1));
  result.proximoRelatorio = Math.max(remote.proximoRelatorio, pending.snapshot.proximoRelatorio);
  return result;
}