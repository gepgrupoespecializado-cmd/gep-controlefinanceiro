import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Calendar as CalendarIcon, Pencil, Trash2, FileCheck2, MapPin, Clock, User as UserIcon, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  db, useDB, statusAgendaLabel, freqLabel, freqColor, recorrenciaLabel,
  type Agendamento, type AgendaStatus, type Recorrencia, type ClienteFreq,
} from "@/lib/store";
import { ConfirmDelete } from "@/components/confirm-delete";
import { RelatorioDialog } from "@/components/relatorio-dialog";
import { dateTimeBR, dateBR } from "@/lib/format";
import { toast } from "sonner";
import { ptBR } from "date-fns/locale";

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

const freqDot: Record<ClienteFreq, string> = {
  semanal: "bg-emerald-500",
  quinzenal: "bg-blue-500",
  mensal: "bg-orange-500",
  trimestral: "bg-purple-500",
  avulso: "bg-slate-500",
};

function AgendaPage() {
  const data = useDB();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selDate, setSelDate] = useState<Date | undefined>(new Date());
  const [relatorioOpen, setRelatorioOpen] = useState(false);
  const [relatorioAg, setRelatorioAg] = useState<Agendamento | null>(null);
  const [view, setView] = useState<"dia" | "semana" | "mes" | "lista">("dia");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({
    clienteId: "", servicoId: "", titulo: "", data: "", hora: "09:00",
    horaFim: "", responsavel: "", endereco: "",
    observacoes: "", status: "agendado" as AgendaStatus,
    recorrencia: "nenhuma" as Recorrencia, intervaloDias: 7,
  });

  // Handoff de "Novo Atendimento": abre o dialog com cliente pré-selecionado
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cliId = sessionStorage.getItem("gep_novo_atendimento_cliente");
    if (!cliId) return;
    sessionStorage.removeItem("gep_novo_atendimento_cliente");
    const cli = data.clientes.find((c) => c.id === cliId);
    if (!cli) return;
    const d = new Date();
    setEditId(null);
    setForm({
      clienteId: cliId, servicoId: "", titulo: `Serviço — ${cli.nome}`,
      data: d.toISOString().slice(0, 10), hora: "09:00", horaFim: "",
      responsavel: "", endereco: cli.endereco ?? "",
      observacoes: "", status: "agendado",
      recorrencia: "nenhuma", intervaloDias: 7,
    });
    setOpen(true);
    toast.success("Cliente selecionado — confirme data e horário");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const diasComEvento = useMemo(() => {
    const set = new Set<string>();
    data.agendamentos.filter((a) => !a.arquivado).forEach((a) => set.add(new Date(a.data).toDateString()));
    return set;
  }, [data.agendamentos]);

  const ativos = useMemo(
    () => data.agendamentos.filter((a) => !a.arquivado),
    [data.agendamentos],
  );

  function matchBusca(a: Agendamento): boolean {
    const term = busca.trim().toLowerCase();
    if (!term) return true;
    const cli = data.clientes.find((c) => c.id === a.clienteId);
    const serv = data.servicos.find((s) => s.id === a.servicoId);
    const campos = [
      a.titulo, a.observacoes, a.endereco, a.responsavel,
      cli?.nome, cli?.bairro, cli?.cidade, cli?.endereco,
      serv?.nome, statusAgendaLabel[a.status],
      dateBR(a.data), new Date(a.data).toLocaleDateString("pt-BR"),
    ].filter(Boolean) as string[];
    return campos.some((v) => v.toLowerCase().includes(term));
  }

  const doDia = selDate
    ? ativos.filter((a) => new Date(a.data).toDateString() === selDate.toDateString() && matchBusca(a))
        .sort((a, b) => +new Date(a.data) - +new Date(b.data))
    : [];

  const daSemana = useMemo(() => {
    const base = selDate ?? new Date();
    const ini = new Date(base); ini.setDate(base.getDate() - base.getDay()); ini.setHours(0,0,0,0);
    const fim = new Date(ini); fim.setDate(ini.getDate() + 7);
    return ativos
      .filter((a) => { const d = new Date(a.data); return d >= ini && d < fim && matchBusca(a); })
      .sort((a, b) => +new Date(a.data) - +new Date(b.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativos, selDate, busca, data.clientes, data.servicos]);

  const doMes = useMemo(() => {
    const base = selDate ?? new Date();
    return ativos
      .filter((a) => { const d = new Date(a.data); return d.getMonth() === base.getMonth() && d.getFullYear() === base.getFullYear() && matchBusca(a); })
      .sort((a, b) => +new Date(a.data) - +new Date(b.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativos, selDate, busca, data.clientes, data.servicos]);

  const listaGeral = useMemo(
    () => ativos.filter(matchBusca).sort((a, b) => +new Date(b.data) - +new Date(a.data)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ativos, busca, data.clientes, data.servicos],
  );

  // Alertas inteligentes
  const alertas = useMemo(() => {
    const agora = new Date(); const hoje = new Date(); hoje.setHours(0,0,0,0);
    const amanha = new Date(hoje); amanha.setDate(hoje.getDate() + 1);
    const depAmanha = new Date(hoje); depAmanha.setDate(hoje.getDate() + 2);
    const naoConcluido = (a: Agendamento) => a.status !== "concluido" && a.status !== "cancelado";
    const ehHoje = ativos.filter((a) => naoConcluido(a) && new Date(a.data) >= hoje && new Date(a.data) < amanha);
    const ehAmanha = ativos.filter((a) => naoConcluido(a) && new Date(a.data) >= amanha && new Date(a.data) < depAmanha);
    const atrasados = ativos.filter((a) => naoConcluido(a) && new Date(a.data) < agora && new Date(a.data) < hoje);
    return { ehHoje, ehAmanha, atrasados };
  }, [ativos]);

  function VazioAgenda({ msg }: { msg: string }) {
    return (
      <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
        <CalendarIcon className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
        {msg}
      </CardContent></Card>
    );
  }

  function renderCard(a: Agendamento) {
    const cli = data.clientes.find((c) => c.id === a.clienteId);
    const serv = data.servicos.find((s) => s.id === a.servicoId);
    const dotClass = cli ? freqDot[cli.frequencia] : "bg-slate-400";
    const endereco = a.endereco || cli?.endereco;
    return (
      <Card key={a.id} className="overflow-hidden">
        <div className={`h-1 ${dotClass}`} />
        <CardContent className="p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} title={cli ? freqLabel[cli.frequencia] : ""} />
                <p className="truncate font-semibold">{a.titulo}</p>
                <span className={`h-2 w-2 rounded-full ${statusColor[a.status]}`} title={statusAgendaLabel[a.status]} />
                <Badge variant="outline" className="text-[10px] h-5">{statusAgendaLabel[a.status]}</Badge>
                {cli && <Badge variant="outline" className="text-[10px] h-5">{freqLabel[cli.frequencia]}</Badge>}
                {a.recorrencia && a.recorrencia !== "nenhuma" && (
                  <Badge className="text-[10px] h-5 bg-primary/10 text-primary border-primary/30 hover:bg-primary/20">↻ {recorrenciaLabel[a.recorrencia]}</Badge>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
                <p className="flex items-center gap-1.5"><UserIcon className="h-3 w-3" />{cli?.nome ?? "—"}</p>
                <p className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {dateTimeBR(a.data)}
                  {a.horaFim && ` – ${a.horaFim}`}
                </p>
                {serv && <p className="flex items-center gap-1.5">🔧 {serv.nome}</p>}
                {endereco && <p className="flex items-start gap-1.5"><MapPin className="h-3 w-3 mt-0.5 shrink-0" /><span className="line-clamp-2">{endereco}</span></p>}
              </div>
              {a.observacoes && <p className="text-xs text-muted-foreground mt-1">{a.observacoes}</p>}
              {a.status === "concluido" && (
                <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => abrirRelatorio(a)}>
                  <FileCheck2 className="h-3.5 w-3.5" />
                  {a.relatorioId ? "Ver/editar relatório" : "Gerar relatório"}
                </Button>
              )}
            </div>
            <div className="flex items-start gap-1">
              <Select value={a.status} onValueChange={(v) => mudarStatus(a, v as AgendaStatus)}>
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
              <ConfirmDelete
                trigger={<Button variant="ghost" size="icon" title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                titulo={`Excluir agendamento "${a.titulo}"?`}
                onConfirm={() => { db.arquivarAgendamento(a.id); toast.success("Agendamento excluído"); }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function abrirNovo() {
    const d = selDate ?? new Date();
    setEditId(null);
    setForm({
      clienteId: "", servicoId: "", titulo: "", data: d.toISOString().slice(0, 10),
      hora: "09:00", horaFim: "", responsavel: "", endereco: "",
      observacoes: "", status: "agendado",
      recorrencia: "nenhuma", intervaloDias: 7,
    });
    setOpen(true);
  }
  function abrirEdicao(a: Agendamento) {
    const dt = new Date(a.data);
    setEditId(a.id);
    setForm({
      clienteId: a.clienteId, servicoId: a.servicoId ?? "", titulo: a.titulo,
      data: dt.toISOString().slice(0, 10),
      hora: a.horaInicio || dt.toTimeString().slice(0, 5),
      horaFim: a.horaFim ?? "", responsavel: a.responsavel ?? "", endereco: a.endereco ?? "",
      observacoes: a.observacoes ?? "", status: a.status,
      recorrencia: a.recorrencia ?? "nenhuma", intervaloDias: a.intervaloDias ?? 7,
    });
    setOpen(true);
  }

  function salvar() {
    if (!form.clienteId) return toast.error("Selecione o cliente");
    if (!form.titulo.trim()) return toast.error("Informe o título");
    if (!form.data) return toast.error("Informe a data");
    const iso = new Date(`${form.data}T${form.hora}:00`).toISOString();
    const serv = data.servicos.find((s) => s.id === form.servicoId);
    const cli = data.clientes.find((c) => c.id === form.clienteId);
    const payload = {
      clienteId: form.clienteId, servicoId: form.servicoId || undefined,
      titulo: form.titulo, data: iso, observacoes: form.observacoes,
      status: form.status, valor: serv?.valor,
      horaInicio: form.hora, horaFim: form.horaFim || undefined,
      responsavel: form.responsavel || undefined,
      endereco: form.endereco || cli?.endereco || undefined,
      recorrencia: form.recorrencia,
      intervaloDias: form.recorrencia === "personalizada" ? form.intervaloDias : undefined,
    };
    if (editId) { db.updateAgendamento(editId, payload); toast.success("Agendamento atualizado"); }
    else { db.addAgendamento(payload); toast.success("Agendamento criado"); }
    setOpen(false);
  }

  function mudarStatus(a: Agendamento, s: AgendaStatus) {
    db.updateAgendamento(a.id, { status: s });
    if (s === "concluido") {
      setRelatorioAg({ ...a, status: s });
      setRelatorioOpen(true);
    }
  }
  function abrirRelatorio(a: Agendamento) {
    setRelatorioAg(a);
    setRelatorioOpen(true);
  }

  // Alertas de retorno próximo (próximos 7 dias)
  const proximosRetornos = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const lim = new Date(hoje); lim.setDate(lim.getDate() + 7);
    return data.agendamentos
      .filter((a) => !a.arquivado && a.status === "agendado")
      .filter((a) => { const d = new Date(a.data); return d >= hoje && d <= lim; })
      .sort((a, b) => +new Date(a.data) - +new Date(b.data))
      .slice(0, 5);
  }, [data.agendamentos]);

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
            {proximosRetornos.length > 0 && (
              <div className="mt-3 border-t pt-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground px-1">Próximos retornos (7 dias)</p>
                {proximosRetornos.map((a) => {
                  const cli = data.clientes.find((c) => c.id === a.clienteId);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelDate(new Date(a.data))}
                      className="w-full text-left flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted text-xs"
                    >
                      <span className={`h-2 w-2 rounded-full ${cli ? freqDot[cli.frequencia] : "bg-slate-400"}`} />
                      <span className="truncate flex-1">{cli?.nome ?? "Cliente"}</span>
                      <span className="text-muted-foreground">{new Date(a.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList>
              <TabsTrigger value="dia">Diária</TabsTrigger>
              <TabsTrigger value="semana">Semanal</TabsTrigger>
              <TabsTrigger value="mes">Mensal</TabsTrigger>
              <TabsTrigger value="lista">Lista</TabsTrigger>
            </TabsList>
            <TabsContent value="dia" className="mt-3 space-y-3">
              <p className="text-sm font-semibold capitalize">
                {selDate?.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
              </p>
              {doDia.length === 0 ? <VazioAgenda msg="Nenhum serviço agendado neste dia." /> : doDia.map((a) => renderCard(a))}
            </TabsContent>
            <TabsContent value="semana" className="mt-3 space-y-3">
              <p className="text-sm font-semibold">{daSemana.length} compromisso(s) na semana</p>
              {daSemana.length === 0 ? <VazioAgenda msg="Nenhum agendamento nesta semana." /> : daSemana.map((a) => renderCard(a))}
            </TabsContent>
            <TabsContent value="mes" className="mt-3 space-y-3">
              <p className="text-sm font-semibold capitalize">
                {(selDate ?? new Date()).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} — {doMes.length} compromisso(s)
              </p>
              {doMes.length === 0 ? <VazioAgenda msg="Nenhum agendamento neste mês." /> : doMes.map((a) => renderCard(a))}
            </TabsContent>
            <TabsContent value="lista" className="mt-3 space-y-3">
              <p className="text-sm font-semibold">{listaGeral.length} agendamento(s)</p>
              {listaGeral.length === 0 ? <VazioAgenda msg="Nenhum agendamento encontrado." /> : listaGeral.map((a) => renderCard(a))}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar agendamento" : "Novo agendamento"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Cliente *</Label>
              <Select value={form.clienteId} onValueChange={(v) => {
                const c = data.clientes.find((x) => x.id === v);
                setForm({ ...form, clienteId: v, endereco: form.endereco || c?.endereco || "" });
              }}>
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
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5"><Label className="text-xs">Data</Label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Início</Label><Input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Término</Label><Input type="time" value={form.horaFim} onChange={(e) => setForm({ ...form, horaFim: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">Responsável</Label><Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} placeholder="Técnico responsável" /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Endereço do atendimento</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Será preenchido com o endereço do cliente" /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Recorrência (retorno automático)</Label>
                <Select value={form.recorrencia} onValueChange={(v) => setForm({ ...form, recorrencia: v as Recorrencia })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhuma">Sem recorrência</SelectItem>
                    <SelectItem value="semanal">Retorno semanal (7 dias)</SelectItem>
                    <SelectItem value="quinzenal">Retorno quinzenal (14 dias)</SelectItem>
                    <SelectItem value="mensal">Retorno mensal (30 dias)</SelectItem>
                    <SelectItem value="trimestral">Retorno trimestral (90 dias)</SelectItem>
                    <SelectItem value="personalizada">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.recorrencia === "personalizada" && (
                <div className="grid gap-1.5">
                  <Label className="text-xs">Intervalo (dias)</Label>
                  <Input type="number" min={1} value={form.intervaloDias} onChange={(e) => setForm({ ...form, intervaloDias: Number(e.target.value) || 7 })} />
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Ao concluir o serviço, o próximo agendamento será criado automaticamente conforme a recorrência.</p>
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

      <Card>
        <CardContent className="p-3">
          <p className="text-[11px] font-semibold text-muted-foreground mb-2">Legenda — cor por tipo de cliente</p>
          <div className="flex flex-wrap gap-3 text-xs">
            {(Object.keys(freqDot) as ClienteFreq[]).map((f) => (
              <span key={f} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${freqDot[f]}`} />{freqLabel[f]}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <RelatorioDialog open={relatorioOpen} onOpenChange={setRelatorioOpen} agendamento={relatorioAg} />
    </div>
  );
}