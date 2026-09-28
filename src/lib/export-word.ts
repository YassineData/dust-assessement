import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { CampaignParticipant } from '@/hooks/useCampaignParticipants';
import { getQuestionText } from '@/lib/assessment-data';
import { CLASS_PROFILES, classLabel, dimensionLabel } from '@/lib/assessment-v2';
import { getActiveThematics, getActiveQuestions, getActiveAssessmentType } from '@/lib/active-assessment-type';
import { QUESTION_TRANSLATIONS_EN } from '@/lib/question-translations';

// Export colours
const BRAND = {
  primary: '1C91FF',
  primaryMid: '9FDBFF',
  accent: 'FFC3DF',
  cta: '111418',
  dark: '111418',
  darkAlt: '1C222D',
  muted: '545D6C',
  white: 'FFFFFF',
  bgAlt: 'F7F7F7',
  success: '418B5C',
  danger: 'E14322',
};

const FONT_TITLE = 'Inter';
const FONT_BODY = 'Inter';

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

const responseToValue = (response: string): number => {
  const mapping: Record<string, number> = { disagree: 1, somewhatDisagree: 2, neutral: 3, somewhatAgree: 4, agree: 5 };
  return mapping[response] || 0;
};

const noBorder = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
};

export const exportWord = async (
  participants: CampaignParticipant[],
  companyName: string,
  language: string,
  averageScore: number,
  thematicAverages: { thematic: string; originalThematic: string; score: number }[]
) => {
  const completed = participants.filter(p => p.status === 'completed');
  const date = new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB');

  const profileDist = CLASS_PROFILES.map(profile => ({
    label: classLabel(profile.id, language === 'en' ? 'en' : 'fr'),
    count: completed.filter(p => p.profile.id === profile.id).length,
  }));

  // Build question response distribution data
  const activeThematics = getActiveThematics();
  const activeQuestions = getActiveQuestions();
  const questionStats = activeQuestions.map((question, qIndex) => {
    const responseCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    completed.forEach(participant => {
      const responses = participant.responses as Record<string, string> | null;
      if (responses) {
        const responseValue = responses[question.id.toString()];
        const numericValue = { disagree: 1, somewhatDisagree: 2, neutral: 3, somewhatAgree: 4, agree: 5 }[responseValue as string] || 0;
        if (numericValue >= 1 && numericValue <= 5) responseCounts[numericValue]++;
      }
    });
    const total = Object.values(responseCounts).reduce((a, b) => a + b, 0);
    return { question, questionNumber: qIndex + 1, responseCounts, total };
  });

  const questionsByThematic: Record<string, typeof questionStats> = {};
  activeThematics.forEach(thematic => {
    questionsByThematic[thematic] = questionStats.filter(q => q.question.thematic === thematic);
  });



  const responseLabels = [
    language === 'fr' ? 'Pas du tout d\'accord' : 'Strongly disagree',
    language === 'fr' ? 'Plutôt pas d\'accord' : 'Disagree',
    language === 'fr' ? 'Neutre' : 'Neutral',
    language === 'fr' ? 'Plutôt d\'accord' : 'Agree',
    language === 'fr' ? 'Tout à fait d\'accord' : 'Strongly agree',
  ];

  // Build detailed responses section
  const detailedSection: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: (language === 'fr' ? 'Détail des Réponses par Question' : 'Detailed Responses by Question').toUpperCase(), bold: true, size: 28, font: FONT_TITLE, color: BRAND.dark })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),
  ];

  activeThematics.forEach(thematic => {
    const questions = questionsByThematic[thematic];
    if (!questions?.length) return;

    detailedSection.push(
      new Paragraph({
        children: [new TextRun({ text: dimensionLabel(thematic, language === 'en' ? 'en' : 'fr').toUpperCase(), bold: true, size: 24, color: BRAND.cta, font: FONT_TITLE })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      })
    );

    questions.forEach(({ question, questionNumber, responseCounts, total }) => {
      const baseText = language === 'en' ? (QUESTION_TRANSLATIONS_EN[question.id] || question.text) : question.text;
      const qText = getQuestionText(question.id, baseText, getActiveAssessmentType(), language as 'fr' | 'en');
      detailedSection.push(
        new Paragraph({
          children: [new TextRun({ text: `Q${questionNumber}. ${qText}`, bold: true, size: 20, font: FONT_BODY, color: BRAND.darkAlt })],
          spacing: { before: 200, after: 100 },
        })
      );

      for (let v = 1; v <= 5; v++) {
        const count = responseCounts[v];
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        detailedSection.push(
          new Paragraph({
            children: [
              new TextRun({ text: `  ${responseLabels[v - 1]}: `, size: 18, font: FONT_BODY, color: BRAND.muted }),
              new TextRun({ text: `${pct}% (${count})`, bold: true, size: 18, font: FONT_BODY, color: BRAND.darkAlt }),
            ],
          })
        );
      }
    });
  });

  const doc = new Document({
    sections: [{
      children: [
        // Title
        new Paragraph({
          children: [new TextRun({ text: (language === 'fr' ? 'Rapport de Campagne IA' : 'AI Campaign Report').toUpperCase(), bold: true, size: 48, color: BRAND.dark, font: FONT_TITLE })],
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: companyName, size: 32, color: BRAND.cta, font: FONT_BODY })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: date, size: 20, color: BRAND.muted, font: FONT_BODY })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),

        // Key Metrics
        new Paragraph({
          children: [new TextRun({ text: (language === 'fr' ? 'Métriques Clés' : 'Key Metrics').toUpperCase(), bold: true, size: 28, font: FONT_TITLE, color: BRAND.dark })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 200 },
        }),
        new Paragraph({ children: [new TextRun({ text: `${language === 'fr' ? 'Participants' : 'Participants'}: `, size: 22, font: FONT_BODY, color: BRAND.muted }), new TextRun({ text: `${completed.length}`, size: 22, font: FONT_BODY, bold: true, color: BRAND.darkAlt })] }),
        new Paragraph({ children: [new TextRun({ text: `${language === 'fr' ? 'Score moyen' : 'Average Score'}: `, size: 22, font: FONT_BODY, color: BRAND.muted }), new TextRun({ text: `${averageScore}/100`, size: 22, font: FONT_BODY, bold: true, color: BRAND.cta })] }),
        new Paragraph({ children: [new TextRun({ text: `${language === 'fr' ? 'Thématiques évaluées' : 'Themes Evaluated'}: `, size: 22, font: FONT_BODY, color: BRAND.muted }), new TextRun({ text: `${activeThematics.length}`, size: 22, font: FONT_BODY, bold: true, color: BRAND.darkAlt })], spacing: { after: 300 } }),

        // Profile Distribution
        new Paragraph({
          children: [new TextRun({ text: (language === 'fr' ? 'Répartition des Profils' : 'Profile Distribution').toUpperCase(), bold: true, size: 28, font: FONT_TITLE, color: BRAND.dark })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 200 },
        }),
        ...profileDist.map(p => new Paragraph({
          children: [
            new TextRun({ text: `${p.label}: `, size: 22, font: FONT_BODY, color: BRAND.muted }),
            new TextRun({ text: `${p.count} (${completed.length > 0 ? Math.round(p.count / completed.length * 100) : 0}%)`, size: 22, font: FONT_BODY, bold: true, color: BRAND.darkAlt }),
          ],
        })),

        // Thematic Scores
        new Paragraph({
          children: [new TextRun({ text: (language === 'fr' ? 'Scores par Thématique' : 'Scores by Theme').toUpperCase(), bold: true, size: 28, font: FONT_TITLE, color: BRAND.dark })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: language === 'fr' ? 'Thématique' : 'Theme', bold: true, size: 20, font: FONT_BODY, color: BRAND.white })], alignment: AlignmentType.LEFT })], width: { size: 70, type: WidthType.PERCENTAGE }, shading: { fill: BRAND.cta } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Score', bold: true, size: 20, font: FONT_BODY, color: BRAND.white })], alignment: AlignmentType.CENTER })], width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: BRAND.cta } }),
              ],
            }),
            ...thematicAverages.map((ta, i) => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: ta.thematic, size: 20, font: FONT_BODY, color: BRAND.darkAlt })] })], shading: { fill: i % 2 === 0 ? BRAND.white : BRAND.bgAlt } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${ta.score}%`, size: 20, font: FONT_BODY, bold: true, color: BRAND.cta })], alignment: AlignmentType.CENTER })], shading: { fill: i % 2 === 0 ? BRAND.white : BRAND.bgAlt } }),
              ],
            })),
          ],
        }),

        // Detailed Responses Section
        ...detailedSection,

        // Participants List
        new Paragraph({
          children: [new TextRun({ text: (language === 'fr' ? 'Liste des Participants' : 'Participant List').toUpperCase(), bold: true, size: 28, font: FONT_TITLE, color: BRAND.dark })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: language === 'fr' ? 'Nom' : 'Name', bold: true, size: 18, font: FONT_BODY, color: BRAND.white })] })], shading: { fill: BRAND.cta } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Email', bold: true, size: 18, font: FONT_BODY, color: BRAND.white })] })], shading: { fill: BRAND.cta } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Score', bold: true, size: 18, font: FONT_BODY, color: BRAND.white })], alignment: AlignmentType.CENTER })], shading: { fill: BRAND.cta } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: language === 'fr' ? 'Profil' : 'Profile', bold: true, size: 18, font: FONT_BODY, color: BRAND.white })], alignment: AlignmentType.CENTER })], shading: { fill: BRAND.cta } }),
              ],
            }),
            ...completed.map((p, i) => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${p.firstName} ${p.lastName}`, size: 18, font: FONT_BODY, color: BRAND.darkAlt })] })], shading: { fill: i % 2 === 0 ? BRAND.white : BRAND.bgAlt } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: p.email, size: 18, font: FONT_BODY, color: BRAND.muted })] })], shading: { fill: i % 2 === 0 ? BRAND.white : BRAND.bgAlt } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${p.score}%`, size: 18, font: FONT_BODY, bold: true, color: BRAND.cta })], alignment: AlignmentType.CENTER })], shading: { fill: i % 2 === 0 ? BRAND.white : BRAND.bgAlt } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: classLabel(p.profile.id, language === 'en' ? 'en' : 'fr'), size: 18, font: FONT_BODY, color: BRAND.darkAlt })], alignment: AlignmentType.CENTER })], shading: { fill: i % 2 === 0 ? BRAND.white : BRAND.bgAlt } }),
              ],
            })),
          ],
        }),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `rapport-${companyName.replace(/\s+/g, '-').toLowerCase()}.docx`);
};
