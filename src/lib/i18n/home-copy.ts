/**
 * Landing-page marketing copy, split per locale.
 *
 * Lives in the i18n layer (typed by `Locale`, keyed like the rest of the
 * system) but NOT in `translations.ts`: those are flat UI strings, while
 * this is long-form nested marketing copy with arrays (steps, features,
 * FAQ). One block per SUPPORTED_LOCALES entry (en/pt/es).
 *
 * The EN block also seeds the FAQPage + SoftwareApplication JSON-LD so
 * the structured data Google sees stays in English (international SEO
 * signal). `pt` is DEFAULT_LOCALE (the product targets Brazilian hosts)
 * — it drives the visible render for visitors without a locale cookie.
 */
import type { Locale } from "@/lib/i18n/translations";

interface HomeSectionStep {
  title: string;
  body: string;
}
interface HomeSectionFeature {
  title: string;
  body: string;
}
interface HomeSectionFaq {
  q: string;
  a: string;
}

export interface HomeCopy {
  hero: {
    eyebrow: string;
    titleLead: string;
    titleAccent: string;
    subtitleA: string;
    platforms: string;
    subtitleB: string;
    subtitleC: string;
    subtitleD: string;
    cta: string;
    ctaNote: string;
  };
  how: {
    eyebrow: string;
    title: string;
    steps: HomeSectionStep[];
    tryWizard: string;
  };
  features: {
    eyebrow: string;
    titleA: string;
    titleB: string;
    items: HomeSectionFeature[];
  };
  compatible: { label: string; footer: string };
  trust: {
    open: { title: string; body: string; link: string };
    gdpr: { title: string; body: string; link: string };
  };
  faq: { eyebrow: string; title: string; items: HomeSectionFaq[] };
  finalCta: {
    titleA: string;
    titleB: string;
    body: string;
    primary: string;
    secondary: string;
  };
  footer: {
    copyright: string;
    github: string;
    terms: string;
    privacy: string;
    signIn: string;
    contact: string;
    cookieNoteA: string;
    cookieNoteLink: string;
    cookieNoteB: string;
  };
}

/** Per-locale <title> + meta description for the landing route. */
export const HOME_META: Record<Locale, { title: string; description: string }> =
  {
    en: {
      title: "Propical — open-source property manager for short-term rentals",
      description:
        "Free open-source property manager for short-term rental hosts. Sync Airbnb + Booking.com calendars, automate cleaning, collect guest details with pre-arrival forms.",
    },
    pt: {
      title: "Propical — gestor de aluguel de temporada de código aberto",
      description:
        "Gestor de aluguel de temporada gratuito e de código aberto para anfitriões. Sincronize os calendários do Airbnb e do Booking.com, automatize a limpeza e colete dados de hóspedes com formulários de pré-chegada.",
    },
    es: {
      title: "Propical — gestor de alquiler vacacional de código abierto",
      description:
        "Gestor de código abierto y gratuito para anfitriones de alquiler vacacional. Sincroniza los calendarios de Airbnb y Booking.com, automatiza la limpieza y recoge datos de huéspedes con formularios de llegada.",
    },
  };

