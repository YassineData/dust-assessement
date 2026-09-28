import { V2_QUESTION_BY_NUMERIC_ID } from "./assessment-v2";
// Assessment Questions and Scoring Data

export interface Question {
  id: number;
  itemMacro: 'INDIVIDU' | 'ENTREPRISE';
  thematic: string;
  text: string;
  scores: {
    disagree: number;
    somewhatDisagree: number;
    neutral: number;
    somewhatAgree: number;
    agree: number;
  };
}

// Thématiques micro pour le calcul du profil (uniquement INDIVIDU)
export const PROFILE_THEMATICS = [
  "État d'esprit",
  "Sécurité",
  "IA en Vente",
  "Maîtrise IA",
  "Usages avancés",
  "Ambitions",
] as const;

// Toutes les thématiques micro (pour le dashboard)
export const THEMATICS = [
  "État d'esprit",
  "Attentes IA",
  "Mon entreprise et l'IA",
  "Formation interne",
  "Accompagnement",
  "IA en Vente",
  "Maîtrise IA",
  "Sécurité",
  "Ambitions",
  "Usages avancés",
] as const;

export type ThematicType = typeof THEMATICS[number];

// Type d'assessment (correspond à campaigns.assessment_type en DB)
export type AssessmentType = 'sales' | 'generic';

// Thématiques exclues pour le type "generic"
const GENERIC_EXCLUDED_THEMATICS: readonly string[] = ["IA en Vente"];

// Retourne la liste des thématiques applicables selon le type
export const getThematicsForType = (type: AssessmentType): readonly string[] => {
  if (type === 'generic') {
    return THEMATICS.filter((t) => !GENERIC_EXCLUDED_THEMATICS.includes(t));
  }
  return THEMATICS;
};

// Retourne la liste des questions applicables selon le type
export const getQuestionsForType = (type: AssessmentType): Question[] => {
  if (type === 'generic') {
    return QUESTIONS.filter((q) => !GENERIC_EXCLUDED_THEMATICS.includes(q.thematic));
  }
  return QUESTIONS;
};

// Helper de filtrage simple pour score maps
export const isThematicAllowed = (thematic: string, type: AssessmentType): boolean => {
  if (type === 'generic' && GENERIC_EXCLUDED_THEMATICS.includes(thematic)) return false;
  return true;
};

// Surcharge du texte des questions pour le test générique (suppression des termes "commercial/sales")
const GENERIC_QUESTION_TEXT_OVERRIDES_FR: Record<number, string> = {
  8: "J'attends de l'IA une amélioration de mes performances",
  19: "Les formations IA proposées sont adaptées à mon métier",
};

const GENERIC_QUESTION_TEXT_OVERRIDES_EN: Record<number, string> = {
  8: "I expect AI to improve my performance",
  19: "The AI training offered is adapted to my role",
};

export const getQuestionText = (
  questionId: number,
  defaultText: string,
  type: AssessmentType,
  language: 'fr' | 'en' = 'fr'
): string => {
  // v2 questions use numeric ids 101+ (see assessment-v2 V2_AS_LEGACY_QUESTIONS)
  const v2 = V2_QUESTION_BY_NUMERIC_ID[questionId];
  if (v2) return language === 'en' ? v2.text.en : v2.text.fr;
  if (type === 'generic') {
    const overrides = language === 'en' ? GENERIC_QUESTION_TEXT_OVERRIDES_EN : GENERIC_QUESTION_TEXT_OVERRIDES_FR;
    if (overrides[questionId]) return overrides[questionId];
  }
  return defaultText;
};

