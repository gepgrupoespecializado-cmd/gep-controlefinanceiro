import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/store";

export const Route = createFileRoute("/bem-vindo")({
  head: () => ({
    meta: [
      { title: "Bem-vindo — GEP Controle Financeiro" },
      { name: "description", content: "Configuração inicial da sua empresa no GEP Controle Financeiro." },
      { property: "og:title", content: "Bem-vindo — GEP Controle Financeiro" },
      { property: "og:description", content: "Configure sua empresa e comece a usar o sistema." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    responsavel: "",
    telefone: "",
    email: "",
    cidade: "",
    estado: "",
  });
  const [carregando, setCarregando] = useState(false);

  function set(campo: keyof typeof form, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function concluir(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        toast.error("Sessão expirada. Entre novamente.");
        void navigate({ to: "/login" });
        return;
      }

      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: form.nome.trim(),
          cnpj: form.cnpj.trim() || null,
          responsavel: form.responsavel.trim() || null,
          telefone: form.telefone.trim() || null,
          email: form.email.trim() || user.email || null,
          cidade: form.cidade.trim() || null,
          estado: form.estado.trim() || null,
          owner_id: user.id,
        })
        .select("id")
        .single();

      if (orgError || !org) throw orgError ?? new Error("falha");

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          organization_id: org.id,
          nome: form.responsavel.trim() || (user.user_metadata?.["name"] as string | undefined) || null,
          email: form.email.trim() || user.email || null,
          telefone: form.telefone.trim() || null,
          role: "owner",
        },
        { onConflict: "user_id" },
      );
      if (profileError) throw profileError;

      const { error: memberError } = await supabase.from("organization_members").insert({
        organization_id: org.id,
        user_id: user.id,
        role: "owner",
      });
      if (memberError && memberError.code !== "23505") throw memberError;

      db.updateEmpresa({
        nome: form.nome.trim(),
        cnpj: form.cnpj.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim() || (user.email ?? ""),
        endereco: `${form.cidade.trim()}${form.cidade.trim() && form.estado.trim() ? ", " : ""}${form.estado.trim()}`,
      });
      toast.success("Empresa criada. Bom trabalho!");
      window.location.assign("/");
    } catch {
      toast.error("Não foi possível concluir o cadastro. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-[70vh] grid place-items-center px-3">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-black">Bem-vindo ao GEP Controle Financeiro</h1>
            <p className="text-sm text-muted-foreground">
              Cadastre sua empresa para começar. Seus dados ficam separados de qualquer outra conta.
            </p>
          </div>

          <form className="space-y-3" onSubmit={concluir}>
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome da empresa</Label>
              <Input id="nome" required value={form.nome} onChange={(e) => set("nome", e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                <Input id="cnpj" value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="resp">Responsável</Label>
                <Input id="resp" value={form.responsavel} onChange={(e) => set("responsavel", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tel">Telefone</Label>
                <Input id="tel" value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mail">E-mail</Label>
                <Input id="mail" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="uf">Estado</Label>
                <Input id="uf" maxLength={2} value={form.estado} onChange={(e) => set("estado", e.target.value.toUpperCase())} />
              </div>
            </div>
            <Button className="w-full" type="submit" disabled={carregando}>
              {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Começar a usar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
