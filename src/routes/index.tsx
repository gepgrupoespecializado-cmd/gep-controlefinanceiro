import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  FileText,
  CalendarClock,
  CheckCircle2,
  TrendingUp,
  Wallet,
  Plus,
  UserPlus,
  CalendarPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDB, totalOrcamento } from "@/lib/store";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — GEP Controle" },
      { name: "description", content: "Visão geral do seu negócio em tempo real." },
    ],
  }),
  component: Index,
});

function Index() {
  const db = useDB();
  const now = new Date();
  const mes = now.getMonth();
  const ano = now.getFullYear();

  const agendados = db.agendamentos.filter((a) => a.status === "agendado").length;
  const concluidos = db.agendamentos.filter((a) => a.status === "concluido").length;

  const receitaMes = db.lancamentos
    .filter((l) => {
      const d = new Date(l.data);
      return l.tipo === "entrada" && d.getMonth() === mes && d.getFullYear() === ano;
    })
    .reduce((s, l) => s + l.valor, 0);

  const receitaAno = db.lancamentos
    .filter((l) => l.tipo === "entrada" && new Date(l.data).getFullYear() === ano)
    .reduce((s, l) => s + l.valor, 0);

  const entradas = db.lancamentos.filter((l) => l.tipo === "entrada").reduce((s, l) => s + l.valor, 0);
  const saidas = db.lancamentos.filter((l) => l.tipo === "saida").reduce((s, l) => s + l.valor, 0);
  const saldo = entradas - saidas;

  const stats = [
    { label: "Clientes", value: db.clientes.length, icon: Users, color: "from-blue-500 to-blue-600" },
    { label: "Orçamentos emitidos", value: db.orcamentos.length, icon: FileText, color: "from-indigo-500 to-indigo-600" },
    { label: "Serviços agendados", value: agendados, icon: CalendarClock, color: "from-amber-500 to-orange-500" },
    { label: "Serviços concluídos", value: concluidos, icon: CheckCircle2, color: "from-emerald-500 to-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl p-5 sm:p-7 text-white shadow-[var(--shadow-elevated)]"
        style={{ background: "var(--gradient-hero)" }}
      >
        <p className="text-xs uppercase tracking-wider opacity-80">Bem-vindo de volta</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black">
          {db.empresa.nome || "GEP Serviços Especializado"}
        </h1>
        <p className="mt-1 text-sm opacity-80">
          Gerencie clientes, orçamentos e finanças em um só lugar.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="sm" className="bg-white text-primary hover:bg-white/90">
            <Link to="/orcamentos"><Plus className="h-4 w-4" />Novo orçamento</Link>
          </Button>
          <Button asChild size="sm" variant="secondary" className="bg-white/15 text-white hover:bg-white/25 border-0">
            <Link to="/clientes"><UserPlus className="h-4 w-4" />Novo cliente</Link>
          </Button>
          <Button asChild size="sm" variant="secondary" className="bg-white/15 text-white hover:bg-white/25 border-0">
            <Link to="/agenda"><CalendarPlus className="h-4 w-4" />Agendar serviço</Link>
          </Button>
          <Button asChild size="sm" variant="secondary" className="bg-white/15 text-white hover:bg-white/25 border-0">
            <Link to="/financeiro"><Wallet className="h-4 w-4" />Financeiro</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-2xl font-black tabular-nums">{s.value}</p>
                </div>
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${s.color} text-white`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Receita do mês</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-emerald-600">{brl(receitaMes)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Receita anual</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-black text-primary">{brl(receitaAno)}</p>
            <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />Ano {ano}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Fluxo de caixa (saldo)</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-2xl font-black ${saldo >= 0 ? "text-emerald-600" : "text-destructive"}`}>{brl(saldo)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Entradas {brl(entradas)} · Saídas {brl(saidas)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Últimos orçamentos</CardTitle></CardHeader>
        <CardContent>
          {db.orcamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum orçamento ainda. <Link className="text-primary underline" to="/orcamentos">Criar o primeiro</Link>.</p>
          ) : (
            <ul className="divide-y">
              {db.orcamentos.slice(0, 5).map((o) => {
                const cli = db.clientes.find((c) => c.id === o.clienteId);
                return (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">ORC-{String(o.numero).padStart(6, "0")}</p>
                      <p className="truncate text-xs text-muted-foreground">{cli?.nome ?? "Cliente"}</p>
                    </div>
                    <p className="text-sm font-bold tabular-nums">{brl(totalOrcamento(o))}</p>
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