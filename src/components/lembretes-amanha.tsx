import { useEffect, useMemo, useState } from "react";
import { BellRing, MessageCircle, CheckCircle2, AlertTriangle, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db, useDB } from "@/lib/store";
import { useCompanyName } from "@/hooks/use-company-name";
import {
  amanhaBR, chaveDataBR, configLembretes, dataExtensoBR, horaBR, horarioAgendamento,
  lembreteEnviado, lembretesDeAmanha, localAgendamento, mensagemLembrete, referenciaLembrete, telefoneCliente,
} from "@/lib/lembretes";

export function LembretesAmanha() {
  const data = useDB();
  const nomeEmpresa = useCompanyName();
  const cfg = configLembretes(data.empresa);
  const [agora, setAgora] = useState<Date | null>(null);

  useEffect(() => {
    setAgora(new Date());
    const t = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const itens = useMemo(() => (agora ? lembretesDeAmanha(data.agendamentos ?? [], agora) : []), [data.agendamentos, agora]);
  const pendentes = itens.filter((a) => !lembreteEnviado(a)).length;

  // Aviso ao prestador no horário configurado (uma vez por dia neste aparelho).
  useEffect(() => {
    if (!agora || !cfg.ativo || pendentes === 0 || horaBR(agora) < cfg.horaAviso) return;
    const chave = `gep_aviso_lembretes_${chaveDataBR(agora)}`;
    if (localStorage.getItem(chave)) return;
    localStorage.setItem(chave, "1");
    const texto = `Você tem ${pendentes} lembrete${pendentes > 1 ? "s" : ""} de amanhã para enviar.`;
    toast.info(texto, { duration: 10_000 });
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification("Lembretes de amanhã", { body: texto }); } catch { /* ignore */ }
    }
  }, [agora, cfg.ativo, cfg.horaAviso, pendentes]);

  if (!agora || !cfg.ativo) return null;

  const enviar = (id: string) => {
    const a = itens.find((x) => x.id === id); if (!a) return;
    const c = data.clientes.find((x) => x.id === a.clienteId);
    const fone = telefoneCliente(c);
    if (!fone) { toast.error("Cliente sem telefone cadastrado."); return; }
    const msg = mensagemLembrete(a, c, data.empresa, nomeEmpresa);
    window.open(`https://wa.me/${fone}?text=${encodeURIComponent(msg)}`, "_blank");
    db.updateAgendamento(a.id, { lembreteStatus: "enviado", lembreteEnviadoEm: new Date().toISOString(), lembreteReferencia: referenciaLembrete(a) });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <BellRing className="h-4 w-4" /> Lembretes de amanhã
          <span className="text-xs font-normal text-muted-foreground">{dataExtensoBR(amanhaBR(agora))}</span>
          {pendentes > 0 && <Badge variant="secondary">{pendentes} pendente{pendentes > 1 ? "s" : ""}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {itens.length === 0 && <p className="text-sm text-muted-foreground">Nenhum agendamento para amanhã.</p>}
        {itens.map((a) => {
          const c = data.clientes.find((x) => x.id === a.clienteId);
          const fone = telefoneCliente(c);
          const enviado = lembreteEnviado(a);
          const local = localAgendamento(a, c);
          return (
            <div key={a.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm min-w-0 break-words">{c?.nome ?? "Cliente"}</p>
                {enviado
                  ? <Badge className="shrink-0 gap-1"><CheckCircle2 className="h-3 w-3" />Enviado</Badge>
                  : <Badge variant="outline" className="shrink-0">Pendente</Badge>}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="flex items-center gap-1"><Clock className="h-3 w-3 shrink-0" />{horarioAgendamento(a) || "Horário não definido"}</p>
                <p className="flex items-start gap-1"><MapPin className="h-3 w-3 shrink-0 mt-0.5" /><span className="break-words">{local || "Local não informado"}</span></p>
                {enviado && a.lembreteEnviadoEm && (
                  <p>Enviado em {new Date(a.lembreteEnviadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}</p>
                )}
              </div>
              {!fone ? (
                <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Cliente sem telefone cadastrado; envio indisponível.</p>
              ) : (
                <Button size="sm" variant={enviado ? "outline" : "default"} className="w-full sm:w-auto" onClick={() => enviar(a.id)}>
                  <MessageCircle className="h-4 w-4" /> {enviado ? "Reenviar lembrete" : "Enviar lembrete"}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
