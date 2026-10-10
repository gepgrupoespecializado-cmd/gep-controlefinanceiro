# Numeração sequencial e fotos menores

## Diagnóstico confirmado
- O número está em `quotes.numero`. O código não usa aleatoriedade para esse número: reserva antecipadamente números pelo contador remoto, inclusive ao entrar no aplicativo e reabastecer o lote. Essas reservas podem consumir números sem salvar orçamento. UUIDs identificam registros e serão preservados.
- Há oito orçamentos no banco. O maior número de uma empresa é 402; na outra, 7. Serão preservados, com próximos números 403 e 8, respectivamente.
- Fotos de orçamento são convertidas para JPEG com limite de 1200 px e qualidade 0,82; as de relatório usam largura de 1280 px e qualidade 0,7.

## 1. Numeração
- Atribuir o número definitivo somente na inserção confirmada no banco, sem reservas antecipadas para orçamentos. Manter a numeração de relatórios intacta.
- Criar função e trigger restritos a `quotes`, com bloqueio transacional por empresa e geração a partir do maior número existente. Falhas de inserção não consumirão números; concorrência e repetição da mesma gravação não criarão duplicações.
- Preservar números existentes, inclusive registros antigos que ainda precisem ser sincronizados. Edição conserva o número; duplicação recebe outro.
- Devolver o número confirmado ao estado local e à sincronização, sem perder alterações pendentes ou permitir que um número provisório sobrescreva o definitivo nas fases A/B/C.
- Usar quatro dígitos mínimos na lista, tela, PDF e referências ao orçamento: `0001`, `0002`, sem truncar números maiores. Não alterar prefixos e demais textos além da formatação numérica solicitada.
- Sem conexão, conservar o conteúdo pendente, mas não inventar nem confirmar um número definitivo antes de salvar no banco.

## 2. Fotos
- Comprimir somente imagens recém-selecionadas em orçamentos e relatórios, antes da persistência: canvas, largura máxima de 1024 px, proporção preservada e JPEG de qualidade 0,7.
- Medir o arquivo resultante e reduzir progressivamente as dimensões, mantendo qualidade 0,7, quando necessário para atingir aproximadamente 300 KB.
- Manter fotos já salvas sem recompressão. Preservar o armazenamento atual, sem introduzir outro fluxo de upload.
- Restringir imagens à largura disponível, com recorte proporcional e altura fixa nas miniaturas. Nos PDFs, aplicar o equivalente em caixas de imagem, sem distorção e sem modificar o restante do documento.

## Detalhes técnicos e arquivos previstos
- Migração SQL: função e triggers em `quotes`, sem tabelas novas, alterações em outras tabelas ou mudanças nas políticas RLS. A função deve validar acesso à empresa antes de calcular seu número.
- `src/data/numbering.ts`, `src/lib/store.ts`, `src/data/remote/relational-sync.ts` e, somente onde necessário, `src/data/cloud-sync.ts` e `src/data/remote/mappers.ts`: eliminar reservas de orçamento e reconciliar o número atribuído pelo banco com as gravações locais.
- `src/lib/format.ts`, `src/routes/orcamentos.tsx`, `src/lib/pdf.ts` e referências de orçamento identificadas em outras telas: quatro dígitos sem mudar a numeração de relatórios.
- `src/components/relatorio-dialog.tsx`, `src/routes/orcamentos.tsx` e geradores de PDF: compressão e limites das fotos; um pequeno utilitário compartilhado apenas se necessário para evitar duplicar esse processamento.
- Testes focados na numeração, sincronização e compressão; regras de arquitetura atualizadas apenas se a implementação exigir.

## Validação e limites
- Verificar criação simultânea na mesma empresa, sequências independentes, edição, duplicação, falha/repetição de gravação e preservação dos números anteriores.
- Verificar dimensões, tamanho e qualidade de novas fotos, preservação das antigas e apresentação no orçamento/PDF.
- Não renumerar, apagar ou usar dados reais para testes de escrita. Não publicar, refatorar telas ou executar outra etapa.
- Ao concluir a implementação, responder em três linhas: numeração, fotos e arquivos alterados.