import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { mensagemAmigavel } from "@/lib/auth";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Criar nova senha — GEP Controle Financeiro" },
      { name: "description", content: "Defina uma nova senha de acesso ao GEP Controle Financeiro." },
      { property: "og:title", content: "Criar nova senha — GEP Controle Financeiro" },
      { property: "og:description", content: "Defina uma nova senha de acesso à sua conta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) {
      toast.error("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }
    if (senha !== confirma) {
      toast.error("As senhas não conferem.");
      return;
    }
    setCarregando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setCarregando(false);
    if (error) {
      toast.error(mensagemAmigavel(error.message));
      return;
    }
    toast.success("Senha atualizada.");
    void navigate({ to: "/" });
  }

  return (
    <div className="min-h-[70vh] grid place-items-center px-3">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <div className="text-center space-y-2">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-black">Criar nova senha</h1>
          </div>
          <form className="space-y-3" onSubmit={salvar}>
            <div className="space-y-1.5">
              <Label htmlFor="nova">Nova senha</Label>
              <Input id="nova" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conf">Confirmar senha</Label>
              <Input id="conf" type="password" required value={confirma} onChange={(e) => setConfirma(e.target.value)} />
            </div>
            <Button className="w-full" type="submit" disabled={carregando}>
              {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
