import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, LogOut, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ACCESS_STATE_QUERY_KEY } from "@/lib/access-control";
import { bootstrapOwnerAccess, getMyAccessState } from "@/lib/admin-access.functions";
import { stopOrgSync } from "@/data/cloud-sync";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/aguardando-acesso")({
  head: () => ({ meta: [{ title: "Aguardando liberação de acesso" }] }),
  component: WaitingForAccessPage,
});

function WaitingForAccessPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const accessQuery = useQuery({
    queryKey: ACCESS_STATE_QUERY_KEY,
    queryFn: () => getMyAccessState(),
    retry: false,
    staleTime: 0,
  });

  const blocked = accessQuery.data?.status === "bloqueado";

  async function verifyAgain() {
    setChecking(true);
    try {
      await bootstrapOwnerAccess();
      const result = await accessQuery.refetch();
      if (result.data?.status === "ativo" || result.data?.isAdmin) {
        await router.navigate({ to: "/" });
      } else {
        await router.invalidate();
      }
    } catch {
      toast.error("Não foi possível verificar agora. Tente novamente.");
    } finally {
      setChecking(false);
    }
  }

  async function signOut() {
    setLeaving(true);
    try {
      await stopOrgSync();
    } catch {
      toast.error("Há alterações locais que não puderam ser sincronizadas. Tente sair novamente quando a conexão voltar.");
      setLeaving(false);
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Não foi possível encerrar a sessão. Tente novamente.");
      setLeaving(false);
      return;
    }
    window.location.assign("/login");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg border-border shadow-sm">
        <CardContent className="space-y-6 p-6 sm:p-8">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            {blocked ? <ShieldAlert className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
          </div>
          <div className="space-y-3 text-center">
            <h1 className="text-xl font-bold text-foreground">
              {blocked ? "Acesso suspenso" : "Aguardando liberação de acesso"}
            </h1>
            {accessQuery.isError ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Não foi possível confirmar seu status agora. Toque em “Verificar novamente” ou fale com o suporte.
              </p>
            ) : blocked ? (
              <p className="text-sm leading-6 text-muted-foreground">
                Seu acesso está suspenso. Fale com o suporte no WhatsApp{" "}
                <a className="font-semibold text-primary underline underline-offset-4" href="https://wa.me/5527988202704" target="_blank" rel="noreferrer">
                  (27) 98820-2704
                </a>.
              </p>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Seu acesso está aguardando liberação. Use o mesmo e-mail da compra. A liberação é feita após a confirmação do pagamento. Dúvidas? WhatsApp{" "}
                <a className="font-semibold text-primary underline underline-offset-4" href="https://wa.me/5527988202704" target="_blank" rel="noreferrer">
                  (27) 98820-2704
                </a>{" "}
                (seg a sex 10h às 17h, sáb 9h às 14h)
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {!blocked && (
              <Button type="button" onClick={verifyAgain} disabled={checking || leaving}>
                {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Verificar novamente
              </Button>
            )}
            <Button type="button" variant="outline" onClick={signOut} disabled={leaving || checking} className={blocked ? "sm:col-span-2" : ""}>
              {leaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
