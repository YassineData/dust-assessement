import PptxGenJS from 'pptxgenjs';
import { CampaignParticipant } from '@/hooks/useCampaignParticipants';
import { getQuestionText } from '@/lib/assessment-data';
import { CLASS_PROFILES, classLabel, dimensionLabel, getDimension } from '@/lib/assessment-v2';
import { getActiveThematics, getActiveQuestions, getActiveAssessmentType } from '@/lib/active-assessment-type';
import { QUESTION_TRANSLATIONS_EN } from '@/lib/question-translations';
import type { SummaryPdfData } from '@/lib/export-pdf';

// Export palette
// Dust brand palette (brand guidelines PDF)
const C = {
  primary: '1C91FF',
  primaryMid: '9FDBFF',
  primaryLight: 'FFC3DF',
  primaryGlow: 'E9F7FF',
  primaryBg: 'E9F7FF',
  cta: '111418',
  ctaHover: '2A3241',
  dark: '111418',
  darkAlt: '1C222D',
  muted: '545D6C',
  mutedLight: '7B818D',
  white: 'FFFFFF',
  bg: 'FFFFFF',
  bgAlt: 'F7F7F7',
  success: '418B5C',
  successBg: 'FEFFF0',
  warning: 'FE9C1A',
  warningBg: 'FFF6E8',
  danger: 'E14322',
  dangerBg: 'FFF1F7',
  amber: 'FE9C1A',
  ambassador: '418B5C',
  performer: '1C91FF',
  curious: '9FDBFF',
  novice: 'FE9C1A',
  traditional: 'E14322',
};

// Geist (Dust brand) is rarely installed: PowerPoint would fall back to a serif. Arial is the closest safe face.
const FT = 'Arial';   // Titles
const FB = 'Arial'; // Body

// v2 result classes
const PROFILE_COLORS: Record<string, string> = {
  trainer: C.primary,
  champion: C.ambassador,
  builder: '66C2F5',
  sponsor: C.performer,
  beginner: C.novice,
  convince: C.traditional,
  everyday: C.muted,
};

const PROFILE_EMOJI: Record<string, string> = {};

const addGradientBar = (slide: any, pptx: PptxGenJS, y: number, h: number) => {
  slide.addShape(pptx.ShapeType.rect, { x: 0, y, w: 4.44, h, fill: { color: C.primary } });
  slide.addShape(pptx.ShapeType.rect, { x: 4.44, y, w: 4.44, h, fill: { color: C.primaryMid } });
  slide.addShape(pptx.ShapeType.rect, { x: 8.88, y, w: 4.45, h, fill: { color: C.primaryLight } });
};

const addSlideHeader = (slide: any, pptx: PptxGenJS, title: string, subtitle?: string, indent = 0) => {
  addGradientBar(slide, pptx, 0, 0.08);
  slide.addText(title.toUpperCase(), {
    x: 0.7 + indent, y: 0.3, w: 11, h: 0.7,
    fontSize: 26, bold: true, color: C.dark, fontFace: FT,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.7 + indent, y: 0.9, w: 11, h: 0.4,
      fontSize: 13, color: C.muted, fontFace: FB,
    });
  }
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.7, y: 7.15, w: 11.9, h: 0.01, fill: { color: C.bgAlt },
  });
  slide.addText('Dust · AI Readiness Assessment', {
    x: 0.7, y: 7.15, w: 6, h: 0.3,
    fontSize: 8, color: C.mutedLight, fontFace: FB,
  });
};

const addMetricCard = (slide: any, pptx: PptxGenJS, x: number, y: number, w: number, h: number, value: string, label: string, color: string, icon?: string) => {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, fill: { color: C.white },
    shadow: { type: 'outer', blur: 12, offset: 3, color: '000000', opacity: 0.06 },
    rectRadius: 0.2,
  });
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w: 0.06, h, fill: { color },
    rectRadius: 0,
  });
  if (icon) {
    slide.addText(icon, {
      x: x + 0.3, y: y + 0.2, w: 0.6, h: 0.6,
      fontSize: 22, align: 'center', valign: 'middle',
    });
  }
  slide.addText(value, {
    x: x + 0.2, y: y + (icon ? 0.8 : 0.3), w: w - 0.4, h: 1,
    fontSize: 42, bold: true, color, align: 'center', fontFace: FT,
  });
  slide.addText(label, {
    x: x + 0.2, y: y + h - 0.7, w: w - 0.4, h: 0.5,
    fontSize: 11, color: C.muted, align: 'center', fontFace: FB,
  });
};

const getScoreColor = (score: number) => {
  if (score >= 70) return C.success;
  if (score >= 50) return C.curious;
  if (score >= 30) return C.novice;
  return C.danger;
};

const addScoreBar = (slide: any, pptx: PptxGenJS, x: number, y: number, w: number, score: number) => {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: 0.22, fill: { color: C.bgAlt }, rectRadius: 0.11,
  });
  const fillW = Math.max(0.22, (score / 100) * w);
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w: fillW, h: 0.22, fill: { color: getScoreColor(score) }, rectRadius: 0.11,
  });
};

