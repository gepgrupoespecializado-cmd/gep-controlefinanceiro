import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Acesso — Controle de Prestação de Serviços GEP" },
      { name: "description", content: "Tela de acesso local do Controle de Prestação de Serviços GEP." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="min-h-[70vh] grid place-items-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center space-y-4">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black">Acesso ao sistema</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              O aplicativo está operando em modo local/offline nesta versão.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to="/">Entrar no dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}