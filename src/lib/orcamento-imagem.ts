/** Nome do arquivo PNG: orcamento-NOME-DO-CLIENTE-DATA.png */
export function nomeArquivoImagem(nomeCliente: string | undefined, data: Date): string {
  const slug = (nomeCliente || "cliente")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .toUpperCase() || "CLIENTE";
  const d = isNaN(data.getTime()) ? new Date() : data;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `orcamento-${slug}-${dd}-${mm}-${d.getFullYear()}.png`;
}
