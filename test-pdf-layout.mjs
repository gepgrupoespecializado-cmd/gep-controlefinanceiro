import { jsPDF } from "jspdf";

const doc = new jsPDF({ unit: "pt", format: "a4" });
const W = doc.internal.pageSize.getWidth();
const H = doc.internal.pageSize.getHeight();
const M = 57;
const M_TOP = 85;
const brand = [11, 27, 61];
const sec = [46, 125, 50];
const FS = { title: 18, subtitle: 14, body: 12, footer: 10, miniHeader: 11 };
const LH = (s) => Math.round(s * 1.3);
const BOTTOM_LIMIT = H - M - 30;
let y = M_TOP;

function drawFooter() {
  const fy = H - 52;
  doc.setFont("helvetica", "bold"); doc.setFontSize(FS.footer); doc.setTextColor(brand[0], brand[1], brand[2]);
  doc.text("GEP SERVIÇOS ESPECIALIZADOS LTDA", W / 2, fy, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
  doc.text("Responsável: Eduardo Pennicha", W / 2, fy + 12, { align: "center" });
  doc.text("Todos os direitos reservados.", W / 2, fy + 24, { align: "center" });
}

// Header
doc.setFillColor(brand[0], brand[1], brand[2]);
doc.rect(0, 0, W, 78, "F");
doc.setFillColor(sec[0], sec[1], sec[2]);
doc.rect(0, 78, W, 3, "F");
doc.setTextColor(255, 255, 255);
doc.setFont("helvetica", "bold"); doc.setFontSize(FS.title);
doc.text("GEP SERVIÇOS ESPECIALIZADOS LTDA", M, 32, { maxWidth: W - M * 2 });
doc.setFont("helvetica", "normal"); doc.setFontSize(FS.footer);
doc.text("CNPJ: 00.000.000/0001-00  |  WhatsApp: 27998820-2704", M, 48);
doc.text("Vila Velha - ES", M, 62);

y = 96;

// Title block
doc.setFillColor(220, 230, 240);
doc.roundedRect(M, y, W - M * 2, 38, 5, 5, "F");
doc.setTextColor(brand[0], brand[1], brand[2]);
doc.setFont("helvetica", "bold"); doc.setFontSize(FS.subtitle);
doc.text("Orçamento Nº ORC-000002", M + 10, y + 16);
doc.setFont("helvetica", "normal"); doc.setFontSize(FS.footer);
doc.setTextColor(60, 60, 60);
doc.text("Emissão: 07/07/2026", M + 10, y + 30);
doc.text("Validade: 7 dia(s) — até 14/07/2026", W - M - 10, y + 30, { align: "right" });
doc.setTextColor(20, 20, 20);
y += 50;

// Cliente
doc.setFillColor(brand[0], brand[1], brand[2]);
doc.rect(M, y, W - M * 2, 30, "F");
doc.setTextColor(255, 255, 255);
doc.setFont("helvetica", "bold"); doc.setFontSize(FS.subtitle);
doc.text("CLIENTE", M + 10, y + 20);
doc.setTextColor(20, 20, 20);
y += 46;
doc.setFont("helvetica", "normal"); doc.setFontSize(FS.body);
doc.text("Nome: Eduardo Pennicha", M, y); y += LH(FS.body);
doc.text("WhatsApp: 27 99842 8856", M, y); y += LH(FS.body);
doc.text("Endereço: Rua João Corrêa de Lemos, 169 — Casa — Vila Garrido — Vila Velha/ES — CEP 29116250", M, y); y += LH(FS.body);

// Itens
doc.setFillColor(brand[0], brand[1], brand[2]);
doc.rect(M, y + 8, W - M * 2, 24, "F");
doc.setTextColor(255, 255, 255);
doc.setFont("helvetica", "bold"); doc.setFontSize(FS.body);
const headBaseline = y + 8 + 12 + FS.body * 0.35;
doc.text("DESCRIÇÃO", M + 10, headBaseline);
doc.text("QTD", W - M - 200, headBaseline, { align: "right" });
doc.text("VALOR UNIT.", W - M - 90, headBaseline, { align: "right" });
doc.text("TOTAL", W - M - 10, headBaseline, { align: "right" });
doc.setTextColor(20, 20, 20);
y += 40;
doc.setFont("helvetica", "normal"); doc.setFontSize(FS.body);
doc.text("Limpeza Especializada de Vidros", M + 10, y);
doc.text("1", W - M - 200, y, { align: "right" });
doc.text("R$ 250,00", W - M - 90, y, { align: "right" });
doc.setFont("helvetica", "bold");
doc.text("R$ 250,00", W - M - 10, y, { align: "right" });
doc.setFont("helvetica", "normal");
y += 36;

// Total
doc.setFillColor(brand[0], brand[1], brand[2]);
doc.roundedRect(W - M - 240, y, 240, 28, 4, 4, "F");
doc.setTextColor(255, 255, 255);
doc.setFont("helvetica", "bold"); doc.setFontSize(FS.subtitle);
doc.text("VALOR TOTAL", W - M - 230, y + 18);
doc.text("R$ 250,00", W - M - 8, y + 18, { align: "right" });
doc.setTextColor(20, 20, 20);
y += 46;

// Formas de pagamento
doc.setFillColor(brand[0], brand[1], brand[2]);
doc.rect(M, y, W - M * 2, 30, "F");
doc.setTextColor(255, 255, 255);
doc.setFont("helvetica", "bold"); doc.setFontSize(FS.subtitle);
doc.text("FORMAS DE PAGAMENTO", M + 10, y + 20);
doc.setTextColor(20, 20, 20);
y += 46;
doc.setFont("helvetica", "normal"); doc.setFontSize(FS.body);
doc.text("Para sua comodidade, disponibilizamos as seguintes formas de pagamento:", M, y); y += LH(FS.body);
["PIX", "Dinheiro", "Cartão de Débito", "Cartão de Crédito", "Transferência Bancária"].forEach((f) => {
  doc.text("•  " + f, M + 14, y); y += LH(FS.body);
});
doc.setFontSize(FS.footer); doc.setTextColor(110, 110, 110);
const aviso = "Pagamentos no cartão de crédito poderão sofrer acréscimo referente às taxas da operadora. Consulte condições e parcelamentos no momento da contratação.";
const av = doc.splitTextToSize(aviso, W - M * 2);
av.forEach((ln) => { doc.text(ln, M, y); y += 14; });
doc.setTextColor(20, 20, 20);

// Prazo
y += 16;
doc.setFont("helvetica", "bold"); doc.setFontSize(FS.body);
doc.text("Prazo:", M, y);
doc.setFont("helvetica", "normal");
doc.text("4 horas aproximadamente", M + 56, y);

// Footer (sem linhas e sem assinatura)
drawFooter();

doc.save("/tmp/test-orcamento.pdf");
console.log("PDF gerado em /tmp/test-orcamento.pdf");
