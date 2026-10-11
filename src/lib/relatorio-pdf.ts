import { jsPDF } from "jspdf";
import type { Cliente, Empresa, Relatorio } from "./store";
import { relatorioStatusLabel, formaPagamentoLabel, situacaoPagamentoLabel, pdfTemaPreset, resolvePdfTemaAtivo } from "./store";
import { brl, dateBR, padNum } from "./format";

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [11, 27, 61];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function detectFmt(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
}

function aplicarMarcaDagua(doc: jsPDF, empresa: Empresa) {
  if (!empresa.logoDataUrl) return;
  try {
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const size = Math.min(W, H) * 0.55;
    const x = (W - size) / 2;
    const y = (H - size) / 2;
    const anyDoc = doc as unknown as {
      GState: new (o: { opacity: number }) => unknown;
      setGState: (s: unknown) => void;
    };
    const gsOn = new anyDoc.GState({ opacity: 0.1 });
    const gsOff = new anyDoc.GState({ opacity: 1 });
    anyDoc.setGState(gsOn);
    doc.addImage(empresa.logoDataUrl, detectFmt(empresa.logoDataUrl), x, y, size, size, undefined, "FAST");
    anyDoc.setGState(gsOff);
  } catch {}
}

function enderecoCompleto(c?: Cliente) {
  if (!c) return "—";
  if (c.endereco) return c.endereco;
  const linha1 = [c.rua, c.numero].filter(Boolean).join(", ");
  return [linha1, c.bairro, [c.cidade, c.estado].filter(Boolean).join("/"), c.cep && `CEP ${c.cep}`]
    .filter(Boolean).join(" — ");
}

