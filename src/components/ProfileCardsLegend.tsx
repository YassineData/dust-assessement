import { useLanguage } from '@/contexts/LanguageContext';
import { PROFILE_COLORS } from '@/lib/profile-style';
import { RESULT_CLASSES } from '@/lib/assessment-v2';

/** Legend of the six result classes: rule, meaning and what to do (spec v2, "Result classes"). */
export const ProfileCardsLegend = () => {
  const { language } = useLanguage();
  const fr = language !== 'en';

  return (
    <section className="card-elevated p-5">
      <div className="mb-3">
        <h3 className="card-title">{fr ? 'Légende des profils' : 'Profile Legend'}</h3>
        <p className="text-[12px] text-muted-foreground">
          {fr
            ? 'Des signaux, pas des verdicts. La première règle qui correspond s’applique ; toujours confirmer avant de nommer un formateur.'
            : 'Signals, not verdicts. The first matching rule applies; always confirm before naming anyone a trainer.'}
        </p>
      </div>
      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        {RESULT_CLASSES.map((c, i) => (
          <div key={c.id} className="flex gap-2.5">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: PROFILE_COLORS[c.id] }} aria-hidden />
            <div className="min-w-0">
              <dt className="text-[13px] font-semibold text-foreground">
                <span className="mono mr-1.5 text-[11px] text-outline">{i + 1}</span>
                {fr ? c.name.fr : c.name.en}
              </dt>
              <dd className="mt-0.5 space-y-1 text-[12px] leading-relaxed text-muted-foreground">
                <p className="mono text-[11px] text-outline">{fr ? c.rule.fr : c.rule.en}</p>
                <p className="text-foreground/80">{fr ? c.meaning.fr : c.meaning.en}</p>
                <p><span className="font-medium text-foreground">{fr ? 'À faire : ' : 'Next: '}</span>{fr ? c.action.fr : c.action.en}</p>
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
};
