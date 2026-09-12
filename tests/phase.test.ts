import { beforeEach, describe, expect, it, mock } from "bun:test";

const updateResult = {
  data: [{ data_version: "C" }] as Array<{ data_version: string }>,
  error: null as { message: string } | null,
};

mock.module("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      update: () => ({
        eq: () => ({
          select: async () => updateResult,
        }),
      }),
    }),
  },
}));

import {
  avaliarFaseC,
  dualWriteComprovado,
  normalizarFase,
  promoverParaC,
} from "@/data/remote/phase";

const base = {
  fase: "B" as const,
  leituraRelacionalOk: true,
  semDivergencias: true,
  sessaoRealRelacional: true,
  dualWriteValidado: true,
};

beforeEach(() => {
  updateResult.data = [{ data_version: "C" }];
  updateResult.error = null;
});

describe("normalizarFase", () => {
  it("aceita apenas A, B e C", () => {
    expect(normalizarFase("A")).toBe("A");
    expect(normalizarFase("B")).toBe("B");
    expect(normalizarFase("C")).toBe("C");
    expect(normalizarFase(null)).toBe("A");
    expect(normalizarFase("qualquer")).toBe("A");
  });
});

describe("avaliarFaseC", () => {
  it("bloqueia a virada direta de A para C", () => {
    const r = avaliarFaseC({ ...base, fase: "A" });
    expect(r.permitido).toBe(false);
    expect(r.motivos.join(" ")).toContain("fase B");
  });

  it("bloqueia quando tabelas e bloco divergem", () => {
    expect(avaliarFaseC({ ...base, semDivergencias: false }).permitido).toBe(false);
  });

  it("bloqueia sem sessão real lendo das tabelas", () => {
    expect(avaliarFaseC({ ...base, sessaoRealRelacional: false }).permitido).toBe(false);
  });

  it("bloqueia sem gravação dupla validada", () => {
    expect(avaliarFaseC({ ...base, dualWriteValidado: false }).permitido).toBe(false);
  });

  it("bloqueia quando a leitura relacional falhou", () => {
    expect(avaliarFaseC({ ...base, leituraRelacionalOk: false }).permitido).toBe(false);
  });

  it("permite somente com todas as condições comprovadas", () => {
    const r = avaliarFaseC(base);
    expect(r.permitido).toBe(true);
    expect(r.motivos).toEqual([]);
  });
});

describe("dualWriteComprovado", () => {
  const marcoISO = "2026-09-12T02:54:10.000Z";

  it("não aceita timestamp ausente, inválido ou antigo", () => {
    expect(
      dualWriteComprovado({ marcoISO, blocoAtualizadoEm: null, semDivergencias: true }),
    ).toBe(false);
    expect(
      dualWriteComprovado({
        marcoISO,
        blocoAtualizadoEm: "data-inválida",
        semDivergencias: true,
      }),
    ).toBe(false);
    expect(
      dualWriteComprovado({
        marcoISO,
        blocoAtualizadoEm: "2026-09-12T02:53:00.000Z",
        semDivergencias: true,
      }),
    ).toBe(false);
  });

  it("não comprova dual-write quando os snapshots divergem", () => {
    expect(
      dualWriteComprovado({
        marcoISO,
        blocoAtualizadoEm: "2026-09-12T02:54:11.000Z",
        semDivergencias: false,
      }),
    ).toBe(false);
  });

  it("comprova dual-write com bloco fresco e snapshots equivalentes", () => {
    expect(
      dualWriteComprovado({
        marcoISO,
        blocoAtualizadoEm: "2026-09-12T02:54:11.000Z",
        semDivergencias: true,
      }),
    ).toBe(true);
  });
});

describe("promoverParaC", () => {
  it("mantém B sem comprovação objetiva do dual-write", async () => {
    const resultado = await promoverParaC("org-teste", {
      ...base,
      dualWriteValidado: false,
    });
    expect(resultado.promovido).toBe(false);
    expect(resultado.motivos.join(" ")).toContain("gravação dupla");
  });

  it("só promove quando todas as condições são válidas", async () => {
    const resultado = await promoverParaC("org-teste", base);
    expect(resultado).toEqual({ promovido: true, motivos: [] });
  });

  it("detecta atualização sem nenhuma linha persistida", async () => {
    updateResult.data = [];
    const resultado = await promoverParaC("org-teste", base);
    expect(resultado.promovido).toBe(false);
    expect(resultado.motivos).toContain("nenhuma linha de configuração foi atualizada");
  });
});