export const homeCopy: Record<Locale, HomeCopy> = {
  en: {
    hero: {
      eyebrow: "Open source · Free to start",
      titleLead: "Stop juggling",
      titleAccent: "calendar tabs",
      subtitleA: "Cross-sync calendars across",
      platforms: "Airbnb, Booking.com, Vrbo",
      subtitleB:
        "and any iCal source so each platform sees the others' bookings —",
      subtitleC: "drastically fewer double-booking surprises",
      subtitleD: ". Free to start, open-source.",
      cta: "Start now — it's free",
      ctaNote: "No credit card. Free to start. Try the wizard before signing up.",
    },
    how: {
      eyebrow: "How it works",
      title: "Three steps. Most hosts finish in seven minutes.",
      steps: [
        {
          title: "Paste your platform iCal URLs",
          body: "Airbnb has one in Calendar → Sync calendars → Export. Booking.com has one in Calendar → Sync calendars. Vrbo too. Drop them in our wizard.",
        },
        {
          title: "We hand you back a unified feed",
          body: "One iCal URL per platform that includes everyone else's bookings plus your manual entries plus cleaning buffer days. No double bookings.",
        },
        {
          title: "Paste our URL back into each platform",
          body: "Airbnb and Booking.com pull our feed every few hours. Now their calendars know about each other and about your manual blocks.",
        },
      ],
      tryWizard: "Try the wizard without signing up",
    },
    features: {
      eyebrow: "Built for the parts that hurt",
      titleA: "Everything a host needs.",
      titleB: "Nothing you'll never use.",
      items: [
        {
          title: "Cross-platform calendar sync",
          body: "Every 10 minutes we pull each platform's iCal feed and republish it for the others. Airbnb sees Booking's bookings and vice versa — the same protection paid channel managers offer, just free and open-source.",
        },
        {
          title: "Cleaning automation",
          body: "Buffer days the platforms can't do natively. Daily cleaning list. Cleaner role with restricted dashboard access.",
        },
        {
          title: "Multi-property dashboard",
          body: "Run as many places as you want from one panel. Switch context with a keystroke. Property managers + cleaners get scoped roles.",
        },
        {
          title: "Message templates",
          body: "Per-property templates with variables (guest name, check-in, wifi). Copy to clipboard, paste into Airbnb / WhatsApp.",
        },
        {
          title: "Public iCal feed",
          body: "Every property has its own feed URL. Paste it back into Airbnb / Booking and let them pull your manual blocks.",
        },
      ],
    },
    compatible: {
      label: "Compatible with",
      footer: "…and any platform that exports an iCal feed.",
    },
    trust: {
      open: {
        title: "Open source",
        body: "MIT-licensed on GitHub. Read the code, file an issue, or self-host on any VPS.",
        link: "View on GitHub",
      },
      gdpr: {
        title: "GDPR compliant",
        body: "One essential session cookie. No analytics, no ads, no third-party trackers. Delete your account, your data is gone.",
        link: "Privacy policy",
      },
    },
    faq: {
      eyebrow: "Quick answers",
      title: "The questions hosts ask first.",
      items: [
        {
          q: "Does this actually prevent double-bookings?",
          a: "It cuts the risk dramatically — not to zero, but close. We pull each platform's iCal feed every 10 minutes and republish it for the others, so Airbnb learns about Booking.com bookings (and vice versa) within ~10 min on our side. The platforms refresh imported feeds every 2-12h on their side. Real-time API sync would be faster, but Airbnb / Booking.com don't sell their channel-manager APIs to individual hosts — only to certified PMS providers who charge $100-300/mo to forward the same feeds we sync for free. For 99% of small hosts, the iCal handshake is more than enough.",
        },
        {
          q: "Is it really free?",
          a: "Yes. The hosted instance is free for personal use, rate-limited per account so the bills stay sane. The source is MIT — clone it, run it on a $4 VPS, you owe nothing.",
        },
        {
          q: "What does it actually do?",
          a: "Pulls any iCal-compatible calendar — Airbnb, Booking.com, Vrbo, or anything else that exposes an export URL — so you stop juggling tabs. Adds buffer days for cleaning that the platforms can't do natively. Generates a daily cleaning list. Per-property message templates included.",
        },
        {
          q: "Do I have to host my own?",
          a: "No. Sign up here and use the hosted version. If one day you outgrow the free tier or want full data ownership, export and self-host — your data, your call.",
        },
        {
          q: "Where does my guest data live?",
          a: "On a single SQLite file inside the hosted server. No third-party processors ever see your guest data. Delete your account and the data is gone.",
        },
      ],
    },
    finalCta: {
      titleA: "Built by a host.",
      titleB: "For hosts.",
      body: "Free to start. No tracking. The maintainer pays the hosting bill so you can focus on guests instead of calendar tabs.",
      primary: "Start now — it's free",
      secondary: "Read the source",
    },
    footer: {
      copyright: "© 2026 Propical · MIT License",
      github: "GitHub",
      terms: "Terms",
      privacy: "Privacy",
      signIn: "Sign in",
      contact: "Contact",
      cookieNoteA: "Essential cookies only — no tracking, no analytics. See ",
      cookieNoteLink: "Privacy",
      cookieNoteB: ".",
    },
  },
  pt: {
    hero: {
      eyebrow: "Código aberto · Comece grátis",
      titleLead: "O calendário da sua",
      titleAccent: "casa de temporada",
      subtitleA: "Sincronize os calendários entre",
      platforms: "Airbnb, Booking.com, Vrbo",
      subtitleB:
        "e qualquer fonte iCal, para que cada plataforma veja as reservas das outras —",
      subtitleC: "adeus, reservas duplicadas",
      subtitleD: ". Comece grátis, código aberto.",
      cta: "Começar agora — é grátis",
      ctaNote:
        "Sem cartão de crédito. Comece grátis. Teste o assistente antes de se cadastrar.",
    },
    how: {
      eyebrow: "Como funciona",
      title: "Três passos. A maioria dos anfitriões termina em sete minutos.",
      steps: [
        {
          title: "Cole os links iCal das suas plataformas",
          body: "O Airbnb tem um em Calendário → Sincronizar calendários → Exportar. O Booking.com em Calendário → Sincronizar calendários. O Vrbo também. Cole tudo no nosso assistente.",
        },
        {
          title: "Você recebe um feed unificado",
          body: "Um link iCal por plataforma que inclui as reservas de todas as outras, seus bloqueios manuais e os dias de buffer para limpeza. Sem reservas duplicadas.",
        },
        {
          title: "Cole nosso link de volta em cada plataforma",
          body: "O Airbnb e o Booking.com puxam nosso feed a cada poucas horas. Agora os calendários deles sabem um do outro — e dos seus bloqueios manuais.",
        },
      ],
      tryWizard: "Teste o assistente sem se cadastrar",
    },
    features: {
      eyebrow: "Feito para o que dói",
      titleA: "Tudo o que um anfitrião precisa.",
      titleB: "Nada que você nunca vai usar.",
      items: [
        {
          title: "Sincronização de calendários entre plataformas",
          body: "A cada 10 minutos puxamos o feed iCal de cada plataforma e o republicamos para as outras. O Airbnb vê as reservas do Booking e vice-versa — a mesma proteção de um channel manager pago, só que grátis e de código aberto.",
        },
        {
          title: "Automação de limpeza",
          body: "Dias de buffer que as plataformas não fazem nativamente. Lista de limpeza diária. Papel de diarista com acesso restrito ao painel.",
        },
        {
          title: "Painel multi-imóveis",
          body: "Gerencie quantas casas quiser em um só painel. Troque de contexto com um atalho. Gestores e diaristas têm papéis com escopo definido.",
        },
        {
          title: "Modelos de mensagem",
          body: "Modelos por imóvel com variáveis (nome do hóspede, check-in, wifi). Copie e cole no Airbnb ou no WhatsApp.",
        },
        {
          title: "Feed iCal público",
          body: "Cada imóvel tem seu próprio link de feed. Cole de volta no Airbnb ou no Booking e deixe que puxem seus bloqueios manuais.",
        },
      ],
    },
    compatible: {
      label: "Compatível com",
      footer: "…e com qualquer plataforma que exporte um feed iCal.",
    },
    trust: {
      open: {
        title: "Código aberto",
        body: "Licença MIT no GitHub. Leia o código, abra uma issue ou rode no seu próprio servidor por alguns reais por mês.",
        link: "Ver no GitHub",
      },
      gdpr: {
        title: "Em conformidade com a LGPD",
        body: "Um único cookie essencial de sessão. Sem analytics, sem anúncios, sem rastreadores de terceiros. Exclua sua conta e seus dados somem.",
        link: "Política de privacidade",
      },
    },
    faq: {
      eyebrow: "Respostas rápidas",
      title: "As perguntas que os anfitriões fazem primeiro.",
      items: [
        {
          q: "Isso realmente evita reservas duplicadas?",
          a: "Reduz o risco drasticamente — não a zero, mas quase. Puxamos o feed iCal de cada plataforma a cada 10 minutos e o republicamos para as outras, então o Airbnb fica sabendo das reservas do Booking.com (e vice-versa) em ~10 min do nosso lado. As plataformas atualizam os feeds importados a cada 2–12h do lado delas. Sincronização por API em tempo real seria mais rápida, mas o Airbnb e o Booking.com não vendem suas APIs de channel manager para anfitriões individuais — só para provedores de PMS certificados que cobram US$ 100–300/mês para repassar os mesmos feeds que sincronizamos de graça. Para 99% dos pequenos anfitriões, o iCal é mais do que suficiente.",
        },
        {
          q: "É mesmo grátis?",
          a: "Sim. A versão hospedada é grátis para uso pessoal, com limite de requisições por conta para a conta do servidor não explodir. O código é MIT — clone, rode num servidor barato e não deve nada a ninguém.",
        },
        {
          q: "O que ele faz exatamente?",
          a: "Puxa qualquer calendário compatível com iCal — Airbnb, Booking.com, Vrbo ou qualquer coisa que exponha um link de exportação — para você parar de pular entre abas. Adiciona dias de buffer para limpeza que as plataformas não fazem nativamente. Gera a lista de limpeza do dia. Modelos de mensagem por imóvel incluídos.",
        },
        {
          q: "Preciso hospedar no meu próprio servidor?",
          a: "Não. Cadastre-se aqui e use a versão hospedada. Se um dia você crescer além do plano grátis ou quiser controle total dos dados, exporte e hospede você mesmo — seus dados, sua decisão.",
        },
        {
          q: "Onde ficam os dados dos meus hóspedes?",
          a: "Em um único arquivo SQLite dentro do servidor hospedado. Nenhum processador de terceiros tem acesso aos dados dos seus hóspedes. Exclua sua conta e os dados somem.",
        },
      ],
    },
    finalCta: {
      titleA: "Feito por um anfitrião.",
      titleB: "Para anfitriões.",
      body: "Comece grátis. Sem rastreamento. O mantenedor paga a conta do servidor para você focar nos hóspedes em vez de abas de calendário.",
      primary: "Começar agora — é grátis",
      secondary: "Ver o código-fonte",
    },
    footer: {
      copyright: "© 2026 Propical · Licença MIT",
      github: "GitHub",
      terms: "Termos",
      privacy: "Privacidade",
      signIn: "Entrar",
      contact: "Contato",
      cookieNoteA:
        "Apenas cookies essenciais — sem rastreamento, sem analytics. Veja a ",
      cookieNoteLink: "Política de privacidade",
      cookieNoteB: ".",
    },
  },
  es: {
    hero: {
      eyebrow: "Código abierto · Empieza gratis",
      titleLead: "Deje de saltar entre",
      titleAccent: "pestañas de calendario",
      // "Cross-sync calendars between Airbnb, Booking.com, Vrbo and
      // anything that speaks iCal." Spanish prefers "entre" plus a
      // clean enumeration; usted register throughout.
      subtitleA: "Sincronizamos calendarios entre",
      platforms: "Airbnb, Booking.com, Vrbo",
      subtitleB:
        "y cualquier fuente compatible con iCal. Cada plataforma ve las reservas de las demás —",
      subtitleC: "las reservas dobles casi desaparecen",
      subtitleD: ". Empieza gratis, código abierto.",
      cta: "Empezar — es gratis",
      ctaNote:
        "Sin tarjeta. Empiece gratis. Pruebe el asistente antes de registrarse.",
    },
    how: {
      eyebrow: "Cómo funciona",
      title:
        "Tres pasos. La mayoría de los anfitriones termina en siete minutos.",
      steps: [
        {
          title: "Pegue las URL iCal de cada plataforma",
          body: "En Airbnb está en Calendar → Sync calendars → Export. En Booking.com, en Calendar → Sync calendars. Vrbo igual. Péguelas en el asistente.",
        },
        {
          title: "Le devolvemos un feed unificado",
          body: "Una URL iCal por plataforma con las reservas de las demás, sus bloqueos manuales y los días buffer de limpieza. No hay hueco para una reserva doble.",
        },
        {
          title: "Pegue nuestra URL de vuelta en cada plataforma",
          body: "Airbnb y Booking.com importan nuestro feed cada pocas horas. A partir de ahí, sus calendarios se conocen entre sí — y conocen sus bloqueos manuales.",
        },
      ],
      tryWizard: "Probar el asistente sin registrarse",
    },
    features: {
      eyebrow: "Pensado para lo que duele de verdad",
      titleA: "Todo lo que necesita un anfitrión.",
      titleB: "Nada que no vaya a usar.",
      items: [
        {
          title: "Sincronización entre plataformas",
          body: "Cada 10 minutos descargamos el feed iCal de cada plataforma y lo republicamos para las demás. Airbnb ve las reservas de Booking y viceversa — la misma protección que ofrece un Channel Manager de pago, pero gratis y de código abierto.",
        },
        {
          title: "Automatización de limpiezas",
          body: "Días buffer que las plataformas no saben gestionar de forma nativa. Lista de limpiezas del día. Rol de personal de limpieza con acceso restringido al panel.",
        },
        {
          title: "Panel multi-propiedad",
          body: "Gestione cuantos alojamientos quiera desde un solo sitio. Cambio de contexto con una tecla. Co-anfitriones y personal de limpieza tienen sus propios roles con los permisos justos.",
        },
        {
          title: "Plantillas de mensajes",
          body: "Plantillas por alojamiento con variables (nombre del huésped, entrada, wifi). Copiar al portapapeles, pegar en Airbnb o WhatsApp.",
        },
        {
          title: "Feed iCal público",
          body: "Cada alojamiento tiene su propia URL de feed. Péguela en Airbnb o Booking — y arrastrarán también sus bloqueos manuales.",
        },
      ],
    },
    compatible: {
      label: "Compatible con",
      footer: "…y cualquier plataforma que exporte un feed iCal.",
    },
    trust: {
      open: {
        title: "Código abierto",
        body: "Licencia MIT en GitHub. Lea el código, abra un issue o autoalójelo en cualquier VPS de 4 $.",
        link: "Ver en GitHub",
      },
      gdpr: {
        title: "Conforme con el RGPD",
        body: "Una sola cookie de sesión imprescindible. Sin analítica, sin publicidad, sin rastreadores de terceros. Borre la cuenta y los datos se van con ella.",
        link: "Política de privacidad",
      },
    },
    faq: {
      eyebrow: "Respuestas rápidas",
      title: "Lo primero que preguntan los anfitriones.",
      items: [
        {
          q: "¿De verdad evita las reservas dobles?",
          a: "Reduce el riesgo drásticamente — no a cero, pero casi. Descargamos el feed iCal de cada plataforma cada 10 minutos y lo republicamos para las demás, así que Airbnb se entera de una reserva en Booking.com (y viceversa) en unos 10 min por nuestra parte. Las plataformas refrescan los feeds importados cada 2-12 h por la suya. Una sincronización por API en tiempo real sería más rápida, pero Airbnb y Booking.com no venden sus API de Channel Manager a anfitriones particulares — solo a PMS certificados que cobran 100-300 $/mes por reenviar los mismos feeds que aquí sincronizamos gratis. Para el 99 % de los anfitriones pequeños, el handshake por iCal sobra.",
        },
        {
          q: "¿De verdad es gratis?",
          a: "Sí. La versión alojada es gratuita para uso personal, con un límite de uso por cuenta para que las facturas no se disparen. El código está bajo MIT — clónelo, levántelo en un VPS de 4 $ y no debe nada a nadie.",
        },
        {
          q: "¿Qué hace exactamente?",
          a: "Importa cualquier calendario compatible con iCal — Airbnb, Booking.com, Vrbo o cualquier otro servicio con URL de exportación — para que deje de saltar entre pestañas. Añade días buffer de limpieza que las plataformas no saben hacer de forma nativa. Genera la lista de limpiezas del día. Plantillas de mensajes por alojamiento incluidas.",
        },
        {
          q: "¿Tengo que autoalojarlo?",
          a: "No. Regístrese aquí y use la versión alojada. Si algún día se le queda corto el plan gratuito o quiere control total de los datos, expórtelo y autoalójelo. Sus datos, su decisión.",
        },
        {
          q: "¿Dónde viven los datos de los huéspedes?",
          a: "En un único archivo SQLite dentro del servidor alojado. Ningún procesador de terceros accede a los datos de sus huéspedes. Borre la cuenta y los datos desaparecen.",
        },
      ],
    },
    finalCta: {
      titleA: "Hecho por un anfitrión.",
      titleB: "Para anfitriones.",
      body: "Empiece gratis. Sin tracking. El mantenedor paga la factura del hosting para que usted se ocupe de los huéspedes y no de las pestañas del navegador.",
      primary: "Empezar — es gratis",
      secondary: "Leer el código fuente",
    },
    footer: {
      copyright: "© 2026 Propical · Licencia MIT",
      github: "GitHub",
      terms: "Términos",
      privacy: "Privacidad",
      signIn: "Iniciar sesión",
      contact: "Contacto",
      cookieNoteA:
        "Solo cookies imprescindibles — sin tracking ni analítica. Consulte la ",
      cookieNoteLink: "política de privacidad",
      cookieNoteB: ".",
    },
  },
};

/**
 * Copy for a resolved locale. All SUPPORTED_LOCALES entries have a block,
 * so the fallback only guards against future locale drift.
 */
export function getHomeCopy(locale: Locale): HomeCopy {
  return homeCopy[locale] ?? homeCopy.en;
}
