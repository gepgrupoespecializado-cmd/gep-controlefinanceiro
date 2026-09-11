import { describe, expect, it } from "vitest";
import { avaliarFaseC, normalizarFase } from "@/data/remote/phase";

const base = {
  fase: "B" as const,
  leituraRelacionalOk: true,
  semDivergencias: true,
  sessaoRealRelacional: true,
  dualWriteValidado: true,
};

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
