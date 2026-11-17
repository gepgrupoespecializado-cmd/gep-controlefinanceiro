import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { totalOrcamento, validadeOrcamento, type Orcamento, type Cliente, type Empresa } from "@/lib/store";
import { brl, dateBR, quoteNumber as padNum } from "@/lib/format";
import { nomeArquivoImagem } from "@/lib/orcamento-imagem";

interface Props { orcamento: Orcamento; cliente?: Cliente; empresa: Empresa }

/** Cartão 1080px usado apenas para gerar a imagem (fora da tela). */
function CartaoOrcamento({ orcamento: o, cliente, empresa }: Props) {
  const cor = empresa.corPdf || "#B8860B";
  const { emissao, vencimento } = validadeOrcamento(o);
  const itens = Array.isArray(o.itens) ? o.itens : [];
  const subtotal = itens.reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.valorUnit) || 0), 0);
  const desconto = Number(o.desconto) || 0;
  const contato = empresa.whatsapp || empresa.telefone;
  return (
    <div style={{ width: 1080, background: "#ffffff", color: "#1f2937", fontFamily: "inherit", fontSize: 30, lineHeight: 1.35 }}>
      <div style={{ background: cor, color: "#ffffff", padding: "48px 56px", display: "flex", alignItems: "center", gap: 32 }}>
        {empresa.logoDataUrl && <img src={empresa.logoDataUrl} alt="" style={{ width: 120, height: 120, objectFit: "contain", background: "#ffffff", borderRadius: 16, padding: 8 }} />}
        <div>
          <div style={{ fontSize: 46, fontWeight: 800 }}>{empresa.nome || "Sua empresa"}</div>
          {empresa.cnpj && <div style={{ fontSize: 26, opacity: 0.9 }}>CNPJ {empresa.cnpj}</div>}
        </div>
      </div>
      <div style={{ padding: "40px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `4px solid ${cor}`, paddingBottom: 20 }}>
          <div style={{ fontSize: 40, fontWeight: 800 }}>Orçamento Nº {padNum(o.numero)}</div>
          <div style={{ fontSize: 28 }}>{dateBR(emissao)}</div>
        </div>
        <div style={{ marginTop: 28, fontSize: 28, color: "#6b7280" }}>Cliente</div>
        <div style={{ fontSize: 36, fontWeight: 700 }}>{cliente?.nome || "-"}</div>
        <div style={{ marginTop: 32 }}>
          {itens.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 24, padding: "18px 0", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{it.categoria ? `${it.categoria} - ${it.descricao}` : it.descricao}</div>
                <div style={{ fontSize: 26, color: "#6b7280" }}>{it.quantidade} x {brl(Number(it.valorUnit) || 0)}</div>
              </div>
              <div style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{brl((Number(it.quantidade) || 0) * (Number(it.valorUnit) || 0))}</div>
            </div>
          ))}
        </div>
        {desconto > 0 && (
          <div style={{ marginTop: 20, fontSize: 28, color: "#6b7280" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><span>{brl(subtotal)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Desconto</span><span>- {brl(desconto)}</span></div>
          </div>
        )}
        <div style={{ marginTop: 28, background: cor, color: "#ffffff", borderRadius: 16, padding: "28px 36px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 34, fontWeight: 700 }}>TOTAL</span>
          <span style={{ fontSize: 56, fontWeight: 900 }}>{brl(totalOrcamento(o))}</span>
        </div>
        <div style={{ marginTop: 32, fontSize: 28 }}>Validade: {o.validadeDias ?? 7} dia(s), até {dateBR(vencimento)}</div>
        {contato && <div style={{ marginTop: 8, fontSize: 28 }}>WhatsApp: {contato}</div>}
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
