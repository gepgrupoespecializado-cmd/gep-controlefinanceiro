import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, FileText, Download, Copy, Share2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { db, useDB, totalOrcamento, statusOrcLabel, type OrcamentoItem } from "@/lib/store";
import { brl, dateBR, padNum } from "@/lib/format";
import { gerarOrcamentoPDF, abrirPDF, baixarPDF } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/orcamentos")({
  head: () => ({ meta: [{ title: "Orçamentos — GEP Controle" }] }),
  component: OrcamentosPage,
});

function OrcamentosPage() {
  const data = useDB();
  const [open, setOpen] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [prazo, setPrazo] = useState("");
  const [obs, setObs] = useState("");
  const [itens, setItens] = useState<OrcamentoItem[]>([
    { descricao: "", quantidade: 1, valorUnit: 0 },
  ]);

  function resetForm() {
    setClienteId(""); setPrazo(""); setObs("");
    setItens([{ descricao: "", quantidade: 1, valorUnit: 0 }]);
  }

  function adicionarItem() {
    setItens([...itens, { descricao: "", quantidade: 1, valorUnit: 0 }]);
  }
  function atualizarItem(idx: number, patch: Partial<OrcamentoItem>) {
    setItens(itens.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function removerItem(idx: number) {
    setItens(itens.filter((_, i) => i !== idx));
  }
  function escolherServico(idx: number, servicoId: string) {
    const s = data.servicos.find((x) => x.id === servicoId);
    if (!s) return;
    atualizarItem(idx, { servicoId, descricao: s.nome, valorUnit: s.valor });
  }

  function salvar() {
    if (!clienteId) return toast.error("Selecione um cliente");
    if (itens.length === 0 || itens.some((i) => !i.descricao.trim())) {
      return toast.error("Adicione ao menos um item com descrição");
    }
    db.addOrcamento({ clienteId, itens, prazo, observacoes: obs, status: "rascunho" });
    toast.success("Orçamento criado");
    setOpen(false); resetForm();
  }

  const total = itens.reduce((s, i) => s + i.quantidade * i.valorUnit, 0);

  function pdf(orcId: string, action: "view" | "download" | "share") {
    const o = data.orcamentos.find((x) => x.id === orcId);
    if (!o) return;
    const cli = data.clientes.find((c) => c.id === o.clienteId);
    const doc = gerarOrcamentoPDF(o, cli, data.servicos, data.empresa);
    const filename = `ORC-${padNum(o.numero)}.pdf`;
    if (action === "view") abrirPDF(doc);
    else if (action === "download") baixarPDF(doc, filename);
    else {
      const tot = totalOrcamento(o);
      const txt = `*Orçamento ORC-${padNum(o.numero)}*\nCliente: ${cli?.nome ?? ""}\nTotal: ${brl(tot)}\n${o.prazo ? "Prazo: " + o.prazo : ""}`;
      const tel = cli?.whatsapp?.replace(/\D/g, "") || "";
      const url = `https://wa.me/${tel}?text=${encodeURIComponent(txt)}`;
      window.open(url, "_blank");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl sm:text-2xl font-black">Orçamentos</h1>
          <p className="text-xs text-muted-foreground">{data.orcamentos.length} emitido(s) · próx: ORC-{padNum(data.proximoOrcamento)}</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Novo</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo orçamento</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Cliente *</Label>
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger><SelectValue placeholder={data.clientes.length ? "Selecione..." : "Cadastre um cliente primeiro"} /></SelectTrigger>
                  <SelectContent>
                    {data.clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Itens</Label>
                  <Button type="button" size="sm" variant="ghost" onClick={adicionarItem}><Plus className="h-3 w-3" />Item</Button>
                </div>
                <div className="space-y-2">
                  {itens.map((it, idx) => (
                    <div key={idx} className="rounded-lg border p-3 space-y-2 bg-muted/30">
                      <Select value={it.servicoId ?? ""} onValueChange={(v) => escolherServico(idx, v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar serviço cadastrado (opcional)" /></SelectTrigger>
                        <SelectContent>
                          {data.servicos.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome} — {brl(s.valor)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input placeholder="Descrição do serviço" value={it.descricao} onChange={(e) => atualizarItem(idx, { descricao: e.target.value })} />
                      <div className="grid grid-cols-[80px_1fr_auto] gap-2 items-center">
                        <Input type="number" step="1" min={1} value={it.quantidade} onChange={(e) => atualizarItem(idx, { quantidade: Number(e.target.value) || 1 })} />
                        <Input type="number" step="0.01" value={it.valorUnit} onChange={(e) => atualizarItem(idx, { valorUnit: Number(e.target.value) || 0 })} />
                        <Button variant="ghost" size="icon" onClick={() => removerItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                      <p className="text-right text-xs text-muted-foreground">Subtotal: <b>{brl(it.quantidade * it.valorUnit)}</b></p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label className="text-xs">Prazo</Label><Input placeholder="ex: 7 dias" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>
                <div className="grid gap-1.5"><Label className="text-xs">Total</Label><Input value={brl(total)} disabled className="font-bold" /></div>
              </div>
              <div className="grid gap-1.5"><Label className="text-xs">Observações</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={salvar}>Salvar orçamento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {data.orcamentos.length === 0 ? (
        <Card><CardContent className="p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum orçamento emitido ainda.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {data.orcamentos.map((o) => {
            const cli = data.clientes.find((c) => c.id === o.clienteId);
            return (
              <Card key={o.id}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold">ORC-{padNum(o.numero)}</p>
                        <Badge variant="secondary">{statusOrcLabel[o.status]}</Badge>
                      </div>
                      <p className="truncate text-sm text-muted-foreground mt-1">{cli?.nome ?? "Cliente removido"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{dateBR(o.criadoEm)} · {o.itens.length} item(ns)</p>
                    </div>
                    <p className="text-right text-xl font-black text-primary tabular-nums whitespace-nowrap">{brl(totalOrcamento(o))}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => pdf(o.id, "view")}><Eye className="h-3.5 w-3.5" />Visualizar PDF</Button>
                    <Button size="sm" variant="outline" onClick={() => pdf(o.id, "download")}><Download className="h-3.5 w-3.5" />Baixar</Button>
                    <Button size="sm" variant="outline" onClick={() => pdf(o.id, "share")}><Share2 className="h-3.5 w-3.5" />WhatsApp</Button>
                    <Button size="sm" variant="outline" onClick={() => { db.duplicarOrcamento(o.id); toast.success("Duplicado"); }}><Copy className="h-3.5 w-3.5" />Duplicar</Button>
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Excluir orçamento?")) { db.removeOrcamento(o.id); toast.success("Excluído"); } }}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}