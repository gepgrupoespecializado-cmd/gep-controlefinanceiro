import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Bell, MessageCircle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  db, useDB, statusPagamento, situacaoPagamentoLabel,
  relatorios as relatoriosApi,
  type Cliente, type Orcamento, type Relatorio, type Lancamento, type SituacaoPagamento,
} from "@/lib/store";
import { brl, dateBR } from "@/lib/format";
import { toast } from "sonner";

type Alerta = {
  id: string;
  tipo: "parcial" | "pendente" | "vencido";
  clienteId?: string;
  clienteNome: string;
  descricao: string;
  valorTotal: number;
  saldo: number;
  data: string; // ISO referência (execução ou vencimento)
  diasAtraso: number;
  relatorio?: Relatorio;
  lancamento?: Lancamento;
};

const tipoLabel: Record<Alerta["tipo"], string> = {
  parcial: "Pagamento parcial",
  pendente: "Pagamento pendente",
  vencido: "Pagamento vencido",
};

const tipoBadge: Record<Alerta["tipo"], string> = {
  parcial: "bg-amber-500 text-white",
  pendente: "bg-blue-500 text-white",
  vencido: "bg-red-600 text-white",
};

function diasEntre(iso: string): number {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return 0;
  d.setHours(0, 0, 0, 0);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.floor((+hoje - +d) / 86400000);
}

