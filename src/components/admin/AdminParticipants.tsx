import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload, Trash2, Search, Download, Mail, Shield, Users, Info, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface Participant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
  status: string;
  global_score: number | null;
  profile: string | null;
  campaign_id: string | null;
  created_at: string;
}

interface Campaign {
  id: string;
  code: string;
  company_name: string;
}

interface Member {
  id: string;
  campaign_id: string;
  email: string;
  role: 'participant' | 'manager' | 'consultant' | 'admin';
  created_at: string;
}

const CSV_TEMPLATE = `First Name,Last Name,Email,StatusRole
Jean,Dupont,jean.dupont@entreprise.com,participant
Marie,Martin,marie.martin@entreprise.com,manager
Paul,Durand,paul.durand@entreprise.com,admin`;

export const AdminParticipants = () => {
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCampaign, setFilterCampaign] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [importCampaign, setImportCampaign] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const targetedFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [pRes, cRes, mRes] = await Promise.all([
      supabase.from('participants').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('campaigns').select('id, code, company_name'),
      supabase.from('campaign_members').select('*').order('created_at', { ascending: false }).limit(1000),
    ]);
    setParticipants(pRes.data || []);
    setCampaigns(cRes.data || []);
    setMembers((mRes.data || []) as Member[]);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce participant ?')) return;
    await supabase.from('participants').delete().eq('id', id);
    setParticipants(prev => prev.filter(p => p.id !== id));
    toast({ title: 'Participant supprimé' });
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Retirer cette invitation ?')) return;
    await supabase.from('campaign_members').delete().eq('id', id);
    setMembers(prev => prev.filter(m => m.id !== id));
    toast({ title: 'Invitation retirée' });
  };

  const handleUpdateRole = async (id: string, role: 'participant' | 'manager' | 'consultant' | 'admin') => {
    const { error } = await supabase.from('campaign_members').update({ role }).eq('id', id);
    if (error) {
      toast({ title: 'Erreur lors de la mise à jour', variant: 'destructive' });
      return;
    }
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role } : m));
    toast({ title: 'Rôle mis à jour' });
  };

  const copyTemplate = () => {
    navigator.clipboard.writeText(CSV_TEMPLATE);
    toast({ title: 'Modèle CSV copié' });
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele-participants.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTargetedCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!importCampaign) {
      toast({ title: 'Sélectionnez une campagne cible', variant: 'destructive' });
      e.target.value = '';
      return;
    }
    const campaign = campaigns.find(c => c.id === importCampaign);
    if (!campaign) { e.target.value = ''; return; }

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        toast({ title: 'Fichier CSV invalide', variant: 'destructive' });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
      const firstNameIdx = headers.findIndex(h => ['first name', 'first_name', 'firstname', 'prénom', 'prenom'].includes(h));
      const lastNameIdx = headers.findIndex(h => ['last name', 'last_name', 'lastname', 'nom'].includes(h));
      const emailIdx = headers.findIndex(h => ['email', 'e-mail', 'mail'].includes(h));
      const roleIdx = headers.findIndex(h => ['statusrole', 'status role', 'status_role', 'role', 'rôle'].includes(h));

      if (firstNameIdx === -1 || lastNameIdx === -1 || emailIdx === -1) {
        toast({ title: 'Colonnes requises : First Name, Last Name, Email', variant: 'destructive' });
        return;
      }

      const parseRole = (raw: string): 'participant' | 'manager' | 'consultant' | 'admin' => {
        const v = (raw || '').trim().toLowerCase();
        if (['admin', 'administrateur'].includes(v)) return 'admin';
        if (['manager', 'lead', 'responsable'].includes(v)) return 'manager';
        if (['consultant', 'consulting'].includes(v)) return 'consultant';
        return 'participant';
      };

      let imported = 0;
      let skipped = 0;
      const memberRows: { campaign_id: string; email: string; role: 'participant' | 'manager' | 'consultant' | 'admin' }[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const firstName = cols[firstNameIdx];
        const lastName = cols[lastNameIdx];
        const email = cols[emailIdx]?.toLowerCase();
        if (!firstName || !lastName || !email) continue;
        const role = roleIdx !== -1 ? parseRole(cols[roleIdx]) : 'participant';

        const { data: existing } = await supabase
          .from('participants')
          .select('id')
          .eq('campaign_id', campaign.id)
          .eq('email', email)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase.from('participants').insert({
            first_name: firstName,
            last_name: lastName,
            email,
            campaign_id: campaign.id,
            company_name: campaign.company_name,
            status: 'not_started' as any,
          });
          if (!error) imported++;
        } else {
          skipped++;
        }

        memberRows.push({ campaign_id: campaign.id, email, role });
      }

      if (memberRows.length > 0) {
        const { data: existingMembers } = await supabase
          .from('campaign_members')
          .select('email')
          .eq('campaign_id', campaign.id);
        const existingEmails = new Set((existingMembers || []).map(m => m.email.toLowerCase()));
        const toInsert = memberRows.filter(m => !existingEmails.has(m.email));
        if (toInsert.length > 0) {
          await supabase.from('campaign_members').insert(toInsert);
        }
      }

      toast({
        title: `Import terminé`,
        description: `${imported} ajouté(s), ${skipped} déjà présent(s) conservé(s) dans ${campaign.company_name}`,
      });
      fetchAll();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur lors de l\'import', variant: 'destructive' });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const filtered = participants.filter(p => {
    const matchSearch = search === '' ||
      `${p.first_name} ${p.last_name} ${p.email}`.toLowerCase().includes(search.toLowerCase());
    const matchCampaign = filterCampaign === 'all' || p.campaign_id === filterCampaign;
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchCampaign && matchStatus;
  });

  const filteredMembers = members.filter(m => {
    const matchSearch = search === '' || m.email.toLowerCase().includes(search.toLowerCase());
    const matchCampaign = filterCampaign === 'all' || m.campaign_id === filterCampaign;
    return matchSearch && matchCampaign;
  });

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Participants</h1>
        <p className="text-muted-foreground">{participants.length} participants · {members.length} invitations</p>
      </div>

      <Tabs defaultValue="tracking" className="space-y-6">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="invitations" className="gap-2"><Mail className="w-4 h-4" /> Invitations</TabsTrigger>
          <TabsTrigger value="roles" className="gap-2"><Shield className="w-4 h-4" /> Rôles</TabsTrigger>
          <TabsTrigger value="tracking" className="gap-2"><Users className="w-4 h-4" /> Suivi participants</TabsTrigger>
        </TabsList>

        {/* === SUIVI PARTICIPANTS === */}
        <TabsContent value="tracking" className="space-y-6">
          {/* Global stats */}
          {(() => {
            const total = participants.length;
            const completed = participants.filter(p => p.status === 'completed').length;
            const inProgress = participants.filter(p => p.status === 'in_progress').length;
            const notStarted = participants.filter(p => p.status === 'not_started').length;
            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="card-elevated p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Inscrits</p>
                  <p className="text-[22px] font-semibold tabular-nums text-foreground mt-1">{total}</p>
                </div>
                <div className="card-elevated p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Terminés</p>
                  <p className="text-[22px] font-semibold tabular-nums text-success mt-1">{completed} <span className="text-sm font-normal text-muted-foreground">({completionRate}%)</span></p>
                </div>
                <div className="card-elevated p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">En cours</p>
                  <p className="text-[22px] font-semibold tabular-nums text-warning mt-1">{inProgress}</p>
                </div>
                <div className="card-elevated p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Pas commencés</p>
                  <p className="text-[22px] font-semibold tabular-nums text-muted-foreground mt-1">{notStarted}</p>
                </div>
              </div>
            );
          })()}

          {/* Per-campaign breakdown */}
          <div className="card-elevated overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Suivi par campagne</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campagne</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Inscrits</TableHead>
                  <TableHead className="text-right">En cours</TableHead>
                  <TableHead className="text-right">Terminés</TableHead>
                  <TableHead className="text-right">Taux</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns
                  .map(c => {
                    const ps = participants.filter(p => p.campaign_id === c.id);
                    const completed = ps.filter(p => p.status === 'completed').length;
                    const inProgress = ps.filter(p => p.status === 'in_progress').length;
                    const total = ps.length;
                    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
                    return { c, total, completed, inProgress, rate };
                  })
                  .sort((a, b) => b.total - a.total)
                  .map(({ c, total, completed, inProgress, rate }) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.company_name}</TableCell>
                      <TableCell><Badge variant="outline" className="font-mono">{c.code}</Badge></TableCell>
                      <TableCell className="text-right">{total}</TableCell>
                      <TableCell className="text-right text-warning">{inProgress}</TableCell>
                      <TableCell className="text-right text-success font-medium">{completed}</TableCell>
                      <TableCell className="text-right">{rate}%</TableCell>
                    </TableRow>
                  ))}
                {campaigns.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Aucune campagne.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* CSV format helper */}
          <div className="card-elevated p-5 space-y-4 border-l-4 border-l-primary">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold text-foreground">Format CSV attendu</p>
                <p className="text-xs text-muted-foreground">
                  4 colonnes obligatoires, dans cet ordre. Les doublons (même email + campagne) sont automatiquement ignorés pour préserver les tests existants.
                </p>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="bg-muted px-3 py-2 rounded">
                    <p className="font-mono font-semibold">First Name</p>
                    <p className="text-muted-foreground">Prénom</p>
                  </div>
                  <div className="bg-muted px-3 py-2 rounded">
                    <p className="font-mono font-semibold">Last Name</p>
                    <p className="text-muted-foreground">Nom</p>
                  </div>
                  <div className="bg-muted px-3 py-2 rounded">
                    <p className="font-mono font-semibold">Email</p>
                    <p className="text-muted-foreground">Email pro</p>
                  </div>
                  <div className="bg-muted px-3 py-2 rounded">
                    <p className="font-mono font-semibold">StatusRole</p>
                    <p className="text-muted-foreground">participant / manager / admin</p>
                  </div>
                </div>
                <pre className="bg-foreground/5 border border-border rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre">{CSV_TEMPLATE}</pre>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={copyTemplate} className="gap-2">
                    <Copy className="w-3.5 h-3.5" /> Copier le modèle
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadTemplate} className="gap-2">
                    <Download className="w-3.5 h-3.5" /> Télécharger .csv
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Import block */}
          <div className="card-elevated p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Importer un CSV dans une campagne</p>
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={importCampaign} onValueChange={setImportCampaign}>
                <SelectTrigger className="w-[280px]"><SelectValue placeholder="Choisir une campagne" /></SelectTrigger>
                <SelectContent>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name} ({c.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                ref={targetedFileRef}
                type="file"
                accept=".csv"
                onChange={handleTargetedCSVImport}
                className="hidden"
              />
              <Button
                onClick={() => targetedFileRef.current?.click()}
                disabled={!importCampaign || importing}
                className="gap-2"
              >
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importer le CSV
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCampaign} onValueChange={setFilterCampaign}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Campagne" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les campagnes</SelectItem>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="not_started">Pas commencé</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="card-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Campagne</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Profil</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 200).map((p) => {
                  const campaign = campaigns.find(c => c.id === p.campaign_id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.email}</TableCell>
                      <TableCell>
                        {campaign ? <Badge variant="outline" className="font-mono">{campaign.code}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'completed' ? 'default' : 'secondary'}>
                          {p.status === 'completed' ? 'Terminé' : p.status === 'in_progress' ? 'En cours' : 'Pas commencé'}
                        </Badge>
                      </TableCell>
                      <TableCell>{p.global_score !== null ? `${p.global_score}%` : '—'}</TableCell>
                      <TableCell>{p.profile || '—'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun participant trouvé.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            {filtered.length > 200 && (
              <p className="text-center py-3 text-sm text-muted-foreground">
                Affichage de 200 sur {filtered.length} résultats. Utilisez les filtres pour affiner.
              </p>
            )}
          </div>
        </TabsContent>

        {/* === INVITATIONS === */}
        <TabsContent value="invitations" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Rechercher par email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCampaign} onValueChange={setFilterCampaign}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Campagne" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les campagnes</SelectItem>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="card-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email invité</TableHead>
                  <TableHead>Campagne</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut test</TableHead>
                  <TableHead>Invité le</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.slice(0, 200).map((m) => {
                  const campaign = campaigns.find(c => c.id === m.campaign_id);
                  const participant = participants.find(p => p.campaign_id === m.campaign_id && p.email.toLowerCase() === m.email.toLowerCase());
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.email}</TableCell>
                      <TableCell>
                        {campaign ? <Badge variant="outline" className="font-mono">{campaign.code}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{m.role}</Badge>
                      </TableCell>
                      <TableCell>
                        {participant ? (
                          <Badge variant={participant.status === 'completed' ? 'default' : 'secondary'}>
                            {participant.status === 'completed' ? 'Terminé' : participant.status === 'in_progress' ? 'En cours' : 'Pas commencé'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Non inscrit</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(m.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteMember(m.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune invitation.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* === RÔLES === */}
        <TabsContent value="roles" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Gérez le rôle de chaque personne invitée dans une campagne.
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Rechercher par email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterCampaign} onValueChange={setFilterCampaign}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Campagne" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les campagnes</SelectItem>
                {campaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="card-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Campagne</TableHead>
                  <TableHead className="w-[220px]">Rôle</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.slice(0, 200).map((m) => {
                  const campaign = campaigns.find(c => c.id === m.campaign_id);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.email}</TableCell>
                      <TableCell>
                        {campaign ? <Badge variant="outline" className="font-mono">{campaign.code}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Select value={m.role} onValueChange={(v) => handleUpdateRole(m.id, v as any)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="participant">Participant</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="consultant">Consultant</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteMember(m.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredMembers.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun rôle attribué.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
