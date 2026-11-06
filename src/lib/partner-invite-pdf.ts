import jsPDF from 'jspdf';
import { clean, drawBrandShapes } from '@/lib/export-pdf';
import type { Partner } from '@/lib/partners';

const INK: [number, number, number] = [28, 34, 45];
const MUTED: [number, number, number] = [84, 93, 108];
const BLUE: [number, number, number] = [28, 145, 255];
const ICE: [number, number, number] = [233, 247, 255];
const LINE: [number, number, number] = [223, 224, 226];

/** One page to send with the invitation: how to sign in, who can, what the partner space holds. */
export const exportPartnerInvitePDF = (p: Pick<Partner, 'name' | 'domains' | 'emails'>, origin: string, lang: 'fr' | 'en') => {
  const fr = lang === 'fr';
  const L = (en: string, frText: string) => clean(fr ? frText : en);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const W = 210;
  const M = 18;
  const inner = W - 2 * M;
  const link = `${origin}/login?partenaire`;

  const text = (s: string, x: number, y: number, o: { size?: number; bold?: boolean; color?: [number, number, number]; maxW?: number } = {}) => {
    pdf.setFont('helvetica', o.bold ? 'bold' : 'normal');
    pdf.setFontSize(o.size ?? 10.5);
    pdf.setTextColor(...(o.color ?? INK));
    const lines = o.maxW ? pdf.splitTextToSize(clean(s), o.maxW) : [clean(s)];
    pdf.text(lines, x, y);
    return lines.length * (o.size ?? 10.5) * 0.42;
  };

  // Header
  drawBrandShapes(pdf, M, 16, 7, 1.6);
  let y = 40;
  y += text(L('Dust Assessment · Partner space', 'Dust Assessment · Espace partenaire'), M, y, { size: 10, color: MUTED });
  y += 4;
  y += text(L(`Welcome, ${p.name}`, `Bienvenue, ${p.name}`), M, y, { size: 24, bold: true });
  y += 3;
  y += text(
    L(
      'Your space to run AI diagnostics and rollouts with your clients, follow their results and their progress, with Dust.',
      'Votre espace pour mener des diagnostics IA et des déploiements avec vos clients, suivre leurs résultats et leur évolution, avec Dust.'
    ),
    M,
    y,
    { size: 11.5, color: MUTED, maxW: inner }
  );

  // Sign-in box
  y += 8;
  const boxTop = y;
  const named = p.emails?.length ? p.emails : null;
  const steps = [
    [L('Open', 'Ouvrez'), link],
    [
      L('Enter your work email', 'Saisissez votre adresse e-mail professionnelle'),
      named ? named.join(', ') : p.domains.map((d) => `...@${d}`).join(L(' or ', ' ou ')),
    ],
    [L('Click the link you receive by email', 'Cliquez sur le lien reçu par e-mail'), L('No password: the link signs you in.', 'Pas de mot de passe : le lien vous connecte.')],
  ];
  // Box sized to its content: title, then each step (title line + wrapped detail).
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10.5);
  const boxH = 10 + 9 + steps.reduce((h, [, d]) => h + 9 + pdf.splitTextToSize(clean(d), inner - 28).length * 10.5 * 0.42, 0) + 2;
  pdf.setFillColor(...ICE);
  pdf.roundedRect(M, boxTop, inner, boxH, 3, 3, 'F');
  y += 10;
  text(L('Sign in in three steps', 'Se connecter en trois étapes'), M + 8, y, { size: 13, bold: true });
  y += 9;
  steps.forEach(([title, detail], i) => {
    pdf.setFillColor(...BLUE);
    pdf.circle(M + 12, y - 1.3, 3.4, 'F');
    text(String(i + 1), M + 10.9, y, { size: 10, bold: true, color: [255, 255, 255] });
    text(title, M + 19, y, { size: 11, bold: true });
    const h = text(detail, M + 19, y + 5.2, { size: 10.5, color: i === 0 ? BLUE : MUTED, maxW: inner - 28 });
    y += 9 + h;
  });

  // Who can sign in
  y = boxTop + boxH + 10;
  y += text(L('Who can sign in', 'Qui peut se connecter'), M, y, { size: 13, bold: true });
  y += 2;
  y += text(
    named
      ? L(`Only these people: ${named.join(', ')}. To add someone, ask your Dust contact.`, `Seulement ces personnes : ${named.join(', ')}. Pour ajouter quelqu'un, demandez-le à votre contact Dust.`)
      : L(`Anyone in your team with a ${p.domains.map((d) => '@' + d).join(' / ')} address.`, `Toute votre équipe, avec une adresse ${p.domains.map((d) => '@' + d).join(' / ')}.`),
    M,
    y,
    { size: 10.5, color: MUTED, maxW: inner }
  );

  // What's inside
  y += 8;
  y += text(L('What you will find', 'Ce que vous y trouvez'), M, y, { size: 13, bold: true });
  y += 3;
  const items = [
    [L('Campaigns', 'Campagnes'), L('Create an AI diagnostic or a rollout survey for a client, and send them the link.', 'Créez un diagnostic IA ou un questionnaire de déploiement pour un client, et envoyez-lui le lien.')],
    [L('Results', 'Résultats'), L('Readiness, team by team, the people to rely on, open answers.', 'Le niveau de préparation équipe par équipe, les personnes relais, les réponses libres.')],
    [L('Analyse with Dust', 'Analyser avec Dust'), L('Export the data and let a Dust agent find the use cases and blockers.', 'Exportez les données et laissez un agent Dust trouver les cas d’usage et les freins.')],
    [L('Progress', 'Suivi'), L('Measure again a few weeks later and see what changed.', 'Mesurez à nouveau quelques semaines après et voyez ce qui a changé.')],
  ];
  items.forEach(([t, d]) => {
    pdf.setDrawColor(...LINE);
    pdf.line(M, y, W - M, y);
    y += 6;
    text(t, M, y, { size: 11, bold: true });
    const h = text(d, M + 48, y, { size: 10.5, color: MUTED, maxW: inner - 48 });
    y += Math.max(5, h) + 2;
  });

  // Privacy
  y += 6;
  text(
    L(
      'You only see your own clients. Your clients only see their own results. Dust never shares one client with another.',
      'Vous ne voyez que vos propres clients. Vos clients ne voient que leurs propres résultats. Dust ne partage jamais un client avec un autre.'
    ),
    M,
    y,
    { size: 9.5, color: MUTED, maxW: inner }
  );
  text('dust.tt', M, 285, { size: 9, color: MUTED });

  const slug = p.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  pdf.save(`${fr ? 'invitation-espace-partenaire' : 'partner-space-invitation'}-${slug || 'partenaire'}.pdf`);
};
