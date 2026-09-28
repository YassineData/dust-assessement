import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';

interface SuperAdmin {
  id: string;
  email: string;
  access_code: string;
  created_at: string;
}

export const AdminUsers = () => {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formCode, setFormCode] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    const { data } = await supabase.from('super_admins').select('*').order('created_at', { ascending: false });
    setAdmins(data || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!formEmail || !formCode) {
      toast({ title: 'Email et code requis', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('super_admins').insert({ email: formEmail.toLowerCase().trim(), access_code: formCode.trim() });
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Admin ajouté' });
      setShowDialog(false);
      setFormEmail('');
      setFormCode('');
      fetchAdmins();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet administrateur ?')) return;
    await supabase.from('super_admins').delete().eq('id', id);
    setAdmins(prev => prev.filter(a => a.id !== id));
    toast({ title: 'Admin supprimé' });
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Utilisateurs Admin</h1>
          <p className="text-muted-foreground">Gérez les accès super administrateur</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nouvel admin
        </Button>
      </div>

      <div className="card-elevated overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Code d'accès</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span className="font-medium">{admin.email}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-muted-foreground">••••••••</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(admin.created_at).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(admin.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un administrateur</DialogTitle>
            <DialogDescription>Cet utilisateur pourra accéder au panneau d'administration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="admin@dust.tt" type="email" />
            </div>
            <div className="space-y-2">
              <Label>Code d'accès</Label>
              <Input value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="Code secret" />
            </div>
            <Button onClick={handleAdd} className="w-full">Ajouter</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
