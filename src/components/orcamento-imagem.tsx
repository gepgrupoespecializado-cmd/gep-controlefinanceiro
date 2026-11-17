import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { totalOrcamento, validadeOrcamento, formaPagamentoLabel, type Orcamento, type Cliente, type Empresa } from "@/lib/store";
import { brl, dateBR, quoteNumber as padNum } from "@/lib/format";
import { nomeArquivoImagem } from "@/lib/orcamento-imagem";

interface Props { orcamento: Orcamento; cliente?: Cliente; empresa: Empresa }

/** Cartão 1080px usado apenas para gerar a imagem (fora da tela), no mesmo padrão do PDF. */
function CartaoOrcamento({ orcamento: o, cliente, empresa }: Props) {
  const cor = empresa.corPdf || "#B8860B";
  const { emissao, vencimento } = validadeOrcamento(o);
  const itens = Array.isArray(o.itens) ? o.itens : [];
  const subtotal = itens.reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.valorUnit) || 0), 0);
  const desconto = Number(o.desconto) || 0;
  const contato = empresa.whatsapp || empresa.telefone;
  const nome = (empresa.nome?.trim() || "Sua empresa").toUpperCase();
  const numero = o.numero > 0 ? String(o.numero).padStart(6, "0") : "......";
  const telCli = cliente?.whatsapp || cliente?.telefone;
  const end = cliente?.endereco || [cliente?.rua, cliente?.bairro, [cliente?.cidade, cliente?.estado].filter(Boolean).join("/")].filter(Boolean).join(" - ");
  const escopo = (o.escopo ?? []).filter((t) => t && t.trim());
  const topicos = escopo.length ? escopo : (o.descricaoServicos ?? "").split(/\r?\n/).map((t) => t.replace(/^[•\-\s]+/, "").trim()).filter(Boolean);
  const formas = o.formasPagamento?.length ? o.formasPagamento.map((x) => formaPagamentoLabel[x]) : ["PIX", "Dinheiro", "Cartão de Débito", "Cartão de Crédito"];
  const barra = (t: string) => <div style={{ background: cor, color: "#ffffff", fontWeight: 700, fontSize: 28, padding: "12px 20px", marginTop: 32, marginBottom: 18 }}>{t}</div>;
  const cel = { padding: "14px 16px" } as const;
  return (
    <div style={{ width: 1080, background: "#ffffff", color: "#1e1e1e", fontFamily: "Helvetica, Arial, sans-serif", fontSize: 26, lineHeight: 1.4, position: "relative" }}>
      {empresa.logoDataUrl && <img src={empresa.logoDataUrl} alt="" style={{ position: "absolute", left: "50%", top: "50%", width: 600, height: 600, objectFit: "contain", transform: "translate(-50%,-50%)", opacity: 0.06 }} />}
      <div style={{ background: cor, color: "#ffffff", padding: "28px 56px", display: "flex", alignItems: "center", gap: 28, borderBottom: "6px solid rgba(255,255,255,0.45)" }}>
        {empresa.logoDataUrl && <img src={empresa.logoDataUrl} alt="" style={{ width: 130, height: 130, objectFit: "contain" }} />}
        <div>
          <div style={{ fontSize: 38, fontWeight: 800 }}>{nome}</div>
          {empresa.cnpj && <div style={{ fontSize: 22 }}>CNPJ: {empresa.cnpj}</div>}
          {contato && <div style={{ fontSize: 22 }}>WhatsApp: {contato}</div>}
          {empresa.endereco?.trim() && <div style={{ fontSize: 22 }}>{empresa.endereco}</div>}
        </div>
      </div>
      <div style={{ padding: "28px 56px 40px", position: "relative" }}>
        <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: "16px 22px" }}>
          <div style={{ color: cor, fontWeight: 800, fontSize: 32 }}>Orçamento Nº ORC-{numero}</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22 }}>
            <span>Emissão: {dateBR(emissao)}</span>
            <span>Validade: {o.validadeDias ?? 7} dia(s), até {dateBR(vencimento)}</span>
          </div>
        </div>
        {barra("CLIENTE")}
        <div>Nome: {cliente?.nome ?? "-"}</div>
        {telCli && <div>WhatsApp: {telCli}</div>}
        {end && <div>Endereço: {end}</div>}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 28 }}>
          <thead><tr style={{ background: cor, color: "#ffffff", fontSize: 22 }}>
            <th style={{ ...cel, textAlign: "left" }}>DESCRIÇÃO</th><th style={{ ...cel, textAlign: "center" }}>QTD</th>
            <th style={{ ...cel, textAlign: "right" }}>VALOR UNIT.</th><th style={{ ...cel, textAlign: "right" }}>TOTAL</th>
          </tr></thead>
          <tbody>{itens.map((it, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <td style={cel}>{it.descricao || "Serviço"}</td>
              <td style={{ ...cel, textAlign: "center" }}>{it.quantidade}</td>
              <td style={{ ...cel, textAlign: "right", whiteSpace: "nowrap" }}>{brl(Number(it.valorUnit) || 0)}</td>
              <td style={{ ...cel, textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{brl((Number(it.quantidade) || 0) * (Number(it.valorUnit) || 0))}</td>
            </tr>))}</tbody>
        </table>
        {desconto > 0 && <div style={{ textAlign: "right", marginTop: 12, fontSize: 22 }}>Subtotal: {brl(subtotal)}   Desconto: - {brl(desconto)}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <div style={{ background: cor, color: "#ffffff", borderRadius: 6, padding: "14px 24px", display: "flex", gap: 48, fontWeight: 800, fontSize: 30 }}>
            <span>VALOR TOTAL</span><span>{brl(totalOrcamento(o))}</span>
          </div>
        </div>
        {topicos.length > 0 && <>{barra("DESCRIÇÃO DOS SERVIÇOS CONTRATADOS")}{topicos.map((t, i) => <div key={i}>• {t}</div>)}</>}
        {barra("FORMAS DE PAGAMENTO")}
        <div>Para sua comodidade, disponibilizamos as seguintes formas de pagamento:</div>
        {formas.map((x) => <div key={x} style={{ paddingLeft: 24 }}>• {x}</div>)}
        <div style={{ fontSize: 20, color: "#6e6e6e", marginTop: 10 }}>Pagamentos no cartão de crédito poderão sofrer acréscimo referente às taxas da operadora. Consulte condições e parcelamentos no momento da contratação.</div>
        <div style={{ textAlign: "center", marginTop: 48, fontSize: 22 }}>
          <div style={{ color: cor, fontWeight: 700 }}>{nome}</div>
          {empresa.responsavel?.trim() && <div style={{ color: "#6e6e6e" }}>Responsável: {empresa.responsavel.trim()}</div>}
          <div style={{ color: "#6e6e6e" }}>Todos os direitos reservados.</div>
        </div>
      </div>
    </div>
  );
}

export function OrcamentoImagemButton(props: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [gerando, setGerando] = useState(false);
  const [montar, setMontar] = useState(false);

  async function gerar() {
    setGerando(true);
    setMontar(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const node = ref.current?.firstElementChild as HTMLElement | null;
      if (!node) throw new Error("cartão indisponível");
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(node, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
      if (!blob) throw new Error("falha ao gerar");
      const nome = nomeArquivoImagem(props.cliente?.nome, new Date());
      const file = new File([blob], nome, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try { await nav.share({ files: [file], title: `Orçamento ${padNum(props.orcamento.numero)}` }); return; }
        catch (e) { if ((e as Error)?.name === "AbortError") return; }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success("Imagem salva! Agora é só anexar no WhatsApp");
    } catch {
      toast.error("Não foi possível gerar a imagem. Tente novamente.");
    } finally {
      setGerando(false);
      setMontar(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={gerar} disabled={gerando}>
        {gerando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}Enviar como imagem
      </Button>
      {montar && (
        <div ref={ref} aria-hidden style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}>
          <CartaoOrcamento {...props} />
        </div>
      )}
    </>
  );
}
