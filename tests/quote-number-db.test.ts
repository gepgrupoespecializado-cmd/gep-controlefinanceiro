import { describe, expect, it } from 'bun:test';
import { SQL } from 'bun';
import { readFileSync } from 'node:fs';

// Opt-in integration test, allowed only against a disposable localhost database.
const url = process.env.QUOTE_NUMBER_TEST_URL;
const allowed = url && new URL(url).hostname === '127.0.0.1' && new URL(url).port === '55439';
describe.skipIf(!allowed)('numeração real PostgreSQL em banco descartável', () => {
  it('mantém históricos, sequencia simultâneos, repete INSERT e preserva edição', async () => {
    if (!url || !allowed) return;
    const parsed = new URL(url);
    const connection = { adapter: 'postgres' as const, hostname: '127.0.0.1', port: 55439, username: parsed.username, database: parsed.pathname.slice(1), tls: false as const };
    const db = new SQL({ ...connection, max: 8 });
    try {
      await db.unsafe(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
        IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF; END $$;
        CREATE FUNCTION public.is_org_member(uuid) RETURNS boolean LANGUAGE sql AS 'SELECT true';
        CREATE TABLE public.quotes (id uuid PRIMARY KEY, organization_id uuid NOT NULL, numero integer, observacoes text);
        INSERT INTO public.quotes VALUES ('00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',402,'histórico'),
        ('00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001',273,'histórico com lacuna'),
        ('00000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002',7,'outra empresa');`);
      await db.unsafe(readFileSync('drizzle/migrations/0000_quote_number_on_insert.sql', 'utf8'));
      await db.unsafe(readFileSync('drizzle/migrations/0001_quote_number_uniqueness.sql', 'utf8'));
      const ids = ['00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000005'];
      const rows = await Promise.all(ids.map(id => db`INSERT INTO public.quotes(id,organization_id,numero) VALUES(${id},'10000000-0000-0000-0000-000000000001',0) RETURNING numero`));
      expect(rows.map(r => r[0].numero).sort()).toEqual([403, 404]);
      const retry = await db`INSERT INTO public.quotes(id,organization_id,numero) VALUES(${ids[0]},'10000000-0000-0000-0000-000000000001',0) ON CONFLICT(id) DO UPDATE SET numero=EXCLUDED.numero RETURNING numero`;
      expect(retry[0].numero).toBe(rows[0][0].numero);
      const edit = await db`UPDATE public.quotes SET numero=1, observacoes='editado' WHERE id=${ids[0]} RETURNING numero`;
      expect(edit[0].numero).toBe(rows[0][0].numero);
      const other = await db`INSERT INTO public.quotes(id,organization_id,numero) VALUES('00000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000002',0) RETURNING numero`;
      expect(other[0].numero).toBe(8);
      await expect(db`INSERT INTO public.quotes(id,organization_id,numero) VALUES('00000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000001',403)`).rejects.toThrow();
      const afterFailure = await db`INSERT INTO public.quotes(id,organization_id,numero) VALUES('00000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000001',0) RETURNING numero`;
      expect(afterFailure[0].numero).toBe(405);
      const fresh = new SQL(connection);
      try {
        const persisted = await fresh`SELECT numero FROM public.quotes WHERE id=${ids[0]}`;
        expect(persisted[0].numero).toBe(rows[0][0].numero);
        const historical = await fresh`SELECT numero FROM public.quotes WHERE observacoes LIKE 'histórico%' ORDER BY numero`;
        expect(historical.map(row => row.numero)).toEqual([273, 402]);
      } finally { await fresh.close(); }
    } finally { await db.close(); }
  });
});