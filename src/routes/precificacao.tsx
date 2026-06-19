import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calculator, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/precificacao")({
  head: () => ({ meta: [{ title: "Calculadora de Precificação — GEP Controle" }] }),
  component: PrecificacaoPage,
});

const DRAFT_KEY = "gep_precificacao_draft";

function PrecificacaoPage() {
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState("");
  const [maoObra, setMaoObra] = useState(0);
  const [funcionarios, setFuncionarios] = useState(1);
  const [horas, setHoras] = useState(1);
  const [material, setMaterial] = useState(0);
  const [deslocamento, setDeslocamento] = useState(0);
  const [operacional, setOperacional] = useState(0);
  const [alimentacao, setAlimentacao] = useState(0);
  const [equipamentos, setEquipamentos] = useState(0);
  const [lucro, setLucro] = useState(30);

  const { custo, valorFinal, lucroValor, margem } = useMemo(() => {
    const custoMaoObra = maoObra * funcionarios * horas;
    const custo = custoMaoObra + material + deslocamento + operacional + alimentacao + equipamentos;
    const valorFinal = custo * (1 + lucro / 100);
    const lucroValor = valorFinal - custo;
    const margem = valorFinal > 0 ? (lucroValor / valorFinal) * 100 : 0;
    return { custo, valorFinal, lucroValor, margem };
  }, [maoObra, funcionarios, horas, material, deslocamento, operacional, alimentacao, equipamentos, lucro]);

  function gerarOrcamento() {
    const draft = {
      descricao: titulo || "Serviço calculado",
      quantidade: 1,
      valorUnit: Number(valorFinal.toFixed(2)),
      detalhes: {
        custo, lucro: lucroValor, margem,
      },
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    navigate({ to: "/orcamentos" });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          Calculadora de Precificação
        </h1>
        <p className="text-xs text-muted-foreground">Calcule o preço justo do serviço com custos, lucro e margem.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Descrição do serviço</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="ex: Limpeza pós-obra apartamento 80m²" />
            </div>

            <p className="text-xs font-semibold text-primary pt-2">Mão de obra</p>
            <div className="grid grid-cols-3 gap-2">
              <Campo label="Valor hora (R$)" value={maoObra} onChange={setMaoObra} />
              <Campo label="Funcionários" value={funcionarios} onChange={setFuncionarios} step={1} />
              <Campo label="Horas de trabalho" value={horas} onChange={setHoras} step={0.5} />
            </div>

            <p className="text-xs font-semibold text-primary pt-2">Custos diretos</p>
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Material utilizado (R$)" value={material} onChange={setMaterial} />
              <Campo label="Deslocamento (R$)" value={deslocamento} onChange={setDeslocamento} />
              <Campo label="Alimentação (R$)" value={alimentacao} onChange={setAlimentacao} />
              <Campo label="Equipamentos (R$)" value={equipamentos} onChange={setEquipamentos} />
              <Campo label="Custos operacionais (R$)" value={operacional} onChange={setOperacional} />
              <Campo label="Lucro desejado (%)" value={lucro} onChange={setLucro} step={1} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary to-[var(--primary-glow,#1e40af)] text-white shadow-lg">
          <CardContent className="p-5 space-y-3">
            <p className="text-xs uppercase tracking-wider opacity-80">Resultado</p>
            <Linha label="Custo total" valor={brl(custo)} />
            <Linha label="Lucro estimado" valor={brl(lucroValor)} />
            <Linha label="Margem de lucro" valor={`${margem.toFixed(1)}%`} />
            <div className="border-t border-white/30 pt-3">
              <p className="text-xs opacity-80">Valor final sugerido</p>
              <p className="text-3xl font-black tabular-nums">{brl(valorFinal)}</p>
            </div>
            <Button
              size="lg" onClick={gerarOrcamento}
              className="w-full bg-white text-primary hover:bg-white/90 font-bold"
              disabled={valorFinal <= 0}
            >
              <Send className="h-4 w-4" />Gerar orçamento automaticamente
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