import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe — Gestão de Serviços" },
      { name: "description", content: "Pessoas com acesso à sua empresa e seus níveis de permissão." },
      { property: "og:title", content: "Equipe — Gestão de Serviços" },
      { property: "og:description", content: "Veja quem tem acesso aos dados da sua empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EquipePage,
});

const papelLabel: Record<string, string> = {
  owner: "Dono",
  admin: "Administrador",
  member: "Membro",
};

function EquipePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["equipe"],
    queryFn: async () => {
      const { data: membros, error } = await supabase
        .from("organization_members")
        .select("id, user_id, role, created_at")
        .order("created_at");
      if (error) throw error;

      const { data: perfis } = await supabase.from("profiles").select("user_id, nome, email");
      const mapa = new Map((perfis ?? []).map((p) => [p.user_id, p]));

      return (membros ?? []).map((m) => ({
        id: m.id,
        role: m.role as string,
        nome: mapa.get(m.user_id)?.nome ?? null,
        email: mapa.get(m.user_id)?.email ?? null,
      }));
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-black">Equipe</h1>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Acesso à empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!isLoading &&
            (data ?? []).map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{m.nome ?? m.email ?? "Usuário"}</p>
                  {m.email && <p className="truncate text-xs text-muted-foreground">{m.email}</p>}
                </div>
                <Badge variant="secondary">{papelLabel[m.role] ?? m.role}</Badge>
              </div>
            ))}
          {!isLoading && (data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum acesso registrado.</p>
          )}
          <p className="pt-2 text-xs text-muted-foreground">
            Convites para novos usuários chegam em uma próxima atualização.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
