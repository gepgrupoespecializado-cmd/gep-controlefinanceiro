# Nome da empresa dinâmico, sem marca fixa

## Escopo cirúrgico

Remover somente a identidade fixa do produto e usar o nome cadastrado pela empresa, sem refatoração, novas rotas, alterações de estrutura do banco, mudanças de design ou publicação. Não avançar outras etapas.

## Alterações

1. Criar apenas `src/hooks/use-company-name.ts`, com `useCompanyName()` lendo o nome reativo já disponível em `useDB().empresa.nome`, devolvendo **“Sua empresa”** quando vazio ou composto apenas por espaços. Sem consulta adicional por tela ou nova fonte de dados.
2. Substituir nomes fixos no cabeçalho, sidebar, dashboard, configurações, textos legais, instalação e mensagens de WhatsApp. Manter login e recuperação de senha neutros, sem mostrar o nome de uma empresa anterior antes da autenticação.
3. No cadastro inicial, manter o campo obrigatório e também rejeitar espaços em branco. Gravar o mesmo nome em `organizations.name` e nas configurações existentes antes de concluir o cadastro, preservando-o ao entrar no aplicativo. Em Configurações > Empresa, manter a edição e refletir o nome em todo o app imediatamente após salvar, mantendo os dois registros coerentes.
4. Nos PDFs de orçamento e relatório, substituir os nomes fixos no cabeçalho, continuação e rodapé pelo nome das configurações recebidas. Sem logo, mostrar apenas o nome em texto, sem monograma ou marca substituta. Remover assinaturas textuais de exemplo, como “Eduardo” e “Responsável: Eduardo Pennicha”. Preservar fontes, cores, paginação, cálculos e numeração existentes, inclusive ORC.
5. Trocar somente os valores de marca nos títulos e metadados das páginas, com atualização reativa do título da empresa autenticada. Usar textos neutros nas páginas públicas e nas telas estáticas de erro/offline. Remover a marca do manifesto e do ícone padrão, sem alterar comportamento de instalação ou cache.
6. Deixar vazio o nome padrão para novas empresas e remover apenas dados de demonstração com marca fixa. Não apagar ou substituir nomes, contatos ou logos que empresas existentes já cadastraram.

## Detalhes técnicos confirmados

- Neste projeto, as configurações chamam-se `organization_settings`, com o nome em `empresa.nome`; não será criada uma tabela `company_settings`.
- O cadastro já grava `organizations.name` e atualiza o estado local. O ajuste garantirá a gravação das configurações antes do redirecionamento, sem depender apenas desse estado local.
- `useDB()` já fornece atualização reativa, portanto o hook reutilizará esse mecanismo e a sincronização existente.
- Os PDFs estão em `src/lib/pdf.ts` e `src/lib/relatorio-pdf.ts`; não será criado `pdf-shared.ts`. Funções de PDF e metadados fora de componentes não chamarão hooks: receberão o mesmo nome pelas configurações existentes ou pelo componente que usa o hook.
- O documento HTML é gerado por `src/routes/__root.tsx`; os títulos específicos estão nas próprias páginas.
- O layout atual não tem rodapé geral. Serão atualizados os rodapés existentes dos PDFs, sem acrescentar uma seção ou mudar o design.
- Identificadores internos `gep_*`, chaves de armazenamento, backups, cache, rotas, permissões e regras de negócio permanecerão intactos.

## Validação e entrega

- Verificar cadastro com nome vazio e com espaços, fallback “Sua empresa” e atualização imediata após renomear.
- Em conta nova de teste, cadastrar **“Empresa Teste”**, conferir cabeçalho, sidebar, dashboard, título, PDF e rodapé do PDF, e sair/entrar para confirmar persistência.
- Conferir PDF sem logo e mensagens de WhatsApp sem nomes antigos; buscar resíduos de marca em textos visíveis, metadados e arquivos estáticos.
- Executar testes pertinentes e conferir os sinais de compilação fornecidos pelo ambiente, sem publicar.
- Ao terminar a implementação, responder somente com a lista dos arquivos alterados.