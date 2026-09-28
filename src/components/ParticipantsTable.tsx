import { useEffect, useMemo, useState } from 'react';
import { Search, ArrowDownWideNarrow, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CampaignParticipant } from '@/hooks/useCampaignParticipants';
import { useLanguage } from '@/contexts/LanguageContext';
import { getScoreColorClass } from '@/lib/score-colors';
import { PROFILE_BADGE, PROFILE_ORDER, initials, profileLabel } from '@/lib/profile-style';
import { classAsProfile } from '@/lib/assessment-v2';
import { cn } from '@/lib/utils';

interface ParticipantsTableProps {
  participants: CampaignParticipant[];
  selectedId?: string | null;
  onSelect?: (participant: CampaignParticipant) => void;
}

const PAGE_SIZE = 12;

export const ParticipantsTable = ({ participants, selectedId, onSelect }: ParticipantsTableProps) => {
  const { t, language } = useLanguage();
  const fr = language === 'fr';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [profileFilter, setProfileFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  // Separate completed and non-completed participants
  const completedParticipants = participants.filter(p => p.status === 'completed');
  const nonCompletedParticipants = participants.filter(p => p.status !== 'completed');

  const matchesSearch = (p: CampaignParticipant) =>
    `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.team || '').toLowerCase().includes(searchQuery.toLowerCase());

  // Filter and sort completed participants
  const filteredCompleted = completedParticipants
    .filter(matchesSearch)
    .filter(p => profileFilter === 'all' || p.profile.id === profileFilter)
    .sort((a, b) => sortOrder === 'desc' ? b.score - a.score : a.score - b.score);

  // Non-completed participants have no profile yet: hidden when a profile filter is active
  const filteredNonCompleted = profileFilter === 'all' ? nonCompletedParticipants.filter(matchesSearch) : [];

  // Combine: completed first (ranked), then non-completed
  const allFilteredParticipants = [...filteredCompleted, ...filteredNonCompleted];

  useEffect(() => { setPage(0); }, [searchQuery, sortOrder, profileFilter]);
  const pageCount = Math.max(1, Math.ceil(allFilteredParticipants.length / PAGE_SIZE));
  const pageRows = allFilteredParticipants.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  // Get rank only for completed participants
  const getRank = (participant: CampaignParticipant) => {
    if (participant.status !== 'completed') return null;
    const positionInCompleted = filteredCompleted.findIndex(p => p.id === participant.id);
    if (positionInCompleted === -1) return null;
    if (sortOrder === 'desc') {
      return positionInCompleted + 1;
    }
    return filteredCompleted.length - positionInCompleted;
  };

  const profileCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    completedParticipants.forEach(p => { counts[p.profile.id] = (counts[p.profile.id] || 0) + 1; });
    return counts;
  }, [completedParticipants]);

  const chip = (active: boolean) =>
    cn(
      'h-7 rounded-sm px-2.5 text-[12px] font-medium transition-colors duration-150',
      active ? 'bg-ink text-white' : 'bg-lav-50 text-foreground/80 hover:bg-lav-100'
    );

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="card-elevated space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={fr ? 'Rechercher par nom, email ou équipe…' : 'Search by name, email or team…'}
              className="border-transparent bg-lav-50 pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <ArrowDownWideNarrow className="h-4 w-4 text-muted-foreground" />
            <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">{fr ? "Meilleurs d'abord" : 'Best First'}</SelectItem>
                <SelectItem value="asc">{fr ? "Moins bons d'abord" : 'Lowest First'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="mono rounded-sm bg-lav-50 px-2 py-1 text-[12px] text-outline">
            {allFilteredParticipants.length} / {participants.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[12px] text-muted-foreground">{fr ? 'Profil :' : 'Profile:'}</span>
          <button type="button" className={chip(profileFilter === 'all')} onClick={() => setProfileFilter('all')}>
            {fr ? 'Tous' : 'All'}
          </button>
          {PROFILE_ORDER.map((id) => {
            const profile = classAsProfile(id);
            return (
              <button key={id} type="button" className={chip(profileFilter === id)} onClick={() => setProfileFilter(profileFilter === id ? 'all' : id)}>
                {profileLabel(profile, language, t)} <span className="tabular-nums opacity-60">({profileCounts[id] || 0})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] tabular-nums">
            <thead>
              <tr className="border-b border-border bg-lav-50 text-left">
                <th className="h-9 px-4 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">{fr ? 'Membre' : 'Member'}</th>
                <th className="hidden h-9 px-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground md:table-cell">{fr ? 'Profil' : 'Profile fit'}</th>
                <th className="hidden h-9 px-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground 2xl:table-cell">{fr ? 'Date du test' : 'Test date'}</th>
                <th className="h-9 px-3 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">{fr ? 'Rang' : 'Rank'}</th>
                <th className="h-9 px-4 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">Score</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    {searchQuery || profileFilter !== 'all'
                      ? (fr ? 'Aucun participant trouvé' : 'No participant found')
                      : (fr ? 'Aucun participant' : 'No participants')}
                  </td>
                </tr>
              ) : (
                pageRows.map((participant) => {
                  const isCompleted = participant.status === 'completed';
                  const rank = getRank(participant);
                  const selected = selectedId === participant.id;

                  return (
                    <tr
                      key={participant.id}
                      onClick={() => onSelect?.(participant)}
                      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onSelect) { e.preventDefault(); onSelect(participant); } }}
                      tabIndex={onSelect ? 0 : undefined}
                      aria-selected={selected}
                      className={cn(
                        'border-b border-border transition-colors duration-150 last:border-0 focus-visible:bg-lav-50 focus-visible:outline-none',
                        onSelect && 'cursor-pointer',
                        selected ? 'bg-brand-soft shadow-[inset_3px_0_0_hsl(var(--brand))]' : 'hover:bg-paper'
                      )}
                    >
                      <td className="min-w-[200px] max-w-[320px] px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
                              selected ? 'bg-brand-strong text-white' : 'bg-lav-100 text-foreground/80'
                            )}
                          >
                            {initials(participant.firstName, participant.lastName)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{participant.firstName} {participant.lastName}</p>
                            <p className="mono truncate text-[11px] text-muted-foreground">{participant.email}{participant.team ? ` · ${participant.team}` : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden whitespace-nowrap px-3 md:table-cell">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className={PROFILE_BADGE[participant.profile.id] ?? 'pill pill-neutral'}>
                              {profileLabel(participant.profile, language, t)}
                            </span>
                            {participant.roleMismatch && (
                              <span className="pill pill-amber" title={fr ? 'Rôle de formation non déclaré' : 'Training role not declared'}>
                                {fr ? 'à confirmer' : 'to confirm'}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="pill pill-neutral">{fr ? 'Test non terminé' : 'Test not completed'}</span>
                        )}
                      </td>
                      <td className="mono hidden whitespace-nowrap px-3 text-[12px] text-muted-foreground 2xl:table-cell">
                        {isCompleted
                          ? participant.completedAt.toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : '–'}
                      </td>
                      <td className="mono px-3 text-right text-[12px] text-outline">
                        {isCompleted && rank ? String(rank).padStart(2, '0') : '–'}
                      </td>
                      <td className="px-4 text-right">
                        {isCompleted ? (
                          <span className={cn('text-base font-semibold', getScoreColorClass(participant.score))}>{participant.score}</span>
                        ) : (
                          <span className="text-muted-foreground">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border bg-lav-50/60 px-4 py-2.5 text-[12px] text-muted-foreground">
          <span>
            {fr ? 'Affichage' : 'Showing'}{' '}
            <span className="tabular-nums">
              {allFilteredParticipants.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min(allFilteredParticipants.length, (page + 1) * PAGE_SIZE)}
            </span>{' '}
            {fr ? 'sur' : 'of'} <span className="tabular-nums">{allFilteredParticipants.length}</span>
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label={fr ? 'Page précédente' : 'Previous page'}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="mono px-2 text-foreground">{page + 1} / {pageCount}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)} aria-label={fr ? 'Page suivante' : 'Next page'}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
