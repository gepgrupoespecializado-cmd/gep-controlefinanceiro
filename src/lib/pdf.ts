import { jsPDF } from "jspdf";
import type { Cliente, Empresa, Orcamento, Servico } from "./store";
import { totalOrcamento, validadeOrcamento } from "./store";
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

export function gerarOrcamentoPDF(
  orc: Orcamento,
  cliente: Cliente | undefined,
  servicos: Servico[],
  empresa: Empresa,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  const tema = empresa.temaPdf ?? "classico";
  const brand = hexToRgb(empresa.corPdf ?? "#0b1b3d");
  const tint = lighten(brand, 0.9);
  const { emissao, vencimento } = validadeOrcamento(orc);

  // Header band (varies by tema)
  let headerH = 90;
  if (tema === "moderno") headerH = 110;
  if (tema === "simples") headerH = 64;
  if (tema === "executivo") headerH = 96;

  if (tema === "simples") {
    doc.setDrawColor(brand[0], brand[1], brand[2]);
    doc.setLineWidth(3);
    doc.line(M, headerH, W - M, headerH);
  } else {
    doc.setFillColor(brand[0], brand[1], brand[2]);
    doc.rect(0, 0, W, headerH, "F");
    if (tema === "moderno") {
      doc.setFillColor(tint[0], tint[1], tint[2]);
      doc.rect(0, headerH, W, 8, "F");
    }
  }

  if (empresa.logoDataUrl) {
    try {
      doc.addImage(empresa.logoDataUrl, "PNG", M, tema === "simples" ? 12 : 18, 54, 54);
    } catch {}
  }
  if (tema === "simples") doc.setTextColor(brand[0], brand[1], brand[2]);
  else doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(tema === "executivo" ? 20 : 18);
  doc.text(empresa.nome || "Empresa", empresa.logoDataUrl ? M + 70 : M, tema === "simples" ? 36 : 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const headLines = [
    empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : "",
    [empresa.telefone, empresa.whatsapp && `WhatsApp: ${empresa.whatsapp}`].filter(Boolean).join(" | "),
    empresa.email || "",
    empresa.endereco || "",
  ].filter(Boolean);
  let hy = tema === "simples" ? 50 : 56;
  headLines.forEach((l) => {
    doc.text(l, empresa.logoDataUrl ? M + 70 : M, hy);
    hy += 11;
  });

  let y = headerH + 30;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Orçamento Nº ORC-${padNum(orc.numero)}`, M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Emitido em ${dateBR(emissao)}`, W - M, y, { align: "right" });

  // Validade — destaque
  y += 16;
  doc.setFillColor(tint[0], tint[1], tint[2]);
  doc.roundedRect(M, y - 12, W - M * 2, 28, 6, 6, "F");
  doc.setTextColor(brand[0], brand[1], brand[2]);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10);
  doc.text(`Validade: ${orc.validadeDias ?? 7} dia(s) — válido até ${dateBR(vencimento)}`, M + 10, y + 5);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  doc.text(`Emissão ${dateBR(emissao)}`, W - M - 10, y + 5, { align: "right" });
  doc.setTextColor(20, 20, 20);

  y += 32;
  doc.setDrawColor(220);
  doc.line(M, y, W - M, y);
  y += 18;

  // Cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Cliente", M, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const cli = cliente
    ? [
        cliente.nome,
        cliente.telefone && `Tel: ${cliente.telefone}`,
        cliente.email,
        cliente.endereco,
      ].filter(Boolean) as string[]
    : ["Cliente não informado"];
  cli.forEach((l) => {
    doc.text(l, M, y);
    y += 13;
  });

  y += 12;
  // Items header
  doc.setFillColor(tint[0], tint[1], tint[2]);
  doc.rect(M, y - 12, W - M * 2, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Descrição", M + 8, y + 3);
  doc.text("Qtd", W - M - 180, y + 3, { align: "right" });
  doc.text("Valor Unit.", W - M - 90, y + 3, { align: "right" });
  doc.text("Total", W - M - 8, y + 3, { align: "right" });
  y += 22;

  doc.setFont("helvetica", "normal");
  orc.itens.forEach((it) => {
    const nome =
      it.descricao ||
      servicos.find((s) => s.id === it.servicoId)?.nome ||
      "Serviço";
    const lines = doc.splitTextToSize(nome, W - M * 2 - 220);
    lines.forEach((ln: string, idx: number) => {
      doc.text(ln, M + 8, y);
      if (idx === 0) {
        doc.text(String(it.quantidade), W - M - 180, y, { align: "right" });
        doc.text(brl(it.valorUnit), W - M - 90, y, { align: "right" });
        doc.text(brl(it.quantidade * it.valorUnit), W - M - 8, y, { align: "right" });
      }
      y += 14;
    });
    y += 4;
    if (y > 720) {
      doc.addPage();
      y = M;
    }
  });

  // Total
  y += 8;
  doc.setDrawColor(220);
  doc.line(M, y, W - M, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(tema === "moderno" ? 14 : 12);
  doc.setTextColor(brand[0], brand[1], brand[2]);
  doc.text("Valor total:", W - M - 130, y, { align: "right" });
  doc.text(brl(totalOrcamento(orc)), W - M - 8, y, { align: "right" });
  doc.setTextColor(20, 20, 20);

  // Descrição dos Serviços Contratados
  if (orc.descricaoServicos && orc.descricaoServicos.trim()) {
    y += 30;
    if (y > 700) { doc.addPage(); y = M; }
    doc.setFillColor(brand[0], brand[1], brand[2]);
    doc.rect(M, y - 12, W - M * 2, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text("DESCRIÇÃO DOS SERVIÇOS CONTRATADOS", M + 8, y + 3);
    y += 22;
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    const descLines = doc.splitTextToSize(orc.descricaoServicos, W - M * 2);
    descLines.forEach((ln: string) => {
      if (y > 770) { doc.addPage(); y = M; }
      doc.text(ln, M, y);
      y += 13;
    });
  }

  // Prazo e observações
  y += 30;
  if (y > 740) { doc.addPage(); y = M; }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  if (orc.prazo) {
    doc.text("Prazo:", M, y);
    doc.setFont("helvetica", "normal");
    doc.text(orc.prazo, M + 46, y);
    y += 16;
  }
  if (orc.observacoes) {
    doc.setFont("helvetica", "bold");
    doc.text("Observações:", M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    const obs = doc.splitTextToSize(orc.observacoes, W - M * 2);
    obs.forEach((ln: string) => {
      doc.text(ln, M, y);
      y += 13;
    });
  }

  // Assinatura
  const footY = doc.internal.pageSize.getHeight() - 60;
  doc.setDrawColor(120);
  doc.line(M, footY, M + 220, footY);
  doc.setFontSize(9);
  doc.text("Assinatura — " + (empresa.nome || ""), M, footY + 14);

  doc.line(W - M - 220, footY, W - M, footY);
  doc.text("Cliente", W - M - 220, footY + 14);

  // Rodapé de validade
  doc.setFontSize(8); doc.setTextColor(120, 120, 120);
  doc.text(
    `Este orçamento é válido por ${orc.validadeDias ?? 7} dia(s) corridos a partir da data de emissão (${dateBR(emissao)}). Validade até ${dateBR(vencimento)}.`,
    W / 2, footY + 36, { align: "center", maxWidth: W - M * 2 },
  );

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