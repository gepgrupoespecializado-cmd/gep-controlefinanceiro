import { describe, expect, it } from "bun:test";
import {
  customerRow,
  serviceRow,
  quoteRow,
  quoteItemRows,
  appointmentRow,
  reportRow,
  reportPhotoRows,
  transactionRow,
  templateRow,
  settingsRow,
  uuidFor,
  legacyOf,
} from "@/data/remote/mappers";
import { compararSnapshots } from "@/data/remote/relational-read";
import type { DB } from "@/types/models";

const ORG = "11111111-2222-3333-4444-555555555555";

describe("Normalização Relacional e Mapeadores (Etapa 03)", () => {
  it("uuidFor é determinístico e preserva UUIDs existentes", () => {
    const existingUuid = "abcdef01-2345-6789-abcd-ef0123456789";
    expect(uuidFor(ORG, "customers", existingUuid)).toBe(existingUuid);

    const legacyId = "cli-legacy-01";
    const derived1 = uuidFor(ORG, "customers", legacyId);
    const derived2 = uuidFor(ORG, "customers", legacyId);
    expect(derived1).toBe(derived2);
    expect(derived1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    // Diferentes entidades geram UUIDs distintos mesmo com mesmo legacyId
    const derivedService = uuidFor(ORG, "services", legacyId);
    expect(derivedService).not.toBe(derived1);
  });

  it("legacyOf identifica identificadores legados vs UUIDs nativos", () => {
    expect(legacyOf("cli-123")).toBe("cli-123");
    expect(legacyOf("12345678-1234-1234-1234-123456789abc")).toBeNull();
  });

  it("converte modelo de cliente para linha relacional mantendo dados e legacy_id", () => {
    const cliente = {
      id: "cli-99",
      nome: "Condomínio Horizonte",
      telefone: "11987654321",
      email: "contato@horizonte.com",
      rua: "Av. Brasil",
      numero: "500",
      bairro: "Centro",
      cidade: "Campinas",
      estado: "SP",
      cep: "13000-000",
      frequencia: "mensal" as const,
      criadoEm: "2026-10-01T10:00:00.000Z",
    };

    const row = customerRow(ORG, cliente);
    expect(row.organization_id).toBe(ORG);
    expect(row.legacy_id).toBe("cli-99");
    expect(row.nome).toBe("Condomínio Horizonte");
    expect(row.telefone).toBe("11987654321");
    expect(row.frequencia).toBe("mensal");
    expect(row.id).toBe(uuidFor(ORG, "cliente", "cli-99"));
  });

  it("converte orçamentos e itens preservando relacionamentos e valores", () => {
    const orcamento = {
      id: "orc-10",
      numero: 10,
      clienteId: "cli-99",
      status: "aprovado" as const,
      criadoEm: "2026-10-05T12:00:00.000Z",
      validadeDias: 15,
      desconto: 50,
      itens: [
        {
          id: "item-1",
          descricao: "Limpeza de Fachada",
          quantidade: 2,
          valorUnit: 400,
          unidade: "Serviço",
        },
      ],
    };

    const row = quoteRow(ORG, orcamento);
    expect(row.organization_id).toBe(ORG);
    expect(row.legacy_id).toBe("orc-10");
    expect(row.customer_id).toBe(uuidFor(ORG, "cliente", "cli-99"));
    expect(row.numero).toBe(10);
    expect(row.desconto).toBe(50);

    const itemRows = quoteItemRows(ORG, orcamento);
    expect(itemRows).toHaveLength(1);
    expect(itemRows[0].quote_id).toBe(uuidFor(ORG, "orcamento", "orc-10"));
    expect(itemRows[0].descricao).toBe("Limpeza de Fachada");
    expect(itemRows[0].quantidade).toBe(2);
    expect(itemRows[0].valor_unit).toBe(400);
  });

  it("compararSnapshots identifica equivalência e detecta divergências", () => {
    const dbBase: Partial<DB> = {
      clientes: [{ id: "c1", nome: "Ana", criadoEm: "2026-10-01" }],
      servicos: [{ id: "s1", nome: "Pintura", valor: 200 }],
      orcamentos: [
        {
          id: "o1",
          numero: 1,
          clienteId: "c1",
          status: "aprovado",
          criadoEm: "2026-10-01",
          itens: [{ id: "i1", descricao: "Pintura", quantidade: 1, valorUnit: 200 }],
        },
      ],
      agendamentos: [],
      lancamentos: [{ id: "l1", tipo: "entrada", valor: 200, data: "2026-10-01", pago: true, descricao: "Venda" }],
      relatorios: [],
      modelos: [],
    };

    // Mesmos dados: sem divergências
    const divZero = compararSnapshots(dbBase, dbBase);
    expect(divZero).toHaveLength(0);

    // Dados divergentes em quantidade ou valor
    const dbAlterado: Partial<DB> = {
      ...dbBase,
      clientes: [], // cliente faltando
    };
    const div = compararSnapshots(dbAlterado, dbBase);
    expect(div.length).toBeGreaterThan(0);
    expect(div.some((d) => d.campo === "clientes")).toBe(true);
  });
});
