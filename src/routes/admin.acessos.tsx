import { useMemo, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Search, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { checkAdminAccess, getAdminAccessData, preReleaseEmail, removePreReleasedEmail, setUserAccessStatus } from "@/lib/admin-access.functions";

export const Route = createFileRoute("/admin/acessos")({
  beforeLoad: async () => {
    const result = await checkAdminAccess();
    if (!result.isAdmin) throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ title: "Acessos — Administração" }] }),
  component: AdminAccessPage,
});

const PAGE_SIZE = 50;
const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  ativo: "Ativo",
  bloqueado: "Bloqueado",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function StatusActionDialog({
  status,
  email,
  disabled,
  onConfirm,
}: {
  status: string;
  email: string | null;
  disabled: boolean;
  onConfirm: (nextStatus: "ativo" | "bloqueado", observacao: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [observacao, setObservacao] = useState("");
  const nextStatus = status === "ativo" ? "bloqueado" : "ativo";
  const actionLabel = nextStatus === "ativo" ? (status === "bloqueado" ? "Reativar" : "Liberar") : "Bloquear";

  async function confirm() {
    try {
      await onConfirm(nextStatus, observacao);
      setOpen(false);
      setObservacao("");
    } catch {
      // The mutation handler displays the actionable error.
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={nextStatus === "ativo" ? "default" : "destructive"} disabled={disabled}>
          {disabled ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : nextStatus === "ativo" ? <Check className="mr-2 h-4 w-4" /> : null}
          {actionLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{actionLabel} acesso?</AlertDialogTitle>
          <AlertDialogDescription>
            {nextStatus === "ativo"
              ? "Confirme que o pagamento foi verificado antes de liberar " + (email || "esta conta") + "."
              : "Esta conta perderá imediatamente o acesso às telas e aos dados do aplicativo."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="access-note">Observação da compra ou da ação (opcional)</Label>
          <Textarea id="access-note" value={observacao} maxLength={500} onChange={(event) => setObservacao(event.target.value)} placeholder="Ex.: pedido Kiwify confirmado" />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={(event) => { event.preventDefault(); void confirm(); }}>
            Confirmar {actionLabel.toLowerCase()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function RemovePreReleaseDialog({ email, disabled, onRemove }: { email: string; disabled: boolean; onRemove: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={"Remover pré-liberação de " + email} disabled={disabled}>
          {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover pré-liberação?</AlertDialogTitle>
          <AlertDialogDescription>
            {email} não será liberado automaticamente ao criar uma conta. Se já tiver conta ativa, bloqueie-a separadamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={(event) => {
            event.preventDefault();
            void onRemove().then(() => setOpen(false)).catch(() => undefined);
          }}>
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AdminAccessPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"todos" | "pendente" | "ativo" | "bloqueado">("pendente");
  const [page, setPage] = useState(0);
  const [email, setEmail] = useState("");
  const [observacaoPreRelease, setObservacaoPreRelease] = useState("");

  const filter = useMemo(() => ({ search: search.trim(), status, page }), [search, status, page]);
  const accessQuery = useQuery({
    queryKey: ["admin-access-data", filter],
    queryFn: () => getAdminAccessData({ data: filter }),
    retry: false,
  });

  const statusMutation = useMutation({
    mutationFn: (input: { userId: string; status: "ativo" | "bloqueado"; observacao: string }) =>
      setUserAccessStatus({ data: input }),
    onSuccess: async () => {
      toast.success("Acesso atualizado.");
      await queryClient.invalidateQueries({ queryKey: ["admin-access-data"] });
    },
    onError: () => toast.error("Não foi possível atualizar o acesso."),
  });

  const preReleaseMutation = useMutation({
    mutationFn: (input: { email: string; observacao: string }) => preReleaseEmail({ data: input }),
    onSuccess: async (result) => {
      toast.success(result.result === "liberado" ? "A conta foi liberada." : "E-mail pré-liberado para o cadastro.");
      setEmail("");
      setObservacaoPreRelease("");
      await queryClient.invalidateQueries({ queryKey: ["admin-access-data"] });
    },
    onError: () => toast.error("Não foi possível pré-liberar esse e-mail."),
  });

  const removeMutation = useMutation({
    mutationFn: (targetEmail: string) => removePreReleasedEmail({ data: { email: targetEmail } }),
    onSuccess: async () => {
      toast.success("Pré-liberação removida.");
      await queryClient.invalidateQueries({ queryKey: ["admin-access-data"] });
    },
    onError: () => toast.error("Não foi possível remover a pré-liberação."),
  });

  async function submitPreRelease(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    try {
      await preReleaseMutation.mutateAsync({ email: email.trim(), observacao: observacaoPreRelease.trim() });
    } catch {
      // The mutation handler displays the actionable error.
    }
  }

  async function updateStatus(userId: string, nextStatus: "ativo" | "bloqueado", note: string) {
    await statusMutation.mutateAsync({ userId, status: nextStatus, observacao: note });
  }

  const result = accessQuery.data;
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Acessos</h1>
        </div>
        <p className="text-sm text-muted-foreground">Confirme a compra na Kiwify antes de liberar. Clientes não podem aprovar o próprio acesso.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Pré-liberar e-mail</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={submitPreRelease}>
            <div className="space-y-2">
              <Label htmlFor="pre-release-email">E-mail usado na compra</Label>
              <Input id="pre-release-email" type="email" autoComplete="email" required maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="cliente@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pre-release-note">Observação (opcional)</Label>
              <Input id="pre-release-note" maxLength={500} value={observacaoPreRelease} onChange={(event) => setObservacaoPreRelease(event.target.value)} placeholder="Ex.: pedido Kiwify confirmado" />
            </div>
            <Button type="submit" disabled={preReleaseMutation.isPending}>
              {preReleaseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pré-liberar
            </Button>
          </form>
          {(result?.preReleasedEmails.length ?? 0) > 0 && (
            <div className="mt-5 border-t pt-4">
              <h2 className="mb-3 text-sm font-semibold">E-mails pré-liberados</h2>
              <ul className="space-y-2">
                {result?.preReleasedEmails.map((item) => (
                  <li key={item.email} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.email}</p>
                      <p className="text-xs text-muted-foreground">Adicionado em {formatDate(item.criado_em)}</p>
                    </div>
                    <RemovePreReleaseDialog email={item.email} disabled={removeMutation.isPending} onRemove={() => removeMutation.mutateAsync(item.email).then(() => undefined)} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contas</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Buscar por e-mail" className="pl-9" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="Buscar por e-mail..." />
            </div>
            <Select value={status} onValueChange={(value) => { setStatus(value as typeof status); setPage(0); }}>
              <SelectTrigger aria-label="Filtrar por status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="bloqueado">Bloqueados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {accessQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando acessos…</div>
          ) : accessQuery.isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">Não foi possível carregar os acessos. Atualize a página e tente novamente.</div>
          ) : (result?.users.length ?? 0) === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhuma conta encontrada para este filtro.</div>
          ) : (
            <div className="space-y-3">
              {result?.users.map((user) => (
                <article key={user.user_id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <UserRound className="h-4 w-4 text-muted-foreground" />
                        <p className="break-all font-semibold">{user.email || "E-mail indisponível"}</p>
                        <Badge variant={user.status === "ativo" ? "default" : user.status === "bloqueado" ? "destructive" : "secondary"}>
                          {statusLabels[user.status] ?? user.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Cadastro: {formatDate(user.created_at)}</p>
                      {user.liberado_em && <p className="text-xs text-muted-foreground">Última liberação: {formatDate(user.liberado_em)}</p>}
                      {user.observacao && <p className="text-sm text-muted-foreground">Observação: {user.observacao}</p>}
                    </div>
                    <StatusActionDialog
                      status={user.status}
                      email={user.email}
                      disabled={statusMutation.isPending}
                      onConfirm={(nextStatus, note) => updateStatus(user.user_id, nextStatus, note)}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}

          {!accessQuery.isError && (result?.total ?? 0) > 0 && (
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">{result?.total} conta(s) · página {page + 1} de {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
