# Atualização Master — Controle de Prestação de Serviços GEP

Entrega única, profissional, pronta para comercialização. 4 blocos integrados.

## 1. PDF Profissional (correção definitiva)

**Arquivos:** `src/lib/pdf.ts`, `src/lib/relatorio-pdf.ts`, `src/components/pdf-preview-dialog.tsx`, `src/components/relatorio-dialog.tsx`

- **Página única inteligente:** medir altura do conteúdo antes de desenhar; aplicar escala automática de espaçamentos (line-height, paddings) para caber em 1 página A4 sempre que possível. Quando ultrapassar, paginar limpo com mini-header.
- **Tipografia padronizada:** Título 16 · Subtítulo 13 · Conteúdo 12 · Rodapé 10 (substitui os 18-22 atuais que causam quebras).
- **Compatibilidade total:** A4, Android, Web, WhatsApp e WhatsApp Business (Blob com `type:"application/pdf"`, nome de arquivo curto sem caracteres especiais).
- **Fotos opcionais** com grid 2 colunas e rótulos automáticos **ANTES | DEPOIS**, alta qualidade (compressão FAST + tamanho proporcional).
- **Assinaturas opcionais:** remover validação obrigatória em `relatorio-dialog.tsx`.
- **Compartilhamento automático (📤 Enviar Orçamento):**
  - Tenta `navigator.share({ files: [pdfFile], title, text })` → abre seletor nativo (WhatsApp anexa o PDF direto, sem download).
  - Fallback: salva PDF via `doc.save()` e abre `https://wa.me/<telefone>?text=<msg>` com cliente pré-selecionado e mensagem pronta.

## 2. Agenda Inteligente PT-BR

**Arquivo:** `src/routes/agenda.tsx`

- Locale **pt-BR** em todos os meses, dias e datas (`toLocaleDateString("pt-BR")`, `Intl.DateTimeFormat`).
- **Cores por tipo de cliente:** 🟢 Semanal · 🔵 Quinzenal · 🟠 Mensal · 🟣 Trimestral · ⚫ Avulso (legenda visível).
- **Status com cor:** 🟡 Agendado · 🔵 Confirmado · 🟢 Concluído · 🔴 Cancelado · ⚠️ Aguardando.
- **Card mostra:** Cliente · Serviço · Data · Horário · Valor · Status.
- **4 visualizações em tabs:** Diária / Semanal / Mensal / Lista.
- **Busca inteligente** por: cliente, bairro, cidade, serviço, data, status.
- **Alertas no topo:** Hoje · Amanhã · Recorrentes · Retornos programados · Atrasados.
- **Retorno automático:** ao marcar serviço como Concluído, dialog sugere retorno (semanal/quinzenal/mensal/trimestral) com confirmação em 1 clique → cria novo agendamento.

## 3. Precificação Inteligente

**Arquivos:** `src/routes/precificacao.tsx` (rework), `src/routes/index.tsx` (card destacado), `src/routes/empresa.tsx` (config custos), `src/lib/store.ts` (campos novos em `Empresa`).

- **Card destacado** 🧮 na home, entre as funções principais.
- Layout em blocos: Mão de Obra · Tempo · Deslocamento (km/combustível/pedágio/estacionamento) · **Produtos & Materiais (lista ilimitada com ➕/➖)** · Custos Operacionais (água/energia/internet/telefone/marketing/admin/contábil/outros) · Impostos (Simples/banco/cartão/outras) · Lucro (presets 20/30/40/50%).
- **⚙️ Configuração de Custos da Empresa** em `empresa.tsx`: valor hora padrão, % lucro, taxa cartão, custo operacional mensal, km padrão, valor mínimo de atendimento. Auto-preenche cálculos.
- Resultado: Mão de Obra · Produtos · Operacional · Impostos · Lucro · **Valor Final Sugerido**.
- 📄 **Gerar Orçamento:** já transfere via `sessionStorage` para `/orcamentos` (mantido + descrição e valor preenchidos).

## 4. Identidade Visual GEP

- Renomear sistema em toda a UI, PDFs e meta tags para **CONTROLE DE PRESTAÇÃO DE SERVIÇOS GEP**.
- Logo da empresa (`empresa.logoDataUrl`) exibida em: Home, Sidebar, Orçamentos, Relatórios, PDFs.
- `public/manifest.webmanifest`: nome e short_name atualizados.
- `__root.tsx`: meta title atualizado.
- Administrador pode trocar logo via `/empresa` (já existente).

## Notas técnicas

- Sem novas dependências (jspdf + Web Share + Intl pt-BR).
- Schema `Empresa` ganha: `custosPadrao?: { valorHora; percentualLucro; taxaCartao; custoOperacionalMensal; kmPadrao; valorMinimo }`.
- Schema `Cliente.tipo` já existe — reutilizado para as cores da agenda.
- Mantém arquitetura offline-first (IndexedDB/Dexie) intacta.
- Corrige também o erro React #419 (hydration/Suspense no preview).

Aprove para implementar tudo de uma vez.
