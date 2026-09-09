import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Users,
  FileText,
  CheckCircle2,
  TrendingUp,
  Wallet,
  UserPlus,
  Clock,
  Calculator,
  Sparkles,
  CalendarClock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useDB,
  totalOrcamento,
  statusPagamento,
  type Agendamento,
  type Cliente,
  type Lancamento,
  type Orcamento,
} from "@/lib/store";
import { brl } from "@/lib/format";
import { AlertasPagamento } from "@/components/alertas-pagamento";
import { ComponentErrorBoundary } from "@/components/component-error-boundary";
import { NovoAtendimentoDialog } from "@/components/novo-atendimento-dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Controle de Prestação de Serviços GEP" },
      { name: "description", content: "Visão geral do seu negócio em tempo real." },
      { property: "og:title", content: "Dashboard — Controle de Prestação de Serviços GEP" },
      { property: "og:description", content: "Visão geral do seu negócio em tempo real." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const db = useDB();
  const {
    now,
    mes,
    ano,
    ags,
    orcs,
    lans,
    clis,
    receitaMes,
    receitaAno,
    entradas,
    saidas,
    saldo,
    aReceber,
    faturamentoMes,
    lucroMes,
    stats,
  } = useMemo(() => {
    const now = new Date();
    const mes = now.getMonth();
    const ano = now.getFullYear();

    const ags = safeArray<Agendamento>(db.agendamentos).filter((a) => !a?.arquivado);
    const orcs = safeArray<Orcamento>(db.orcamentos).filter((o) => !o?.arquivado);
    const lans = safeArray<Lancamento>(db.lancamentos).filter((l) => !l?.arquivado);
    const clis = safeArray<Cliente>(db.clientes).filter((c) => !c?.arquivado);
    const concluidos = ags.filter((a) => a?.status === "concluido").length;
    const agendados = ags.filter((a) => a?.status !== "concluido" && a?.status !== "cancelado").length;

    const isInMonth = (iso: string | undefined) => {
      const d = safeDate(iso);
      return d ? d.getMonth() === mes && d.getFullYear() === ano : false;
    };
    const isInYear = (iso: string | undefined) => safeDate(iso)?.getFullYear() === ano;

    const receitaMes = lans
      .filter((l) => l?.tipo === "entrada" && statusPagamento(l) === "recebido" && isInMonth(l.data))
      .reduce((s, l) => s + safeNumber(l.valor), 0);

    const receitaAno = lans
      .filter((l) => l?.tipo === "entrada" && statusPagamento(l) === "recebido" && isInYear(l.data))
      .reduce((s, l) => s + safeNumber(l.valor), 0);

    const entradas = lans
      .filter((l) => l?.tipo === "entrada" && statusPagamento(l) === "recebido")
      .reduce((s, l) => s + safeNumber(l.valor), 0);
    const saidas = lans
      .filter((l) => l?.tipo === "saida" && statusPagamento(l) === "recebido")
      .reduce((s, l) => s + safeNumber(l.valor), 0);
    const saldo = entradas - saidas;
    const aReceber = lans
      .filter((l) => l?.tipo === "entrada" && statusPagamento(l) !== "recebido")
      .reduce((s, l) => s + safeNumber(l.valor), 0);
    const faturamentoMes = lans
      .filter((l) => l?.tipo === "entrada" && isInMonth(l.data))
      .reduce((s, l) => s + safeNumber(l.valor), 0);
    const saidaMes = lans
      .filter((l) => l?.tipo === "saida" && statusPagamento(l) === "recebido" && isInMonth(l.data))
      .reduce((s, l) => s + safeNumber(l.valor), 0);
    const lucroMes = receitaMes - saidaMes;

    const stats = [
      { label: "Clientes ativos", value: clis.length, icon: Users, color: "from-blue-500 to-blue-600" },
      { label: "Orçamentos emitidos", value: orcs.length, icon: FileText, color: "from-indigo-500 to-indigo-600" },
      { label: "Serviços agendados", value: agendados, icon: CalendarClock, color: "from-fuchsia-500 to-purple-600" },
      { label: "Serviços concluídos", value: concluidos, icon: CheckCircle2, color: "from-emerald-500 to-emerald-600" },
      { label: "Contas a receber", value: brl(aReceber), icon: Clock, color: "from-amber-500 to-orange-500" },
    ];

    return {
      now,
      mes,
      ano,
      ags,
      orcs,
      lans,
      clis,
      receitaMes,
      receitaAno,
      entradas,
      saidas,
      saldo,
      aReceber,
      faturamentoMes,
      lucroMes,
      stats,
    };
  }, [db.agendamentos, db.clientes, db.lancamentos, db.orcamentos]);
  const empresa = db.empresa ?? { nome: "GEP Serviços Especializado", logoDataUrl: "" };

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl p-5 sm:p-7 text-white shadow-[var(--shadow-elevated)]"
        style={{ background: "var(--gradient-hero)" }}
      >
        <div className="flex items-center gap-4">
          {empresa.logoDataUrl && (
            <img src={empresa.logoDataUrl} alt="Logo" className="h-16 w-16 rounded-xl bg-white/95 object-contain p-1 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider opacity-80">Controle de Prestação de Serviços GEP</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black truncate">
              {empresa.nome || "GEP — Grupo Especializado"}
            </h1>
            <p className="mt-1 text-sm opacity-80">
              Gestão profissional de clientes, orçamentos, agenda, financeiro e precificação.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <NovoAtendimentoDialog
            trigger={
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold shadow-lg">
                <Sparkles className="h-4 w-4" /> Novo Atendimento
              </Button>
            }
          />
          <Button asChild size="lg" variant="secondary" className="bg-white/15 text-white hover:bg-white/25 border-0">
            <Link to="/clientes"><UserPlus className="h-4 w-4" />Novo cliente</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="bg-white/15 text-white hover:bg-white/25 border-0">
            <Link to="/precificacao"><Calculator className="h-4 w-4" />Calcular preço</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="bg-white/15 text-white hover:bg-white/25 border-0">
            <Link to="/financeiro"><Wallet className="h-4 w-4" />Financeiro</Link>
          </Button>
        </div>
      </div>

      <ComponentErrorBoundary name="Cards principais">
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
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
      </ComponentErrorBoundary>

      <ComponentErrorBoundary name="Financeiro da Home">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Receita do mês</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-black text-emerald-600">{brl(receitaMes)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Faturamento do mês</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-black text-primary">{brl(faturamentoMes)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Recebido + a receber</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Lucro do mês</CardTitle></CardHeader>
            <CardContent>
              <p className={`text-2xl font-black ${lucroMes >= 0 ? "text-emerald-600" : "text-destructive"}`}>{brl(lucroMes)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Receita − despesas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Contas a receber</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-black text-amber-600">{brl(aReceber)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Pendente + vencido</p>
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
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Saldo atual</CardTitle></CardHeader>
            <CardContent>
              <p className={`text-2xl font-black ${saldo >= 0 ? "text-emerald-600" : "text-destructive"}`}>{brl(saldo)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Entradas {brl(entradas)} · Saídas {brl(saidas)}</p>
            </CardContent>
          </Card>
        </div>
      </ComponentErrorBoundary>

      <ComponentErrorBoundary name="Alertas de pagamento">
        <AlertasPagamento limite={5} titulo="🔔 Alertas de pagamento" />
      </ComponentErrorBoundary>

      <ComponentErrorBoundary name="Últimos orçamentos">
        <Card>
          <CardHeader><CardTitle className="text-base">Últimos orçamentos</CardTitle></CardHeader>
          <CardContent>
            {orcs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum orçamento ainda. <Link className="text-primary underline" to="/orcamentos">Criar o primeiro</Link>.</p>
            ) : (
              <ul className="divide-y">
                {orcs.slice(0, 5).map((o) => {
                  const cli = clis.find((c) => c.id === o.clienteId);
                  return (
                    <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">ORC-{String(safeNumber(o.numero)).padStart(6, "0")}</p>
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
      </ComponentErrorBoundary>
    </div>
  );
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeDate(iso: string | undefined): Date | null {
  const d = new Date(iso ?? "");
  return Number.isFinite(d.getTime()) ? d : null;
}