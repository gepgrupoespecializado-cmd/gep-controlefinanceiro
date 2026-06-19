import { useEffect, useRef, useState } from "react";
import { Camera, Download, Eye, Mail, Share2, Trash2, X } from "lucide-react";
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
  type Agendamento, type Relatorio, type RelatorioStatus,
  relatorioStatusLabel, relatorios, useDB,
} from "@/lib/store";
import { SignaturePad } from "@/components/signature-pad";
import { gerarRelatorioPDF } from "@/lib/relatorio-pdf";
import { abrirPDF, baixarPDF } from "@/lib/pdf";
import { dateBR, padNum } from "@/lib/format";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agendamento: Agendamento | null;
}

type FotoTipo = "antes" | "durante" | "depois";

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
  const inputsRef = useRef<Record<FotoTipo, HTMLInputElement | null>>({ antes: null, durante: null, depois: null });
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
  const [fotosAntes, setFotosAntes] = useState<string[]>([]);
  const [fotosDurante, setFotosDurante] = useState<string[]>([]);
  const [fotosDepois, setFotosDepois] = useState<string[]>([]);
  const [assTec, setAssTec] = useState<string | undefined>();
  const [assCli, setAssCli] = useState<string | undefined>();
  const [salvoId, setSalvoId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !agendamento) return;
    if (existente) {
      setStatus(existente.status);
      setDescricaoState(existente.descricao);
      setObservacoes(existente.observacoes ?? "");
      setHoraInicio(existente.horaInicio ?? "");
      setHoraFim(existente.horaFim ?? "");
      setResponsavel(existente.responsavel ?? "");
      setFotosAntes(existente.fotosAntes);
      setFotosDurante(existente.fotosDurante);
      setFotosDepois(existente.fotosDepois);
      setAssTec(existente.assinaturaTecnico);
      setAssCli(existente.assinaturaCliente);
      setSalvoId(existente.id);
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, agendamento?.id]);

  async function adicionarFotos(tipo: FotoTipo, files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    const compressed = await Promise.all(arr.map((f) => compressImage(f)));
    const setter = tipo === "antes" ? setFotosAntes : tipo === "durante" ? setFotosDurante : setFotosDepois;
    setter((prev) => [...prev, ...compressed]);
  }
  function removerFoto(tipo: FotoTipo, idx: number) {
    const setter = tipo === "antes" ? setFotosAntes : tipo === "durante" ? setFotosDurante : setFotosDepois;
    setter((prev) => prev.filter((_, i) => i !== idx));
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
      fotosAntes, fotosDurante, fotosDepois,
      assinaturaTecnico: assTec, assinaturaCliente: assCli,
      criadoEm: existente?.criadoEm ?? new Date().toISOString(),
    };
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
        fotosAntes, fotosDurante, fotosDepois,
        assinaturaTecnico: assTec, assinaturaCliente: assCli,
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
      fotosAntes, fotosDurante, fotosDepois,
      assinaturaTecnico: assTec, assinaturaCliente: assCli,
    });
    setSalvoId(novoId);
    if (!silencioso) toast.success("Relatório salvo");
    return novoId;
  }

  function pdfDoc(): { doc: ReturnType<typeof gerarRelatorioPDF>; filename: string } | null {
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

  function enviarWhats(numero?: string) {
    baixar();
    const tel = (numero || cliente?.whatsapp || cliente?.telefone || "").replace(/\D/g, "");
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(mensagemWhats())}`;
    window.open(url, "_blank");
    toast.info("Anexe o PDF baixado na conversa do WhatsApp");
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
    const blob = r.doc.output("blob");
    const file = new File([blob], r.filename, { type: "application/pdf" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Relatório de Serviço", text: mensagemWhats() });
      } catch {}
    } else {
      baixar();
      toast.info("Compartilhamento nativo indisponível. PDF baixado.");
    }
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

          {(["antes", "durante", "depois"] as FotoTipo[]).map((t) => {
            const list = t === "antes" ? fotosAntes : t === "durante" ? fotosDurante : fotosDepois;
            const label = t === "antes" ? "Fotos ANTES" : t === "durante" ? "Fotos DURANTE" : "Fotos DEPOIS";
            return (
              <div key={t} className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">{label}</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => inputsRef.current[t]?.click()}>
                    <Camera className="h-3.5 w-3.5" />Adicionar
                  </Button>
                  <input
                    ref={(el) => { inputsRef.current[t] = el; }}
                    type="file" accept="image/*" multiple capture="environment" hidden
                    onChange={(e) => { adicionarFotos(t, e.target.files); e.target.value = ""; }}
                  />
                </div>
                {list.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {list.map((src, i) => (
                      <div key={i} className="relative group">
                        <img src={src} alt={`${t} ${i + 1}`} className="h-24 w-full rounded-lg object-cover border" />
                        <button
                          type="button"
                          onClick={() => removerFoto(t, i)}
                          className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100 transition"
                        ><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="grid gap-3 sm:grid-cols-2">
            <SignaturePad value={assTec} onChange={setAssTec} label="Assinatura do Responsável Técnico" />
            <SignaturePad value={assCli} onChange={setAssCli} label="Assinatura do Cliente" />
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
      </DialogContent>
    </Dialog>
  );
}