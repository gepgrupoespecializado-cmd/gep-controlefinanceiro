import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, History as HistoryIcon, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { db, useDB, type HistoricoEntidade } from "@/lib/store";
import { dateTimeBR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/historico")({
  head: () => ({ meta: [{ title: "Histórico — GEP Controle" }] }),
  component: HistoricoPage,
});

const entLabel: Record<HistoricoEntidade, string> = {
  cliente: "Cliente", servico: "Serviço", orcamento: "Orçamento",
  agendamento: "Agendamento", lancamento: "Financeiro", empresa: "Empresa",
};

const acaoColor: Record<string, string> = {
  criado: "bg-emerald-500", editado: "bg-blue-500", arquivado: "bg-amber-500",
  restaurado: "bg-emerald-500", excluido: "bg-red-500", status: "bg-indigo-500",
};

function HistoricoPage() {
  const data = useDB();
  const [q, setQ] = useState("");
  const [ent, setEnt] = useState<HistoricoEntidade | "todos">("todos");

  const filtrado = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.historico.filter((h) => {
      if (ent !== "todos" && h.entidade !== ent) return false;
      if (!term) return true;
      return [h.entidadeNome, h.campo, h.antes, h.depois].some((v) => v?.toLowerCase().includes(term));
    });
  }, [data.historico, q, ent]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black">Histórico de alterações</h1>
          <p className="text-xs text-muted-foreground">{data.historico.length} evento(s) registrado(s)</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm"><Trash2 className="h-4 w-4" />Limpar</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar todo o histórico?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { db.limparHistorico(); toast.success("Histórico limpo"); }}>Limpar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={ent} onValueChange={(v) => setEnt(v as typeof ent)}>
          <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas entidades</SelectItem>
            {(Object.keys(entLabel) as HistoricoEntidade[]).map((k) => (
              <SelectItem key={k} value={k}>{entLabel[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtrado.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
          <HistoryIcon className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
          Nenhum evento registrado.
        </CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <ul className="divide-y">
            {filtrado.map((h) => (
              <li key={h.id} className="p-4 grid grid-cols-[auto_1fr] gap-3">
                <span className={`mt-1.5 h-2 w-2 rounded-full ${acaoColor[h.acao] || "bg-slate-400"}`} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-sm">
                    <Badge variant="secondary" className="text-[10px]">{entLabel[h.entidade]}</Badge>
                    <span className="font-semibold truncate">{h.entidadeNome}</span>
                    <span className="text-xs text-muted-foreground capitalize">{h.acao}</span>
                  </div>
                  {h.campo && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <b>{h.campo}</b> alterado:
                      {h.antes !== undefined && <> de <code className="bg-muted px-1 rounded">{h.antes}</code></>}
                      {h.depois !== undefined && <> para <code className="bg-muted px-1 rounded">{h.depois}</code></>}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {dateTimeBR(h.data)} · por {h.usuario}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}