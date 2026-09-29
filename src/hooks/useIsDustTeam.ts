import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAdminKey, isDustEmail } from '@/lib/access';
import { isDemoMode } from '@/demo/demo-data';

/** True for the Dust team: signed in with an @dust.tt email, or holding the admin key (or in demo mode). */
export const useIsDustTeam = () => {
  const [isDust, setIsDust] = useState(() => !!getAdminKey() || isDemoMode());
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && isDustEmail(data.session?.user?.email)) setIsDust(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsDust(!!getAdminKey() || isDemoMode() || isDustEmail(session?.user?.email));
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return isDust;
};
