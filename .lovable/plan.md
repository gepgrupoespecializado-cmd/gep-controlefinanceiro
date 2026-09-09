# Etapa 01: preparar a base de dados para o modo multiempresa

Objetivo desta etapa: reorganizar internamente como o sistema guarda e calcula os dados, sem mudar nenhuma tela, nenhum cálculo e sem sair do armazenamento local. Ao final, trocar o armazenamento local por um banco online (Etapa 02) vira uma troca de peça, não uma reescrita.

## Situação atual (verificada)

Hoje tudo vive em um único arquivo (`src/lib/store.ts`, 1.333 linhas): tipos, dados iniciais, leitura/gravação no navegador, histórico de alterações, numeração de orçamentos e relatórios e as regras financeiras automáticas. As telas leem o estado inteiro com `useDB()` e chamam funções que gravam direto (`db.addCliente`, `relatorios.add`, etc.), todas síncronas. O login (`src/lib/auth.ts`) é apenas um marcador local, sem usuário real. Não existe banco, nem identificação de empresa nos registros.

Regras de negócio hoje coladas na gravação:
- receita automática quando um orçamento vira "aprovado";
- receita automática quando um agendamento vira "concluído";
- criação do próximo agendamento por recorrência ao fechar o relatório;
- relatório que conclui o agendamento e sincroniza o lançamento financeiro existente;
- numeração sequencial de orçamentos e relatórios em contador global;
- histórico/auditoria gerado dentro de cada gravação, com usuário fixo "Operador".

## O que a Etapa 01 faz

1. **Separar tipos e regras do armazenamento.** Os tipos e as tabelas de rótulos saem para arquivos próprios; as regras (receita automática, aprovação, conclusão com recorrência, numeração, sincronização financeira, auditoria) passam a ser funções puras que recebem os dados e devolvem o resultado, sem saber onde é gravado.
2. **Criar um contrato de repositório por entidade** (Cliente, Serviço, Orçamento, Agendamento, Lançamento, Relatório, Modelo, Empresa) com operações padrão: listar, buscar por id, criar, atualizar, arquivar, remover. A implementação atual continua sendo o armazenamento local.
3. **Criar uma camada de serviços** que orquestra regra + repositório. As telas passam a conversar com os serviços; o comportamento visível fica idêntico.
4. **Preparar o espaço da conta/empresa** apenas como conceito: um identificador de contexto ("qual empresa está ativa") que hoje devolve sempre um valor fixo local. Nada muda para o usuário; na Etapa 02 esse ponto vira a conta real.
5. **Preparar o caminho assíncrono** nas assinaturas das operações de escrita, para que a troca por banco remoto não exija mexer nas telas de novo.

Nada de banco remoto, regras de segurança de banco, planos, pagamentos, Kiwify, painel administrativo ou remoção do armazenamento local nesta etapa.

## Estrutura proposta

```text
src/
  types/            modelos (cliente, servico, orcamento, agenda, financeiro,
                    relatorio, modelo, empresa) e enums/rótulos
  domain/           regras puras: totais, validade, status de pagamento,
                    receita de orçamento, receita de agendamento,
                    recorrência, numeração, sincronização financeira, auditoria
  data/
    repositories/   contratos (interfaces) por entidade
    local/          implementação atual sobre o armazenamento do navegador
    context.ts      identificador da empresa ativa (fixo nesta etapa)
  services/         orçamento, agenda, financeiro, relatório, cadastro, empresa
  lib/store.ts      mantido como fachada compatível, apontando para os serviços
```

O ponto central: `src/lib/store.ts` continua existindo e exportando exatamente o que exporta hoje. As telas não precisam ser reescritas nesta etapa.

## Detalhes técnicos

