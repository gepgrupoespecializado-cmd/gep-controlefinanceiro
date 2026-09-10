# Etapa 03 — Normalização dos dados em tabelas por entidade

Hoje toda a operação (clientes, serviços, orçamentos, agenda, financeiro, relatórios, modelos, empresa, histórico) vive dentro de um único campo `payload` na tabela `app_data`, um bloco JSON por empresa. Funciona, mas impede consulta, relatório, concorrência entre usuários e crescimento.

A Etapa 03 cria uma tabela para cada entidade, copia os dados existentes para elas e passa a gravar linha a linha, mantendo o bloco JSON atual intacto como rede de segurança.

## Princípio central: nenhuma tela é reescrita

O aplicativo continua operando sobre o estado em memória do `store.ts`, exatamente como hoje, com as mesmas funções síncronas. O que muda é apenas a camada de persistência:

```text
telas (sem alteração)
   |
store.ts (estado em memória, API síncrona — sem alteração)
   |
sync por entidade (novo)  ->  tabelas relacionais (novo)
   |
app_data.payload (mantido como espelho/fallback)
```

Ao carregar, o app lê as tabelas e monta o mesmo objeto que hoje vem do JSON. Ao gravar, um comparador detecta o que mudou (criado, alterado, removido) e envia somente as linhas afetadas. Enquanto a etapa estiver em validação, o JSON continua sendo gravado em paralelo.

## 1. Tabelas e relações

Todas em `public`, todas com `organization_id` (FK para `organizations`), `created_at`, `updated_at`, e `id uuid` preservando o ID atual do registro quando ele já for UUID (caso contrário, coluna `legacy_id text` guarda o identificador antigo e as relações passam a apontar para o novo UUID durante o backfill).

| Tabela | Campos principais | Relações |
| --- | --- | --- |
| `customers` | nome, telefone, whatsapp, email, documento, endereço completo, observações, frequência, arquivado | — |
| `services` | nome, descrição, valor, tempo estimado, arquivado | — |
| `quotes` | numero, status, prazo, observações, descrição, validade, formas de pagamento, escopo, não incluso, condições, diferencial, desconto, data/hora prevista, versão | `customer_id` -> customers |
| `quote_items` | descrição, quantidade, valor unitário, categoria, unidade, escopo, `posicao` | `quote_id` -> quotes (cascade), `service_id` -> services |
| `appointments` | título, data, hora início/fim, status, valor, responsável, endereço, recorrência, intervalo, observações, arquivado | `customer_id`, `service_id`, `quote_id`, `report_id` |
| `financial_transactions` | tipo, descrição, valor, data, categoria, pago, vencimento, origem tipo, arquivado | `origin_appointment_id`, `origin_quote_id` (colunas explícitas além de origem textual) |
| `service_reports` | numero, serviço executado, descrição, observações, status, data execução, horas, responsável, valor, campos de encerramento financeiro, assinaturas, arquivado | `appointment_id`, `customer_id`, `quote_id` |
| `report_photos` | tipo (antes/durante/depois), `url_or_data`, posicao | `report_id` -> service_reports (cascade) |
| `description_templates` | nome, conteúdo, favorito | — |
| `organization_settings` | uma linha por empresa: nome, cnpj, contatos, endereço, redes, logo, tema PDF, cores, modo mensal, custos padrão (jsonb) | PK = `organization_id` |
| `audit_logs` | entidade, entidade_id, entidade_nome, ação, campo, antes, depois, data, `user_id`, usuario (texto de exibição) | `user_id` -> auth user id |

Fotos de orçamento seguem em colunas jsonb dentro de `quotes` nesta etapa (`fotos_antes`, `fotos_depois`); fotos de relatório ganham tabela própria por serem mais numerosas. Binários (logo, fotos, assinaturas) continuam como estão hoje, sem migração de arquivos nesta etapa.

## 2. Regras de acesso

Para cada tabela: acesso liberado apenas a quem pertence à empresa dona da linha, usando a verificação de membership já existente (`is_org_member`). Leitura, criação, edição e exclusão exigem que a empresa da linha seja uma empresa do usuário. `audit_logs` permite leitura e criação, sem edição. `organization_settings` permite leitura a qualquer membro e alteração a membros gerentes. Permissões de acesso (`grant`) para o papel autenticado em todas as tabelas, sem acesso anônimo. Contadores de numeração (`organization_counters`) continuam como estão.

## 3. Ordem de migração, por módulo

Um módulo por vez, cada um validado antes do seguinte:

