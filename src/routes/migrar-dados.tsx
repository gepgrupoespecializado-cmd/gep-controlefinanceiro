import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CloudUpload, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  confirmarMigracao,
  descartarMigracao,
  loadOrgContext,
  resumoLocal,
  type ResumoLocal,
} from "@/data/cloud-sync";

export const Route = createFileRoute("/migrar-dados")({
  head: () => ({
    meta: [
      { title: "Importar dados — GEP Controle Financeiro" },
      {
        name: "description",
        content: "Envie para a nuvem os dados já cadastrados neste aparelho, com confirmação.",
      },
      { property: "og:title", content: "Importar dados — GEP Controle Financeiro" },
      { property: "og:description", content: "Leve seus cadastros deste aparelho para a sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MigrarDadosPage,
});

function MigrarDadosPage() {
  const navigate = useNavigate();
  const [resumo, setResumo] = useState<ResumoLocal | null>(null);
  const [acao, setAcao] = useState<"importar" | "zerar" | null>(null);

  useEffect(() => {
    setResumo(resumoLocal());
  }, []);

  async function executar(tipo: "importar" | "zerar") {
    setAcao(tipo);
    try {
      const { orgId } = await loadOrgContext();
      if (!orgId) {
        void navigate({ to: "/bem-vindo" });
        return;
      }
      if (tipo === "importar") await confirmarMigracao(orgId);
      else await descartarMigracao(orgId);
      toast.success(tipo === "importar" ? "Dados enviados para a sua conta." : "Conta iniciada em branco.");
      window.location.assign("/");
    } catch {
      toast.error("Não foi possível concluir agora. Tente novamente.");
      setAcao(null);
    }
  }

  const linhas: { rotulo: string; valor: number }[] = resumo
    ? [
        { rotulo: "Clientes", valor: resumo.clientes },
        { rotulo: "Serviços", valor: resumo.servicos },
        { rotulo: "Orçamentos", valor: resumo.orcamentos },
        { rotulo: "Agendamentos", valor: resumo.agendamentos },
        { rotulo: "Lançamentos financeiros", valor: resumo.lancamentos },
        { rotulo: "Relatórios", valor: resumo.relatorios },
      ].filter((l) => l.valor > 0)
    : [];

  return (
    <div className="min-h-[70vh] grid place-items-center px-3">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
              <CloudUpload className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-black">Encontramos dados neste aparelho</h1>
            <p className="text-sm text-muted-foreground">
              Você pode levar esses cadastros para a sua conta. Nada é apagado deste aparelho.
            </p>
          </div>

          <div className="rounded-lg border border-border divide-y">
            {linhas.map((l) => (
              <div key={l.rotulo} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-muted-foreground">{l.rotulo}</span>
                <span className="font-semibold">{l.valor}</span>
              </div>
            ))}
            {linhas.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum cadastro encontrado.</div>
            )}
          </div>

          <div className="space-y-2">
            <Button className="w-full" disabled={acao !== null} onClick={() => void executar("importar")}>
              {acao === "importar" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Importar para a minha conta"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={acao !== null}
              onClick={() => void executar("zerar")}
            >
              {acao === "zerar" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Começar do zero"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
