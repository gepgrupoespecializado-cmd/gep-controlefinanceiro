import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarPlus, FileText, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDB } from "@/lib/store";

export const Route = createFileRoute("/prestacao-de-servicos")({
  head: () => ({
    meta: [
      { title: "Prestação de Serviços — Gestão de Serviços" },
      { name: "description", content: "Central operacional para serviços, agenda e relatórios de prestação." },
      { property: "og:title", content: "Prestação de Serviços — Gestão de Serviços" },
      { property: "og:description", content: "Central operacional para serviços, agenda e relatórios de prestação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrestacaoDeServicosPage,
});

function PrestacaoDeServicosPage() {
  const data = useDB();
  const servicosAtivos = data.servicos.filter((s) => !s.arquivado).length;
  const agendamentosAbertos = data.agendamentos.filter((a) => !a.arquivado && a.status !== "concluido").length;
  const relatorios = data.relatorios.filter((r) => !r.arquivado).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-black">Prestação de Serviços</h1>
        <p className="text-xs text-muted-foreground">
          Central estável para cadastro de serviços, agenda operacional e relatórios RPS.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Serviços cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black">{servicosAtivos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Agenda em aberto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black">{agendamentosAbertos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Relatórios RPS</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-black">{relatorios}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4 space-y-3">
            <Wrench className="h-6 w-6 text-primary" />
            <div>
              <p className="font-semibold">Catálogo de serviços</p>
              <p className="text-xs text-muted-foreground">Valores, descrições e tempo estimado.</p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/servicos">Abrir serviços</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-3">
            <CalendarPlus className="h-6 w-6 text-primary" />
            <div>
              <p className="font-semibold">Agenda operacional</p>
              <p className="text-xs text-muted-foreground">Programação, retorno automático e conclusão.</p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/agenda">Abrir agenda</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-3">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <p className="font-semibold">Orçamentos e RPS</p>
              <p className="text-xs text-muted-foreground">Documentos, pagamentos e assinaturas.</p>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link to="/orcamentos">Abrir orçamentos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}