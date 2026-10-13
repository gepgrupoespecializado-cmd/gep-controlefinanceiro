import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDB } from "@/lib/store";
import {
  conferirRelacional,
  backfillRelacional,
  getFaseAtual,
  getOrigemLeitura,
  loadOrgContext,
} from "@/data/cloud-sync";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Controle de Prestação de Serviços GEP" },
      { name: "description", content: "Ajustes de empresa, identidade visual, PDFs e custos operacionais." },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const data = useDB();
  const faseAtual = getFaseAtual();
  const origemLeitura = getOrigemLeitura();

  const [conferindo, setConferindo] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [resultadoConferencia, setResultadoConferencia] = useState<{
    contagens: Record<string, number>;
    divergencias: Array<{ campo: string; relacional: number; payload: number }>;
  } | null>(null);

  async function executarConferencia() {
    try {
      setConferindo(true);
      const { orgId } = await loadOrgContext();
      if (!orgId) {
        toast.error("Nenhuma organização conectada.");
        return;
      }
      const res = await conferirRelacional(orgId);
      setResultadoConferencia(res);
      if (res.divergencias.length === 0) {
        toast.success("Conferência concluída: tabelas e backup 100% alinhados!");
      } else {
        toast.warning(`Conferência concluída com ${res.divergencias.length} divergência(s).`);
      }
    } catch (err) {
      toast.error("Falha ao conferir integridade relacional.");
      console.error(err);
    } finally {
      setConferindo(false);
    }
  }

  async function executarBackfill() {
    try {
      setBackfilling(true);
      const { orgId } = await loadOrgContext();
      if (!orgId) {
        toast.error("Nenhuma organização conectada.");
        return;
      }
      await backfillRelacional(orgId);
      toast.success("Espelhamento completo nas tabelas finalizado com sucesso!");
      await executarConferencia();
    } catch (err) {
      toast.error("Falha ao sincronizar dados nas tabelas.");
      console.error(err);
    } finally {
      setBackfilling(false);
    }
  }

  const faseLabels = {
    A: {
      titulo: "Fase A — Espelho Ativo",
      badge: "Fase A",
      cor: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200",
      descricao:
        "Leitura via bloco de backup JSON com espelhamento transparente em todas as tabelas relacionais do Supabase.",
    },
    B: {
      titulo: "Fase B — Leitura Relacional com Gravação Dupla",
      badge: "Fase B",
      cor: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200",
      descricao:
        "Leitura primária direta das tabelas do banco de dados, mantendo o bloco JSON atualizado em segundo plano (dual-write).",
    },
    C: {
      titulo: "Fase C — Normalização Consolidada",
      badge: "Fase C",
      cor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200",
      descricao:
        "Banco 100% relacional. O bloco JSON permanece como cópia imutável de contingência.",
    },
  };

  const infoFase = faseLabels[faseAtual] || faseLabels.A;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-black">Configurações</h1>
        <p className="text-xs text-muted-foreground">
          Central de ajustes do sistema, documentos, custos e integridade de dados.
        </p>
      </div>

      {/* Dados da Empresa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Empresa e Identidade Visual
          </CardTitle>
          <CardDescription>
            Informações comerciais, logotipo, contatos e modelos de PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0">
            <p className="font-semibold truncate">{data.empresa.nome || "GEP Serviços Especializado"}</p>
            <p className="text-xs text-muted-foreground truncate">
              Dados comerciais, logo, CNPJ, endereço, contatos, cores do sistema e configuração do PDF.
            </p>
          </div>
          <Button asChild>
            <Link to="/empresa">Editar empresa</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Normalização Relacional e Banco de Dados */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Banco de Dados e Sincronização Relacional (Etapa 03)
            </CardTitle>
            <Badge variant="outline" className={infoFase.cor}>
              {infoFase.badge}
            </Badge>
          </div>
          <CardDescription>{infoFase.descricao}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <Server className="h-3.5 w-3.5" />
                Origem da Leitura nesta Sessão
              </span>
              <p className="font-semibold text-sm">
                {origemLeitura === "relacional"
                  ? "Tabelas Relacionais (Supabase)"
                  : "Bloco de Segurança (JSON)"}
              </p>
            </div>
            <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
              <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                Mapeamento Determinístico
              </span>
              <p className="font-semibold text-sm">Idempotente (UUIDs preservados via legacy_id)</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={conferindo || backfilling}
              onClick={executarConferencia}
              className="gap-2"
            >
              {conferindo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Conferir Integridade (Tabelas x Backup)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={conferindo || backfilling}
              onClick={executarBackfill}
              className="gap-2"
            >
              {backfilling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
              Forçar Espelhamento Completo
            </Button>
          </div>

          {/* Resultado da Conferência */}
          {resultadoConferencia && (
            <div className="rounded-lg border bg-card p-4 space-y-3 text-xs">
              <div className="flex items-center gap-2">
                {resultadoConferencia.divergencias.length === 0 ? (
                  <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Todas as tabelas e o bloco JSON conferem sem divergências.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-600 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{resultadoConferencia.divergencias.length} divergência(s) encontrada(s):</span>
                  </div>
                )}
              </div>

              {resultadoConferencia.divergencias.length > 0 && (
                <div className="border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded p-2 text-amber-800 dark:text-amber-300">
                  <ul className="list-disc list-inside space-y-1">
                    {resultadoConferencia.divergencias.map((d) => (
                      <li key={d.campo}>
                        <strong>{d.campo}:</strong> Relacional = {d.relacional} | Backup = {d.payload}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="font-semibold text-muted-foreground mb-2">Registros nas Tabelas Próprias:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(resultadoConferencia.contagens).map(([tabela, total]) => (
                    <div key={tabela} className="p-2 rounded border bg-muted/20 flex justify-between items-center">
                      <span className="capitalize text-muted-foreground">{tabela}</span>
                      <span className="font-bold">{total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}