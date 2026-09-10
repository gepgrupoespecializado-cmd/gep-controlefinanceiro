# Etapa 02: infraestrutura SaaS multiempresa

## O que já está pronto (verificado no projeto)

Parte da Etapa 02 já foi implementada em turnos anteriores e está no ar:

- login e cadastro reais por e-mail e senha, recuperação de senha, logout e entrada com Google (`src/lib/auth.ts`, `src/routes/login.tsx`, `src/routes/reset-password.tsx`);
- tabelas `organizations`, `profiles`, `user_roles` e `app_data` no banco em nuvem, todas com regras de acesso ativas e isolamento pela função `current_org_id()`;
- criação automática da empresa no primeiro acesso (`src/routes/bem-vindo.tsx`) e bloqueio das telas até existir empresa (`src/routes/__root.tsx`);
- sincronização dos dados da empresa com a nuvem (`src/data/cloud-sync.ts`), gravando o conteúdo completo do aplicativo em `app_data.payload`, uma linha por empresa;
- telas, PDFs, cálculos e PWA intactos.

Portanto esta etapa é o complemento do que falta, não um recomeço.

## O que falta e será feito

1. **Equipe da empresa (`organization_members`)** com papéis dono, administrador e membro, preparada para convidar mais usuários depois.
2. **Numeração de orçamento e relatório por empresa**, resolvida no banco e à prova de dois usuários salvando ao mesmo tempo.
3. **Migração segura dos dados locais** (`gep_db_v3`) para a nuvem, com confirmação explícita e sem apagar nada do aparelho.
4. **Espaço de arquivos na nuvem** para logo, fotos e assinaturas, criado e com permissões corretas; os arquivos continuam sendo gravados como hoje até a Etapa 03, exceto se algum quebrar por tamanho.
5. **Testes de isolamento entre duas empresas**, provando que uma nunca enxerga a outra.

## Decisão importante: como os dados operacionais ficam guardados

Hoje clientes, serviços, orçamentos, agenda, financeiro, relatórios e modelos ficam num único registro por empresa (formato JSON), já com `organization_id` e já isolado por empresa. A alternativa seria criar uma tabela para cada entidade.

Recomendação: **manter o registro único por empresa nesta etapa**. Motivos: o aplicativo inteiro lê o estado completo de forma imediata; quebrar em tabelas obriga a reescrever todas as telas, todos os cálculos automáticos e a auditoria, com alto risco de regressão e custo muito maior. O isolamento entre empresas, que é o requisito de segurança, já está garantido do mesmo jeito nas duas opções.

O que muda com essa escolha: a numeração sai do JSON e vai para uma tabela própria (item 2), porque essa é a única parte que realmente sofre com dois usuários simultâneos. A quebra em tabelas por entidade fica planejada como Etapa 03, quando houver mais de um usuário por empresa usando ao mesmo tempo.

## Detalhes técnicos

### Banco

`organization_members`
- `organization_id`, `user_id`, `role` (enum `org_role`: owner, admin, member), datas de criação/atualização, chave única por par empresa+usuário;
- grants para `authenticated` e `service_role`; RLS ligada;
- função `is_org_member(_org uuid)` e `has_org_role(_org uuid, _role org_role)` em `security definer` para evitar recursão nas policies;
- leitura: membros da própria empresa; escrita: apenas owner/admin da empresa.

`organization_counters`
- `organization_id`, `tipo` (orcamento | relatorio), `proximo integer`, chave primária composta;
- função `next_number(_tipo text) returns integer` em `security definer`, que faz `insert ... on conflict do update set proximo = proximo + 1 returning`, resolvendo o número atomicamente para a empresa do chamador;
- grants + RLS iguais aos demais.

`current_org_id()` passa a resolver pela participação em `organization_members`, com o `profiles.organization_id` como reserva, para não quebrar contas já criadas.

Retrocompatibilidade: uma migração popula `organization_members` com o dono de cada empresa existente e `organization_counters` com os contadores atuais lidos do JSON.

### Aplicação

