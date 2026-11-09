import { jsPDF } from "jspdf";
import type { Cliente, Empresa, Orcamento, Servico } from "./store";
import {
  totalOrcamento, subtotalOrcamento, validadeOrcamento, formaPagamentoLabel,
  pdfTemaPreset, resolvePdfTemaAtivo,
} from "./store";
import { brl, dateBR, quoteNumber as padNum } from "./format";

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [11, 27, 61];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lighten([r, g, b]: RGB, pct = 0.85): RGB {
  return [
    Math.round(r + (255 - r) * pct),
    Math.round(g + (255 - g) * pct),
    Math.round(b + (255 - b) * pct),
  ];
}
function detectFmt(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
}

/** Dimensões naturais de uma imagem data URL (fallback quadrado). */
function imgSize(doc: jsPDF, dataUrl: string): { w: number; h: number } {
  try {
    const p = doc.getImageProperties(dataUrl);
    if (p.width > 0 && p.height > 0) return { w: p.width, h: p.height };
  } catch {}
  return { w: 1, h: 1 };
}

/** Desenha imagem "contida" (sem distorção) dentro de uma caixa, centralizada. */
function drawImageContain(doc: jsPDF, dataUrl: string, x: number, y: number, boxW: number, boxH: number, compression?: "FAST") {
  const { w, h } = imgSize(doc, dataUrl);
  const scale = Math.min(boxW / w, boxH / h);
  const dw = w * scale, dh = h * scale;
  const dx = x + (boxW - dw) / 2, dy = y + (boxH - dh) / 2;
  try { doc.addImage(dataUrl, detectFmt(dataUrl), dx, dy, dw, dh, undefined, compression); } catch {}
  return { x: dx, y: dy, w: dw, h: dh };
}

export function drawPhotoCover(doc: jsPDF, dataUrl: string, x: number, y: number, width: number, height: number) {
  const { w, h } = imgSize(doc, dataUrl);
  const scale = Math.max(width / w, height / h);
  doc.saveGraphicsState();
  try {
    doc.rect(x, y, width, height);
    doc.clip(); doc.discardPath();
    doc.addImage(dataUrl, detectFmt(dataUrl), x + (width - w * scale) / 2, y + (height - h * scale) / 2, w * scale, h * scale, undefined, "FAST");
  } finally { doc.restoreGraphicsState(); }
}

/** Marca d'água centralizada (logo da empresa) com baixa opacidade, sem distorção. */
function aplicarMarcaDagua(doc: jsPDF, empresa: Empresa) {
  if (!empresa.logoDataUrl) return;
  try {
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const size = Math.min(W, H) * 0.5;
    const anyDoc = doc as unknown as {
      GState: new (o: { opacity: number }) => unknown;
      setGState: (s: unknown) => void;
    };
    anyDoc.setGState(new anyDoc.GState({ opacity: 0.06 }));
    drawImageContain(doc, empresa.logoDataUrl, (W - size) / 2, (H - size) / 2, size, size, "FAST");
    anyDoc.setGState(new anyDoc.GState({ opacity: 1 }));
  } catch {}
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
  // REGRA: "Priorizar legibilidade em vez de compactação."
  // As fontes são fixas (nunca reduzidas para caber em uma página). Quando o
  // conteúdo ultrapassa o espaço disponível, a paginação automática cria
  // páginas adicionais mantendo o padrão visual.
  return renderModeloDourado(orc, cliente, servicos, empresa, overrides);
}

/** Cores do modelo: segue a marcação (tema/cor) da empresa ou da pré-visualização; dourado como padrão. */
function resolverCoresModelo(empresa: Empresa, overrides: PdfOverrides): { principal: RGB; claro: RGB; fundo: RGB } {
  const modoMensal = !overrides.temaPdf && (empresa.pdfMesModo === "auto" || empresa.pdfMesModo === "manual");
  const temMarcacao = modoMensal || !!overrides.temaPdf || !!overrides.corPdf || !!empresa.corPdf || !!empresa.temaPdf;
  if (!temMarcacao) return { principal: [184, 134, 11], claro: [230, 194, 96], fundo: [247, 241, 228] };
  const tema = resolvePdfTemaAtivo(empresa, overrides.temaPdf);
  const preset = pdfTemaPreset[tema] ?? pdfTemaPreset.azul_escuro;
  const principal = hexToRgb(modoMensal ? preset.principal : (overrides.corPdf ?? empresa.corPdf ?? preset.principal));
  const sec = modoMensal ? preset.secundaria : (overrides.corSecundariaPdf ?? empresa.corSecundariaPdf ?? preset.secundaria);
  const claro = sec ? hexToRgb(sec) : lighten(principal, 0.4);
  return { principal, claro, fundo: lighten(principal, 0.9) };
}

