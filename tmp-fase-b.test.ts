import { describe, expect, it, mock, beforeEach } from "bun:test";

type Row = Record<string, any>;

const ORG = "11111111-1111-1111-1111-111111111111";
const OUTRA = "22222222-2222-2222-2222-222222222222";

let dados: Record<string, Row[]> = {};
let falhar: string | null = null;
const filtros: Array<{ tabela: string; org: string }> = [];

function chain(tabela: string) {
  let org = "";
  const api: any = {
    select() {
      return api;
    },
    eq(_c: string, v: string) {
      org = v;
      filtros.push({ tabela, org });
      return api;
    },
    order() {
      return api;
    },
    async range(a: number, b: number) {
      if (falhar === tabela) return { data: null, error: { message: "sem permissão" } };
      const linhas = (dados[tabela] ?? []).filter((r) => r["organization_id"] === org);
      return { data: linhas.slice(a, b + 1), error: null };
    },
    async maybeSingle() {
      const linhas = (dados[tabela] ?? []).filter((r) => r["organization_id"] === org);
      return { data: linhas[0] ?? null, error: null };
    },
    then(res: any, rej: any) {
      const linhas = (dados[tabela] ?? []).filter((r) => r["organization_id"] === org);
      return Promise.resolve({ data: linhas, error: null }).then(res, rej);
    },
  };
  return api;
}

mock.module("@/integrations/supabase/client", () => ({
  supabase: { from: (t: string) => chain(t) },
}));

const { lerRelacional, compararSnapshots } = await import("@/data/remote/relational-read");

