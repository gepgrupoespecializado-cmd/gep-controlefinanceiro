import { useCompanyName } from "@/hooks/use-company-name";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, BellRing } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { configLembretes, montarMensagem, MODELO_LEMBRETE_PADRAO } from "@/lib/lembretes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { db, useDB } from "@/lib/store";

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
      <LembretesConfig />
    </div>
  );
}

function LembretesConfig() {
  const data = useDB();
  const nome = useCompanyName();
  const cfg = configLembretes(data.empresa);
  const [modelo, setModelo] = useState(cfg.modelo);
  const salvar = (patch: Partial<typeof cfg>) => db.updateEmpresa({ lembretes: { ...cfg, ...patch } });
  const previa = montarMensagem(modelo, { nome_cliente: "Maria Silva", data: "sexta-feira, 13/11/2026", horario: "09:00", local: "Rua das Flores, 120 - Centro", nome_empresa: nome });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><BellRing className="h-4 w-4" />Lembretes de agendamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="lem-ativo">Ativar lembretes</Label>
          <Switch id="lem-ativo" checked={cfg.ativo} onCheckedChange={(v) => salvar({ ativo: v })} />
        </div>
        <div className="grid gap-1 sm:max-w-xs">
          <Label htmlFor="lem-hora">Horário do aviso (dia anterior)</Label>
          <Input id="lem-hora" type="time" value={cfg.horaAviso} onChange={(e) => e.target.value && salvar({ horaAviso: e.target.value })} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="lem-modelo">Modelo da mensagem</Label>
          <Textarea id="lem-modelo" rows={9} value={modelo} onChange={(e) => setModelo(e.target.value)} />
          <p className="text-xs text-muted-foreground">Variáveis: {"{nome_cliente}"}, {"{data}"}, {"{horario}"}, {"{local}"}, {"{nome_empresa}"}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => { salvar({ modelo }); toast.success("Modelo salvo"); }}>Salvar modelo</Button>
            <Button size="sm" variant="outline" onClick={() => setModelo(MODELO_LEMBRETE_PADRAO)}>Restaurar padrão</Button>
          </div>
        </div>
        <div className="grid gap-1">
          <Label>Pré-visualização</Label>
          <div className="rounded-lg border bg-muted p-3 text-sm whitespace-pre-wrap break-words">{previa}</div>
        </div>
      </CardContent>
    </Card>
  );
}