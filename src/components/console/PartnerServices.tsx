import { useMemo, useState } from 'react';
import { Check, Copy, Handshake } from 'lucide-react';
import { CampaignParticipant } from '@/hooks/useCampaignParticipants';
import { SectionCard } from '@/components/console/SectionCard';
import { cn } from '@/lib/utils';

type Need = 'high' | 'medium' | 'covered';
type L = { en: string; fr: string };

interface Signals {
  n: number;
  dims: Record<string, number>;
  sponsors: number;
  trainers: number;
  builders: number;
  useCases: number;
}

interface Service {
  id: string;
  name: L;
  what: L;
  /** Who usually carries it. Draft taxonomy, to be aligned with the Partnerships service map. */
  owner: L;
  partners: string;
  assess: (s: Signals) => { need: Need; why: L };
}

const pct = (a: number, n: number) => (n ? Math.round((a / n) * 100) : 0);

/** Draft service catalog: each service is triggered by survey signals. */
const SERVICES: Service[] = [
  {
    id: 'pmo',
    name: { en: 'Project ownership', fr: 'Pilotage du projet' },
    what: { en: 'An interim project owner who runs the plan, the stakeholders and the follow-up.', fr: 'Un pilote de projet par intérim qui tient le plan, les parties prenantes et le suivi.' },
    owner: { en: 'Partner', fr: 'Partenaire' },
    partners: 'Montoo, Wavestone',
    assess: (s) => {
      const need: Need = s.sponsors === 0 ? 'high' : s.sponsors < Math.max(2, s.n / 100) ? 'medium' : 'covered';
      return {
        need,
        why: {
          en: `${s.sponsors} sponsor profile${s.sponsors === 1 ? '' : 's'} out of ${s.n} respondents.`,
          fr: `${s.sponsors} profil${s.sponsors > 1 ? 's' : ''} sponsor sur ${s.n} répondants.`,
        },
      };
    },
  },
  {
    id: 'gov',
    name: { en: 'Governance & AI policy', fr: 'Gouvernance et politique IA' },
    what: { en: 'Data rules, admin roles, and when an agent is considered ready for everyone.', fr: 'Règles sur les données, rôles admin, et quand un agent est prêt pour tout le monde.' },
    owner: { en: 'Partner + Dust', fr: 'Partenaire + Dust' },
    partners: 'Artifact, Wavestone',
    assess: (s) => {
      const g = s.dims.gov ?? 0;
      return { need: g < 50 ? 'high' : g < 65 ? 'medium' : 'covered', why: { en: `Governance & trust at ${g}/100.`, fr: `Gouvernance et confiance à ${g}/100.` } };
    },
  },
  {
    id: 'change',
    name: { en: 'Change management & internal comms', fr: 'Conduite du changement et communication' },
    what: { en: 'Launch plan, internal messaging, team rituals so adoption does not stay in pockets.', fr: 'Plan de lancement, messages internes, rituels d’équipe pour que l’adoption ne reste pas isolée.' },
    owner: { en: 'Partner or customer', fr: 'Partenaire ou client' },
    partners: 'Niji, Devoteam',
    assess: (s) => {
      const t = s.dims.team ?? 0;
      const w = s.dims.will ?? 0;
      const low = Math.min(t, w);
      return {
        need: low < 50 ? 'high' : low < 65 ? 'medium' : 'covered',
        why: { en: `Team habits ${t}/100, motivation ${w}/100.`, fr: `Habitudes d’équipe ${t}/100, motivation ${w}/100.` },
      };
    },
  },
  {
    id: 'trainers',
    name: { en: 'Train-the-trainer', fr: 'Formation des formateurs' },
    what: { en: 'Train internal trainers so enablement scales without Dust in every session.', fr: 'Former des formateurs internes pour que la formation passe à l’échelle sans Dust à chaque session.' },
    owner: { en: 'Dust + partner', fr: 'Dust + partenaire' },
    partners: 'WeZype, Argon',
    assess: (s) => {
      const target = Math.max(2, Math.round(s.n / 30));
      if (s.dims.teach === undefined) {
        return { need: 'medium', why: { en: 'Not measured by this questionnaire: to check at kickoff.', fr: 'Pas mesuré par ce questionnaire : à vérifier au kickoff.' } };
      }
      const t = s.dims.teach;
      const need: Need = s.trainers < target / 2 || t < 50 ? 'high' : s.trainers < target || t < 65 ? 'medium' : 'covered';
      return {
        need,
        why: {
          en: `${s.trainers} trainer profile${s.trainers === 1 ? '' : 's'} (about ${target} needed), teaching posture ${t}/100.`,
          fr: `${s.trainers} profil${s.trainers > 1 ? 's' : ''} formateur (environ ${target} nécessaires), posture de formation ${t}/100.`,
        },
      };
    },
  },
  {
    id: 'usecases',
    name: { en: 'Deep use-case build', fr: 'Use cases en profondeur' },
    what: { en: 'Pick the highest-value workflows and build agents end to end, with measured ROI.', fr: 'Choisir les processus à plus forte valeur et construire les agents de bout en bout, ROI mesuré.' },
    owner: { en: 'Partner', fr: 'Partenaire' },
    partners: 'Niji, Artifact',
    assess: (s) => {
      const p = s.dims.pain ?? 0;
      const share = pct(s.useCases, s.n);
      const need: Need = p >= 65 && share >= 30 ? 'high' : p >= 55 ? 'medium' : 'covered';
      return {
        need,
        why: {
          en: `Work to automate ${p}/100; ${share}% named a task to hand over to an agent.`,
          fr: `Travail à automatiser ${p}/100 ; ${share} % ont cité une tâche à confier à un agent.`,
        },
      };
    },
  },
  {
    id: 'builders',
    name: { en: 'Agent building support', fr: 'Appui à la construction d’agents' },
    what: { en: 'Extra builders while internal builders ramp up.', fr: 'Des builders en renfort le temps que les builders internes montent en compétence.' },
    owner: { en: 'Dust + partner', fr: 'Dust + partenaire' },
    partners: 'WeZype, Avisia',
    assess: (s) => {
      const d = s.dims.depth ?? 0;
      const need: Need = d < 45 && s.builders < 3 ? 'high' : d < 60 ? 'medium' : 'covered';
      return {
        need,
        why: {
          en: `Ability to build agents ${d}/100; ${s.builders} builder profile${s.builders === 1 ? '' : 's'}.`,
          fr: `Capacité à construire des agents ${d}/100 ; ${s.builders} profil${s.builders > 1 ? 's' : ''} builder.`,
        },
      };
    },
  },
];