- **Contrato genérico:** `Repository<T>` com `list(): Promise<T[]>`, `getById(id)`, `create(input)`, `update(id, patch)`, `archive(id, flag)`, `remove(id)`. Casos específicos: `OrcamentoRepository` e `RelatorioRepository` expõem `nextNumber()`; `EmpresaRepository` é singleton (`get()` / `save(patch)`); `HistoricoRepository` expõe `append(entry)` e `clear()`.
- **Implementação local:** um único adaptador que mantém o estado em memória, normaliza na leitura (a normalização atual é reaproveitada integralmente) e persiste com a mesma chave `gep_db_v3`. Formato do dado gravado inalterado, para não invalidar dados de quem já usa.
- **Regras puras:** funções sem efeito colateral, por exemplo `criarReceitaDeOrcamento(orcamento, cliente): Lancamento | null`, `proximoAgendamentoPorRecorrencia(agendamento, base): Agendamento | null`, `sincronizarFinanceiroRelatorio(relatorio, agendamento, lancamentoExistente): { criar?: Lancamento; atualizar?: Partial<Lancamento> }`, `diffPatch`, `montarEntradaHistorico`. Isso permite testar as regras sem tocar em armazenamento.
- **Serviços:** `orcamentoService.aprovar()`, `agendaService.concluir()`, `relatorioService.registrar()`, `financeiroService.registrar/marcarRecebido()`. Cada um chama a regra, grava pelo repositório e registra a auditoria.
- **Numeração:** hoje é um contador global no mesmo objeto. Fica isolada atrás de `nextNumber()` no repositório, porque na Etapa 02 ela precisa ser por empresa e resolvida no banco.
- **Auditoria:** passa a receber o autor como parâmetro (`usuario`), com padrão "Operador" enquanto não há login real.
- **Contexto de empresa:** `getEmpresaAtivaId()` devolve um valor local fixo; todos os repositórios já recebem esse identificador na assinatura, mesmo sem usá-lo ainda.
- **Assíncrono:** os serviços retornam `Promise`. A fachada `store.ts` mantém as funções atuais com a mesma assinatura síncrona onde as telas dependem disso, disparando a promessa internamente, para evitar mudança de comportamento.

## Arquivos

Criar: `src/types/*`, `src/domain/*`, `src/data/repositories/*`, `src/data/local/*`, `src/data/context.ts`, `src/services/*`.

Modificar: apenas `src/lib/store.ts` (vira fachada) e, se necessário, ajustes de importação de tipos em telas que importam tipos de `store`.

Não tocar nesta etapa: `pdf.ts`, `relatorio-pdf.ts`, `auth.ts`, `__root.tsx`, `login.tsx`, `config.server.ts` e todas as telas (clientes, serviços, orçamentos, agenda, financeiro, empresa, histórico, modelos).

## Riscos e como evitá-los

| Risco | Prevenção |
| --- | --- |
| Perda de dados de quem já usa o app | Manter a mesma chave e o mesmo formato gravado; nenhuma migração de dados nesta etapa |
| Receita automática duplicada | A verificação "já existe lançamento com esta origem" continua sendo condição da regra, agora testável |
| Numeração de orçamento repetida ou pulada | Numeração passa por um único ponto (`nextNumber`), nunca calculada nas telas |
| Tela deixar de atualizar após salvar | A fachada continua notificando os assinantes exatamente como hoje |
| Import circular entre serviços e fachada | Regras puras não importam serviços; a dependência é sempre em uma direção |
| Quebra silenciosa de PDF | Os geradores de PDF continuam recebendo os mesmos objetos; nenhuma alteração de campo |

Verificação ao final: build e checagem de tipos sem erro, e conferência manual dos fluxos aprovar orçamento, concluir agendamento com relatório e recorrência, e lançamento financeiro.

## Menor conjunto suficiente para habilitar a Etapa 02

1. Tipos extraídos para `src/types`.
2. Regras financeiras, de recorrência, numeração e auditoria extraídas como funções puras em `src/domain`.
3. Contratos de repositório definidos para as oito entidades.
4. Um adaptador local implementando esses contratos com o formato de dados atual.
5. `store.ts` reduzido a fachada compatível sobre os serviços.
6. Identificador de empresa ativa presente nas assinaturas, ainda fixo.

Com isso, a Etapa 02 troca somente o adaptador local por um adaptador de banco, sem tocar em telas nem em regras.
