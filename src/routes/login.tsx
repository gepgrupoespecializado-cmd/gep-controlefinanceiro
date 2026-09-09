import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ShieldCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lovable } from "@/integrations/lovable";
import {
  enviarRecuperacao,
  mensagemAmigavel,
  signInWithPassword,
  signUpWithPassword,
} from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — GEP Controle Financeiro" },
      {
        name: "description",
        content: "Acesse sua conta do GEP Controle Financeiro para gerenciar clientes, orçamentos, agenda e financeiro.",
      },
      { property: "og:title", content: "Entrar — GEP Controle Financeiro" },
      { property: "og:description", content: "Acesso à sua conta do GEP Controle Financeiro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    const { error } = await signInWithPassword(email, senha);
    setCarregando(false);
    if (error) {
      toast.error(mensagemAmigavel(error.message));
      return;
    }
    void navigate({ to: "/" });
  }

  async function criarConta(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) {
      toast.error("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }
    setCarregando(true);
    const { data, error } = await signUpWithPassword(email, senha, nome);
    setCarregando(false);
    if (error) {
      toast.error(mensagemAmigavel(error.message));
      return;
    }
    if (data.session) {
      void navigate({ to: "/" });
      return;
    }
    toast.success("Conta criada. Confirme o e-mail enviado para concluir o acesso.");
  }

  async function esqueciSenha() {
    if (!email.trim()) {
      toast.error("Informe seu e-mail para receber o link de recuperação.");
      return;
    }
    const { error } = await enviarRecuperacao(email);
    if (error) {
      toast.error(mensagemAmigavel(error.message));
      return;
    }
    toast.success("Enviamos um link de recuperação para o seu e-mail.");
  }

  async function entrarComGoogle() {
    setCarregando(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setCarregando(false);
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/" });
  }

  return (
    <div className="min-h-[80vh] grid place-items-center px-3">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-black">GEP Controle Financeiro</h1>
            <p className="text-sm text-muted-foreground">
              Acesse sua conta para gerenciar sua empresa.
            </p>
          </div>

          <Tabs defaultValue="entrar">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entrar">Entrar</TabsTrigger>
              <TabsTrigger value="criar">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="entrar">
              <form className="space-y-3 pt-3" onSubmit={entrar}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="senha">Senha</Label>
                  <Input id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
                </div>
                <Button className="w-full" type="submit" disabled={carregando}>
                  {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                </Button>
                <button
                  type="button"
                  onClick={esqueciSenha}
                  className="w-full text-xs text-muted-foreground underline underline-offset-4"
                >
                  Esqueci minha senha
                </button>
              </form>
            </TabsContent>

            <TabsContent value="criar">
              <form className="space-y-3 pt-3" onSubmit={criarConta}>
                <div className="space-y-1.5">
                  <Label htmlFor="nome">Seu nome</Label>
                  <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-novo">E-mail</Label>
                  <Input id="email-novo" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="senha-nova">Senha</Label>
                  <Input
                    id="senha-nova"
                    type="password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </div>
                <Button className="w-full" type="submit" disabled={carregando}>
                  {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={entrarComGoogle} disabled={carregando}>
            Continuar com Google
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            Ao continuar você concorda com os{" "}
            <Link to="/termos-de-uso" className="underline underline-offset-2">termos de uso</Link> e a{" "}
            <Link to="/politica-de-privacidade" className="underline underline-offset-2">política de privacidade</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
