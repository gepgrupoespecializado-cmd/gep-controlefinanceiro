import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calculator, Plus, Send, Trash2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brl } from "@/lib/format";
import { useDB } from "@/lib/store";

export const Route = createFileRoute("/precificacao")({
  head: () => ({ meta: [
    { title: "Calculadora de Precificação — Gestão de Serviços" },
    { name: "description", content: "Calculadora de Precificação da sua empresa no aplicativo de gestão de serviços." },
    { property: "og:title", content: "Calculadora de Precificação — Gestão de Serviços" },
    { property: "og:description", content: "Calculadora de Precificação da sua empresa no aplicativo de gestão de serviços." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PrecificacaoPage,
});

const DRAFT_KEY = "gep_precificacao_draft";

function PrecificacaoPage() {
  const navigate = useNavigate();
  const data = useDB();
  const padrao = data.empresa.custosPadrao ?? {};
  const [titulo, setTitulo] = useState("");
  const [areaM2, setAreaM2] = useState(0);
  const [tempoEstimado, setTempoEstimado] = useState(0);
  const [maoObra, setMaoObra] = useState(padrao.valorHora ?? 0);
  const [funcionarios, setFuncionarios] = useState(1);
  const [horas, setHoras] = useState(1);
  const [materiais, setMateriais] = useState<{ nome: string; qtd: number; valor: number }[]>([
    { nome: "", qtd: 1, valor: 0 },
  ]);
  const [deslocamento, setDeslocamento] = useState(0);
  const [kmRodados, setKmRodados] = useState(0);
  const [combustivel, setCombustivel] = useState(0);
  const [pedagio, setPedagio] = useState(0);
  const [estacionamento, setEstacionamento] = useState(0);
  const [operacional, setOperacional] = useState(padrao.custoOperacionalMensal ? Number((padrao.custoOperacionalMensal / 30).toFixed(2)) : 0);
  const [alimentacao, setAlimentacao] = useState(0);
  const [hospedagem, setHospedagem] = useState(0);
  const [impostos, setImpostos] = useState(padrao.imposto ?? 0);
  const [taxaCartao, setTaxaCartao] = useState(padrao.taxaCartao ?? 0);
  const [lucro, setLucro] = useState(padrao.margemLucro ?? 30);

  const valorKm = padrao.valorKm ?? 0;
  const minimo = padrao.valorMinimoAtendimento ?? 0;

  const calc = useMemo(() => {
    const custoMaoObra = maoObra * funcionarios * horas;
    const custoMateriais = materiais.reduce((s, m) => s + (Number(m.qtd) || 0) * (Number(m.valor) || 0), 0);
    const custoKm = kmRodados * valorKm;
    const custoDeslocamento = deslocamento + combustivel + pedagio + estacionamento + custoKm;
    const custoBase = custoMaoObra + custoMateriais + custoDeslocamento + operacional + alimentacao + hospedagem;
    const custo = custoBase * (1 + impostos / 100) * (1 + taxaCartao / 100);
    const valorFinal = custo * (1 + lucro / 100);
    const aplicarMinimo = Math.max(valorFinal, minimo);
    const lucroValor = aplicarMinimo - custo;
    const margem = aplicarMinimo > 0 ? (lucroValor / aplicarMinimo) * 100 : 0;
    const valorM2 = areaM2 > 0 ? aplicarMinimo / areaM2 : 0;
    return { custoMaoObra, custoMateriais, custoDeslocamento, custo, valorFinal: aplicarMinimo, lucroValor, margem, valorM2 };
  }, [maoObra, funcionarios, horas, materiais, kmRodados, valorKm, deslocamento, combustivel, pedagio, estacionamento, operacional, alimentacao, hospedagem, impostos, taxaCartao, areaM2, lucro, minimo]);
  const { custoMaoObra, custoMateriais, custoDeslocamento, custo, valorFinal, lucroValor, margem, valorM2 } = calc;

  function gerarOrcamento() {
    const draft = {
      descricao: titulo || "Serviço calculado" + (areaM2 ? ` — ${areaM2} m²` : ""),
      quantidade: 1,
      valorUnit: Number(valorFinal.toFixed(2)),
      detalhes: {
        custo, lucro: lucroValor, margem,
      },
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    navigate({ to: "/orcamentos" });
  }

  function addMaterial() {
    setMateriais([...materiais, { nome: "", qtd: 1, valor: 0 }]);
  }
  function delMaterial(i: number) {
    setMateriais(materiais.filter((_, j) => j !== i));
  }
  function setMaterial(i: number, patch: Partial<{ nome: string; qtd: number; valor: number }>) {
    setMateriais(materiais.map((m, j) => j === i ? { ...m, ...patch } : m));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Calculadora de Precificação
          </h1>
          <p className="text-xs text-muted-foreground">Calcule o preço justo com mão de obra, materiais, deslocamento, impostos e lucro.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/empresa"><Settings2 className="h-4 w-4" />Configuração de Custos</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Descrição do serviço</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="ex: Limpeza de vidros fachada 120m²" />
            </div>

            <p className="text-xs font-semibold text-primary pt-2">Dimensionamento</p>
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Área (m²)" value={areaM2} onChange={setAreaM2} step={1} />
              <Campo label="Tempo estimado (horas totais)" value={tempoEstimado} onChange={setTempoEstimado} step={0.5} />
            </div>

            <p className="text-xs font-semibold text-primary pt-2">Mão de obra</p>
            <div className="grid grid-cols-3 gap-2">
              <Campo label="Valor hora (R$)" value={maoObra} onChange={setMaoObra} />
              <Campo label="Funcionários" value={funcionarios} onChange={setFuncionarios} step={1} />
              <Campo label="Horas por profissional" value={horas} onChange={setHoras} step={0.5} />
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs font-semibold text-primary">Produtos, Equipamentos, Ferramentas e EPIs</p>
              <Button type="button" size="sm" variant="outline" onClick={addMaterial}>
                <Plus className="h-3.5 w-3.5" />Adicionar item
              </Button>
            </div>
            <div className="space-y-2">
              {materiais.map((m, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_110px_auto] gap-2 items-end">
                  <div className="grid gap-1"><Label className="text-[10px]">Descrição</Label>
                    <Input value={m.nome} onChange={(e) => setMaterial(i, { nome: e.target.value })} placeholder="ex: detergente neutro" />
                  </div>
                  <div className="grid gap-1"><Label className="text-[10px]">Qtd</Label>
                    <Input type="number" step={1} min={0} value={m.qtd} onChange={(e) => setMaterial(i, { qtd: Number(e.target.value) || 0 })} />
                  </div>
                  <div className="grid gap-1"><Label className="text-[10px]">Valor unit (R$)</Label>
                    <Input type="number" step={0.01} min={0} value={m.valor} onChange={(e) => setMaterial(i, { valor: Number(e.target.value) || 0 })} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => delMaterial(i)} title="Remover">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">
                Subtotal materiais: <b>{brl(custoMateriais)}</b>
              </p>
            </div>

            <p className="text-xs font-semibold text-primary pt-2">Deslocamento</p>
            <div className="grid grid-cols-3 gap-2">
              <Campo label={`Quilometragem${valorKm ? ` (× ${brl(valorKm)}/km)` : ""}`} value={kmRodados} onChange={setKmRodados} step={1} />
              <Campo label="Combustível (R$)" value={combustivel} onChange={setCombustivel} />
              <Campo label="Pedágio (R$)" value={pedagio} onChange={setPedagio} />
              <Campo label="Estacionamento (R$)" value={estacionamento} onChange={setEstacionamento} />
              <Campo label="Outros deslocamentos (R$)" value={deslocamento} onChange={setDeslocamento} />
            </div>

            <p className="text-xs font-semibold text-primary pt-2">Operacional</p>
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Alimentação (R$)" value={alimentacao} onChange={setAlimentacao} />
              <Campo label="Hospedagem (R$)" value={hospedagem} onChange={setHospedagem} />
              <Campo label="Custos operacionais — rateio (R$)" value={operacional} onChange={setOperacional} />
              <Campo label="Impostos / Simples (%)" value={impostos} onChange={setImpostos} step={0.5} />
              <Campo label="Taxa do cartão (%)" value={taxaCartao} onChange={setTaxaCartao} step={0.5} />
              <Campo label="Lucro desejado (%)" value={lucro} onChange={setLucro} step={1} />
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2">
              <span className="text-[11px] text-muted-foreground self-center mr-1">Margem rápida:</span>
              {[20, 30, 40, 50].map((p) => (
                <Button key={p} type="button" size="sm" variant={lucro === p ? "default" : "outline"} className="h-7 text-xs" onClick={() => setLucro(p)}>{p}%</Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary to-[var(--primary-glow,#1e40af)] text-white shadow-lg">
          <CardContent className="p-5 space-y-3">
            <p className="text-xs uppercase tracking-wider opacity-80">Resultado</p>
            <Linha label="Mão de obra" valor={brl(custoMaoObra)} />
            <Linha label="Materiais / EPIs" valor={brl(custoMateriais)} />
            <Linha label="Deslocamento total" valor={brl(custoDeslocamento)} />
            <Linha label="Custo total" valor={brl(custo)} />
            <Linha label="Lucro estimado" valor={brl(lucroValor)} />
            <Linha label="Margem de lucro" valor={`${margem.toFixed(1)}%`} />
            {valorM2 > 0 && <Linha label="Preço por m²" valor={brl(valorM2)} />}
            {minimo > 0 && valorFinal === minimo && (
              <p className="text-[11px] opacity-80">Valor mínimo de atendimento aplicado.</p>
            )}
            <div className="border-t border-white/30 pt-3">
              <p className="text-xs opacity-80">Valor final sugerido</p>
              <p className="text-3xl font-black tabular-nums">{brl(valorFinal)}</p>
            </div>
            <Button
              size="lg" onClick={gerarOrcamento}
              className="w-full bg-white text-primary hover:bg-white/90 font-bold"
              disabled={valorFinal <= 0}
            >
              <Send className="h-4 w-4" />Gerar Orçamento
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Campo({ label, value, onChange, step = 0.01 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm opacity-90">{label}</span>
      <span className="font-bold tabular-nums">{valor}</span>
    </div>
  );
}