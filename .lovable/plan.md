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

## Ordem dos blocos

1. **C1**: concluir a validação externa, especialmente a sessão interrompida no navegador real. Integrar e publicar sozinha.
2. **C1-E**: tratar como pacote independente, somente depois do aceite e monitoramento da C1.
3. **C1-F**: não integrar enquanto não houver aprovação formal. Depois de aprovada, repetir todo o ciclo como bloco independente.
4. **C2**: iniciar somente após C1, C1-E e eventual C1-F terem pontos de restauração próprios e aceite encerrado. Nunca agrupar C1 com C2.

## Portão anterior a cada integração

Antes de alterar arquivos:

1. Fixar o commit de origem e obter o diff completo do bloco, sem depender de uma branch mutável.
2. Listar arquivos criados, alterados e removidos; separar alterações pertencentes a outros blocos.
3. Mapear dependências de código, pacotes e ordem de aplicação.
4. Comparar qualquer impacto em banco, migrations, autenticação, isolamento multiempresa e regras de acesso.
5. Revisar sincronização A/B/C, preservação de `app_data`, dados locais e backups.
6. Revisar rotas, redirecionamentos, inicialização e recuperação de erros.
7. Revisar Service Worker, nome e invalidação de cache, instalação e atualização do PWA.
8. Verificar compatibilidade com a versão publicada e definir o procedimento de rollback daquele bloco.
9. Se o diff exigir schema ou migration, interromper e apresentar um plano específico antes de qualquer aplicação.
10. Apresentar arquivos, impacto, riscos, sequência, testes e rollback; aguardar uma segunda autorização explícita para executar.

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

A C1 somente poderá ser publicada quando:

- o commit de origem e o conjunto de arquivos estiverem congelados e auditados;
- a validação final em navegador real estiver concluída;
- testes, TypeScript e build passarem sem regressão;
- autenticação, isolamento multiempresa, sincronização, navegação e PWA passarem nos cenários definidos;
- não houver alteração não autorizada de banco, dados ou migrations;
- o rollback estiver documentado e praticável;
- existir um ponto de restauração imutável anterior à integração e outro identificando a C1 aprovada;
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
- **Mistura entre C1, C1-E e C1-F**: dificulta diagnóstico e rollback. Mitigação: pacote e publicação independentes.
- **Validação incompleta no navegador real**: testes automatizados não cobrem inicialização, cache e sessão. Mitigação: tornar essa validação um portão obrigatório.
- **Cache/PWA antigo**: pode servir uma combinação incompatível de arquivos. Mitigação: testar atualização com cache existente e versionar a estratégia de invalidação.
- **Regressão em autenticação ou isolamento**: impacto crítico em ambiente multiempresa. Mitigação: cenários autenticados e cruzados antes da publicação.
- **Mudança oculta de schema ou dados**: rollback de código isolado pode não bastar. Mitigação: interromper e exigir plano específico se o diff contiver migration.
- **Diferença entre prévia e produção**: configuração ou cache podem mudar o comportamento. Mitigação: checklist pós-publicação curto, objetivo e com reversão imediata.

## Monitoramento após cada publicação

Realizar uma janela controlada antes de iniciar outro bloco. Conferir abertura, login, erros de carregamento, falhas de navegação, sincronização, isolamento entre empresas, atualização do PWA e geração de PDFs. Qualquer regressão bloqueia a próxima etapa e aciona rollback.

## Próximo comando recomendado

Após a C1 estar formalmente concluída e validada no navegador real, enviar exatamente:

`C1 APROVADA PARA INTEGRAÇÃO`

Esse comando autoriza apenas a auditoria final do pacote e a apresentação do plano exato de arquivos, impacto, riscos, sequência, testes e rollback. A execução ainda dependerá de uma segunda autorização explícita.

**PLANEJAMENTO DE INTEGRAÇÃO CONCLUÍDO — NENHUMA ALTERAÇÃO EXECUTADA.**