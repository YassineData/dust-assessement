import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Trash2, Pencil, Tag, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';

interface SegType {
  id: string;
  name: string;
  name_en: string | null;
  description: string | null;
  campaign_id: string;
}

interface SegGroup {
  id: string;
  name: string;
  name_en: string | null;
  color: string | null;
  type_id: string;
}

interface Campaign {
  id: string;
  code: string;
  company_name: string;
}

interface Participant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  campaign_id: string | null;
}

export const AdminSegmentation = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [segTypes, setSegTypes] = useState<SegType[]>([]);
  const [selectedType, setSelectedType] = useState<SegType | null>(null);
  const [groups, setGroups] = useState<SegGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SegGroup | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [assignedIds, setAssignedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [formName, setFormName] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formColor, setFormColor] = useState('#7c3aed');
  const [formDesc, setFormDesc] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('campaigns').select('id, code, company_name').order('created_at', { ascending: false }).then(({ data }) => {
      setCampaigns(data || []);
      if (data && data.length > 0) setSelectedCampaign(data[0].id);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchTypes();
      setSelectedType(null);
      setSelectedGroup(null);
    }
  }, [selectedCampaign]);

  const fetchTypes = async () => {
    const { data } = await supabase.from('segmentation_types').select('*').eq('campaign_id', selectedCampaign).order('created_at');
    setSegTypes(data || []);
  };

  const fetchGroups = async (typeId: string) => {
    const { data } = await supabase.from('segmentation_groups').select('*').eq('type_id', typeId).order('created_at');
    setGroups(data || []);
  };

  const fetchAssigned = async (groupId: string) => {
    const { data } = await supabase.from('participant_segments').select('participant_id').eq('group_id', groupId);
    setAssignedIds((data || []).map(d => d.participant_id));
  };

  const fetchParticipants = async () => {
    const { data } = await supabase.from('participants').select('id, first_name, last_name, email, campaign_id').eq('campaign_id', selectedCampaign);
    setParticipants(data || []);
  };

  const handleSelectType = (type: SegType) => {
    setSelectedType(type);
    setSelectedGroup(null);
    fetchGroups(type.id);
  };

  const handleSelectGroup = (group: SegGroup) => {
    setSelectedGroup(group);
    fetchAssigned(group.id);
    fetchParticipants();
  };

  const handleSaveType = async () => {
    if (editId) {
      await supabase.from('segmentation_types').update({ name: formName, name_en: formNameEn || null, description: formDesc || null }).eq('id', editId);
    } else {
      await supabase.from('segmentation_types').insert({ name: formName, name_en: formNameEn || null, description: formDesc || null, campaign_id: selectedCampaign });
    }
    setShowTypeDialog(false);
    resetForm();
    fetchTypes();
    toast({ title: editId ? 'Type mis à jour' : 'Type créé' });
  };

  const handleSaveGroup = async () => {
    if (!selectedType) return;
    if (editId) {
      await supabase.from('segmentation_groups').update({ name: formName, name_en: formNameEn || null, color: formColor }).eq('id', editId);
    } else {
      await supabase.from('segmentation_groups').insert({ name: formName, name_en: formNameEn || null, color: formColor, type_id: selectedType.id });
    }
    setShowGroupDialog(false);
    resetForm();
    fetchGroups(selectedType.id);
    toast({ title: editId ? 'Groupe mis à jour' : 'Groupe créé' });
  };

  const handleToggleParticipant = async (participantId: string) => {
    if (!selectedGroup) return;
    if (assignedIds.includes(participantId)) {
      await supabase.from('participant_segments').delete().eq('group_id', selectedGroup.id).eq('participant_id', participantId);
      setAssignedIds(prev => prev.filter(id => id !== participantId));
    } else {
      await supabase.from('participant_segments').insert({ group_id: selectedGroup.id, participant_id: participantId });
      setAssignedIds(prev => [...prev, participantId]);
    }
  };

  const handleDeleteType = async (id: string) => {
    await supabase.from('segmentation_types').delete().eq('id', id);
    if (selectedType?.id === id) { setSelectedType(null); setGroups([]); }
    fetchTypes();
    toast({ title: 'Type supprimé' });
  };

  const handleDeleteGroup = async (id: string) => {
    await supabase.from('segmentation_groups').delete().eq('id', id);
    if (selectedGroup?.id === id) setSelectedGroup(null);
    if (selectedType) fetchGroups(selectedType.id);
    toast({ title: 'Groupe supprimé' });
  };

  const resetForm = () => { setFormName(''); setFormNameEn(''); setFormColor('#7c3aed'); setFormDesc(''); setEditId(null); };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Segmentation</h1>
          <p className="text-muted-foreground">Créez des groupes custom (manager, pays, équipe) et assignez des participants</p>
        </div>
      </div>

      {/* Campaign selector */}
      <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
        <SelectTrigger className="w-[300px]"><SelectValue placeholder="Sélectionner une campagne" /></SelectTrigger>
        <SelectContent>
          {campaigns.map(c => (
            <SelectItem key={c.id} value={c.id}>{c.company_name} ({c.code})</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button onClick={() => { setSelectedType(null); setSelectedGroup(null); }} className="text-primary hover:underline">Types</button>
        {selectedType && (
          <>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <button onClick={() => setSelectedGroup(null)} className="text-primary hover:underline">{selectedType.name}</button>
          </>
        )}
        {selectedGroup && (
          <>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">{selectedGroup.name}</span>
          </>
        )}
      </div>

      {/* Types list */}
      {!selectedType && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetForm(); setShowTypeDialog(true); }} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Nouveau type</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segTypes.map((t) => (
              <div key={t.id} className="card-interactive p-5 cursor-pointer" onClick={() => handleSelectType(t)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" />
                    <h3 className="font-medium text-foreground">{t.name}</h3>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setFormName(t.name); setFormNameEn(t.name_en || ''); setFormDesc(t.description || ''); setEditId(t.id); setShowTypeDialog(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteType(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                {t.name_en && <p className="text-xs text-muted-foreground mt-1">EN: {t.name_en}</p>}
              </div>
            ))}
            {segTypes.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">Aucun type de segmentation. Créez-en un pour commencer.</p>
            )}
          </div>
        </div>
      )}

      {/* Groups list */}
      {selectedType && !selectedGroup && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="card-title">Groupes de "{selectedType.name}"</h2>
            <Button onClick={() => { resetForm(); setShowGroupDialog(true); }} size="sm" className="gap-2"><Plus className="w-4 h-4" /> Nouveau groupe</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {groups.map((g) => (
              <div key={g.id} className="card-interactive p-5 cursor-pointer" onClick={() => handleSelectGroup(g)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: g.color || '#7c3aed' }} />
                    <h3 className="font-medium text-foreground">{g.name}</h3>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setFormName(g.name); setFormNameEn(g.name_en || ''); setFormColor(g.color || '#7c3aed'); setEditId(g.id); setShowGroupDialog(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteGroup(g.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                {g.name_en && <p className="text-xs text-muted-foreground mt-1">EN: {g.name_en}</p>}
              </div>
            ))}
            {groups.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">Aucun groupe.</p>
            )}
          </div>
        </div>
      )}

      {/* Assign participants */}
      {selectedGroup && (
        <div className="space-y-4">
          <h2 className="card-title">Assigner des participants à "{selectedGroup.name}"</h2>
          <div className="card-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => handleToggleParticipant(p.id)}>
                    <TableCell>
                      <input type="checkbox" checked={assignedIds.includes(p.id)} readOnly className="rounded border-border" />
                    </TableCell>
                    <TableCell className="font-medium">{p.first_name} {p.last_name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email}</TableCell>
                  </TableRow>
                ))}
                {participants.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Aucun participant dans cette campagne.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Type Dialog */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Modifier le type' : 'Nouveau type de segmentation'}</DialogTitle>
            <DialogDescription>Ex: Département, Pays, Niveau hiérarchique</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nom (FR)</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Département" /></div>
            <div className="space-y-2"><Label>Nom (EN)</Label><Input value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} placeholder="Ex: Department" /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={formDesc} onChange={(e) => setFormDesc(e.target.value)} /></div>
            <Button onClick={handleSaveType} className="w-full">{editId ? 'Mettre à jour' : 'Créer'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Group Dialog */}
      <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Modifier le groupe' : 'Nouveau groupe'}</DialogTitle>
            <DialogDescription>Ex: Marketing, France, Manager</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nom (FR)</Label><Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Ex: Marketing" /></div>
            <div className="space-y-2"><Label>Nom (EN)</Label><Input value={formNameEn} onChange={(e) => setFormNameEn(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={formColor} onChange={(e) => setFormColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                <Input value={formColor} onChange={(e) => setFormColor(e.target.value)} className="w-32 font-mono" />
              </div>
            </div>
            <Button onClick={handleSaveGroup} className="w-full">{editId ? 'Mettre à jour' : 'Créer'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
