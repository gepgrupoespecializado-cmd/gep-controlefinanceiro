import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { db, useDB, type LancamentoTipo } from "@/lib/store";
import { brl, dateBR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — GEP Controle" }] }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const data = useDB();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tipo: "entrada" as LancamentoTipo, descricao: "", valor: 0,
    data: new Date().toISOString().slice(0, 10), categoria: "",
  });
  const [periodo, setPeriodo] = useState<"diario" | "semanal" | "mensal" | "anual">("mensal");

  const entradas = data.lancamentos.filter((l) => l.tipo === "entrada").reduce((s, l) => s + l.valor, 0);
  const saidas = data.lancamentos.filter((l) => l.tipo === "saida").reduce((s, l) => s + l.valor, 0);
  const saldo = entradas - saidas;

  const grafico = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; entrada: number; saida: number }[] = [];
    if (periodo === "diario") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i);
        buckets.push({ key: d.toDateString(), label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), entrada: 0, saida: 0 });
      }
    } else if (periodo === "semanal") {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now); d.setDate(d.getDate() - i * 7);
        buckets.push({ key: `sem-${i}`, label: `Sem ${6 - i}`, entrada: 0, saida: 0 });
      }
    } else if (periodo === "mensal") {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("pt-BR", { month: "short" }), entrada: 0, saida: 0 });
      }
    } else {
      for (let i = 4; i >= 0; i--) {
        const y = now.getFullYear() - i;
        buckets.push({ key: `${y}`, label: String(y), entrada: 0, saida: 0 });
      }
    }

    data.lancamentos.forEach((l) => {
      const d = new Date(l.data);
      let key = "";
      if (periodo === "diario") key = d.toDateString();
      else if (periodo === "mensal") key = `${d.getFullYear()}-${d.getMonth()}`;
      else if (periodo === "anual") key = `${d.getFullYear()}`;
      else {
        const diff = Math.floor((+now - +d) / (1000 * 60 * 60 * 24 * 7));
        if (diff >= 0 && diff < 6) key = `sem-${5 - diff}`;
      }
      const b = buckets.find((x) => x.key === key);
      if (b) {
        if (l.tipo === "entrada") b.entrada += l.valor;
        else b.saida += l.valor;
      }
    });
    return buckets;
  }, [data.lancamentos, periodo]);

  function salvar() {
    if (!form.descricao.trim()) return toast.error("Informe a descrição");
    if (!form.valor || form.valor <= 0) return toast.error("Valor inválido");
    db.addLancamento({
      tipo: form.tipo, descricao: form.descricao, valor: Number(form.valor),
      data: new Date(form.data + "T12:00:00").toISOString(), categoria: form.categoria,
    });
    toast.success("Lançamento adicionado");
    setForm({ ...form, descricao: "", valor: 0, categoria: "" });
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl sm:text-2xl font-black">Financeiro</h1>
          <p className="text-xs text-muted-foreground">Fluxo de caixa e relatórios</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Lançamento</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as LancamentoTipo })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5"><Label className="text-xs">Descrição</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label className="text-xs">Valor (R$)</Label><Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} /></div>
                <div className="grid gap-1.5"><Label className="text-xs">Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
              </div>
              <div className="grid gap-1.5"><Label className="text-xs">Categoria</Label><Input placeholder="ex: Serviço, Material..." value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={salvar}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Entradas</p>
          <p className="text-2xl font-black text-emerald-600">{brl(entradas)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Saídas</p>
          <p className="text-2xl font-black text-destructive">{brl(saidas)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Saldo atual</p>
          <p className={`text-2xl font-black ${saldo >= 0 ? "text-primary" : "text-destructive"}`}>{brl(saldo)}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Relatório</CardTitle></CardHeader>
        <CardContent>
          <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as typeof periodo)}>
            <TabsList className="grid w-full grid-cols-4 max-w-md">
              <TabsTrigger value="diario">Diário</TabsTrigger>
              <TabsTrigger value="semanal">Semanal</TabsTrigger>
              <TabsTrigger value="mensal">Mensal</TabsTrigger>
              <TabsTrigger value="anual">Anual</TabsTrigger>
            </TabsList>
            <TabsContent value={periodo} className="mt-4">
              <div className="h-[280px] w-full">
                <ResponsiveContainer>
                  <BarChart data={grafico}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip formatter={(v: number) => brl(v)} />
                    <Bar dataKey="entrada" name="Entradas" fill="oklch(0.65 0.16 150)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="saida" name="Saídas" fill="oklch(0.6 0.22 25)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Lançamentos</CardTitle></CardHeader>
        <CardContent>
          {data.lancamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum lançamento ainda.</p>
          ) : (
            <ul className="divide-y">
              {data.lancamentos.map((l) => (
                <li key={l.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 py-3">
                  {l.tipo === "entrada"
                    ? <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
                    : <ArrowDownCircle className="h-5 w-5 text-destructive" />}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{l.descricao}</p>
                    <p className="text-xs text-muted-foreground">{dateBR(l.data)}{l.categoria ? ` · ${l.categoria}` : ""}</p>
                  </div>
                  <p className={`text-sm font-bold tabular-nums ${l.tipo === "entrada" ? "text-emerald-600" : "text-destructive"}`}>
                    {l.tipo === "entrada" ? "+" : "-"}{brl(l.valor)}
                  </p>
                  <Button variant="ghost" size="icon" onClick={() => db.removeLancamento(l.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}