export function gerarRelatorioPDF(
  r: Relatorio,
  cliente: Cliente | undefined,
  empresa: Empresa,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  // Margens: superior 3cm, demais 2cm
  const M = 57;
  const M_TOP = 85;
  const tema = resolvePdfTemaAtivo(empresa);
  const preset = pdfTemaPreset[tema] ?? pdfTemaPreset.azul_escuro;
  const modoMensal = empresa.pdfMesModo === "auto" || empresa.pdfMesModo === "manual";
  const brand = hexToRgb(modoMensal ? preset.principal : (empresa.corPdf ?? preset.principal));
  const FS = { title: 18, subtitle: 14, body: 13, footer: 11 };
  const LH = (s: number) => Math.round(s * 1.45);
  const BOTTOM = H - M - 30;
  const SECTION_HEADER_H = 30;
  const SECTION_GAP = 16;
  const SECTION_PAD_X = 10;
  function pageBreakIfNeeded(space: number, yRef: { y: number }) {
    if (yRef.y + space > BOTTOM) { doc.addPage(); yRef.y = M_TOP; }
  }

  // Cabeçalho
  const headerH = 110;
  aplicarMarcaDagua(doc, empresa);
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.rect(0, 0, W, headerH, "F");
  if (empresa.logoDataUrl) {
    try { doc.addImage(empresa.logoDataUrl, detectFmt(empresa.logoDataUrl), M, 18, 60, 60); } catch {}
  }
  const headX = empresa.logoDataUrl ? M + 72 : M;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(FS.title);
  doc.text(empresa.nome?.trim() || "Sua empresa", headX, 36, { maxWidth: W - headX - M });
  doc.setFont("helvetica", "normal"); doc.setFontSize(FS.body);
  const head = [
    empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : "",
    [empresa.telefone, empresa.whatsapp && `WhatsApp: ${empresa.whatsapp}`].filter(Boolean).join(" | "),
    empresa.email || "",
    empresa.endereco || "",
  ].filter(Boolean);
  let hy = 56;
  head.forEach((l) => { doc.text(l, headX, hy); hy += 17; });

  // Título
  let y = Math.max(headerH + 18, M_TOP);
  function ensure(space: number) {
    if (y + space > BOTTOM) {
      doc.addPage();
      aplicarMarcaDagua(doc, empresa);
      y = M_TOP;
    }
  }

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

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold"); doc.setFontSize(FS.title);
  doc.text("RELATÓRIO DE PRESTAÇÃO DE SERVIÇO", W / 2, y, { align: "center" });
  doc.setFontSize(FS.footer); doc.setFont("helvetica", "normal");
  doc.text(`RPS-${padNum(r.numero)}${r.orcamentoId ? "  ·  Vinculado ao orçamento" : ""}`, W / 2, y + 18, { align: "center" });
  y += 38;

  // Status
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.roundedRect(M, y, W - M * 2, 28, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(FS.body);
  doc.text(`Status: ${relatorioStatusLabel[r.status]}`, M + 10, y + 19);
  doc.text(`Data: ${dateBR(r.dataExecucao)}`, W - M - 10, y + 19, { align: "right" });
  doc.setTextColor(20, 20, 20);
  y += 28 + 30;

  // Dados do cliente
  doc.setFont("helvetica", "bold"); doc.setFontSize(FS.subtitle);
  doc.text("CLIENTE", M, y); y += 20;
  doc.setFont("helvetica", "normal"); doc.setFontSize(FS.body);
  const cliInfo = [
    `Nome: ${cliente?.nome ?? "—"}`,
    cliente?.telefone && `Telefone: ${cliente.telefone}`,
    cliente?.whatsapp && `WhatsApp: ${cliente.whatsapp}`,
    cliente?.email && `E-mail: ${cliente.email}`,
    `Endereço: ${enderecoCompleto(cliente)}`,
  ].filter(Boolean) as string[];
  cliInfo.forEach((l) => {
    const lines = doc.splitTextToSize(l, W - M * 2);
    lines.forEach((ln: string) => { doc.text(ln, M, y); y += LH(FS.body); });
  });
  y += 8;

  // Dados do serviço
  doc.setFont("helvetica", "bold"); doc.setFontSize(FS.subtitle);
  doc.text("DADOS DO SERVIÇO", M, y); y += 20;
  doc.setFont("helvetica", "normal"); doc.setFontSize(FS.body);
  const servInfo = [
    `Serviço: ${r.servicoExecutado}`,
    r.horaInicio && `Início: ${r.horaInicio}`,
    r.horaFim && `Término: ${r.horaFim}`,
    r.responsavel && `Responsável: ${r.responsavel}`,
    r.valor != null && `Valor: ${brl(r.valor)}`,
  ].filter(Boolean) as string[];
  servInfo.forEach((l) => { doc.text(l, M, y); y += LH(FS.body); });
  y += 8;

  // Serviços executados
  drawSectionHeader("SERVIÇOS EXECUTADOS");
  doc.setFont("helvetica", "normal"); doc.setFontSize(FS.body);
  const descLines = doc.splitTextToSize(r.descricao || "—", W - M * 2);
  descLines.forEach((ln: string) => {
    if (y > BOTTOM) { doc.addPage(); y = M_TOP; }
    doc.text(ln, M, y); y += LH(FS.body);
  });
  y += 8;

  // Observações
  if (r.observacoes) {
    drawSectionHeader("OBSERVAÇÕES");
    doc.setFont("helvetica", "normal"); doc.setFontSize(FS.body);
    const obs = doc.splitTextToSize(r.observacoes, W - M * 2);
    obs.forEach((ln: string) => {
      if (y > BOTTOM) { doc.addPage(); y = M_TOP; }
      doc.text(ln, M, y); y += LH(FS.body);
    });
    y += 8;
  }

  // Registro fotográfico
  const fotosGrupos: { titulo: string; arr: string[] }[] = [
    { titulo: "FOTOS ANTES", arr: r.fotosAntes },
    { titulo: "FOTOS DURANTE", arr: r.fotosDurante },
    { titulo: "FOTOS DEPOIS", arr: r.fotosDepois },
  ];
  for (const g of fotosGrupos) {
    if (g.arr.length === 0) continue;
    const cellW = (W - M * 2 - 12) / 2;
    const maxH = cellW * 0.72;
    const photos = g.arr.flatMap(data => {
      try {
        const props = doc.getImageProperties(data);
        const scale = Math.min(cellW / props.width, maxH / props.height);
        return [{ data, width: props.width * scale, height: props.height * scale }];
      } catch { return []; }
    });
    let heading = true;
    for (let i = 0; i < photos.length; i += 2) {
      const row = photos.slice(i, i + 2);
      const rowH = Math.max(...row.map(photo => photo.height));
      if (y + (heading ? 20 : 0) + rowH > BOTTOM) {
        ensure(BOTTOM - y + 1);
        heading = true;
      }
      if (heading) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(FS.subtitle);
        doc.text(g.titulo, M, y); y += 20;
        heading = false;
      }
      row.forEach((photo, col) => {
        const x = M + col * (cellW + 12) + (cellW - photo.width) / 2;
        doc.addImage(photo.data, detectFmt(photo.data), x, y, photo.width, photo.height, undefined, "FAST");
      });
      y += rowH + 8;
    }
    if (photos.length) y += 6;
  }

  // ===== PAGAMENTO =====
  const temPagamento = r.valorOrcamento != null || r.valorRecebido != null ||
    (r.formasPagamentoRecebimento && r.formasPagamentoRecebimento.length > 0) ||
    !!r.observacoesFinanceiras || !!r.situacaoPagamento;
  if (temPagamento) {
    drawSectionHeader("PAGAMENTO", 96);
    doc.setFont("helvetica", "normal"); doc.setFontSize(FS.body);
    const formas = (r.formasPagamentoRecebimento ?? []).map((f) => formaPagamentoLabel[f]).join(", ") || "—";
    const linhas: string[] = [
      `Valor do Orçamento: ${r.valorOrcamento != null ? brl(r.valorOrcamento) : "—"}`,
      `Valor Recebido: ${r.valorRecebido != null ? brl(r.valorRecebido) : "—"}`,
      `Forma de Pagamento: ${formas}`,
      r.parcelas && r.parcelas > 1 ? `Parcelas: ${r.parcelas}x${r.taxaCartao ? ` (taxa ${r.taxaCartao}%)` : ""}` : "",
      `Data do Recebimento: ${r.dataPagamento ? dateBR(r.dataPagamento) : "—"}`,
      `Situação: ${r.situacaoPagamento ? situacaoPagamentoLabel[r.situacaoPagamento] : "—"}`,
      r.recebidoPor ? `Recebido por: ${r.recebidoPor}` : "",
    ].filter(Boolean);
    linhas.forEach((l) => {
      if (y > BOTTOM) { doc.addPage(); y = M_TOP; }
      doc.text(l, M, y); y += LH(FS.body);
    });
    if (r.observacoesFinanceiras) {
      if (y > BOTTOM) { doc.addPage(); y = M_TOP; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(FS.body);
      doc.text("Observações Financeiras:", M, y); y += LH(FS.body);
      doc.setFont("helvetica", "normal");
      const obs = doc.splitTextToSize(r.observacoesFinanceiras, W - M * 2);
      obs.forEach((ln: string) => { if (y > BOTTOM) { doc.addPage(); y = M_TOP; } doc.text(ln, M, y); y += LH(FS.body); });
    }
    y += 8;
  }

  // Rodapé corporativo
  const fy = H - 52;
  doc.setFont("helvetica", "bold"); doc.setFontSize(FS.footer); doc.setTextColor(brand[0], brand[1], brand[2]);
  doc.text(empresa.nome?.trim() || "Sua empresa", W / 2, fy, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
  const footerLines = [
    "Todos os direitos reservados.",
  ];
  let ly = fy + 12;
  footerLines.forEach((l) => {
    const lines = doc.splitTextToSize(l, W - M * 2);
    lines.forEach((ln: string) => {
      doc.text(ln, W / 2, ly, { align: "center" });
      ly += 14;
    });
  });
  void pageBreakIfNeeded;

  return doc;
}