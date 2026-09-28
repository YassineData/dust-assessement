import { useState, useMemo } from 'react';
import { Building2, Search, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface Campaign {
  id: string;
  code: string;
  company_name: string;
  campaign_name?: string | null;
  creator_email: string;
  created_at: string;
}

interface CampaignSelectorProps {
  campaigns: Campaign[];
  selectedCampaign: Campaign | null;
  onSelect: (campaign: Campaign) => void;
  /** "sidebar" renders the trigger as the dark workspace block of the navigation. */
  variant?: 'default' | 'sidebar';
}

export const CampaignSelector = ({
  campaigns,
  selectedCampaign,
  onSelect,
  variant = 'default',
}: CampaignSelectorProps) => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredCampaigns = useMemo(() => {
    if (!searchQuery.trim()) return campaigns;
    const query = searchQuery.toLowerCase();
    return campaigns.filter(
      (c) =>
        c.company_name.toLowerCase().includes(query) ||
        (c.campaign_name ?? '').toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query) ||
        c.creator_email.toLowerCase().includes(query)
    );
  }, [campaigns, searchQuery]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      language === 'fr' ? 'fr-FR' : 'en-GB',
      { day: '2-digit', month: '2-digit', year: 'numeric' }
    );
  };

  const getCampaignName = (campaign?: Campaign | null) =>
    campaign?.campaign_name?.trim() || (language === 'fr' ? 'Sans nom de campagne' : 'Untitled campaign');

  const getSelectedLabel = () => {
    if (!selectedCampaign) return language === 'fr' ? 'Sélectionner une campagne' : 'Select a campaign';
    return `${selectedCampaign.company_name} · ${getCampaignName(selectedCampaign)}`;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {variant === 'sidebar' ? (
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-md bg-white/[0.06] px-2.5 py-2 text-left transition-colors duration-150 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-brand-soft/80" />
              <span className="min-w-0">
                <span className="block truncate text-[11px] leading-none text-sidebar-foreground/80">
                  {selectedCampaign?.company_name || (language === 'fr' ? 'Espace' : 'Workspace')}
                </span>
                <span className="mt-0.5 block truncate text-[12px] font-semibold text-white">
                  {selectedCampaign ? getCampaignName(selectedCampaign) : getSelectedLabel()}
                </span>
              </span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/70" />
          </button>
        ) : (
          <Button variant="outline" size="sm" className="w-full min-w-0 justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="truncate text-[13px]">
                {getSelectedLabel()}
              </span>
            </div>
            <ChevronsUpDown className="w-4 h-4 opacity-50" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[520px] max-w-[calc(100vw-2rem)] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'fr' ? 'Rechercher une campagne...' : 'Search campaigns...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>
        <ScrollArea className="h-[300px]">
          {filteredCampaigns.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              {language === 'fr' ? 'Aucune campagne trouvée' : 'No campaigns found'}
            </div>
          ) : (
            filteredCampaigns.map((campaign) => (
              <DropdownMenuItem
                key={campaign.id}
                className="p-3 cursor-pointer focus:bg-muted"
                onClick={() => {
                  onSelect(campaign);
                  setIsOpen(false);
                  setSearchQuery('');
                }}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 w-full">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground truncate">
                      {campaign.company_name}
                    </div>
                    <div className="font-medium text-foreground truncate">
                      {getCampaignName(campaign)}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(campaign.created_at)}
                  </span>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
