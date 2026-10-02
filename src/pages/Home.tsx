import { useState, type CSSProperties } from 'react';
import { ArrowRight, BarChart3, ChevronDown, Eye, GraduationCap, LogIn, Rocket, Smartphone, Timer, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { DustWordmark } from '@/components/DustMark';
import { Reveal } from '@/components/Reveal';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProductStory } from '@/components/home/ProductStory';

/* The Dust brand shapes (brand guide: circle, arch, square, quarter circles), in brand colors. */
type Shape = 'circle' | 'arch' | 'square' | 'quarterR' | 'quarterL';
const RADIUS: Record<Shape, string> = {
  circle: '9999px',
  arch: '9999px 9999px 0 0',
  square: '0',
  quarterR: '0 100% 0 0',
  quarterL: '100% 0 0 0',
};
const GRID: { shape: Shape; color: string; spin?: boolean }[] = [
  { shape: 'circle', color: '#418B5C' },
  { shape: 'arch', color: '#9FDBFF' },
  { shape: 'quarterR', color: '#1C91FF', spin: true },
  { shape: 'square', color: '#FFC3DF' },
  { shape: 'quarterL', color: '#FE9C1A', spin: true },
  { shape: 'circle', color: '#E2F78C' },
  { shape: 'arch', color: '#FFE262' },
  { shape: 'quarterR', color: '#E14322', spin: true },
  { shape: 'square', color: '#1C91FF' },
];

const ShapeGrid = () => (
  <div className="grid grid-cols-3 gap-2.5 sm:gap-3" aria-hidden="true">
    {GRID.map((g, i) => (
      <div
        key={i}
        className={g.spin ? 'home-shape home-shape-spin' : 'home-shape'}
        style={{ background: g.color, borderRadius: RADIUS[g.shape], '--d': `${i * 90}ms`, '--s': `${i * 1.3}s` } as CSSProperties}
      />
    ))}
  </div>
);

const ShapeRow = () => (
  <div className="flex gap-1.5" aria-hidden="true">
    {GRID.slice(0, 5).map((g, i) => (
      <div key={i} className="home-shape h-4 w-4" style={{ background: g.color, borderRadius: RADIUS[g.shape], '--d': `${i * 80}ms` } as CSSProperties} />
    ))}
  </div>
);

/**
 * Public home page (dust-assessment.com), written for the manager running the Dust rollout at the
 * client: why the survey is worth five minutes of their teams' time and what they get back.
 * Respondents can still enter a code. The internal pitch for the Dust team lives at /internal.
 */
