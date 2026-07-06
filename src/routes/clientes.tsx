import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Phone, Mail, MapPin, MessageCircle, Pencil, Trash2, Loader2, FileText, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { db, useDB, freqColor, freqLabel, type Cliente, type ClienteFreq } from "@/lib/store";
import { ConfirmDelete } from "@/components/confirm-delete";
import { toast } from "sonner";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes — GEP Controle" }] }),
  component: ClientesPage,
});

type FormState = Omit<Cliente, "id" | "criadoEm">;
const empty: FormState = {
  nome: "", telefone: "", whatsapp: "", email: "",
  endereco: "", cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
  observacoes: "", frequencia: "avulso",
};

function montaEndereco(f: Partial<FormState>) {
  const linha1 = [f.rua, f.numero].filter(Boolean).join(", ");
  const partes = [linha1, f.complemento, f.bairro, [f.cidade, f.estado].filter(Boolean).join("/"), f.cep ? `CEP ${f.cep}` : ""].filter(Boolean);
  return partes.join(" — ");
}

function ClientesPage() {
  const data = useDB();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [freqFilter, setFreqFilter] = useState<ClienteFreq | "todos">("todos");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [buscandoCep, setBuscandoCep] = useState(false);

  const ativos = data.clientes.filter((c) => !c.arquivado);
  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    return ativos.filter((c) => {
      if (freqFilter !== "todos" && c.frequencia !== freqFilter) return false;
      if (!term) return true;
      return [c.nome, c.telefone, c.email, c.endereco].some((v) => v?.toLowerCase().includes(term));
    });
  }, [ativos, q, freqFilter]);

  function abrirNovo() {
    setEditId(null); setForm(empty); setOpen(true);
  }
  function abrirEdicao(c: Cliente) {
    setEditId(c.id);
    setForm({
      nome: c.nome, telefone: c.telefone ?? "", whatsapp: c.whatsapp ?? "",
      email: c.email ?? "", endereco: c.endereco ?? "",
      cep: c.cep ?? "", rua: c.rua ?? "", numero: c.numero ?? "", complemento: c.complemento ?? "",
      bairro: c.bairro ?? "", cidade: c.cidade ?? "", estado: c.estado ?? "",
      observacoes: c.observacoes ?? "",
      frequencia: c.frequencia,
    });
    setOpen(true);
  }
  function salvar() {
    if (!form.nome.trim()) return toast.error("Informe o nome do cliente");
    const payload = { ...form, endereco: montaEndereco(form) || form.endereco };
    if (editId) { db.updateCliente(editId, payload); toast.success("Cliente atualizado"); }
    else { db.addCliente(payload); toast.success("Cliente cadastrado"); }
    setOpen(false);
  }

  async function buscarCep(cep: string) {
    const limpo = cep.replace(/\D/g, "");
    if (limpo.length !== 8) return;
    try {
      setBuscandoCep(true);
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const json = await res.json();
      if (json.erro) { toast.error("CEP não encontrado"); return; }
      setForm((f) => ({
        ...f,
        cep: limpo,
        rua: json.logradouro || f.rua,
        bairro: json.bairro || f.bairro,
        cidade: json.localidade || f.cidade,
        estado: json.uf || f.estado,
        complemento: f.complemento || json.complemento || "",
      }));
      toast.success("Endereço preenchido");
    } catch {
      toast.error("Falha ao buscar CEP (verifique a conexão)");
    } finally {
      setBuscandoCep(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl sm:text-2xl font-black">Clientes</h1>
          <p className="text-xs text-muted-foreground">{ativos.length} ativo(s)</p>
        </div>
        <Button onClick={abrirNovo}><Plus className="h-4 w-4" />Novo cliente</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Editar cliente" : "Novo cliente"}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <Field label="Nome completo *">
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Telefone"><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></Field>
                <Field label="WhatsApp"><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></Field>
              </div>
              <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <div className="grid gap-3 rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-semibold">Endereço</p>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Field label="CEP">
                    <Input
                      value={form.cep}
                      placeholder="00000-000"
                      onChange={(e) => setForm({ ...form, cep: e.target.value })}
                      onBlur={(e) => buscarCep(e.target.value)}
                    />
                  </Field>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" size="sm" disabled={buscandoCep} onClick={() => buscarCep(form.cep ?? "")}>
                      {buscandoCep ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                      Buscar
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_100px] gap-2">
                  <Field label="Rua"><Input value={form.rua} onChange={(e) => setForm({ ...form, rua: e.target.value })} /></Field>
                  <Field label="Número"><Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></Field>
                </div>
                <Field label="Complemento"><Input value={form.complemento} onChange={(e) => setForm({ ...form, complemento: e.target.value })} /></Field>
                <Field label="Bairro"><Input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} /></Field>
                <div className="grid grid-cols-[1fr_80px] gap-2">
                  <Field label="Cidade"><Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></Field>
                  <Field label="UF"><Input maxLength={2} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })} /></Field>
                </div>
              </div>
              <Field label="Classificação">
                <Select value={form.frequencia} onValueChange={(v) => setForm({ ...form, frequencia: v as ClienteFreq })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semanal">Cliente semanal</SelectItem>
                    <SelectItem value="quinzenal">Cliente quinzenal</SelectItem>
                    <SelectItem value="mensal">Cliente mensal</SelectItem>
                    <SelectItem value="trimestral">Cliente trimestral</SelectItem>
                    <SelectItem value="avulso">Avulso</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Observações"><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></Field>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={salvar}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar cliente..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={freqFilter} onValueChange={(v) => setFreqFilter(v as typeof freqFilter)}>
          <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas frequências</SelectItem>
            <SelectItem value="semanal">Semanal</SelectItem>
            <SelectItem value="quinzenal">Quinzenal</SelectItem>
            <SelectItem value="mensal">Mensal</SelectItem>
            <SelectItem value="trimestral">Trimestral</SelectItem>
            <SelectItem value="avulso">Avulso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtrados.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum cliente encontrado.</CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((c) => {
            const orcs = data.orcamentos.filter((o) => o.clienteId === c.id).length;
            const ags = data.agendamentos.filter((a) => a.clienteId === c.id).length;
            return (
              <Card key={c.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{c.nome}</p>
                      <Badge className={`mt-1 ${freqColor[c.frequencia]} border-0`}>{freqLabel[c.frequencia]}</Badge>
                    </div>
                    <div className="flex">
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicao(c)} title="Editar">
                        <Pencil className="h-4 w-4 text-primary" />
                      </Button>
                      <ConfirmDelete
                        trigger={<Button variant="ghost" size="icon" title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                        titulo={`Excluir cliente "${c.nome}"?`}
                        onConfirm={() => { db.arquivarCliente(c.id); toast.success("Cliente excluído"); }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {c.telefone && <p className="flex items-center gap-2"><Phone className="h-3 w-3" />{c.telefone}</p>}
                    {c.whatsapp && <p className="flex items-center gap-2"><MessageCircle className="h-3 w-3" />{c.whatsapp}</p>}
                    {c.email && <p className="flex items-center gap-2"><Mail className="h-3 w-3" />{c.email}</p>}
                    {c.endereco && <p className="flex items-center gap-2"><MapPin className="h-3 w-3" />{c.endereco}</p>}
                  </div>
                  <div className="flex gap-2 text-[11px] text-muted-foreground pt-2 border-t">
                    <span>{orcs} orçamento(s)</span><span>·</span><span>{ags} agendamento(s)</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}