export const THEMATIC_DEFINITIONS: Record<ThematicType, { title: string; description: string; highScore: string; lowScore: string; descriptionEn: string; highScoreEn: string; lowScoreEn: string }> = {
  "État d'esprit": {
    title: "État d'esprit",
    description: "Cet indicateur sonde la posture d'ouverture et l'agilité face à l'incertitude technologique, au-delà de la simple compétence technique. Les questions portent sur la curiosité, l'absence de peur face à l'outil et la capacité à voir l'IA comme une opportunité plutôt qu'une menace.",
    highScore: "Un score haut révèle une culture d'entreprise saine et audacieuse, facilitant l'adoption de nouveaux réflexes sans friction.",
    lowScore: "Un score bas indique un climat d'anxiété ou de scepticisme qui nécessite un travail de réassurance et de démystification pour éviter un blocage psychologique collectif.",
    descriptionEn: "This indicator measures openness and agility in the face of technological uncertainty, beyond mere technical competence. Questions focus on curiosity, absence of fear towards AI tools, and the ability to see AI as an opportunity rather than a threat.",
    highScoreEn: "A high score reveals a healthy and bold corporate culture, facilitating the adoption of new habits without friction.",
    lowScoreEn: "A low score indicates a climate of anxiety or skepticism that requires reassurance and demystification to prevent collective psychological resistance."
  },
  "Attentes IA": {
    title: "Attentes IA",
    description: "Cet indicateur mesure les attentes et aspirations du collaborateur vis-à-vis de l'IA dans son quotidien professionnel.",
    highScore: "Un score haut montre des attentes élevées et une vision claire des bénéfices attendus de l'IA.",
    lowScore: "Un score bas indique un manque de projection ou des attentes limitées vis-à-vis de l'IA.",
    descriptionEn: "This indicator measures the employee's expectations and aspirations regarding AI in their daily professional life.",
    highScoreEn: "A high score shows high expectations and a clear vision of the expected benefits of AI.",
    lowScoreEn: "A low score indicates a lack of projection or limited expectations regarding AI."
  },
  "Mon entreprise et l'IA": {
    title: "Mon entreprise et l'IA",
    description: "Cet indicateur mesure la clarté de la vision stratégique de la direction et le sentiment d'appartenance à un projet technologique commun. On évalue ici si le collaborateur comprend la direction prise par l'entreprise et s'il se sent soutenu par une politique globale cohérente.",
    highScore: "Un score haut témoigne d'un fort alignement stratégique, garantissant que les efforts individuels servent les objectifs de l'organisation.",
    lowScore: "Un score bas révèle un flou stratégique qui génère de la confusion, une dispersion des initiatives et une perte de confiance dans la capacité de l'entreprise à rester leader sur son marché.",
    descriptionEn: "This indicator measures the clarity of leadership's strategic vision and the sense of belonging to a shared technological project. It evaluates whether the employee understands the company's direction and feels supported by a coherent global policy.",
    highScoreEn: "A high score demonstrates strong strategic alignment, ensuring individual efforts serve organizational objectives.",
    lowScoreEn: "A low score reveals strategic ambiguity that generates confusion, scattered initiatives, and loss of confidence in the company's ability to remain a market leader."
  },
  "Formation interne": {
    title: "Formation interne",
    description: "Cette thématique évalue la qualité et l'accessibilité perçue du transfert de connaissances au sein de l'organisation. On mesure ici si le collaborateur se sent outillé pour progresser, s'il a accès à des ressources claires et s'il existe une culture d'apprentissage continu.",
    highScore: "Un score élevé valide l'efficacité de vos dispositifs de montée en compétence et assure une homogénéité du niveau technique.",
    lowScore: "Un score faible montre une déconnexion entre les besoins des équipes et les ressources proposées, créant un sentiment d'isolement qui peut mener à un décrochage technologique des talents.",
    descriptionEn: "This theme evaluates the perceived quality and accessibility of knowledge transfer within the organization. It measures whether the employee feels equipped to progress, has access to clear resources, and whether a culture of continuous learning exists.",
    highScoreEn: "A high score validates the effectiveness of your upskilling programs and ensures consistency in technical proficiency.",
    lowScoreEn: "A low score shows a disconnect between team needs and available resources, creating a sense of isolation that can lead to technological disengagement of talent."
  },
  "Accompagnement": {
    title: "Accompagnement",
    description: "Cet item analyse la qualité de l'accompagnement et du soutien managérial perçu par le collaborateur dans sa démarche d'utilisation de l'IA. Les questions mesurent si l'encadrement encourage activement les tests, s'il autorise l'erreur et s'il valorise les initiatives liées à l'automatisation.",
    highScore: "Un score élevé indique un leadership facilitateur qui crée un environnement sécurisant pour l'innovation et l'autonomie.",
    lowScore: "Un score faible montre un management perçu comme un frein ou comme indifférent, ce qui décourage les collaborateurs de prendre des initiatives et stérilise le potentiel de gain de productivité.",
    descriptionEn: "This item analyzes the quality of support and managerial guidance perceived by the employee in their AI usage journey. Questions measure whether management actively encourages experimentation, allows for mistakes, and values automation-related initiatives.",
    highScoreEn: "A high score indicates enabling leadership that creates a secure environment for innovation and autonomy.",
    lowScoreEn: "A low score shows management perceived as a hindrance or indifferent, discouraging employees from taking initiatives and sterilizing productivity gain potential."
  },
  "IA en Vente": {
    title: "IA en Vente",
    description: "Cet item mesure l'intégration concrète de l'IA dans les processus de développement commercial et de relation client, de la prospection à la rédaction d'offres. Les questions cherchent à savoir si l'IA est utilisée pour personnaliser l'approche et gagner en pertinence lors des interactions.",
    highScore: "Un score élevé signifie que votre force de vente utilise la technologie pour augmenter sa réactivité et la qualité de son suivi client.",
    lowScore: "Un score faible indique que vos commerciaux restent sur des méthodes traditionnelles chronophages, ce qui peut réduire votre compétitivité face à des acteurs utilisant l'IA pour accélérer leurs cycles de vente.",
    descriptionEn: "This item measures the concrete integration of AI in business development and customer relationship processes, from prospecting to proposal writing. Questions seek to know if AI is used to personalize the approach and increase relevance during interactions.",
    highScoreEn: "A high score means your sales force uses technology to increase responsiveness and quality of customer follow-up.",
    lowScoreEn: "A low score indicates your salespeople rely on time-consuming traditional methods, which can reduce competitiveness against players using AI to accelerate their sales cycles."
  },
  "Maîtrise IA": {
    title: "Maîtrise IA",
    description: "Cet indicateur évalue la connaissance opérationnelle des outils majeurs (ChatGPT, Claude, Gemini) et la capacité à générer des livrables concrets comme du texte ou des images. On mesure ici le niveau d'autonomie technique de l'individu face aux solutions de GenIA.",
    highScore: "Un score élevé garantit une exécution rapide et qualitative des tâches quotidiennes de production.",
    lowScore: "Un score faible révèle une méconnaissance des outils qui force les collaborateurs à travailler de manière artisanale, impactant lourdement la rentabilité et la réactivité de vos départements.",
    descriptionEn: "This indicator evaluates operational knowledge of major tools (ChatGPT, Claude, Gemini) and the ability to generate concrete deliverables like text or images. It measures the individual's level of technical autonomy with GenAI solutions.",
    highScoreEn: "A high score ensures fast and quality execution of daily production tasks.",
    lowScoreEn: "A low score reveals unfamiliarity with tools that forces employees to work manually, heavily impacting profitability and responsiveness of your departments."
  },
  "Sécurité": {
    title: "Sécurité",
    description: "Cette thématique évalue la conscience des risques critiques et la connaissance des bonnes pratiques en matière de protection des données et de vérification des informations. Les questions vérifient si le collaborateur sait protéger les données confidentielles et s'il a le réflexe de fact-checking face aux réponses de l'IA.",
    highScore: "Un score élevé assure une pratique responsable qui limite les risques juridiques et réputationnels.",
    lowScore: "Un score faible constitue un signal d'alarme : vos données sensibles sont potentiellement exposées à l'extérieur, mettant l'entreprise en danger face aux réglementations comme le RGPD.",
    descriptionEn: "This theme evaluates awareness of critical risks and knowledge of best practices regarding data protection and information verification. Questions check whether the employee knows how to protect confidential data and has the reflex to fact-check AI responses.",
    highScoreEn: "A high score ensures responsible practices that limit legal and reputational risks.",
    lowScoreEn: "A low score is an alarm signal: your sensitive data is potentially exposed externally, putting the company at risk regarding regulations like GDPR."
  },
  "Ambitions": {
    title: "Ambitions",
    description: "Cet item mesure le désir de projection et la volonté d'engagement du collaborateur dans la transformation de son métier par l'IA. À travers des questions sur l'envie de tester des usages avancés ou de devenir un relais interne, on évalue le réservoir de motivation pour l'innovation.",
    highScore: "Un score élevé identifie des collaborateurs prêts à devenir des piliers de votre transformation, réduisant ainsi les efforts de conduite du changement.",
    lowScore: "Un score faible signale un manque d'attrait pour l'évolution des missions, ce qui peut freiner la modernisation des méthodes de travail et limiter l'impact des outils que vous déploierez.",
    descriptionEn: "This item measures the desire for projection and the employee's willingness to engage in the AI transformation of their profession. Through questions about the desire to test advanced uses or become an internal advocate, it evaluates the motivation reservoir for innovation.",
    highScoreEn: "A high score identifies employees ready to become pillars of your transformation, reducing change management efforts.",
    lowScoreEn: "A low score signals a lack of interest in evolving responsibilities, which can slow modernization of work methods and limit the impact of tools you deploy."
  },
  "Usages avancés": {
    title: "Usages avancés",
    description: "Cet indicateur explore la profondeur technique de l'usage, notamment la maîtrise du Prompt Engineering et l'optimisation des requêtes pour obtenir des résultats experts. On mesure ici la capacité à transformer une simple conversation avec l'IA en un véritable levier d'ingénierie logicielle ou de création complexe.",
    highScore: "Un score élevé place vos équipes au sommet de l'efficacité, capables de produire des résultats impossibles à obtenir avec un usage basique.",
    lowScore: "Un score faible indique que vos collaborateurs sous-exploitent massivement la technologie, limitant le retour sur investissement de vos licences logicielles.",
    descriptionEn: "This indicator explores the technical depth of usage, particularly mastery of Prompt Engineering and query optimization to achieve expert results. It measures the ability to transform a simple conversation with AI into a true lever for software engineering or complex creation.",
    highScoreEn: "A high score places your teams at the peak of efficiency, capable of producing results impossible to achieve with basic usage.",
    lowScoreEn: "A low score indicates your employees massively underutilize the technology, limiting the return on investment of your software licenses."
  }
};

