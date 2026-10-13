import { describe, expect, it } from "bun:test";
import {
  diffPatch,
  novaReceitaDeAgendamento,
  novaReceitaDeOrcamento,
  numeroDocumento,
  proximoAgendamentoPorRecorrencia,
  statusPagamento,
  subtotalOrcamento,
  totalOrcamento,
  validadeOrcamento,
} from "@/domain/rules";
import type { Agendamento, Lancamento, Orcamento } from "@/types/models";

describe("Regras de Negócio Puras (domain/rules)", () => {
  it("formata numeroDocumento corretamente com padding de 6 dígitos", () => {
    expect(numeroDocumento("ORC", 1)).toBe("ORC-000001");
    expect(numeroDocumento("RPS", 42)).toBe("RPS-000042");
    expect(numeroDocumento("DOC", 123456)).toBe("DOC-123456");
  });

  it("calcula subtotal e total com desconto de orçamento", () => {
    const orc: Orcamento = {
      id: "o1",
      numero: 1,
      clienteId: "c1",
      status: "rascunho",
      criadoEm: "2026-10-10T00:00:00.000Z",
      itens: [
        { id: "i1", descricao: "Item 1", quantidade: 2, valorUnit: 150 },
        { id: "i2", descricao: "Item 2", quantidade: 1, valorUnit: 300 },
      ],
      desconto: 100,
    };
    expect(subtotalOrcamento(orc)).toBe(600);
    expect(totalOrcamento(orc)).toBe(500);

    const orcDescontoMaior: Orcamento = { ...orc, desconto: 1000 };
    expect(totalOrcamento(orcDescontoMaior)).toBe(0); // nunca negativo
  });

  it("calcula validade do orçamento somando os dias de validade", () => {
    const orc: Orcamento = {
      id: "o1",
      numero: 1,
      clienteId: "c1",
      status: "enviado",
      criadoEm: "2026-10-01T12:00:00.000Z",
      validadeDias: 10,
      itens: [],
    };
    const { emissao, vencimento } = validadeOrcamento(orc);
    expect(emissao.toISOString()).toBe("2026-10-01T12:00:00.000Z");
    expect(vencimento.getDate()).toBe(11);
  });

  it("identifica statusPagamento corretamente (pago, pendente, vencido)", () => {
    const pago: Lancamento = {
      id: "l1",
      tipo: "entrada",
      descricao: "Venda",
      valor: 100,
      data: "2026-10-01",
      pago: true,
      vencimento: "2026-10-05",
    };
    expect(statusPagamento(pago)).toBe("recebido");

    const futuro = new Date();
    futuro.setDate(futuro.getDate() + 5);
    const pendente: Lancamento = {
      id: "l2",
      tipo: "entrada",
      descricao: "Venda",
      valor: 100,
      data: "2026-10-01",
      pago: false,
      vencimento: futuro.toISOString(),
    };
    expect(statusPagamento(pendente)).toBe("pendente");

    const passado = new Date();
    passado.setDate(passado.getDate() - 5);
    const vencido: Lancamento = {
      id: "l3",
      tipo: "entrada",
      descricao: "Venda",
      valor: 100,
      data: "2026-10-01",
      pago: false,
      vencimento: passado.toISOString(),
    };
    expect(statusPagamento(vencido)).toBe("vencido");
  });

  it("gera previsão de receita a partir de orçamento aprovado", () => {
    const orc: Orcamento = {
      id: "o1",
      numero: 10,
      clienteId: "c1",
      status: "aprovado",
      criadoEm: "2026-10-01T12:00:00.000Z",
      itens: [{ id: "i1", descricao: "Pintura", quantidade: 1, valorUnit: 800 }],
    };
    const agora = new Date("2026-10-10T12:00:00.000Z");
    const receita = novaReceitaDeOrcamento(orc, "Empresa Alpha", agora);
    expect(receita).not.toBeNull();
    expect(receita?.valor).toBe(800);
    expect(receita?.tipo).toBe("entrada");
    expect(receita?.pago).toBe(false);
    expect(receita?.descricao).toContain("ORC-000010");
  });

  it("gera receita direta a partir de agendamento concluído", () => {
    const agd: Agendamento = {
      id: "a1",
      clienteId: "c1",
      titulo: "Higienização",
      data: "2026-10-10T09:00:00.000Z",
      status: "concluido",
      valor: 450,
    };
    const agora = new Date("2026-10-10T15:00:00.000Z");
    const receita = novaReceitaDeAgendamento(agd, "Alpha", agora);
    expect(receita).not.toBeNull();
    expect(receita?.valor).toBe(450);
    expect(receita?.pago).toBe(true);
  });

  it("calcula proximoAgendamentoPorRecorrencia para serviços semanais e quinzenais", () => {
    const baseDate = new Date("2026-10-01T10:00:00.000Z");
    const agdSemanal: Agendamento = {
      id: "a1",
      clienteId: "c1",
      titulo: "Limpeza de Escritório",
      data: baseDate.toISOString(),
      status: "agendado",
      recorrencia: "semanal",
    };
    const proxSemanal = proximoAgendamentoPorRecorrencia(agdSemanal, baseDate);
    expect(proxSemanal).not.toBeNull();
    expect(new Date(proxSemanal!.data).getDate()).toBe(8);

    const agdQuinzenal: Agendamento = {
      ...agdSemanal,
      recorrencia: "quinzenal",
    };
    const proxQuinzenal = proximoAgendamentoPorRecorrencia(agdQuinzenal, baseDate);
    expect(proxQuinzenal).not.toBeNull();
    expect(new Date(proxQuinzenal!.data).getDate()).toBe(15);
  });

  it("calcula diffPatch registrando alterações entre snapshots", () => {
    const antes = { nome: "João", email: "joao@a.com", ativo: true };
    const depois = { nome: "João Silva", email: "joao@a.com", ativo: false };
    const diffs = diffPatch(antes, depois);
    expect(diffs).toHaveLength(2);
    expect(diffs.find((d) => d.campo === "nome")).toEqual({
      campo: "nome",
      antes: "João",
      depois: "João Silva",
    });
    expect(diffs.find((d) => d.campo === "ativo")).toEqual({
      campo: "ativo",
      antes: "true",
      depois: "false",
    });
  });
});
