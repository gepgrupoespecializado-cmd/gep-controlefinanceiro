import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  itens: string[];
  onChange: (itens: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  /** Sugestões clicáveis para inserir rapidamente. */
  sugestoes?: string[];
};

/** Editor de listas de texto: adicionar, editar, remover e reordenar itens. */
export function ListaEditavel({ itens, onChange, placeholder, addLabel = "Adicionar item", sugestoes }: Props) {
  const [novo, setNovo] = useState("");

  function add(texto: string) {
    const t = texto.trim();
    if (!t) return;
    onChange([...itens, t]);
    setNovo("");
  }
  function mover(idx: number, dir: -1 | 1) {
    const destino = idx + dir;
    if (destino < 0 || destino >= itens.length) return;
    const copia = [...itens];
    const [item] = copia.splice(idx, 1);
    copia.splice(destino, 0, item);
    onChange(copia);
  }

  return (
    <div className="space-y-2">
      {itens.length > 0 && (
        <div className="space-y-1.5">
          {itens.map((item, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_auto] gap-1.5">
              <Input
                value={item}
                onChange={(e) => onChange(itens.map((x, i) => (i === idx ? e.target.value : x)))}
                className="h-9 text-sm"
              />
              <div className="flex items-center">
                <Button type="button" variant="ghost" size="icon" className="h-9 w-8" onClick={() => mover(idx, -1)} disabled={idx === 0} aria-label="Mover para cima">
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-8" onClick={() => mover(idx, 1)} disabled={idx === itens.length - 1} aria-label="Mover para baixo">
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-8" onClick={() => onChange(itens.filter((_, i) => i !== idx))} aria-label="Remover">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-[1fr_auto] gap-1.5">
        <Input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(novo); } }}
          placeholder={placeholder}
          className="h-9 text-sm"
        />
        <Button type="button" size="sm" variant="outline" onClick={() => add(novo)}>
          <Plus className="h-3.5 w-3.5" />{addLabel}
        </Button>
      </div>

      {sugestoes && sugestoes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sugestoes.filter((s) => !itens.includes(s)).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-dashed px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
