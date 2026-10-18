import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download, Share2, RefreshCw, ExternalLink } from "lucide-react";
import { gerarOrcamentoPDF, baixarPDF, compartilharPDF } from "@/lib/pdf";
import {
  pdfTemaPreset, totalOrcamento, validadeOrcamento,
  type Orcamento, type Cliente, type Servico, type Empresa, type PdfTema,
} from "@/lib/store";
import { brl, dateBR, padNum } from "@/lib/format";

// Renderiza as páginas do PDF em <canvas> usando pdf.js para garantir
// pré-visualização funcional em Android, iOS, Web e PWA (o <iframe> com
// blob PDF não abre inline em navegadores móveis).
async function renderPdfPreview(blob: Blob, container: HTMLDivElement) {
  const pdfjs = (await import("pdfjs-dist")) as unknown as {
    version: string;
    GlobalWorkerOptions: { workerSrc: string };
    getDocument: (src: { data: ArrayBuffer }) => {
      promise: Promise<{
        numPages: number;
        getPage: (n: number) => Promise<{
          getViewport: (opts: { scale: number }) => { width: number; height: number };
          render: (ctx: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => {
            promise: Promise<void>;
          };
        }>;
      }>;
    };
  };
  // Worker via CDN (compatível com Vite/edge sem custom bundling)
  const workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const buf = await blob.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  container.innerHTML = "";
  const maxPages = Math.min(pdf.numPages, 3);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const containerWidth = container.clientWidth || 700;
    const scale = Math.min(2, (containerWidth - 16) / viewport.width);
    const scaled = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(scaled.width * ratio);
    canvas.height = Math.floor(scaled.height * ratio);
    canvas.style.width = `${scaled.width}px`;
    canvas.style.height = `${scaled.height}px`;
    canvas.className = "mx-auto mb-3 rounded shadow-sm bg-white";
    const ctx = canvas.getContext("2d")!;
    ctx.scale(ratio, ratio);
    await page.render({ canvasContext: ctx, viewport: scaled }).promise;
    container.appendChild(canvas);
  }
}

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
  const [previewRef, setPreviewRef] = useState<HTMLDivElement | null>(null);
  const [previewErr, setPreviewErr] = useState<string>("");

  useEffect(() => {
    if (open) {
      setTema(empresa.temaPdf ?? "azul_escuro");
      setCor(empresa.corPdf ?? pdfTemaPreset[empresa.temaPdf ?? "azul_escuro"].principal);
      setCorSec(empresa.corSecundariaPdf ?? pdfTemaPreset[empresa.temaPdf ?? "azul_escuro"].secundaria);
    }
  }, [open, empresa]);

  const blob = useMemo(() => {
    if (!open || !orcamento) return "";
    const doc = gerarOrcamentoPDF(orcamento, cliente, servicos, empresa, {
      temaPdf: tema, corPdf: cor, corSecundariaPdf: corSec,
    });
    return doc.output("blob") as Blob;
  }, [open, orcamento, cliente, servicos, empresa, tema, cor, corSec]);

  useEffect(() => {
    if (!blob) { setUrl(""); return; }
    const u = URL.createObjectURL(blob as Blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  useEffect(() => {
    if (!blob || !previewRef) return;
    let cancelled = false;
    setPreviewErr("");
    renderPdfPreview(blob as Blob, previewRef).catch((e) => {
      if (!cancelled) setPreviewErr(String(e?.message || e));
    });
    return () => { cancelled = true; };
  }, [blob, previewRef]);

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

  async function compartilhar() {
    if (!orcamento) return;
    const doc = gerarOrcamentoPDF(orcamento, cliente, servicos, empresa, {
      temaPdf: tema, corPdf: cor, corSecundariaPdf: corSec,
    });
    const { vencimento } = validadeOrcamento(orcamento);
    const txt = [
      `*Orçamento ORC-${padNum(orcamento.numero)}*`,
      `Cliente: ${cliente?.nome ?? ""}`,
      `Total: ${brl(totalOrcamento(orcamento))}`,
      `Validade até: ${dateBR(vencimento)}`,
    ].filter(Boolean).join("\n");
    await compartilharPDF({
      doc,
      filename: `ORC-${padNum(orcamento.numero)}.pdf`,
      titulo: `Orçamento ORC-${padNum(orcamento.numero)}`,
      mensagem: txt,
      telefone: cliente?.whatsapp,
    });
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

          <div className="rounded-md border bg-muted/30 overflow-auto max-h-[70vh] p-2">
            <div ref={setPreviewRef} className="min-h-[40vh]" />
            {previewErr && (
              <p className="text-xs text-destructive text-center mt-2">
                Falha ao gerar prévia: {previewErr}
              </p>
            )}
            {!previewErr && url && (
              <div className="flex justify-center mt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => window.open(url, "_blank")}>
                  <ExternalLink className="h-4 w-4" /> Abrir em nova aba
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button variant="outline" onClick={compartilhar}><Share2 className="h-4 w-4" />Compartilhar</Button>
          <Button onClick={baixar}><Download className="h-4 w-4" />Baixar PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}