function amostra(org: string) {
  const qUuid = "aaaaaaaa-0000-4000-8000-000000000001";
  const rUuid = "bbbbbbbb-0000-4000-8000-000000000001";
  return {
    customers: [
      {
        id: "cccccccc-0000-4000-8000-000000000001",
        organization_id: org,
        legacy_id: "c1",
        nome: "Condomínio Alfa",
        telefone: "11999",
        frequencia: "mensal",
        arquivado: false,
        criado_em: "2026-01-01T00:00:00.000Z",
      },
    ],
    services: [
      {
        id: "dddddddd-0000-4000-8000-000000000001",
        organization_id: org,
        legacy_id: null,
        nome: "Limpeza de vidros",
        valor: 500,
        arquivado: false,
      },
    ],
    quotes: [
      {
        id: qUuid,
        organization_id: org,
        legacy_id: "o1",
        numero: 7,
        customer_id: "cccccccc-0000-4000-8000-000000000001",
        customer_legacy_id: "c1",
        descricao_servicos: "Proposta",
        validade_dias: 15,
        formas_pagamento: ["pix"],
        status: "aprovado",
        escopo: ["Item A"],
        nao_incluso: [],
        condicoes: [],
        fotos_antes: [],
        fotos_depois: [],
        arquivado: false,
        criado_em: "2026-02-01T00:00:00.000Z",
      },
    ],
    quote_items: [
      {
        id: "eeeeeeee-0000-4000-8000-000000000001",
        organization_id: org,
        quote_id: qUuid,
        service_id: "dddddddd-0000-4000-8000-000000000001",
        service_legacy_id: null,
        posicao: 0,
        descricao: "Vidros externos",
        quantidade: 2,
        valor_unit: 500,
        unidade: "Serviço",
      },
      {
        id: "eeeeeeee-0000-4000-8000-000000000002",
        organization_id: org,
        quote_id: qUuid,
        service_id: null,
        service_legacy_id: null,
        posicao: 1,
        descricao: "Fachada",
        quantidade: 1,
        valor_unit: 300,
      },
    ],
    appointments: [
      {
        id: "ffffffff-0000-4000-8000-000000000001",
        organization_id: org,
        legacy_id: "a1",
        customer_id: "cccccccc-0000-4000-8000-000000000001",
        customer_legacy_id: "c1",
        service_id: "dddddddd-0000-4000-8000-000000000001",
        service_legacy_id: null,
        quote_id: qUuid,
        quote_legacy_id: "o1",
        report_id: rUuid,
        report_legacy_id: "r1",
        titulo: "Execução",
        data: "2026-03-01T12:00:00.000Z",
        data_texto: "2026-03-01T12:00:00.000Z",
        status: "concluido",
        valor: 1300,
        arquivado: false,
      },
    ],
    service_reports: [
      {
        id: rUuid,
        organization_id: org,
        legacy_id: "r1",
        numero: 3,
        appointment_id: "ffffffff-0000-4000-8000-000000000001",
        appointment_legacy_id: "a1",
        customer_id: "cccccccc-0000-4000-8000-000000000001",
        customer_legacy_id: "c1",
        quote_id: qUuid,
        quote_legacy_id: "o1",
        servico_executado: "Limpeza",
        descricao: "Executado",
        status: "sucesso",
        data_execucao: "2026-03-01",
        formas_pagamento_recebimento: ["pix"],
        arquivado: false,
        criado_em: "2026-03-01T18:00:00.000Z",
      },
    ],
    report_photos: [
      { id: "1a", organization_id: org, report_id: rUuid, tipo: "antes", posicao: 0, conteudo: "A0" },
      { id: "1b", organization_id: org, report_id: rUuid, tipo: "antes", posicao: 1, conteudo: "A1" },
      { id: "1c", organization_id: org, report_id: rUuid, tipo: "depois", posicao: 0, conteudo: "D0" },
    ],
    financial_transactions: [
      {
        id: "99999999-0000-4000-8000-000000000001",
        organization_id: org,
        legacy_id: "l1",
        tipo: "entrada",
        descricao: "Recebimento",
        valor: 1300,
        data: "2026-03-02",
        pago: true,
        origem_tipo: "orcamento",
        origem_legacy_id: "o1",
        origin_quote_id: qUuid,
        arquivado: false,
      },
    ],
    description_templates: [
      {
        id: "88888888-0000-4000-8000-000000000001",
        organization_id: org,
        legacy_id: "m1",
        nome: "Padrão",
        conteudo: "Texto",
        favorito: true,
        criado_em: "2026-01-05T00:00:00.000Z",
      },
    ],
    audit_logs: [
      {
        id: "77777777-0000-4000-8000-000000000001",
        organization_id: org,
        legacy_id: "h1",
        entidade: "cliente",
        entidade_id: "c1",
        entidade_nome: "Condomínio Alfa",
        acao: "criado",
        data: "2026-01-01T00:00:00.000Z",
        user_id: "user-real",
        usuario: "Eduardo",
      },
    ],
    organization_settings: [
      { organization_id: org, empresa: { nome: "GEP" }, data_version: "B" },
    ],
    organization_counters: [
      { organization_id: org, tipo: "orcamento", proximo: 8 },
      { organization_id: org, tipo: "relatorio", proximo: 4 },
    ],
  };
}

function payloadEquivalente() {
  return {
    clientes: [{ id: "c1" }],
    servicos: [{ id: "dddddddd-0000-4000-8000-000000000001" }],
    orcamentos: [
      {
        id: "o1",
        itens: [
          { quantidade: 2, valorUnit: 500 },
          { quantidade: 1, valorUnit: 300 },
        ],
      },
    ],
    agendamentos: [{ id: "a1" }],
    lancamentos: [{ id: "l1", valor: 1300 }],
    relatorios: [{ id: "r1", fotosAntes: ["A0", "A1"], fotosDurante: [], fotosDepois: ["D0"] }],
    modelos: [{ id: "m1" }],
  } as any;
}

beforeEach(() => {
  falhar = null;
  filtros.length = 0;
  dados = amostra(ORG) as any;
  // dados de outra empresa no mesmo conjunto, para conferir o isolamento
  for (const [t, linhas] of Object.entries(amostra(OUTRA))) {
    (dados[t] ??= []).push(...(linhas as Row[]).map((r) => ({ ...r, id: r["id"] + "-x" })));
  }
});