// Questions dans l'ordre exact du document Excel
export const QUESTIONS: Question[] = [
  // INDIVIDU - État d'esprit (1-5)
  { id: 1, itemMacro: 'INDIVIDU', thematic: "État d'esprit", text: "Je suis à l'aise avec l'idée d'intégrer l'IA dans mon métier", scores: { disagree: -7, somewhatDisagree: -3, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 2, itemMacro: 'INDIVIDU', thematic: "État d'esprit", text: "L'IA remet en cause la valeur de mon métier", scores: { disagree: 5, somewhatDisagree: 2, neutral: 0, somewhatAgree: -3, agree: -7 } },
  { id: 3, itemMacro: 'INDIVIDU', thematic: "État d'esprit", text: "L'IA représente une opportunité concrète pour améliorer ma performance", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 4, itemMacro: 'INDIVIDU', thematic: "État d'esprit", text: "L'évolution de l'IA m'inquiète", scores: { disagree: 5, somewhatDisagree: 2, neutral: 0, somewhatAgree: -2, agree: -5 } },
  { id: 5, itemMacro: 'INDIVIDU', thematic: "État d'esprit", text: "J'ai hâte de voir comment va évoluer mon métier augmenté par l'IA", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  
  // INDIVIDU - Attentes IA (6-10)
  { id: 6, itemMacro: 'INDIVIDU', thematic: "Attentes IA", text: "Je n'attends pas grand chose de l'IA dans mon métier", scores: { disagree: 5, somewhatDisagree: 2, neutral: 0, somewhatAgree: -3, agree: -7 } },
  { id: 7, itemMacro: 'INDIVIDU', thematic: "Attentes IA", text: "J'attends de l'IA un gain de temps / d'efficacité", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 8, itemMacro: 'INDIVIDU', thematic: "Attentes IA", text: "J'attends de l'IA une amélioration de mes performances commerciales", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 9, itemMacro: 'INDIVIDU', thematic: "Attentes IA", text: "J'attends de l'IA plus de confort dans mon quotidien", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 10, itemMacro: 'INDIVIDU', thematic: "Attentes IA", text: "J'attends l'IA sur les tâches à faible valeur ajoutée pour me concentrer sur ce qui a de la valeur", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  
  // ENTREPRISE - Mon entreprise et l'IA (11-16) - Scores réduits pour moyenne basse
  { id: 11, itemMacro: 'ENTREPRISE', thematic: "Mon entreprise et l'IA", text: "Mon entreprise encourage l'usage de l'IA", scores: { disagree: -7, somewhatDisagree: -4, neutral: -2, somewhatAgree: 0, agree: 2 } },
  { id: 12, itemMacro: 'ENTREPRISE', thematic: "Mon entreprise et l'IA", text: "Mon entreprise met à disposition les bons outils IA", scores: { disagree: -7, somewhatDisagree: -4, neutral: -2, somewhatAgree: 0, agree: 2 } },
  { id: 13, itemMacro: 'ENTREPRISE', thematic: "Mon entreprise et l'IA", text: "Le cadre d'usage IA est clair en interne", scores: { disagree: -7, somewhatDisagree: -4, neutral: -2, somewhatAgree: 0, agree: 2 } },
  { id: 14, itemMacro: 'ENTREPRISE', thematic: "Mon entreprise et l'IA", text: "L'entreprise avance vite sur ces sujets IA", scores: { disagree: -7, somewhatDisagree: -4, neutral: -2, somewhatAgree: 0, agree: 2 } },
  { id: 15, itemMacro: 'ENTREPRISE', thematic: "Mon entreprise et l'IA", text: "Je ressens un décalage entre le discours de l'entreprise sur l'IA et la réalité terrain", scores: { disagree: 2, somewhatDisagree: 0, neutral: -2, somewhatAgree: -4, agree: -7 } },
  { id: 16, itemMacro: 'ENTREPRISE', thematic: "Mon entreprise et l'IA", text: "L'accompagnement interne à l'IA est meilleur que celui dont j'entends parler ailleurs", scores: { disagree: -7, somewhatDisagree: -4, neutral: -2, somewhatAgree: 0, agree: 2 } },
  
  // ENTREPRISE - Formation interne (17-22) - Scores réduits pour moyenne basse
  { id: 17, itemMacro: 'ENTREPRISE', thematic: "Formation interne", text: "Je me sens suffisamment formé à l'IA", scores: { disagree: -7, somewhatDisagree: -4, neutral: -2, somewhatAgree: 0, agree: 2 } },
  { id: 18, itemMacro: 'ENTREPRISE', thematic: "Formation interne", text: "J'ai accès à des formations / ressources internes pour progresser sur l'IA", scores: { disagree: -7, somewhatDisagree: -4, neutral: -2, somewhatAgree: 0, agree: 2 } },
  { id: 19, itemMacro: 'ENTREPRISE', thematic: "Formation interne", text: "Les formations IA proposées sont adaptées à mon métier", scores: { disagree: -7, somewhatDisagree: -4, neutral: -2, somewhatAgree: 0, agree: 2 } },
  { id: 20, itemMacro: 'ENTREPRISE', thematic: "Formation interne", text: "J'ai reçu une formation IA orientée cas d'usage réels", scores: { disagree: -7, somewhatDisagree: -4, neutral: -2, somewhatAgree: 0, agree: 2 } },
  { id: 21, itemMacro: 'ENTREPRISE', thematic: "Formation interne", text: "Je sais appliquer concrètement ce que j'ai appris en formation IA", scores: { disagree: -7, somewhatDisagree: -4, neutral: -2, somewhatAgree: 0, agree: 2 } },
  { id: 22, itemMacro: 'ENTREPRISE', thematic: "Formation interne", text: "L'offre de formation IA interne est insuffisante par rapport aux enjeux", scores: { disagree: 2, somewhatDisagree: 0, neutral: -2, somewhatAgree: -4, agree: -7 } },
  
  // ENTREPRISE - Accompagnement (23-27)
  { id: 23, itemMacro: 'ENTREPRISE', thematic: "Accompagnement", text: "J'aimerais utiliser davantage l'IA mais je n'ai pas d'accompagnement dédié par mon management sur le sujet", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 24, itemMacro: 'ENTREPRISE', thematic: "Accompagnement", text: "Je manque de temps pour me former correctement à l'IA", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 25, itemMacro: 'ENTREPRISE', thematic: "Accompagnement", text: "Mon manager encourage les pratiques IA", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 26, itemMacro: 'ENTREPRISE', thematic: "Accompagnement", text: "Je me sens accompagné par mon manager dans mes usages IA", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 27, itemMacro: 'ENTREPRISE', thematic: "Accompagnement", text: "Mon manager est le plus avancé de l'équipe sur les sujets IA", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  
  // INDIVIDU - IA en Vente (28-33)
  { id: 28, itemMacro: 'INDIVIDU', thematic: "IA en Vente", text: "J'utilise l'IA pour préparer mes actions de prospection", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 29, itemMacro: 'INDIVIDU', thematic: "IA en Vente", text: "J'utilise l'IA pour mieux cibler ou qualifier mes prospects", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 30, itemMacro: 'INDIVIDU', thematic: "IA en Vente", text: "J'utilise l'IA pour préparer mes rendez-vous clients", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 31, itemMacro: 'INDIVIDU', thematic: "IA en Vente", text: "J'utilise l'IA comme coach pour optimiser mes chances de transformation", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 32, itemMacro: 'INDIVIDU', thematic: "IA en Vente", text: "J'utilise l'IA pour mes suivis et relances", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 33, itemMacro: 'INDIVIDU', thematic: "IA en Vente", text: "J'utilise l'IA comme assistant personnel", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  
  // INDIVIDU - Maîtrise IA (34-43)
  { id: 34, itemMacro: 'INDIVIDU', thematic: "Maîtrise IA", text: "Je me forme par moi même en permanence pour aller plus vite", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 35, itemMacro: 'INDIVIDU', thematic: "Maîtrise IA", text: "J'utilise une méthode de prompting éprouvée qui fonctionne bien", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 36, itemMacro: 'INDIVIDU', thematic: "Maîtrise IA", text: "J'utilise quotidiennement l'IA dans mon travail", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 37, itemMacro: 'INDIVIDU', thematic: "Maîtrise IA", text: "J'utilise plusieurs outils IA en fonction des tâches demandées", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 38, itemMacro: 'INDIVIDU', thematic: "Maîtrise IA", text: "J'ai un protocole clair pour vérifier les réponses IA avant de les utiliser en contexte professionnel", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 39, itemMacro: 'INDIVIDU', thematic: "Maîtrise IA", text: "Lorsque la réponse n'est pas satisfaisante, je sais itérer pour l'améliorer sans repartir de zéro", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 40, itemMacro: 'INDIVIDU', thematic: "Maîtrise IA", text: "Je sais sous-traiter des tâches complexes à l'IA pour mener un projet de bout en bout", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 41, itemMacro: 'INDIVIDU', thematic: "Maîtrise IA", text: "Je sais partir d'un document pour le traduire en un prompt réutilisable (reverse prompting)", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 42, itemMacro: 'INDIVIDU', thematic: "Maîtrise IA", text: "Je capitalise sur mes meilleurs prompts pour les réutiliser ou les partager", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 43, itemMacro: 'INDIVIDU', thematic: "Maîtrise IA", text: "Je sais identifier les situations où l'IA n'est pas adaptée ou nécessite une validation humaine forte", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  
  // INDIVIDU - Sécurité (44-49) - Scores réduits pour moyenne basse
  { id: 44, itemMacro: 'INDIVIDU', thematic: "Sécurité", text: "J'utilise parfois mon compte IA personnel pour des tâches liées à mon travail", scores: { disagree: 2, somewhatDisagree: 0, neutral: -2, somewhatAgree: -4, agree: -7 } },
  { id: 45, itemMacro: 'INDIVIDU', thematic: "Sécurité", text: "Il m'arrive d'utiliser des outils IA non validés par l'entreprise", scores: { disagree: 2, somewhatDisagree: 0, neutral: -2, somewhatAgree: -4, agree: -7 } },
  { id: 46, itemMacro: 'INDIVIDU', thematic: "Sécurité", text: "Je sais faire mon arbitrage quand il s'agit d'utiliser l'IA avec des données de l'entreprise", scores: { disagree: -7, somewhatDisagree: -4, neutral: -2, somewhatAgree: 0, agree: 2 } },
  { id: 47, itemMacro: 'INDIVIDU', thematic: "Sécurité", text: "Je suis contraint d'utiliser des outils externes car l'entreprise ne met pas à disposition d'alternatives adaptées", scores: { disagree: 2, somewhatDisagree: 0, neutral: -2, somewhatAgree: -4, agree: -7 } },
  { id: 48, itemMacro: 'INDIVIDU', thematic: "Sécurité", text: "Je privilégie parfois la rapidité plutôt que le cadre officiel", scores: { disagree: 2, somewhatDisagree: 0, neutral: -2, somewhatAgree: -4, agree: -7 } },
  { id: 49, itemMacro: 'INDIVIDU', thematic: "Sécurité", text: "Je ne sais pas toujours clairement ce qui est autorisé ou interdit en matière d'IA", scores: { disagree: 2, somewhatDisagree: 0, neutral: -2, somewhatAgree: -4, agree: -7 } },
  
  // INDIVIDU - Ambitions (50-54)
  { id: 50, itemMacro: 'INDIVIDU', thematic: "Ambitions", text: "J'ai envie d'aller plus loin sur les usages IA", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 51, itemMacro: 'INDIVIDU', thematic: "Ambitions", text: "J'aimerais tester des usages IA avancés", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 52, itemMacro: 'INDIVIDU', thematic: "Ambitions", text: "J'ai hâte de voir comment l'IA va faire évoluer mon poste", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 53, itemMacro: 'INDIVIDU', thematic: "Ambitions", text: "J'aimerais être un relais ou ambassadeur interne sur l'IA", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 54, itemMacro: 'INDIVIDU', thematic: "Ambitions", text: "Je me projette dans un métier augmenté par l'IA", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  
  // INDIVIDU - Usages avancés (55-58)
  { id: 55, itemMacro: 'INDIVIDU', thematic: "Usages avancés", text: "J'ai déjà configuré des assistants IA pour des tâches spécifiques", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 56, itemMacro: 'INDIVIDU', thematic: "Usages avancés", text: "J'ai programmé des assistants IA connectés à mes outils (Mail / CRM / autres)", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 57, itemMacro: 'INDIVIDU', thematic: "Usages avancés", text: "J'ai déjà créé des agents autonomes sur des outils comme Make ou N8N", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
  { id: 58, itemMacro: 'INDIVIDU', thematic: "Usages avancés", text: "J'ai automatisé une partie de mes tâches récurrentes", scores: { disagree: -5, somewhatDisagree: -2, neutral: 0, somewhatAgree: 2, agree: 5 } },
];

export interface Profile {
  id: string;
  name: string;
  emoji: string;
  minScore: number;
  maxScore: number;
  description: string;
  advice: string;
  tip: string;
  nextLevel: string;
  color: string;
}

// Profils basés sur les scores des thématiques INDIVIDU uniquement
// Score range: -220 à 220 points (selon le document)
export const PROFILES: Profile[] = [
  {
    id: "traditional",
    name: "Traditionnel",
    emoji: "🏛️",
    minScore: -220,
    maxScore: -121,
    description: "Vous privilégiez avant tout l'expertise humaine et les méthodes éprouvées. Votre score indique une certaine distance, voire une prudence légitime, vis-à-vis de l'intelligence artificielle. Vous attendez probablement de voir des preuves concrètes de fiabilité et de sécurité avant de modifier vos habitudes de travail. Pour vous, la technologie doit rester à sa place et ne pas dénaturer la qualité de votre métier.",
    advice: "Pour passer au profil Novice : L'idée n'est pas de tout changer, mais de trouver un premier point d'appui où l'IA peut vous soulager.",
    tip: "Astuce concrète : Ne demandez pas à l'IA de faire votre travail, demandez-lui simplement d'être votre assistant(e) pour des tâches sans valeur ajoutée : corriger les fautes d'un texte, reformuler un paragraphe trop long ou générer une liste d'idées pour un cadeau.",
    nextLevel: "Le cran au-dessus : Consultez la charte de sécurité de votre entreprise pour lever vos doutes sur la protection des données. Une fois rassuré sur le cadre, essayez un seul outil sur une tâche très simple et observez le résultat sans jugement de valeur immédiat.",
    color: "profile-traditional"
  },
  {
    id: "novice",
    name: "Novice",
    emoji: "🌱",
    minScore: -120,
    maxScore: -51,
    description: "Vous avez ouvert la porte de l'IA, vous en percevez le potentiel, mais vous restez pour l'instant sur le seuil. Vous utilisez probablement les outils de manière sporadique, un peu comme un moteur de recherche amélioré. Vos réponses montrent que vous n'êtes pas fermé au changement, mais que vous manquez de pratique ou de cas d'usage concrets qui s'appliquent directement à votre quotidien professionnel.",
    advice: "Pour passer au profil Curieux : Vous devez briser la barrière de l'intimidation technique.",
    tip: "Astuce concrète : Téléchargez l'application mobile de votre IA préférée (ChatGPT, Claude...) et utilisez la fonction vocale pour lui demander des conseils ou des idées pendant vos temps de trajet ou vos moments creux.",
    nextLevel: "Le cran au-dessus : Demandez à un collègue « Ambassadeur » de vous montrer un exemple concret de ce qu'il a réalisé avec l'IA cette semaine.",
    color: "profile-novice"
  },
  {
    id: "curious",
    name: "Curieux",
    emoji: "🧐",
    minScore: -50,
    maxScore: 50,
    description: "Vous êtes dans une phase de transition active. Vous avez compris que l'IA est un levier incontournable et vous avez commencé à intégrer certains outils dans votre routine. Votre score montre une réelle volonté de bien faire, même si vos réflexes ne sont pas encore totalement stabilisés. Vous oscillez entre des moments de grande efficacité et des phases où vous ne savez pas encore comment solliciter l'IA de manière optimale pour des tâches spécifiques.",
    advice: "Pour passer au profil Performeur : L'objectif est de transformer vos essais ponctuels en automatismes quotidiens.",
    tip: "Astuce concrète : Identifiez les 3 tâches les plus chronophages de votre semaine (rédaction de mails, résumés de réunions, recherche d'infos) et forcez-vous à utiliser l'IA systématiquement pour ces tâches pendant 21 jours.",
    nextLevel: "Le cran au-dessus : Travaillez votre structure de commande. Ne donnez plus d'instructions courtes : utilisez notre méthode Red-CAR. Donnez un Rôle, un Contexte, une Action et un Résultat attendu. Plus vous donnerez de matière, plus le résultat vous fera gagner du temps de retouche.",
    color: "profile-curious"
  },
  {
    id: "performer",
    name: "Performeur",
    emoji: "🧭",
    minScore: 51,
    maxScore: 139,
    description: "Super résultats, bravo ! Vous avez dépassé le stade de la simple curiosité pour devenir un utilisateur efficace et pragmatique. L'IA est devenue votre moteur de productivité quotidien : vous savez quand et comment solliciter l'outil pour gagner du temps, que ce soit pour la rédaction, l'analyse ou la gestion commerciale. Vous avez une bonne maîtrise du langage avec l'IA, même s'il vous reste quelques zones d'ombre sur les usages les plus complexes ou l'automatisation totale.",
    advice: "Pour passer au profil Ambassadeur : Il vous faut passer de l'usage individuel à l'influence collective et affiner votre expertise technique.",
    tip: "Astuce concrète : Sortez du simple « chat » et commencez à utiliser les « Custom Instructions » ou à créer vos propres GPTs personnalisés pour vos tâches répétitives.",
    nextLevel: "Le cran au-dessus : Intéressez-vous de plus près aux enjeux de sécurité et d'éthique pour devenir un garant de la pratique responsable dans votre équipe. Testez des méthodes de prompt engineering complexes comme le « Chain of Thought » (demander à l'IA de décomposer son raisonnement étape par étape).",
    color: "profile-performer"
  },
  {
    id: "ambassador",
    name: "Ambassadeur",
    emoji: "🌟",
    minScore: 140,
    maxScore: 220,
    description: "Bravo ! Vous êtes le moteur de la transformation au sein de votre organisation. Votre score démontre non seulement une maîtrise technique avancée, mais aussi une vision stratégique et éthique de l'IA. Vous ne vous contentez pas d'utiliser les outils, vous les intégrez dans des réflexions complexes et vous savez anticiper les évolutions du marché. Votre entourage professionnel vous perçoit déjà probablement comme la personne ressource pour ces sujets.",
    advice: "Pour rester au sommet : Votre prochain défi n'est plus technique, il est humain et structurel.",
    tip: "Astuce concrète : Commencez à documenter vos meilleurs « workflows » (chaînes de tâches) pour créer une bibliothèque de prompts partagée.",
    nextLevel: "Le cran au-dessus : Proposez à votre management d'animer des sessions de formation pour aider vos collaborateurs à comprendre les enjeux de l'IA, ou lancez un projet pilote d'automatisation poussée (via des agents spécialisés) sur un processus métier critique.",
    color: "profile-ambassador"
  }
];

// Calcule le score pour les profils (uniquement thématiques INDIVIDU spécifiées)
// En mode "generic", la thématique "IA en Vente" est exclue du calcul
export const calculateProfileScore = (
  responses: Record<number, number>,
  assessmentType: AssessmentType = 'sales'
): number => {
  let score = 0;

  QUESTIONS.forEach((question) => {
    // Uniquement les questions INDIVIDU des thématiques de profil
    if (question.itemMacro === 'INDIVIDU' && PROFILE_THEMATICS.includes(question.thematic as typeof PROFILE_THEMATICS[number])) {
      // En mode generic, on saute les questions des thématiques exclues
      if (!isThematicAllowed(question.thematic, assessmentType)) return;
      const response = responses[question.id];
      if (response !== undefined) {
        const scoreKeys = ['disagree', 'somewhatDisagree', 'neutral', 'somewhatAgree', 'agree'] as const;
        score += question.scores[scoreKeys[response]];
      }
    }
  });

  return score;
};

// Calcule le score max possible des thématiques de profil utilisées (selon le type)
const getProfileMaxScore = (assessmentType: AssessmentType): number => {
  let max = 0;
  QUESTIONS.forEach((q) => {
    if (q.itemMacro === 'INDIVIDU' && PROFILE_THEMATICS.includes(q.thematic as typeof PROFILE_THEMATICS[number])) {
      if (!isThematicAllowed(q.thematic, assessmentType)) return;
      max += Math.max(...Object.values(q.scores));
    }
  });
  return max;
};

// Référence : barème "sales" calculé sur 6 thématiques (max ≈ 220)
const SALES_PROFILE_MAX = 220;

// Calcule les scores par thématique (toutes les thématiques pour le dashboard)
export const calculateThematicScores = (responses: Record<number, number>): Record<string, { score: number; maxScore: number; normalizedScore: number }> => {
  const thematicScores: Record<string, { total: number; maxPositive: number; maxNegative: number }> = {};
  
  QUESTIONS.forEach((question) => {
    if (!thematicScores[question.thematic]) {
      thematicScores[question.thematic] = { total: 0, maxPositive: 0, maxNegative: 0 };
    }
    
    const response = responses[question.id];
    if (response !== undefined) {
      const scoreKeys = ['disagree', 'somewhatDisagree', 'neutral', 'somewhatAgree', 'agree'] as const;
      thematicScores[question.thematic].total += question.scores[scoreKeys[response]];
    }
    
    // Calcul du score max possible
    const maxPos = Math.max(...Object.values(question.scores));
    const maxNeg = Math.min(...Object.values(question.scores));
    thematicScores[question.thematic].maxPositive += maxPos;
    thematicScores[question.thematic].maxNegative += maxNeg;
  });
  
  // Normaliser chaque score sur une base 100
  const result: Record<string, { score: number; maxScore: number; normalizedScore: number }> = {};
  
  Object.entries(thematicScores).forEach(([thematic, data]) => {
    const range = data.maxPositive - data.maxNegative;
    const normalizedScore = Math.round(((data.total - data.maxNegative) / range) * 100);
    result[thematic] = {
      score: data.total,
      maxScore: data.maxPositive,
      normalizedScore: Math.max(0, Math.min(100, normalizedScore))
    };
  });
  
  return result;
};

export const getProfileByScore = (score: number, assessmentType: AssessmentType = 'sales'): Profile => {
  // Adapte les seuils au barème réel du type (le barème de référence est "sales")
  const max = getProfileMaxScore(assessmentType);
  const ratio = max > 0 ? max / SALES_PROFILE_MAX : 1;
  return PROFILES.find(p => score >= p.minScore * ratio && score <= p.maxScore * ratio) || PROFILES[0];
};

// Get profile by normalized score (0-100)
export const getProfileByNormalizedScore = (normalizedScore: number): Profile => {
  // Convert normalized score (0-100) to raw score range (-220 to 220)
  // 0 -> -220, 100 -> 220
  if (normalizedScore >= 82) return PROFILES.find(p => p.id === 'ambassador')!;
  if (normalizedScore >= 62) return PROFILES.find(p => p.id === 'performer')!;
  if (normalizedScore >= 38) return PROFILES.find(p => p.id === 'curious')!;
  if (normalizedScore >= 18) return PROFILES.find(p => p.id === 'novice')!;
  return PROFILES.find(p => p.id === 'traditional')!;
};

export const normalizeScore = (score: number, minScore: number = -220, maxScore: number = 220): number => {
  const range = maxScore - minScore;
  return Math.round(((score - minScore) / range) * 100);
};

// Mock data for demonstration
export interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  team: string;
  score: number;
  profile: Profile;
  thematicScores: Record<string, number>;
  completedAt: Date;
}

export const generateMockParticipants = (count: number = 196): Participant[] => {
  const firstNames = ["Charlotte", "Paul", "Maxime", "Anthony", "Sophie", "Lucas", "Emma", "Hugo", "Léa", "Thomas", "Julie", "Nicolas", "Marie", "Pierre", "Alice"];
  const lastNames = ["Meglinky", "Savary", "Perrein", "Perrin", "Martin", "Bernard", "Dubois", "Moreau", "Laurent", "Simon", "Michel", "Garcia", "David", "Bertrand", "Robert"];
  const teams = ["Équipe France", "Équipe Management", "Équipe Ventes", "Équipe Support"];
  
  return Array.from({ length: count }, (_, i) => {
    const score = Math.floor(Math.random() * 440) - 220; // -220 to 220
    const profile = getProfileByScore(score);
    const thematicScores: Record<string, number> = {};
    
    THEMATICS.forEach(thematic => {
      thematicScores[thematic] = Math.floor(Math.random() * 100);
    });
    
    return {
      id: `participant-${i + 1}`,
      firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
      lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
      email: `participant${i + 1}@company.com`,
      team: teams[Math.floor(Math.random() * teams.length)],
      score,
      profile,
      thematicScores,
      completedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    };
  });
};
