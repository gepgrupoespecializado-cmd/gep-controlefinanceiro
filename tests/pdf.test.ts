import { describe, expect, it } from "bun:test";
import { gerarOrcamentoPDF } from "@/lib/pdf";
import { gerarRelatorioPDF } from "@/lib/relatorio-pdf";
import type { Cliente, Empresa, Orcamento, Relatorio, Servico } from "@/lib/store";

const mockEmpresa: Empresa = {
  nome: "GEP Serviços Especializados",
  cnpj: "12.345.678/0001-90",
  telefone: "(11) 99999-8888",
  email: "contato@gep.com.br",
  endereco: "Av. Paulista, 1000",
  cidade: "São Paulo",
  estado: "SP",
  temaPdf: "azul_escuro",
  corPdf: "#0b1b3d",
};

const mockCliente: Cliente = {
  id: "cli-1",
  nome: "Carlos Eduardo Silva",
  telefone: "(11) 98888-7777",
  whatsapp: "(11) 98888-7777",
  email: "carlos@example.com",
  rua: "Rua das Flores",
  numero: "123",
  bairro: "Jardins",
  cidade: "São Paulo",
  estado: "SP",
  cep: "01234-567",
  tipo: "mensal",
  criadoEm: new Date().toISOString(),
};

const mockServicos: Servico[] = [
  {
    id: "srv-1",
    nome: "Limpeza de Fachada",
    categoria: "Limpeza",
    precoPadrao: 1500,
  },
];

const mockOrcamento: Orcamento = {
  id: "orc-1",
  numero: 101,
  clienteId: "cli-1",
  status: "enviado",
  criadoEm: "2026-10-10T10:00:00.000Z",
  validadeDias: 15,
  descricaoServicos: "Limpeza técnica e manutenção de fachada comercial.",
  itens: [
    {
      id: "item-1",
      descricao: "Limpeza de Fachada com hidrojateamento",
      quantidade: 2,
      valorUnit: 1500,
      unidade: "Serviço",
    },
    {
      id: "item-2",
      descricao: "Impermeabilização protetiva",
      quantidade: 1,
      valorUnit: 800,
      unidade: "Aplicação",
    },
  ],
  escopo: ["Isolamento da área", "Higienização profunda", "Descarte ecológico de resíduos"],
  naoIncluso: ["Pintura final", "Reparo elétrico"],
  condicoes: ["Pagamento 50% de entrada e 50% na conclusão"],
  diferencial: "Equipe certificada NR-35 e equipamentos de ponta",
  formasPagamento: ["pix", "boleto", "credito"],
  prazo: "3 dias úteis",
  desconto: 200,
};

const mockRelatorio: Relatorio = {
  id: "rel-1",
  numero: 55,
  clienteId: "cli-1",
  agendamentoId: "agd-1",
  orcamentoId: "orc-1",
  servicoExecutado: "Limpeza de Fachada",
  descricao: "Serviço de limpeza e higienização executado conforme orçamento ORC-000101.",
  dataExecucao: "2026-10-12",
  status: "concluido",
  valor: 3600,
  valorRecebido: 3600,
  formasPagamentoRecebimento: ["pix"],
  situacaoPagamento: "pago",
  observacoes: "Cliente acompanhou a vistoria final e atestou a qualidade.",
  fotosAntes: [],
  fotosDurante: [],
  fotosDepois: [],
  criadoEm: "2026-10-12T16:00:00.000Z",
};

describe("Fluxo de Geração de PDFs", () => {
  it("gera PDF de Orçamento com sucesso e produz documento válido", () => {
    const doc = gerarOrcamentoPDF(mockOrcamento, mockCliente, mockServicos, mockEmpresa);
    expect(doc).toBeDefined();
    const pageCount = doc.getNumberOfPages();
    expect(pageCount).toBeGreaterThanOrEqual(1);

    const pdfOutput = doc.output("arraybuffer");
    expect(pdfOutput.byteLength).toBeGreaterThan(1000);
  });

  it("gera PDF de Orçamento mesmo quando cliente não possui todos os campos opcionais", () => {
    const clienteParcial: Cliente = {
      id: "cli-2",
      nome: "Maria Oliveira",
      criadoEm: new Date().toISOString(),
    };
    const orcamentoMinimo: Orcamento = {
      id: "orc-2",
      numero: 102,
      clienteId: "cli-2",
      status: "aprovado",
      criadoEm: "2026-10-11T10:00:00.000Z",
      validadeDias: 7,
      itens: [
        {
          id: "item-min",
          descricao: "Pintura básica",
          quantidade: 1,
          valorUnit: 500,
        },
      ],
    };
    const doc = gerarOrcamentoPDF(orcamentoMinimo, clienteParcial, [], mockEmpresa);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("gera PDF de Relatório com sucesso e produz documento válido", () => {
    const doc = gerarRelatorioPDF(mockRelatorio, mockCliente, mockEmpresa);
    expect(doc).toBeDefined();
    const pageCount = doc.getNumberOfPages();
    expect(pageCount).toBeGreaterThanOrEqual(1);

    const pdfOutput = doc.output("arraybuffer");
    expect(pdfOutput.byteLength).toBeGreaterThan(1000);
  });

  it("gera PDF de Relatório mesmo com data ausente sem lançar erro", () => {
    const relatorioSemData: Relatorio = {
      ...mockRelatorio,
      id: "rel-sem-data",
      dataExecucao: undefined as unknown as string,
    };
    const doc = gerarRelatorioPDF(relatorioSemData, mockCliente, mockEmpresa);
    expect(doc).toBeDefined();
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("gera PDF com logo da empresa sem corromper as páginas", () => {
    const empresaComLogo: Empresa = {
      ...mockEmpresa,
      // 1x1 transparent pixel PNG dataUrl
      logoDataUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    };
    const docOrc = gerarOrcamentoPDF(mockOrcamento, mockCliente, mockServicos, empresaComLogo);
    expect(docOrc.getNumberOfPages()).toBeGreaterThanOrEqual(1);

    const docRel = gerarRelatorioPDF(mockRelatorio, mockCliente, empresaComLogo);
    expect(docRel.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });
});
