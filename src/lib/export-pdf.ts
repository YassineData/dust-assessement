import jsPDF from 'jspdf';

/** One-page campaign summary, read as the console: starting point → people → rollout plan. */
export interface SummaryPdfData {
  lang: 'fr' | 'en';
  company: string;
  campaignName?: string | null;
  completed: number;
  registered: number;
  readiness: number;
  benchmarkDelta?: number;
  bandTitle: string;
  synthesis: string;
  dimensions: { name: string; score: number; benchmark?: number }[];
  people: { label: string; count: number; pct: number }[];
  nextSteps: { title: string; tag: string; body: string }[];
  roles: { name: string; count: number; action: string; people?: string[] }[];
}

const INK: [number, number, number] = [28, 34, 45];
const MUTED: [number, number, number] = [84, 93, 108];
const LINE: [number, number, number] = [223, 224, 226];
const PAPER: [number, number, number] = [247, 247, 247];
const BLUE: [number, number, number] = [28, 145, 255];
const BENCH: [number, number, number] = [211, 213, 217];
const RED: [number, number, number] = [225, 67, 34];
const LIME: [number, number, number] = [226, 247, 140];

// Brand shapes (Dust brand guide): circle, arch, square, two quarter circles.
const drawBrandShapes = (pdf: jsPDF, x: number, y: number, s: number, gap: number) => {
  const k = 0.5523 * s;
  pdf.setFillColor(65, 139, 92);
  pdf.circle(x + s / 2, y + s / 2, s / 2, 'F');
  x += s + gap;
  pdf.setFillColor(159, 219, 255);
  pdf.circle(x + s / 2, y + s / 2, s / 2, 'F');
  pdf.rect(x, y + s / 2, s, s / 2, 'F');
  x += s + gap;
  pdf.setFillColor(255, 195, 223);
  pdf.rect(x, y, s, s, 'F');
  x += s + gap;
  pdf.setFillColor(28, 145, 255);
  pdf.lines([[0, -s], [k, 0, s, s - k, s, s]], x, y + s, [1, 1], 'F', true);
  x += s + gap;
  pdf.setFillColor(254, 156, 26);
  pdf.lines([[0, -s], [-k, 0, -s, s - k, -s, s]], x + s, y + s, [1, 1], 'F', true);
};

// Built-in PDF fonts only cover Latin-1: normalise the few characters outside it.
const clean = (s: string) =>
  s.replace(/[’‘]/g, "'").replace(/[“”«»]/g, '"').replace(/[–—]/g, '-').replace(/→/g, '->').replace(/≥/g, '>=').replace(/…/g, '...').replace(/\u00A0|\u202F/g, ' ');

