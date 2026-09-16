# Plano de integração incremental C1

## Objetivo e limites

Preparar a incorporação segura das melhorias desenvolvidas externamente, preservando integralmente a versão publicada até que cada bloco seja validado, autorizado, integrado, testado e monitorado isoladamente.

Nesta etapa não haverá alteração de código, publicação, banco de dados, migrations, dados, autenticação ou configuração. C1, C1-E e C1-F não serão implementadas agora, e C2 permanecerá fora do processo.

O checkout atual não contém a branch `codex-preparação`. Portanto, arquivos afetados, dependências e impacto exato só poderão ser fechados quando o commit ou diff imutável de cada bloco estiver disponível.

## Estrutura recomendada das publicações

```text
versão publicada atual preservada
              |
              v
C1 concluída e validada externamente
              |
              v
autorização "C1 APROVADA PARA INTEGRAÇÃO"
              |
              v
auditoria do diff + plano exato de integração e rollback
              |
              v
segunda autorização explícita para executar
              |
              v
integração controlada em ambiente de prévia
              |
              v
validação automatizada + navegador real + celular/PWA
              |
              v
ponto de restauração imutável da C1
              |
              v
publicação isolada da C1
              |
              v
monitoramento e aceite
              |
              v
próximo bloco independente
```

Cada publicação deve conter somente um bloco aprovado. Uma falha em qualquer portão interrompe o processo sem afetar a versão publicada.

## Ordem dos blocos e decisão de empacotamento

1. **C1**: concluir sua validação externa, especialmente a sessão interrompida no navegador real. Não integrar ainda.
2. **C1-E**: concluir como extensão/correção da C1, preservando a rastreabilidade do seu diff. Não há obrigação de publicação independente.
3. **C1-F**: manter bloqueada até aprovação formal; depois, concluir sua validação e preservar a rastreabilidade do seu diff. Não há obrigação de publicação independente.
4. **Auditoria consolidada C1 + C1-E + C1-F**: após a conclusão da C1-F, analisar os três diffs em conjunto, suas dependências e os estados intermediários que cada separação criaria.
5. **Decisão técnica de integração**:
   - formar um único pacote atômico de segurança C1 quando as extensões corrigirem invariantes compartilhados, dependerem da mesma alteração ou tornarem qualquer estado intermediário inseguro;
   - permitir integração separada somente quando cada parte for funcionalmente completa, reversível, testável e segura por conta própria, sem relaxar autenticação, isolamento multiempresa, regras de acesso, sincronização ou cache;
   - documentar a justificativa e a ordem escolhida antes de qualquer execução.
6. **C2**: permanecer totalmente separado e bloqueado até o encerramento, publicação, monitoramento e ponto de restauração definitivo do pacote C1. Nunca agrupar C1 com C2.

## Portão anterior a cada integração

Antes de alterar arquivos:

1. Fixar os commits de origem e obter os diffs completos de C1, C1-E e C1-F, sem depender de uma branch mutável.
2. Listar arquivos criados, alterados e removidos em cada diff; identificar sobreposições e alterações que só funcionam quando aplicadas em conjunto.
3. Mapear dependências de código, pacotes, ordem de aplicação e invariantes de segurança compartilhados.
4. Comparar qualquer impacto em banco, migrations, autenticação, isolamento multiempresa e regras de acesso.
5. Revisar sincronização A/B/C, preservação de `app_data`, dados locais e backups.
6. Revisar rotas, redirecionamentos, inicialização e recuperação de erros.
7. Revisar Service Worker, nome e invalidação de cache, instalação e atualização do PWA.
8. Verificar compatibilidade com a versão publicada, simular cada estado intermediário proposto e definir o procedimento de rollback do pacote resultante.
9. Se o diff exigir schema ou migration, interromper e apresentar um plano específico antes de qualquer aplicação.
10. Apresentar a recomendação fundamentada entre pacote atômico e integração separada, com arquivos, impacto, riscos, sequência, testes e rollback; aguardar uma segunda autorização explícita para executar.

## Validação da C1

### Automatizada

- Executar os testes existentes de fase e leitura relacional, preservando toda a suíte anterior.
- Acrescentar somente testes necessários às alterações reais da C1.
- Executar verificação TypeScript, lint relevante e build de produção.
- Confirmar que nenhuma migration, dado ou configuração foi alterado quando isso não fizer parte do bloco aprovado.

### Navegador real e navegação

- Login e logout completos, recarregamento direto e retorno à página inicial.
- Ausência de tela presa em carregamento, recuperação repetitiva ou atualização de estado antes da montagem.
- Navegação pelas áreas principais e redirecionamentos públicos/protegidos.
- Validação em desktop e celular, incluindo uma sessão nova e uma sessão já existente.

### Empresa e sincronização

