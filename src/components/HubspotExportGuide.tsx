import { useEffect, useState } from 'react';
import { ClipboardCheck, CornerDownLeft, Download, FileJson, Send, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DustMark } from '@/components/DustMark';
import { cn } from '@/lib/utils';
import { HUBSPOT_GUIDE_HIDDEN_KEY } from '@/lib/hubspot-guide';

const STEP_MS = 1700;

/**
 * Shown right after the file is downloaded: an animated walk-through (file → message → Dust → HubSpot note),
 * then one button that copies the message and opens Dust (inside that click, so the browser allows both).
 */
export const HubspotExportGuide = ({
  open,
  fr,
  fileName,
  companyName,
  domain,
  onSend,
  onClose,
}: {
  open: boolean;
  fr: boolean;
  fileName: string;
  companyName: string;
  domain: string;
  onSend: () => void;
  onClose: () => void;
}) => {
  const [step, setStep] = useState(0);
  const [hideNextTime, setHideNextTime] = useState(false);

  useEffect(() => {
    if (!open) return;
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setStep(3);
      return;
    }
    setStep(0);
    // 0 → 1 → 2 → 3, hold, then start again.
    const id = window.setInterval(() => setStep((s) => (s + 1) % 5), STEP_MS);
    return () => window.clearInterval(id);
  }, [open]);

  const shown = Math.min(step, 3);
  const steps = [
    { icon: Download, text: fr ? 'Le fichier est téléchargé' : 'The file is downloaded' },
    { icon: ClipboardCheck, text: fr ? 'Le message est copié' : 'The message is copied' },
    { icon: FileJson, text: fr ? 'Dans Dust : colle (⌘V) et glisse le fichier' : 'In Dust: paste (⌘V) and drop the file' },
    { icon: CornerDownLeft, text: fr ? 'Entrée : l’agent crée les notes dans HubSpot' : 'Enter: the agent creates the HubSpot notes' },
  ];

  const finish = () => {
    if (hideNextTime) {
      try {
        localStorage.setItem(HUBSPOT_GUIDE_HIDDEN_KEY, '1');
      } catch {
        /* convenience only */
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          finish();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-semibold">{fr ? 'Envoyer vers HubSpot' : 'Send to HubSpot'}</DialogTitle>
          <DialogDescription>
            {fr ? `Le fichier de ${companyName} est téléchargé. Il reste trois gestes dans Dust.` : `${companyName}'s file is downloaded. Three gestures left in Dust.`}
          </DialogDescription>
        </DialogHeader>

        {/* Animated scene: downloads › Dust conversation › HubSpot Company */}
        <div aria-hidden className="grid grid-cols-[1fr_1.6fr_1fr] items-stretch gap-2 rounded-xl bg-paper p-3 ring-1 ring-border sm:gap-3 sm:p-4">
          <div className="flex flex-col rounded-lg bg-card p-2 ring-1 ring-border">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">{fr ? 'Téléchargements' : 'Downloads'}</p>
            <div className="relative mt-2 flex flex-1 items-start justify-center">
              <div
                className={cn(
                  'flex w-full items-center gap-1.5 rounded-md bg-[#FFF1EC] px-1.5 py-1 ring-1 ring-[#FF7A59]/40 transition-all duration-500 ease-out',
                  shown >= 0 ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0',
                  shown >= 2 && 'opacity-40'
                )}
              >
                <FileJson className="h-3.5 w-3.5 shrink-0 text-[#B23C15]" />
                <span className="truncate text-[10px] font-medium text-foreground">.json</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-lg bg-card p-2 ring-1 ring-border">
            <div className="flex items-center gap-1.5">
              <DustMark className="h-3.5 w-3.5" />
              <p className="text-[10px] font-semibold text-foreground">@hubspot-assessment</p>
            </div>
            <div className="mt-2 flex flex-1 flex-col justify-end gap-1.5">
              <div className={cn('space-y-1 transition-all duration-500 ease-out', shown >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0')}>
                <div className="h-1.5 w-11/12 rounded-full bg-muted-foreground/25" />
                <div className="h-1.5 w-8/12 rounded-full bg-muted-foreground/25" />
                <div className="h-1.5 w-9/12 rounded-full bg-muted-foreground/25" />
              </div>
              <div className="flex items-center gap-1.5 rounded-md bg-paper px-1.5 py-1 ring-1 ring-border">
                <div
                  className={cn(
                    'flex min-w-0 items-center gap-1 rounded bg-[#FFF1EC] px-1 py-0.5 ring-1 ring-[#FF7A59]/40 transition-all duration-500 ease-out',
                    shown >= 2 ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'
                  )}
                >
                  <FileJson className="h-3 w-3 shrink-0 text-[#B23C15]" />
                  <span className="truncate text-[9px] text-foreground">.json</span>
                </div>
                <span
                  className={cn(
                    'ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-white transition-all duration-300',
                    shown >= 3 ? 'scale-95 bg-[#D9481E]' : 'scale-100 bg-muted-foreground/40'
                  )}
                >
                  <CornerDownLeft className="h-3 w-3" />
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-lg bg-card p-2 ring-1 ring-border">
            <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">HubSpot</p>
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{domain}</p>
            <div className="mt-2 flex flex-1 flex-col gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{ transitionDelay: shown >= 3 ? `${i * 150}ms` : '0ms' }}
                  className={cn(
                    'flex items-center gap-1 rounded-md bg-[#FFF1EC] px-1.5 py-1 ring-1 ring-[#FF7A59]/40 transition-all duration-500 ease-out',
                    shown >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                  )}
                >
                  <StickyNote className="h-3 w-3 shrink-0 text-[#B23C15]" />
                  <span className="truncate text-[9px] text-foreground">{[fr ? 'Synthèse' : 'Summary', 'Verbatims', fr ? 'Annexe' : 'Appendix'][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ol className="grid gap-1.5">
          {steps.map(({ icon: Icon, text }, i) => (
            <li
              key={text}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-300',
                i === shown ? 'bg-[#FFF1EC] text-foreground dark:bg-[#FF7A59]/10' : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  i <= shown ? 'bg-[#D9481E] text-white' : 'bg-muted text-muted-foreground'
                )}
              >
                {i + 1}
              </span>
              <Icon className="h-4 w-4 shrink-0" />
              <span>{text}</span>
            </li>
          ))}
        </ol>

        <p className="text-[12px] text-muted-foreground">
          {fr ? 'Fichier : ' : 'File: '}
          <span className="font-medium text-foreground">{fileName}</span>
          {fr ? ' (dans tes téléchargements). Le message est court : tout le contenu est dans le fichier.' : ' (in your downloads). The message is short: everything is in the file.'}
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-[12px] text-muted-foreground">
            <input type="checkbox" checked={hideNextTime} onChange={(e) => setHideNextTime(e.target.checked)} className="h-3.5 w-3.5 accent-[#D9481E]" />
            {fr ? 'Ne plus afficher cette explication' : 'Don’t show this again'}
          </label>
          <Button
            className="gap-2 bg-[#D9481E] font-semibold text-white hover:bg-[#BF3D17] focus-visible:ring-[#FF7A59]"
            onClick={() => {
              finish();
              onSend();
            }}
          >
            <Send className="h-4 w-4" />
            {fr ? 'Copier le message et ouvrir Dust' : 'Copy the message and open Dust'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
