import { useEffect, useState } from 'react';
import {
  getActiveAssessmentType,
  getActiveThematics,
  subscribeAssessmentType,
} from '@/lib/active-assessment-type';
import type { AssessmentType } from '@/lib/assessment-data';

export const useAssessmentType = () => {
  const [type, setType] = useState<AssessmentType>(getActiveAssessmentType());

  useEffect(() => {
    const unsub = subscribeAssessmentType((t) => setType(t));
    return () => {
      unsub();
    };
  }, []);

  return {
    type,
    thematics: getActiveThematics(),
  };
};
