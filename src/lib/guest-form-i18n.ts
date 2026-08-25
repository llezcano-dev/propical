// Standing UI strings for the guest-facing pre-arrival form. The form
// is Portuguese-only: the base (and only) language is pt, authored
// directly in GuestFormTemplate.name and each field's label / helpText /
// options. There are no per-template translations — the `i18n` column
// is left untouched (stays '{}').

export interface GuestUiCopy {
  greeting: (name: string) => string;
  intro: string;
  titleFallback: string;
  submit: string;
  submitting: string;
  thanks: string;
  submittedOn: (date: string) => string;
  selectPlaceholder: string;
  yes: string;
  no: string;
  /** Fallback label for a field with no title. */
  untitledQuestion: string;
  submitFailed: string;
  privacy: GuestPrivacyCopy;
}

/** Localised copy for the inline privacy / data-handling panel shown
 *  above the form. Goal: address the wary-guest concerns ("who hosts
 *  this, how is it managed, is data protection guaranteed") before
 *  they're asked to type anything. Default collapsed under a small
 *  "Details" toggle so it doesn't dominate the page for guests who
 *  don't care, but the always-visible summary is enough to reassure
 *  on its own. */
export interface GuestPrivacyCopy {
  /** Title row, always visible. */
  title: string;
  /** One-sentence summary, always visible. */
  summary: string;
  /** Toggle label when the panel is collapsed. */
  showDetails: string;
  /** Toggle label when the panel is expanded. */
  hideDetails: string;
  /** Bullet-point detail blocks shown when expanded. Title + body
   *  text — links are added by the rendering component. */
  bullets: { title: string; body: string }[];
  /** Trailing link label that points at the full /privacy policy. */
  fullPolicyLabel: string;
  /** Inline "GitHub source" link label (in the "Where it's stored"
   *  bullet — placed by the component to keep COPY plain text). */
  sourceLinkLabel: string;
}

export const GUEST_UI_COPY: GuestUiCopy = {
  greeting: (n) =>
    `Olá ${n}, por favor responda algumas perguntas antes de sua estadia.`,
  intro: "Por favor responda algumas perguntas antes de sua estadia.",
  titleFallback: "Formulário pré-chegada",
  submit: "Enviar",
  submitting: "Enviando…",
  thanks: "Obrigado — suas respostas foram registradas.",
  submittedOn: (d) => `Enviado em ${d}`,
  selectPlaceholder: "— selecione —",
  yes: "Sim",
  no: "Não",
  untitledQuestion: "Pergunta",
  submitFailed: "Falha ao enviar",
  privacy: {
    title: "Privacidade e tratamento de dados",
    summary:
      "Somente seu anfitrião vê suas respostas. Armazenadas em propical.com.br — software de código aberto, somente HTTPS, sem rastreamento.",
    showDetails: "Detalhes",
    hideDetails: "Ocultar",
    bullets: [
      {
        title: "Quem vê estes dados",
        body: "Somente o anfitrião da propriedade que você reservou. Suas respostas vão diretamente para a conta Propical dele. Não são compartilhadas, vendidas ou usadas para fins publicitários.",
      },
      {
        title: "Onde são armazenados",
        body: "propical.com.br é uma ferramenta de código aberto — o código fonte é público, então qualquer pessoa pode verificar o que acontece com seus dados. A conexão com este formulário é criptografada por HTTPS.",
      },
      {
        title: "Sem rastreamento",
        body: "Nenhuma ferramenta de análise, cookie publicitário ou script de terceiros é carregado nesta página. Apenas o cookie estritamente necessário para vincular sua resposta à reserva é usado.",
      },
      {
        title: "Seus direitos (LGPD / GDPR)",
        body: "Você pode pedir ao seu anfitrião para excluir suas respostas a qualquer momento, ou escrever ao operador em llezcano.dev@gmail.com para qualquer dúvida, solicitação de acesso ou reclamação de privacidade.",
      },
    ],
    fullPolicyLabel: "Política de privacidade completa do Propical",
    sourceLinkLabel: "código fonte no GitHub",
  },
};