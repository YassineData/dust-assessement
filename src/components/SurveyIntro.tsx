import { Save, ShieldCheck, Target, Timer, Sparkles, Compass } from 'lucide-react';
import { DustMark } from '@/components/DustMark';
import { AUDIENCES, DUST_ABOUT, V2_QUESTIONS, type SurveyAudience } from '@/lib/assessment-v2';

/** Header of the survey: who Dust is, what the survey is for, why it matters and what comes out of it. */
export const SurveyIntro = ({ audience, fr }: { audience: SurveyAudience; fr: boolean }) => {
  const a = AUDIENCES[audience];
  const L = (x: { en: string; fr: string }) => (fr ? x.fr : x.en);
  const minutes = Math.max(5, Math.round(V2_QUESTIONS.length / 4.5));

  const items = [
    { icon: Compass, title: fr ? 'À quoi ça sert' : "What it's for", body: L(a.whatFor) },
    { icon: Target, title: fr ? 'Pourquoi c’est important' : 'Why it matters', body: L(a.whyItMatters) },
    { icon: Sparkles, title: fr ? 'Ce qui en ressort' : 'What comes out of it', body: L(a.output) },
  ];

  return (
    <section className="card-elevated overflow-hidden">
      <div className="border-b border-border bg-paper px-5 py-4">
        <div className="flex items-center gap-2">
          <DustMark className="h-5 w-5" />
          <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {fr ? 'Un questionnaire Dust' : 'A Dust survey'}
          </span>
        </div>
        <h1 className="page-title mt-2">{L(a.title)}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-slate">{L(DUST_ABOUT)}</p>
      </div>
      <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
        {items.map(({ icon: Icon, title, body }) => (
          <div key={title}>
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
              <Icon className="h-4 w-4 text-brand-ink" />
              {title}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border px-5 py-3 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Timer className="h-3.5 w-3.5" />{fr ? `Environ ${minutes} minutes` : `About ${minutes} minutes`}</span>
        <span className="inline-flex items-center gap-1.5"><Save className="h-3.5 w-3.5" />{fr ? 'Réponses enregistrées au fil de l’eau' : 'Answers saved as you go'}</span>
        <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />{fr ? 'Utilisé uniquement pour préparer le déploiement' : 'Only used to plan the rollout'}</span>
      </div>
    </section>
  );
};
