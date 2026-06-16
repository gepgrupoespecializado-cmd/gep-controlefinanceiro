import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Clock, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { db, useDB } from "@/lib/store";
import { brl } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/servicos")({
  head: () => ({ meta: [{ title: "Serviços — GEP Controle" }] }),
  component: ServicosPage,
});

function ServicosPage() {
  const data = useDB();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", descricao: "", valor: 0, tempoEstimado: "" });

  function salvar() {
    if (!form.nome.trim()) return toast.error("Informe o nome do serviço");
    db.addServico({ ...form, valor: Number(form.valor) || 0 });
    toast.success("Serviço cadastrado");
    setForm({ nome: "", descricao: "", valor: 0, tempoEstimado: "" });
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl sm:text-2xl font-black">Serviços</h1>
          <p className="text-xs text-muted-foreground">{data.servicos.length} cadastrado(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Novo serviço</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo serviço</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5"><Label className="text-xs">Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label className="text-xs">Valor padrão (R$)</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></div>
                <div className="grid gap-1.5"><Label className="text-xs">Tempo estimado</Label><Input placeholder="ex: 3h" value={form.tempoEstimado} onChange={(e) => setForm({ ...form, tempoEstimado: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={salvar}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.servicos.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex items-start gap-2">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Wrench className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{s.nome}</p>
                    {s.descricao && <p className="line-clamp-2 text-xs text-muted-foreground">{s.descricao}</p>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir serviço?")) { db.removeServico(s.id); toast.success("Excluído"); } }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{s.tempoEstimado || "—"}</span>
                <span className="font-bold text-primary">{brl(s.valor)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}