export { renderOrcamentoPDF as renderOrcamentoPDFModerno };

/** Nome do arquivo no padrão DOC-AAAAMMDD.pdf (data de emissão). */
export function nomeArquivoOrcamento(orc: Orcamento): string {
  const d = new Date(orc.criadoEm ?? Date.now());
  const s = isNaN(d.getTime()) ? new Date() : d;
  const p = (n: number) => String(n).padStart(2, "0");
  return `DOC-${s.getFullYear()}${p(s.getMonth() + 1)}${p(s.getDate())}.pdf`;
}

/** Modelo oficial: cabeçalho dourado, barras de seção e página única A4. */
function renderModeloDourado(orc: Orcamento, cliente: Cliente | undefined, servicos: Servico[], empresa: Empresa, overrides: PdfOverrides = {}) {
  const cores = resolverCoresModelo(empresa, overrides);
  const GOLD: RGB = cores.principal;
  const GOLD_LIGHT: RGB = cores.claro;
  const CREAM: RGB = cores.fundo;
  const TEXT: RGB = [30, 30, 30];
  const MUTED: RGB = [110, 110, 110];
  const nome = (empresa.nome?.trim() || "Sua empresa").toUpperCase();
  const { emissao, vencimento } = validadeOrcamento(orc);
  const validadeDias = orc.validadeDias ?? 7;

  const build = (s: number) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 48, CW = W - M * 2;
    const f = (n: number) => +(n * s).toFixed(1);
    const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
    const color = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
    const bar = (title: string, y: number) => {
      const h = f(24);
      fill(GOLD); doc.rect(M, y, CW, h, "F");
      color([255, 255, 255]); doc.setFont("helvetica", "bold"); doc.setFontSize(f(12));
      doc.text(title, M + 9, y + h / 2 + f(4));
      return y + h + f(14);
    };

    aplicarMarcaDagua(doc, empresa);

    // Cabeçalho dourado
    const HH = 82;
    fill(GOLD); doc.rect(0, 0, W, HH, "F");
    fill(GOLD_LIGHT); doc.rect(0, HH, W, 3, "F");
    let hx = M;
    if (empresa.logoDataUrl) { drawImageContain(doc, empresa.logoDataUrl, M, 12, 58, 58); hx = M + 70; }
    color([255, 255, 255]); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text(nome, hx, 32, { maxWidth: W - hx - M });
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    let hy = 46;
    const cidade = empresa.endereco?.trim();
    [empresa.cnpj && `CNPJ: ${empresa.cnpj}`, (empresa.whatsapp || empresa.telefone) && `WhatsApp: ${empresa.whatsapp || empresa.telefone}`, cidade]
      .filter(Boolean).forEach((l) => { doc.text(String(l), hx, hy); hy += 10; });

    // Faixa do orçamento
    let y = HH + 16;
    fill(CREAM); doc.roundedRect(M, y, CW, 36, 4, 4, "F");
    color(GOLD); doc.setFont("helvetica", "bold"); doc.setFontSize(f(13));
    doc.text(`Orçamento Nº ORC-${padNumLong(orc.numero)}`, M + 10, y + 15);
    color(TEXT); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    doc.text(`Emissão: ${dateBR(emissao)}`, M + 10, y + 28);
    doc.text(`Validade: ${validadeDias} dia(s) — até ${dateBR(vencimento)}`, W - M - 10, y + 28, { align: "right" });
    y += 36 + f(12);

    // Cliente
    y = bar("CLIENTE", y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(f(10.5)); color(TEXT);
    const lh = f(14);
    const end = cliente?.endereco || [cliente?.rua, cliente?.bairro, [cliente?.cidade, cliente?.estado].filter(Boolean).join("/")].filter(Boolean).join(" — ");
    const cl = [`Nome: ${cliente?.nome ?? "—"}`, (cliente?.whatsapp || cliente?.telefone) && `WhatsApp: ${cliente?.whatsapp || cliente?.telefone}`, end && `Endereço: ${end}`].filter(Boolean) as string[];
    cl.forEach((l) => { (doc.splitTextToSize(l, CW) as string[]).forEach((ln) => { doc.text(ln, M, y); y += lh; }); });
    y += f(8);

    // Tabela
    const th = f(22);
    fill(GOLD); doc.rect(M, y, CW, th, "F");
    color([255, 255, 255]); doc.setFont("helvetica", "bold"); doc.setFontSize(f(10));
    const xTot = W - M - 9, xUnit = xTot - 95, xQtd = xUnit - 100;
    const by = y + th / 2 + f(3.5);
    doc.text("DESCRIÇÃO", M + 9, by);
    doc.text("QTD", xQtd, by, { align: "center" });
    doc.text("VALOR UNIT.", xUnit, by, { align: "right" });
    doc.text("TOTAL", xTot, by, { align: "right" });
    y += th + f(6);
    doc.setFontSize(f(10)); color(TEXT);
    orc.itens.forEach((it) => {
      const nm = it.descricao || servicos.find((sv) => sv.id === it.servicoId)?.nome || "Serviço";
      const lines = doc.splitTextToSize(nm, xQtd - M - 40) as string[];
      const rh = Math.max(f(24), lines.length * lh + f(8));
      const my = y + rh / 2 + f(3);
      doc.setFont("helvetica", "normal");
      lines.forEach((ln, i) => doc.text(ln, M + 9, y + f(12) + i * lh));
      doc.text(String(it.quantidade), xQtd, my, { align: "center" });
      doc.text(brl(it.valorUnit), xUnit, my, { align: "right" });
      doc.setFont("helvetica", "bold"); doc.text(brl(it.quantidade * it.valorUnit), xTot, my, { align: "right" });
      y += rh;
    });
    doc.setDrawColor(GOLD_LIGHT[0], GOLD_LIGHT[1], GOLD_LIGHT[2]); doc.setLineWidth(1); doc.line(M, y, W - M, y);
    y += f(8);
    const desconto = Number(orc.desconto) || 0;
    if (desconto > 0) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(f(9.5));
      doc.text(`Subtotal: ${brl(subtotalOrcamento(orc))}   Desconto: - ${brl(desconto)}`, W - M, y + f(8), { align: "right" });
      y += f(14);
    }
    const tw = 250, tH = f(26);
    fill(GOLD); doc.roundedRect(W - M - tw, y, tw, tH, 3, 3, "F");
    color([255, 255, 255]); doc.setFont("helvetica", "bold"); doc.setFontSize(f(12));
    doc.text("VALOR TOTAL", W - M - tw + 12, y + tH / 2 + f(4));
    doc.text(brl(totalOrcamento(orc)), W - M - 12, y + tH / 2 + f(4), { align: "right" });
    y += tH + f(16);

    // Descrição dos serviços
    const topicos = (orc.escopo ?? []).filter((t) => t && t.trim()).length
      ? (orc.escopo ?? []).filter((t) => t && t.trim())
      : (orc.descricaoServicos ?? "").split(/\r?\n/).map((t) => t.replace(/^[•\-\s]+/, "").trim()).filter(Boolean);
    if (topicos.length) {
      y = bar("DESCRIÇÃO DOS SERVIÇOS CONTRATADOS", y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(f(10)); color(TEXT);
      topicos.forEach((t) => {
        (doc.splitTextToSize(`• ${t}`, CW) as string[]).forEach((ln) => { doc.text(ln, M, y); y += lh; });
      });
      y += f(10);
    }

    // Formas de pagamento
    y = bar("FORMAS DE PAGAMENTO", y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(f(10)); color(TEXT);
    doc.text("Para sua comodidade, disponibilizamos as seguintes formas de pagamento:", M, y); y += lh;
    const formas = orc.formasPagamento?.length ? orc.formasPagamento.map((x) => formaPagamentoLabel[x]) : ["PIX", "Dinheiro", "Cartão de Débito", "Cartão de Crédito"];
    formas.forEach((x) => { doc.text(`•  ${x}`, M + 14, y); y += lh; });
    doc.setFontSize(f(8.5)); color(MUTED);
    (doc.splitTextToSize("Pagamentos no cartão de crédito poderão sofrer acréscimo referente às taxas da operadora. Consulte condições e parcelamentos no momento da contratação.", CW) as string[])
      .forEach((ln) => { y += f(2); doc.text(ln, M, y + f(4)); y += f(11); });

    // Rodapé
    const fy = H - 60;
    color(GOLD); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text(nome, W / 2, fy, { align: "center" });
    color(MUTED); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    let ry = fy + 12;
    if (empresa.responsavel?.trim()) { doc.text(`Responsável: ${empresa.responsavel.trim()}`, W / 2, ry, { align: "center" }); ry += 11; }
    doc.text("Todos os direitos reservados.", W / 2, ry, { align: "center" });
    return { doc, fits: y < fy - 14 };
  };

  for (const s of [1, 0.92, 0.85, 0.78, 0.72]) {
    const r = build(s);
    if (r.fits || s === 0.72) return r.doc;
  }
  return build(0.72).doc;
}

const padNumLong = (n: number) => (n > 0 ? String(n).padStart(6, "0") : "……");


function renderOrcamentoPDF(
  orc: Orcamento,
  cliente: Cliente | undefined,
  servicos: Servico[],
  empresa: Empresa,
  overrides: PdfOverrides,
  density: number,
) {
  const empresaNome = empresa.nome?.trim() || "Sua empresa";
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = Math.max(34, Math.round(46 * (0.75 + 0.25 * density)));
  const CW = W - M * 2; // largura útil

  // ---- Paleta: azul da identidade + branco + cinza claro + texto escuro ----
  const tema = resolvePdfTemaAtivo(empresa, overrides.temaPdf);
  const preset = pdfTemaPreset[tema] ?? pdfTemaPreset.azul_escuro;
  const modoMensal = !overrides.temaPdf && (empresa.pdfMesModo === "auto" || empresa.pdfMesModo === "manual");
  const brand: RGB = hexToRgb(modoMensal ? preset.principal : (overrides.corPdf ?? empresa.corPdf ?? preset.principal));
  const tint: RGB = lighten(brand, 0.9);
  const TEXT: RGB = [28, 35, 50];
  const MUTED: RGB = [105, 112, 125];
  const LINE: RGB = [214, 219, 228];
  const FILL: RGB = [244, 246, 249];

  const { emissao, vencimento } = validadeOrcamento(orc);
  const validadeDias = orc.validadeDias ?? 7;

  // ---- Tipografia fixa, pensada para leitura no celular ----
  // Nunca reduzida para caber em uma página (legibilidade > compactação).
  const FS = {
    empresa: 16,   // nome da empresa
    title: 18,     // título principal
    section: 14,   // subtítulos de seção
    body: 13,      // cliente, descrição, condições, valores
    small: 12,     // observações / notas
    total: 16,     // valor total
    footer: 11,    // rodapé
  };
  const sp = (n: number) => Math.max(2, Math.round(n * density));
  const LH = (size: number) => +(size * 1.45).toFixed(1);

  const FOOTER_H = 64;
  const BOTTOM = H - M - FOOTER_H;
  let y = 0;
  let repeatItemsHeader = false;

  const setText = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

  /** Garante espaço; se não couber, abre nova página (com cabeçalho reduzido). */
  function ensure(space: number) {
    if (y + space > BOTTOM) {
      drawFooter();
      doc.addPage();
      aplicarMarcaDagua(doc, empresa);
      drawMiniHeader();
      if (repeatItemsHeader) drawItemsHeader();
    }
  }

  function drawMiniHeader() {
    setFill(brand); doc.rect(0, 0, W, 4, "F");
    setText(MUTED); doc.setFont("helvetica", "normal"); doc.setFontSize(FS.footer);
    doc.text(`${empresaNome} · Orçamento Nº ${padNum(orc.numero)} · continuação`, M, 20);
    setDraw(LINE); doc.setLineWidth(0.6); doc.line(M, 26, W - M, 26);
    y = 40;
    setText(TEXT);
  }

  function drawFooter() {
    const fy = H - M - FOOTER_H + 14;
    const step = FS.footer + 3;
    setDraw(LINE); doc.setLineWidth(0.6); doc.line(M, fy - 10, W - M, fy - 10);
    doc.setFont("helvetica", "bold"); doc.setFontSize(FS.footer + 1); setText(brand);
    doc.text(empresaNome, W / 2, fy + 2, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(FS.footer); setText(MUTED);
    const contato = [
      (empresa.telefone || empresa.whatsapp) && `Telefone/WhatsApp: ${[empresa.telefone, empresa.whatsapp].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" / ")}`,
      empresa.email && `E-mail: ${empresa.email}`,
      empresa.endereco && `${empresa.endereco}`,
    ].filter(Boolean).join("   ·   ");
    let ly = fy + 2 + step * 2;
    if (contato) {
      const lines = doc.splitTextToSize(contato, CW) as string[];
      lines.slice(0, 2).forEach((ln) => { doc.text(ln, W / 2, ly, { align: "center" }); ly += step; });
    }
    if (empresa.cnpj) { doc.setFont("helvetica", "bold"); doc.text(`CNPJ: ${empresa.cnpj}`, W / 2, ly, { align: "center" }); }
    const pages = doc.getNumberOfPages();
    if (pages > 1) {
      doc.setFont("helvetica", "normal");
      doc.text(`Página ${pages}`, W - M, fy + 2, { align: "right" });
    }
    setText(TEXT);
  }

  /** Título de seção (14pt, negrito, cor da marca) com linha fina; evita título órfão. */
  function section(title: string, minContent = LH(FS.body) * 2) {
    const h = FS.section + 6 + sp(10) + FS.body;
    ensure(h + minContent);
    doc.setFont("helvetica", "bold"); doc.setFontSize(FS.section); setText(brand);
    doc.text(title, M, y + FS.section);
    setDraw(brand); doc.setLineWidth(1.3); doc.line(M, y + FS.section + 6, M + 30, y + FS.section + 6);
    setDraw(LINE); doc.setLineWidth(0.5); doc.line(M + 30, y + FS.section + 6, W - M, y + FS.section + 6);
    y += h;
    setText(TEXT); doc.setFont("helvetica", "normal"); doc.setFontSize(FS.body);
  }

  /** "Rótulo: valor" com quebra automática; devolve altura consumida. */
  function labelValue(label: string, value: string, x: number, w: number, size = FS.body) {
    doc.setFontSize(size);
    doc.setFont("helvetica", "bold"); setText(TEXT);
    const lw = doc.getTextWidth(`${label}: `);
    doc.text(`${label}:`, x, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, Math.max(40, w - lw)) as string[];
    lines.forEach((ln, i) => {
      if (i > 0) { y += LH(size); ensure(0); }
      doc.text(ln, x + lw, y);
    });
    y += LH(size);
  }

  function paragraph(text: string, size = FS.body, color: RGB = TEXT, indent = 0) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(size); setText(color);
    const blocos = text.replace(/\r/g, "").split("\n");
    for (const b of blocos) {
      const lines = b.length ? (doc.splitTextToSize(b, CW - indent) as string[]) : [""];
      for (const ln of lines) { ensure(LH(size)); doc.text(ln, M + indent, y); y += LH(size); }
    }
    setText(TEXT);
  }

  function bullets(items: string[], size = FS.body, color: RGB = TEXT) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(size); setText(color);
    items.forEach((it) => {
      const lines = doc.splitTextToSize(it, CW - 14) as string[];
      lines.forEach((ln, i) => {
        ensure(LH(size));
        if (i === 0) doc.text("•", M + 3, y);
        doc.text(ln, M + 14, y); y += LH(size);
      });
    });
    setText(TEXT);
  }

  // =====================================================================
  // 1) CABEÇALHO CORPORATIVO — logo à esquerda, nome à direita, linha fina
  // =====================================================================
  aplicarMarcaDagua(doc, empresa);
  const headTop = M - 6;
  const logoH = 50;
  let headH = logoH;
  if (empresa.logoDataUrl) {
    drawImageContain(doc, empresa.logoDataUrl, M, headTop, 140, logoH);
  }
  doc.setFont("helvetica", "bold"); doc.setFontSize(FS.empresa); setText(brand);
  doc.text(empresaNome, W - M, headTop + logoH / 2 - 2, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(FS.small); setText(MUTED);
  headH = logoH + sp(12);
  setDraw(LINE); doc.setLineWidth(0.7); doc.line(M, headTop + headH, W - M, headTop + headH);
  y = headTop + headH + sp(14);

  // =====================================================================
  // 2) IDENTIFICAÇÃO DO DOCUMENTO
  // =====================================================================
  doc.setFont("helvetica", "bold"); doc.setFontSize(FS.title); setText(TEXT);
  doc.text(`ORÇAMENTO Nº ${padNum(orc.numero)}`, M, y + FS.title - 2);
  const versao = orc.versao ?? 1;
  if (versao > 1) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(FS.small); setText(MUTED);
    doc.text(`Versão ${String(versao).padStart(2, "0")}`, M, y + FS.title + FS.small + 4);
  }
  doc.setFontSize(FS.body); setText(TEXT);
  doc.setFont("helvetica", "bold"); const dl = doc.getTextWidth("Validade: ");
  const rx = W - M;
  doc.setFont("helvetica", "normal");
  const dataTxt = dateBR(emissao), valTxt = `${validadeDias} dias`;
  const vw = Math.max(doc.getTextWidth(dataTxt), doc.getTextWidth(valTxt));
  const l1 = y + FS.body - 1, l2 = l1 + LH(FS.body);
  doc.setFont("helvetica", "bold");
  doc.text("Data:", rx - vw - dl, l1);
  doc.text("Validade:", rx - vw - dl, l2);
  doc.setFont("helvetica", "normal");
  doc.text(dataTxt, rx, l1, { align: "right" });
  doc.text(valTxt, rx, l2, { align: "right" });
  y += Math.max(FS.title + FS.small + 6, l2 - y) + sp(16);

  // =====================================================================
  // 3) DADOS DO CLIENTE — bloco compacto em duas colunas
  // =====================================================================
  section("DADOS DO CLIENTE");
  {
    const colW = (CW - 14) / 2;
    const c = cliente;
    const enderecoCompleto = c?.endereco || [
      [c?.rua, c?.numero].filter(Boolean).join(", "), c?.bairro,
      [c?.cidade, c?.estado].filter(Boolean).join("/"), c?.cep && `CEP ${c.cep}`,
    ].filter(Boolean).join(" — ");
    const barTop = y - FS.body;
    const startY = y;
    // Coluna esquerda
    labelValue("Cliente", c?.nome ?? "—", M + 8, colW);
    if (c?.documento) labelValue("CPF/CNPJ", c.documento, M + 8, colW);
    const leftEnd = y;
    // Coluna direita
    y = startY;
    const tel = [c?.telefone, c?.whatsapp].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" / ");
    if (tel) labelValue("Telefone", tel, M + 8 + colW + 14, colW);
    if (c?.email) labelValue("E-mail", c.email, M + 8 + colW + 14, colW);
    y = Math.max(leftEnd, y);
    if (enderecoCompleto) labelValue("Endereço", enderecoCompleto, M + 8, CW - 16);
    // Fundo cinza claro discreto atrás do bloco (desenhado por trás via ordem: usamos borda lateral)
    setDraw(brand); doc.setLineWidth(1.5); doc.line(M + 1, barTop, M + 1, y - LH(FS.body) + 3);
    y += sp(10);
  }

  // =====================================================================
  // 4) SERVIÇO SOLICITADO — serviço principal + descrição (obrigatória)
  // =====================================================================
  const primeiro = orc.itens[0];
  const nomeItem = (it: typeof primeiro) => {
    const base = it.descricao || servicos.find((s) => s.id === it.servicoId)?.nome || "Serviço";
    return it.categoria ? `${it.categoria} — ${base}` : base;
  };
  const escopoItens = (orc.escopo ?? []).filter((s) => s && s.trim());
  const descricaoLivre = (orc.descricaoServicos ?? "").trim();
  const itemEscopos = orc.itens.map((it) => it.escopo?.trim()).filter(Boolean) as string[];
  section("SERVIÇO SOLICITADO");
  {
    const servicoTitulo = orc.itens.length === 1
      ? nomeItem(primeiro)
      : orc.itens.map(nomeItem).join("; ");
    labelValue("Serviço", servicoTitulo, M, CW);
    y += sp(10);
  }
  section("DESCRIÇÃO DO SERVIÇO");
  {
    if (escopoItens.length) bullets(escopoItens);
    else if (descricaoLivre) paragraph(descricaoLivre);
    else if (itemEscopos.length) bullets(itemEscopos);
    else paragraph("—", FS.body, MUTED);
    if (escopoItens.length && descricaoLivre) { y += sp(4); paragraph(descricaoLivre, FS.body, TEXT); }
    const naoIncluso = (orc.naoIncluso ?? []).filter((s) => s && s.trim());
    if (naoIncluso.length) {
      y += sp(3);
      doc.setFont("helvetica", "bold"); doc.setFontSize(FS.small); setText(MUTED);
      ensure(LH(FS.small)); doc.text("Não incluso:", M, y); y += LH(FS.small);
      bullets(naoIncluso, FS.small, MUTED);
    }
    const condicoes = (orc.condicoes ?? []).filter((s) => s && s.trim());
    if (condicoes.length) {
      y += sp(3);
      doc.setFont("helvetica", "bold"); doc.setFontSize(FS.small); setText(MUTED);
      ensure(LH(FS.small)); doc.text("Condições do serviço:", M, y); y += LH(FS.small);
      bullets(condicoes, FS.small, MUTED);
    }
    if (orc.diferencial && orc.diferencial.trim()) {
      y += sp(3);
      doc.setFont("helvetica", "italic"); doc.setFontSize(FS.small); setText(MUTED);
      const dl2 = doc.splitTextToSize(orc.diferencial.trim(), CW) as string[];
      dl2.forEach((ln) => { ensure(LH(FS.small)); doc.text(ln, M, y); y += LH(FS.small); });
      doc.setFont("helvetica", "normal"); setText(TEXT);
    }
    y += sp(10);
  }

  // =====================================================================
  // 5) TABELA DE SERVIÇOS — quando houver mais de um item (ou quantidade > 1)
  // =====================================================================
  const usarTabela = orc.itens.length > 1 || orc.itens.some((i) => i.quantidade !== 1);
  const PAD = sp(9);
  const ROW_H = Math.max(26, LH(FS.body) + PAD * 2);
  const cTot = 96, cUnit = 96, cQtd = 56;
  // Bordas direitas de cada coluna numérica
  const rTot = W - M, rUnit = rTot - cTot, rQtd = rUnit - cUnit, cServW = CW - cTot - cUnit - cQtd - PAD;

  function drawItemsHeader() {
    const h = LH(FS.small) + PAD;
    setFill(FILL); doc.rect(M, y, CW, h, "F");
    setDraw(brand); doc.setLineWidth(1); doc.line(M, y + h, W - M, y + h);
    doc.setFont("helvetica", "bold"); doc.setFontSize(FS.small); setText(brand);
    const by = y + h / 2 + FS.small * 0.35;
    doc.text("SERVIÇO", M + PAD, by);
    doc.text("QTD.", rQtd - PAD, by, { align: "right" });
    doc.text("VALOR UNIT.", rUnit - PAD, by, { align: "right" });
    doc.text("TOTAL", rTot - PAD, by, { align: "right" });
    setText(TEXT); doc.setFont("helvetica", "normal");
    y += h;
  }

  if (usarTabela) {
    section("TABELA DE SERVIÇOS", ROW_H * 2);
    drawItemsHeader();
    repeatItemsHeader = true;
    doc.setFontSize(FS.body);
    orc.itens.forEach((it) => {
      const nome = nomeItem(it);
      const unidade = it.unidade && it.unidade !== "Serviço" ? ` ${it.unidade}` : "";
      const lines = doc.splitTextToSize(nome, cServW - PAD) as string[];
      const sub = it.escopo?.trim() ? (doc.splitTextToSize(it.escopo.trim(), cServW - PAD) as string[]) : [];
      const contentH = lines.length * LH(FS.body) + sub.length * LH(FS.small);
      const rowH = Math.max(ROW_H, contentH + PAD * 2 - 4);
      ensure(rowH);
      let ty = y + PAD + FS.body * 0.8 - 2;
      doc.setFont("helvetica", "normal"); doc.setFontSize(FS.body); setText(TEXT);
      lines.forEach((ln) => { doc.text(ln, M + PAD, ty); ty += LH(FS.body); });
      if (sub.length) {
        doc.setFontSize(FS.small); setText(MUTED);
        sub.forEach((ln) => { doc.text(ln, M + PAD, ty - 2); ty += LH(FS.small); });
        setText(TEXT); doc.setFontSize(FS.body);
      }
      const my = y + rowH / 2 + FS.body * 0.35;
      doc.text(`${it.quantidade}${unidade}`, rQtd - PAD, my, { align: "right" });
      doc.text(brl(it.valorUnit), rUnit - PAD, my, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.text(brl(it.quantidade * it.valorUnit), rTot - PAD, my, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += rowH;
      setDraw(LINE); doc.setLineWidth(0.5); doc.line(M, y, W - M, y);
    });
    repeatItemsHeader = false;
    y += sp(10);
  }

  // =====================================================================
  // 6) VALOR E CONDIÇÕES DE PAGAMENTO — total em destaque (16pt) + condições
  // =====================================================================
  {
    const subtotal = subtotalOrcamento(orc);
    const desconto = Number(orc.desconto) || 0;
    const total = totalOrcamento(orc);
    const formas = (orc.formasPagamento ?? []).map((f) => formaPagamentoLabel[f]);
    const boxW = Math.min(CW, 300);
    const linhas = desconto > 0 ? 2 : 0;
    const gapTotal = linhas ? sp(10) : 0;
    const boxH = sp(12) + FS.small + sp(6) + linhas * LH(FS.body) + gapTotal + FS.total + sp(14);
    section("VALOR E CONDIÇÕES DE PAGAMENTO", boxH + sp(6));
    ensure(boxH + sp(6));
    const bx = W - M - boxW;
    setFill(tint); doc.roundedRect(bx, y, boxW, boxH, 4, 4, "F");
    setDraw(brand); doc.setLineWidth(1.5); doc.line(bx, y + 2, bx, y + boxH - 2);
    let ty = y + sp(12) + FS.small;
    doc.setFont("helvetica", "bold"); doc.setFontSize(FS.small); setText(brand);
    doc.text("VALOR DO SERVIÇO", bx + 14, ty);
    ty += sp(6);
    if (desconto > 0) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(FS.body); setText(TEXT);
      ty += LH(FS.body);
      doc.text("Subtotal:", bx + 14, ty); doc.text(brl(subtotal), bx + boxW - 14, ty, { align: "right" });
      ty += LH(FS.body);
      doc.text("Desconto:", bx + 14, ty); doc.text(`- ${brl(desconto)}`, bx + boxW - 14, ty, { align: "right" });
    }
    ty += gapTotal + FS.total;
    doc.setFont("helvetica", "bold"); doc.setFontSize(FS.body); setText(TEXT);
    doc.text("TOTAL", bx + 14, ty);
    doc.setFontSize(FS.total); setText(brand);
    doc.text(brl(total), bx + boxW - 14, ty, { align: "right" });
    setText(TEXT);
    y += boxH + sp(14);

    if (formas.length || orc.prazo) {
      if (formas.length) labelValue("Forma de pagamento", formas.join(" / "), M, CW);
      if (orc.prazo) labelValue("Condição", orc.prazo, M, CW);
      if (orc.formasPagamento?.includes("credito")) {
        paragraph("Pagamentos no cartão de crédito podem ter acréscimo referente às taxas da operadora.", FS.small, MUTED);
      }
    }
    y += sp(10);
  }

  // =====================================================================
  // 8) AGENDAMENTO — somente quando houver data definida
  // =====================================================================
  if (orc.dataPrevista) {
    section("AGENDAMENTO", LH(FS.body));
    const [yy, mm, dd] = orc.dataPrevista.split("-");
    const dataFmt = yy && mm && dd ? `${dd}/${mm}/${yy}` : orc.dataPrevista;
    const startY = y;
    labelValue("Data prevista", dataFmt, M, CW / 2);
    if (orc.horaPrevista) { y = startY; labelValue("Horário", orc.horaPrevista, M + CW / 2, CW / 2); }
    y += sp(10);
  }

  // =====================================================================
  // 9) REGISTRO FOTOGRÁFICO — ANTES | DEPOIS com proporção idêntica
  // =====================================================================
  const antes = (orc.fotosAntes ?? []).filter(Boolean);
  const depois = (orc.fotosDepois ?? []).filter(Boolean);
  if (antes.length || depois.length) {
    const gap = 12;
    const cellW = (CW - gap) / 2;
    const labelH = LH(FS.small);
    const rows = Math.max(antes.length, depois.length);
    let cellH = Math.round(cellW * 0.58 * (0.5 + 0.5 * density));
    // Distribuição inteligente: com uma única linha de fotos, reduz a altura
    // (mínimo 80pt) para aproveitar o espaço restante da página em vez de
    // abrir uma nova página quase vazia.
    if (rows === 1) {
      const secH = FS.section + 4 + sp(8) + FS.body;
      const avail = BOTTOM - y - secH - labelH - sp(12);
      if (avail >= 80 && avail < cellH) cellH = Math.floor(avail);
    }
    section("REGISTRO FOTOGRÁFICO", labelH + cellH);
    for (let r = 0; r < rows; r++) {
      ensure(labelH + cellH + sp(8));
      doc.setFont("helvetica", "bold"); doc.setFontSize(FS.small); setText(brand);
      if (antes[r]) doc.text("ANTES", M, y);
      if (depois[r]) doc.text("DEPOIS", M + cellW + gap, y);
      y += labelH - 4;
      [antes[r], depois[r]].forEach((img, i) => {
        if (!img) return;
        const x = M + i * (cellW + gap);
        setFill(FILL); setDraw(LINE); doc.setLineWidth(0.5);
        doc.roundedRect(x, y, cellW, cellH, 3, 3, "FD");
        try { drawPhotoCover(doc, img, x + 2, y + 2, cellW - 4, cellH - 4); } catch {}
      });
      y += cellH + sp(10);
    }
    setText(TEXT);
  }

  // =====================================================================
  // 10) OBSERVAÇÕES — somente quando houver conteúdo
  // =====================================================================
  if (orc.observacoes && orc.observacoes.trim()) {
    section("OBSERVAÇÕES", LH(FS.small));
    paragraph(orc.observacoes.trim(), FS.small);
    y += sp(10);
  }

  // =====================================================================
  // 11) VALIDADE — discreta, no fim da proposta
  // =====================================================================
  ensure(LH(FS.small));
  doc.setFont("helvetica", "italic"); doc.setFontSize(FS.small); setText(MUTED);
  doc.text(
    `Este orçamento é válido por ${validadeDias} dias a partir da data de emissão (até ${dateBR(vencimento)}).`,
    M, y,
  );
  doc.setFont("helvetica", "normal"); setText(TEXT);

  // =====================================================================
  // 12) RODAPÉ
  // =====================================================================
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