import type { Agendamento, Cliente, Empresa } from "@/types/models";

export const TZ_BR = "America/Sao_Paulo";
export const HORA_AVISO_PADRAO = "17:00";
export const MODELO_LEMBRETE_PADRAO = `Prezado(a) {nome_cliente},

Informamos que o seu serviço está agendado para amanhã, {data}, às {horario}, no seguinte endereço: {local}.

Caso haja algum imprevisto, solicitamos que nos comunique com antecedência para o reagendamento.

Atenciosamente,
{nome_empresa}`;

/** Data (AAAA-MM-DD) no fuso de Brasília. */
export function chaveDataBR(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ_BR, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function horaBR(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ_BR, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

export function amanhaBR(agora: Date): string {
  const [y, m, d] = chaveDataBR(agora).split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1, 12));
  return t.toISOString().slice(0, 10);
}

/** Dia do agendamento no fuso de Brasília. */
export function diaAgendamento(a: Agendamento): string | null {
  if (!a.data) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(a.data)) return a.data;
  const d = new Date(a.data);
  return Number.isNaN(d.getTime()) ? null : chaveDataBR(d);
}

export function horarioAgendamento(a: Agendamento): string {
  if (a.horaInicio) return a.horaInicio;
  if (/^\d{4}-\d{2}-\d{2}$/.test(a.data)) return "";
  const d = new Date(a.data);
  return Number.isNaN(d.getTime()) ? "" : horaBR(d);
}

export function referenciaLembrete(a: Agendamento): string {
  return `${diaAgendamento(a) ?? ""}|${horarioAgendamento(a)}`;
}

/** Enviado só vale para a mesma data/horário; reagendar torna pendente de novo. */
export function lembreteEnviado(a: Agendamento): boolean {
  return a.lembreteStatus === "enviado" && a.lembreteReferencia === referenciaLembrete(a);
}

export function lembretesDeAmanha(ags: Agendamento[], agora: Date): Agendamento[] {
  const alvo = amanhaBR(agora);
  return ags
    .filter((a) => !a.arquivado && a.status !== "cancelado" && a.status !== "concluido" && diaAgendamento(a) === alvo)
    .sort((x, y) => horarioAgendamento(x).localeCompare(horarioAgendamento(y)));
}

export function telefoneCliente(c?: Cliente): string | null {
  const n = (c?.whatsapp || c?.telefone || "").replace(/\D/g, "");
  if (n.length < 10) return null;
  return n.length <= 11 ? "55" + n : n;
}

export function localAgendamento(a: Agendamento, c?: Cliente): string {
  if (a.endereco?.trim()) return a.endereco.trim();
  if (c?.endereco?.trim()) return c.endereco.trim();
  const partes = [c?.rua && [c.rua, c.numero].filter(Boolean).join(", "), c?.bairro, c?.cidade && [c.cidade, c.estado].filter(Boolean).join("/")].filter(Boolean);
  return partes.join(" - ");
}

export function dataExtensoBR(dia: string): string {
  const [y, m, d] = dia.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const semana = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", weekday: "long" }).format(dt);
  return `${semana}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function montarMensagem(modelo: string, v: { nome_cliente: string; data: string; horario: string; local: string; nome_empresa: string }): string {
  return modelo.replace(/\{(nome_cliente|data|horario|local|nome_empresa)\}/g, (_, k: keyof typeof v) => v[k]);
}

export function mensagemLembrete(a: Agendamento, c: Cliente | undefined, empresa: Empresa, nomeEmpresa: string): string {
  const dia = diaAgendamento(a);
  return montarMensagem(empresa.lembretes?.modelo || MODELO_LEMBRETE_PADRAO, {
    nome_cliente: c?.nome || "cliente",
    data: dia ? dataExtensoBR(dia) : "",
    horario: horarioAgendamento(a) || "horário a confirmar",
    local: localAgendamento(a, c) || "endereço a confirmar",
    nome_empresa: nomeEmpresa,
  });
}

export function configLembretes(e: Empresa) {
  return { ativo: e.lembretes?.ativo ?? true, horaAviso: e.lembretes?.horaAviso || HORA_AVISO_PADRAO, modelo: e.lembretes?.modelo || MODELO_LEMBRETE_PADRAO };
}
