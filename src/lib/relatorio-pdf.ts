import { jsPDF } from "jspdf";
import type { Cliente, Empresa, Relatorio } from "./store";
import { relatorioStatusLabel } from "./store";
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
  const M = 40;
  const brand = hexToRgb(empresa.corPdf ?? "#0b1b3d");

  // Cabeçalho
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.rect(0, 0, W, 96, "F");
  if (empresa.logoDataUrl) {
    try { doc.addImage(empresa.logoDataUrl, "PNG", M, 18, 60, 60); } catch {}
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text(empresa.nome || "GEP Serviços Especializado", empresa.logoDataUrl ? M + 76 : M, 38);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const head = [
    empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : "",
    [empresa.telefone, empresa.whatsapp && `WhatsApp: ${empresa.whatsapp}`].filter(Boolean).join(" | "),
    empresa.email || "",
    empresa.endereco || "",
  ].filter(Boolean);
  let hy = 54;
  head.forEach((l) => { doc.text(l, empresa.logoDataUrl ? M + 76 : M, hy); hy += 11; });

  // Título
  let y = 120;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text("RELATÓRIO DE PRESTAÇÃO DE SERVIÇO", W / 2, y, { align: "center" });
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`RPS-${padNum(r.numero)}${r.orcamentoId ? "  ·  Vinculado ao orçamento" : ""}`, W / 2, y + 16, { align: "center" });
  y += 36;

  // Status
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.roundedRect(M, y, W - M * 2, 24, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text(`Status: ${relatorioStatusLabel[r.status]}`, M + 10, y + 16);
  doc.text(`Data: ${dateBR(r.dataExecucao)}`, W - M - 10, y + 16, { align: "right" });
  doc.setTextColor(20, 20, 20);
  y += 36;

  // Dados do cliente
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("CLIENTE", M, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const cliInfo = [
    `Nome: ${cliente?.nome ?? "—"}`,
    cliente?.telefone && `Telefone: ${cliente.telefone}`,
    cliente?.whatsapp && `WhatsApp: ${cliente.whatsapp}`,
    cliente?.email && `E-mail: ${cliente.email}`,
    `Endereço: ${enderecoCompleto(cliente)}`,
  ].filter(Boolean) as string[];
  cliInfo.forEach((l) => {
    const lines = doc.splitTextToSize(l, W - M * 2);
    lines.forEach((ln: string) => { doc.text(ln, M, y); y += 13; });
  });
  y += 8;

  // Dados do serviço
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("DADOS DO SERVIÇO", M, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const servInfo = [
    `Serviço: ${r.servicoExecutado}`,
    r.horaInicio && `Início: ${r.horaInicio}`,
    r.horaFim && `Término: ${r.horaFim}`,
    r.responsavel && `Responsável: ${r.responsavel}`,
    r.valor != null && `Valor: ${brl(r.valor)}`,
  ].filter(Boolean) as string[];
  servInfo.forEach((l) => { doc.text(l, M, y); y += 13; });
  y += 8;

  // Serviços executados
  doc.setFillColor(brand[0], brand[1], brand[2]);
  doc.rect(M, y - 12, W - M * 2, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("SERVIÇOS EXECUTADOS", M + 8, y + 3);
  y += 22;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const descLines = doc.splitTextToSize(r.descricao || "—", W - M * 2);
  descLines.forEach((ln: string) => {
    if (y > H - 80) { doc.addPage(); y = M; }
    doc.text(ln, M, y); y += 13;
  });
  y += 8;

  // Observações
  if (r.observacoes) {
    if (y > H - 100) { doc.addPage(); y = M; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text("OBSERVAÇÕES", M, y); y += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    const obs = doc.splitTextToSize(r.observacoes, W - M * 2);
    obs.forEach((ln: string) => {
      if (y > H - 80) { doc.addPage(); y = M; }
      doc.text(ln, M, y); y += 13;
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
    if (y > H - 200) { doc.addPage(); y = M; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(g.titulo, M, y); y += 14;
    const cellW = (W - M * 2 - 16) / 3;
    const cellH = cellW * 0.75;
    let col = 0;
    for (const d of g.arr) {
      if (y + cellH > H - 60) { doc.addPage(); y = M; col = 0; }
      const x = M + col * (cellW + 8);
      try { doc.addImage(d, detectFmt(d), x, y, cellW, cellH, undefined, "FAST"); } catch {}
      col++;
      if (col >= 3) { col = 0; y += cellH + 8; }
    }
    if (col !== 0) y += cellH + 8;
    y += 6;
  }

  // Assinaturas
  if (y > H - 140) { doc.addPage(); y = M; }
  y = Math.max(y, H - 140);
  const halfW = (W - M * 2 - 20) / 2;
  // Tecnico
  if (r.assinaturaTecnico) {
    try { doc.addImage(r.assinaturaTecnico, "PNG", M, y, halfW, 50); } catch {}
  }
  doc.setDrawColor(120); doc.line(M, y + 56, M + halfW, y + 56);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`Responsável Técnico — ${r.responsavel || empresa.nome || ""}`, M, y + 70);
  // Cliente
  const xC = M + halfW + 20;
  if (r.assinaturaCliente) {
    try { doc.addImage(r.assinaturaCliente, "PNG", xC, y, halfW, 50); } catch {}
  }
  doc.line(xC, y + 56, xC + halfW, y + 56);
  doc.text(`Cliente — ${cliente?.nome ?? ""}`, xC, y + 70);

  return doc;
}