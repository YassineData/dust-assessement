import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAnimateOnce, CHART_ANIMATION_MS } from '@/hooks/useAnimateOnce';

interface ThematicRadarProps {
  data: { thematic: string; score: number; benchmark?: number }[];
  showBenchmark?: boolean;
  animationKey?: string;
}

export const ThematicRadar = ({ data, showBenchmark = true, animationKey = 'thematic-radar' }: ThematicRadarProps) => {
  const { t } = useLanguage();
  const animate = useAnimateOnce(animationKey);

  // Push labels slightly away from the chart so they never overlap the polygon
  const renderPolarAngleAxisTick = (props: any) => {
    const { x, y, payload, cx, cy } = props;
    const angle = Math.atan2(y - cy, x - cx);
    const offset = 12;
    const newX = x + Math.cos(angle) * offset;
    const newY = y + Math.sin(angle) * offset;
    const anchor = Math.abs(Math.cos(angle)) < 0.3 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';

    return (
      <text
        x={newX}
        y={newY}
        textAnchor={anchor}
        dominantBaseline="middle"
        fill="hsl(var(--muted-foreground))"
        fontSize={11}
      >
        {payload.value}
      </text>
    );
  };

  return (
    <div className="w-full">
      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="68%" data={data}>
            <PolarGrid stroke="hsl(var(--chart-grid))" />
            <PolarAngleAxis dataKey="thematic" tick={renderPolarAngleAxisTick} tickLine={false} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              tickCount={3}
              axisLine={false}
            />
            {showBenchmark && (
              <Radar
                name={t('charts.nationalAverage')}
                dataKey="benchmark"
                stroke="hsl(var(--chart-benchmark))"
                fill="hsl(var(--chart-benchmark))"
                fillOpacity={0.15}
                strokeWidth={1.25}
                strokeDasharray="3 3"
                isAnimationActive={animate}
                animationDuration={CHART_ANIMATION_MS}
              />
            )}
            <Radar
              name={t('charts.team')}
              dataKey="score"
              stroke="hsl(var(--brand))"
              fill="hsl(var(--brand))"
              fillOpacity={0.14}
              strokeWidth={1.5}
              dot={{ r: 2.5, fill: 'hsl(var(--brand))', strokeWidth: 0 }}
              isAnimationActive={animate}
              animationDuration={CHART_ANIMATION_MS}
            />
            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-md border border-border bg-card px-3 py-2 text-[12px] shadow-lg">
                      <p className="mb-0.5 font-medium text-foreground">{d.thematic}</p>
                      <p className="tabular-nums text-foreground">
                        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-brand" />
                        {t('charts.score')}: {d.score}/100
                      </p>
                      {showBenchmark && d.benchmark !== undefined && (
                        <p className="tabular-nums text-muted-foreground">
                          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-chart-benchmark" />
                          {t('charts.nationalAverage')}: {d.benchmark}/100
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
