import { useCompanyName } from "@/hooks/use-company-name";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDB } from "@/lib/store";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Gestão de Serviços" },
      { name: "description", content: "Ajustes de empresa, identidade visual, PDFs e custos operacionais." },
      { property: "og:title", content: "Configurações — Gestão de Serviços" },
      { property: "og:description", content: "Ajustes da sua empresa e dos seus documentos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const companyName = useCompanyName();
  const data = useDB();

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-black">Configurações</h1>
        <p className="text-xs text-muted-foreground">
          Central de ajustes do sistema, documentos e custos da empresa.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0">
            <p className="font-semibold truncate">{companyName}</p>
            <p className="text-xs text-muted-foreground truncate">
              Dados comerciais, logo, CNPJ, endereço, contatos, cores do sistema e configuração do PDF.
            </p>
          </div>
          <Button asChild>
            <Link to="/empresa">Editar empresa</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}