const blockTitle = (slide: any, pptx: PptxGenJS, n: number, title: string, question: string) => {
  addSlideHeader(slide, pptx, title, question, 0.65);
  slide.addShape(pptx.ShapeType.ellipse, { x: 0.7, y: 0.42, w: 0.46, h: 0.46, fill: { color: C.dark } });
  slide.addText(String(n), { x: 0.7, y: 0.42, w: 0.46, h: 0.46, fontSize: 14, bold: true, color: C.white, align: 'center', valign: 'middle', fontFace: FT });
};

/** Starting point → people → plan, the same reading order as the console and the one-page PDF. */
const addBlockSlides = (pptx: PptxGenJS, d: SummaryPdfData) => {
  const fr = d.lang === 'fr';
  const L = (en: string, frText: string) => (fr ? frText : en);

  // 1 · Starting point
  const s1 = pptx.addSlide();
  s1.background = { fill: C.bg };
  blockTitle(s1, pptx, 1, L('Starting point', 'Point de départ'), L('Where does the account stand with AI?', 'Où en est le compte avec l’IA ?'));
  s1.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 1.55, w: 3.2, h: 2.3, fill: { color: C.bgAlt }, rectRadius: 0.15 });
  s1.addText(String(d.readiness), { x: 0.7, y: 1.7, w: 3.2, h: 1.2, fontSize: 60, bold: true, color: C.dark, align: 'center', fontFace: FT });
  s1.addText('/100', { x: 0.7, y: 2.85, w: 3.2, h: 0.35, fontSize: 12, color: C.muted, align: 'center', fontFace: FB });
  s1.addText(L('AI readiness index', 'Indice de maturité IA'), { x: 0.7, y: 3.25, w: 3.2, h: 0.35, fontSize: 11, color: C.muted, align: 'center', fontFace: FB });
  s1.addText(d.bandTitle, { x: 4.3, y: 1.55, w: 6.2, h: 0.5, fontSize: 20, bold: true, color: C.dark, fontFace: FT });
  if (typeof d.benchmarkDelta === 'number') {
    const pos = d.benchmarkDelta >= 0;
    s1.addText(`${pos ? '+' : ''}${d.benchmarkDelta} ${L('pts vs benchmark', 'pts vs benchmark')}`, { x: 10.3, y: 1.55, w: 2.3, h: 0.5, fontSize: 13, bold: true, color: pos ? C.success : C.danger, align: 'right', fontFace: FB });
  }
  s1.addText(`${d.synthesis}\n\n${d.completed} ${L('answers out of', 'réponses sur')} ${d.registered} ${L('registered', 'inscrits')}${d.campaignName ? ` · ${d.campaignName}` : ''}`, {
    x: 4.3, y: 2.1, w: 8.3, h: 1.75, fontSize: 13, color: C.muted, fontFace: FB, valign: 'top', lineSpacingMultiple: 1.2,
  });
  const n = d.dimensions.length || 1;
  const rowH = Math.min(0.44, 2.75 / n);
  const barX = 3.9;
  const barW = 7.9;
  d.dimensions.forEach((dim, i) => {
    const y = 4.15 + i * rowH;
    s1.addText(dim.name, { x: 0.7, y, w: 3.1, h: rowH, fontSize: 11, color: C.dark, fontFace: FB, valign: 'middle' });
    s1.addShape(pptx.ShapeType.roundRect, { x: barX, y: y + rowH / 2 - 0.09, w: barW, h: 0.18, fill: { color: C.bgAlt }, rectRadius: 0.09 });
    s1.addShape(pptx.ShapeType.roundRect, { x: barX, y: y + rowH / 2 - 0.09, w: Math.max(0.18, (barW * Math.max(0, Math.min(100, dim.score))) / 100), h: 0.18, fill: { color: dim.score < 50 ? C.danger : C.primary }, rectRadius: 0.09 });
    if (typeof dim.benchmark === 'number') {
      s1.addShape(pptx.ShapeType.rect, { x: barX + (barW * dim.benchmark) / 100 - 0.015, y: y + rowH / 2 - 0.16, w: 0.03, h: 0.32, fill: { color: C.dark } });
    }
    s1.addText(String(dim.score), { x: 11.9, y, w: 0.7, h: rowH, fontSize: 12, bold: true, color: C.dark, align: 'right', valign: 'middle', fontFace: FT });
  });
  s1.addText(L('Bar: this cohort · tick: benchmark across all rollouts', 'Barre : cette cohorte · trait : benchmark de tous les déploiements'), {
    x: 0.7, y: 6.85, w: 11.9, h: 0.25, fontSize: 9, color: C.mutedLight, fontFace: FB,
  });

  // 2 · People
  const s2 = pptx.addSlide();
  s2.background = { fill: C.bg };
  blockTitle(s2, pptx, 2, L('People', 'Personnes'), L('Who can we rely on? Roles can overlap.', 'Sur qui s’appuyer ? Les rôles sont cumulables.'));
  const tileW = (11.9 - 4 * 0.2) / 5;
  d.people.slice(0, 5).forEach((p, i) => {
    const x = 0.7 + i * (tileW + 0.2);
    s2.addShape(pptx.ShapeType.roundRect, { x, y: 1.55, w: tileW, h: 1.35, fill: { color: C.bgAlt }, rectRadius: 0.12 });
    s2.addText(p.label.toUpperCase(), { x: x + 0.2, y: 1.65, w: tileW - 0.4, h: 0.35, fontSize: 9, bold: true, color: C.muted, fontFace: FB, charSpacing: 1 });
    s2.addText(String(p.count), { x: x + 0.2, y: 2.05, w: tileW - 1.2, h: 0.7, fontSize: 32, bold: true, color: C.dark, fontFace: FT });
    s2.addText(`${p.pct}%`, { x: x + tileW - 1.1, y: 2.05, w: 0.9, h: 0.7, fontSize: 13, color: C.muted, align: 'right', fontFace: FB });
  });
  const colW = (11.9 - 3 * 0.25) / 4;
  d.roles.slice(0, 4).forEach((r, i) => {
    const x = 0.7 + i * (colW + 0.25);
    s2.addShape(pptx.ShapeType.rect, { x, y: 3.2, w: colW, h: 0.04, fill: { color: C.dark } });
    s2.addText(`${r.name} · ${r.count}`, { x, y: 3.3, w: colW, h: 0.4, fontSize: 13, bold: true, color: C.dark, fontFace: FT });
    s2.addText(r.action, { x, y: 3.7, w: colW, h: 1.1, fontSize: 9.5, color: C.muted, fontFace: FB, valign: 'top' });
    const names = r.people ?? [];
    const shown = names.slice(0, 8);
    const more = names.length - shown.length;
    const list = shown.length
      ? shown.join('\n') + (more > 0 ? `\n${L(`+ ${more} more`, `+ ${more} autres`)}` : '')
      : L('Nobody yet', 'Personne pour l’instant');
    s2.addText(list, { x, y: 4.85, w: colW, h: 2.2, fontSize: 10.5, color: shown.length ? C.dark : C.mutedLight, fontFace: FB, valign: 'top', lineSpacingMultiple: 1.15 });
  });

  // 3 · Rollout plan
  const s3 = pptx.addSlide();
  s3.background = { fill: C.bg };
  blockTitle(s3, pptx, 3, L('Rollout plan', 'Plan de déploiement'), L('Derived from blocks 1 and 2', 'Déduit des blocs 1 et 2'));
  const steps = d.nextSteps.slice(0, 4);
  const cardH = Math.min(1.25, (5.4 - (steps.length - 1) * 0.2) / Math.max(1, steps.length));
  steps.forEach((st, i) => {
    const y = 1.55 + i * (cardH + 0.2);
    s3.addShape(pptx.ShapeType.roundRect, { x: 0.7, y, w: 11.9, h: cardH, fill: { color: C.bgAlt }, rectRadius: 0.12 });
    s3.addText(String(i + 1), { x: 0.9, y, w: 0.6, h: cardH, fontSize: 28, bold: true, color: C.primary, fontFace: FT, valign: 'middle' });
    s3.addText(st.title, { x: 1.6, y: y + 0.12, w: 8.6, h: 0.45, fontSize: 15, bold: true, color: C.dark, fontFace: FT });
    s3.addText(st.tag.toUpperCase(), { x: 10.2, y: y + 0.12, w: 2.2, h: 0.45, fontSize: 9, bold: true, color: C.muted, align: 'right', fontFace: FB, charSpacing: 1 });
    s3.addText(st.body, { x: 1.6, y: y + 0.55, w: 10.8, h: cardH - 0.65, fontSize: 11, color: C.muted, fontFace: FB, valign: 'top' });
  });

  // Divider before the detail
  const dv = pptx.addSlide();
  dv.background = { fill: C.dark };
  addGradientBar(dv, pptx, 3.9, 0.06);
  dv.addText(L('APPENDIX', 'ANNEXE'), { x: 0.7, y: 2.6, w: 11.9, h: 0.5, fontSize: 14, bold: true, color: C.primaryMid, fontFace: FB, charSpacing: 3 });
  dv.addText(L('The detail behind the numbers', 'Le détail derrière les chiffres'), { x: 0.7, y: 3.0, w: 11.9, h: 0.8, fontSize: 32, bold: true, color: C.white, fontFace: FT });
};

