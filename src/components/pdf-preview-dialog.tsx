import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download, Share2, RefreshCw } from "lucide-react";
import { gerarOrcamentoPDF, baixarPDF } from "@/lib/pdf";
import {
  pdfTemaPreset, totalOrcamento, validadeOrcamento,
  type Orcamento, type Cliente, type Servico, type Empresa, type PdfTema,
} from "@/lib/store";
import { brl, dateBR, padNum } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orcamento: Orcamento | null;
  cliente?: Cliente;
  servicos: Servico[];
  empresa: Empresa;
}

const TEMAS: { value: PdfTema; nome: string }[] = [
  { value: "azul_corporativo", nome: "Azul Corporativo" },
  { value: "azul_escuro", nome: "Azul Escuro Premium" },
  { value: "verde_empresarial", nome: "Verde Empresarial" },
  { value: "cinza_executivo", nome: "Cinza Executivo" },
  { value: "preto_premium", nome: "Preto Premium" },
];

export function PdfPreviewDialog({ open, onOpenChange, orcamento, cliente, servicos, empresa }: Props) {
  const [tema, setTema] = useState<PdfTema>(empresa.temaPdf ?? "azul_escuro");
  const [cor, setCor] = useState<string>(empresa.corPdf ?? pdfTemaPreset.azul_escuro.principal);
  const [corSec, setCorSec] = useState<string>(empresa.corSecundariaPdf ?? pdfTemaPreset.azul_escuro.secundaria);
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    if (open) {
      setTema(empresa.temaPdf ?? "azul_escuro");
      setCor(empresa.corPdf ?? pdfTemaPreset[empresa.temaPdf ?? "azul_escuro"].principal);
      setCorSec(empresa.corSecundariaPdf ?? pdfTemaPreset[empresa.temaPdf ?? "azul_escuro"].secundaria);
    }
  }, [open, empresa]);

  const blobUrl = useMemo(() => {
    if (!open || !orcamento) return "";
    const doc = gerarOrcamentoPDF(orcamento, cliente, servicos, empresa, {
      temaPdf: tema, corPdf: cor, corSecundariaPdf: corSec,
    });
    const blob = doc.output("blob");
    return URL.createObjectURL(blob);
  }, [open, orcamento, cliente, servicos, empresa, tema, cor, corSec]);

  useEffect(() => {
    setUrl(blobUrl);
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [blobUrl]);

  function aplicarTema(t: PdfTema) {
    setTema(t);
    const p = pdfTemaPreset[t];
    setCor(p.principal); setCorSec(p.secundaria);
  }

  function baixar() {
    if (!orcamento) return;
    const doc = gerarOrcamentoPDF(orcamento, cliente, servicos, empresa, {
      temaPdf: tema, corPdf: cor, corSecundariaPdf: corSec,
    });
    baixarPDF(doc, `ORC-${padNum(orcamento.numero)}.pdf`);
  }

  function whatsapp() {
    if (!orcamento) return;
    const { vencimento } = validadeOrcamento(orcamento);
    const txt = [
      `*Orçamento ORC-${padNum(orcamento.numero)}*`,
      `Cliente: ${cliente?.nome ?? ""}`,
      `Total: ${brl(totalOrcamento(orcamento))}`,
      `Validade até: ${dateBR(vencimento)}`,
      "",
      "*DESCRIÇÃO DOS SERVIÇOS:*",
      orcamento.descricaoServicos,
    ].filter(Boolean).join("\n");
    const tel = cliente?.whatsapp?.replace(/\D/g, "") || "";
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(txt)}`, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Visualizar PDF · ORC-{orcamento ? padNum(orcamento.numero) : ""}</DialogTitle>
        </DialogHeader>

        <div className="grid lg:grid-cols-[260px_1fr] gap-4">
          <div className="space-y-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Modelo</Label>
              <div className="grid gap-1.5">
                {TEMAS.map((t) => {
                  const ativo = t.value === tema;
                  const p = pdfTemaPreset[t.value];
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => aplicarTema(t.value)}
                      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs text-left transition-colors ${ativo ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                    >
                      <span className="h-4 w-4 rounded" style={{ background: p.principal }} />
                      <span className="h-4 w-4 rounded" style={{ background: p.secundaria }} />
                      <span className="font-medium">{t.nome}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Cor principal</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                <Input value={cor} onChange={(e) => setCor(e.target.value)} className="font-mono h-9 text-xs" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Cor secundária</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={corSec} onChange={(e) => setCorSec(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                <Input value={corSec} onChange={(e) => setCorSec(e.target.value)} className="font-mono h-9 text-xs" />
              </div>
            </div>

            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => aplicarTema(tema)}>
              <RefreshCw className="h-3.5 w-3.5" />Restaurar cores do modelo
            </Button>

            <p className="text-[11px] text-muted-foreground border-t pt-2">
              A pré-visualização atualiza automaticamente conforme você troca o modelo ou as cores.
            </p>
          </div>

          <div className="min-h-[60vh] rounded-md border bg-muted/30 overflow-hidden">
            {url ? (
              <iframe src={url} title="Pré-visualização" className="h-[70vh] w-full" />
            ) : (
              <div className="grid place-items-center h-full text-sm text-muted-foreground">Gerando...</div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button variant="outline" onClick={whatsapp}><Share2 className="h-4 w-4" />WhatsApp</Button>
          <Button onClick={baixar}><Download className="h-4 w-4" />Baixar PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}