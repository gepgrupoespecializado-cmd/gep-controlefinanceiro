import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Download, Eye, FolderOpen, ImageIcon, Mail, Maximize2, Pen, Search, Share2, X } from "lucide-react";
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
import {
  type Agendamento, type FormaPagamento, type Relatorio, type RelatorioStatus,
  type SituacaoPagamento,
  formaPagamentoLabel, relatorioStatusLabel, relatorios, situacaoPagamentoLabel, useDB,
} from "@/lib/store";
import { SignaturePad } from "@/components/signature-pad";
import { gerarRelatorioPDF } from "@/lib/relatorio-pdf";
import { abrirPDF, baixarPDF, compartilharPDF } from "@/lib/pdf";
import { brl, dateBR, padNum } from "@/lib/format";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agendamento: Agendamento | null;
}

type FotoTipo = "antes" | "durante" | "depois";
type FotoItem = { src: string; nome: string; criadoEm: number };

function tsId() { return `foto-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function compressImage(file: File, maxW = 1280, quality = 0.7): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function RelatorioDialog({ open, onOpenChange, agendamento }: Props) {
  const data = useDB();
  const camRef = useRef<Record<FotoTipo, HTMLInputElement | null>>({ antes: null, durante: null, depois: null });
  const galRef = useRef<Record<FotoTipo, HTMLInputElement | null>>({ antes: null, durante: null, depois: null });
  const fileRef = useRef<Record<FotoTipo, HTMLInputElement | null>>({ antes: null, durante: null, depois: null });
  const existente = agendamento?.relatorioId
    ? data.relatorios.find((r) => r.id === agendamento.relatorioId)
    : undefined;

  const cliente = agendamento ? data.clientes.find((c) => c.id === agendamento.clienteId) : undefined;
  const servico = agendamento ? data.servicos.find((s) => s.id === agendamento.servicoId) : undefined;

  const [status, setStatus] = useState<RelatorioStatus>("sucesso");
  const [descricao, setDescricaoState] = useState("");
  const [observacoes, setObservacoes] = useState("O serviço foi executado conforme contratado e entregue em perfeitas condições de uso.");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [fotosAntes, setFotosAntes] = useState<FotoItem[]>([]);
  const [fotosDurante, setFotosDurante] = useState<FotoItem[]>([]);
  const [fotosDepois, setFotosDepois] = useState<FotoItem[]>([]);
  const [buscaFoto, setBuscaFoto] = useState("");
  const [lightbox, setLightbox] = useState<{ list: FotoItem[]; idx: number } | null>(null);
  const [assTec, setAssTec] = useState<string | undefined>();
  const [assCli, setAssCli] = useState<string | undefined>();
  const [salvoId, setSalvoId] = useState<string | null>(null);

  // ===== Pagamento =====
  const [valorOrcamento, setValorOrcamento] = useState<number>(0);
  const [valorRecebido, setValorRecebido] = useState<number>(0);
  const [formasPag, setFormasPag] = useState<FormaPagamento[]>([]);
  const [parcelas, setParcelas] = useState<number>(1);
  const [taxaCartao, setTaxaCartao] = useState<number>(0);
  const [obsFin, setObsFin] = useState<string>("");
  const [dataPag, setDataPag] = useState<string>(new Date().toISOString().slice(0, 10));
  const [situacaoPag, setSituacaoPag] = useState<SituacaoPagamento>("pago");
  const [recebidoPor, setRecebidoPor] = useState<string>("");
  const [assTela, setAssTela] = useState<null | "tec" | "cli">(null);

  const saldo = useMemo(() => +(valorOrcamento - valorRecebido).toFixed(2), [valorOrcamento, valorRecebido]);

  useEffect(() => {
    if (!open || !agendamento) return;
    if (existente) {
      setStatus(existente.status);
      setDescricaoState(existente.descricao);
      setObservacoes(existente.observacoes ?? "");
      setHoraInicio(existente.horaInicio ?? "");
      setHoraFim(existente.horaFim ?? "");
      setResponsavel(existente.responsavel ?? "");
      setFotosAntes(existente.fotosAntes.map((s, i) => ({ src: s, nome: `antes-${i + 1}.jpg`, criadoEm: Date.now() })));
      setFotosDurante(existente.fotosDurante.map((s, i) => ({ src: s, nome: `durante-${i + 1}.jpg`, criadoEm: Date.now() })));
      setFotosDepois(existente.fotosDepois.map((s, i) => ({ src: s, nome: `depois-${i + 1}.jpg`, criadoEm: Date.now() })));
      setAssTec(existente.assinaturaTecnico);
      setAssCli(existente.assinaturaCliente);
      setSalvoId(existente.id);
      setValorOrcamento(existente.valorOrcamento ?? agendamento.valor ?? 0);
      setValorRecebido(existente.valorRecebido ?? existente.valorOrcamento ?? agendamento.valor ?? 0);
      setFormasPag(existente.formasPagamentoRecebimento ?? []);
      setParcelas(existente.parcelas ?? 1);
      setTaxaCartao(existente.taxaCartao ?? 0);
      setObsFin(existente.observacoesFinanceiras ?? "");
      setDataPag((existente.dataPagamento ?? new Date().toISOString()).slice(0, 10));
      setSituacaoPag(existente.situacaoPagamento ?? "pago");
      setRecebidoPor(existente.recebidoPor ?? "");
    } else {
      const dt = new Date(agendamento.data);
      setStatus("sucesso");
      setDescricaoState(servico?.descricao || agendamento.titulo || "");
      setObservacoes("O serviço foi executado conforme contratado e entregue em perfeitas condições de uso.");
      setHoraInicio(agendamento.horaInicio ?? dt.toTimeString().slice(0, 5));
      setHoraFim(agendamento.horaFim ?? "");
      setResponsavel(agendamento.responsavel ?? "");
      setFotosAntes([]); setFotosDurante([]); setFotosDepois([]);
      setAssTec(undefined); setAssCli(undefined);
      setSalvoId(null);
      setBuscaFoto("");
      const v = agendamento.valor ?? 0;
      setValorOrcamento(v); setValorRecebido(v);
      setFormasPag([]); setParcelas(1); setTaxaCartao(0);
      setObsFin(""); setDataPag(new Date().toISOString().slice(0, 10));
      setSituacaoPag("pago"); setRecebidoPor(agendamento.responsavel ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agendamento?.id]);

  async function adicionarFotos(tipo: FotoTipo, files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    const items = await Promise.all(arr.map(async (f) => ({
      src: await compressImage(f),
      nome: f.name || `${tipo}-${tsId()}.jpg`,
      criadoEm: f.lastModified || Date.now(),
    })));
    const setter = tipo === "antes" ? setFotosAntes : tipo === "durante" ? setFotosDurante : setFotosDepois;
    setter((prev) => [...prev, ...items]);
  }
  function removerFoto(tipo: FotoTipo, idx: number) {
    const setter = tipo === "antes" ? setFotosAntes : tipo === "durante" ? setFotosDurante : setFotosDepois;
    setter((prev) => prev.filter((_, i) => i !== idx));
  }
  function moverFoto(tipo: FotoTipo, idx: number, dir: -1 | 1) {
    const setter = tipo === "antes" ? setFotosAntes : tipo === "durante" ? setFotosDurante : setFotosDepois;
    setter((prev) => {
      const arr = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return prev;
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return arr;
    });
  }

  function filtraFotos(arr: FotoItem[]): FotoItem[] {
    const q = buscaFoto.trim().toLowerCase();
    if (!q) return arr;
    return arr.filter((f) =>
      f.nome.toLowerCase().includes(q) ||
      new Date(f.criadoEm).toLocaleDateString("pt-BR").includes(q),
    );
  }

  function montarRelatorio(): Relatorio | null {
    if (!agendamento) return null;
    const id = salvoId ?? "";
    const numero = existente?.numero ?? data.proximoRelatorio;
    return {
      id, numero,
      agendamentoId: agendamento.id,
      clienteId: agendamento.clienteId,
      orcamentoId: agendamento.orcamentoId,
      servicoExecutado: servico?.nome || agendamento.titulo,
      descricao, observacoes, status,
      dataExecucao: agendamento.data,
      horaInicio, horaFim, responsavel,
      valor: agendamento.valor,
      fotosAntes: fotosAntes.map((f) => f.src),
      fotosDurante: fotosDurante.map((f) => f.src),
      fotosDepois: fotosDepois.map((f) => f.src),
      assinaturaTecnico: assTec, assinaturaCliente: assCli,
      criadoEm: existente?.criadoEm ?? new Date().toISOString(),
      valorOrcamento, valorRecebido,
      formasPagamentoRecebimento: formasPag,
      parcelas, taxaCartao,
      observacoesFinanceiras: obsFin,
      dataPagamento: new Date(`${dataPag}T12:00:00`).toISOString(),
      situacaoPagamento: situacaoPag,
      recebidoPor,
    };
  }

  function validarParaPDF(): boolean {
    const faltas: string[] = [];
    if (!cliente) faltas.push("Cliente");
    if (!(servico?.nome || agendamento?.titulo)) faltas.push("Serviço");
    if (!descricao.trim()) faltas.push("Descrição dos serviços");
    if (faltas.length) {
      toast.error(`Preencha antes de gerar PDF: ${faltas.join(", ")}`);
      return false;
    }
    return true;
  }

  function salvar(silencioso = false): string | null {
    if (!agendamento) return null;
    if (!descricao.trim()) {
      toast.error("Descreva os serviços executados");
      return null;
    }
    if (salvoId) {
      relatorios.update(salvoId, {
        status, descricao, observacoes, horaInicio, horaFim, responsavel,
        fotosAntes: fotosAntes.map((f) => f.src),
        fotosDurante: fotosDurante.map((f) => f.src),
        fotosDepois: fotosDepois.map((f) => f.src),
        assinaturaTecnico: assTec, assinaturaCliente: assCli,
        valorOrcamento, valorRecebido,
        formasPagamentoRecebimento: formasPag,
        parcelas, taxaCartao,
        observacoesFinanceiras: obsFin,
        dataPagamento: new Date(`${dataPag}T12:00:00`).toISOString(),
        situacaoPagamento: situacaoPag, recebidoPor,
      });
      if (!silencioso) toast.success("Relatório atualizado");
      return salvoId;
    }
    const novoId = relatorios.add({
      agendamentoId: agendamento.id,
      clienteId: agendamento.clienteId,
      orcamentoId: agendamento.orcamentoId,
      servicoExecutado: servico?.nome || agendamento.titulo,
      descricao, observacoes, status,
      dataExecucao: agendamento.data,
      horaInicio, horaFim, responsavel,
      valor: agendamento.valor,
      fotosAntes: fotosAntes.map((f) => f.src),
      fotosDurante: fotosDurante.map((f) => f.src),
      fotosDepois: fotosDepois.map((f) => f.src),
      assinaturaTecnico: assTec, assinaturaCliente: assCli,
      valorOrcamento, valorRecebido,
      formasPagamentoRecebimento: formasPag,
      parcelas, taxaCartao,
      observacoesFinanceiras: obsFin,
      dataPagamento: new Date(`${dataPag}T12:00:00`).toISOString(),
      situacaoPagamento: situacaoPag, recebidoPor,
    });
    setSalvoId(novoId);
    if (!silencioso) toast.success("Relatório salvo");
    return novoId;
  }

  function pdfDoc(): { doc: ReturnType<typeof gerarRelatorioPDF>; filename: string } | null {
    if (!validarParaPDF()) return null;
    const r = montarRelatorio();
    if (!r) return null;
    salvar(true);
    const final = { ...r, numero: existente?.numero ?? data.proximoRelatorio };
    const doc = gerarRelatorioPDF(final, cliente, data.empresa);
    return { doc, filename: `RPS-${padNum(final.numero)}.pdf` };
  }

  function visualizar() { const r = pdfDoc(); if (r) abrirPDF(r.doc); }
  function baixar() { const r = pdfDoc(); if (r) baixarPDF(r.doc, r.filename); }

  function mensagemWhats() {
    return [
      `*Relatório de Prestação de Serviço — ${data.empresa.nome || "GEP Serviços"}*`,
      `Cliente: ${cliente?.nome ?? ""}`,
      `Serviço: ${servico?.nome || agendamento?.titulo}`,
      `Data: ${agendamento ? dateBR(agendamento.data) : ""}`,
      `Status: ${relatorioStatusLabel[status]}`,
      "",
      "Segue em anexo o PDF do relatório.",
    ].join("\n");
  }

  async function enviarWhats(numero?: string) {
    const r = pdfDoc();
    if (!r) return;
    const tel = (numero || cliente?.whatsapp || cliente?.telefone || "").replace(/\D/g, "");
    const res = await compartilharPDF({ doc: r.doc, filename: r.filename, titulo: "Relatório de Serviço", mensagem: mensagemWhats(), telefone: tel });
    if (res === "shared") toast.success("PDF compartilhado");
    else if (res === "whatsapp") toast.info("PDF baixado — anexe na conversa do WhatsApp aberta");
    else toast.info("PDF baixado");
  }

  function enviarEmail() {
    baixar();
    const to = encodeURIComponent(cliente?.email || "");
    const subj = encodeURIComponent(`Relatório de Serviço — ${data.empresa.nome || ""}`);
    const body = encodeURIComponent(mensagemWhats());
    window.location.href = `mailto:${to}?subject=${subj}&body=${body}`;
  }

  async function compartilhar() {
    const r = pdfDoc();
    if (!r) return;
    const tel = (cliente?.whatsapp || cliente?.telefone || "").replace(/\D/g, "");
    await compartilharPDF({ doc: r.doc, filename: r.filename, titulo: "Relatório de Serviço", mensagem: mensagemWhats(), telefone: tel });
  }

  if (!agendamento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Relatório de Prestação de Serviço
            {existente ? ` — RPS-${padNum(existente.numero)}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-xs">
            <p><b>Cliente:</b> {cliente?.nome ?? "—"}</p>
            <p><b>Serviço:</b> {servico?.nome || agendamento.titulo}</p>
            <p><b>Data:</b> {dateBR(agendamento.data)}</p>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">Status do serviço</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as RelatorioStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sucesso">✅ {relatorioStatusLabel.sucesso}</SelectItem>
                <SelectItem value="observacoes">⚠️ {relatorioStatusLabel.observacoes}</SelectItem>
                <SelectItem value="retorno">🔧 {relatorioStatusLabel.retorno}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="grid gap-1.5"><Label className="text-xs">Início</Label><Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Término</Label><Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Responsável</Label><Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Nome do técnico" /></div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">Descrição dos serviços executados *</Label>
            <Textarea rows={5} value={descricao} onChange={(e) => setDescricaoState(e.target.value)} />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs font-semibold">Observações</Label>
            <Textarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs flex items-center gap-1.5"><Search className="h-3 w-3" /> Buscar imagem (nome ou data)</Label>
            <Input value={buscaFoto} onChange={(e) => setBuscaFoto(e.target.value)} placeholder="ex: fachada.jpg ou 20/06/2026" />
          </div>

          {(["antes", "durante", "depois"] as FotoTipo[]).map((t) => {
            const full = t === "antes" ? fotosAntes : t === "durante" ? fotosDurante : fotosDepois;
            const list = filtraFotos(full);
            const label = t === "antes" ? "Fotos ANTES" : t === "durante" ? "Fotos DURANTE" : "Fotos DEPOIS";
            return (
              <div key={t} className="grid gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label className="text-xs font-semibold">{label} <span className="text-muted-foreground font-normal">({full.length})</span></Label>
                  <div className="flex flex-wrap gap-1">
                    <Button type="button" size="sm" variant="outline" onClick={() => camRef.current[t]?.click()}>
                      <Camera className="h-3.5 w-3.5" />Câmera
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => galRef.current[t]?.click()}>
                      <ImageIcon className="h-3.5 w-3.5" />Galeria
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current[t]?.click()}>
                      <FolderOpen className="h-3.5 w-3.5" />Arquivo
                    </Button>
                  </div>
                  <input ref={(el) => { camRef.current[t] = el; }} type="file" accept="image/*" capture="environment" hidden
                    onChange={(e) => { adicionarFotos(t, e.target.files); e.target.value = ""; }} />
                  <input ref={(el) => { galRef.current[t] = el; }} type="file" accept="image/*" multiple hidden
                    onChange={(e) => { adicionarFotos(t, e.target.files); e.target.value = ""; }} />
                  <input ref={(el) => { fileRef.current[t] = el; }} type="file" multiple hidden
                    onChange={(e) => { adicionarFotos(t, e.target.files); e.target.value = ""; }} />
                </div>
                {list.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {list.map((foto) => {
                      const i = full.indexOf(foto);
                      return (
                        <div key={i} className="relative group">
                          <button type="button" onClick={() => setLightbox({ list: full, idx: i })} className="block w-full">
                            <img src={foto.src} alt={foto.nome} className="h-24 w-full rounded-lg object-cover border" />
                          </button>
                          <p className="text-[10px] truncate text-muted-foreground mt-0.5" title={foto.nome}>{foto.nome}</p>
                          <div className="absolute top-1 right-1 flex gap-1">
                            <button type="button" onClick={() => moverFoto(t, i, -1)} className="grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"><ChevronLeft className="h-3 w-3" /></button>
                            <button type="button" onClick={() => moverFoto(t, i, 1)} className="grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"><ChevronRight className="h-3 w-3" /></button>
                            <button type="button" onClick={() => removerFoto(t, i)} className="grid h-6 w-6 place-items-center rounded-full bg-destructive text-white"><X className="h-3 w-3" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* ===== Pagamento ===== */}
          <div className="grid gap-3 rounded-lg border bg-emerald-50/40 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">💰 Encerramento financeiro</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Valor do orçamento</Label>
                <Input type="number" step="0.01" value={valorOrcamento}
                  onChange={(e) => setValorOrcamento(+e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Valor recebido</Label>
                <Input type="number" step="0.01" value={valorRecebido}
                  onChange={(e) => setValorRecebido(+e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Saldo</Label>
                <div className={`rounded-md border px-2 py-2 text-sm font-semibold ${saldo > 0 ? "text-amber-700" : saldo < 0 ? "text-blue-700" : "text-emerald-700"}`}>
                  {brl(saldo)}
                </div>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Formas de pagamento</Label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(formaPagamentoLabel) as FormaPagamento[]).map((f) => {
                  const on = formasPag.includes(f);
                  return (
                    <button key={f} type="button"
                      onClick={() => setFormasPag((p) => on ? p.filter((x) => x !== f) : [...p, f])}
                      className={`rounded-full border px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}>
                      {formaPagamentoLabel[f]}
                    </button>
                  );
                })}
              </div>
            </div>

            {formasPag.includes("credito") && (
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Parcelas</Label>
                  <Input type="number" min={1} value={parcelas} onChange={(e) => setParcelas(+e.target.value || 1)} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Taxa cartão (%)</Label>
                  <Input type="number" step="0.01" value={taxaCartao} onChange={(e) => setTaxaCartao(+e.target.value)} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Data do recebimento</Label>
                <Input type="date" value={dataPag} onChange={(e) => setDataPag(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Situação</Label>
                <Select value={situacaoPag} onValueChange={(v) => setSituacaoPag(v as SituacaoPagamento)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(situacaoPagamentoLabel) as SituacaoPagamento[]).map((s) => (
                      <SelectItem key={s} value={s}>{situacaoPagamentoLabel[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Recebido por</Label>
                <Input value={recebidoPor} onChange={(e) => setRecebidoPor(e.target.value)} placeholder="Nome" />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Observações financeiras</Label>
              <Textarea rows={2} value={obsFin} onChange={(e) => setObsFin(e.target.value)}
                placeholder="Desconto concedido, pagamento parcial, cortesia, etc." />
            </div>
          </div>

          {/* ===== Assinaturas ===== */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Responsável Técnico</p>
                <Button type="button" size="sm" variant="outline" onClick={() => setAssTela("tec")}>
                  <Pen className="h-3.5 w-3.5" />✍️ Assinar
                </Button>
              </div>
              {assTec ? (
                <img src={assTec} alt="Assinatura técnico" className="h-20 w-full rounded border bg-white object-contain" />
              ) : (
                <div className="grid h-20 w-full place-items-center rounded border bg-muted/30 text-[11px] text-muted-foreground">Sem assinatura</div>
              )}
            </div>
            <div className="grid gap-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Cliente</p>
                <Button type="button" size="sm" variant="outline" onClick={() => setAssTela("cli")}>
                  <Pen className="h-3.5 w-3.5" />✍️ Assinar
                </Button>
              </div>
              {assCli ? (
                <img src={assCli} alt="Assinatura cliente" className="h-20 w-full rounded border bg-white object-contain" />
              ) : (
                <div className="grid h-20 w-full place-items-center rounded border bg-muted/30 text-[11px] text-muted-foreground">Sem assinatura</div>
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-primary/5 p-3">
            <p className="text-xs font-semibold mb-2">Gerar / Enviar relatório</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={visualizar}><Eye className="h-3.5 w-3.5" />Visualizar PDF</Button>
              <Button size="sm" variant="outline" onClick={baixar}><Download className="h-3.5 w-3.5" />Salvar PDF</Button>
              <Button size="sm" variant="outline" onClick={() => enviarWhats()}><Share2 className="h-3.5 w-3.5" />WhatsApp</Button>
              <Button size="sm" variant="outline" onClick={() => enviarWhats(data.empresa.whatsapp)}><Share2 className="h-3.5 w-3.5" />WhatsApp Business</Button>
              <Button size="sm" variant="outline" onClick={enviarEmail}><Mail className="h-3.5 w-3.5" />E-mail</Button>
              <Button size="sm" variant="outline" onClick={compartilhar}><Share2 className="h-3.5 w-3.5" />Compartilhar</Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={() => { salvar(); }}>Salvar relatório</Button>
        </DialogFooter>

        {lightbox && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
            <img src={lightbox.list[lightbox.idx]?.src} alt="Visualização" className="max-h-[90vh] max-w-[95vw] object-contain" />
            <button type="button" onClick={(e) => { e.stopPropagation(); setLightbox(null); }} className="absolute top-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white"><X className="h-5 w-5" /></button>
            {lightbox.list.length > 1 && (
              <>
                <button type="button" onClick={(e) => { e.stopPropagation(); setLightbox((l) => l && ({ ...l, idx: (l.idx - 1 + l.list.length) % l.list.length })); }} className="absolute left-4 grid h-12 w-12 place-items-center rounded-full bg-white/20 text-white"><ChevronLeft className="h-6 w-6" /></button>
                <button type="button" onClick={(e) => { e.stopPropagation(); setLightbox((l) => l && ({ ...l, idx: (l.idx + 1) % l.list.length })); }} className="absolute right-4 grid h-12 w-12 place-items-center rounded-full bg-white/20 text-white"><ChevronRight className="h-6 w-6" /></button>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}