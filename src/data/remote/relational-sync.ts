/**
 * Sincronização relacional (Etapa 03 — Fase A: espelho).
 *
 * O aplicativo continua operando sobre o estado em memória do store. Esta
 * camada observa esse estado e reflete cada registro nas tabelas próprias,
 * enviando apenas o que mudou. O bloco JSON (`app_data.payload`) continua
 * sendo gravado normalmente e permanece como fonte de leitura nesta fase.
 *
 * A primeira execução para uma empresa funciona como cópia inicial completa e
 * é idempotente: os identificadores são derivados de forma determinística, de
 * modo que rodar duas vezes não duplica nada.
 */
import { supabase } from "@/integrations/supabase/client";
import type { SyncScope } from "../cloud-sync";
import type { DB } from "@/types/models";
import {
  appointmentRow,
  auditRow,
  customerRow,
  quoteItemRows,
  quoteRow,
  reportPhotoRows,
  reportRow,
  serviceRow,
  settingsRow,
  templateRow,
  transactionRow,
  uuidFor,
  type Row,
} from "./mappers";

type TableName =
  | "customers"
  | "services"
  | "quotes"
  | "quote_items"
  | "appointments"
  | "service_reports"
  | "report_photos"
  | "financial_transactions"
  | "description_templates"
  | "audit_logs";

type Estado = Partial<Record<TableName, Map<string, string>>>;

let orgAtual: string | null = null;
let anterior: Estado = {};
let rodando = false;
let refazer = false;
let generation = 0;

export function resetRelacional() {
  generation++;
  rodando = false;
  refazer = false;
  orgAtual = null;
  anterior = {};
}

function indexar(rows: Row[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows) m.set(String(r["id"]), JSON.stringify(r));
  return m;
}

async function aplicar(
  scope: SyncScope,
  tabela: TableName,
  rows: Row[],
  apagarRemovidos = true,
) {
  scope.assertCurrent();
  const atual = indexar(rows);
  const antes = anterior[tabela] ?? new Map<string, string>();

  const novos: Row[] = [];
  for (const [id, json] of atual) {
    if (antes.get(id) !== json) novos.push(JSON.parse(json) as Row);
  }
  const removidos: string[] = [];
  for (const id of antes.keys()) if (!atual.has(id)) removidos.push(id);

  type Result = PromiseLike<{ error: { message: string } | null }> & {
    abortSignal: (signal: AbortSignal) => Result;
  };
  const client = supabase as unknown as {
    from: (t: string) => {
      upsert: (v: Row[], o?: { onConflict?: string }) => Result;
      delete: () => { in: (c: string, v: string[]) => Result };
    };
  };

  for (let i = 0; i < novos.length; i += 200) {
    const lote = novos.slice(i, i + 200);
    scope.assertCurrent();
    const { error } = await client
      .from(tabela)
      .upsert(lote, { onConflict: "id" })
      .abortSignal(scope.signal);
    scope.assertCurrent();
    if (error) {
      console.warn(`Não foi possível salvar ${tabela}.`, error.message);
      return false;
    }
  }

  if (apagarRemovidos && removidos.length) {
    for (let i = 0; i < removidos.length; i += 200) {
      scope.assertCurrent();
      const { error } = await client
        .from(tabela)
        .delete()
        .in("id", removidos.slice(i, i + 200))
        .abortSignal(scope.signal);
      scope.assertCurrent();
      if (error) {
        console.warn(
          `Não foi possível remover registros de ${tabela}.`,
          error.message,
        );
        return false;
      }
    }
  }

  scope.assertCurrent();
  anterior[tabela] = atual;
  return true;
}

async function salvarConfiguracoes(org: string, db: DB, scope: SyncScope) {
  scope.assertCurrent();
  const { error } = await supabase
    .from("organization_settings")
    .upsert(settingsRow(org, db.empresa) as never, {
      onConflict: "organization_id",
    })
    .abortSignal(scope.signal);
  scope.assertCurrent();
  if (error)
    console.warn(
      "Não foi possível salvar as configurações da empresa.",
      error.message,
    );
}

/**
 * Espelha o estado atual nas tabelas relacionais.
 * Chamadas concorrentes são serializadas: a última vence.
 */
export async function sincronizarRelacional(
  org: string,
  db: DB,
  userId: string | null,
  parentScope: SyncScope,
) {
  parentScope.assertCurrent();
  if (orgAtual !== org) {
    resetRelacional();
    orgAtual = org;
    anterior = {};
  }
  const started = generation;
  const isCurrent = () => started === generation && parentScope.isCurrent();
  const scope: SyncScope = {
    ...parentScope,
    isCurrent,
    assertCurrent: () => {
      parentScope.assertCurrent();
      if (started !== generation)
        throw new Error("Sincronização relacional substituída.");
    },
  };
  if (rodando) {
    refazer = true;
    return;
  }
  rodando = true;
  try {
    do {
      refazer = false;
      // Ordem: cadastros base -> documentos -> dependentes.
      await aplicar(
        scope,
        "customers",
        (db.clientes ?? []).map((c) => customerRow(org, c)),
      );
      await aplicar(
        scope,
        "services",
        (db.servicos ?? []).map((s) => serviceRow(org, s)),
      );
      await aplicar(
        scope,
        "quotes",
        (db.orcamentos ?? []).map((o) => quoteRow(org, o)),
      );
      await aplicar(
        scope,
        "quote_items",
        (db.orcamentos ?? []).flatMap((o) => quoteItemRows(org, o)),
      );
      await aplicar(
        scope,
        "appointments",
        (db.agendamentos ?? []).map((a) => appointmentRow(org, a)),
      );
      await aplicar(
        scope,
        "service_reports",
        (db.relatorios ?? []).map((r) => reportRow(org, r)),
      );
      await aplicar(
        scope,
        "report_photos",
        (db.relatorios ?? []).flatMap((r) => reportPhotoRows(org, r)),
      );
      await aplicar(
        scope,
        "financial_transactions",
        (db.lancamentos ?? []).map((l) => transactionRow(org, l)),
      );
      await aplicar(
        scope,
        "description_templates",
        (db.modelos ?? []).map((m) => templateRow(org, m)),
      );
      // Auditoria nunca é apagada: só acrescenta.
      await aplicar(
        scope,
        "audit_logs",
        (db.historico ?? []).map((h) => auditRow(org, h, userId)),
        false,
      );
      await salvarConfiguracoes(org, db, scope);
      scope.assertCurrent();
    } while (refazer);
  } catch (error) {
    if (scope.isCurrent())
      console.warn("Falha ao espelhar dados nas tabelas.", error);
  } finally {
    if (scope.isCurrent()) rodando = false;
  }
}

/** Contagem por tabela — usada para conferir a cópia inicial. */
export async function contarRelacional(org: string, scope: SyncScope) {
  scope.assertCurrent();
  const tabelas: TableName[] = [
    "customers",
    "services",
    "quotes",
    "quote_items",
    "appointments",
    "service_reports",
    "report_photos",
    "financial_transactions",
    "description_templates",
    "audit_logs",
  ];
  const saida: Record<string, number> = {};
  for (const t of tabelas) {
    scope.assertCurrent();
    const { count } = await (
      supabase as unknown as {
        from: (n: string) => {
          select: (
            c: string,
            o: { count: "exact"; head: true },
          ) => {
            eq: (c: string, v: string) => Promise<{ count: number | null }>;
          };
        };
      }
    )
      .from(t)
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org);
    scope.assertCurrent();
    saida[t] = count ?? 0;
  }
  return saida;
}

export { uuidFor };