/** Dust brand shapes (brand guide): circle, arch, square, rounded and half-round blocks. */
const addBrandShapes = (slide: any, pptx: PptxGenJS, x: number, y: number, s: number, gap = 0.08) => {
  const shapes: [string, string, number][] = [
    [pptx.ShapeType.ellipse, '418B5C', 0],
    [pptx.ShapeType.roundRect, '9FDBFF', 0],
    [pptx.ShapeType.rect, 'FFC3DF', 0],
    [pptx.ShapeType.ellipse, '1C91FF', 0],
    [pptx.ShapeType.ellipse, 'FE9C1A', 0],
  ];
  shapes.forEach(([type, color, rotate], i) => {
    slide.addShape(type, { x: x + i * (s + gap), y, w: s, h: s, fill: { color }, line: { color, width: 0 }, rotate });
  });
};

const addWordmark = (slide: any, x: number, y: number, color: string) => {
  slide.addText([
    { text: 'Dust', options: { bold: true, color } },
    { text: '  AI Readiness Assessment', options: { color: '9AA3B2' } },
  ], { x, y, w: 6, h: 0.4, fontSize: 14, fontFace: FT });
};

const responseToValue = (response: string): number => {
  const mapping: Record<string, number> = { disagree: 1, somewhatDisagree: 2, neutral: 3, somewhatAgree: 4, agree: 5 };
  return mapping[response] || 0;
};