describe("Fase B — reconstrução relacional", () => {
  it("reconstrói todas as entidades com os identificadores lógicos", async () => {
    const { db, contagens } = await lerRelacional(ORG);

    expect(db.clientes?.[0]?.id).toBe("c1");
    expect(db.servicos?.[0]?.id).toBe("dddddddd-0000-4000-8000-000000000001");

    const orc = db.orcamentos?.[0]!;
    expect(orc.id).toBe("o1");
    expect(orc.clienteId).toBe("c1");
    expect(orc.numero).toBe(7);
    expect(orc.itens.map((i) => i.descricao)).toEqual(["Vidros externos", "Fachada"]);
    expect(orc.itens[0]?.servicoId).toBe("dddddddd-0000-4000-8000-000000000001");
    expect(orc.itens[0]!.quantidade * orc.itens[0]!.valorUnit).toBe(1000);

    const ag = db.agendamentos?.[0]!;
    expect([ag.id, ag.clienteId, ag.orcamentoId, ag.relatorioId]).toEqual([
      "a1",
      "c1",
      "o1",
      "r1",
    ]);
    expect(ag.servicoId).toBe("dddddddd-0000-4000-8000-000000000001");

    const rel = db.relatorios?.[0]!;
    expect([rel.id, rel.agendamentoId, rel.clienteId, rel.orcamentoId]).toEqual([
      "r1",
      "a1",
      "c1",
      "o1",
    ]);
    expect(rel.fotosAntes).toEqual(["A0", "A1"]);
    expect(rel.fotosDepois).toEqual(["D0"]);
    expect(rel.numero).toBe(3);

    const lan = db.lancamentos?.[0]!;
    expect([lan.id, lan.origemTipo, lan.origemId, lan.valor]).toEqual([
      "l1",
      "orcamento",
      "o1",
      1300,
    ]);

    expect(db.modelos?.[0]?.id).toBe("m1");
    expect(db.historico?.[0]?.id).toBe("h1");
    expect(db.historico?.[0]?.usuario).toBe("Eduardo");
    expect((db.empresa as any)?.nome).toBe("GEP");

    // contadores vêm de organization_counters, não do bloco JSON
    expect(db.proximoOrcamento).toBe(8);
    expect(db.proximoRelatorio).toBe(4);

    expect(contagens).toMatchObject({
      clientes: 1,
      servicos: 1,
      orcamentos: 1,
      itens: 2,
      agendamentos: 1,
      relatorios: 1,
      fotos: 3,
      lancamentos: 1,
      modelos: 1,
      historico: 1,
    });
  });

  it("não mistura dados de outra empresa", async () => {
    const { contagens } = await lerRelacional(ORG);
    expect(Object.values(contagens).every((v) => v <= 3)).toBe(true);
    expect(filtros.every((f) => f.org === ORG)).toBe(true);

    const outra = await lerRelacional(OUTRA);
    expect(outra.db.clientes?.length).toBe(1);
    expect(outra.db.clientes?.[0]?.id).toBe("c1");
  });

  it("não aponta divergência quando confere com o bloco JSON", async () => {
    const { db } = await lerRelacional(ORG);
    expect(compararSnapshots(db, payloadEquivalente())).toEqual([]);
  });

  it("aponta divergência de contagem e de total", async () => {
    const { db } = await lerRelacional(ORG);
    const p = payloadEquivalente();
    p.clientes.push({ id: "c2" });
    p.lancamentos[0].valor = 999;
    const d = compararSnapshots(db, p);
    expect(d.map((x) => x.campo)).toContain("clientes");
    expect(d.map((x) => x.campo)).toContain("total_lancamentos");
  });

  it("falha de leitura essencial é propagada para acionar a reserva", async () => {
    falhar = "customers";
    await expect(lerRelacional(ORG)).rejects.toThrow(/customers/);
  });
});
