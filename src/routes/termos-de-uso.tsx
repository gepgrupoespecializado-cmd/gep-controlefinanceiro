import { useCompanyName } from "@/hooks/use-company-name";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Gestão de Serviços" },
      { name: "description", content: "Condições de uso do sistema Gestão de Serviços." },
      { property: "og:title", content: "Termos de Uso — Gestão de Serviços" },
      { property: "og:description", content: "Condições de uso do sistema Gestão de Serviços." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Termos de Uso — Gestão de Serviços" },
      { name: "twitter:description", content: "Condições de uso do sistema Gestão de Serviços." },
    ],
  }),
  component: TermosDeUso,
});

function TermosDeUso() {
  const companyName = useCompanyName();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-[var(--primary-glow)] text-primary-foreground">
          <ScrollText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Termos de Uso</h1>
          <p className="text-sm text-muted-foreground">Última atualização: 26 de junho de 2026</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Esta página é mantida pelo responsável pelo aplicativo <strong>{companyName}</strong> para
        esclarecer as condições de uso da plataforma. Leia atentamente antes de continuar utilizando os serviços.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Aceitação dos Termos</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
          <p>
            Ao acessar ou utilizar o aplicativo {companyName} (doravante “Aplicativo”), você concorda em
            cumprir estes Termos de Uso e todas as leis e regulamentos aplicáveis. Se você não concordar com qualquer
            disposição deste documento, não deve utilizar o Aplicativo.
          </p>
          <p>
            Estes termos se aplicam a todos os usuários, incluindo, mas não se limitando a, administradores,
            colaboradores, prestadores de serviço e visitantes que tenham acesso ao sistema.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Definições</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>“Usuário”</strong>: qualquer pessoa que acesse ou utilize o Aplicativo.</li>
            <li><strong>“Conta”</strong>: conjunto de credenciais que permite o acesso ao Aplicativo.</li>
            <li><strong>“Dados”</strong>: informações inseridas, processadas ou geradas no Aplicativo, incluindo dados de clientes, orçamentos, agendamentos e relatórios.</li>
            <li><strong>“Responsável pelo Aplicativo”</strong>: pessoa física ou jurídica que administra a instância e o conteúdo do Aplicativo.</li>
            <li><strong>“Lovable”</strong>: plataforma utilizada para hospedar e disponibilizar a aplicação.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Licença de Uso</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
          <p>
            O Responsável pelo Aplicativo concede ao Usuário uma licença limitada, não exclusiva, não transferível e
            revogável para acessar e utilizar o Aplicativo conforme a sua finalidade: gestão de clientes, orçamentos,
            agenda, financeiro, relatórios e precificação para prestadores de serviços.
          </p>
          <p>
            É proibido: (i) copiar, modificar, distribuir, vender ou alugar qualquer parte do Aplicativo; (ii) realizar
            engenharia reversa ou tentar extrair o código-fonte; (iii) utilizar o Aplicativo para fins ilícitos ou que
            violem direitos de terceiros; (iv) tentar acessar áreas restritas ou dados de outros usuários sem autorização.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Cadastro e Segurança da Conta</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
          <p>
            Para utilizar algumas funcionalidades, o Usuário pode precisar criar uma conta e fornecer informações
            verdadeiras, completas e atualizadas. O Usuário é responsável por manter a confidencialidade de suas
            credenciais e por todas as atividades realizadas em sua conta.
          </p>
          <p>
            O Responsável pelo Aplicativo não será responsabilizado por prejuízos decorrentes do uso não autorizado da
            conta, salvo em caso de negligência comprovada por parte da administração da plataforma.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">5. Conteúdo e Dados do Usuário</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
          <p>
            O Usuário mantém a titularidade dos dados que insere no Aplicativo. Ao utilizar o sistema, o Usuário concede
            ao Responsável pelo Aplicativo apenas as permissões necessárias para processar, armazenar e exibir esses
            dados com o objetivo de prestar os serviços contratados.
          </p>
          <p>
            O Usuário declara que possui autorização para coletar, tratar e armazenar dados pessoais de seus clientes e
            colaboradores, conforme a legislação aplicável, especialmente a Lei Geral de Proteção de Dados (LGPD — Lei
            nº 13.709/2018).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">6. Pagamentos e Assinatura</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
          <p>
            Caso o Aplicativo seja oferecido mediante pagamento ou assinatura, os valores, periodicidade e formas de
            pagamento serão informados no momento da contratação. O não pagamento pode resultar na suspensão ou
            cancelamento do acesso às funcionalidades pagas.
          </p>
          <p>
            O Responsável pelo Aplicativo poderá alterar preços e planos mediante aviso prévio, conforme as condições
            comerciais vigentes.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">7. Cancelamento e Rescisão</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
          <p>
            O Usuário pode solicitar o cancelamento da sua conta a qualquer tempo, observando as condições comerciais do
            plano contratado. O Responsável pelo Aplicativo poderá suspender ou encerrar o acesso em caso de violação
            destes Termos de Uso ou de conduta que coloque em risco a segurança ou integridade da plataforma.
          </p>
          <p>
            Após o encerramento, os dados do Usuário poderão ser excluídos ou retidos conforme descrito na Política de
            Privacidade e as obrigações legais aplicáveis.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">8. Limitação de Responsabilidade</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
          <p>
            O Aplicativo é disponibilizado “como está” e “conforme disponível”. O Responsável pelo Aplicativo se empenha
            para manter o sistema funcionando de forma segura e estável, mas não garante que o serviço será
            ininterrupto, livre de erros ou totalmente seguro contra incidentes.
          </p>
          <p>
            Na extensão máxima permitida pela lei, o Responsável pelo Aplicativo não será responsável por danos
            indiretos, incidentais, especiais ou consequenciais resultantes do uso ou da incapacidade de usar o
            Aplicativo, incluindo, mas não se limitando a, perda de lucros, dados ou oportunidades comerciais.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">9. Propriedade Intelectual</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
          <p>
            Todos os direitos de propriedade intelectual relacionados ao Aplicativo — incluindo marca, layout, design,
            código, funcionalidades e documentação — pertencem ao Responsável pelo Aplicativo ou a seus licenciadores,
            salvo indicação em contrário.
          </p>
          <p>
            O uso do Aplicativo não concede ao Usuário qualquer direito sobre a propriedade intelectual do sistema.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">10. Alterações nos Termos</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
          <p>
            O Responsável pelo Aplicativo poderá atualizar estes Termos de Uso a qualquer momento. As alterações serão
            comunicadas por meio do Aplicativo ou por outros canais disponíveis. O uso continuado do Aplicativo após a
            publicação das alterações constituirá aceitação dos novos termos.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">11. Disposições Gerais</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
          <p>
            Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Qualquer litígio decorrente
            destes termos será dirimido no foro da comarca do domicílio do Responsável pelo Aplicativo, salvo
            disposição legal em contrário.
          </p>
          <p>
            Se alguma disposição destes Termos for considerada inválida ou inexequível, as demais disposições
            permanecerão em pleno vigor e efeito.
          </p>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Dúvidas sobre estes Termos de Uso podem ser encaminhadas ao Responsável pelo Aplicativo através dos canais
        disponibilizados na página da Empresa ou na seção de Contato da Política de Privacidade.
      </p>
    </div>
  );
}
