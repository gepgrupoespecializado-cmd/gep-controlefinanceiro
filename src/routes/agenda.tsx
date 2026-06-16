import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Calendar as CalendarIcon, Pencil, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { db, useDB, statusAgendaLabel, type Agendamento, type AgendaStatus } from "@/lib/store";
import { dateTimeBR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Agenda — GEP Controle" }] }),
  component: AgendaPage,
});

const statusColor: Record<AgendaStatus, string> = {
  agendado: "bg-blue-500",
  em_andamento: "bg-amber-500",
  concluido: "bg-emerald-500",
  cancelado: "bg-slate-400",
};

function AgendaPage() {
  const data = useDB();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selDate, setSelDate] = useState<Date | undefined>(new Date());
  const [form, setForm] = useState({
    clienteId: "", servicoId: "", titulo: "", data: "", hora: "09:00",
    observacoes: "", status: "agendado" as AgendaStatus,
  });

  const diasComEvento = useMemo(() => {
    const set = new Set<string>();
    data.agendamentos.filter((a) => !a.arquivado).forEach((a) => set.add(new Date(a.data).toDateString()));
    return set;
  }, [data.agendamentos]);

  const doDia = selDate
    ? data.agendamentos.filter((a) => !a.arquivado && new Date(a.data).toDateString() === selDate.toDateString())
        .sort((a, b) => +new Date(a.data) - +new Date(b.data))
    : [];

  function abrirNovo() {
    const d = selDate ?? new Date();
    setEditId(null);
    setForm({
      clienteId: "", servicoId: "", titulo: "", data: d.toISOString().slice(0, 10),
      hora: "09:00", observacoes: "", status: "agendado",
    });
    setOpen(true);
  }
  function abrirEdicao(a: Agendamento) {
    const dt = new Date(a.data);
    setEditId(a.id);
    setForm({
      clienteId: a.clienteId, servicoId: a.servicoId ?? "", titulo: a.titulo,
      data: dt.toISOString().slice(0, 10),
      hora: dt.toTimeString().slice(0, 5),
      observacoes: a.observacoes ?? "", status: a.status,
    });
    setOpen(true);
  }

  function salvar() {
    if (!form.clienteId) return toast.error("Selecione o cliente");
    if (!form.titulo.trim()) return toast.error("Informe o título");
    if (!form.data) return toast.error("Informe a data");
    const iso = new Date(`${form.data}T${form.hora}:00`).toISOString();
    const serv = data.servicos.find((s) => s.id === form.servicoId);
    const payload = {
      clienteId: form.clienteId, servicoId: form.servicoId || undefined,
      titulo: form.titulo, data: iso, observacoes: form.observacoes,
      status: form.status, valor: serv?.valor,
    };
    if (editId) { db.updateAgendamento(editId, payload); toast.success("Agendamento atualizado"); }
    else { db.addAgendamento(payload); toast.success("Agendamento criado"); }
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl sm:text-2xl font-black">Agenda</h1>
          <p className="text-xs text-muted-foreground">{data.agendamentos.length} agendamento(s)</p>
        </div>
        <Button onClick={abrirNovo}><Plus className="h-4 w-4" />Agendar</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <Card>
          <CardContent className="p-2 sm:p-3">
            <Calendar
              mode="single" selected={selDate} onSelect={setSelDate}
              modifiers={{ hasEvent: (d) => diasComEvento.has(d.toDateString()) }}
              modifiersClassNames={{ hasEvent: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary" }}
              className="pointer-events-auto"
            />
          </CardContent>
        </Card>

        <div className="space-y-3">
          <p className="text-sm font-semibold">
            {selDate?.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
          {doDia.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
              <CalendarIcon className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              Nenhum serviço agendado neste dia.
            </CardContent></Card>
          ) : (
            doDia.map((a) => {
              const cli = data.clientes.find((c) => c.id === a.clienteId);
              return (
                <Card key={a.id}>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`h-2 w-2 rounded-full ${statusColor[a.status]}`} />
                          <p className="truncate font-semibold">{a.titulo}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{cli?.nome ?? "—"} · {dateTimeBR(a.data)}</p>
                        {a.observacoes && <p className="text-xs text-muted-foreground mt-1">{a.observacoes}</p>}
                      </div>
                      <div className="flex items-start gap-1">
                        <Select value={a.status} onValueChange={(v) => db.updateAgendamento(a.id, { status: v as AgendaStatus })}>
                          <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(statusAgendaLabel) as AgendaStatus[]).map((s) => (
                              <SelectItem key={s} value={s}>{statusAgendaLabel[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" onClick={() => abrirEdicao(a)} title="Editar">
                          <Pencil className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Arquivar agendamento?")) db.arquivarAgendamento(a.id); }} title="Arquivar">
                          <Archive className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar agendamento" : "Novo agendamento"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Cliente *</Label>
              <Select value={form.clienteId} onValueChange={(v) => setForm({ ...form, clienteId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {data.clientes.filter((c) => !c.arquivado).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Serviço</Label>
              <Select value={form.servicoId} onValueChange={(v) => {
                const s = data.servicos.find((x) => x.id === v);
                setForm({ ...form, servicoId: v, titulo: form.titulo || s?.nome || "" });
              }}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {data.servicos.filter((s) => !s.arquivado).map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">Título *</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label className="text-xs">Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Hora</Label><Input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as AgendaStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(statusAgendaLabel) as AgendaStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{statusAgendaLabel[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(Object.keys(statusAgendaLabel) as AgendaStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${statusColor[s]}`} />{statusAgendaLabel[s]}
          </span>
        ))}
      </div>
    </div>
  );
}