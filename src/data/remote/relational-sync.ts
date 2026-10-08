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
let fila: Promise<void> = Promise.resolve();

export function resetRelacional() {
  orgAtual = null;
  anterior = {};
}

function indexar(rows: Row[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows) m.set(String(r["id"]), JSON.stringify(r));
  return m;
}

async function aplicar(tabela: TableName, rows: Row[], apagarRemovidos = true) {
  const atual = indexar(rows);
  const antes = anterior[tabela] ?? new Map<string, string>();

  const novos: Row[] = [];
  for (const [id, json] of atual) {
    if (antes.get(id) !== json) novos.push(JSON.parse(json) as Row);
  }
  const removidos: string[] = [];
  for (const id of antes.keys()) if (!atual.has(id)) removidos.push(id);

  const client = supabase as unknown as {
    from: (t: string) => {
      upsert: (v: Row[], o?: { onConflict?: string }) => Promise<{ error: { message: string } | null }>;
      delete: () => { in: (c: string, v: string[]) => Promise<{ error: { message: string } | null }> };
    };
  };

  for (let i = 0; i < novos.length; i += 200) {
    const lote = novos.slice(i, i + 200);
    const { error } = await client.from(tabela).upsert(lote, { onConflict: "id" });
    if (error) {
      console.warn(`Não foi possível salvar ${tabela}.`, error.message);
      return false;
    }
  }

  if (apagarRemovidos && removidos.length) {
    for (let i = 0; i < removidos.length; i += 200) {
      const { error } = await client.from(tabela).delete().in("id", removidos.slice(i, i + 200));
      if (error) {
        console.warn(`Não foi possível remover registros de ${tabela}.`, error.message);
        return false;
      }
    }
  }

  anterior[tabela] = atual;
  return true;
}

async function salvarConfiguracoes(org: string, db: DB) {
  const { error } = await supabase
    .from("organization_settings")
    .upsert(settingsRow(org, db.empresa) as never, { onConflict: "organization_id" });
  if (error) throw new Error(`Não foi possível salvar as configurações da empresa: ${error.message}`);
}

/**
 * Espelha o estado atual nas tabelas relacionais.
 * Cada chamada aguarda sua gravação real, sem reutilizar o snapshot anterior.
 */
export function sincronizarRelacional(org: string, db: DB, userId: string | null): Promise<void> {
  const executar = async () => {
  if (orgAtual !== org) {
    orgAtual = org;
    anterior = {};
  }
      const gravar = async (tabela: TableName, rows: Row[]) => {
        if (!await aplicar(tabela, rows)) throw new Error(`Não foi possível salvar ${tabela}.`);
      };
      // Ordem: cadastros base -> documentos -> dependentes.
      await gravar("customers", (db.clientes ?? []).map((c) => customerRow(org, c)));
      await gravar("services", (db.servicos ?? []).map((s) => serviceRow(org, s)));
      await gravar("quotes", (db.orcamentos ?? []).map((o) => quoteRow(org, o)));
      await gravar("quote_items", (db.orcamentos ?? []).flatMap((o) => quoteItemRows(org, o)));
      await gravar("appointments", (db.agendamentos ?? []).map((a) => appointmentRow(org, a)));
      await gravar("service_reports", (db.relatorios ?? []).map((r) => reportRow(org, r)));
      await gravar("report_photos", (db.relatorios ?? []).flatMap((r) => reportPhotoRows(org, r)));
      await gravar(
        "financial_transactions",
        (db.lancamentos ?? []).map((l) => transactionRow(org, l)),
      );
      await gravar("description_templates", (db.modelos ?? []).map((m) => templateRow(org, m)));
      // Auditoria nunca é apagada: só acrescenta.
      await aplicar("audit_logs", (db.historico ?? []).map((h) => auditRow(org, h, userId)), false);
      await salvarConfiguracoes(org, db);
  };
  const trabalho = fila.then(executar);
  // Uma falha não bloqueia os próximos snapshots, mas chega ao chamador.
  fila = trabalho.catch(() => {});
  return trabalho;
}

/** Contagem por tabela — usada para conferir a cópia inicial. */
export async function contarRelacional(org: string) {
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
    const { count } = await (supabase as unknown as {
      from: (n: string) => {
        select: (c: string, o: { count: "exact"; head: true }) => {
          eq: (c: string, v: string) => Promise<{ count: number | null }>;
        };
      };
    })
      .from(t)
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org);
    saida[t] = count ?? 0;
  }
  return saida;
}

export { uuidFor };
