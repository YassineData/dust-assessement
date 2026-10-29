import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Download, Loader2, Lock, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { DustMark } from '@/components/DustMark';
import { useLanguage } from '@/contexts/LanguageContext';
import { AUDIENCE_PARAM, V2_QUESTIONS, type SurveyAudience } from '@/lib/assessment-v2';
import { PRESALES_QUESTIONS } from '@/lib/presales';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { getAdminKey } from '@/lib/access';
import { isDemoMode } from '@/demo/demo-data';

/**
 * One-pager sent to the client's champion before the survey links:
 * what the survey is, why we run it, what we need from them, what they get back, and the links.
 * `variant=deployment` (default) is sent by Deployment / CS at kickoff; `variant=sales` by Sales before the rollout.
 */
type KitVariant = 'deployment' | 'sales';

/** Loaded on click only: renders the page faithfully (fonts, rounded cards) for the PDF. */
const HTML_TO_IMAGE = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/+esm';

const ChampionKit = () => {
  const [params] = useSearchParams();
  const { language, setLanguage } = useLanguage();
  // ?lang=fr|en: open the kit in the campaign's language.
  useEffect(() => {
    const l = params.get('lang');
    if (l === 'fr' || l === 'en') setLanguage(l);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fr = language === 'fr';
  const L = (en: string, frText: string) => (fr ? frText : en);
  const [copied, setCopied] = useState(false);

  const variant: KitVariant = params.get('variant') === 'sales' ? 'sales' : 'deployment';
  const code = (params.get('code') || 'XXXXXXXX').toUpperCase();
  const company = params.get('company') || L('your company', 'votre entreprise');
  // Links always point to production, even when the kit is generated from a local copy.
  const origin = typeof window === 'undefined' || /localhost|127\.0\.0\.1/.test(window.location.hostname) ? 'https://dust-assessment.com' : window.location.origin;
  const linkFor = (a: SurveyAudience) =>
    `${origin}/assessment?lang=${language}&code=${code}${AUDIENCE_PARAM[a] ? `&for=${AUDIENCE_PARAM[a]}` : ''}`;
  // Pre-sales campaigns get a neutral diagnostic one-pager (no Dust rollout wording).
  const [presales, setPresales] = useState(params.get('for') === 'presales');
  useEffect(() => {
    if (code === 'XXXXXXXX') return;
    supabase.rpc('get_campaign_by_code' as never, { p_code: code } as never).then(({ data }) => {
      const row = (data as unknown as { audience?: string }[] | null)?.[0];
      if (row?.audience === 'presales') setPresales(true);
    });
  }, [code]);
  const areas = presales ? [
    L('AI use today', 'Usage de l’IA aujourd’hui'),
    L('Tools already used', 'Outils déjà utilisés'),
    L('Data and rules', 'Données et règles'),
    L('Working together', 'Travail entre équipes'),
    L('Where time goes', 'Temps perdu'),
    L('What holds back', 'Ce qui freine'),
  ] : [
    L('AI use today', 'Usage de l’IA aujourd’hui'),
    L('Ability to build agents', 'Capacité à construire des agents'),
    L('Motivation', 'Motivation'),
    L('Will to train others', 'Envie de former les autres'),
    L('Reach across teams', 'Rayonnement entre équipes'),
    L('Governance & trust', 'Gouvernance & confiance'),
    L('Team habits', 'Habitudes d’équipe'),
    L('Work to automate', 'Travail à automatiser'),
  ];

  const intro = presales
    ? L(
        `Before choosing anything, we'd like to understand how ${company}'s teams work today and where AI would really help. This short diagnostic gives a clear picture of the pain points, team by team.`,
        `Avant de choisir quoi que ce soit, nous aimerions comprendre comment travaillent les équipes de ${company} aujourd'hui et où l'IA les aiderait vraiment. Ce court diagnostic donne une image claire des irritants, équipe par équipe.`
      )
    : variant === 'sales'
      ? L(
          `Before ${company}'s rollout starts, we'd like to understand how your teams work with AI today. This short survey helps us scope the deployment around the teams and use cases that will bring the most value.`,
          `Avant le démarrage du déploiement chez ${company}, nous aimerions comprendre comment vos équipes utilisent l'IA aujourd'hui. Ce court questionnaire nous aide à cadrer le déploiement autour des équipes et des cas d'usage qui apporteront le plus de valeur.`
        )
      : L(
          `To prepare ${company}'s kickoff, we'd like to understand how your teams work with AI today. This short survey lets us start the rollout with a clear plan instead of a blank page.`,
          `Pour préparer le kickoff de ${company}, nous aimerions comprendre comment vos équipes utilisent l'IA aujourd'hui. Ce court questionnaire nous permet de démarrer le déploiement avec un plan clair plutôt qu'une page blanche.`
        );

  const presalesSections = [
    {
      title: L('What it is', 'De quoi il s’agit'),
      body: L(
        `A short online diagnostic, about 4 minutes: ${PRESALES_QUESTIONS.length} short statements plus a few questions on the tools people use, where they lose time and what holds them back. No account needed, English or French, answers saved as people go.`,
        `Un court diagnostic en ligne, environ 4 minutes : ${PRESALES_QUESTIONS.length} affirmations courtes et quelques questions sur les outils utilisés, le temps perdu et ce qui freine. Sans compte, en français ou en anglais, réponses enregistrées au fil de l'eau.`
      ),
    },
    {
      title: L('Why we run it', 'Pourquoi on le fait'),
      body: L(
        'To know where AI would help most before choosing a solution: the pain points that come up, the tools already used, and what stands in the way.',
        "Pour savoir où l'IA aiderait le plus avant de choisir une solution : les irritants qui reviennent, les outils déjà utilisés et ce qui bloque."
      ),
    },
    {
      title: L('What we need from you', 'Ce qu’on attend de vous'),
      body: L(
        'Forward the link below to the teams you want to include, ideally with a short word from you. A group of 30 to 50 people is enough to see the main topics.',
        "Transférer le lien ci-dessous aux équipes que vous voulez inclure, idéalement avec un petit mot de votre part. Un groupe de 30 à 50 personnes suffit pour voir les grands sujets."
      ),
    },
    {
      title: L('What you get back', 'Ce que vous obtenez'),
      body: L(
        'A shared summary: the pain points by team, how AI is already used (including outside approved tools), and the first use cases worth exploring together.',
        "Une synthèse partagée : les irritants par équipe, la façon dont l'IA est déjà utilisée (y compris hors des outils validés), et les premiers cas d'usage à étudier ensemble."
      ),
    },
  ];

  const sections = presales ? presalesSections : [
    {
      title: L('What it is', 'De quoi il s’agit'),
      body: L(
        `A short online survey, less than 5 minutes: ${V2_QUESTIONS.length} short statements plus a few questions about the tools people use and the tasks they would like help with. No account needed, English or French, answers saved as people go.`,
        `Un court questionnaire en ligne, moins de 5 minutes : ${V2_QUESTIONS.length} affirmations courtes et quelques questions sur les outils utilisés et les tâches où l'on aimerait de l'aide. Sans compte, en français ou en anglais, réponses enregistrées au fil de l'eau.`
      ),
    },
    {
      title: L('Why we run it', 'Pourquoi on le fait'),
      body:
        variant === 'sales'
          ? L(
              'So the rollout we propose fits how your teams actually work: which teams to start with, which 2–3 use cases to build first, and what support each team needs.',
              "Pour que le déploiement proposé corresponde à la façon dont vos équipes travaillent : par quelles équipes commencer, quels 2–3 cas d'usage construire d'abord, et quel accompagnement pour chaque équipe."
            )
          : L(
              'So the kickoff starts with the right people and the right use cases: which teams to start with, who can build agents, who will drive adoption, and who needs more support.',
              "Pour que le kickoff démarre avec les bonnes personnes et les bons cas d'usage : par quelles équipes commencer, qui peut construire des agents, qui portera l'adoption, et qui a besoin de plus d'accompagnement."
            ),
    },
    {
      title: L('What we need from you', 'Ce qu’on attend de vous'),
      body: L(
        'Forward the link below to the teams in scope, ideally with a short word from you. Aim for most people to answer within a week; one reminder halfway usually does it. You can follow answers live.',
        "Transférer le lien ci-dessous aux équipes concernées, idéalement avec un petit mot de votre part. L'objectif : que la majorité réponde en une semaine ; une relance à mi-parcours suffit en général. Vous pouvez suivre les réponses en direct."
      ),
    },
    {
      title: L('What you get back', 'Ce que vous obtenez'),
      body:
        variant === 'sales'
          ? L(
              'A readiness snapshot of your organization, by team: where AI is already used, where the quick wins are, and who can lead internally. It shapes the deployment plan we propose to you.',
              "Une photographie de votre organisation, équipe par équipe : où l'IA est déjà utilisée, où sont les gains rapides et qui peut porter le sujet en interne. Elle sert de base au plan de déploiement que nous vous proposons."
            )
          : L(
              'A shared view of the results: where each team stands, your future trainers, builders and champions by name, and the first use cases to build, reviewed together at kickoff. A second pass a few months later measures the progress.',
              'Une vue partagée des résultats : où en est chaque équipe, vos futurs formateurs, builders et champions nommément, et les premiers cas d’usage à construire, revus ensemble au kickoff. Un second passage quelques mois plus tard mesure la progression.'
            ),
    },
  ];

  const forwardMessage = presales ? L(
    `Hi all,\n\nWe are looking at how AI could help us day to day. Before deciding anything, we'd like your view: where you lose time, what you already use, what gets in the way.\n\nIt takes about 4 minutes: ${linkFor(presales ? 'presales' : 'general')}\n\nThanks!`,
    `Bonjour à tous,\n\nNous étudions comment l'IA pourrait nous aider au quotidien. Avant de décider quoi que ce soit, nous aimerions votre avis : où vous perdez du temps, ce que vous utilisez déjà, ce qui vous freine.\n\nCela prend environ 4 minutes : ${linkFor(presales ? 'presales' : 'general')}\n\nMerci !`
  ) : L(
    `Hi all,\n\nDust is our new AI platform. The Dust team wants to learn more about you and what you do, so the rollout fits the way we work.\n\nIt takes less than 5 minutes: ${linkFor(presales ? 'presales' : 'general')}\n\nThanks!`,
    `Bonjour à tous,\n\nDust est notre nouvelle plateforme d'IA. L'équipe Dust veut en savoir plus sur vous et sur ce que vous faites, pour que le déploiement colle à notre façon de travailler.\n\nCela prend moins de 5 minutes : ${linkFor(presales ? 'presales' : 'general')}\n\nMerci !`
  );

  // Private results link for the client's project lead. Only the Dust team (admin key) can read it,
  // and it sits apart from everything meant to be forwarded.
  const [resultsKey, setResultsKey] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(true);
  useEffect(() => {
    if ((!getAdminKey() && !isDemoMode()) || code === 'XXXXXXXX') return;
    supabase
      .from('campaigns')
      .select('access_key' as never)
      .eq('code', code)
      .maybeSingle()
      .then(({ data }) => setResultsKey((data as { access_key?: string } | null)?.access_key ?? null));
  }, [code]);
  const resultsUrl = resultsKey ? `${origin}/results?key=${resultsKey}` : null;

  // Clean one-page A4 PDF of the one-pager, with the links still clickable.
  const articleRef = useRef<HTMLElement>(null);
  const [downloading, setDownloading] = useState(false);
  const downloadPdf = async () => {
    const art = articleRef.current;
    if (!art) return;
    setDownloading(true);
    try {
      await document.fonts.ready;
      const [{ toJpeg }, { default: jsPDF }] = await Promise.all([
        import(/* @vite-ignore */ HTML_TO_IMAGE) as Promise<{
          toJpeg: (n: HTMLElement, o: Record<string, unknown>) => Promise<string>;
        }>,
        import('jspdf'),
      ]);
      const hide = (n: HTMLElement) => !(n.classList && n.classList.contains('print:hidden'));
      // Same desktop layout whatever the screen: fixed width, cards two by two.
      art.dataset.capture = 'true';
      await new Promise((r) => setTimeout(r, 60));
      const img = await toJpeg(art, { pixelRatio: 2, quality: 0.92, backgroundColor: '#FFFFFF', filter: hide });
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      const margin = 10;
      const box = art.getBoundingClientRect();
      const maxW = 210 - 2 * margin;
      const maxH = 297 - 2 * margin;
      const scale = Math.min(maxW / box.width, maxH / box.height);
      const w = box.width * scale;
      const x0 = (210 - w) / 2;
      pdf.addImage(img, 'JPEG', x0, margin, w, box.height * scale);
      art.querySelectorAll('a[href]').forEach((a) => {
        const r = a.getBoundingClientRect();
        pdf.link(x0 + (r.left - box.left) * scale, margin + (r.top - box.top) * scale, r.width * scale, r.height * scale, { url: (a as HTMLAnchorElement).href });
      });
      delete art.dataset.capture;
      pdf.setProperties({ title: `Dust · ${company}`, subject: L('Deployment scoping', 'Cadrage du déploiement') });
      pdf.save(`Dust one-pager - ${company}.pdf`);
    } catch {
      window.print();
    } finally {
      delete art.dataset.capture;
      setDownloading(false);
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(forwardMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable: the text stays selectable on the page */
    }
  };

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Toolbar (hidden when printing) */}
      <header className="sticky top-0 z-10 border-b border-border bg-card print:hidden">
        <div className="mx-auto flex h-14 max-w-[820px] items-center justify-between gap-3 px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              {L('Back to the console', 'Retour à la console')}
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            {/* The kit follows the campaign type: no version to pick. */}
            <span className="hidden rounded-full bg-paper px-3 py-1 text-[12px] font-medium text-muted-foreground ring-1 ring-border sm:inline">
              {presales ? L('AI diagnostic', 'Diagnostic IA') : L('Deployment', 'Déploiement')}
            </span>
            {resultsUrl && (
              <label className="hidden items-center gap-1.5 text-[12px] text-muted-foreground sm:flex">
                <input type="checkbox" checked={showResults} onChange={(e) => setShowResults(e.target.checked)} />
                {L('Private results link', 'Lien privé des résultats')}
              </label>
            )}
            <LanguageSwitcher compact />
            <Button size="sm" variant="outline" onClick={() => window.print()} aria-label={L('Print', 'Imprimer')}>
              <Printer className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={downloadPdf} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {L('Download PDF', 'Télécharger le PDF')}
            </Button>
          </div>
        </div>
      </header>

      {/* The one-pager */}
      <main className="mx-auto max-w-[820px] px-4 py-8 print:max-w-none print:p-0">
        <article ref={articleRef} data-kit className="rounded-2xl bg-card p-8 shadow-sm ring-1 ring-border print:rounded-none print:p-0 print:shadow-none print:ring-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <DustMark className="h-6 w-6" />
              <span className="text-[15px] font-semibold text-foreground">Dust</span>
              <span className="h-4 w-px bg-border" aria-hidden />
              <span className="text-[13px] text-muted-foreground">{L('Deployment scoping', 'Cadrage du déploiement')}</span>
            </div>
            <span className="text-[12px] text-muted-foreground">
              {presales ? L('AI diagnostic', 'Diagnostic IA') : variant === 'sales' ? L('Before the rollout', 'Avant le déploiement') : L('Kickoff preparation', 'Préparation du kickoff')}
            </span>
          </div>

          <h1 className="mt-6 text-[28px] font-semibold leading-tight tracking-tight text-foreground">
            {presales
              ? L(`A short AI diagnostic for ${company}'s teams`, `Un court diagnostic IA pour les équipes de ${company}`)
              : L(`A short survey to prepare ${company}'s AI rollout`, `Un court questionnaire pour préparer le déploiement IA de ${company}`)}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate">{intro}</p>

          <div className="kit-grid mt-6 grid gap-4 sm:grid-cols-2 print:grid-cols-2">
            {sections.map((s) => (
              <section key={s.title} className="rounded-xl bg-paper p-4 ring-1 ring-border print:break-inside-avoid">
                <h2 className="text-[14px] font-semibold text-foreground">{s.title}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
              </section>
            ))}
          </div>

          <section className="mt-6 print:break-inside-avoid">
            <h2 className="text-[14px] font-semibold text-foreground">{L('What we look at', 'Ce qu’on regarde')}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {areas.map((a) => (
                <span key={a} className="rounded-full bg-paper px-2.5 py-1 text-[12px] text-foreground ring-1 ring-border">{a}</span>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-muted-foreground">
              {L('Plus open questions on time sinks, the tasks people would hand over to an agent, and what could block them.', 'Plus des questions ouvertes sur les pertes de temps, les tâches à confier à un agent et ce qui pourrait bloquer.')}
            </p>
          </section>

          {resultsUrl && showResults && (
            <section className="mt-6 rounded-xl bg-warn-soft p-4 ring-1 ring-warn/30 print:break-inside-avoid">
              <h2 className="flex items-center gap-1.5 text-[14px] font-semibold text-foreground">
                <Lock className="h-4 w-4" />
                {L('Your private results link · for you only', 'Votre lien privé des résultats · pour vous uniquement')}
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-foreground/80">
                {L(
                  'Live results with everyone’s individual answers, for you and the project team. Do not forward it to employees, and do not share this page with them: send them only the link below.',
                  'Les résultats en direct, avec les réponses individuelles de chacun, pour vous et l’équipe projet. Ne le transférez pas aux collaborateurs et ne leur partagez pas cette page : envoyez-leur seulement le lien ci-dessous.'
                )}
              </p>
              <a href={resultsUrl} className="mt-2 block break-all font-mono text-[12px] text-foreground underline-offset-2 hover:underline">
                {resultsUrl}
              </a>
            </section>
          )}

          <section className="mt-6 print:break-inside-avoid">
            <h2 className="text-[14px] font-semibold text-foreground">{L('Link to forward', 'Lien à transférer')}</h2>
            <a href={linkFor(presales ? 'presales' : 'general')} className="mt-2 block break-all rounded-xl px-4 py-3 font-mono text-[13px] text-brand-ink ring-1 ring-border underline-offset-2 hover:underline">
              {linkFor(presales ? 'presales' : 'general')}
            </a>
          </section>

          <section className="mt-6 print:break-inside-avoid">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[14px] font-semibold text-foreground">{L('Suggested message for your teams', 'Message suggéré pour vos équipes')}</h2>
              <Button variant="outline" size="sm" className="print:hidden" onClick={copyMessage}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? L('Copied', 'Copié') : L('Copy', 'Copier')}
              </Button>
            </div>
            <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-paper p-4 font-sans text-[13px] leading-relaxed text-foreground ring-1 ring-border">{forwardMessage}</pre>
          </section>

          <p className="mt-6 border-t border-border pt-4 text-[12px] text-muted-foreground">
            {L(
              `Results are shared with the project team at ${company} and with Dust, and only used to plan and follow the rollout. Questions? Reply to the person who sent you this page.`,
              `Les résultats sont partagés avec l'équipe projet de ${company} et avec Dust, et servent uniquement à préparer et suivre le déploiement. Une question ? Répondez à la personne qui vous a envoyé cette page.`
            )}
          </p>
        </article>
      </main>
    </div>
  );
};

export default ChampionKit;