export const exportSummaryPDF = (d: SummaryPdfData) => {
  const fr = d.lang === 'fr';
  const L = (en: string, frText: string) => clean(fr ? frText : en);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const W = 210;
  const M = 16;
  const inner = W - 2 * M;
  let y = 0;

  const text = (s: string, x: number, yy: number, o: { size?: number; bold?: boolean; color?: [number, number, number]; align?: 'left' | 'right' | 'center'; maxW?: number } = {}) => {
    pdf.setFont('helvetica', o.bold ? 'bold' : 'normal');
    pdf.setFontSize(o.size ?? 10);
    pdf.setTextColor(...(o.color ?? INK));
    const lines = o.maxW ? pdf.splitTextToSize(clean(s), o.maxW) : [clean(s)];
    pdf.text(lines, x, yy, { align: o.align ?? 'left' });
    return lines.length;
  };
  const blockHeader = (n: number, title: string, question: string) => {
    pdf.setFillColor(...INK);
    pdf.circle(M + 3, y - 1.2, 3, 'F');
    text(String(n), M + 3, y, { size: 8, bold: true, color: [255, 255, 255], align: 'center' });
    text(title, M + 9, y, { size: 12, bold: true });
    text(question, W - M, y, { size: 8, color: MUTED, align: 'right' });
    pdf.setDrawColor(...LINE);
    pdf.line(M, y + 2.5, W - M, y + 2.5);
    y += 8;
  };

  // Header band
  pdf.setFillColor(...INK);
  pdf.rect(0, 0, W, 22, 'F');
  text('Dust', M, 10, { size: 13, bold: true, color: [255, 255, 255] });
  text('AI Maturity Assessment', M + 13, 10, { size: 10, color: [200, 204, 210] });
  const date = new Date().toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  drawBrandShapes(pdf, W - M - 29, 5.5, 5, 1);
  text(d.company, M, 18, { size: 11, bold: true, color: [255, 255, 255] });
  text(
    `${d.campaignName ? `${d.campaignName} · ` : ''}${d.completed} ${L('answers out of', 'réponses sur')} ${d.registered} ${L('registered', 'inscrits')} · ${date}`,
    W - M, 18, { size: 9, color: [200, 204, 210], align: 'right' }
  );
  y = 32;

  // 1 · Starting point
  blockHeader(1, L('Starting point', 'Point de départ'), L('Where does the account stand with AI?', 'Où en est le compte avec l’IA ?'));
  pdf.setFillColor(...PAPER);
  pdf.roundedRect(M, y, 46, 30, 2, 2, 'F');
  text(String(d.readiness), M + 23, y + 15, { size: 26, bold: true, align: 'center' });
  text('/100', M + 23, y + 21, { size: 8, color: MUTED, align: 'center' });
  text(L('AI readiness index', 'Indice de maturité IA'), M + 23, y + 26.5, { size: 7, color: MUTED, align: 'center' });
  text(d.bandTitle, M + 52, y + 6, { size: 13, bold: true });
  if (typeof d.benchmarkDelta === 'number') {
    const pos = d.benchmarkDelta >= 0;
    text(`${pos ? '+' : ''}${d.benchmarkDelta} ${L('pts vs benchmark', 'pts vs benchmark')}`, W - M, y + 6, { size: 9, bold: true, color: pos ? [65, 139, 92] : RED, align: 'right' });
  }
  text(d.synthesis, M + 52, y + 13, { size: 9, color: MUTED, maxW: inner - 52 });
  y += 36;

  // Dimension bars (cohort vs benchmark)
  const labelW = 46;
  const barX = M + labelW;
  const barW = inner - labelW - 14;
  d.dimensions.forEach((dim) => {
    text(dim.name, M, y + 2.6, { size: 8.5 });
    pdf.setFillColor(...PAPER);
    pdf.roundedRect(barX, y, barW, 3.4, 1.7, 1.7, 'F');
    const w = Math.max(1, (barW * Math.max(0, Math.min(100, dim.score))) / 100);
    pdf.setFillColor(...(dim.score < 50 ? RED : BLUE));
    pdf.roundedRect(barX, y, w, 3.4, 1.7, 1.7, 'F');
    if (typeof dim.benchmark === 'number') {
      const bx = barX + (barW * dim.benchmark) / 100;
      pdf.setDrawColor(...INK);
      pdf.setLineWidth(0.5);
      pdf.line(bx, y - 1, bx, y + 4.4);
      pdf.setLineWidth(0.2);
    }
    text(String(dim.score), W - M, y + 2.8, { size: 9, bold: true, align: 'right' });
    y += 6.2;
  });
  text(L('Bar: this cohort · tick: benchmark across all rollouts', 'Barre : cette cohorte · trait : benchmark de tous les déploiements'), M, y + 1, { size: 7, color: MUTED });
  pdf.setFillColor(...BENCH);
  y += 9;

  // 2 · People
  blockHeader(2, L('People', 'Personnes'), L('Who can we rely on? (roles can overlap)', 'Sur qui s’appuyer ? (rôles cumulables)'));
  const tileW = (inner - 4 * 3) / 5;
  d.people.slice(0, 5).forEach((p, i) => {
    const x = M + i * (tileW + 3);
    pdf.setFillColor(...PAPER);
    pdf.roundedRect(x, y, tileW, 19, 2, 2, 'F');
    text(p.label.toUpperCase(), x + 3, y + 5, { size: 6.5, bold: true, color: MUTED, maxW: tileW - 6 });
    text(String(p.count), x + 3, y + 13.5, { size: 16, bold: true });
    text(`${p.pct}%`, x + tileW - 3, y + 13.5, { size: 8, color: MUTED, align: 'right' });
  });
  y += 26;

  // 3 · Rollout plan
  blockHeader(3, L('Rollout plan', 'Plan de déploiement'), L('Derived from blocks 1 and 2', 'Déduit des blocs 1 et 2'));
  const colW = (inner - 6) / 2;
  let yl = y;
  let yr = y;
  text(L('Next steps', 'Prochaines étapes'), M, yl, { size: 9.5, bold: true });
  yl += 5;
  d.nextSteps.forEach((s, i) => {
    text(`${i + 1}. ${s.title}`, M, yl, { size: 9, bold: true, maxW: colW - 20 });
    text(s.tag, M + colW, yl, { size: 7.5, bold: true, color: MUTED, align: 'right' });
    const n = text(s.body, M, yl + 4.2, { size: 8.5, color: MUTED, maxW: colW });
    yl += 5 + n * 3.8 + 2.5;
  });
  const xr = M + colW + 6;
  text(L('Who does what', 'Qui fait quoi'), xr, yr, { size: 9.5, bold: true });
  yr += 5;
  d.roles.filter((r) => r.count > 0).forEach((r) => {
    pdf.setFillColor(...LIME);
    pdf.roundedRect(xr, yr - 3.2, 8, 4.6, 1, 1, 'F');
    text(String(r.count), xr + 4, yr, { size: 8, bold: true, align: 'center' });
    text(r.name, xr + 10, yr, { size: 9, bold: true, maxW: colW - 10 });
    const n = text(r.action, xr + 10, yr + 4.2, { size: 8.5, color: MUTED, maxW: colW - 10 });
    yr += 5 + n * 3.8 + 2.5;
  });
  y = Math.max(yl, yr);

  // Footer
  pdf.setDrawColor(...LINE);
  pdf.line(M, 284, W - M, 284);
  text(L('Dust · AI Maturity Assessment · confidential, for the rollout team', 'Dust · AI Maturity Assessment · confidentiel, pour l’équipe du déploiement'), M, 289, { size: 7, color: MUTED });
  text('dust-assessment.com', W - M, 289, { size: 7, color: MUTED, align: 'right' });

  const slug = d.company.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  pdf.save(`${fr ? 'synthese' : 'summary'}-${slug || 'campaign'}.pdf`);
};
