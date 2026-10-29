import { CampaignParticipant } from '@/hooks/useCampaignParticipants';
import { getQuestionText } from '@/lib/assessment-data';
import { CONTEXT_FIELDS, OPEN_FIELDS as SURVEY_OPEN_FIELDS, classLabel, contextLabels, dimensionLabel } from '@/lib/assessment-v2';
import { PRESALES_ONLY_OPEN_FIELDS } from '@/lib/presales';
import { FOLLOWUP_ONLY_OPEN_FIELDS } from '@/lib/followup';

const OPEN_FIELDS = [...SURVEY_OPEN_FIELDS, ...PRESALES_ONLY_OPEN_FIELDS, ...FOLLOWUP_ONLY_OPEN_FIELDS];
import { getActiveThematics, getActiveQuestions } from '@/lib/active-assessment-type';

const RESPONSE_LABELS_FR: Record<string, string> = {
  disagree: 'Pas du tout d\'accord',
  somewhatDisagree: 'Plutôt pas d\'accord',
  neutral: 'Neutre',
  somewhatAgree: 'Plutôt d\'accord',
  agree: 'Tout à fait d\'accord',
};

const RESPONSE_LABELS_EN: Record<string, string> = {
  disagree: 'Strongly disagree',
  somewhatDisagree: 'Disagree',
  neutral: 'Neutral',
  somewhatAgree: 'Agree',
  agree: 'Strongly agree',
};

export const exportCSV = (participants: CampaignParticipant[], companyName: string, language: string) => {
  const completedParticipants = participants.filter(p => p.status === 'completed');
  const labels = language === 'fr' ? RESPONSE_LABELS_FR : RESPONSE_LABELS_EN;
  const lang: 'fr' | 'en' = language === 'en' ? 'en' : 'fr';
  const activeThematics = getActiveThematics();
  const activeQuestions = getActiveQuestions();
  
  const headers = [
    language === 'fr' ? 'Prénom' : 'First Name',
    language === 'fr' ? 'Nom' : 'Last Name',
    'Email',
    language === 'fr' ? 'Équipe' : 'Team',
    language === 'fr' ? 'Indice de préparation' : 'Readiness index',
    language === 'fr' ? 'Profil' : 'Profile',
    ...activeThematics.map(t => dimensionLabel(t, lang)),
    'Fit trainer',
    'Fit builder',
    'Fit champion',
    'Fit sponsor',
    ...CONTEXT_FIELDS.map(f => lang === 'en' ? f.label.en : f.label.fr),
    ...OPEN_FIELDS.map(f => lang === 'en' ? f.label.en : f.label.fr),
    ...activeQuestions.map((q, i) => {
      const qText = getQuestionText(q.id, q.text, 'generic', lang);
      return `Q${i + 1}: ${qText.substring(0, 80)}`;
    }),
    language === 'fr' ? 'Date de complétion' : 'Completion Date',
  ];

  const rows = completedParticipants.map(p => [
    p.firstName,
    p.lastName,
    p.email,
    p.team || '',
    p.score,
    classLabel(p.profile.id, lang),
    ...activeThematics.map(t => p.thematicScores[t] ?? 0),
    p.fits?.trainer ?? '',
    p.fits?.builder ?? '',
    p.fits?.champion ?? '',
    p.fits?.sponsor ?? '',
    ...CONTEXT_FIELDS.map(f => contextLabels(p.context, f.id, lang).join(' | ')),
    ...OPEN_FIELDS.map(f => p.open?.[f.id] ?? ''),
    ...activeQuestions.map((q) => {
      const responses = p.responses as Record<string, string> | null;
      if (!responses) return '';
      const responseKey = responses[q.id.toString()];
      return responseKey ? (labels[responseKey] || responseKey) : '';
    }),
    p.completedAt.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB'),
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `resultats-${companyName.replace(/\s+/g, '-').toLowerCase()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportItemScoresCSV = (
  participants: CampaignParticipant[],
  companyName: string,
  language: string,
) => {
  const completedParticipants = participants.filter(p => p.status === 'completed');
  const activeThematics = getActiveThematics();
  const isFr = language === 'fr';

  const headers = [
    isFr ? 'Prénom' : 'First Name',
    isFr ? 'Nom' : 'Last Name',
    'Email',
    isFr ? 'Équipe' : 'Team',
    isFr ? 'Entreprise' : 'Company',
    isFr ? 'Campagne' : 'Campaign',
    isFr ? 'Code campagne' : 'Campaign Code',
    isFr ? 'Date de début' : 'Started At',
    isFr ? 'Date de complétion' : 'Completed At',
    isFr ? 'Profil' : 'Profile',
    isFr ? 'Indice de préparation' : 'Readiness index',
    ...activeThematics.map(t => dimensionLabel(t, isFr ? 'fr' : 'en')),
  ];

  const formatDate = (d: Date | null) =>
    d ? d.toLocaleDateString(isFr ? 'fr-FR' : 'en-GB') : '';

  const rows = completedParticipants.map(p => [
    p.firstName,
    p.lastName,
    p.email,
    p.team || '',
    p.companyName || '',
    p.campaignName || '',
    p.campaignCode || '',
    formatDate(p.startedAt),
    formatDate(p.completedAt),
    classLabel(p.profile.id, isFr ? 'fr' : 'en'),
    p.score,
    ...activeThematics.map(t => p.thematicScores[t] ?? 0),
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = (companyName || 'campaign').replace(/\s+/g, '-').toLowerCase();
  link.download = `resultats-detailles-${safeName}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
