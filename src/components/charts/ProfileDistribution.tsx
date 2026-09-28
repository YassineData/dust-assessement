import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Profile } from '@/lib/assessment-data';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAnimateOnce, CHART_ANIMATION_MS } from '@/hooks/useAnimateOnce';
import { PROFILE_COLORS, PROFILE_ORDER, profileLabel } from '@/lib/profile-style';

interface ProfileDistributionProps {
  data: { profile: Profile; count: number }[];
  totalParticipants: number;
}

export { PROFILE_COLORS };

export const ProfileDistribution = ({ data, totalParticipants }: ProfileDistributionProps) => {
  const { t } = useLanguage();
  const animate = useAnimateOnce('profile-donut');

  // Trier les données du plus fort au plus faible
  const sortedData = [...data].sort((a, b) =>
    PROFILE_ORDER.indexOf(a.profile.id as typeof PROFILE_ORDER[number]) - PROFILE_ORDER.indexOf(b.profile.id as typeof PROFILE_ORDER[number])
  );

  const { language } = useLanguage();
  const getProfileName = (profileId: string) => profileLabel({ id: profileId, name: '' }, language);

  const chartData = sortedData.map(d => ({
    name: getProfileName(d.profile.id),
    value: d.count,
    color: PROFILE_COLORS[d.profile.id],
  }));

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: 148, height: 148 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={70}
              paddingAngle={1.5}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={-270}
              isAnimationActive={animate}
              animationDuration={CHART_ANIMATION_MS}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-md border border-border bg-card px-3 py-2 text-[12px] shadow-lg">
                      <p className="font-medium text-foreground">{d.name}</p>
                      <p className="tabular-nums text-muted-foreground">{d.value} {t('charts.participants')}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] font-semibold tabular-nums text-foreground">{totalParticipants}</span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-outline">{t('charts.participants')}</span>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1">
        {sortedData.map(({ profile, count }) => {
          const percentage = totalParticipants > 0 ? Math.round((count / totalParticipants) * 100) : 0;
          return (
            <li key={profile.id} className="flex items-center gap-2.5 py-1">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PROFILE_COLORS[profile.id] }} />
              <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">{getProfileName(profile.id)}</span>
              <span className="mono text-right text-[12px] font-medium text-foreground">
                {count} <span className="text-outline">({percentage}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
