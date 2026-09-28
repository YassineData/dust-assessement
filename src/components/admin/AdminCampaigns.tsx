import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Users, Trash2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

interface Campaign {
  id: string;
  code: string;
  company_name: string;
  creator_email: string;
  creator_first_name: string;
  creator_last_name: string;
  created_at: string;
  template_id: string | null;
}

interface Template {
  id: string;
  name: string;
}

export const AdminCampaigns = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [campaignRes, templateRes] = await Promise.all([
      supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('assessment_templates').select('id, name'),
    ]);
    const campaignsData = campaignRes.data || [];
    setCampaigns(campaignsData);
    setTemplates(templateRes.data || []);

    // Fetch participant counts
    const counts: Record<string, number> = {};
    for (const c of campaignsData) {
      const { count } = await supabase.from('participants').select('id', { count: 'exact', head: true }).eq('campaign_id', c.id);
      counts[c.id] = count || 0;
    }
    setParticipantCounts(counts);
    setLoading(false);
  };

  const handleLinkTemplate = async (campaignId: string, templateId: string | null) => {
    await supabase.from('campaigns').update({ template_id: templateId }).eq('id', campaignId);
    setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, template_id: templateId } : c));
    toast({ title: 'Template lié avec succès' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette campagne et tous ses participants ?')) return;
    await supabase.from('participants').delete().eq('campaign_id', id);
    await supabase.from('campaigns').delete().eq('id', id);
    setCampaigns(prev => prev.filter(c => c.id !== id));
    toast({ title: 'Campagne supprimée' });
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Campagnes</h1>
        <p className="text-muted-foreground">Gérez les campagnes clients et liez-les à un template</p>
      </div>

      <div className="card-elevated overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Créateur</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((c) => (
              <TableRow key={c.id}>
                <TableCell><Badge variant="outline" className="font-mono">{c.code}</Badge></TableCell>
                <TableCell className="font-medium">{c.company_name}</TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm">{c.creator_first_name} {c.creator_last_name}</p>
                    <p className="text-xs text-muted-foreground">{c.creator_email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    {participantCounts[c.id] || 0}
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={c.template_id || 'none'}
                    onValueChange={(val) => handleLinkTemplate(c.id, val === 'none' ? null : val)}
                  >
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue placeholder="Aucun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
