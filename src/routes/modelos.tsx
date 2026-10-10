import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Star, Search, FileText, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDelete } from "@/components/confirm-delete";
import { db, useDB, type ModeloDescricao } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/modelos")({
  head: () => ({ meta: [
    { title: "Modelos de Descrição — Gestão de Serviços" },
    { name: "description", content: "Modelos de Descrição da sua empresa no aplicativo de gestão de serviços." },
    { property: "og:title", content: "Modelos de Descrição — Gestão de Serviços" },
    { property: "og:description", content: "Modelos de Descrição da sua empresa no aplicativo de gestão de serviços." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ModelosPage,
});

function ModelosPage() {
  const data = useDB();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ nome: "", conteudo: "" });

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...data.modelos]
      .sort((a, b) => Number(!!b.favorito) - Number(!!a.favorito))
      .filter((m) => !term || m.nome.toLowerCase().includes(term) || m.conteudo.toLowerCase().includes(term));
  }, [data.modelos, q]);

  function novo() { setEditId(null); setForm({ nome: "", conteudo: "" }); setOpen(true); }
  function editar(m: ModeloDescricao) { setEditId(m.id); setForm({ nome: m.nome, conteudo: m.conteudo }); setOpen(true); }
  function salvar() {
    if (!form.nome.trim()) return toast.error("Informe o nome");
    if (!form.conteudo.trim()) return toast.error("Informe a descrição");
    if (editId) { db.updateModelo(editId, form); toast.success("Modelo atualizado"); }
    else { db.addModelo(form); toast.success("Modelo criado"); }
    setOpen(false);
  }
  function duplicar(m: ModeloDescricao) {
    db.addModelo({ nome: m.nome + " (cópia)", conteudo: m.conteudo });
    toast.success("Modelo duplicado");
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl sm:text-2xl font-black">Modelos de descrição</h1>
          <p className="text-xs text-muted-foreground">{data.modelos.length} modelo(s) · use ao criar orçamentos</p>
        </div>
        <Button onClick={novo}><Plus className="h-4 w-4" />Novo modelo</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar modelo..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtrados.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex items-start gap-2">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FileText className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold flex items-center gap-1.5">
                      {m.nome}
                      {m.favorito && <Badge variant="secondary" className="text-[10px]">★ favorito</Badge>}
                    </p>
                  </div>
                </div>
                <div className="flex">
                  <Button variant="ghost" size="icon" onClick={() => db.toggleFavoritoModelo(m.id)} title="Favorito">
                    <Star className={`h-4 w-4 ${m.favorito ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => editar(m)} title="Editar"><Pencil className="h-4 w-4 text-primary" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => duplicar(m)} title="Duplicar"><Copy className="h-4 w-4" /></Button>
                  <ConfirmDelete
                    trigger={<Button variant="ghost" size="icon" title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    titulo={`Excluir modelo "${m.nome}"?`}
                    onConfirm={() => { db.removeModelo(m.id); toast.success("Modelo excluído"); }}
                  />
                </div>
              </div>
              <pre className="whitespace-pre-wrap text-xs text-muted-foreground line-clamp-6 font-sans">{m.conteudo}</pre>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar modelo" : "Novo modelo"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label className="text-xs">Nome do modelo *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="ex: Limpeza Técnica de Vidros" />
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">Descrição completa *</Label>
              <Textarea
                value={form.conteudo}
                onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                rows={12}
                placeholder="• Item 1...&#10;• Item 2..."
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}