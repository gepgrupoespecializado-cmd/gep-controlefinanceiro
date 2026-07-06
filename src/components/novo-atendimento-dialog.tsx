import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, UserPlus, FileText, CalendarPlus, MessageCircle, Wallet, Calculator, User } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClienteFormDialog } from "@/components/cliente-form-dialog";
import { useDB, freqLabel, freqColor, type Cliente } from "@/lib/store";

type Props = { trigger: ReactNode };

const STORAGE_KEY = "gep_novo_atendimento_cliente";

export function NovoAtendimentoDialog({ trigger }: Props) {
  const data = useDB();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);

  const ativos = useMemo(
    () => data.clientes.filter((c) => !c.arquivado),
    [data.clientes],
  );
  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return ativos.slice(0, 8);
    return ativos.filter((c) =>
      [c.nome, c.telefone, c.whatsapp, c.endereco, c.email]
        .some((v) => v?.toLowerCase().includes(term)),
    ).slice(0, 20);
  }, [ativos, q]);

  const selecionado = selectedId ? ativos.find((c) => c.id === selectedId) : null;

  function handOff(cliente: Cliente) {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, cliente.id);
    }
  }
  function irPara(rota: "/orcamentos" | "/agenda" | "/financeiro" | "/precificacao", cliente: Cliente) {
    handOff(cliente);
    setOpen(false);
    navigate({ to: rota });
  }
  function whatsapp(cliente: Cliente) {
    const num = (cliente.whatsapp || cliente.telefone || "").replace(/\D/g, "");
    if (!num) return;
    const url = `https://wa.me/${num.length <= 11 ? "55" + num : num}`;
    window.open(url, "_blank", "noopener");
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSelectedId(null); setQ(""); } }}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo atendimento</DialogTitle>
          </DialogHeader>

          {!selecionado ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Escolha um cliente para iniciar. Todos os campos são reutilizados automaticamente.
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  className="pl-9"
                  placeholder="Buscar cliente por nome, telefone ou endereço…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <Button variant="outline" className="w-full justify-start" onClick={() => setNovoOpen(true)}>
                <UserPlus className="h-4 w-4" /> Cadastrar novo cliente
              </Button>

              <div className="divide-y rounded-lg border">
                {filtrados.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
                ) : filtrados.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{c.nome}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {c.telefone || c.whatsapp || c.email || "—"}
                      </p>
                    </div>
                    <Badge className={`${freqColor[c.frequencia]} border-0 text-[10px]`}>
                      {freqLabel[c.frequencia]}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{selecionado.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {selecionado.telefone || selecionado.whatsapp || "—"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>Trocar</Button>
                </div>
              </div>

              <p className="text-xs font-semibold text-muted-foreground">O que você quer fazer?</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <ActionButton icon={<Calculator className="h-4 w-4" />} label="Calcular preço" onClick={() => irPara("/precificacao", selecionado)} />
                <ActionButton icon={<FileText className="h-4 w-4" />} label="Novo orçamento" primary onClick={() => irPara("/orcamentos", selecionado)} />
                <ActionButton icon={<CalendarPlus className="h-4 w-4" />} label="Agendar serviço" onClick={() => irPara("/agenda", selecionado)} />
                <ActionButton icon={<Wallet className="h-4 w-4" />} label="Registrar pagamento" onClick={() => irPara("/financeiro", selecionado)} />
                <ActionButton
                  icon={<MessageCircle className="h-4 w-4" />}
                  label="Enviar WhatsApp"
                  disabled={!(selecionado.whatsapp || selecionado.telefone)}
                  onClick={() => whatsapp(selecionado)}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ClienteFormDialog
        open={novoOpen}
        onOpenChange={setNovoOpen}
        onSaved={(id) => {
          setNovoOpen(false);
          setSelectedId(id);
        }}
      />
    </>
  );
}

function ActionButton({
  icon, label, onClick, primary, disabled,
}: { icon: ReactNode; label: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <Button
      variant={primary ? "default" : "outline"}
      className="h-auto justify-start gap-2 py-3"
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </Button>
  );
}

export const NOVO_ATENDIMENTO_CLIENTE_KEY = STORAGE_KEY;
