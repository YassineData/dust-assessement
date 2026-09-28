import { useMemo } from 'react';
import { getQuestionText } from '@/lib/assessment-data';
import { V2_AS_LEGACY_QUESTIONS, V2_QUESTION_BY_NUMERIC_ID, dimensionLabel, getDimension } from '@/lib/assessment-v2';
import { useAssessmentType } from '@/hooks/useAssessmentType';
import { QUESTION_TRANSLATIONS_EN } from '@/lib/question-translations';
import { CampaignParticipant } from '@/hooks/useCampaignParticipants';
import { useLanguage } from '@/contexts/LanguageContext';

interface DetailedScoresTabProps {
  participants: CampaignParticipant[];
}

// Map string response labels to numeric values (1-5)
const responseToValue = (response: string | number): number => {
  const mapping: Record<string, number> = {
    'disagree': 1,
    'somewhatDisagree': 2,
    'neutral': 3,
    'somewhatAgree': 4,
    'agree': 5,
  };
  if (typeof response === 'string' && mapping[response]) return mapping[response];
  // Support numeric responses: stored as 0-4 (index) → map to 1-5
  const n = typeof response === 'number' ? response : parseInt(response as string, 10);
  if (!isNaN(n)) {
    if (n >= 0 && n <= 4) return n + 1;
    if (n >= 1 && n <= 5) return n;
  }
  return 0;
};

export const DetailedScoresTab = ({ participants }: DetailedScoresTabProps) => {
  const { t, language } = useLanguage();
  const { type: assessmentType, thematics: activeThematics } = useAssessmentType();
  // v2 questionnaire (numeric ids 101+ match the keys exposed by useCampaignParticipants)
  const activeQuestions = V2_AS_LEGACY_QUESTIONS;
  
  // Calculate response distribution for each question
  const questionStats = useMemo(() => {
    const completedParticipants = participants.filter(p => p.status === 'completed');
    if (!completedParticipants.length) return [];

    return activeQuestions.map((question, qIndex) => {
      // Count responses for each value (1-5)
      const responseCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      const questionNumber = qIndex + 1;
      // Responses are stored keyed by question.id (not sequential index),
      // so we must look them up by the real question id.
      const responseKey = question.id.toString();
      
      completedParticipants.forEach(participant => {
        const responses = participant.responses as Record<string, string> | null;
        if (responses) {
          const responseValue = responses[responseKey];
          if (responseValue) {
            const numericValue = responseToValue(responseValue);
            if (numericValue >= 1 && numericValue <= 5) {
              responseCounts[numericValue]++;
            }
          }
        }
      });

      // Count how many actually responded to this question
      const totalResponded = Object.values(responseCounts).reduce((a, b) => a + b, 0);
      
      const percentages = Object.entries(responseCounts).map(([value, count]) => ({
        value: parseInt(value),
        count,
        percentage: totalResponded > 0 ? Math.round((count / totalResponded) * 100) : 0,
      }));

      return {
        question,
        questionNumber,
        percentages,
        totalResponses: totalResponded,
      };
    });
  }, [participants]);

  // Group questions by thematic
  const questionsByThematic = useMemo(() => {
    const grouped: Record<string, typeof questionStats> = {};
    
    activeThematics.forEach(thematic => {
      grouped[thematic] = questionStats.filter(q => q.question.thematic === thematic);
    });
    
    return grouped;
  }, [questionStats, activeThematics]);

  const completedCount = participants.filter(p => p.status === 'completed').length;

  // Helper to translate thematic names
  const translateThematic = (thematic: string): string => dimensionLabel(thematic, language === 'en' ? 'en' : 'fr');

  // Get response labels based on language
  const getResponseLabels = () => [
    t('detailedScores.responses.stronglyDisagree'),
    t('detailedScores.responses.disagree'),
    t('detailedScores.responses.neutral'),
    t('detailedScores.responses.agree'),
    t('detailedScores.responses.stronglyAgree'),
  ];

  if (completedCount === 0) {
    return (
      <div className="card-elevated p-8 text-center">
        <p className="text-[13px] text-muted-foreground">
          {t('detailedScores.noParticipants')}
        </p>
      </div>
    );
  }

  const labels = getResponseLabels();
  // Diverging Likert palette: disagreement in red tints, neutral gray, agreement in green tints
  const SEGMENT_COLORS = [
    'hsl(var(--red))',
    'hsl(var(--red) / 0.45)',
    'hsl(var(--chart-benchmark))',
    'hsl(var(--green) / 0.5)',
    'hsl(var(--green))',
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-3 shadow-sm">
        <p className="text-[13px] text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">{completedCount}</span> {t('detailedScores.participantsCompleted')}
        </p>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {labels.map((label, i) => (
            <li key={label} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: SEGMENT_COLORS[i] }} />
              {label}
            </li>
          ))}
        </ul>
      </div>

      {activeThematics.map(thematic => {
        const questions = questionsByThematic[thematic];
        if (!questions?.length) return null;

        return (
          <section key={thematic} className="card-elevated">
            <div className="sticky top-12 z-10 rounded-t-lg border-b border-border bg-card px-5 py-3">
              <h2 className="card-title">{translateThematic(thematic)}</h2>
              {getDimension(thematic) && (
                <p className="text-[12px] text-muted-foreground">{language === 'en' ? getDimension(thematic)!.measures.en : getDimension(thematic)!.measures.fr}</p>
              )}
            </div>

            <ol className="divide-y divide-border">
              {questions.map(({ question, questionNumber, percentages }) => (
                <li key={question.id} className="grid gap-3 px-5 py-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,42%)] lg:items-center lg:gap-6">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-sm bg-muted px-1 text-[11px] font-medium tabular-nums text-muted-foreground">
                      {questionNumber}
                    </span>
                    <h3 className="text-[13px] leading-relaxed text-foreground">
                      {V2_QUESTION_BY_NUMERIC_ID[question.id]?.reverse && (
                        <span className="pill pill-neutral mr-1.5 align-middle" title={language === 'en' ? 'Reverse-scored: agreeing lowers the score' : 'Question inversée : être d’accord fait baisser le score'}>{language === 'en' ? 'reversed' : 'inversée'}</span>
                      )}
                      {getQuestionText(question.id, language === 'en' ? (QUESTION_TRANSLATIONS_EN[question.id] || question.text) : question.text, assessmentType, language)}
                    </h3>
                  </div>

                  {/* Response distribution as one stacked bar; values shown in place */}
                  <div>
                    <div className="flex h-6 overflow-hidden rounded-md bg-muted">
                      {percentages.map(({ value, percentage, count }) => (
                        percentage > 0 ? (
                          <div
                            key={value}
                            className="flex items-center justify-center text-[11px] font-medium tabular-nums"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: SEGMENT_COLORS[value - 1],
                              color: value === 1 || value === 5 ? '#fff' : 'hsl(var(--ink))',
                            }}
                            title={`${labels[value - 1]} · ${percentage}% (${count})`}
                          >
                            {percentage >= 9 ? `${percentage}%` : ''}
                          </div>
                        ) : null
                      ))}
                    </div>
                    <div className="mt-1 grid grid-cols-5 text-[11px] tabular-nums text-muted-foreground">
                      {percentages.map(({ value, count }) => (
                        <span key={value} className={value === 1 ? 'text-left' : value === 5 ? 'text-right' : 'text-center'} title={labels[value - 1]}>
                          {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
};
