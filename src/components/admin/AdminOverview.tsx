import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, FolderKanban, CheckCircle2, TrendingUp, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Stats {
  totalCampaigns: number;
  totalParticipants: number;
  completedParticipants: number;
  totalTemplates: number;
  recentCampaigns: { id: string; code: string; company_name: string; created_at: string; creator_email: string }[];
}

export const AdminOverview = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [campaignsRes, participantsRes, completedRes, templatesRes, recentRes] = await Promise.all([
        supabase.from('campaigns').select('id', { count: 'exact', head: true }),
        supabase.from('participants').select('id', { count: 'exact', head: true }),
        supabase.from('participants').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('assessment_templates').select('id', { count: 'exact', head: true }),
        supabase.from('campaigns').select('id, code, company_name, created_at, creator_email').order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({
        totalCampaigns: campaignsRes.count || 0,
        totalParticipants: participantsRes.count || 0,
        completedParticipants: completedRes.count || 0,
        totalTemplates: templatesRes.count || 0,
        recentCampaigns: recentRes.data || [],
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!stats) return null;

  const completionRate = stats.totalParticipants > 0 ? Math.round((stats.completedParticipants / stats.totalParticipants) * 100) : 0;

  const cards = [
    { label: 'Campagnes', value: stats.totalCampaigns, icon: FolderKanban, color: 'text-primary' },
    { label: 'Participants', value: stats.totalParticipants, icon: Users, color: 'text-info' },
    { label: 'Tests terminés', value: stats.completedParticipants, icon: CheckCircle2, color: 'text-success' },
    { label: 'Taux complétion', value: `${completionRate}%`, icon: TrendingUp, color: 'text-warning' },
    { label: 'Templates', value: stats.totalTemplates, icon: FileText, color: 'text-secondary' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="page-title">Vue d'ensemble</h1>
        <p className="text-muted-foreground">Statistiques globales de la plateforme</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="card-elevated p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className={cn("w-5 h-5", card.color)} />
                </div>
              </div>
              <p className="text-[22px] font-semibold tabular-nums text-foreground">{card.value}</p>
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent campaigns */}
      <div className="card-elevated p-6">
        <h2 className="card-title mb-4">Campagnes récentes</h2>
        <div className="space-y-3">
          {stats.recentCampaigns.map((campaign) => (
            <div key={campaign.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono">{campaign.code}</Badge>
                <div>
                  <p className="font-medium text-foreground">{campaign.company_name}</p>
                  <p className="text-xs text-muted-foreground">{campaign.creator_email}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {new Date(campaign.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
