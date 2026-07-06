import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, FileText, Download, Copy, Share2, Eye, Pencil, Search, BookOpen, UserPlus, User, X } from "lucide-react";
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
import { ConfirmDelete } from "@/components/confirm-delete";
import { ClienteFormDialog } from "@/components/cliente-form-dialog";
import { PdfPreviewDialog } from "@/components/pdf-preview-dialog";
import { db, useDB, totalOrcamento, statusOrcLabel, validadeOrcamento, formaPagamentoLabel, type Orcamento, type OrcamentoItem, type OrcamentoStatus, type FormaPagamento } from "@/lib/store";
import { brl, dateBR, padNum } from "@/lib/format";
import { gerarOrcamentoPDF, baixarPDF, compartilharPDF } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/orcamentos")({
  head: () => ({ meta: [{ title: "Orçamentos — GEP Controle" }] }),
  component: OrcamentosPage,
});

function OrcamentosPage() {
  const data = useDB();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<OrcamentoStatus | "todos">("todos");
  const [clienteId, setClienteId] = useState("");
  const [prazo, setPrazo] = useState("");
  const [obs, setObs] = useState("");
  const [descricaoServicos, setDescricaoServicos] = useState("");
  const [validadeDias, setValidadeDias] = useState(7);
  const [formasPagamento, setFormasPagamento] = useState<FormaPagamento[]>(["pix", "dinheiro", "debito", "credito"]);
  const [modelosOpen, setModelosOpen] = useState(false);
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);
  const [clienteBusca, setClienteBusca] = useState("");
  const [status, setStatus] = useState<OrcamentoStatus>("rascunho");
  const [itens, setItens] = useState<OrcamentoItem[]>([
    { descricao: "", quantidade: 1, valorUnit: 0 },
  ]);

  // Recebe rascunho vindo da Calculadora de Precificação
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem("gep_precificacao_draft");
    const cliHandoff = sessionStorage.getItem("gep_novo_atendimento_cliente");
    if (raw) {
      try {
        const d = JSON.parse(raw);
        resetForm();
        setItens([{ descricao: d.descricao || "Serviço calculado", quantidade: d.quantidade || 1, valorUnit: Number(d.valorUnit) || 0 }]);
        setDescricaoServicos(`Valor calculado pela Calculadora de Precificação.\nCusto total: R$ ${Number(d.detalhes?.custo || 0).toFixed(2)}\nLucro estimado: R$ ${Number(d.detalhes?.lucro || 0).toFixed(2)}\nMargem: ${Number(d.detalhes?.margem || 0).toFixed(1)}%`);
        if (cliHandoff) setClienteId(cliHandoff);
        setOpen(true);
        toast.success("Valor da calculadora pronto — selecione o cliente para finalizar");
      } catch {}
      sessionStorage.removeItem("gep_precificacao_draft");
      sessionStorage.removeItem("gep_novo_atendimento_cliente");
      return;
    }
    if (cliHandoff) {
      resetForm();
      setClienteId(cliHandoff);
      setOpen(true);
      sessionStorage.removeItem("gep_novo_atendimento_cliente");
      toast.success("Cliente selecionado — monte o orçamento");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetForm() {
    setClienteId(""); setPrazo(""); setObs(""); setStatus("rascunho"); setEditId(null);
    setDescricaoServicos(""); setValidadeDias(7);
    setFormasPagamento(["pix", "dinheiro", "debito", "credito"]);
    setClienteBusca("");
    setItens([{ descricao: "", quantidade: 1, valorUnit: 0 }]);
  }
  function abrirNovo() { resetForm(); setOpen(true); }
  function abrirEdicao(o: Orcamento) {
    setEditId(o.id); setClienteId(o.clienteId); setPrazo(o.prazo ?? "");
    setObs(o.observacoes ?? ""); setStatus(o.status); setItens(o.itens.map((i) => ({ ...i })));
    setDescricaoServicos(o.descricaoServicos ?? ""); setValidadeDias(o.validadeDias ?? 7);
    setFormasPagamento(o.formasPagamento?.length ? o.formasPagamento : ["pix", "dinheiro", "debito", "credito"]);
    setOpen(true);
  }

  function adicionarItem() {
    setItens([...itens, { descricao: "", quantidade: 1, valorUnit: 0 }]);
  }
  function atualizarItem(idx: number, patch: Partial<OrcamentoItem>) {
    setItens(itens.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function removerItem(idx: number) {
    setItens(itens.filter((_, i) => i !== idx));
  }
  function escolherServico(idx: number, servicoId: string) {
    const s = data.servicos.find((x) => x.id === servicoId);
    if (!s) return;
    atualizarItem(idx, { servicoId, descricao: s.nome, valorUnit: s.valor });
  }

  const clienteSelecionado = useMemo(
    () => data.clientes.find((c) => c.id === clienteId),
    [data.clientes, clienteId],
  );

  const clientesFiltrados = useMemo(() => {
    const term = clienteBusca.trim().toLowerCase();
    const ativos = data.clientes.filter((c) => !c.arquivado);
    if (!term) return ativos.slice(0, 8);
    return ativos.filter((c) =>
      [c.nome, c.telefone, c.whatsapp, c.endereco, c.cidade, c.bairro]
        .some((v) => v?.toLowerCase().includes(term)),
    ).slice(0, 12);
  }, [data.clientes, clienteBusca]);

  function salvar() {
    if (!clienteId) return toast.error("Selecione um cliente");
    if (itens.length === 0 || itens.some((i) => !i.descricao.trim())) {
      return toast.error("Adicione ao menos um item com descrição");
    }
    if (!descricaoServicos.trim()) {
      return toast.error("Informe a descrição dos serviços a serem prestados");
    }
    if (formasPagamento.length === 0) {
      return toast.error("Selecione ao menos uma forma de pagamento");
    }
    if (editId) {
      db.updateOrcamento(editId, { clienteId, itens, prazo, observacoes: obs, status, descricaoServicos, validadeDias, formasPagamento });
      toast.success("Orçamento atualizado");
    } else {
      db.addOrcamento({ clienteId, itens, prazo, observacoes: obs, status, descricaoServicos, validadeDias, formasPagamento });
      toast.success("Orçamento criado");
    }
    setOpen(false); resetForm();
  }

  const total = itens.reduce((s, i) => s + i.quantidade * i.valorUnit, 0);

  async function pdf(orcId: string, action: "view" | "download" | "share") {
    const o = data.orcamentos.find((x) => x.id === orcId);
    if (!o) return;
    const faltas: string[] = [];
    if (!data.empresa.nome) faltas.push("Nome da empresa");
    if (!o.descricaoServicos?.trim()) faltas.push("Descrição dos serviços");
    if (!o.itens.length || o.itens.some((i) => !i.descricao.trim())) faltas.push("Itens do orçamento");
    if (!o.clienteId) faltas.push("Cliente");
    if (faltas.length) {
      toast.error(`Existem informações obrigatórias não preenchidas: ${faltas.join(", ")}.`);
      return;
    }
    const cli = data.clientes.find((c) => c.id === o.clienteId);
    if (action === "view") { setPreviewId(orcId); return; }
    const doc = gerarOrcamentoPDF(o, cli, data.servicos, data.empresa);
    const filename = `ORC-${padNum(o.numero)}.pdf`;
    if (action === "download") baixarPDF(doc, filename);
    else {
      const tot = totalOrcamento(o);
      const { vencimento } = validadeOrcamento(o);
      const partes = [
        `*Orçamento ORC-${padNum(o.numero)}*`,
        `Cliente: ${cli?.nome ?? ""}`,
        `Total: ${brl(tot)}`,
        o.prazo ? `Prazo: ${o.prazo}` : "",
        `Validade até: ${dateBR(vencimento)}`,
        "",
        "*DESCRIÇÃO DOS SERVIÇOS:*",
        o.descricaoServicos,
      ].filter(Boolean);
      const txt = partes.join("\n");
      const tel = (cli?.whatsapp || cli?.telefone || "").replace(/\D/g, "");
      const res = await compartilharPDF({ doc, filename, titulo: `Orçamento ORC-${padNum(o.numero)}`, mensagem: txt, telefone: tel });
      if (res === "shared") toast.success("Orçamento compartilhado");
      else if (res === "whatsapp") toast.info("PDF baixado — anexe na conversa do WhatsApp");
      else toast.info("PDF baixado");
    }
  }

  const ativos = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.orcamentos.filter((o) => {
      if (o.arquivado) return false;
      if (statusFiltro !== "todos" && o.status !== statusFiltro) return false;
      if (!term) return true;
      const cli = data.clientes.find((c) => c.id === o.clienteId);
      return [`ORC-${padNum(o.numero)}`, cli?.nome ?? ""].some((v) => v.toLowerCase().includes(term));
    });
  }, [data.orcamentos, data.clientes, q, statusFiltro]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl sm:text-2xl font-black">Orçamentos</h1>
          <p className="text-xs text-muted-foreground">{ativos.length} ativo(s) · próx: ORC-{padNum(data.proximoOrcamento)}</p>
        </div>
        <Button onClick={abrirNovo}><Plus className="h-4 w-4" />Novo</Button>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editId ? "Editar orçamento" : "Novo orçamento"}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label className="text-xs font-semibold">Cliente *</Label>
                {clienteSelecionado ? (
                  <div className="flex items-start justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 font-semibold text-sm">
                        <User className="h-4 w-4 text-primary" />
                        {clienteSelecionado.nome}
                      </p>
                      <div className="mt-1 text-[11px] text-muted-foreground space-y-0.5">
                        {clienteSelecionado.telefone && <p>Tel: {clienteSelecionado.telefone}</p>}
                        {clienteSelecionado.whatsapp && <p>WhatsApp: {clienteSelecionado.whatsapp}</p>}
                        {clienteSelecionado.endereco && <p className="line-clamp-2">{clienteSelecionado.endereco}</p>}
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setClienteId("")}>
                      <X className="h-3.5 w-3.5" />Trocar
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-2 rounded-lg border bg-muted/30 p-3">
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          autoFocus
                          className="pl-9"
                          placeholder="Buscar por nome, telefone, WhatsApp ou endereço..."
                          value={clienteBusca}
                          onChange={(e) => setClienteBusca(e.target.value)}
                        />
                      </div>
                      <Button type="button" size="sm" onClick={() => setNovoClienteOpen(true)}>
                        <UserPlus className="h-4 w-4" />Novo cliente
                      </Button>
                    </div>
                    {clientesFiltrados.length === 0 ? (
                      <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                        {data.clientes.length === 0
                          ? "Nenhum cliente cadastrado. Clique em \"Novo cliente\" para começar."
                          : "Nenhum cliente encontrado para esta busca."}
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-y-auto rounded-md border bg-background divide-y">
                        {clientesFiltrados.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setClienteId(c.id); setClienteBusca(""); }}
                            className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                          >
                            <p className="text-sm font-semibold truncate">{c.nome}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {[c.telefone, c.whatsapp, c.endereco].filter(Boolean).join(" · ")}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Itens</Label>
                  <Button type="button" size="sm" variant="ghost" onClick={adicionarItem}><Plus className="h-3 w-3" />Item</Button>
                </div>
                <div className="space-y-2">
                  {itens.map((it, idx) => (
                    <div key={idx} className="rounded-lg border p-3 space-y-2 bg-muted/30">
                      <Select value={it.servicoId ?? ""} onValueChange={(v) => escolherServico(idx, v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar serviço cadastrado (opcional)" /></SelectTrigger>
                        <SelectContent>
                          {data.servicos.filter((s) => !s.arquivado).map((s) => <SelectItem key={s.id} value={s.id}>{s.nome} — {brl(s.valor)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input placeholder="Descrição do serviço" value={it.descricao} onChange={(e) => atualizarItem(idx, { descricao: e.target.value })} />
                      <div className="grid grid-cols-[80px_1fr_auto] gap-2 items-center">
                        <Input type="number" step="1" min={1} value={it.quantidade} onChange={(e) => atualizarItem(idx, { quantidade: Number(e.target.value) || 1 })} />
                        <Input type="number" step="0.01" value={it.valorUnit} onChange={(e) => atualizarItem(idx, { valorUnit: Number(e.target.value) || 0 })} />
                        <Button variant="ghost" size="icon" onClick={() => removerItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                      <p className="text-right text-xs text-muted-foreground">Subtotal: <b>{brl(it.quantidade * it.valorUnit)}</b></p>
                    </div>
                  ))}
                </div>
              </div>

              {/* DESCRIÇÃO DOS SERVIÇOS — obrigatório */}
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Descrição dos serviços a serem prestados *</Label>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setModelosOpen(true)}>
                    <BookOpen className="h-3.5 w-3.5" />Usar modelo
                  </Button>
                </div>
                <Textarea
                  value={descricaoServicos}
                  onChange={(e) => setDescricaoServicos(e.target.value)}
                  rows={8}
                  placeholder="Detalhe os serviços contratados de forma profissional. Use bullets, quebras de linha e itens detalhados."
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Este texto aparecerá no PDF e no envio por WhatsApp.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="grid gap-1.5"><Label className="text-xs">Prazo</Label><Input placeholder="ex: 7 dias" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as OrcamentoStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(statusOrcLabel) as OrcamentoStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{statusOrcLabel[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Validade (dias)</Label>
                  <Input type="number" min={1} value={validadeDias} onChange={(e) => setValidadeDias(Number(e.target.value) || 7)} />
                </div>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs font-semibold">Formas de pagamento *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.keys(formaPagamentoLabel) as FormaPagamento[]).map((f) => {
                    const ativo = formasPagamento.includes(f);
                    return (
                      <button
                        type="button"
                        key={f}
                        onClick={() => setFormasPagamento(ativo ? formasPagamento.filter((x) => x !== f) : [...formasPagamento, f])}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${ativo ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
                      >
                        {formaPagamentoLabel[f]}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">Aparecerá no PDF com texto padrão de condições.</p>
              </div>

              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs flex items-center justify-between">
                <span>Valor total</span>
                <span className="font-black text-primary text-base">{brl(total)}</span>
              </div>
              <div className="grid gap-1.5"><Label className="text-xs">Observações</Label><Textarea value={obs} onChange={(e) => setObs(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={salvar}>{editId ? "Atualizar" : "Salvar orçamento"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de seleção de modelos */}
        <Dialog open={modelosOpen} onOpenChange={setModelosOpen}>
          <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Selecionar modelo</DialogTitle></DialogHeader>
            <div className="space-y-2">
              {data.modelos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum modelo cadastrado.</p>}
              {data.modelos.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setDescricaoServicos(m.conteudo); setModelosOpen(false); toast.success(`Modelo "${m.nome}" aplicado`); }}
                  className="w-full text-left rounded-lg border p-3 hover:bg-muted transition-colors"
                >
                  <p className="font-semibold text-sm">{m.nome} {m.favorito && <span className="text-amber-500">★</span>}</p>
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{m.conteudo}</p>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Cadastro rápido de cliente direto do orçamento */}
        <ClienteFormDialog
          open={novoClienteOpen}
          onOpenChange={setNovoClienteOpen}
          initialNome={clienteBusca}
          onCreated={(id) => { setClienteId(id); setClienteBusca(""); }}
          saveLabel="Salvar cliente e continuar orçamento"
        />
      </div>

      {/* Pré-visualização com troca de modelo/cor em tempo real */}
      <PdfPreviewDialog
        open={!!previewId}
        onOpenChange={(v) => { if (!v) setPreviewId(null); }}
        orcamento={previewId ? data.orcamentos.find((o) => o.id === previewId) ?? null : null}
        cliente={previewId ? data.clientes.find((c) => c.id === (data.orcamentos.find((o) => o.id === previewId)?.clienteId ?? "")) : undefined}
        servicos={data.servicos}
        empresa={data.empresa}
      />

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por número ou cliente..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as typeof statusFiltro)}>
          <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            {(Object.keys(statusOrcLabel) as OrcamentoStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{statusOrcLabel[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {ativos.length === 0 ? (
        <Card><CardContent className="p-10 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum orçamento encontrado.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {ativos.map((o) => {
            const cli = data.clientes.find((c) => c.id === o.clienteId);
            const { vencimento } = validadeOrcamento(o);
            return (
              <Card key={o.id}>
                <CardContent className="p-4">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-start">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold">ORC-{padNum(o.numero)}</p>
                        <Select value={o.status} onValueChange={(v) => { db.updateOrcamento(o.id, { status: v as OrcamentoStatus }); toast.success("Status atualizado"); }}>
                          <SelectTrigger className="h-6 text-xs w-[110px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(Object.keys(statusOrcLabel) as OrcamentoStatus[]).map((s) => (
                              <SelectItem key={s} value={s}>{statusOrcLabel[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="truncate text-sm text-muted-foreground mt-1">{cli?.nome ?? "Cliente removido"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {dateBR(o.criadoEm)} · {o.itens.length} item(ns) · válido até <b className="text-foreground">{dateBR(vencimento)}</b>
                      </p>
                      {o.descricaoServicos && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap border-l-2 border-primary/30 pl-2 italic">
                          {o.descricaoServicos}
                        </p>
                      )}
                    </div>
                    <p className="text-right text-xl font-black text-primary tabular-nums whitespace-nowrap">{brl(totalOrcamento(o))}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => pdf(o.id, "view")}><Eye className="h-3.5 w-3.5" />Visualizar PDF</Button>
                    <Button size="sm" variant="outline" onClick={() => pdf(o.id, "download")}><Download className="h-3.5 w-3.5" />Baixar</Button>
                    <Button size="sm" variant="outline" onClick={() => pdf(o.id, "share")}><Share2 className="h-3.5 w-3.5" />WhatsApp</Button>
                    <Button size="sm" variant="outline" onClick={() => abrirEdicao(o)}><Pencil className="h-3.5 w-3.5" />Editar</Button>
                    <Button size="sm" variant="outline" onClick={() => { db.duplicarOrcamento(o.id); toast.success("Duplicado"); }}><Copy className="h-3.5 w-3.5" />Duplicar</Button>
                    <ConfirmDelete
                      trigger={<Button size="sm" variant="ghost"><Trash2 className="h-3.5 w-3.5 text-destructive" />Excluir</Button>}
                      titulo={`Excluir orçamento ORC-${padNum(o.numero)}?`}
                      onConfirm={() => { db.arquivarOrcamento(o.id); toast.success("Excluído"); }}
                    />
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