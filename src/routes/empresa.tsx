import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Building2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { db, useDB, pdfTemaPreset, pdfMesInfo, type PdfTema } from "@/lib/store";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { flush, loadOrgContext } from "@/data/cloud-sync";

export const Route = createFileRoute("/empresa")({
  head: () => ({ meta: [
    { title: "Empresa — Gestão de Serviços" },
    { name: "description", content: "Empresa da sua empresa no aplicativo de gestão de serviços." },
    { property: "og:title", content: "Empresa — Gestão de Serviços" },
    { property: "og:description", content: "Empresa da sua empresa no aplicativo de gestão de serviços." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: EmpresaPage,
});

function EmpresaPage() {
  const data = useDB();
  const [form, setForm] = useState(data.empresa);
  const fileRef = useRef<HTMLInputElement>(null);

  const temas: { value: PdfTema; nome: string; desc: string }[] = [
    { value: "azul_corporativo", nome: "Azul Corporativo", desc: "Cabeçalho azul · visual empresarial" },
    { value: "azul_escuro",      nome: "Azul Escuro Premium", desc: "Azul escuro elegante · layout executivo" },
    { value: "verde_empresarial",nome: "Verde Empresarial", desc: "Verde profissional · moderno e confiável" },
    { value: "cinza_executivo",  nome: "Cinza Executivo", desc: "Tons de cinza · design corporativo limpo" },
    { value: "preto_premium",    nome: "Preto Premium", desc: "Preto e branco · alto padrão visual" },
  ];

  function aplicarTema(t: PdfTema) {
    const p = pdfTemaPreset[t];
    setForm({
      ...form,
      temaPdf: t,
      corPdf: p.principal,
      corSecundariaPdf: p.secundaria,
      // Selecionar um modelo manual desliga o modo mensal automático
      pdfMesModo: "off",
    });
  }

  const mesAtual = new Date().getMonth() + 1;
  const mesEfetivo =
    form.pdfMesModo === "auto"
      ? mesAtual
      : form.pdfMesModo === "manual"
        ? form.pdfMesManual ?? mesAtual
        : null;

  async function salvar() {
    const nome = form.nome.trim();
    if (!nome) {
      toast.error("Informe o nome da empresa.");
      return;
    }
    db.updateEmpresa({ ...form, nome });
    try {
      const { orgId } = await loadOrgContext();
      if (!orgId) throw new Error("Empresa não encontrada");
      const { data: organization, error } = await supabase.from("organizations")
        .update({ name: nome }).eq("id", orgId).select("id").single();
      if (error || !organization) throw error ?? new Error("Nome não atualizado");
      await flush();
      toast.success("Dados da empresa salvos");
    } catch {
      toast.error("Não foi possível confirmar o salvamento. Tente novamente.");
    }
  }

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 800_000) return toast.error("Logo muito grande (máx 800KB)");
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, logoDataUrl: String(reader.result) });
    reader.readAsDataURL(f);
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-black">Empresa</h1>
        <p className="text-xs text-muted-foreground">Estes dados aparecem nos PDFs e orçamentos.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Identidade visual</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl bg-muted overflow-hidden border">
              {form.logoDataUrl
                ? <img src={form.logoDataUrl} alt="Logo" className="h-full w-full object-contain" />
                : <Building2 className="h-8 w-8 text-muted-foreground" />}
            </div>
            <div className="space-y-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogo} />
              <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />Carregar logo</Button>
              {form.logoDataUrl && <Button variant="ghost" size="sm" onClick={() => setForm({ ...form, logoDataUrl: undefined })}>Remover</Button>}
              <p className="text-xs text-muted-foreground">PNG ou JPG. Recomendado: 256x256.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Dados da empresa</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-1.5"><Label className="text-xs">Nome da empresa</Label><Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label className="text-xs">CNPJ</Label><Input value={form.cnpj ?? ""} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">E-mail</Label><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label className="text-xs">Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">WhatsApp</Label><Input value={form.whatsapp ?? ""} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
          </div>
          <div className="grid gap-1.5"><Label className="text-xs">Endereço</Label><Input value={form.endereco ?? ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Redes sociais</Label><Textarea value={form.redesSociais ?? ""} onChange={(e) => setForm({ ...form, redesSociais: e.target.value })} placeholder="Instagram, Facebook, site..." /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Personalização do PDF</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2 rounded-lg border p-3 bg-muted/30">
            <Label className="text-xs font-semibold">📅 Modelos mensais (12 cores anuais)</Label>
            <div className="flex flex-wrap gap-2 text-xs">
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio" name="pdfMesModo"
                  checked={(form.pdfMesModo ?? "off") === "off"}
                  onChange={() => setForm({ ...form, pdfMesModo: "off" })}
                />
                Desligado (usar modelo abaixo)
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio" name="pdfMesModo"
                  checked={form.pdfMesModo === "auto"}
                  onChange={() => setForm({ ...form, pdfMesModo: "auto" })}
                />
                Automático (mês atual)
              </label>
              <label className="inline-flex items-center gap-1.5">
                <input
                  type="radio" name="pdfMesModo"
                  checked={form.pdfMesModo === "manual"}
                  onChange={() => setForm({ ...form, pdfMesModo: "manual", pdfMesManual: form.pdfMesManual ?? mesAtual })}
                />
                Manual
              </label>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {pdfMesInfo.map((m) => {
                const p = pdfTemaPreset[m.key];
                const ativo = mesEfetivo === m.mes;
                const clickable = form.pdfMesModo === "manual";
                return (
                  <button
                    key={m.key}
                    type="button"
                    disabled={!clickable}
                    onClick={() => setForm({ ...form, pdfMesModo: "manual", pdfMesManual: m.mes })}
                    className={`text-left rounded-md border p-2 text-[11px] transition-colors ${ativo ? "border-primary ring-2 ring-primary/30" : "hover:bg-muted"} ${!clickable ? "opacity-70 cursor-default" : ""}`}
                    title={`${m.nome} — ${m.campanha}`}
                  >
                    <div className="h-6 rounded mb-1" style={{ background: p.principal }} />
                    <div className="flex items-center gap-1">
                      <span>{m.emoji}</span>
                      <span className="font-semibold truncate">{m.nome}</span>
                    </div>
                    <div className="text-muted-foreground truncate">{m.campanha}</div>
                  </button>
                );
              })}
            </div>
            {mesEfetivo && (
              <p className="text-[11px] text-muted-foreground">
                Modelo ativo: <b>{pdfMesInfo[mesEfetivo - 1].emoji} {pdfMesInfo[mesEfetivo - 1].nome}</b>. Aplicado automaticamente em todos os PDFs (orçamentos e relatórios).
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label className="text-xs">Modelo de PDF (usado quando o modo mensal está desligado)</Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {temas.map((t) => {
                const ativo = (form.temaPdf ?? "azul_escuro") === t.value;
                const p = pdfTemaPreset[t.value];
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => aplicarTema(t.value)}
                    className={`text-left rounded-lg border p-3 transition-colors ${ativo ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "hover:bg-muted"}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="h-5 w-5 rounded border" style={{ background: p.principal }} />
                      <span className="h-5 w-5 rounded border" style={{ background: p.secundaria }} />
                      <p className="font-semibold text-sm">{t.nome}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Cor principal</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.corPdf ?? "#0b1b3d"} onChange={(e) => setForm({ ...form, corPdf: e.target.value })} className="h-10 w-14 cursor-pointer rounded border" />
                <Input value={form.corPdf ?? "#0b1b3d"} onChange={(e) => setForm({ ...form, corPdf: e.target.value })} className="font-mono" />
              </div>
              <p className="text-[11px] text-muted-foreground">Cabeçalho, títulos e total.</p>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Cor secundária</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.corSecundariaPdf ?? "#3b82f6"} onChange={(e) => setForm({ ...form, corSecundariaPdf: e.target.value })} className="h-10 w-14 cursor-pointer rounded border" />
                <Input value={form.corSecundariaPdf ?? "#3b82f6"} onChange={(e) => setForm({ ...form, corSecundariaPdf: e.target.value })} className="font-mono" />
              </div>
              <p className="text-[11px] text-muted-foreground">Rodapés, bordas, destaques.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">⚙️ Configuração de Custos da Empresa</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Valores utilizados automaticamente como padrão na <b>Calculadora de Precificação</b>.
          </p>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <CustoCampo
            label="Valor padrão da hora (R$)"
            value={form.custosPadrao?.valorHora ?? 0}
            onChange={(v) => setForm({ ...form, custosPadrao: { ...form.custosPadrao, valorHora: v } })}
          />
          <CustoCampo
            label="Margem de lucro padrão (%)"
            value={form.custosPadrao?.margemLucro ?? 30}
            onChange={(v) => setForm({ ...form, custosPadrao: { ...form.custosPadrao, margemLucro: v } })}
          />
          <CustoCampo
            label="Taxa do cartão (%)"
            value={form.custosPadrao?.taxaCartao ?? 0}
            onChange={(v) => setForm({ ...form, custosPadrao: { ...form.custosPadrao, taxaCartao: v } })}
          />
          <CustoCampo
            label="Imposto / Simples (%)"
            value={form.custosPadrao?.imposto ?? 0}
            onChange={(v) => setForm({ ...form, custosPadrao: { ...form.custosPadrao, imposto: v } })}
          />
          <CustoCampo
            label="Custo operacional mensal (R$)"
            value={form.custosPadrao?.custoOperacionalMensal ?? 0}
            onChange={(v) => setForm({ ...form, custosPadrao: { ...form.custosPadrao, custoOperacionalMensal: v } })}
          />
          <CustoCampo
            label="Valor por km rodado (R$)"
            value={form.custosPadrao?.valorKm ?? 0}
            onChange={(v) => setForm({ ...form, custosPadrao: { ...form.custosPadrao, valorKm: v } })}
          />
          <CustoCampo
            label="Valor mínimo de atendimento (R$)"
            value={form.custosPadrao?.valorMinimoAtendimento ?? 0}
            onChange={(v) => setForm({ ...form, custosPadrao: { ...form.custosPadrao, valorMinimoAtendimento: v } })}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={salvar}>Salvar alterações</Button>
      </div>
    </div>
  );
}

function CustoCampo({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number" step={0.01} min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}