import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileUp, Loader2, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SectionCard } from '@/components/console/SectionCard';
import { Button } from '@/components/ui/button';
import { V2_QUESTIONS } from '@/lib/assessment-v2';
import { ALL_TARGETS, Table, Target, buildRows, guessTargets, readTable, targetLabel } from '@/lib/import-responses';
import { cn } from '@/lib/utils';

interface Props {
  campaignId: string;
  companyName: string;
  fr: boolean;
  onImported: () => void;
}

const BATCH = 200;

const GROUPS: { label: string; test: (t: Target) => boolean }[] = [
  { label: 'Person', test: (t) => ['email', 'fullName', 'firstName', 'lastName', 'submittedAt'].includes(t) },
  { label: 'The form’s own question', test: (t) => t === 'custom' || t.startsWith('dim:') },
  { label: 'About you (survey)', test: (t) => t.startsWith('ctx:') },
  { label: 'Open questions (survey)', test: (t) => t.startsWith('open:') },
  { label: 'Our 26 statements', test: (t) => t.startsWith('q:') },
  { label: 'Skip', test: (t) => t === 'ignore' },
];

/** Drop a CSV or Excel export (Google Forms, Tally, Typeform…) and bring the answers into this campaign. */
export const ImportResponses = ({ campaignId, companyName, fr, onImported }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ added: number; skipped: number } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = async (f: File) => {
    setError(null);
    setDone(null);
    try {
      const t = await readTable(f);
      setFile(f);
      setTable(t);
      setTargets(guessTargets(t.headers));
    } catch {
      setError(fr ? 'Fichier illisible. Exportez la feuille en .csv ou .xlsx.' : 'Could not read this file. Export the sheet as .csv or .xlsx.');
    }
  };

  const reset = () => {
    setFile(null);
    setTable(null);
    setTargets([]);
    setError(null);
  };

  const rows = useMemo(() => (table ? buildRows(table, targets, campaignId, companyName) : []), [table, targets, campaignId, companyName]);
  const mappedQ = targets.filter((t) => t.startsWith('q:')).length;
  const ownScored = targets.filter((t) => t.startsWith('dim:')).length;
  const ownShown = targets.filter((t) => t === 'custom').length;
  const complete = rows.filter((r) => r.complete).length;
  const noEmail = rows.filter((r) => !r.hasEmail).length;
  const hasIdentity = targets.some((t) => t === 'email' || t === 'fullName' || t === 'firstName');

  const runImport = async () => {
    setBusy(true);
    setError(null);
    let added = 0;
    try {
      for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH).map((r) => r.record);
        const { data, error: err } = await supabase
          .from('participants')
          .upsert(chunk as never, { onConflict: 'campaign_id,email', ignoreDuplicates: !replace })
          .select('id');
        if (err) throw err;
        added += (data as unknown[] | null)?.length ?? chunk.length;
      }
      setDone({ added, skipped: rows.length - added });
      reset();
      onImported();
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? '';
      setError(
        /row-level security|policy/i.test(msg)
          ? fr
            ? 'Import refusé par la base : lancez d’abord supabase/005-import-participants.sql dans Supabase.'
            : 'The database refused the import: run supabase/005-import-participants.sql in Supabase first.'
          : `${fr ? 'Import interrompu' : 'Import stopped'} (${added} ${fr ? 'importés' : 'imported'}). ${msg}`
      );
      if (added) onImported();
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title={fr ? 'Importer des réponses d’un autre formulaire' : 'Import answers from another form'}
      description={
        fr
          ? 'Google Form, Tally, Typeform… Exportez la feuille de réponses en .csv ou .xlsx et déposez-la ici. Les colonnes sont reconnues automatiquement. Les questions propres au formulaire sont gardées telles quelles et peuvent compter dans un score.'
          : 'Google Forms, Tally, Typeform… Export the responses sheet as .csv or .xlsx and drop it here. Columns are matched automatically. The form’s own questions are kept as asked, and can count toward a score.'
      }
    >
      {done && (
        <p className="mb-4 flex items-center gap-2 rounded-md bg-ok-soft px-3 py-2 text-[13px] text-ok-ink">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {fr ? `${done.added} réponse(s) importée(s)` : `${done.added} response(s) imported`}
          {done.skipped > 0 && (fr ? ` · ${done.skipped} déjà présente(s), gardée(s) telles quelles` : ` · ${done.skipped} already in the campaign, left as they were`)}
        </p>
      )}

      {!table ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) load(f);
          }}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-10 text-center transition-colors',
            drag ? 'border-primary bg-lav-50' : 'border-border hover:bg-lav-50'
          )}
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <span className="text-[14px] font-medium text-foreground">{fr ? 'Glissez le fichier ici, ou cliquez pour le choisir' : 'Drop the file here, or click to choose it'}</span>
          <span className="text-[12px] text-muted-foreground">
            {fr ? 'Google Sheets : Fichier → Télécharger → .csv ou .xlsx' : 'Google Sheets: File → Download → .csv or .xlsx'}
          </span>
          <input
            ref={input}
            type="file"
            accept=".csv,.tsv,.txt,.xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) load(f);
              e.target.value = '';
            }}
          />
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[13px] text-foreground">
              <FileUp className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{file?.name}</span>
              <span className="text-muted-foreground">
                · {table.rows.length} {fr ? 'lignes' : 'rows'} · {table.headers.length} {fr ? 'colonnes' : 'columns'}
              </span>
            </p>
            <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
              {fr ? 'Changer de fichier' : 'Choose another file'}
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Stat
              label={fr ? 'Nos affirmations reconnues' : 'Our statements matched'}
              value={`${mappedQ} / ${V2_QUESTIONS.length}`}
              note={
                ownScored + ownShown
                  ? fr
                    ? `+ ${ownScored + ownShown} question(s) propre(s) au formulaire, dont ${ownScored} scorée(s)`
                    : `+ ${ownScored + ownShown} of the form's own question(s), ${ownScored} scored`
                  : undefined
              }
            />
            <Stat label={fr ? 'Réponses complètes (scorées)' : 'Complete answers (scored)'} value={String(complete)} />
            <Stat label={fr ? 'Partielles (visibles, non scorées)' : 'Partial (visible, not scored)'} value={String(rows.length - complete)} />
          </div>
          {rows.length > 0 && complete === 0 && (
            <p className="rounded-md bg-warn-soft px-3 py-2 text-[12px] leading-relaxed text-warn-ink">
              {fr
                ? 'Pas assez pour calculer des scores : tout sera importé et visible dans la console, sans score. Pour scorer, rattachez les questions à échelle du formulaire à une dimension (« Own question · scored as… »), au moins une par dimension.'
                : 'Not enough to compute scores: everything is imported and visible in the console, without scores. To score, link the form’s scale questions to a dimension (“Own question · scored as…”), at least one per dimension.'}
            </p>
          )}
          {noEmail > 0 && (
            <p className="rounded-md bg-lav-50 px-3 py-2 text-[12px] text-foreground/80">
              {fr
                ? `${noEmail} ligne(s) sans e-mail : elles sont importées avec une adresse générée.`
                : `${noEmail} row(s) without an email: imported with a generated address.`}
            </p>
          )}

          <div className="max-h-[420px] overflow-auto rounded-md ring-1 ring-border">
            <table className="w-full text-left text-[12px]">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-3 py-2 font-medium">{fr ? 'Colonne du fichier' : 'Column in the file'}</th>
                  <th className="px-3 py-2 font-medium">{fr ? 'Exemple' : 'Example'}</th>
                  <th className="px-3 py-2 font-medium">{fr ? 'Correspond à' : 'Maps to'}</th>
                </tr>
              </thead>
              <tbody>
                {table.headers.map((h, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="max-w-[260px] px-3 py-2 align-top text-foreground">{h || `Column ${i + 1}`}</td>
                    <td className="max-w-[180px] truncate px-3 py-2 align-top text-muted-foreground">{table.rows.find((r) => r[i])?.[i] ?? ''}</td>
                    <td className="px-3 py-1.5 align-top">
                      <select
                        value={targets[i]}
                        onChange={(e) => {
                          const next = [...targets];
                          const t = e.target.value as Target;
                          // A survey item can only come from one column.
                          if (t !== 'ignore') next.forEach((x, j) => x === t && (next[j] = 'ignore'));
                          next[i] = t;
                          setTargets(next);
                        }}
                        className={cn(
                          'w-full max-w-[340px] rounded-md bg-background px-2 py-1.5 text-[12px] ring-1 ring-border',
                          (targets[i] === 'ignore' || targets[i] === 'custom') && 'text-muted-foreground'
                        )}
                      >
                        {GROUPS.map((g) => (
                          <optgroup key={g.label} label={g.label}>
                            {ALL_TARGETS.filter(g.test).map((t) => (
                              <option key={t} value={t}>
                                {targetLabel(t).length > 70 ? `${targetLabel(t).slice(0, 68)}…` : targetLabel(t)}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[12px] text-foreground/80">
              <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
              {fr ? 'Remplacer les personnes déjà présentes (même e-mail)' : 'Replace people already in the campaign (same email)'}
            </label>
            <Button className="bg-ink hover:bg-ink/90" disabled={busy || !rows.length || !hasIdentity} onClick={runImport}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {fr ? `Importer ${rows.length} réponse(s)` : `Import ${rows.length} response(s)`}
            </Button>
          </div>
          {!hasIdentity && (
            <p className="text-[12px] text-risk-ink">{fr ? 'Indiquez au moins la colonne e-mail ou nom.' : 'Pick at least the email or name column.'}</p>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-[12px] text-risk-ink">{error}</p>}
    </SectionCard>
  );
};

const Stat = ({ label, value, note }: { label: string; value: string; note?: string }) => (
  <div className="rounded-md bg-lav-50 px-3 py-2">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-[18px] font-semibold tabular-nums text-foreground">{value}</p>
    {note && <p className="text-[11px] text-muted-foreground">{note}</p>}
  </div>
);