1. Cadastros base: clientes e serviços (sem dependências).
2. Empresa/configurações e modelos de descrição (isolados, baixo risco).
3. Orçamentos e itens de orçamento (dependem de cliente/serviço).
4. Agenda (depende de cliente, serviço, orçamento).
5. Relatórios e fotos (dependem de agenda, cliente, orçamento).
6. Financeiro (depende de origem em orçamento/agenda).
7. Histórico/auditoria (por último, passa a registrar o usuário real).

## 4. Compatibilidade com `app_data` e `store.ts`

Três fases, controladas por uma marca por empresa (`data_version` em `organization_settings`):

- Fase A — espelho: as tabelas são preenchidas pelo backfill; a leitura continua vindo do `payload`; cada gravação escreve nos dois lugares. Divergência aqui não afeta o usuário.
- Fase B — leitura relacional: a leitura passa a montar o estado a partir das tabelas; o `payload` continua sendo gravado como espelho. É a fase em que a validação acontece de fato.
- Fase C — encerramento: gravação apenas nas tabelas; o `payload` congela como último backup, sem ser apagado nesta etapa.

`store.ts` não muda de assinatura. O que hoje é "salvar o bloco inteiro" passa a chamar um sincronizador que compara o estado anterior com o novo e emite as operações mínimas por tabela. Conflito entre usuários da mesma empresa é resolvido por registro (quem gravou por último vence naquele registro), o que já é um ganho grande sobre o bloco único atual, onde uma gravação sobrescreve tudo.

## 5. Repositórios a implementar primeiro

Reaproveitando os contratos da Etapa 01: `ClienteRepository` e `ServicoRepository` primeiro, depois `EmpresaRepository` e `ModeloRepository`, em seguida `OrcamentoRepository` (com itens), `AgendamentoRepository`, `RelatorioRepository`, `LancamentoRepository` e `HistoricoRepository`. Os contratos permanecem síncronos para as telas; a versão remota é assíncrona e vive atrás do sincronizador.

## 6. Backfill e reversão

O backfill lê o `payload` da empresa e insere com `upsert` por ID: rodar duas vezes produz o mesmo resultado, sem duplicar. Registros com referência quebrada (orçamento apontando para cliente inexistente) são inseridos com a referência vazia e listados em um relatório de inconsistências, em vez de falhar a migração.

Reversão: como o `payload` continua sendo gravado até a Fase C, voltar significa apenas retornar a marca de versão para a fase anterior. Nenhuma linha precisa ser apagada. Os backups locais (`gep_db_v3`, `gep_db_v3_backup`) permanecem intocados.

## 7. Testes obrigatórios

- Integridade: contagem por entidade no JSON igual à contagem nas tabelas; totais de orçamento, financeiro e relatório idênticos antes e depois.
- Isolamento: empresa B não lê nem grava nenhuma das novas tabelas da empresa A, testado tabela por tabela.
- Concorrência: dois usuários da mesma empresa editando registros diferentes não sobrescrevem um ao outro; editando o mesmo registro, o último vence sem corromper os demais.
- Regressão: gerar PDF de orçamento e de relatório antes e depois e comparar; painel inicial, agenda, financeiro, histórico e instalação do aplicativo conferidos manualmente.
- Idempotência: backfill executado duas vezes sem duplicação.

## 8. Arquivos

Criar: migração de banco com as tabelas e regras de acesso; `src/data/remote/` com um arquivo por repositório; `src/data/sync/diff.ts` (comparador de estado); `src/data/sync/entity-sync.ts` (orquestrador); `src/data/backfill.ts`; `src/data/data-version.ts`.

Modificar: `src/data/cloud-sync.ts` (carregar das tabelas e delegar gravação ao sincronizador), `src/lib/store.ts` (apenas o ponto de persistência e o registro de auditoria com usuário real), `src/data/repositories/contracts.ts` (variantes remotas).

Sem alteração: todas as rotas/telas, `src/lib/pdf.ts`, `src/lib/relatorio-pdf.ts`, `src/domain/rules.ts`, `src/types/models.ts`.

## 9. Riscos e critérios de aceite

Riscos: IDs antigos que não sejam UUID exigem remapeamento de relações (mitigado pela coluna `legacy_id` e por mapa de conversão no backfill); relatórios com muitas fotos podem pesar na primeira carga (mitigado carregando fotos sob demanda); volume de escritas maior que hoje (mitigado por envio em lote e agrupado).

Aceite: nenhuma tela alterada visualmente; PDFs idênticos; contagens e totais conferidos; empresa B sem qualquer acesso a dados da empresa A; backfill idempotente; `payload` preservado; verificação de tipos e build sem erros.

Fora do escopo: pagamentos, planos, painel comercial, personalização de marca avançada, convites de equipe, sincronização offline.
