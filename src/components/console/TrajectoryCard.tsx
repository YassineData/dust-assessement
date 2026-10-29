import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SectionCard } from '@/components/console/SectionCard';
import { PILLARS, waveLabel } from '@/lib/waves';
import { HEALTH_THRESHOLD, breadthOf, recurrenceOf } from '@/lib/usage-import';
import type { TimelinePoint } from '@/hooks/useClientTimeline';

/**
 * Validated categorical palette (dataviz validator, light surface): pink / blue / green for the three pillars,
 * the readiness index as the emphasised ink line. Usage uses ink only, told apart by solid vs dashed and direct labels.
 */
export const PILLAR_COLOR: Record<(typeof PILLARS)[number]['id'], string> = {
  governance: '#E0569A',
  productivity: '#1C91FF',
  multiplayer: '#418B5C',
};
const INK = '#191715';

const pillarScore = (p: TimelinePoint, dims: string[]) => {
  const vals = dims.map((d) => p.dimensions[d]).filter((v): v is number => typeof v === 'number');
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
};

type Series = { key: string; label: string; color: string; width: number; dash?: string };

const shortDate = (iso: string, fr: boolean) => new Date(iso).toLocaleDateString(fr ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short' });

const CHART_HEIGHT = 240;
// Plot area in px per score point (chart height minus margins and the x axis, over 0-100).
const PX_PER_POINT = (CHART_HEIGHT - 12 - 4 - 30) / 100;
const LABEL_GAP_PX = 14;

/**
 * Vertical offset of each end label so close lines do not print their names on top of each other:
 * labels are sorted by value and pushed apart to at least LABEL_GAP_PX.
 */
const labelOffsets = (lastRow: Record<string, string | number | null> | undefined, series: Series[]) => {
  const placed = series
    .map((s) => ({ key: s.key, y: typeof lastRow?.[s.key] === 'number' ? -(lastRow![s.key] as number) * PX_PER_POINT : null }))
    .filter((p): p is { key: string; y: number } => p.y !== null)
    .sort((a, b) => a.y - b.y);
  const out: Record<string, number> = {};
  let prev = -Infinity;
  placed.forEach((p) => {
    const y = Math.max(p.y, prev + LABEL_GAP_PX);
    out[p.key] = y - p.y;
    prev = y;
  });
  return out;
};

/** Name at the end of each line (direct label), so identity never relies on color alone. */
const endLabel = (s: Series, lastIndex: number, offset: number) =>
  function EndLabel(props: { x?: number; y?: number; index?: number; value?: number | null }) {
    if (props.index !== lastIndex || props.value == null || props.x == null || props.y == null) return null;
    return (
      <text x={props.x + 8} y={props.y + offset} dy={4} fontSize={11} fill="hsl(var(--muted-foreground))">
        {s.label}
      </text>
    );
  };

const Legend = ({ series }: { series: Series[] }) => (
  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
    {series.map((s) => (
      <li key={s.key} className="inline-flex items-center gap-1.5">
        <svg width="16" height="6" aria-hidden>
          <line x1="0" y1="3" x2="16" y2="3" stroke={s.color} strokeWidth={s.width} strokeDasharray={s.dash} strokeLinecap="round" />
        </svg>
        {s.label}
      </li>
    ))}
  </ul>
);

const Chart = ({ rows, series, threshold }: { rows: Record<string, string | number | null>[]; series: Series[]; threshold?: number }) => {
  const last = rows.length - 1;
  const offsets = labelOffsets(rows[last], series);
  return (
    <div className="w-full" style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 96, bottom: 4, left: -18 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--chart-grid))" />
          <XAxis dataKey="x" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} interval={0} />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
          {threshold !== undefined && (
            <ReferenceLine
              y={threshold}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="2 4"
              label={{ value: `${threshold} %`, position: 'insideTopLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            />
          )}
          <Tooltip
            cursor={{ stroke: 'hsl(var(--border))' }}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
            labelFormatter={(_, p) => (p?.[0]?.payload?.full as string) ?? ''}
            formatter={(v: number, name: string) => [threshold !== undefined ? `${v} %` : v, name]}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={s.width}
              strokeDasharray={s.dash}
              dot={{ r: 4, fill: s.color, stroke: 'hsl(var(--card))', strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
              label={endLabel(s, last, offsets[s.key] ?? 0)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/** The whole journey on one time axis: what teams report (survey) next to what they do (Dust usage). */
export const TrajectoryCard = ({ points, fr }: { points: TimelinePoint[]; fr: boolean }) => {
  const measured = points.filter((p) => p.respondents > 0 || p.usage);
  if (points.filter((p) => p.respondents > 0).length < 2) return null;

  const rows = measured.map((p) => {
    const u = p.usage;
    const b = u ? breadthOf(u) : null;
    const r = u ? recurrenceOf(u) : null;
    const row: Record<string, string | number | null> = {
      x: `${waveLabel(p.wave, fr)}`,
      full: `${waveLabel(p.wave, fr)} · ${shortDate(p.createdAt, fr)}`,
      readiness: p.readiness,
      breadth: b !== null ? Math.round(b * 100) : null,
      recurrence: r !== null ? Math.round(r * 100) : null,
    };
    PILLARS.forEach((pl) => (row[pl.id] = pillarScore(p, pl.dims)));
    return row;
  });
  // Same wave name twice (two re-measures): add the date to tell them apart.
  rows.forEach((row) => {
    if (rows.filter((o) => o.x === row.x).length > 1) row.x = row.full;
  });

  const survey: Series[] = [
    { key: 'readiness', label: fr ? 'Indice' : 'Index', color: INK, width: 3 },
    ...PILLARS.map((pl) => ({ key: pl.id, label: fr ? pl.label.fr : pl.label.en, color: PILLAR_COLOR[pl.id], width: 2 })),
  ];
  const usage: Series[] = [
    { key: 'breadth', label: 'Breadth', color: INK, width: 2 },
    { key: 'recurrence', label: 'Recurrence', color: INK, width: 2, dash: '5 4' },
  ];
  const usageRows = rows.filter((r) => r.breadth !== null || r.recurrence !== null).length;

  return (
    <SectionCard
      title={fr ? 'La trajectoire' : 'The trajectory'}
      description={fr ? 'Chaque passage sur le même axe de temps. Survolez un point pour le détail.' : 'Every wave on one time axis. Hover a point for details.'}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-[13px] font-semibold text-foreground">{fr ? 'Ce que les équipes déclarent' : 'What teams report'}</p>
          <p className="mb-2 text-[12px] text-muted-foreground">{fr ? 'Questionnaire, score sur 100' : 'Survey, score out of 100'}</p>
          <Legend series={survey} />
          <Chart rows={rows} series={survey} />
        </div>
        <div>
          <p className="text-[13px] font-semibold text-foreground">{fr ? 'Ce qu’elles font vraiment' : 'What they actually do'}</p>
          <p className="mb-2 text-[12px] text-muted-foreground">{fr ? 'Usage Dust, en % · repère à 70 %' : 'Dust usage, in % · 70% mark'}</p>
          {usageRows > 0 ? (
            <>
              <Legend series={usage} />
              <Chart rows={rows} series={usage} threshold={Math.round(HEALTH_THRESHOLD * 100)} />
            </>
          ) : (
            <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-border bg-paper px-6 text-center text-[13px] text-muted-foreground">
              {fr
                ? 'Ajoutez l’export d’usage Dust à un passage (carte « Usage réel ») pour voir la breadth et la recurrence ici.'
                : 'Add the Dust usage export to a wave (« Actual usage » card) to see breadth and recurrence here.'}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
};
