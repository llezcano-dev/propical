import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing-header";
import { applySeoOverrides } from "@/lib/seo";
import { OPERATOR_EMAIL, OPERATOR_NAME, REPO_URL } from "@/lib/site";

const TERMS_TITLE = "Termos de Serviço";
const TERMS_DESCRIPTION =
  "Termos de serviço da instância hospedada gratuita do Propical em propical.com.br.";

export async function generateMetadata(): Promise<Metadata> {
  const base: Metadata = {
    title: TERMS_TITLE,
    description: TERMS_DESCRIPTION,
    alternates: { canonical: "/terms" },
    openGraph: {
      type: "article",
      title: `${TERMS_TITLE} · Propical`,
      description: TERMS_DESCRIPTION,
      url: "/terms",
      siteName: "Propical",
    },
    twitter: {
      card: "summary_large_image",
      title: `${TERMS_TITLE} · Propical`,
      description: TERMS_DESCRIPTION,
    },
  };
  return applySeoOverrides(base, "/terms", "pt");
}

const LAST_UPDATED = "2026-05-05";

export default function TermsPage() {
  return (
    <div className="editorial min-h-screen bg-surface text-text-primary">
      <MarketingHeader />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Termos de Serviço</h1>
        <p className="mt-2 text-sm text-text-faint">Última atualização: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-text-secondary sm:text-base">
          <section>
            <p>
              Estes Termos de Serviço (&quot;Termos&quot;) constituem um acordo vinculante
              entre você (&quot;você&quot;, &quot;seu&quot;) e {OPERATOR_NAME}
              (&quot;nós&quot;, &quot;o Operador&quot;), mantenedor independente do
              serviço Propical hospedado em{" "}
              <span className="font-mono text-text-primary">https://propical.com.br</span>{" "}
              (&quot;o Serviço&quot;). Ao criar uma conta ou usar o Serviço, você concorda
              com estes Termos. Se você não concorda, não utilize o Serviço.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">1. Sobre o Serviço</h2>
            <p>
              O Propical é um gerenciador de propriedades e reservas de código aberto,
              projetado para proprietários e administradores de aluguéis de curta
              temporada. O código-fonte é publicado sob a Licença MIT em{" "}
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:underline"
              >
                {REPO_URL.replace("https://", "")}
              </a>{" "}
              e pode ser auto-hospedado por qualquer pessoa. Estes Termos regem apenas a
              instância hospedada operada por nós em propical.com.br. Se você auto-hospeda,
              você opera o seu próprio serviço e estes Termos não se aplicam.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">2. Elegibilidade</h2>
            <p>
              Você deve ter pelo menos 16 anos de idade (ou mais, onde exigido pela lei do
              seu país) para criar uma conta. Ao se cadastrar, você confirma que atende a
              esse requisito e que tem autoridade para aceitar estes Termos em nome de
              qualquer organização para a qual criar uma conta.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">3. Conta e segurança</h2>
            <p>
              Você escolhe o seu nome de usuário e senha. Você é responsável por manter
              suas credenciais em segredo e por tudo o que acontece na sua conta.
              Notifique-nos em{" "}
              <a href={`mailto:${OPERATOR_EMAIL}`} className="text-sky-400 hover:underline">{OPERATOR_EMAIL}</a>{" "}
              se suspeitar de acesso não autorizado. Podemos suspender ou encerrar contas
              que apresentem sinais de comprometimento, para proteger outros usuários.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">4. Uso aceitável</h2>
            <p>Você concorda em não:</p>
            <ul className="list-disc space-y-2 pl-5 mt-2">
              <li>violar qualquer lei aplicável, incluindo leis de proteção de dados;</li>
              <li>
                carregar conteúdo que viole direitos de terceiros ou que seja ilegal,
                ameaçador, assediante, difamatório ou censurável de qualquer outra forma;
              </li>
              <li>
                armazenar ou processar dados pessoais de terceiros sem base legal
                (consentimento, obrigação de registro de hospedagem etc.);
              </li>
              <li>
                tentar contornar autenticação, limites de taxa ou controles de acesso;
              </li>
              <li>
                sondar, escanear ou realizar testes de carga no Serviço além do uso ordinário;
              </li>
              <li>
                revender, sublicenciar ou redistribuir comercialmente o Serviço hospedado
                (você pode auto-hospedar o código aberto livremente sob a MIT);
              </li>
              <li>
                usar o Serviço para enviar spam, malware ou operar qualquer tipo de botnet,
                scraper ou fazenda de scraping;
              </li>
              <li>
                tentar fazer engenharia reversa ou extrair código ou dados que não lhe
                foram disponibilizados, exceto lendo o repositório público de código-fonte.
              </li>
            </ul>
            <p className="mt-3">
              Podemos suspender ou encerrar contas que violem esta seção, com ou sem aviso
              prévio. Também podemos remover conteúdo que, de boa-fé, consideremos violador
              desta seção.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">5. Seu conteúdo e seus dados</h2>
            <p>
              Você mantém a propriedade de todo o conteúdo que carrega ou gera usando o
              Serviço — propriedades, reservas, links de calendário, modelos de mensagens,
              registros de limpeza e dados de hóspedes. Você nos concede uma licença
              limitada e não exclusiva para hospedar, processar, transmitir, exibir e fazer
              backup desse conteúdo, exclusivamente para fornecer o Serviço a você. Não
              reivindicamos quaisquer direitos além do necessário para operar o Serviço.
            </p>
            <p className="mt-2">
              Você pode exportar seus dados a qualquer momento (Relatórios → CSV; Perfil →
              Exportar meus dados → JSON) e excluir sua conta imediatamente (Perfil → Zona
              de risco → Excluir minha conta). Os detalhes sobre como os dados são
              armazenados e por quanto tempo são retidos estão em nossa{" "}
              <Link href="/privacy" className="text-sky-400 hover:underline">
                Política de Privacidade
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">6. Dados de passaporte dos hóspedes</h2>
            <p>
              Ao inserir ou armazenar dados de passaporte de hóspedes no Serviço, você atua
              como controlador desses dados pessoais. Você confirma que possui base legal
              para processá-los (normalmente uma obrigação de registro de hospedagem sob a
              lei do seu país) e que informou o hóspede. Atuamos como seu operador e só
              processaremos os dados conforme suas instruções documentadas. Você é
              responsável por atender solicitações de titulares feitas pelos hóspedes;
              nós o auxiliaremos mediante solicitação.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">7. Propriedade intelectual</h2>
            <p>
              O código-fonte do Propical é licenciado sob a Licença MIT — mantenha uma
              cópia da licença junto ao código-fonte. O nome &quot;Propical&quot; e
              quaisquer logotipos usados em propical.com.br permanecem propriedade do
              Operador e não são licenciados para usos que impliquem endosso de forks ou
              outras instâncias. Os nomes de terceiros mencionados no aplicativo (Airbnb,
              Booking.com, Google etc.) pertencem aos seus respectivos proprietários.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">8. Serviço gratuito, sem garantia</h2>
            <p>
              O Serviço hospedado é fornecido gratuitamente, &quot;no estado em que se
              encontra&quot; e &quot;conforme disponível&quot;, sem garantias de qualquer
              tipo, expressas ou implícitas — incluindo, sem limitação, as garantias
              implícitas de comercialização, adequação a uma finalidade específica, não
              violação e operação ininterrupta. Não garantimos que o Serviço estará livre
              de erros, que os calendários serão sincronizados sem atraso ou que os backups
              serão bem-sucedidos todas as noites. Se o Serviço é crítico para o seu
              negócio, recomendamos auto-hospedar, para que você controle seus próprios
              backups, disponibilidade e residência dos dados.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">9. Limitação de responsabilidade</h2>
            <p>
              Na extensão máxima permitida pela lei aplicável, a responsabilidade total do
              Operador perante você, por todas as reivindicações decorrentes ou relacionadas
              ao Serviço — seja em contrato, ato ilícito ou de outra forma — não excederá o
              maior valor entre (a) o total de taxas que você nos pagou nos doze meses
              anteriores à reivindicação ou (b) dez euros (€10). O Serviço é fornecido
              gratuitamente, portanto a cláusula (a) normalmente será zero.
            </p>
            <p className="mt-2">
              Não somos responsáveis por danos indiretos, consequenciais, incidentais,
              especiais ou punitivos, incluindo, entre outros, reservas perdidas ou
              duplicadas, limpezas não realizadas, dessincronização de calendário, perda de
              dados de hóspedes, multas regulatórias incorridas por você ou interrupção dos
              negócios. Algumas jurisdições não permitem essas limitações; nessas
              jurisdições, nossa responsabilidade fica limitada ao menor valor permitido
              por lei.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">10. Indenização</h2>
            <p>
              Você concorda em defender e indenizar o Operador contra qualquer
              reivindicação, perda ou custo (incluindo honorários advocatícios razoáveis)
              decorrente de (i) conteúdo que você carregue, (ii) seu uso do Serviço em
              violação a estes Termos, ou (iii) sua violação dos direitos de terceiros —
              incluindo os direitos dos hóspedes cujos dados de passaporte você armazena.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">11. Disponibilidade do Serviço e alterações</h2>
            <p>
              A instância hospedada não possui SLA. Buscamos disponibilidade com melhor
              esforço e podemos tirar o Serviço do ar para manutenção, migração ou — em
              casos extremos — desativá-lo completamente. Se planejarmos encerrar a
              instância hospedada, notificaremos os usuários registrados com pelo menos 30
              dias de antecedência, com instruções para exportar seus dados. O código
              aberto continuará disponível sob a MIT para auto-hospedagem,
              independentemente disso.
            </p>
            <p className="mt-2">
              Podemos adicionar, alterar ou remover recursos sem aviso prévio. Podemos
              impor ou ajustar limites de taxa para proteger o nível gratuito e outros
              usuários.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">12. Suspensão e encerramento</h2>
            <p>
              Você pode parar de usar o Serviço a qualquer momento e excluir sua conta pelo
              painel de Perfil. Podemos suspender ou encerrar sua conta imediatamente se
              (a) razoavelmente acreditarmos que você violou estes Termos, (b) formos
              obrigados a fazê-lo por lei, ou (c) inatividade prolongada (mais de 24 meses)
              indicar que a conta foi abandonada. Daremos aviso razoável e oportunidade de
              exportar os dados, a menos que isso prejudique o Serviço ou outros usuários.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">13. Lei aplicável e disputas</h2>
            <p>
              Estes Termos são regidos pelas leis do país de residência do Operador, sem
              considerar suas regras de conflito de leis. Quando a legislação obrigatória
              de proteção ao consumidor do seu país for aplicável, essas regras continuarão
              se aplicando adicionalmente. As partes tentarão resolver qualquer disputa
              informalmente primeiro, por e-mail, em{" "}
              <a href={`mailto:${OPERATOR_EMAIL}`} className="text-sky-400 hover:underline">{OPERATOR_EMAIL}</a>.
              Se isso falhar, os tribunais do país de residência do Operador terão
              jurisdição não exclusiva.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">14. Alterações destes Termos</h2>
            <p>
              Podemos atualizar estes Termos quando o Serviço mudar ou quando as leis
              mudarem. Sinalizaremos atualizações relevantes dentro do aplicativo e
              atualizaremos a data no topo desta página. Versões anteriores ficam visíveis
              no histórico Git público do repositório de código aberto. O uso contínuo do
              Serviço após a entrada em vigor das alterações significa que você aceita os
              Termos atualizados.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">15. Disposições gerais</h2>
            <p>
              Se qualquer cláusula destes Termos for considerada inexequível, o restante
              permanecerá em vigor. A nossa falha em aplicar uma cláusula não constitui
              renúncia ao direito de aplicá-la posteriormente. Você não pode ceder os seus
              direitos sob estes Termos; podemos ceder os nossos a um sucessor que assuma a
              operação do Serviço, com notificação a você. Estes Termos, juntamente com a
              Política de Privacidade, constituem o acordo integral entre você e nós sobre
              o Serviço.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-text-primary">16. Contato</h2>
            <p>
              Dúvidas sobre estes Termos ou o Serviço: envie um e-mail para{" "}
              <a href={`mailto:${OPERATOR_EMAIL}`} className="text-sky-400 hover:underline">{OPERATOR_EMAIL}</a>.
              Para relatar bugs publicamente ou solicitar recursos, abra uma issue em{" "}
              <a
                href={`${REPO_URL}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:underline"
              >
                {REPO_URL.replace("https://", "")}/issues
              </a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-4 py-6 text-caption text-text-faint sm:flex-row sm:px-6">
          <p>© 2026 Propical · Licença MIT</p>
          <nav className="flex gap-4">
            <Link href="/" className="hover:text-text-primary">Início</Link>
            <Link href="/privacy" className="hover:text-text-primary">Privacidade</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