- `src/data/context.ts`: passa a expor a empresa ativa real e o papel do usuário.
- `src/data/cloud-sync.ts`: ganha a consulta do papel e um modo de migração; deixa de considerar os dados locais como envio automático.
- Novo `src/data/numbering.ts`: chama `next_number` e devolve o número; `src/lib/store.ts` usa esse número ao criar orçamento e relatório, mantendo o contador local apenas como reserva quando offline.
- Novo `src/routes/migrar-dados.tsx`: tela de confirmação da migração (mostra quantos clientes, orçamentos, agendamentos e lançamentos serão enviados, botões Importar e Começar do zero).
- `src/routes/bem-vindo.tsx`: cria empresa, perfil e registro de dono em `organization_members`; se houver dados locais, encaminha para a tela de migração.
- `src/routes/__root.tsx`: inclui a tela de migração entre as rotas permitidas.
- Nova `src/routes/equipe.tsx` (lista de membros e papéis, somente leitura nesta etapa) e item na barra lateral.
- Armazenamento: criar os espaços `logos`, `fotos` e `assinaturas`, privados, com regras que permitem ler e gravar apenas dentro da pasta da própria empresa.

### Migração dos dados locais

Regra: o conteúdo do aparelho **nunca é apagado** nesta etapa.

1. Ao entrar com empresa já definida, o sistema compara o que existe na nuvem com o que existe no aparelho.
2. Nuvem vazia e aparelho com dados: abre a tela de migração pedindo confirmação.
3. Confirmado: envia o conteúdo, grava a marca `gep_db_migrado` com data e identificador da empresa, e mantém uma cópia local em `gep_db_v3_backup`.
4. Recusado: começa vazio na nuvem, mantendo o conteúdo local intocado.
5. Nuvem com dados: a nuvem sempre vence; nada do aparelho é enviado automaticamente.
6. Aparelho já marcado para outra empresa: começa limpo, sem misturar contas.

## Ordem de implementação

1. Migração de banco: `org_role`, `organization_members`, `organization_counters`, funções, grants, RLS, backfill dos dados existentes.
2. Ajuste de `current_org_id()` e verificação com o analisador de segurança.
3. Numeração via banco no store, com reserva local.
4. Tela e lógica de migração confirmada dos dados locais.
5. Onboarding gravando o dono em `organization_members`.
6. Tela de equipe e item na barra lateral.
7. Espaços de arquivos e suas regras de acesso.
8. Testes de isolamento A/B, verificação de tipos e build.

## Testes obrigatórios

- Conta A cria cliente, orçamento e lançamento; conta B (outra empresa) entra e não vê nada disso, nem por leitura direta do banco.
- Conta B tenta gravar usando o identificador da empresa A: a gravação é recusada.
- Dois pedidos simultâneos de número de orçamento na mesma empresa devolvem números diferentes.
- Empresas diferentes começam a numeração de forma independente.
- Migração: importar, recusar, entrar de novo (não repete), trocar de conta no mesmo aparelho.
- Orçamento e relatório em PDF continuam idênticos; instalação do aplicativo continua funcionando.

## Riscos

| Risco | Prevenção |
| --- | --- |
| Contas já criadas ficarem sem empresa após mudar `current_org_id()` | Backfill na mesma migração e reserva pelo perfil |
| Número de orçamento duplicado no modo offline | Reserva local marcada como provisória e reconciliada ao voltar a conexão |
| Perda de dados do aparelho | Nada é apagado; cópia de segurança local e marca de migração |
| Regras de acesso em recursão | Verificações sempre por função `security definer` |
| Fotos grandes estourando o registro JSON | Medir o tamanho do registro no teste; se passar do limite seguro, antecipar o envio das imagens para o espaço de arquivos |
| Aviso do analisador sobre funções `security definer` | Continua sendo intencional, necessário para as regras de acesso |

## Fora desta etapa

Kiwify, pagamentos, planos, teste gratuito, painel comercial, personalização de marca avançada e sincronização offline elaborada. A quebra dos dados operacionais em tabelas por entidade fica para a Etapa 03.
