import { jsPDF } from "jspdf";
import type { Cliente, Empresa, Orcamento, Servico } from "./store";
import { totalOrcamento } from "./store";
import { brl, dateBR, padNum } from "./format";

export function gerarOrcamentoPDF(
  orc: Orcamento,
  cliente: Cliente | undefined,
  servicos: Servico[],
  empresa: Empresa,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = M;

  // Header band
  doc.setFillColor(11, 27, 61);
  doc.rect(0, 0, W, 90, "F");

  if (empresa.logoDataUrl) {
    try {
      doc.addImage(empresa.logoDataUrl, "PNG", M, 18, 54, 54);
    } catch {}
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(empresa.nome || "Empresa", empresa.logoDataUrl ? M + 70 : M, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const headLines = [
    empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : "",
    [empresa.telefone, empresa.whatsapp && `WhatsApp: ${empresa.whatsapp}`].filter(Boolean).join(" | "),
    empresa.email || "",
    empresa.endereco || "",
  ].filter(Boolean);
  let hy = 56;
  headLines.forEach((l) => {
    doc.text(l, empresa.logoDataUrl ? M + 70 : M, hy);
    hy += 11;
  });

  y = 120;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Orçamento Nº ORC-${padNum(orc.numero)}`, M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Emitido em ${dateBR(orc.criadoEm)}`, W - M, y, { align: "right" });

  y += 24;
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
  doc.setFillColor(240, 244, 252);
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
  doc.setFontSize(12);
  doc.text("Valor total:", W - M - 130, y, { align: "right" });
  doc.text(brl(totalOrcamento(orc)), W - M - 8, y, { align: "right" });

  // Prazo e observações
  y += 30;
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
  const footY = 780;
  doc.setDrawColor(120);
  doc.line(M, footY, M + 220, footY);
  doc.setFontSize(9);
  doc.text("Assinatura — " + (empresa.nome || ""), M, footY + 14);

  doc.line(W - M - 220, footY, W - M, footY);
  doc.text("Cliente", W - M - 220, footY + 14);

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