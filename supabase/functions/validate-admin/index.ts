import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Email and code are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if the user is a super admin from the table
    const { data: admin, error } = await supabase
      .from('super_admins')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .eq('access_code', code.trim())
      .maybeSingle();

    if (error) {
      console.error('Error checking admin:', error);
      return new Response(
        JSON.stringify({ valid: false, error: 'Database error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Also allow any @dust.tt email with the team password (DUST_ADMIN_PASSWORD secret; disabled when unset)
    const teamPassword = Deno.env.get('DUST_ADMIN_PASSWORD') ?? '';
    const isDustTeam = !!teamPassword && email.toLowerCase().trim().endsWith('@dust.tt') && code.trim() === teamPassword;

    if (!admin && !isDustTeam) {
      return new Response(
        JSON.stringify({ valid: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all campaigns for super admin
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, code, company_name, creator_email, created_at')
      .order('created_at', { ascending: false });

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      return new Response(
        JSON.stringify({ valid: true, campaigns: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ valid: true, campaigns: campaigns || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'Server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
