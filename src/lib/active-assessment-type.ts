// Runtime singleton holding the currently active assessment type.
// Set by the Dashboard (from selected campaign) or Assessment page (from validated campaign).
// Used by helper getters so views/exports can filter thematics & questions consistently
// without threading the type through every component prop.

import {
  THEMATICS,
  QUESTIONS,
  type Question,
  type AssessmentType,
  getThematicsForType,
  getQuestionsForType,
} from './assessment-data';
import { DIMENSION_IDS, V2_AS_LEGACY_QUESTIONS } from './assessment-v2';

const STORAGE_KEY = 'active_assessment_type';

let _current: AssessmentType =
  (typeof window !== 'undefined' &&
    (localStorage.getItem(STORAGE_KEY) as AssessmentType | null)) ||
  'sales'; // default fallback for legacy sessions

const listeners = new Set<(t: AssessmentType) => void>();

export const setActiveAssessmentType = (type: AssessmentType) => {
  _current = type;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, type);
  }
  listeners.forEach((l) => l(type));
};

export const getActiveAssessmentType = (): AssessmentType => _current;

// v2: every campaign now uses the Dust readiness questionnaire (9 dimensions, 35 statements),
// whatever its stored assessment_type. The legacy getters below are kept for old data only.
export const getActiveThematics = (): readonly string[] => DIMENSION_IDS;

export const getActiveQuestions = (): Question[] => V2_AS_LEGACY_QUESTIONS;

export const getLegacyThematics = (): readonly string[] => getThematicsForType(_current);
export const getLegacyQuestions = (): Question[] => getQuestionsForType(_current);

export const subscribeAssessmentType = (cb: (t: AssessmentType) => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

// Re-export base constants for components that explicitly need the full lists
export { THEMATICS, QUESTIONS };
