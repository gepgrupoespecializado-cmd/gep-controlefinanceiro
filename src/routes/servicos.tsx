import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Clock, Wrench, Pencil, Trash2, Search, Copy, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { db, useDB, type Servico } from "@/lib/store";
import { ConfirmDelete } from "@/components/confirm-delete";
import { brl } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/servicos")({
  head: () => ({ meta: [
    { title: "Serviços — Gestão de Serviços" },
    { name: "description", content: "Serviços da sua empresa no aplicativo de gestão de serviços." },
    { property: "og:title", content: "Serviços — Gestão de Serviços" },
    { property: "og:description", content: "Serviços da sua empresa no aplicativo de gestão de serviços." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ServicosPage,
});

function ServicosPage() {
  const data = useDB();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ nome: "", descricao: "", valor: 0, tempoEstimado: "" });

  // ===== Categoria PORTEIRO (acréscimo) =====
  const PORTEIRO_DESC =
    "Prestação de serviços de portaria e controle de acesso, conforme condições estabelecidas na proposta.";
  const PORTEIRO_FUNCOES = [
    "Porteiro Diurno — Escala 44 horas semanais",
    "Porteiro Noturno — Escala 44 horas semanais",
    "Porteiro Diurno — Escala 12x36",
    "Porteiro Noturno — Escala 12x36",
    "Porteiro Avulso",
  ];
  const [openPorteiro, setOpenPorteiro] = useState(false);
  const [porteiroFuncao, setPorteiroFuncao] = useState(PORTEIRO_FUNCOES[0]);
  const [porteiroDesc, setPorteiroDesc] = useState(PORTEIRO_DESC);
  const [porteiroValor, setPorteiroValor] = useState("");

  function abrirPorteiro() {
    setPorteiroFuncao(PORTEIRO_FUNCOES[0]);
    setPorteiroDesc(PORTEIRO_DESC);
    setPorteiroValor("");
    setOpenPorteiro(true);
  }
  function salvarPorteiro() {
    db.addServico({
      nome: porteiroFuncao,
      descricao: porteiroDesc,
      valor: porteiroValor.trim() === "" ? 0 : Number(porteiroValor.replace(",", ".")) || 0,
      tempoEstimado: "",
    });
    toast.success("Função de porteiro cadastrada");
    setOpenPorteiro(false);
  }

  const ativos = useMemo(
    () => data.servicos.filter((s) => !s.arquivado && s.nome.toLowerCase().includes(q.toLowerCase())),
    [data.servicos, q],
  );

  function abrirNovo() { setEditId(null); setForm({ nome: "", descricao: "", valor: 0, tempoEstimado: "" }); setOpen(true); }
  function abrirEdicao(s: Servico) {
    setEditId(s.id);
    setForm({ nome: s.nome, descricao: s.descricao ?? "", valor: s.valor, tempoEstimado: s.tempoEstimado ?? "" });
    setOpen(true);
  }
  function salvar() {
    if (!form.nome.trim()) return toast.error("Informe o nome do serviço");
    if (editId) { db.updateServico(editId, { ...form, valor: Number(form.valor) || 0 }); toast.success("Serviço atualizado"); }
    else { db.addServico({ ...form, valor: Number(form.valor) || 0 }); toast.success("Serviço cadastrado"); }
    setOpen(false);
  }
  function duplicar(s: Servico) {
    db.addServico({ nome: s.nome + " (cópia)", descricao: s.descricao, valor: s.valor, tempoEstimado: s.tempoEstimado });
    toast.success("Serviço duplicado");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl sm:text-2xl font-black">Serviços</h1>
          <p className="text-xs text-muted-foreground">{ativos.length} ativo(s)</p>
        </div>
        <Button onClick={abrirNovo}><Plus className="h-4 w-4" />Novo serviço</Button>
        <Button variant="outline" className="col-span-2 sm:col-span-1" onClick={abrirPorteiro}>
          <ShieldCheck className="h-4 w-4" />Porteiro
        </Button>
        <Dialog open={openPorteiro} onOpenChange={setOpenPorteiro}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova função — Porteiro</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Função *</Label>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={porteiroFuncao}
                  onChange={(e) => setPorteiroFuncao(e.target.value)}
                >
                  {PORTEIRO_FUNCOES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Descrição</Label>
                <Textarea value={porteiroDesc} onChange={(e) => setPorteiroDesc(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Valor do Serviço (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder=""
                  value={porteiroValor}
                  onChange={(e) => setPorteiroValor(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpenPorteiro(false)}>Cancelar</Button>
              <Button onClick={salvarPorteiro}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Editar serviço" : "Novo serviço"}</DialogTitle></DialogHeader>
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar serviço..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ativos.map((s) => (
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
                <div className="flex">
                  <Button variant="ghost" size="icon" onClick={() => abrirEdicao(s)} title="Editar"><Pencil className="h-4 w-4 text-primary" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => duplicar(s)} title="Duplicar"><Copy className="h-4 w-4" /></Button>
                  <ConfirmDelete
                    trigger={<Button variant="ghost" size="icon" title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    titulo={`Excluir serviço "${s.nome}"?`}
                    onConfirm={() => { db.arquivarServico(s.id); toast.success("Serviço excluído"); }}
                  />
                </div>
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