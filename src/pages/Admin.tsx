import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, Mail, Key, AlertCircle, LayoutDashboard, FileText, Users, FolderKanban, Layers, ShieldCheck, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminTemplates } from '@/components/admin/AdminTemplates';
import { AdminCampaigns } from '@/components/admin/AdminCampaigns';
import { AdminParticipants } from '@/components/admin/AdminParticipants';
import { AdminSegmentation } from '@/components/admin/AdminSegmentation';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { DustMark, DustWordmark } from '@/components/DustMark';

type AdminTab = 'overview' | 'templates' | 'campaigns' | 'participants' | 'segmentation' | 'users';

const ADMIN_SESSION_KEY = 'admin_panel_session';

const adminTabs: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'campaigns', label: 'Campagnes', icon: FolderKanban },
  { id: 'participants', label: 'Participants', icon: Users },
  { id: 'segmentation', label: 'Segmentation', icon: Layers },
  { id: 'users', label: 'Utilisateurs', icon: ShieldCheck },
];

const Admin = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Login state
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Restore session
  useEffect(() => {
    const stored = localStorage.getItem(ADMIN_SESSION_KEY);
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (Date.now() - session.lastActivity < 60 * 60 * 1000) { // 1h
          setIsAuthenticated(true);
          localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ ...session, lastActivity: Date.now() }));
        } else {
          localStorage.removeItem(ADMIN_SESSION_KEY);
        }
      } catch {
        localStorage.removeItem(ADMIN_SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoginLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ email: email.toLowerCase().trim(), code: code.trim() }),
        }
      );

      const data = await res.json();
      if (data.valid) {
        setIsAuthenticated(true);
        localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({ email, lastActivity: Date.now() }));
      } else {
        setError('Identifiants invalides');
      }
    } catch {
      setError('Erreur serveur');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card-elevated p-8">
            <div className="mb-6 flex flex-col items-start">
              <DustWordmark className="mb-5" />
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-brand-soft">
                <Lock className="h-4 w-4 text-brand-ink" />
              </div>
              <h1 className="page-title">Administration</h1>
              <p className="text-sm text-muted-foreground mt-1">Espace réservé à l'équipe Dust</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="prenom@dust.tt"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-code" className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  Code d'accès
                </Label>
                <Input
                  id="admin-code"
                  type="password"
                  placeholder="••••••••"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Admin panel
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-60 h-screen bg-sidebar text-sidebar-foreground flex-shrink-0 flex flex-col fixed top-0 left-0 z-40">
        <div className="p-4 flex-1 flex flex-col">
          {/* Logo */}
          <div className="flex items-center gap-3 px-3 mb-8 pt-2">
            <DustMark className="h-6 w-6" />
            <span className="text-[13px] font-semibold text-white">Dust</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-sidebar-foreground/70">Admin</span>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-0.5 flex-1">
            {adminTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex h-8 items-center gap-2.5 px-2.5 text-[13px] font-medium transition-colors duration-150 rounded-md text-left w-full",
                    isActive
                      ? "bg-primary text-white"
                      : "text-sidebar-foreground hover:text-white hover:bg-sidebar-accent"
                  )}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Bottom */}
          <div className="border-t border-sidebar-border pt-3 space-y-0.5">
            <button
              onClick={() => navigate('/')}
              className="flex h-8 items-center gap-2.5 px-2.5 text-[13px] text-sidebar-foreground hover:text-white hover:bg-sidebar-accent rounded-md w-full"
            >
              <LayoutDashboard className="w-4 h-4" />
              Retour au site
            </button>
            <button
              onClick={handleLogout}
              className="flex h-8 items-center gap-2.5 px-2.5 text-[13px] text-sidebar-foreground hover:text-white hover:bg-sidebar-accent rounded-md w-full"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="ml-60 flex-1 px-8 py-6">
        {activeTab === 'overview' && <AdminOverview />}
        {activeTab === 'templates' && <AdminTemplates />}
        {activeTab === 'campaigns' && <AdminCampaigns />}
        {activeTab === 'participants' && <AdminParticipants />}
        {activeTab === 'segmentation' && <AdminSegmentation />}
        {activeTab === 'users' && <AdminUsers />}
      </main>
    </div>
  );
};

export default Admin;