const Home = () => {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const L = (en: string, frText: string) => (fr ? frText : en);
  const [code, setCode] = useState('');

  const openCode = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    // Full page load so the startup checks (demo vs real campaign) run for this code.
    if (c) window.location.assign(`/assessment?lang=${language}&code=${c}`);
  };

  const problems = [
    { title: L('Everyone gets the same training', 'La même formation pour tous'), body: L('Power users get bored, beginners get lost, adoption stalls.', 'Les avancés s’ennuient, les débutants décrochent, l’adoption cale.') },
    { title: L('First use cases are guessed', 'Des cas d’usage devinés'), body: L('Picked in a meeting room, not from the work people actually do.', 'Choisis en réunion, pas à partir du travail réel des équipes.') },
    { title: L('Champions are found by luck', 'Des champions trouvés par hasard'), body: L('The people who could carry adoption stay invisible for months, call after call.', 'Ceux qui pourraient porter l’adoption restent invisibles pendant des mois.') },
  ];

  const faq = [
    { q: L('Is it anonymous?', 'Est-ce anonyme ?'), a: L('No: people give their name so we can find the right relays in each team. But only the Dust team and their project lead see the answers, and nobody is evaluated on them.', 'Non : chacun donne son nom pour qu’on trouve les bons relais dans chaque équipe. Mais seuls l’équipe Dust et leur chef de projet voient les réponses, et personne n’est évalué dessus.') },
    { q: L('Who should answer?', 'Qui doit répondre ?'), a: L('Everyone in the teams that will use Dust, not only the enthusiasts. The more people answer, the more reliable the picture.', 'Toutes les personnes des équipes qui vont utiliser Dust, pas seulement les enthousiastes. Plus il y a de réponses, plus la vue est fiable.') },
    { q: L('What do people see at the end?', 'Que voient les gens à la fin ?'), a: L('A thank-you screen. No score and no label: profiles are for planning the rollout, and they are always confirmed in conversation.', 'Un écran de remerciement. Ni score ni étiquette : les profils servent à préparer le déploiement, et ils sont toujours confirmés en discutant.') },
    { q: L('What do they receive?', 'Qu’est-ce qu’ils reçoivent ?'), a: L('A private link to their results, updated live, plus a one-page summary and a kickoff deck for the readout.', 'Un lien privé vers leurs résultats, à jour en direct, plus une synthèse d’une page et un deck de kickoff pour la restitution.') },
    { q: L('Which languages?', 'Quelles langues ?'), a: L('English and French. Each person can switch at any time.', 'Anglais et français. Chacun peut changer à tout moment.') },
  ];

  const blocks = [
    { n: 1, color: '#1C91FF', title: L('Where their teams stand', 'Où en sont leurs équipes'), body: L('A readiness score for the account, by team and by area, compared with our other rollouts.', 'Un score pour le compte, par équipe et par domaine, comparé à nos autres déploiements.') },
    { n: 2, color: '#418B5C', title: L('Who will carry the rollout', 'Qui portera le déploiement'), body: L('By name: who can train others, who can build agents, who connects teams, who should sponsor, and who needs convincing.', 'Nommément : qui peut former les autres, qui peut construire des agents, qui relie les équipes, qui doit sponsoriser, et qui est à convaincre.') },
    { n: 3, color: '#FE9C1A', title: L('What to do first', 'Par quoi commencer'), body: L('Next steps and the first agents to build, drawn from what their teams wrote in their own words.', 'Les prochaines étapes et les premiers agents à construire, tirés de ce que leurs équipes ont écrit avec leurs mots.') },
  ];

  const gains = [
    { icon: Zap, title: L('Sales: map the account before signature', 'Sales : cartographier le compte avant la signature'), body: L('Readiness, sponsors and use cases in the customer’s words, to support closing and size the deal.', 'Maturité, sponsors et cas d’usage dans les mots du client, pour appuyer le closing et dimensionner le deal.') },
    { icon: GraduationCap, title: L('ADS: a kickoff built on data', 'ADS : un kickoff construit sur des données'), body: L('Train-the-trainer staffed with the right people from day one, and the first agents teams asked for.', 'Un train-the-trainer avec les bonnes personnes dès le premier jour, et les premiers agents demandés par les équipes.') },
    { icon: BarChart3, title: L('CS: a baseline for renewals', 'CS : une baseline pour les renouvellements'), body: L('Run it again a few months later to show progress at QBRs and spot expansion signals.', 'Relancez-le quelques mois plus tard pour montrer les progrès en QBR et repérer les opportunités d’expansion.') },
    { icon: Users, title: L('Everyone: data across accounts', 'Tout le monde : des données sur tous les comptes'), body: L('Compare accounts and rollouts, and see the pain points that come up again and again.', 'Comparez les comptes et les déploiements, et voyez les irritants qui reviennent.') },
  ];

  const asks = [
    { icon: Timer, text: L('Less than 5 minutes per person', 'Moins de 5 minutes par personne') },
    { icon: Smartphone, text: L('One link, no account, phone or laptop', 'Un lien, pas de compte, mobile ou ordinateur') },
    { icon: Rocket, text: L('A one-pager and a ready-made message to forward', 'Un one-pager et un message prêt à transférer') },
  ];

  const weeks = [
    { when: L('Step 1', 'Étape 1'), title: L('Create the campaign', 'Créez la campagne'), body: L('Sign in, create the link, send the one-pager and message to the customer’s project lead.', 'Connectez-vous, créez le lien, envoyez le one-pager et le message au chef de projet du client.') },
    { when: L('Step 2', 'Étape 2'), title: L('Their teams answer', 'Leurs équipes répondent'), body: L('You and the customer follow the responses live.', 'Vous et le client suivez les réponses en direct.') },
    { when: L('Step 3', 'Étape 3'), title: L('Readout with the customer', 'Restitution avec le client'), body: L('Thirty minutes with the one-page summary and the kickoff deck. It shapes the kickoff.', 'Trente minutes avec la synthèse et le deck de kickoff. Elle prépare le kickoff.') },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between px-4">
          <DustWordmark subtitle={L('Deployment scoping · for the Dust team', 'Cadrage du déploiement · équipe Dust')} />
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <a href="/login">
                <LogIn className="h-3.5 w-3.5" />
                {L('Sign in', 'Connexion')}
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-[1120px] items-center gap-12 px-4 pb-16 pt-12 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-14">
          <div className="home-rise">
            <ShapeRow />
            <p className="eyebrow mt-5">{L('For the Dust team · Sales, ADS, CS', 'Pour l’équipe Dust · Sales, ADS, CS')}</p>
            <h1 className="mt-3 text-[38px] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground sm:text-[54px]">
              {L('Know your customer’s teams before you deploy.', 'Connaissez les équipes du client avant de déployer.')}
            </h1>
            <p className="mt-5 max-w-[580px] text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
              {L(
                'A five-minute survey you send to a customer’s teams. Before the kickoff, you know where each team stands, who can carry the rollout and what to build first.',
                'Un questionnaire de cinq minutes à envoyer aux équipes d’un client. Avant le kickoff, vous savez où en est chaque équipe, qui peut porter le déploiement et quoi construire en premier.'
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <Button asChild size="lg">
                <a href="/results?key=demo-velor119">
                  <Eye className="h-4 w-4" />
                  {L('See sample results', 'Voir un exemple de résultats')}
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={`/assessment?preview=1&lang=${language}`}>
                  {L('Preview the survey', 'Voir le questionnaire')}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
            <p className="mt-3 text-[12px] text-muted-foreground">{L('The sample uses a fictional company. Nothing is saved.', 'L’exemple utilise une entreprise fictive. Rien n’est enregistré.')}</p>
          </div>

          <div className="home-rise w-full" style={{ animationDelay: '200ms' }}>
            <ProductStory lang={fr ? 'fr' : 'en'} />
          </div>
        </section>

        {/* Why: the problem it solves */}
        <section className="border-t border-border">
          <div className="mx-auto grid max-w-[1080px] gap-10 px-4 py-16 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-center">
            <div>
              <Reveal>
                <p className="eyebrow">{L('Why a survey first', 'Pourquoi un questionnaire d’abord')}</p>
                <h2 className="mt-2 max-w-[640px] text-[28px] font-semibold tracking-[-0.01em] text-foreground">
                  {L('AI rollouts rarely stall on the technology. They stall on people.', 'Les déploiements IA calent rarement sur la technologie. Ils calent sur les gens.')}
                </h2>
              </Reveal>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {problems.map((pb, i) => (
                  <Reveal key={pb.title} delay={i * 100}>
                    <div className="h-full border-t-2 border-ink pt-4">
                      <h3 className="text-[15px] font-semibold text-foreground">{pb.title}</h3>
                      <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{pb.body}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
            <div className="mx-auto hidden w-[260px] lg:block">
              <ShapeGrid />
            </div>
          </div>
        </section>

        {/* What you get */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto max-w-[1080px] px-4 py-16">
            <Reveal>
              <p className="eyebrow">{L('What you get', 'Ce que vous obtenez')}</p>
              <h2 className="mt-2 max-w-[720px] text-[28px] font-semibold tracking-[-0.01em] text-foreground">{L('One clear picture of each account, in three parts.', 'Une vue claire de chaque compte, en trois parties.')}</h2>
            </Reveal>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {blocks.map((b, i) => (
                <Reveal key={b.n} delay={i * 110}>
                  <div className="h-full rounded-xl bg-background p-5 ring-1 ring-border">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold text-white" style={{ background: b.color }}>{b.n}</span>
                    <h3 className="mt-4 text-[17px] font-semibold text-foreground">{b.title}</h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">{b.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Why it helps you */}
        <section className="mx-auto max-w-[1080px] px-4 py-16">
          <Reveal>
            <p className="eyebrow">{L('Why it helps us', 'Ce que ça nous apporte')}</p>
            <h2 className="mt-2 max-w-[720px] text-[28px] font-semibold tracking-[-0.01em] text-foreground">{L('Deploy with data, not guesswork.', 'Déployer avec la donnée, pas à l’intuition.')}</h2>
          </Reveal>
          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {gains.map((g, i) => (
              <Reveal key={g.title} delay={(i % 2) * 100}>
                <div className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-ink">
                    <g.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-[16px] font-semibold text-foreground">{g.title}</h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{g.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* What it asks, and how it runs */}
        <section className="border-y border-border bg-card">
          <div className="mx-auto grid max-w-[1080px] gap-12 px-4 py-16 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Reveal>
              <p className="eyebrow">{L('What it asks of the customer', 'Ce que ça demande au client')}</p>
              <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.01em] text-foreground">{L('Very little.', 'Très peu.')}</h2>
              <ul className="mt-5 space-y-3">
                {asks.map((a) => (
                  <li key={a.text} className="flex items-center gap-3 text-[14px] text-foreground">
                    <a.icon className="h-4 w-4 shrink-0 text-brand-ink" />
                    {a.text}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={100}>
              <p className="eyebrow">{L('How it runs', 'Comment ça se passe')}</p>
              <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                {weeks.map((w) => (
                  <li key={w.title} className="rounded-xl bg-background p-4 ring-1 ring-border">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-brand-ink">{w.when}</p>
                    <h3 className="mt-2 text-[15px] font-semibold text-foreground">{w.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{w.body}</p>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-[780px] px-4 pt-16">
          <Reveal>
            <p className="eyebrow">{L('Questions', 'Questions')}</p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.01em] text-foreground">{L('What customers usually ask.', 'Ce que les clients demandent souvent.')}</h2>
          </Reveal>
          <div className="mt-6 divide-y divide-border rounded-xl bg-card ring-1 ring-border">
            {faq.map((f) => (
              <details key={f.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-foreground">
                  {f.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Data */}
        <section className="mx-auto max-w-[1080px] px-4 py-16">
          <Reveal>
            <div className="grid gap-6 rounded-2xl bg-ink p-7 text-white sm:p-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-sky">{L('Customer answers', 'Les réponses des clients')}</p>
                <h2 className="mt-2 text-[24px] font-semibold leading-snug">{L('Only used to plan the rollout. Never to evaluate anyone.', 'Utilisées pour préparer le déploiement. Jamais pour évaluer qui que ce soit.')}</h2>
                <p className="mt-3 max-w-[620px] text-[14px] leading-relaxed text-white/75">
                  {L(
                    'Only the Dust team and the customer’s project lead see the results, through a private link. Anyone can ask for their answers to be deleted.',
                    'Seuls l’équipe Dust et le chef de projet du client voient les résultats, via un lien privé. Chacun peut demander la suppression de ses réponses.'
                  )}
                </p>
              </div>
              <Button asChild variant="secondary" className="justify-self-start">
                <a href="https://dust.tt" target="_blank" rel="noopener noreferrer">
                  {L('Discover Dust', 'Découvrir Dust')}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </Reveal>
        </section>

        {/* Next step + respondents' code */}
        <section className="mx-auto grid max-w-[1080px] gap-6 px-4 pb-20 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl bg-brand-strong p-7 text-white sm:p-8">
              <h2 className="text-[22px] font-semibold leading-snug">{L('Running a kickoff or a pre-pilot?', 'Un kickoff ou un pré-pilote en vue ?')}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-white/90">
                {L('Sign in with your Dust email and create a campaign in 2 minutes. Questions: ping Yassine.', 'Connectez-vous avec votre email Dust et créez une campagne en 2 minutes. Une question : demandez à Yassine.')}
              </p>
              <Button asChild variant="secondary" className="mt-5">
                <a href="/login">
                  <LogIn className="h-4 w-4" />
                  {L('Sign in', 'Se connecter')}
                </a>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <form onSubmit={openCode} className="h-full rounded-2xl bg-card p-7 ring-1 ring-border sm:p-8">
              <label htmlFor="home-code" className="text-[15px] font-semibold text-foreground">
                {L('Invited to answer? Enter your code.', 'Invité à répondre ? Entrez votre code.')}
              </label>
              <div className="mt-3 flex gap-2">
                <Input
                  id="home-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={L('E.g. ACME1234', 'Ex : ACME1234')}
                  autoComplete="off"
                  className="font-mono uppercase tracking-wider placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
                />
                <Button type="submit" disabled={!code.trim()}>
                  {L('Start', 'Commencer')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground">
                {L('With a link, just open it: you will land straight on the survey.', 'Avec un lien, ouvrez-le simplement : vous arriverez directement sur le questionnaire.')}
              </p>
            </form>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-2 px-4 py-6 text-[12px] text-muted-foreground">
          <span>© {new Date().getFullYear()} Dust · {L('Deployment scoping', 'Cadrage du déploiement')}</span>
          <a href="https://dust.tt" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">dust.tt</a>
        </div>
      </footer>
    </div>
  );
};

export default Home;
