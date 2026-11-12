import { describe, expect, test } from "bun:test";
import { amanhaBR, lembreteEnviado, lembretesDeAmanha, referenciaLembrete, telefoneCliente, mensagemLembrete, dataExtensoBR } from "../src/lib/lembretes";
import type { Agendamento, Empresa } from "../src/types/models";

const ag = (p: Partial<Agendamento>): Agendamento => ({ id: "a", clienteId: "c", titulo: "x", data: "2026-11-13", status: "agendado", horaInicio: "09:00", ...p });

describe("lembretes", () => {
  test("amanhã usa fuso de Brasília (23h30 de 12/11 em SP = 02h30 UTC de 13/11)", () => {
    expect(amanhaBR(new Date("2026-11-13T02:30:00Z"))).toBe("2026-11-13");
  });
  test("lista só agendamentos de amanhã, sem cancelados", () => {
    const agora = new Date("2026-11-12T15:00:00Z");
    const r = lembretesDeAmanha([ag({ id: "1" }), ag({ id: "2", status: "cancelado" }), ag({ id: "3", data: "2026-11-14" })], agora);
    expect(r.map((a) => a.id)).toEqual(["1"]);
  });
  test("enviado não volta a pendente; reagendar invalida", () => {
    const a = ag({ lembreteStatus: "enviado" });
    a.lembreteReferencia = referenciaLembrete(a);
    expect(lembreteEnviado(a)).toBe(true);
    expect(lembreteEnviado({ ...a, horaInicio: "14:00" })).toBe(false);
    expect(lembreteEnviado({ ...a, data: "2026-11-20" })).toBe(false);
  });
  test("sem telefone bloqueia envio", () => {
    expect(telefoneCliente({ id: "c", nome: "A", frequencia: "avulso", criadoEm: "" })).toBeNull();
    expect(telefoneCliente({ id: "c", nome: "A", frequencia: "avulso", criadoEm: "", telefone: "(11) 98888-7777" })).toBe("5511988887777");
  });
  test("mensagem com nome, data com dia da semana e local", () => {
    const msg = mensagemLembrete(ag({ endereco: "Rua A, 10" }), { id: "c", nome: "Maria", frequencia: "avulso", criadoEm: "" }, { nome: "E" } as Empresa, "Empresa Teste");
    expect(msg).toContain("Prezado(a) Maria");
    expect(msg).toContain(dataExtensoBR("2026-11-13"));
    expect(dataExtensoBR("2026-11-13")).toBe("sexta-feira, 13/11/2026");
    expect(msg).toContain("Rua A, 10");
    expect(msg).toContain("Empresa Teste");
  });
});
