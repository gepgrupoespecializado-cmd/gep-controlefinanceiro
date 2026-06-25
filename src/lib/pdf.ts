import { jsPDF } from "jspdf";
import type { Cliente, Empresa, Orcamento, Servico } from "./store";
import { totalOrcamento, validadeOrcamento, formaPagamentoLabel, pdfTemaPreset } from "./store";
import { brl, dateBR, padNum } from "./format";

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [11, 27, 61];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lighten([r, g, b]: [number, number, number], pct = 0.85): [number, number, number] {
  return [
    Math.round(r + (255 - r) * pct),
    Math.round(g + (255 - g) * pct),
    Math.round(b + (255 - b) * pct),
  ];
}

/**
 * Permite gerar o PDF com tema/cor sobrescritos (preview ao vivo).
 */
export interface PdfOverrides {
  temaPdf?: Empresa["temaPdf"];
  corPdf?: string;
  corSecundariaPdf?: string;
}

export function gerarOrcamentoPDF(
  orc: Orcamento,
  cliente: Cliente | undefined,
  servicos: Servico[],
  empresa: Empresa,
  overrides: PdfOverrides = {},
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;

  const tema = (overrides.temaPdf ?? empresa.temaPdf ?? "azul_escuro") as NonNullable<Empresa["temaPdf"]>;
  const preset = pdfTemaPreset[tema] ?? pdfTemaPreset.azul_escuro;
  const brand = hexToRgb(overrides.corPdf ?? empresa.corPdf ?? preset.principal);
  const sec   = hexToRgb(overrides.corSecundariaPdf ?? empresa.corSecundariaPdf ?? preset.secundaria);
  const tint  = lighten(brand, 0.88);
  const { emissao, vencimento } = validadeOrcamento(orc);

  const BOTTOM_LIMIT = H - 90; // reservado para rodapé / assinatura
  let y = 0;

  /** Garante espaço; se não couber, abre nova página e redesenha mini-header. */
  function ensure(space: number) {
    if (y + space > BOTTOM_LIMIT) {
      drawFooter();
      doc.addPage();
      y = M;
      drawMiniHeader();
    }
  }

  function drawMiniHeader() {
    doc.setFillColor(brand[0], brand[1], brand[2]);
    doc.rect(0, 0, W, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(`${empresa.nome || "Empresa"} — ORC-${padNum(orc.numero)}`, M, 18);
    doc.text(`Pág. ${doc.getNumberOfPages()}`, W - M, 18, { align: "right" });
    doc.setTextColor(20, 20, 20);
    y = 48;
  }

  function drawFooter() {
    const fy = H - 32;
    doc.setDrawColor(sec[0], sec[1], sec[2]); doc.setLineWidth(0.8);
    doc.line(M, fy - 12, W - M, fy - 12);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(110, 110, 110);
    const cont = [empresa.telefone, empresa.whatsapp && `WhatsApp ${empresa.whatsapp}`, empresa.email].filter(Boolean).join("  ·  ");
    if (cont) doc.text(cont, M, fy);
    doc.text(`ORC-${padNum(orc.numero)} · Validade até ${dateBR(vencimento)}`, W - M, fy, { align: "right" });
    doc.setTextColor(20, 20, 20);
  }

  // ====== CABEÇALHO ======
  const headerH = 86;
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.rect(0, 0, W, headerH, "F");
  // faixa secundária
  doc.setFillColor(sec[0], sec[1], sec[2]);
  doc.rect(0, headerH, W, 4, "F");

  if (empresa.logoDataUrl) {
    try {
      const fmt = empresa.logoDataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
      doc.addImage(empresa.logoDataUrl, fmt, M, 14, 58, 58);
    } catch {}
  }
  const headX = empresa.logoDataUrl ? M + 70 : M;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text(empresa.nome || "Empresa", headX, 32, { maxWidth: W - headX - M });
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  let hy = 46;
  const headInfo = [
    empresa.cnpj && `CNPJ: ${empresa.cnpj}`,
    [empresa.telefone && `Tel: ${empresa.telefone}`, empresa.whatsapp && `WhatsApp: ${empresa.whatsapp}`].filter(Boolean).join("  |  "),
    empresa.email && `E-mail: ${empresa.email}`,
    empresa.endereco,
  ].filter(Boolean) as string[];
  headInfo.forEach((l) => {
    const lines = doc.splitTextToSize(l, W - headX - M);
    lines.forEach((ln: string) => { doc.text(ln, headX, hy); hy += 11; });
  });

  y = headerH + 18;
  doc.setTextColor(20, 20, 20);

  // ====== TÍTULO + VALIDADE ======
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text(`Orçamento Nº ORC-${padNum(orc.numero)}`, M, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`Emitido em ${dateBR(emissao)}`, W - M, y, { align: "right" });
  y += 14;

  doc.setFillColor(tint[0], tint[1], tint[2]);
  doc.roundedRect(M, y, W - M * 2, 24, 5, 5, "F");
  doc.setTextColor(brand[0], brand[1], brand[2]);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text(`Validade: ${orc.validadeDias ?? 7} dia(s) — válido até ${dateBR(vencimento)}`, M + 10, y + 16);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`Emissão ${dateBR(emissao)}`, W - M - 10, y + 16, { align: "right" });
  doc.setTextColor(20, 20, 20);
  y += 36;

  // ====== CLIENTE ======
  ensure(70);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.setTextColor(brand[0], brand[1], brand[2]);
  doc.text("CLIENTE", M, y); y += 4;
  doc.setDrawColor(sec[0], sec[1], sec[2]); doc.setLineWidth(1.2);
  doc.line(M, y, M + 70, y);
  doc.setTextColor(20, 20, 20);
  y += 12;
  doc.setFont("helvetica", "normal"); doc.setFontSize(12);
  const cliLines = cliente
    ? [
        `Nome: ${cliente.nome}`,
        cliente.telefone && `Telefone: ${cliente.telefone}`,
        cliente.whatsapp && `WhatsApp: ${cliente.whatsapp}`,
        cliente.email && `E-mail: ${cliente.email}`,
        cliente.endereco && `Endereço: ${cliente.endereco}`,
      ].filter(Boolean) as string[]
    : ["Cliente não informado"];
  cliLines.forEach((l) => {
    const lines = doc.splitTextToSize(l, W - M * 2);
    lines.forEach((ln: string) => { ensure(14); doc.text(ln, M, y); y += 14; });
  });
  y += 6;

  // ====== ITENS ======
  ensure(32);
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.rect(M, y, W - M * 2, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("DESCRIÇÃO", M + 8, y + 14);
  doc.text("QTD", W - M - 200, y + 14, { align: "right" });
  doc.text("VALOR UNIT.", W - M - 90, y + 14, { align: "right" });
  doc.text("TOTAL", W - M - 8, y + 14, { align: "right" });
  doc.setTextColor(20, 20, 20);
  y += 26;

  doc.setFont("helvetica", "normal"); doc.setFontSize(12);
  orc.itens.forEach((it, idx) => {
    const nome = it.descricao || servicos.find((s) => s.id === it.servicoId)?.nome || "Serviço";
    const lines = doc.splitTextToSize(nome, W - M * 2 - 230);
    const blockH = Math.max(lines.length * 14, 14) + 4;
    ensure(blockH);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 248, 250);
      doc.rect(M, y - 10, W - M * 2, blockH, "F");
    }
    lines.forEach((ln: string, i: number) => {
      doc.text(ln, M + 8, y);
      if (i === 0) {
        doc.text(String(it.quantidade), W - M - 200, y, { align: "right" });
        doc.text(brl(it.valorUnit), W - M - 90, y, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.text(brl(it.quantidade * it.valorUnit), W - M - 8, y, { align: "right" });
        doc.setFont("helvetica", "normal");
      }
      y += 14;
    });
    y += 2;
  });

  // ====== TOTAL ======
  ensure(36);
  doc.setDrawColor(sec[0], sec[1], sec[2]); doc.setLineWidth(1);
  doc.line(M, y, W - M, y); y += 12;
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.roundedRect(W - M - 230, y - 4, 230, 26, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(13);
  doc.text("VALOR TOTAL", W - M - 220, y + 13);
  doc.setFontSize(14);
  doc.text(brl(totalOrcamento(orc)), W - M - 8, y + 13, { align: "right" });
  doc.setTextColor(20, 20, 20);
  y += 32;

  // ====== DESCRIÇÃO DOS SERVIÇOS ======
  if (orc.descricaoServicos && orc.descricaoServicos.trim()) {
    ensure(40);
    doc.setFillColor(brand[0], brand[1], brand[2]);
    doc.rect(M, y, W - M * 2, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text("DESCRIÇÃO DOS SERVIÇOS CONTRATADOS", M + 8, y + 14);
    doc.setTextColor(20, 20, 20);
    y += 26;
    doc.setFont("helvetica", "normal"); doc.setFontSize(12);
    const blocos = orc.descricaoServicos.replace(/\r/g, "").split("\n");
    for (const bloco of blocos) {
      const lines = bloco.length
        ? doc.splitTextToSize(bloco, W - M * 2)
        : [""];
      for (const ln of lines as string[]) {
        ensure(14);
        doc.text(ln, M, y);
        y += 14;
      }
    }
    y += 6;
  }

  // ====== FORMAS DE PAGAMENTO ======
  {
    ensure(50);
    doc.setFillColor(brand[0], brand[1], brand[2]);
    doc.rect(M, y, W - M * 2, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text("FORMAS DE PAGAMENTO", M + 8, y + 14);
    doc.setTextColor(20, 20, 20);
    y += 26;
    doc.setFont("helvetica", "normal"); doc.setFontSize(12);
    const formas = (orc.formasPagamento && orc.formasPagamento.length
      ? orc.formasPagamento.map((f) => formaPagamentoLabel[f])
      : ["PIX", "Dinheiro", "Cartão de Débito", "Cartão de Crédito"]);
    ensure(14);
    doc.text("Para sua comodidade, disponibilizamos as seguintes formas de pagamento:", M, y);
    y += 14;
    formas.forEach((f) => { ensure(14); doc.text(`•  ${f}`, M + 14, y); y += 14; });
    y += 2;
    const aviso = "Pagamentos no cartão de crédito poderão sofrer acréscimo referente às taxas da operadora. Consulte condições e parcelamentos no momento da contratação.";
    doc.setFontSize(10); doc.setTextColor(110, 110, 110);
    const av = doc.splitTextToSize(aviso, W - M * 2);
    av.forEach((ln: string) => { ensure(12); doc.text(ln, M, y); y += 12; });
    doc.setTextColor(20, 20, 20);
  }

  // ====== PRAZO + OBSERVAÇÕES ======
  if (orc.prazo || orc.observacoes) {
    y += 8;
    if (orc.prazo) {
      ensure(18);
      doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      doc.text("Prazo:", M, y);
      doc.setFont("helvetica", "normal");
      doc.text(orc.prazo, M + 50, y);
      y += 16;
    }
    if (orc.observacoes) {
      ensure(24);
      doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      doc.text("Observações:", M, y); y += 14;
      doc.setFont("helvetica", "normal");
      const obs = doc.splitTextToSize(orc.observacoes, W - M * 2);
      obs.forEach((ln: string) => { ensure(13); doc.text(ln, M, y); y += 13; });
    }
  }

  // ====== ASSINATURAS ======
  ensure(90);
  y += 22;
  const halfW = (W - M * 2 - 30) / 2;
  doc.setDrawColor(80, 80, 80); doc.setLineWidth(0.6);
  doc.line(M, y, M + halfW, y);
  doc.line(M + halfW + 30, y, W - M, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text(empresa.nome || "Responsável", M, y + 14);
  doc.text("Cliente", M + halfW + 30, y + 14);

  // ====== RODAPÉ + AGRADECIMENTO ======
  drawFooter();
  doc.setFont("helvetica", "italic"); doc.setFontSize(10); doc.setTextColor(110, 110, 110);
  doc.text(
    "Agradecemos a oportunidade. Este orçamento é válido por " + (orc.validadeDias ?? 7) + " dia(s) a partir da emissão.",
    W / 2, H - 50, { align: "center", maxWidth: W - M * 2 },
  );
  doc.setTextColor(20, 20, 20);

  return doc;
}

export function abrirPDF(doc: jsPDF) {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

export function baixarPDF(doc: jsPDF, filename: string) {
  doc.save(filename);
}

/**
 * Compartilha o PDF de forma nativa (Android/iOS/Windows com Web Share API + files).
 * Quando o sistema do usuário não permitir anexar arquivos via share, abre o WhatsApp
 * (wa.me) com a mensagem e baixa o PDF para anexo manual.
 */
export async function compartilharPDF(opts: {
  doc: jsPDF;
  filename: string;
  titulo?: string;
  mensagem: string;
  telefone?: string;
}): Promise<"shared" | "whatsapp" | "downloaded"> {
  const { doc, filename, titulo, mensagem, telefone } = opts;
  const blob = doc.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });
  try {
    const navAny = navigator as any;
    if (navAny.canShare && navAny.canShare({ files: [file] }) && navAny.share) {
      await navAny.share({ files: [file], title: titulo ?? filename, text: mensagem });
      return "shared";
    }
  } catch {
    /* usuário cancelou ou falhou — segue para fallback */
  }
  // Fallback: baixa e abre WhatsApp
  doc.save(filename);
  const tel = (telefone || "").replace(/\D/g, "");
  const url = `https://wa.me/${tel}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, "_blank");
  return tel ? "whatsapp" : "downloaded";
}