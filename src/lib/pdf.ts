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
  // Tenta caber em UMA página A4 reduzindo progressivamente a densidade
  // (espaçamentos e fontes). Se ainda assim não couber, retorna a versão
  // mais compacta com quebras de página automáticas.
  const scales = [1, 0.92, 0.85, 0.78, 0.72];
  let last: jsPDF | null = null;
  for (const s of scales) {
    const d = renderOrcamentoPDF(orc, cliente, servicos, empresa, overrides, s);
    last = d;
    if (d.getNumberOfPages() === 1) return d;
  }
  return last ?? renderOrcamentoPDF(orc, cliente, servicos, empresa, overrides, 0.72);
}

function renderOrcamentoPDF(
  orc: Orcamento,
  cliente: Cliente | undefined,
  servicos: Servico[],
  empresa: Empresa,
  overrides: PdfOverrides,
  density: number,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  // Margens adaptativas (mínimo 30pt)
  const M = Math.max(30, Math.round(57 * (0.7 + 0.3 * density)));
  const M_TOP = Math.max(60, Math.round(85 * (0.7 + 0.3 * density)));

  const tema = (overrides.temaPdf ?? empresa.temaPdf ?? "azul_escuro") as NonNullable<Empresa["temaPdf"]>;
  const preset = pdfTemaPreset[tema] ?? pdfTemaPreset.azul_escuro;
  const brand = hexToRgb(overrides.corPdf ?? empresa.corPdf ?? preset.principal);
  const sec   = hexToRgb(overrides.corSecundariaPdf ?? empresa.corSecundariaPdf ?? preset.secundaria);
  const tint  = lighten(brand, 0.88);
  const { emissao, vencimento } = validadeOrcamento(orc);

  // Layout adaptativo: tenta caber em uma página, comprimindo espaçamentos
  // sem reduzir a fonte abaixo de 11pt.
  const BOTTOM_LIMIT = H - M - 30; // reservado para rodapé
  let y = 0;
  const sp = (n: number) => Math.max(2, Math.round(n * density));
  // Escala tipográfica: mantém mínimos legíveis em impressão A4
  const fs = (base: number, min: number) => Math.max(min, Math.round(base * (0.85 + 0.15 * density)));
  const FS = {
    title: fs(18, 14),
    subtitle: fs(14, 12),
    body: fs(12, 10),
    footer: fs(10, 9),
    miniHeader: fs(11, 9),
  };
  // Espaçamento entre linhas de texto corrido (1.3 * fonte)
  const LH = (size: number) => Math.round(size * 1.3 * density);
  const SECTION_HEADER_H = 30;
  const SECTION_GAP = 16;
  const SECTION_PAD_X = 10;

  /** Garante espaço; se não couber, abre nova página e redesenha mini-header. */
  function ensure(space: number) {
    if (y + space > BOTTOM_LIMIT) {
      drawFooter();
      doc.addPage();
      y = M_TOP;
      drawMiniHeader();
    }
  }

  function drawMiniHeader() {
    doc.setFillColor(brand[0], brand[1], brand[2]);
    doc.rect(0, 0, W, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal"); doc.setFontSize(FS.miniHeader);
    doc.text(`Pág. ${doc.getNumberOfPages()}`, W - M, 12, { align: "right" });
    doc.setTextColor(20, 20, 20);
    y = M_TOP;
  }

  function drawFooter() {
    const fy = H - 52;
    doc.setDrawColor(sec[0], sec[1], sec[2]); doc.setLineWidth(0.6);
    doc.line(M, fy - 10, W - M, fy - 10);
    doc.setFont("helvetica", "bold"); doc.setFontSize(FS.footer); doc.setTextColor(brand[0], brand[1], brand[2]);
    doc.text("GEP Grupo Especializado", W / 2, fy, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
    doc.text("Controle de Prestação de Serviços GEP", W / 2, fy + 12, { align: "center" });
    doc.text("Responsável Técnico: Eduardo Pennicha", W / 2, fy + 24, { align: "center" });
    doc.setTextColor(20, 20, 20);
  }

  /**
   * Desenha uma barra azul de seção com altura fixa e devolve o cursor já
   * posicionado abaixo do cabeçalho, com folga suficiente para o conteúdo.
   */
  function drawSectionHeader(title: string, minContentSpace = LH(FS.body)) {
    ensure(SECTION_HEADER_H + SECTION_GAP + minContentSpace);
    doc.setFillColor(brand[0], brand[1], brand[2]);
    doc.rect(M, y, W - M * 2, SECTION_HEADER_H, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FS.subtitle);
    doc.text(title, M + SECTION_PAD_X, y + SECTION_HEADER_H / 2 + FS.subtitle * 0.35);
    doc.setTextColor(20, 20, 20);
    y += SECTION_HEADER_H + SECTION_GAP;
  }

  // ====== CABEÇALHO ======
  const headerH = Math.max(78, Math.round(96 * (0.8 + 0.2 * density)));
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.rect(0, 0, W, headerH, "F");
  // faixa secundária
  doc.setFillColor(sec[0], sec[1], sec[2]);
  doc.rect(0, headerH, W, 3, "F");

  if (empresa.logoDataUrl) {
    try {
      const fmt = empresa.logoDataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
      const ls = Math.min(60, headerH - 20);
      doc.addImage(empresa.logoDataUrl, fmt, M, 14, ls, ls);
    } catch {}
  }
  const headX = empresa.logoDataUrl ? M + 72 : M;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(FS.title);
  doc.text(empresa.nome || "GEP Grupo Especializado", headX, 30, { maxWidth: W - headX - M });
  doc.setFont("helvetica", "normal"); doc.setFontSize(FS.footer);
  doc.text("Controle de Prestação de Serviços GEP", headX, 44, { maxWidth: W - headX - M });
  doc.setFontSize(FS.footer);
  let hy = 58;
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

  y = Math.max(headerH + 12, M_TOP);
  doc.setTextColor(20, 20, 20);

  // ====== TÍTULO + EMISSÃO + VALIDADE (bloco único) ======
  doc.setFillColor(tint[0], tint[1], tint[2]);
  doc.roundedRect(M, y, W - M * 2, 38, 5, 5, "F");
  doc.setTextColor(brand[0], brand[1], brand[2]);
  doc.setFont("helvetica", "bold"); doc.setFontSize(FS.subtitle);
  doc.text(`Orçamento Nº ORC-${padNum(orc.numero)}`, M + 10, y + 16);
  doc.setFont("helvetica", "normal"); doc.setFontSize(FS.footer);
  doc.setTextColor(60, 60, 60);
  doc.text(`Emissão: ${dateBR(emissao)}`, M + 10, y + 30);
  doc.text(
    `Validade: ${orc.validadeDias ?? 7} dia(s) — até ${dateBR(vencimento)}`,
    W - M - 10, y + 30, { align: "right" },
  );
  doc.setTextColor(20, 20, 20);
  y += 50;

  // ====== CLIENTE ======
  const cliLines = cliente
    ? [
        `Nome: ${cliente.nome}`,
        cliente.telefone && `Telefone: ${cliente.telefone}`,
        cliente.whatsapp && `WhatsApp: ${cliente.whatsapp}`,
        cliente.email && `E-mail: ${cliente.email}`,
        cliente.endereco && `Endereço: ${cliente.endereco}`,
      ].filter(Boolean) as string[]
    : ["Cliente não informado"];
  drawSectionHeader("CLIENTE");
  doc.setFont("helvetica", "normal"); doc.setFontSize(FS.body);
  cliLines.forEach((l) => {
    const lines = doc.splitTextToSize(l, W - M * 2);
    lines.forEach((ln: string) => { ensure(LH(FS.body)); doc.text(ln, M, y); y += LH(FS.body); });
  });
  y += sp(6);

  // ====== ITENS ======
  const HEADER_H = 24;
  const PAD_X = 10;
  const PAD_Y = 8;
  const MIN_ROW_H = 32;
  ensure(HEADER_H + MIN_ROW_H);
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.rect(M, y, W - M * 2, HEADER_H, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(FS.body);
  // Centralização vertical do cabeçalho (baseline ≈ meio + 0.35*fonte)
  const headBaseline = y + HEADER_H / 2 + FS.body * 0.35;
  doc.text("DESCRIÇÃO", M + PAD_X, headBaseline);
  doc.text("QTD", W - M - 200, headBaseline, { align: "right" });
  doc.text("VALOR UNIT.", W - M - 90, headBaseline, { align: "right" });
  doc.text("TOTAL", W - M - PAD_X, headBaseline, { align: "right" });
  doc.setTextColor(20, 20, 20);
  y += HEADER_H;

  doc.setFont("helvetica", "normal"); doc.setFontSize(FS.body);
  const lhItem = LH(FS.body);
  orc.itens.forEach((it, idx) => {
    const nome = it.descricao || servicos.find((s) => s.id === it.servicoId)?.nome || "Serviço";
    const lines = doc.splitTextToSize(nome, W - M * 2 - 230 - PAD_X);
    const contentH = lines.length * lhItem;
    const rowH = Math.max(MIN_ROW_H, contentH + PAD_Y * 2);
    ensure(rowH);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 248, 250);
      doc.rect(M, y, W - M * 2, rowH, "F");
    }
    // Baseline da primeira linha (com padding superior + ascent aproximado)
    const firstBaseline = y + (rowH - contentH) / 2 + FS.body * 0.85;
    lines.forEach((ln: string, i: number) => {
      const by = firstBaseline + i * lhItem;
      doc.text(ln, M + PAD_X, by);
      if (i === 0) {
        // Numéricos centralizados verticalmente na linha inteira
        const midBaseline = y + rowH / 2 + FS.body * 0.35;
        doc.text(String(it.quantidade), W - M - 200, midBaseline, { align: "right" });
        doc.text(brl(it.valorUnit), W - M - 90, midBaseline, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.text(brl(it.quantidade * it.valorUnit), W - M - PAD_X, midBaseline, { align: "right" });
        doc.setFont("helvetica", "normal");
      }
    });
    y += rowH;
  });
  y += sp(4);

  // ====== TOTAL ======
  ensure(40);
  doc.setDrawColor(sec[0], sec[1], sec[2]); doc.setLineWidth(1);
  doc.line(M, y, W - M, y); y += sp(12);
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.roundedRect(W - M - 240, y - 4, 240, 28, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(FS.subtitle);
  doc.text("VALOR TOTAL", W - M - 230, y + 14);
  doc.text(brl(totalOrcamento(orc)), W - M - 8, y + 14, { align: "right" });
  doc.setTextColor(20, 20, 20);
  y += 40;

  // ====== DESCRIÇÃO DOS SERVIÇOS ======
  if (orc.descricaoServicos && orc.descricaoServicos.trim()) {
    drawSectionHeader("DESCRIÇÃO DOS SERVIÇOS CONTRATADOS");
    doc.setFont("helvetica", "normal"); doc.setFontSize(FS.body);
    const lhDesc = LH(FS.body);
    const blocos = orc.descricaoServicos.replace(/\r/g, "").split("\n");
    for (const bloco of blocos) {
      const lines = bloco.length
        ? doc.splitTextToSize(bloco, W - M * 2)
        : [""];
      for (const ln of lines as string[]) {
        ensure(lhDesc);
        doc.text(ln, M, y);
        y += lhDesc;
      }
    }
    y += sp(6);
  }

  // ====== FORMAS DE PAGAMENTO ======
  {
    drawSectionHeader("FORMAS DE PAGAMENTO");
    doc.setFont("helvetica", "normal"); doc.setFontSize(FS.body);
    const lhP = LH(FS.body);
    const formas = (orc.formasPagamento && orc.formasPagamento.length
      ? orc.formasPagamento.map((f) => formaPagamentoLabel[f])
      : ["PIX", "Dinheiro", "Cartão de Débito", "Cartão de Crédito"]);
    ensure(lhP);
    doc.text("Para sua comodidade, disponibilizamos as seguintes formas de pagamento:", M, y);
    y += lhP;
    formas.forEach((f) => { ensure(lhP); doc.text(`•  ${f}`, M + 14, y); y += lhP; });
    y += 2;
    const aviso = "Pagamentos no cartão de crédito poderão sofrer acréscimo referente às taxas da operadora. Consulte condições e parcelamentos no momento da contratação.";
    doc.setFontSize(FS.footer); doc.setTextColor(110, 110, 110);
    const av = doc.splitTextToSize(aviso, W - M * 2);
    av.forEach((ln: string) => { ensure(14); doc.text(ln, M, y); y += 14; });
    doc.setTextColor(20, 20, 20);
  }

  // ====== PRAZO + OBSERVAÇÕES ======
  if (orc.prazo || orc.observacoes) {
    y += Math.max(8, sp(8));
    if (orc.prazo) {
      ensure(20);
      doc.setFont("helvetica", "bold"); doc.setFontSize(FS.body);
      doc.text("Prazo:", M, y);
      doc.setFont("helvetica", "normal");
      doc.text(orc.prazo, M + 56, y);
      y += sp(18);
    }
    if (orc.observacoes) {
      drawSectionHeader("OBSERVAÇÕES");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(FS.body);
      const obs = doc.splitTextToSize(orc.observacoes, W - M * 2);
      const lhO = LH(FS.body);
      obs.forEach((ln: string) => { ensure(lhO); doc.text(ln, M, y); y += lhO; });
    }
  }

  // ====== ASSINATURAS ======
  ensure(56);
  y += Math.max(14, sp(18));
  const halfW = (W - M * 2 - 30) / 2;
  doc.setDrawColor(80, 80, 80); doc.setLineWidth(0.6);
  doc.line(M, y, M + halfW, y);
  doc.line(M + halfW + 30, y, W - M, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(FS.body);
  doc.text(empresa.nome || "Responsável", M, y + 16);
  doc.text("Cliente", M + halfW + 30, y + 16);

  // ====== RODAPÉ ======
  drawFooter();

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