- Usuário acessa somente a própria empresa.
- Leitura e gravação permanecem isoladas entre empresas.
- Fases A, B e C respeitam seus bloqueios, fallback e rollback existentes.
- Nenhuma promoção de fase é forçada e nenhum dado de negócio é usado como teste destrutivo.
- Contagens e totais permanecem iguais antes e depois da integração.

### PWA e cache

- Instalação e abertura pelo ícone continuam funcionando.
- Atualização do Service Worker não mantém arquivos antigos incompatíveis.
- Testar primeira visita, atualização com cache existente, recarga e comportamento offline previsto.
- Confirmar que a publicação nova aparece sem exigir limpeza manual dos dados do usuário.

### Compatibilidade funcional

- Clientes, serviços, orçamentos, agenda, financeiro, relatórios e histórico abrem sem regressão.
- PDFs de orçamento e relatório mantêm conteúdo, paginação e compartilhamento esperados.
- Dados locais, backups e conteúdo remoto permanecem intactos.

## Critérios de aprovação

A C1, em pacote atômico ou partes tecnicamente independentes, somente poderá ser publicada quando:

- os commits de origem e os diffs individuais e consolidado estiverem congelados e auditados;
- as validações finais de C1, C1-E e C1-F em navegador real estiverem concluídas;
- a análise demonstrar que o formato escolhido não cria estado intermediário inseguro;
- testes, TypeScript e build passarem sem regressão;
- autenticação, isolamento multiempresa, sincronização, navegação e PWA passarem nos cenários definidos;
- não houver alteração não autorizada de banco, dados ou migrations;
- o rollback estiver documentado e praticável;
- existir um ponto de restauração imutável anterior à integração e outro identificando o pacote C1 aprovado;
- houver autorização explícita para publicar após a validação da prévia.

## Estratégia de rollback

1. Registrar a revisão publicada atual como base imutável antes da integração.
2. Preservar o pacote original da C1 e o diff efetivamente integrado.
3. Não misturar mudanças irreversíveis de dados com a publicação de código. Se surgirem, criar plano e autorização separados.
4. Em regressão na prévia, abandonar o bloco e manter produção intocada.
5. Em regressão após publicação, republicar imediatamente a revisão anterior, sem editar dados de negócio.
6. Invalidar somente o cache da versão defeituosa, preservando armazenamento local e backups.
7. Confirmar após o rollback: login, abertura inicial, isolamento por empresa, leitura/gravação, navegação principal e PWA.
8. Registrar o motivo da reversão antes de uma nova tentativa, sem avançar ao bloco seguinte.

## Riscos identificados

- **Branch externa indisponível no checkout atual**: impede confirmar agora o escopo real. Mitigação: integrar somente por commit/diff fixo.
- **Separação artificial entre C1, C1-E e C1-F**: pode publicar uma correção incompleta ou criar estado intermediário inseguro. Mitigação: auditar o diff consolidado e usar pacote atômico quando houver dependência.
- **Pacote consolidado amplo demais**: pode dificultar diagnóstico e rollback quando as partes forem realmente independentes. Mitigação: preservar diffs rastreáveis e separar somente após comprovar independência funcional e de segurança.
- **Validação incompleta no navegador real**: testes automatizados não cobrem inicialização, cache e sessão. Mitigação: tornar essa validação um portão obrigatório.
- **Cache/PWA antigo**: pode servir uma combinação incompatível de arquivos. Mitigação: testar atualização com cache existente e versionar a estratégia de invalidação.
- **Regressão em autenticação ou isolamento**: impacto crítico em ambiente multiempresa. Mitigação: cenários autenticados e cruzados antes da publicação.
- **Mudança oculta de schema ou dados**: rollback de código isolado pode não bastar. Mitigação: interromper e exigir plano específico se o diff contiver migration.
- **Diferença entre prévia e produção**: configuração ou cache podem mudar o comportamento. Mitigação: checklist pós-publicação curto, objetivo e com reversão imediata.

## Monitoramento após cada publicação

Realizar uma janela controlada antes de iniciar outro bloco. Conferir abertura, login, erros de carregamento, falhas de navegação, sincronização, isolamento entre empresas, atualização do PWA e geração de PDFs. Qualquer regressão bloqueia a próxima etapa e aciona rollback.

## Próximo comando recomendado

Após C1, C1-E e C1-F estarem formalmente concluídas e validadas no navegador real, enviar exatamente:

`C1 APROVADA PARA INTEGRAÇÃO`

Esse comando autoriza apenas a auditoria dos diffs individuais e consolidado, a decisão entre pacote atômico ou integração separada e a apresentação do plano exato de arquivos, impacto, riscos, sequência, testes e rollback. A execução ainda dependerá de uma segunda autorização explícita.

**PLANEJAMENTO DE INTEGRAÇÃO CONCLUÍDO — NENHUMA ALTERAÇÃO EXECUTADA.**