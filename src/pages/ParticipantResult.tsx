import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { type AssessmentType, type Profile } from '@/lib/assessment-data';
import {
  READINESS_DIMENSION_IDS,
  classAsProfile,
  dimensionLabel,
  isV2ItemScores,
  isV2Responses,
  trainerRoleMismatch,
} from '@/lib/assessment-v2';
import { getLocalizedProfile } from '@/lib/profile-translations';
import { ThematicRadar } from '@/components/charts/ThematicRadar';
import { useGlobalBenchmark } from '@/hooks/useGlobalBenchmark';
import { DustWordmark } from '@/components/DustMark';
import { ThematicBarChart } from '@/components/charts/ThematicBarChart';
import { getScoreColorClass } from '@/lib/score-colors';


interface LoadedParticipant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string | null;
  campaignName: string | null;
  completedAt: Date | null;
  score: number;
  profile: Profile;
  thematicScores: Record<string, number>;
  language: 'fr' | 'en';
  assessmentType: AssessmentType;
  fits: { trainer: number; champion: number; sponsor: number };
  roleMismatch: boolean;
}

const ParticipantResult = () => {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LoadedParticipant | null>(null);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { benchmark } = useGlobalBenchmark();

  useEffect(() => {
    if (!id) return;
    const fetchParticipant = async () => {
      setLoading(true);
      try {
        const { data: p, error: err } = await supabase
          .from('participants')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (err) throw err;
        if (!p) {
          setError('Participant introuvable');
          return;
        }

        let campaignLang: 'fr' | 'en' = 'fr';
        let assessmentType: AssessmentType = 'sales';
        let campaignName: string | null = null;
        if (p.campaign_id) {
          const { data: c } = await supabase
            .from('campaigns')
            .select('language, assessment_type, campaign_name')
            .eq('id', p.campaign_id)
            .maybeSingle();
          campaignLang = (c?.language === 'en' ? 'en' : 'fr');
          assessmentType = (c?.assessment_type as AssessmentType) || 'sales';
          campaignName = c?.campaign_name ?? null;
        }
        // v2 scores (readiness index, dimensions, class). Answers to the previous questionnaire have none.
        const v2 = isV2ItemScores(p.item_scores) ? p.item_scores : null;
        if (!v2) {
          setError(campaignLang === 'en'
            ? 'This result comes from the previous questionnaire and cannot be shown with the new model.'
            : "Ce résultat provient de l'ancien questionnaire et ne peut pas être affiché avec le nouveau modèle.");
          return;
        }
        const score100 = v2.readiness;
        const profile = classAsProfile(v2.classId);
        const thematicScores: Record<string, number> = { ...v2.dimensions };
        const stored = isV2Responses(p.responses) ? p.responses : null;
        const roleMismatch = trainerRoleMismatch(v2.classId, stored?.context);

        setData({
          id: p.id,
          firstName: p.first_name,
          lastName: p.last_name,
          email: p.email,
          companyName: p.company_name ?? null,
          campaignName,
          completedAt: p.completed_at ? new Date(p.completed_at) : null,
          score: score100,
          profile,
          thematicScores,
          language: campaignLang,
          assessmentType,
          fits: v2.fits,
          roleMismatch,
        });
      } catch (e: any) {
        console.error(e);
        setError(e?.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    fetchParticipant();
  }, [id]);

  const radarData = useMemo(() => {
    if (!data) return [];
    return (READINESS_DIMENSION_IDS as string[]).map((t) => ({
      thematic: dimensionLabel(t, data.language),
      score: data.thematicScores[t] ?? 0,
      benchmark: benchmark.thematicScores[t] ?? 0,
    }));
  }, [data, benchmark]);

  const handleDownload = async () => {
    if (!printRef.current || !data) return;
    setDownloading(true);
    try {
      await new Promise((r) => setTimeout(r, 400));

      const A4_W = 210;
      const A4_H = 297;
      const MARGIN = 12;
      const CONTENT_W = A4_W - MARGIN * 2;
      const CONTENT_H = A4_H - MARGIN * 2;
      const GAP = 4;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      let currentY = MARGIN;

      const sections = Array.from(
        printRef.current.querySelectorAll<HTMLElement>('[data-pdf-section]'),
      );

      for (const section of sections) {
        const canvas = await html2canvas(section, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });
        const scale = CONTENT_W / canvas.width;
        let heightMM = canvas.height * scale;
        const imgData = canvas.toDataURL('image/png');

        // If section taller than a full page, scale it down to fit one page
        if (heightMM > CONTENT_H) {
          const ratio = CONTENT_H / heightMM;
          const fittedW = CONTENT_W * ratio;
          if (currentY + CONTENT_H > A4_H - MARGIN && currentY > MARGIN) {
            pdf.addPage();
            currentY = MARGIN;
          }
          pdf.addImage(
            imgData,
            'PNG',
            MARGIN + (CONTENT_W - fittedW) / 2,
            currentY,
            fittedW,
            CONTENT_H,
          );
          currentY += CONTENT_H + GAP;
          continue;
        }

        if (currentY + heightMM > A4_H - MARGIN && currentY > MARGIN) {
          pdf.addPage();
          currentY = MARGIN;
        }
        pdf.addImage(imgData, 'PNG', MARGIN, currentY, CONTENT_W, heightMM);
        currentY += heightMM + GAP;
      }

      const fileName = `resultat-${data.firstName}-${data.lastName}`
        .toLowerCase()
        .replace(/\s+/g, '-');
      pdf.save(`${fileName}.pdf`);
    } catch (e) {
      console.error('PDF error', e);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{error || 'Aucune donnée'}</p>
          <Link to="/dashboard">
            <Button variant="outline">Retour</Button>
          </Link>
        </div>
      </div>
    );
  }

  const lp = getLocalizedProfile(data.profile, data.language);
  const t = {
    title: data.language === 'fr' ? 'Résultats individuels' : 'Individual Results',
    back: data.language === 'fr' ? 'Retour' : 'Back',
    download: data.language === 'fr' ? 'Télécharger en PDF' : 'Download as PDF',
    downloading: data.language === 'fr' ? 'Génération...' : 'Generating...',
    profile: data.language === 'fr' ? 'Votre profil' : 'Your profile',
    radarTitle:
      data.language === 'fr' ? 'Vos scores par thématique' : 'Your scores by theme',
    benchmarkLabel:
      data.language === 'fr' ? 'Moyenne globale' : 'Overall average',
    completedOn: data.language === 'fr' ? 'Test passé le' : 'Test completed on',
    globalScore: data.language === 'fr' ? 'Indice de maturité IA' : 'AI readiness index',
    advice: data.language === 'fr' ? 'Action recommandée' : 'Recommended action',
    nextLevel: data.language === 'fr' ? 'Adéquation aux rôles' : 'Role fit',
    thematics: data.language === 'fr' ? 'Détail par dimension' : 'Detail by dimension',
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-[880px] items-center justify-between gap-4 px-4">
          <Link to="/dashboard" className="rounded-md" aria-label="Dust">
            <DustWordmark subtitle={data.companyName || undefined} />
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                {t.back}
              </Link>
            </Button>
            <Button onClick={handleDownload} disabled={downloading} size="sm">
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloading ? t.downloading : t.download}
            </Button>
          </div>
        </div>
      </header>

      <main className="py-6">
        <div ref={printRef} className="mx-auto max-w-[880px] space-y-4 bg-background px-4 py-2">
          {/* Title */}
          <div data-pdf-section>
            <p className="eyebrow">{t.title}</p>
            <h1 className="page-title mt-1">{data.firstName} {data.lastName}</h1>
            <p className="mt-1 flex flex-wrap gap-x-2 text-[13px] text-muted-foreground">
              <span>{data.email}</span>
              {data.companyName && <><span aria-hidden>·</span><span>{data.companyName}</span></>}
              {data.completedAt && (
                <>
                  <span aria-hidden>·</span>
                  <span>
                    {t.completedOn}{' '}
                    {data.completedAt.toLocaleDateString(
                      data.language === 'fr' ? 'fr-FR' : 'en-GB',
                      { day: '2-digit', month: '2-digit', year: 'numeric' },
                    )}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Profile + score */}
          <section data-pdf-section className="card-elevated p-5 md:p-6">
            <div className="grid gap-5 md:grid-cols-[200px_1fr] md:gap-8">
              <div>
                <p className="eyebrow">{t.globalScore}</p>
                <p className="mt-1 flex items-baseline gap-1 tabular-nums">
                  <span className={`text-[44px] font-semibold leading-none ${getScoreColorClass(data.score)}`}>{data.score}</span>
                  <span className="text-[18px] text-muted-foreground">/100</span>
                </p>
              </div>
              <div className="md:border-l md:border-border md:pl-8">
                <p className="eyebrow">{t.profile}</p>
                <h2 className="mt-1 text-[17px] font-semibold text-foreground">{lp.name}</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-foreground">{lp.description}</p>
              </div>
            </div>
          </section>

          {/* Advice */}
          <section data-pdf-section className="card-elevated grid gap-5 p-5 md:grid-cols-2">
            <div className="border-l-2 border-brand pl-3">
              <h3 className="card-title mb-1">{t.advice}</h3>
              <p className="text-[13px] leading-relaxed text-foreground">{lp.advice}</p>
              <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{data.language === 'fr' ? 'Règle : ' : 'Rule: '}{lp.tip}</p>
              {data.roleMismatch && (
                <p className="mt-2 rounded-md bg-warn-soft px-2.5 py-1.5 text-[12px] text-warn-ink">
                  {data.language === 'fr'
                    ? "Rôle de formation non déclaré : à confirmer avant de nommer cette personne formatrice."
                    : 'Training role not declared: confirm before naming this person a trainer.'}
                </p>
              )}
            </div>
            <div className="border-l-2 border-line pl-3">
              <h3 className="card-title mb-1">{t.nextLevel}</h3>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['trainer', data.language === 'fr' ? 'Formateur' : 'Trainer'],
                  ['champion', 'Champion'],
                  ['sponsor', 'Sponsor'],
                ] as const).map(([k, label]) => (
                  <div key={k} className="rounded-md bg-lav-50 px-2 py-2 text-center">
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                    <p className="text-[17px] font-semibold tabular-nums text-foreground">{data.fits[k]}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Thematic detail */}
          <section data-pdf-section className="card-elevated p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <h3 className="card-title">{t.thematics}</h3>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand" />{t.globalScore}</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-[2px] rounded-full bg-chart-benchmark" />{t.benchmarkLabel}</span>
              </div>
            </div>
            <ThematicBarChart data={radarData} showBenchmark animationKey="participant-bars" />
          </section>

          {/* Radar */}
          <section data-pdf-section className="card-elevated p-5">
            <h3 className="card-title mb-2">{t.radarTitle}</h3>
            <ThematicRadar data={radarData} showBenchmark={true} animationKey="participant-radar" />
          </section>
        </div>
      </main>
    </div>
  );
};

export default ParticipantResult;