const NEED_STYLE: Record<Need, { pill: string; label: L }> = {
  high: { pill: 'pill-red', label: { en: 'Needed', fr: 'Nécessaire' } },
  medium: { pill: 'pill-amber', label: { en: 'To discuss', fr: 'À discuter' } },
  covered: { pill: 'pill-green', label: { en: 'Covered', fr: 'Couvert' } },
};

const ORDER: Record<Need, number> = { high: 0, medium: 1, covered: 2 };

/** Dust team only: which services this account needs from a partner, read from the survey. */
export const PartnerServices = ({ participants, companyName, fr }: { participants: CampaignParticipant[]; companyName?: string | null; fr: boolean }) => {
  const [copied, setCopied] = useState(false);

  const rows = useMemo(() => {
    const done = participants.filter((p) => p.status === 'completed');
    const n = done.length;
    const dims: Record<string, number> = {};
    ['usage', 'depth', 'will', 'teach', 'reach', 'gov', 'team', 'pain', 'value'].forEach((id) => {
      const vals = done.map((p) => p.thematicScores?.[id]).filter((v): v is number => typeof v === 'number');
      // A dimension the questionnaire did not measure stays undefined (pre-sales diagnostic).
      if (vals.length) dims[id] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    });
    const has = (p: CampaignParticipant, r: 'sponsor' | 'trainer' | 'builder') => p.roles?.includes(r) || p.classId === r;
    const s: Signals = {
      n,
      dims,
      sponsors: done.filter((p) => has(p, 'sponsor')).length,
      trainers: done.filter((p) => has(p, 'trainer')).length,
      builders: done.filter((p) => has(p, 'builder')).length,
      useCases: done.filter((p) => (p.open?.useCase ?? '').trim().length > 3).length,
    };
    return SERVICES.map((svc) => ({ svc, ...svc.assess(s) })).sort((a, b) => ORDER[a.need] - ORDER[b.need]);
  }, [participants]);

  const needed = rows.filter((r) => r.need === 'high').length;
  const discuss = rows.filter((r) => r.need === 'medium').length;
  const t = (l: L) => (fr ? l.fr : l.en);

  const copySummary = async () => {
    const lines = rows
      .filter((r) => r.need !== 'covered')
      .map((r) => `• ${t(r.svc.name)} (${t(NEED_STYLE[r.need].label).toLowerCase()}): ${t(r.why)} ${fr ? 'Porté par' : 'Owner'}: ${t(r.svc.owner)}.`);
    const head = fr
      ? `Services recommandés pour ${companyName || 'ce compte'} (d’après le questionnaire) :`
      : `Recommended services for ${companyName || 'this account'} (from the survey):`;
    try {
      await navigator.clipboard.writeText([head, ...lines].join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  };

  if (!rows.length) return null;

  return (
    <SectionCard
      title={fr ? 'Services partenaires recommandés' : 'Recommended partner services'}
      description={
        fr
          ? `Interne Dust · ${needed} nécessaire(s), ${discuss} à discuter. Catalogue provisoire, à aligner avec l’équipe Partenariats.`
          : `Dust internal · ${needed} needed, ${discuss} to discuss. Draft catalog, to align with the Partnerships service map.`
      }
      actions={
        <button
          type="button"
          onClick={copySummary}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-foreground ring-1 ring-border transition-colors hover:bg-lav-50"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? (fr ? 'Copié' : 'Copied') : fr ? 'Copier pour la proposition' : 'Copy for the proposal'}
        </button>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ svc, need, why }) => (
          <div key={svc.id} className={cn('flex flex-col rounded-md p-4 ring-1 ring-border', need === 'covered' && 'opacity-60')}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[14px] font-semibold text-foreground">{t(svc.name)}</p>
              <span className={cn('pill shrink-0', NEED_STYLE[need].pill)}>{t(NEED_STYLE[need].label)}</span>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/75">{t(svc.what)}</p>
            <p className="mt-2 rounded-md bg-lav-50 px-2.5 py-1.5 text-[12px] text-foreground">{t(why)}</p>
            <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2.5 text-[12px] text-muted-foreground" style={{ marginTop: 12 }}>
              <span className="inline-flex items-center gap-1">
                <Handshake className="h-3.5 w-3.5" />
                {t(svc.owner)}
              </span>
              <span>{fr ? 'ex.' : 'e.g.'} {svc.partners}</span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};
