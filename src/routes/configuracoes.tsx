import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Palette, Calculator, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDB } from "@/lib/store";

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
            <p className="font-semibold truncate">{data.empresa.nome || "GEP Serviços Especializado"}</p>
            <p className="text-xs text-muted-foreground truncate">
              Dados comerciais, logo, tema dos PDFs e cores principais.
            </p>
          </div>
          <Button asChild>
            <Link to="/empresa">Editar empresa</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 space-y-2">
            <Palette className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold">Identidade visual</p>
            <p className="text-xs text-muted-foreground">Cores, logo e aparência dos documentos.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <FileText className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold">Modelos e PDFs</p>
            <p className="text-xs text-muted-foreground">Descrições padrão e layouts profissionais.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <Calculator className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold">Custos operacionais</p>
            <p className="text-xs text-muted-foreground">Valores usados na precificação inteligente.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}