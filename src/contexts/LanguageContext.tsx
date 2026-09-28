import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// v2: English became the default; older stored 'fr' preferences are ignored.
const LANGUAGE_KEY = 'preferred_language_v2';

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    return (stored as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
  };

  const t = (key: string): string => {
    const translations = language === 'fr' ? fr : en;
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation missing for key: ${key}`);
        return key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// French translations
const fr = {
  common: {
    loading: "Chargement...",
    download: "Télécharger",
    cancel: "Annuler",
    confirm: "Confirmer",
    save: "Enregistrer",
    back: "Retour",
    next: "Suivant",
    previous: "Précédent",
    close: "Fermer",
    copy: "Copier",
    copied: "Copié !",
    search: "Rechercher",
    filter: "Filtrer",
    reset: "Réinitialiser",
    participants: "participants",
    logout: "Déconnexion",
  },
  nav: {
    teamResults: "Résultats de l'équipe",
    dashboard: "Dashboard",
    createCampaign: "Créer une campagne",
  },
  landing: {
    badge: "Plateforme de diagnostic IA",
    heroTitle: "Évaluez la maturité IA",
    heroTitleHighlight: "de vos équipes",
    heroDescription: "Diagnostiquez le niveau d'adoption de l'IA dans votre entreprise, identifiez les profils clés et obtenez des recommandations personnalisées.",
    startQuiz: "Commencer le quiz",
    createAssessment: "Créer un assessment pour mon équipe",
    featuresTitle: "Une approche complète de l'évaluation",
    featuresDescription: "9 thématiques évaluées, 5 profils identifiés, des recommandations actionables.",
    feature1Title: "Dashboard interactif",
    feature1Desc: "Visualisez les résultats de vos équipes avec des graphiques clairs et des indicateurs pertinents.",
    feature2Title: "Analyse par équipe",
    feature2Desc: "Comparez les performances entre équipes et identifiez les points forts et axes d'amélioration.",
    feature3Title: "9 thématiques clés",
    feature3Desc: "État d'esprit, formation, sécurité, maîtrise IA, usages avancés... Une évaluation complète.",
    feature4Title: "5 profils identifiés",
    feature4Desc: "De Traditionnel à Ambassadeur, découvrez le niveau de maturité de chaque collaborateur.",
    feature5Title: "Recommandations",
    feature5Desc: "Recevez des conseils personnalisés pour accélérer l'adoption de l'IA dans votre organisation.",
    feature6Title: "Scoring intelligent",
    feature6Desc: "Pondération asymétrique des questions pour un diagnostic précis et nuancé.",
    profilesTitle: "Les 5 profils de maturité IA",
    profilesDescription: "Chaque collaborateur est positionné sur l'un des 5 profils, reflétant son niveau d'adoption de l'IA.",
    ctaTitle: "Prêt à évaluer votre maturité IA ?",
    ctaDescription: "Lancez une campagne d'évaluation et obtenez une vision claire du niveau de vos équipes en quelques minutes.",
    footerCopyright: "© 2026 Dust. Évaluation de la maturité IA de vos équipes.",
  },
  thematics: {
    "État d'esprit": "État d'esprit",
    "Attentes IA": "Attentes IA",
    "Mon entreprise et l'IA": "Mon entreprise et l'IA",
    "Formation interne": "Formation interne",
    "Accompagnement": "Accompagnement",
    "IA en Vente": "IA en Vente",
    "Maîtrise IA": "Maîtrise IA",
    "Sécurité": "Sécurité",
    "Ambitions": "Ambitions",
    "Usages avancés": "Usages avancés",
  },
  profiles: {
    traditional: "Traditionnel",
    novice: "Novice",
    curious: "Curieux",
    performer: "Explorateur",
    ambassador: "Ambassadeur",
  },
  dashboard: {
    campaignTitle: "Campagne d'évaluation",
    launchedOn: "Lancée le",
    assessmentType: "Assessment IA - Maturité Complète",
    tabs: {
      overview: "Vue d'ensemble",
      compare: "Comparer",
      participants: "Participants",
      itemScores: "Résultats détaillés",
      detailed: "Questions détaillées",
      actions: "Actions",
      settings: "Paramètres",
    },
    scoreMessages: {
      excellent: {
        title: "Excellents résultats !",
        description: "Votre équipe démontre une maturité IA remarquable. Les bases sont solides et les pratiques bien ancrées.",
      },
      good: {
        title: "De bons fondamentaux",
        description: "Votre équipe a de bonnes bases. Quelques axes d'amélioration permettraient d'atteindre un niveau optimal.",
      },
      average: {
        title: "Des bases à consolider...",
        description: "Votre score reflète une performance intermédiaire. Les bases sont présentes, mais des axes d'amélioration restent nécessaires.",
      },
      low: {
        title: "Un potentiel à développer",
        description: "Votre équipe a un fort potentiel de progression. Un accompagnement ciblé permettrait une montée en compétence rapide.",
      },
    },
    thematicPerformance: "Performance par thématique",
    nationalComparison: "Comparatif avec la moyenne globale",
    teamVsAverage: "Résultats de votre équipe vs moyenne",
    impactTitle: "Impact de ces résultats sur votre croissance",
    impactDescription: "Voici une estimation de votre potentiel d'amélioration, calculée sur la base des 100 dernières entreprises accompagnées.",
    understandResults: "Comprendre mes résultats",
    productivity: "Productivité",
    aiAdoption: "Adoption IA",
    trainingROI: "ROI Formation",
    resultsDistribution: "Répartition des résultats du test",
    topPerformers: "Top 3",
    chartResults: "Graphique des résultats",
    chartBasedOn: "Résultats basés sur les 1000 derniers tests",
    campaignAverage: "Moyenne de la campagne",
    emptyState: {
      noData: "Aucune donnée disponible",
      waitingParticipants: "En attente de participants",
      noParticipantsYet: "Aucun participant n'a encore complété l'assessment.",
    },
    loadingResults: "Chargement des résultats...",
  },
  charts: {
    team: "Équipe",
    nationalAverage: "Moyenne globale",
    score: "Score",
    position: "Position",
    participants: "participants",
    performances: "Performances",
  },
  compare: {
    compareResults: "Comparer les résultats",
    campaignAverage: "Moyenne de la campagne",
    participants: "Participants",
    sectors: "Secteurs",
    campaigns: "Campagnes",
    search: "Rechercher...",
    noResults: "Aucun résultat trouvé",
    remove: "Supprimer",
    reset: "Tout réinitialiser",
    noCampaigns: "Aucune autre campagne pour ce client",
  },
  detailedScores: {
    noParticipants: "Aucun participant n'a encore complété le test.",
    participantsCompleted: "participant(s) ayant complété le test",
    responses: {
      stronglyDisagree: "Pas du tout d'accord",
      disagree: "Plutôt pas d'accord",
      neutral: "Neutre",
      agree: "Plutôt d'accord",
      stronglyAgree: "Tout à fait d'accord",
    },
  },
  downloadModal: {
    title: "Télécharger",
    description: "Sélectionner le document que vous souhaitez télécharger au format PDF.",
    reportLabel: "Rapport",
    campaignSummary: "Bilan de la campagne",
    campaignSummaryDesc: "Obtenez un aperçu global des performances de votre équipe.",
  },
  accessModal: {
    title: "Accès au dashboard",
    codeLabel: "Nom de l'entreprise",
    codePlaceholder: "Ex : Acme",
    emailLabel: "Votre email",
    emailPlaceholder: "votre@email.com",
    accessButton: "Accéder au dashboard",
    invalidCredentials: "Entreprise ou email incorrect",
  },
  assessment: {
    registerTitle: "Commencer l'évaluation",
    firstName: "Prénom",
    lastName: "Nom",
    email: "Email professionnel",
    campaignCode: "Code campagne",
    noCampaignCode: "Pas de code campagne ?",
    createCampaign: "Créer une campagne",
    start: "Commencer",
    progress: "Progression",
    previousThematic: "Thématique précédente",
    resetThematic: "Réinitialiser cette thématique",
    nextThematic: "Thématique suivante",
    completeAssessment: "Terminer l'évaluation",
    saving: "Enregistrement en cours...",
    resultTitle: "Évaluation terminée !",
    yourProfile: "Votre profil",
    yourScore: "Votre score",
    advice: "Conseils",
    backToHome: "Retour à l'accueil",
    viewDashboard: "Voir le dashboard",
    likert: {
      disagree: "Pas d'accord",
      somewhatDisagree: "Plutôt pas d'accord",
      neutral: "Neutre",
      somewhatAgree: "Plutôt d'accord",
      agree: "D'accord",
    },
  },
  createCampaign: {
    title: "Créer une campagne",
    subtitle: "Lancez une évaluation pour votre équipe",
    firstName: "Prénom",
    lastName: "Nom",
    email: "Email professionnel",
    companyName: "Nom de l'entreprise",
    createButton: "Créer la campagne",
    successTitle: "Campagne créée !",
    yourCode: "Votre code campagne",
    shareMessage: "Message à partager",
    copyMessage: "Copier le message",
    copyCode: "Copier le code",
    backToHome: "Retour à l'accueil",
    viewDashboard: "Voir le dashboard",
  },
  pdf: {
    title: "Campaign Summary",
    company: "Company",
    date: "Date",
    participants: "Participants",
    averageScore: "Average Score",
    profileDistribution: "Profile Distribution",
    generatedBy: "Generated by Dust",
  },
};

// English translations
const en = {
  common: {
    loading: "Loading...",
    download: "Download",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    back: "Back",
    next: "Next",
    previous: "Previous",
    close: "Close",
    copy: "Copy",
    copied: "Copied!",
    search: "Search",
    filter: "Filter",
    reset: "Reset",
    participants: "participants",
    logout: "Logout",
  },
  nav: {
    teamResults: "Team Results",
    dashboard: "Dashboard",
    createCampaign: "Create Campaign",
  },
  landing: {
    badge: "AI Diagnostic Platform",
    heroTitle: "Assess the AI maturity",
    heroTitleHighlight: "of your teams",
    heroDescription: "Diagnose the level of AI adoption in your company, identify key profiles and get personalized recommendations.",
    startQuiz: "Start the quiz",
    createAssessment: "Create an assessment for my team",
    featuresTitle: "A complete evaluation approach",
    featuresDescription: "9 themes evaluated, 5 profiles identified, actionable recommendations.",
    feature1Title: "Interactive dashboard",
    feature1Desc: "Visualize your team results with clear charts and relevant indicators.",
    feature2Title: "Team analysis",
    feature2Desc: "Compare performance between teams and identify strengths and areas for improvement.",
    feature3Title: "9 key themes",
    feature3Desc: "Mindset, training, security, AI mastery, advanced uses... A complete evaluation.",
    feature4Title: "5 identified profiles",
    feature4Desc: "From Traditional to Ambassador, discover each team member's maturity level.",
    feature5Title: "Recommendations",
    feature5Desc: "Receive personalized advice to accelerate AI adoption in your organization.",
    feature6Title: "Smart scoring",
    feature6Desc: "Asymmetric question weighting for a precise and nuanced diagnosis.",
    profilesTitle: "The 5 AI maturity profiles",
    profilesDescription: "Each team member is positioned on one of 5 profiles, reflecting their AI adoption level.",
    ctaTitle: "Ready to assess your AI maturity?",
    ctaDescription: "Launch an evaluation campaign and get a clear view of your teams' level in minutes.",
    footerCopyright: "© 2026 Dust. AI readiness assessment for your teams.",
  },
  profiles: {
    traditional: "Traditional",
    novice: "Novice",
    curious: "Curious",
    performer: "Explorer",
    ambassador: "Ambassador",
  },
  dashboard: {
    campaignTitle: "Assessment Campaign",
    launchedOn: "Launched on",
    assessmentType: "AI Assessment - Full Maturity",
    tabs: {
      overview: "Overview",
      compare: "Compare",
      participants: "Participants",
      itemScores: "Detailed Results",
      detailed: "Detailed Questions",
      actions: "Actions",
      settings: "Settings",
    },
    scoreMessages: {
      excellent: {
        title: "Excellent results!",
        description: "Your team demonstrates remarkable AI maturity. The foundations are solid and practices are well established.",
      },
      good: {
        title: "Good foundations",
        description: "Your team has good foundations. A few areas for improvement would help reach an optimal level.",
      },
      average: {
        title: "Foundations to consolidate...",
        description: "Your score reflects intermediate performance. The foundations are present, but areas for improvement remain necessary.",
      },
      low: {
        title: "Potential to develop",
        description: "Your team has strong growth potential. Targeted support would enable rapid skill development.",
      },
    },
    thematicPerformance: "Performance by theme",
    nationalComparison: "Comparison with overall average",
    teamVsAverage: "Your team results vs average",
    impactTitle: "Impact of these results on your growth",
    impactDescription: "Here is an estimate of your improvement potential, calculated based on the last 100 companies supported.",
    understandResults: "Understand my results",
    productivity: "Productivity",
    aiAdoption: "AI Adoption",
    trainingROI: "Training ROI",
    resultsDistribution: "Test results distribution",
    topPerformers: "Top 3",
    chartResults: "Results chart",
    chartBasedOn: "Results based on the last 1000 tests",
    campaignAverage: "Campaign average",
    emptyState: {
      noData: "No data available",
      waitingParticipants: "Waiting for participants",
      noParticipantsYet: "No participant has completed the assessment yet.",
    },
    loadingResults: "Loading results...",
  },
  charts: {
    team: "Team",
    nationalAverage: "Overall average",
    score: "Score",
    position: "Position",
    participants: "participants",
    performances: "Performances",
  },
  compare: {
    compareResults: "Compare results",
    campaignAverage: "Campaign average",
    participants: "Participants",
    sectors: "Sectors",
    campaigns: "Campaigns",
    search: "Search...",
    noResults: "No results found",
    remove: "Remove",
    reset: "Reset all",
    noCampaigns: "No other campaign for this client",
  },
  detailedScores: {
    noParticipants: "No participant has completed the test yet.",
    participantsCompleted: "participant(s) who completed the test",
    responses: {
      stronglyDisagree: "Strongly disagree",
      disagree: "Disagree",
      neutral: "Neutral",
      agree: "Agree",
      stronglyAgree: "Strongly agree",
    },
  },
  downloadModal: {
    title: "Download",
    description: "Select the document you want to download in PDF format.",
    reportLabel: "Report",
    campaignSummary: "Campaign Summary",
    campaignSummaryDesc: "Get a global overview of your team's performance.",
  },
  accessModal: {
    title: "Dashboard Access",
    codeLabel: "Company name",
    codePlaceholder: "E.g. Acme",
    emailLabel: "Your email",
    emailPlaceholder: "your@email.com",
    accessButton: "Access dashboard",
    invalidCredentials: "Incorrect company or email",
  },
  assessment: {
    registerTitle: "Start the evaluation",
    firstName: "First name",
    lastName: "Last name",
    email: "Professional email",
    campaignCode: "Campaign code",
    noCampaignCode: "No campaign code?",
    createCampaign: "Create a campaign",
    start: "Start",
    progress: "Progress",
    previousThematic: "Previous theme",
    resetThematic: "Reset this theme",
    nextThematic: "Next theme",
    completeAssessment: "Complete assessment",
    saving: "Saving...",
    resultTitle: "Assessment completed!",
    yourProfile: "Your profile",
    yourScore: "Your score",
    advice: "Advice",
    backToHome: "Back to home",
    viewDashboard: "View dashboard",
    likert: {
      disagree: "Disagree",
      somewhatDisagree: "Somewhat disagree",
      neutral: "Neutral",
      somewhatAgree: "Somewhat agree",
      agree: "Agree",
    },
  },
  createCampaign: {
    title: "Create a campaign",
    subtitle: "Launch an evaluation for your team",
    firstName: "First name",
    lastName: "Last name",
    email: "Professional email",
    companyName: "Company name",
    createButton: "Create campaign",
    successTitle: "Campaign created!",
    yourCode: "Your campaign code",
    shareMessage: "Message to share",
    copyMessage: "Copy message",
    copyCode: "Copy code",
    backToHome: "Back to home",
    viewDashboard: "View dashboard",
  },
  thematics: {
    "État d'esprit": "Mindset",
    "Attentes IA": "AI Expectations",
    "Mon entreprise et l'IA": "My Company & AI",
    "Formation interne": "Internal Training",
    "Accompagnement": "Support",
    "IA en Vente": "AI in Sales",
    "Maîtrise IA": "AI Mastery",
    "Sécurité": "Security",
    "Ambitions": "Ambitions",
    "Usages avancés": "Advanced Uses",
  },
  pdf: {
    title: "Campaign Summary",
    company: "Company",
    date: "Date",
    participants: "Participants",
    averageScore: "Average Score",
    profileDistribution: "Profile Distribution",
    generatedBy: "Generated by Dust",
  },
};

export { fr, en };