export const exportPPT = (
  participants: CampaignParticipant[],
  companyName: string,
  language: string,
  averageScore: number,
  thematicAverages: { thematic: string; originalThematic: string; score: number }[],
  summary?: SummaryPdfData | null
) => {
  const completed = participants.filter(p => p.status === 'completed');
  const inProgress = participants.filter(p => p.status === 'in_progress');
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'CUSTOM', width: 13.33, height: 7.5 });
  pptx.layout = 'CUSTOM';
  pptx.author = 'Dust';
  pptx.company = 'Dust';
  pptx.title = `${companyName} · AI Readiness Assessment`;
  pptx.subject = language === 'fr' ? 'Cadrage du déploiement Dust' : 'Dust deployment scoping';

  const date = new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // ============================================================
  // SLIDE 1 — TITLE (dark bg, gradient accents)
  // ============================================================
  const s1 = pptx.addSlide();
  s1.background = { fill: C.dark };
  addWordmark(s1, 0.7, 0.5, C.white);
  addBrandShapes(s1, pptx, 13.33 - 0.7 - 5 * 0.42 - 4 * 0.08, 0.5, 0.42);
  s1.addText((language === 'fr' ? 'RAPPORT DE\nMATURITÉ IA' : 'AI MATURITY\nREPORT').toUpperCase(), {
    x: 1, y: 1.2, w: 11.3, h: 2,
    fontSize: 52, bold: true, color: C.white, align: 'center', fontFace: FT,
    lineSpacingMultiple: 1.15,
  });
  s1.addText(companyName.toUpperCase(), {
    x: 1, y: 3.4, w: 11.3, h: 0.8,
    fontSize: 22, color: C.primaryGlow, align: 'center', fontFace: FB,
    charSpacing: 4,
  });
  s1.addText(date, {
    x: 1, y: 4.8, w: 11.3, h: 0.5,
    fontSize: 14, color: C.mutedLight, align: 'center', fontFace: FB,
  });
  const pillY = 5.7;
  s1.addShape(pptx.ShapeType.roundRect, {
    x: 3.5, y: pillY, w: 2.8, h: 0.55, fill: { color: C.cta }, rectRadius: 0.27,
  });
  s1.addText(`${completed.length} ${language === 'fr' ? 'répondants' : 'respondents'}`, {
    x: 3.5, y: pillY, w: 2.8, h: 0.55,
    fontSize: 12, color: C.white, align: 'center', valign: 'middle', fontFace: FB,
  });
  s1.addShape(pptx.ShapeType.roundRect, {
    x: 6.8, y: pillY, w: 3, h: 0.55, fill: { color: C.darkAlt }, rectRadius: 0.27,
    line: { color: C.muted, width: 0.5 },
  });
  s1.addText(`${getActiveThematics().length} ${language === 'fr' ? 'thématiques' : 'themes'}`, {
    x: 6.8, y: pillY, w: 3, h: 0.55,
    fontSize: 12, color: C.mutedLight, align: 'center', valign: 'middle', fontFace: FB,
  });

  // ============================================================
  // SLIDES 2-4 — THE CONSOLE'S THREE BLOCKS: STARTING POINT → PEOPLE → PLAN
  // ============================================================
  if (summary) {
    addBlockSlides(pptx, summary);
  } else {
    // ============================================================
    // SLIDE 2 — EXECUTIVE SUMMARY
    // ============================================================
    const s2 = pptx.addSlide();
    s2.background = { fill: C.bg };
    addSlideHeader(s2, pptx,
      language === 'fr' ? 'Synthèse Exécutive' : 'Executive Summary',
      language === 'fr' ? `Vue d'ensemble des résultats pour ${companyName}` : `Results overview for ${companyName}`
    );

    addMetricCard(s2, pptx, 0.7, 1.6, 2.8, 2.2, `${averageScore}%`, language === 'fr' ? 'Score moyen global' : 'Overall avg. score', C.cta);
    addMetricCard(s2, pptx, 3.9, 1.6, 2.8, 2.2, `${completed.length}`, language === 'fr' ? 'Tests complétés' : 'Tests completed', C.success);
    addMetricCard(s2, pptx, 7.1, 1.6, 2.8, 2.2, `${inProgress.length}`, language === 'fr' ? 'En cours' : 'In progress', C.warning);
    addMetricCard(s2, pptx, 10.3, 1.6, 2.8, 2.2, `${participants.length}`, language === 'fr' ? 'Total inscrits' : 'Total enrolled', C.muted);

    const completionRate = participants.length > 0 ? Math.round(completed.length / participants.length * 100) : 0;
    s2.addText(language === 'fr' ? `Taux de complétion: ${completionRate}%` : `Completion rate: ${completionRate}%`, {
      x: 0.7, y: 4.2, w: 12, h: 0.4,
      fontSize: 12, color: C.muted, fontFace: FB,
    });
    addScoreBar(s2, pptx, 0.7, 4.6, 11.9, completionRate);

    const sorted = [...thematicAverages].sort((a, b) => b.score - a.score);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best && worst) {
      s2.addShape(pptx.ShapeType.roundRect, {
        x: 0.7, y: 5.2, w: 5.8, h: 1.6, fill: { color: C.successBg }, rectRadius: 0.2,
        line: { color: C.success, width: 0.5 },
      });
      s2.addText(`${language === 'fr' ? 'Meilleure thématique' : 'Top theme'}`, {
        x: 1, y: 5.3, w: 5, h: 0.4,
        fontSize: 10, bold: true, color: C.success, fontFace: FB,
      });
      s2.addText(best.thematic, {
        x: 1, y: 5.7, w: 4, h: 0.5,
        fontSize: 16, bold: true, color: C.dark, fontFace: FB,
      });
      s2.addText(`${best.score}%`, {
        x: 5, y: 5.7, w: 1.2, h: 0.5,
        fontSize: 18, bold: true, color: C.success, fontFace: FT, align: 'right',
      });

      s2.addShape(pptx.ShapeType.roundRect, {
        x: 6.9, y: 5.2, w: 5.8, h: 1.6, fill: { color: C.dangerBg }, rectRadius: 0.2,
        line: { color: C.danger, width: 0.5 },
      });
      s2.addText(`${language === 'fr' ? 'Axe d\'amélioration' : 'Area for improvement'}`, {
        x: 7.2, y: 5.3, w: 5, h: 0.4,
        fontSize: 10, bold: true, color: C.danger, fontFace: FB,
      });
      s2.addText(worst.thematic, {
        x: 7.2, y: 5.7, w: 4, h: 0.5,
        fontSize: 16, bold: true, color: C.dark, fontFace: FB,
      });
      s2.addText(`${worst.score}%`, {
        x: 11.2, y: 5.7, w: 1.2, h: 0.5,
        fontSize: 18, bold: true, color: C.danger, fontFace: FT, align: 'right',
      });
    }
  }

  // ============================================================
  // SLIDE 3 — PROFILE DISTRIBUTION
  // ============================================================
  const s3 = pptx.addSlide();
  s3.background = { fill: C.bg };
  addSlideHeader(s3, pptx,
    language === 'fr' ? 'Répartition des Profils' : 'Profile Distribution',
    language === 'fr' ? 'Classification des participants selon leur niveau de maturité IA' : 'Participant classification by AI maturity level'
  );

  const profileData = CLASS_PROFILES.map(profile => ({
    name: classLabel(profile.id, language === 'en' ? 'en' : 'fr'),
    emoji: '',
    count: completed.filter(p => p.profile.id === profile.id).length,
    color: PROFILE_COLORS[profile.id] || C.muted,
    id: profile.id,
  }));

  const pieData = [{
    name: 'Profiles',
    labels: profileData.map(p => p.name),
    values: profileData.map(p => p.count || 0.001),
  }];

  s3.addChart(pptx.ChartType.pie, pieData, {
    x: 0.5, y: 1.5, w: 5.5, h: 5,
    showPercent: true,
    showTitle: false,
    showLegend: true,
    legendPos: 'b',
    legendFontSize: 11,
    chartColors: profileData.map(p => p.color),
  });

  profileData.forEach((p, i) => {
    const cardY = 1.5 + i * 1.05;
    const pct = completed.length > 0 ? Math.round(p.count / completed.length * 100) : 0;

    s3.addShape(pptx.ShapeType.roundRect, {
      x: 6.5, y: cardY, w: 6.3, h: 0.9,
      fill: { color: C.white },
      shadow: { type: 'outer', blur: 6, offset: 1, color: '000000', opacity: 0.06 },
      rectRadius: 0.2,
    });
    s3.addShape(pptx.ShapeType.rect, {
      x: 6.5, y: cardY, w: 0.08, h: 0.9, fill: { color: p.color },
    });
    s3.addText(p.name, {
      x: 6.8, y: cardY, w: 3, h: 0.9,
      fontSize: 13, bold: true, color: C.dark, fontFace: FB, valign: 'middle',
    });
    addScoreBar(s3, pptx, 9.8, cardY + 0.35, 1.8, pct);
    s3.addText(`${p.count} (${pct}%)`, {
      x: 11.7, y: cardY, w: 1, h: 0.9,
      fontSize: 12, bold: true, color: p.color, fontFace: FB, valign: 'middle', align: 'right',
    });
  });

  // ============================================================
  // SLIDE 4 — THEMATIC OVERVIEW (BAR CHART)
  // ============================================================
  const s4 = pptx.addSlide();
  s4.background = { fill: C.bg };
  addSlideHeader(s4, pptx,
    language === 'fr' ? 'Performance par Thématique' : 'Performance by Theme',
    language === 'fr' ? 'Score moyen de l\'ensemble des participants pour chaque thématique' : 'Average score of all participants for each theme'
  );

  const chartData = [{
    name: 'Score',
    labels: thematicAverages.map(ta => ta.thematic.length > 25 ? ta.thematic.substring(0, 23) + '…' : ta.thematic),
    values: thematicAverages.map(ta => ta.score),
  }];

  s4.addChart(pptx.ChartType.bar, chartData, {
    x: 0.5, y: 1.5, w: 12.3, h: 5.5,
    showValue: true,
    catAxisOrientation: 'minMax',
    valAxisMaxVal: 100,
    chartColors: thematicAverages.map(ta => getScoreColor(ta.score)),
    catAxisLabelFontSize: 10,
    valAxisLabelFontSize: 9,
  });

  // ============================================================
  // SLIDE 5 — RADAR CHART
  // ============================================================
  const s5 = pptx.addSlide();
  s5.background = { fill: C.bg };
  addSlideHeader(s5, pptx,
    language === 'fr' ? 'Vue Radar des Compétences' : 'Skills Radar View',
    language === 'fr' ? 'Visualisation multi-axes de la maturité IA' : 'Multi-axis visualization of AI maturity'
  );

  const radarData = [{
    name: companyName,
    labels: thematicAverages.map(ta => ta.thematic.length > 18 ? ta.thematic.substring(0, 16) + '…' : ta.thematic),
    values: thematicAverages.map(ta => ta.score),
  }];

  s5.addChart(pptx.ChartType.radar, radarData, {
    x: 1.5, y: 1.4, w: 10, h: 5.5,
    chartColors: [C.primary],
    catAxisLabelFontSize: 10,
    valAxisMaxVal: 100,
  });

  // ============================================================
  // SLIDES 6+ — ONE PER THEMATIC (DETAILED)
  // ============================================================
  thematicAverages.forEach((ta, idx) => {
    const slide = pptx.addSlide();
    slide.background = { fill: C.white };

    const def = getDimension(ta.originalThematic);
    const description = def ? (language === 'en' ? def.measures.en : def.measures.fr) : '';
    const highText = def
      ? (language === 'en'
        ? `${def.inReadiness ? 'Counts in the readiness index.' : 'Opportunity signal, not in the readiness index.'} Colour code: 70–100 strength, 50–69 fragile, 0–49 blocker.`
        : `${def.inReadiness ? "Compte dans l'indice de maturité." : "Signal d'opportunité, hors indice de maturité."} Code couleur : 70–100 point fort, 50–69 fragile, 0–49 bloquant.`)
      : '';
    const lowText = def ? (language === 'en' ? def.lowAction.en : def.lowAction.fr) : '';

    // Gradient header band
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 4.44, h: 1.5, fill: { color: C.primary } });
    slide.addShape(pptx.ShapeType.rect, { x: 4.44, y: 0, w: 4.44, h: 1.5, fill: { color: C.primaryMid } });
    slide.addShape(pptx.ShapeType.rect, { x: 8.88, y: 0, w: 4.45, h: 1.5, fill: { color: C.primaryLight } });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 1.2, w: 13.33, h: 0.5, fill: { color: C.primary, transparency: 60 },
    });
    slide.addText(`${String(idx + 1).padStart(2, '0')}`, {
      x: 0.5, y: 0.15, w: 1, h: 1.1,
      fontSize: 36, bold: true, color: C.primaryGlow, fontFace: FT, valign: 'middle',
    });
    slide.addText(ta.thematic.toUpperCase(), {
      x: 1.5, y: 0.15, w: 8, h: 1.1,
      fontSize: 24, bold: true, color: C.white, fontFace: FT, valign: 'middle',
    });

    const scoreColor = getScoreColor(ta.score);
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 10.5, y: 0.25, w: 2.3, h: 0.9,
      fill: { color: C.white }, rectRadius: 0.2,
    });
    slide.addText(`${ta.score}%`, {
      x: 10.5, y: 0.25, w: 2.3, h: 0.9,
      fontSize: 28, bold: true, color: scoreColor, fontFace: FT,
      align: 'center', valign: 'middle',
    });

    addScoreBar(slide, pptx, 0.7, 1.95, 11.9, ta.score);

    if (description) {
      slide.addText(language === 'fr' ? '📖 Description' : '📖 Description', {
        x: 0.7, y: 2.5, w: 12, h: 0.4,
        fontSize: 12, bold: true, color: C.cta, fontFace: FB,
      });
      slide.addText(description, {
        x: 0.7, y: 2.9, w: 11.9, h: 1.4,
        fontSize: 11, color: C.darkAlt, fontFace: FB,
        lineSpacingMultiple: 1.4,
        paraSpaceAfter: 4,
      });
    }

    const colY = 4.6;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.7, y: colY, w: 5.8, h: 2.5,
      fill: { color: C.successBg }, rectRadius: 0.2,
      line: { color: C.success, width: 0.5 },
    });
    slide.addText(`${language === 'fr' ? 'Lecture du score' : 'Reading the score'}`, {
      x: 0.9, y: colY + 0.1, w: 5.4, h: 0.4,
      fontSize: 11, bold: true, color: C.success, fontFace: FB,
    });
    slide.addText(highText, {
      x: 0.9, y: colY + 0.5, w: 5.4, h: 1.8,
      fontSize: 10, color: C.darkAlt, fontFace: FB,
      lineSpacingMultiple: 1.35,
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.8, y: colY, w: 5.8, h: 2.5,
      fill: { color: C.dangerBg }, rectRadius: 0.2,
      line: { color: C.danger, width: 0.5 },
    });
    slide.addText(`${language === 'fr' ? 'Si le score est bas' : 'If the score is low'}`, {
      x: 7, y: colY + 0.1, w: 5.4, h: 0.4,
      fontSize: 11, bold: true, color: C.danger, fontFace: FB,
    });
    slide.addText(lowText, {
      x: 7, y: colY + 0.5, w: 5.4, h: 1.8,
      fontSize: 10, color: C.darkAlt, fontFace: FB,
      lineSpacingMultiple: 1.35,
    });

    slide.addShape(pptx.ShapeType.rect, {
      x: 0.7, y: 7.2, w: 11.9, h: 0.01, fill: { color: C.bgAlt },
    });
    slide.addText(`${companyName} — Assessment IA`, {
      x: 0.7, y: 7.2, w: 6, h: 0.25,
      fontSize: 7, color: C.mutedLight, fontFace: FB,
    });
    slide.addText(`${idx + 1} / ${thematicAverages.length}`, {
      x: 10.7, y: 7.2, w: 2, h: 0.25,
      fontSize: 7, color: C.mutedLight, fontFace: FB, align: 'right',
    });
  });

  // ============================================================
  // DETAILED QUESTION RESPONSES SLIDES (per thematic)
  // ============================================================
  const responseLabels = language === 'fr'
    ? ['Pas du tout d\'accord', 'Plutôt pas d\'accord', 'Neutre', 'Plutôt d\'accord', 'Tout à fait d\'accord']
    : ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];

  const barColors = [C.danger, C.novice, C.mutedLight, C.curious, C.success];

  const _activeThematics = getActiveThematics();
  const _activeQuestions = getActiveQuestions();
  _activeThematics.forEach(thematic => {
    const thematicQuestions = _activeQuestions.filter(q => q.thematic === thematic);
    if (!thematicQuestions.length) return;

    const chunks: typeof thematicQuestions[] = [];
    for (let i = 0; i < thematicQuestions.length; i += 4) {
      chunks.push(thematicQuestions.slice(i, i + 4));
    }

    chunks.forEach((chunk, chunkIdx) => {
      const slide = pptx.addSlide();
      slide.background = { fill: C.bg };
      const suffix = chunks.length > 1 ? ` (${chunkIdx + 1}/${chunks.length})` : '';
      addSlideHeader(slide, pptx,
        `${language === 'fr' ? 'Détail des réponses' : 'Response Detail'} — ${dimensionLabel(thematic, language === 'en' ? 'en' : 'fr')}${suffix}`,
        language === 'fr' ? 'Distribution des réponses par question' : 'Response distribution per question'
      );

      chunk.forEach((question, qIdx) => {
        const qNumber = _activeQuestions.indexOf(question) + 1;
        const baseText = language === 'en' ? (QUESTION_TRANSLATIONS_EN[question.id] || question.text) : question.text;
        const qText = getQuestionText(question.id, baseText, getActiveAssessmentType(), language as 'fr' | 'en');

        const responseCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        completed.forEach(p => {
          const responses = p.responses as Record<string, string> | null;
          if (responses) {
            const val = responses[question.id.toString()];
            if (val) {
              const num = responseToValue(val);
              if (num >= 1 && num <= 5) responseCounts[num]++;
            }
          }
        });
        const total = Object.values(responseCounts).reduce((a, b) => a + b, 0);

        const baseY = 1.5 + qIdx * 1.45;

        slide.addText(`Q${qNumber}. ${qText.length > 90 ? qText.substring(0, 88) + '…' : qText}`, {
          x: 0.7, y: baseY, w: 12, h: 0.35,
          fontSize: 10, bold: true, color: C.dark, fontFace: FB,
        });

        let barX = 0.7;
        const barW = 9;
        const barY = baseY + 0.4;
        const barH = 0.3;

        slide.addShape(pptx.ShapeType.roundRect, {
          x: barX, y: barY, w: barW, h: barH, fill: { color: C.bgAlt }, rectRadius: 0.05,
        });

        let currentX = barX;
        for (let v = 1; v <= 5; v++) {
          const pct = total > 0 ? responseCounts[v] / total : 0;
          const segW = pct * barW;
          if (segW > 0.01) {
            slide.addShape(pptx.ShapeType.rect, {
              x: currentX, y: barY, w: segW, h: barH, fill: { color: barColors[v - 1] },
            });
          }
          currentX += segW;
        }

        const labelX = 10;
        for (let v = 1; v <= 5; v++) {
          const pct = total > 0 ? Math.round((responseCounts[v] / total) * 100) : 0;
          slide.addShape(pptx.ShapeType.rect, {
            x: labelX, y: barY - 0.02 + (v - 1) * 0.18, w: 0.12, h: 0.12, fill: { color: barColors[v - 1] },
          });
          slide.addText(`${pct}%`, {
            x: labelX + 0.15, y: barY - 0.07 + (v - 1) * 0.18, w: 0.6, h: 0.2,
            fontSize: 7, color: C.muted, fontFace: FB,
          });
        }
      });

      const legendY = 7.0;
      responseLabels.forEach((label, i) => {
        const lx = 0.7 + i * 2.5;
        slide.addShape(pptx.ShapeType.rect, {
          x: lx, y: legendY, w: 0.15, h: 0.15, fill: { color: barColors[i] },
        });
        slide.addText(label, {
          x: lx + 0.2, y: legendY - 0.03, w: 2.2, h: 0.2,
          fontSize: 7, color: C.muted, fontFace: FB,
        });
      });
    });
  });

  // ============================================================
  // TOP PERFORMERS SLIDE
  // ============================================================
  const topSlide = pptx.addSlide();
  topSlide.background = { fill: C.bg };
  addSlideHeader(topSlide, pptx,
    language === 'fr' ? 'Top Performers' : 'Top Performers',
    language === 'fr' ? 'Les participants ayant obtenu les meilleurs scores' : 'Participants with the highest scores'
  );

  const top10 = [...completed].sort((a, b) => b.score - a.score).slice(0, 10);

  const headerRow = [
    { text: '#', options: { fontSize: 10, bold: true, color: C.white, fill: { color: C.cta }, align: 'center' as const, fontFace: FB } },
    { text: language === 'fr' ? 'Nom' : 'Name', options: { fontSize: 10, bold: true, color: C.white, fill: { color: C.cta }, fontFace: FB } },
    { text: 'Email', options: { fontSize: 10, bold: true, color: C.white, fill: { color: C.cta }, fontFace: FB } },
    { text: 'Score', options: { fontSize: 10, bold: true, color: C.white, fill: { color: C.cta }, align: 'center' as const, fontFace: FB } },
    { text: language === 'fr' ? 'Profil' : 'Profile', options: { fontSize: 10, bold: true, color: C.white, fill: { color: C.cta }, align: 'center' as const, fontFace: FB } },
  ];

  const dataRows = top10.map((p, i) => [
    { text: `${i + 1}`, options: { fontSize: 10, color: C.muted, align: 'center' as const, fill: { color: i % 2 === 0 ? C.white : C.bgAlt }, fontFace: FB } },
    { text: `${p.firstName} ${p.lastName}`, options: { fontSize: 10, color: C.dark, bold: i < 3, fill: { color: i % 2 === 0 ? C.white : C.bgAlt }, fontFace: FB } },
    { text: p.email, options: { fontSize: 9, color: C.muted, fill: { color: i % 2 === 0 ? C.white : C.bgAlt }, fontFace: FB } },
    { text: `${p.score}%`, options: { fontSize: 11, bold: true, color: getScoreColor(p.score), align: 'center' as const, fill: { color: i % 2 === 0 ? C.white : C.bgAlt }, fontFace: FT } },
    { text: `${classLabel(p.profile.id, language === 'en' ? 'en' : 'fr')}`, options: { fontSize: 10, color: PROFILE_COLORS[p.profile.id] || C.muted, align: 'center' as const, fill: { color: i % 2 === 0 ? C.white : C.bgAlt }, fontFace: FB } },
  ]);

  topSlide.addTable([headerRow, ...dataRows], {
    x: 0.7, y: 1.6, w: 11.9,
    colW: [0.6, 3, 3.5, 1.2, 2],
    border: { type: 'solid', pt: 0.5, color: C.bgAlt },
    rowH: 0.45,
  });

  // ============================================================
  // LAST SLIDE — CLOSING
  // ============================================================
  const lastSlide = pptx.addSlide();
  lastSlide.background = { fill: C.dark };
  addBrandShapes(lastSlide, pptx, (13.33 - (5 * 0.42 + 4 * 0.08)) / 2, 1.0, 0.42);
  lastSlide.addText((language === 'fr' ? 'MERCI' : 'THANK YOU').toUpperCase(), {
    x: 1, y: 1.8, w: 11.3, h: 1.2,
    fontSize: 52, bold: true, color: C.white, align: 'center', fontFace: FT,
  });
  lastSlide.addText(language === 'fr'
    ? `Ce rapport a été généré automatiquement\nà partir des données de la campagne ${companyName}.`
    : `This report was automatically generated\nfrom campaign data for ${companyName}.`,
  {
    x: 1, y: 3.5, w: 11.3, h: 1,
    fontSize: 14, color: C.mutedLight, align: 'center', fontFace: FB,
    lineSpacingMultiple: 1.5,
  });
  lastSlide.addText('Dust · AI Readiness Assessment · dust-assessment.com', {
    x: 1, y: 5.2, w: 11.3, h: 0.5,
    fontSize: 12, color: C.primaryGlow, align: 'center', fontFace: FB,
    charSpacing: 2,
  });
  lastSlide.addText(date, {
    x: 1, y: 5.7, w: 11.3, h: 0.4,
    fontSize: 10, color: C.muted, align: 'center', fontFace: FB,
  });

  pptx.writeFile({ fileName: `dust-ai-readiness-${companyName.replace(/\s+/g, '-').toLowerCase()}.pptx` });
};
