import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { COMPARISON_COLORS, COMPARISON_COLOR_BY_INDEX } from '@/components/CompareSelector';
import { useAnimateOnce, CHART_ANIMATION_MS } from '@/hooks/useAnimateOnce';

interface ComparisonData {
  thematic: string;
  averageScore: number;
  comparison1Score?: number;
  comparison2Score?: number;
  comparison3Score?: number;
  comparison4Score?: number;
}

interface ComparisonBarChartProps {
  data: ComparisonData[];
  averageLabel: string;
  comparison1Label?: string;
  comparison2Label?: string;
  comparison3Label?: string;
  comparison4Label?: string;
  showAverage?: boolean;
}

export const ComparisonBarChart = ({
  data,
  averageLabel,
  comparison1Label,
  comparison2Label,
  comparison3Label,
  comparison4Label,
  showAverage = true,
}: ComparisonBarChartProps) => {
  const animate = useAnimateOnce('comparison-bars');

  const comparisons = [
    { label: comparison1Label, key: 'comparison1Score' as const, color: COMPARISON_COLOR_BY_INDEX[0] },
    { label: comparison2Label, key: 'comparison2Score' as const, color: COMPARISON_COLOR_BY_INDEX[1] },
    { label: comparison3Label, key: 'comparison3Score' as const, color: COMPARISON_COLOR_BY_INDEX[2] },
    { label: comparison4Label, key: 'comparison4Score' as const, color: COMPARISON_COLOR_BY_INDEX[3] },
  ].filter(c => !!c.label && data.some(d => d[c.key] !== undefined));

  const totalSeries = (showAverage ? 1 : 0) + comparisons.length;
  const barSize = totalSeries <= 1 ? 22 : totalSeries <= 3 ? 14 : 10;

  return (
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="horizontal"
          margin={{ top: 8, right: 8, left: -16, bottom: 64 }}
          barGap={2}
          barCategoryGap="22%"
        >
          <CartesianGrid stroke="hsl(var(--chart-grid))" vertical={false} />
          <XAxis
            dataKey="thematic"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'hsl(var(--line))' }}
            angle={-30}
            textAnchor="end"
            interval={0}
            height={64}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--paper))' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div className="rounded-md border border-border bg-card px-3 py-2 text-[12px] shadow-lg">
                    <p className="mb-1 font-medium text-foreground">{d.thematic}</p>
                    <div className="space-y-0.5 tabular-nums">
                      {showAverage && (
                        <p className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COMPARISON_COLORS.average }} />
                          <span className="text-muted-foreground">{averageLabel}</span>
                          <span className="ml-auto pl-3 font-medium text-foreground">{d.averageScore}</span>
                        </p>
                      )}
                      {comparisons.map((c) =>
                        d[c.key] !== undefined ? (
                          <p key={c.key} className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                            <span className="text-muted-foreground">{c.label}</span>
                            <span className="ml-auto pl-3 font-medium text-foreground">{d[c.key]}</span>
                          </p>
                        ) : null
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          {showAverage && (
            <Bar
              dataKey="averageScore"
              name={averageLabel}
              radius={[3, 3, 0, 0]}
              barSize={barSize}
              minPointSize={2}
              fill={COMPARISON_COLORS.average}
              isAnimationActive={animate}
              animationDuration={CHART_ANIMATION_MS}
            />
          )}

          {comparisons.map((c) => (
            <Bar
              key={c.key}
              dataKey={c.key}
              name={c.label}
              fill={c.color}
              radius={[3, 3, 0, 0]}
              barSize={barSize}
              minPointSize={2}
              isAnimationActive={animate}
              animationDuration={CHART_ANIMATION_MS}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
