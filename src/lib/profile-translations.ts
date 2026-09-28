// English translations for participant-facing profile content.
// Used by the final assessment results screen and the dashboard legend
// so that EN campaigns display fully in English.

export interface ProfileTranslation {
  name: string;
  description: string;
  advice: string;
  tip: string;
  nextLevel: string;
}

export const PROFILE_TRANSLATIONS_EN: Record<string, ProfileTranslation> = {
  traditional: {
    name: "Traditional",
    description:
      "You prioritize human expertise and proven methods above all. Your score indicates a certain distance, even legitimate caution, towards artificial intelligence. You probably expect to see concrete proof of reliability and safety before changing your work habits. For you, technology should stay in its place and not distort the quality of your craft.",
    advice:
      "To move up to the Novice profile: the idea is not to change everything, but to find a first foothold where AI can take some load off you.",
    tip:
      "Concrete tip: Don't ask AI to do your job — simply ask it to be your assistant for low-value tasks: fixing typos in a text, rephrasing a paragraph that's too long, or generating a list of gift ideas.",
    nextLevel:
      "Going further: Read your company's security policy to clear up doubts about data protection. Once reassured about the framework, try a single tool on a very simple task and observe the result without any immediate value judgment.",
  },
  novice: {
    name: "Novice",
    description:
      "You have opened the door to AI, you see its potential, but for now you remain on the threshold. You probably use tools sporadically, a bit like an enhanced search engine. Your answers show you're not closed to change, but you lack practice or concrete use cases that apply directly to your professional daily life.",
    advice:
      "To move up to the Curious profile: you need to break the technical intimidation barrier.",
    tip:
      "Concrete tip: Download the mobile app of your preferred AI (ChatGPT, Claude...) and use the voice function to ask for advice or ideas during your commute or idle moments.",
    nextLevel:
      "Going further: Ask an 'Ambassador' colleague to show you a concrete example of what they achieved with AI this week.",
  },
  curious: {
    name: "Curious",
    description:
      "You are in an active transition phase. You've understood that AI is an essential lever and you've started integrating some tools into your routine. Your score shows a real willingness to do well, even if your reflexes aren't yet fully stabilized. You oscillate between moments of great efficiency and phases where you don't yet know how to optimally use AI for specific tasks.",
    advice:
      "To move up to the Explorer profile: the goal is to turn your occasional attempts into daily habits.",
    tip:
      "Concrete tip: Identify the 3 most time-consuming tasks of your week (writing emails, summarizing meetings, looking up info) and force yourself to use AI systematically for these tasks for 21 days.",
    nextLevel:
      "Going further: Work on your prompt structure. Stop giving short instructions: use our Red-CAR method. Provide a Role, a Context, an Action and an expected Result. The more material you give, the more time you'll save on rework.",
  },
  performer: {
    name: "Explorer",
    description:
      "Great results, well done! You have moved past simple curiosity to become an efficient and pragmatic user. AI has become your daily productivity engine: you know when and how to call on the tool to save time, whether for writing, analysis or sales management. You have a good command of conversing with AI, even if some grey areas remain on the most complex use cases or full automation.",
    advice:
      "To move up to the Ambassador profile: you need to shift from individual use to collective influence and sharpen your technical expertise.",
    tip:
      "Concrete tip: Move beyond simple 'chat' and start using 'Custom Instructions' or create your own personalized GPTs for your repetitive tasks.",
    nextLevel:
      "Going further: Take a closer look at security and ethics issues to become a guarantor of responsible practice in your team. Test complex prompt engineering methods such as 'Chain of Thought' (asking the AI to break down its reasoning step by step).",
  },
  ambassador: {
    name: "Ambassador",
    description:
      "Congratulations! You are the engine of transformation within your organization. Your score demonstrates not only advanced technical mastery, but also a strategic and ethical vision of AI. You don't just use the tools — you integrate them into complex thinking and you can anticipate market evolutions. Your colleagues probably already see you as the go-to person on these topics.",
    advice:
      "To stay at the top: your next challenge is no longer technical, it is human and structural.",
    tip:
      "Concrete tip: Start documenting your best 'workflows' (chains of tasks) to build a shared prompt library.",
    nextLevel:
      "Going further: Suggest to your management to run training sessions to help your colleagues understand AI stakes, or launch a deep-automation pilot project (using specialized agents) on a critical business process.",
  },
};

import type { Profile } from '@/lib/assessment-data';
import { CLASS_PROFILE_EN } from '@/lib/assessment-v2';

export const getLocalizedProfile = (
  profile: Profile,
  language: 'fr' | 'en',
): { name: string; description: string; advice: string; tip: string; nextLevel: string; emoji: string } => {
  if (language === 'en') {
    const tr = PROFILE_TRANSLATIONS_EN[profile.id] ?? CLASS_PROFILE_EN[profile.id];
    if (tr) {
      return { ...tr, emoji: profile.emoji };
    }
  }
  return {
    name: profile.name,
    description: profile.description,
    advice: profile.advice,
    tip: profile.tip,
    nextLevel: profile.nextLevel,
    emoji: profile.emoji,
  };
};
