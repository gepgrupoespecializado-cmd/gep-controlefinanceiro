import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { db, type Cliente, type ClienteFreq } from "@/lib/store";
import { toast } from "sonner";

type FormState = Omit<Cliente, "id" | "criadoEm">;
const empty: FormState = {
  nome: "", telefone: "", whatsapp: "", email: "", documento: "",
  endereco: "", cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
  observacoes: "", frequencia: "avulso",
};

function montaEndereco(f: Partial<FormState>) {
  const linha1 = [f.rua, f.numero].filter(Boolean).join(", ");
  const partes = [linha1, f.complemento, f.bairro, [f.cidade, f.estado].filter(Boolean).join("/"), f.cep ? `CEP ${f.cep}` : ""].filter(Boolean);
  return partes.join(" — ");
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called with the new client's id after successful save. */
  onCreated?: (id: string) => void;
  /** Optional initial name to prefill (e.g. user typed it in search). */
  initialNome?: string;
  /** Label for the primary save button. */
  saveLabel?: string;
}

export function ClienteFormDialog({ open, onOpenChange, onCreated, initialNome, saveLabel = "Salvar cliente e continuar" }: Props) {
  const [form, setForm] = useState<FormState>({ ...empty, nome: initialNome ?? "" });
  const [buscandoCep, setBuscandoCep] = useState(false);

  function reset() {
    setForm({ ...empty, nome: initialNome ?? "" });
  }

  function salvar() {
    if (!form.nome.trim()) return toast.error("Informe o nome do cliente");
    const payload = { ...form, endereco: montaEndereco(form) || form.endereco };
    const id = db.addCliente(payload);
    toast.success("Cliente cadastrado e vinculado ao orçamento");
    onCreated?.(id);
    onOpenChange(false);
    reset();
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
      toast.error("Falha ao buscar CEP");
    } finally {
      setBuscandoCep(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Cadastrar novo cliente</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Field label="Nome completo *">
            <Input autoFocus value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone"><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></Field>
            <Field label="WhatsApp"><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="CPF/CNPJ"><Input value={form.documento ?? ""} onChange={(e) => setForm({ ...form, documento: e.target.value })} /></Field>
          </div>
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
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar}>{saveLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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