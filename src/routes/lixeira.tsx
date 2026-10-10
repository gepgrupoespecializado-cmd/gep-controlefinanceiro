import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Trash2, RotateCcw, Trash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { db, useDB } from "@/lib/store";
import { dateBR, padNum } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/lixeira")({
  head: () => ({ meta: [
    { title: "Lixeira — Gestão de Serviços" },
    { name: "description", content: "Lixeira da sua empresa no aplicativo de gestão de serviços." },
    { property: "og:title", content: "Lixeira — Gestão de Serviços" },
    { property: "og:description", content: "Lixeira da sua empresa no aplicativo de gestão de serviços." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: LixeiraPage,
});

function LixeiraPage() {
  const data = useDB();
  const [tab, setTab] = useState("clientes");

  const lists = useMemo(() => ({
    clientes: data.clientes.filter((c) => c.arquivado),
    servicos: data.servicos.filter((s) => s.arquivado),
    orcamentos: data.orcamentos.filter((o) => o.arquivado),
    agendamentos: data.agendamentos.filter((a) => a.arquivado),
    lancamentos: data.lancamentos.filter((l) => l.arquivado),
  }), [data]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
          <Trash className="h-5 w-5" />Lixeira
        </h1>
        <p className="text-xs text-muted-foreground">Itens arquivados — restaure ou exclua definitivamente.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="clientes">Clientes <Badge variant="secondary" className="ml-2">{lists.clientes.length}</Badge></TabsTrigger>
          <TabsTrigger value="servicos">Serviços <Badge variant="secondary" className="ml-2">{lists.servicos.length}</Badge></TabsTrigger>
          <TabsTrigger value="orcamentos">Orçamentos <Badge variant="secondary" className="ml-2">{lists.orcamentos.length}</Badge></TabsTrigger>
          <TabsTrigger value="agendamentos">Agenda <Badge variant="secondary" className="ml-2">{lists.agendamentos.length}</Badge></TabsTrigger>
          <TabsTrigger value="lancamentos">Financeiro <Badge variant="secondary" className="ml-2">{lists.lancamentos.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="mt-4">
          <Row items={lists.clientes.map((c) => ({ id: c.id, titulo: c.nome, sub: c.email || c.telefone || "" }))}
            onRestore={(id) => { db.arquivarCliente(id, false); toast.success("Restaurado"); }}
            onDelete={(id) => { db.removeCliente(id); toast.success("Excluído"); }} />
        </TabsContent>
        <TabsContent value="servicos" className="mt-4">
          <Row items={lists.servicos.map((s) => ({ id: s.id, titulo: s.nome, sub: s.descricao || "" }))}
            onRestore={(id) => { db.arquivarServico(id, false); toast.success("Restaurado"); }}
            onDelete={(id) => { db.removeServico(id); toast.success("Excluído"); }} />
        </TabsContent>
        <TabsContent value="orcamentos" className="mt-4">
          <Row items={lists.orcamentos.map((o) => ({ id: o.id, titulo: `ORC-${padNum(o.numero)}`, sub: dateBR(o.criadoEm) }))}
            onRestore={(id) => { db.arquivarOrcamento(id, false); toast.success("Restaurado"); }}
            onDelete={(id) => { db.removeOrcamento(id); toast.success("Excluído"); }} />
        </TabsContent>
        <TabsContent value="agendamentos" className="mt-4">
          <Row items={lists.agendamentos.map((a) => ({ id: a.id, titulo: a.titulo, sub: dateBR(a.data) }))}
            onRestore={(id) => { db.arquivarAgendamento(id, false); toast.success("Restaurado"); }}
            onDelete={(id) => { db.removeAgendamento(id); toast.success("Excluído"); }} />
        </TabsContent>
        <TabsContent value="lancamentos" className="mt-4">
          <Row items={lists.lancamentos.map((l) => ({ id: l.id, titulo: l.descricao, sub: dateBR(l.data) }))}
            onRestore={(id) => { db.arquivarLancamento(id, false); toast.success("Restaurado"); }}
            onDelete={(id) => { db.removeLancamento(id); toast.success("Excluído"); }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Row({ items, onRestore, onDelete }: {
  items: { id: string; titulo: string; sub: string }[];
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) {
    return <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nada arquivado.</CardContent></Card>;
  }
  return (
    <Card><CardContent className="p-0">
      <ul className="divide-y">
        {items.map((it) => (
          <li key={it.id} className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-sm">{it.titulo}</p>
              <p className="truncate text-xs text-muted-foreground">{it.sub}</p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => onRestore(it.id)}><RotateCcw className="h-3.5 w-3.5" />Restaurar</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      "{it.titulo}" será removido definitivamente e não poderá ser recuperado.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(it.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </li>
        ))}
      </ul>
    </CardContent></Card>
  );
}