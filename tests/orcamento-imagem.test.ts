import { describe, it, expect } from "vitest";
import { nomeArquivoImagem } from "../src/lib/orcamento-imagem";
describe("nomeArquivoImagem", () => {
  it("usa nome do cliente e data", () => {
    expect(nomeArquivoImagem("João da Silva", new Date(2026, 10, 17))).toBe("orcamento-JOAO-DA-SILVA-17-11-2026.png");
  });
});
