import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Building2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, useDB } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/empresa")({
  head: () => ({ meta: [{ title: "Empresa — GEP Controle" }] }),
  component: EmpresaPage,
});

function EmpresaPage() {
  const data = useDB();
  const [form, setForm] = useState(data.empresa);
  const fileRef = useRef<HTMLInputElement>(null);

  function salvar() {
    db.updateEmpresa(form);
    toast.success("Dados da empresa salvos");
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
          <div className="grid gap-1.5"><Label className="text-xs">Nome da empresa</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
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

      <div className="flex justify-end">
        <Button onClick={salvar}>Salvar alterações</Button>
      </div>
    </div>
  );
}