export function AlertasPagamento({ limite, titulo = "Alertas de pagamento" }: { limite?: number; titulo?: string }) {
  const data = useDB();

  const alertas = useMemo<Alerta[]>(() => {
    const lista: Alerta[] = [];

    // 1) Relatórios com situação parcial/pendente
    for (const r of safeArray<Relatorio>(data.relatorios).filter((x) => x && !x.arquivado)) {
      const sit = r.situacaoPagamento;
      if (sit !== "parcial" && sit !== "pendente") continue;
      const cli = safeArray<Cliente>(data.clientes).find((c) => c.id === r.clienteId);
      const total = r.valorOrcamento ?? r.valor ?? 0;
      const recebido = r.valorRecebido ?? 0;
      const saldo = Math.max(0, total - (sit === "parcial" ? recebido : 0));
      const base = r.dataPagamento ?? r.dataExecucao;
      const dias = diasEntre(base);
      lista.push({
        id: `rel-${r.id}`,
        tipo: sit === "parcial" ? "parcial" : dias > 7 ? "vencido" : "pendente",
        clienteId: r.clienteId,
        clienteNome: cli?.nome ?? "Cliente",
        descricao: r.servicoExecutado || "Serviço prestado",
        valorTotal: total,
        saldo,
        data: base,
        diasAtraso: Math.max(0, dias),
        relatorio: r,
      });
    }

    // 2) Lançamentos pendentes/vencidos sem relatório (entradas manuais)
    for (const l of safeArray<Lancamento>(data.lancamentos).filter((x) => x && !x.arquivado && x.tipo === "entrada")) {
      if (l.origemTipo === "agendamento") continue; // já coberto pelo relatório
      const st = statusPagamento(l);
      if (st === "recebido") continue;
      const ref = l.vencimento ?? l.data;
      const dias = diasEntre(ref);
      const cliNome = (() => {
        if (l.origemTipo === "orcamento") {
          const o = safeArray<Orcamento>(data.orcamentos).find((x) => x.id === l.origemId);
          const c = o && safeArray<Cliente>(data.clientes).find((x) => x.id === o.clienteId);
          return c?.nome ?? l.descricao;
        }
        return l.descricao;
      })();
      lista.push({
        id: `lan-${l.id}`,
        tipo: st === "vencido" ? "vencido" : "pendente",
        clienteNome: cliNome,
        descricao: l.descricao,
        valorTotal: l.valor,
        saldo: l.valor,
        data: ref,
        diasAtraso: Math.max(0, dias),
        lancamento: l,
      });
    }

    // Ordenar: vencidos primeiro, depois maior atraso, depois maior saldo
    const ordem: Record<Alerta["tipo"], number> = { vencido: 0, parcial: 1, pendente: 2 };
    lista.sort((a, b) => ordem[a.tipo] - ordem[b.tipo] || b.diasAtraso - a.diasAtraso || b.saldo - a.saldo);
    return lista;
  }, [data.relatorios, data.lancamentos, data.clientes, data.orcamentos]);

  if (alertas.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {titulo}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Nenhum pagamento pendente ou parcial. Tudo em dia! 🎉
        </CardContent>
      </Card>
    );
  }

  const mostrar = limite ? alertas.slice(0, limite) : alertas;
  const totalSaldo = alertas.reduce((s, a) => s + a.saldo, 0);
  const totalVencido = alertas.filter((a) => a.tipo === "vencido").length;

  function lembreteWhatsApp(a: Alerta) {
    const cli = a.clienteId ? safeArray<Cliente>(data.clientes).find((c) => c.id === a.clienteId) : undefined;
    const fone = (cli?.whatsapp || cli?.telefone || "").replace(/\D/g, "");
    const empresa = data.empresa.nome || "nossa equipe";
    const linhas = [
      `Olá ${cli?.nome ?? a.clienteNome}, tudo bem?`,
      ``,
      `Passando para lembrar sobre o pagamento do serviço *${a.descricao}*.`,
      a.tipo === "parcial"
        ? `Valor total: ${brl(a.valorTotal)} — Saldo em aberto: *${brl(a.saldo)}*`
        : `Valor em aberto: *${brl(a.saldo)}*`,
      a.diasAtraso > 0 ? `Referência: ${dateBR(a.data)} (${a.diasAtraso} dia(s) em aberto)` : `Referência: ${dateBR(a.data)}`,
      ``,
      `Qualquer dúvida estamos à disposição.`,
      `— ${empresa}`,
    ];
    const texto = encodeURIComponent(linhas.join("\n"));
    const url = fone ? `https://wa.me/55${fone}?text=${texto}` : `https://wa.me/?text=${texto}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function marcarPago(a: Alerta) {
    if (a.relatorio) {
      relatoriosApi.update(a.relatorio.id, {
        situacaoPagamento: "pago" as SituacaoPagamento,
        valorRecebido: a.valorTotal,
        dataPagamento: new Date().toISOString(),
      });
    } else if (a.lancamento) {
      db.updateLancamento(a.lancamento.id, { pago: true });
    }
    toast.success("Pagamento registrado como recebido");
  }

  return (
    <Card className="border-amber-300/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex flex-wrap items-center gap-2">
          <Bell className="h-4 w-4 text-amber-600" />
          {titulo}
          <Badge variant="outline" className="text-[11px]">{alertas.length}</Badge>
          {totalVencido > 0 && (
            <Badge className="bg-red-600 text-white text-[11px] hover:bg-red-700">
              <AlertTriangle className="h-3 w-3" />{totalVencido} vencido(s)
            </Badge>
          )}
          <span className="ml-auto text-xs font-semibold text-amber-700">
            Saldo em aberto: {brl(totalSaldo)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {mostrar.map((a) => (
            <li key={a.id} className="p-3 sm:p-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`text-[10px] h-5 ${tipoBadge[a.tipo]} hover:opacity-90`}>{tipoLabel[a.tipo]}</Badge>
                  {a.relatorio && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      {situacaoPagamentoLabel[a.relatorio.situacaoPagamento ?? "pendente"]}
                    </Badge>
                  )}
                  {a.diasAtraso > 0 && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />{a.diasAtraso} dia(s)
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-semibold truncate">{a.clienteNome}</p>
                <p className="text-xs text-muted-foreground truncate">{a.descricao}</p>
                <p className="mt-0.5 text-xs">
                  <span className="text-muted-foreground">Saldo: </span>
                  <span className="font-bold tabular-nums text-amber-700">{brl(a.saldo)}</span>
                  {a.tipo === "parcial" && (
                    <span className="text-muted-foreground"> · Total {brl(a.valorTotal)}</span>
                  )}
                  <span className="text-muted-foreground"> · {dateBR(a.data)}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button size="sm" variant="outline" className="h-8" onClick={() => lembreteWhatsApp(a)}>
                  <MessageCircle className="h-3.5 w-3.5" />Lembrar
                </Button>
                <Button size="sm" className="h-8" onClick={() => marcarPago(a)}>
                  <CheckCircle2 className="h-3.5 w-3.5" />Recebido
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {limite && alertas.length > limite && (
          <div className="p-2 text-center text-xs text-muted-foreground border-t">
            +{alertas.length - limite} alerta(s). Veja todos no <Link to="/financeiro" className="text-primary underline">Financeiro</Link>.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}