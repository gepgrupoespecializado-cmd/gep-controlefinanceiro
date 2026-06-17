import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, ArrowDownCircle, ArrowUpCircle, Pencil, Trash2, CheckCircle2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import {
  db, useDB, statusPagamento, statusPagLabel, statusPagColor,
  type Lancamento, type LancamentoTipo, type PagamentoStatus,
} from "@/lib/store";
import { ConfirmDelete } from "@/components/confirm-delete";
import { brl, dateBR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — GEP Controle" }] }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const data = useDB();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<PagamentoStatus | "todos">("todos");
  const [form, setForm] = useState({
    tipo: "entrada" as LancamentoTipo, descricao: "", valor: 0,
    data: new Date().toISOString().slice(0, 10), categoria: "",
    pago: true, vencimento: "",
  });
  const [periodo, setPeriodo] = useState<"diario" | "semanal" | "mensal" | "anual">("mensal");

  const ativos = data.lancamentos.filter((l) => !l.arquivado);
  const entradasRecebidas = ativos.filter((l) => l.tipo === "entrada" && statusPagamento(l) === "recebido").reduce((s, l) => s + l.valor, 0);
  const saidasPagas = ativos.filter((l) => l.tipo === "saida" && statusPagamento(l) === "recebido").reduce((s, l) => s + l.valor, 0);
  const saldo = entradasRecebidas - saidasPagas;
  const contasReceber = ativos.filter((l) => l.tipo === "entrada" && statusPagamento(l) !== "recebido").reduce((s, l) => s + l.valor, 0);
  const vencidas = ativos.filter((l) => l.tipo === "entrada" && statusPagamento(l) === "vencido").reduce((s, l) => s + l.valor, 0);

  const now = new Date();
  const inMes = (d: Date) => d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const faturamentoMes = ativos.filter((l) => l.tipo === "entrada" && inMes(new Date(l.data))).reduce((s, l) => s + l.valor, 0);
  const recebidoMes = ativos.filter((l) => l.tipo === "entrada" && statusPagamento(l) === "recebido" && inMes(new Date(l.data))).reduce((s, l) => s + l.valor, 0);
  const saidaMes = ativos.filter((l) => l.tipo === "saida" && inMes(new Date(l.data))).reduce((s, l) => s + l.valor, 0);
  const lucroMes = recebidoMes - saidaMes;

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

    ativos.forEach((l) => {
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
  }, [ativos, periodo]);

  const lista = useMemo(() => {
    const term = q.trim().toLowerCase();
    return ativos.filter((l) => {
      if (filtroStatus !== "todos" && statusPagamento(l) !== filtroStatus) return false;
      if (!term) return true;
      return [l.descricao, l.categoria].some((v) => v?.toLowerCase().includes(term));
    });
  }, [ativos, q, filtroStatus]);

  function abrirNovo() {
    setEditId(null);
    setForm({ tipo: "entrada", descricao: "", valor: 0, data: new Date().toISOString().slice(0, 10), categoria: "", pago: true, vencimento: "" });
    setOpen(true);
  }
  function abrirEdicao(l: Lancamento) {
    setEditId(l.id);
    setForm({
      tipo: l.tipo, descricao: l.descricao, valor: l.valor,
      data: new Date(l.data).toISOString().slice(0, 10),
      categoria: l.categoria ?? "", pago: !!l.pago,
      vencimento: l.vencimento ? new Date(l.vencimento).toISOString().slice(0, 10) : "",
    });
    setOpen(true);
  }
  function salvar() {
    if (!form.descricao.trim()) return toast.error("Informe a descrição");
    if (!form.valor || form.valor <= 0) return toast.error("Valor inválido");
    const payload = {
      tipo: form.tipo, descricao: form.descricao, valor: Number(form.valor),
      data: new Date(form.data + "T12:00:00").toISOString(),
      categoria: form.categoria, pago: form.pago,
      vencimento: form.vencimento ? new Date(form.vencimento + "T12:00:00").toISOString() : undefined,
    };
    if (editId) { db.updateLancamento(editId, payload); toast.success("Lançamento atualizado"); }
    else { db.addLancamento(payload); toast.success("Lançamento adicionado"); }
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl sm:text-2xl font-black">Financeiro</h1>
          <p className="text-xs text-muted-foreground">Fluxo de caixa e relatórios</p>
        </div>
        <Button onClick={abrirNovo}><Plus className="h-4 w-4" />Lançamento</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Editar lançamento" : "Novo lançamento"}</DialogTitle></DialogHeader>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={form.pago ? "recebido" : "pendente"} onValueChange={(v) => setForm({ ...form, pago: v === "recebido" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recebido">Recebido / Pago</SelectItem>
                      <SelectItem value="pendente">A receber / A pagar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5"><Label className="text-xs">Vencimento</Label><Input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} /></div>
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

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Entradas (recebidas)" value={brl(entradasRecebidas)} cls="text-emerald-600" />
        <Stat label="Saídas" value={brl(saidasPagas)} cls="text-destructive" />
        <Stat label="Saldo atual" value={brl(saldo)} cls={saldo >= 0 ? "text-primary" : "text-destructive"} />
        <Stat label="Contas a receber" value={brl(contasReceber)} cls="text-amber-600" sub={vencidas > 0 ? `${brl(vencidas)} vencido` : undefined} />
        <Stat label="Faturamento do mês" value={brl(faturamentoMes)} cls="text-primary" />
        <Stat label="Lucro do mês" value={brl(lucroMes)} cls={lucroMes >= 0 ? "text-emerald-600" : "text-destructive"} />
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Entradas x Saídas</CardTitle></CardHeader>
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
                    <Legend />
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
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar lançamento..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as typeof filtroStatus)}>
              <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos status</SelectItem>
                <SelectItem value="recebido">Recebido</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {lista.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum lançamento encontrado.</p>
          ) : (
            <ul className="divide-y">
              {lista.map((l) => {
                const sp = statusPagamento(l);
                return (
                  <li key={l.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3">
                    {l.tipo === "entrada"
                      ? <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
                      : <ArrowDownCircle className="h-5 w-5 text-destructive" />}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="truncate text-sm font-semibold">{l.descricao}</p>
                        <Badge className={`${statusPagColor[sp]} border-0 text-[10px] px-1.5 py-0`}>{statusPagLabel[sp]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {dateBR(l.data)}
                        {l.vencimento ? ` · venc ${dateBR(l.vencimento)}` : ""}
                        {l.categoria ? ` · ${l.categoria}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-bold tabular-nums ${l.tipo === "entrada" ? "text-emerald-600" : "text-destructive"}`}>
                        {l.tipo === "entrada" ? "+" : "-"}{brl(l.valor)}
                      </p>
                      {!l.pago && (
                        <Button variant="ghost" size="icon" title="Marcar como recebido" onClick={() => { db.marcarRecebido(l.id, true); toast.success("Marcado como recebido"); }}>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => abrirEdicao(l)}>
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                      <ConfirmDelete
                        trigger={<Button variant="ghost" size="icon" title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                        titulo="Excluir lançamento?"
                        descricao={l.descricao}
                        onConfirm={() => { db.arquivarLancamento(l.id); toast.success("Lançamento excluído"); }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, cls, sub }: { label: string; value: string; cls: string; sub?: string }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-black ${cls}`}>{value}</p>
      {sub && <p className="text-[10px] text-destructive mt-0.5">{sub}</p>}
    </CardContent></Card>
  );
}