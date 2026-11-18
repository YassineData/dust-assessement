import { useRef, useState } from 'react';
import { ImageUp, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

/**
 * Upload of a partner's logo (supabase/012-partner-logos.sql): the image goes to the public bucket
 * « partner-logos », in the partner's own folder, then the partner row points to it.
 *  - mode "dust": the Dust team edits any partner; `onSaved` gets the URL and the caller saves the row.
 *  - mode "self": the signed-in partner edits its own logo through set_my_partner_logo (nothing else of its row).
 */
const BUCKET = 'partner-logos';
const MAX_BYTES = 1024 * 1024;
const TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

export const PartnerLogoUpload = ({
  partnerId,
  value,
  mode,
  fr,
  onSaved,
  className,
}: {
  partnerId: string;
  value: string | null;
  mode: 'dust' | 'self';
  fr: boolean;
  onSaved: (url: string | null) => void;
  className?: string;
}) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const persist = async (url: string | null) => {
    if (mode === 'dust') {
      onSaved(url);
      return true;
    }
    const { error } = await supabase.rpc('set_my_partner_logo' as never, { p_url: url ?? '' } as never);
    if (error) {
      toast.error(fr ? 'Enregistrement du logo impossible.' : 'Could not save the logo.');
      return false;
    }
    onSaved(url);
    return true;
  };

  const upload = async (file: File) => {
    const ext = TYPES[file.type];
    if (!ext) {
      toast.error(fr ? 'Format accepté : PNG, JPG ou WebP.' : 'Accepted formats: PNG, JPG or WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(fr ? 'Image trop lourde (1 Mo maximum).' : 'Image too large (1 MB max).');
      return;
    }
    setBusy(true);
    try {
      const path = `${partnerId}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });
      if (error) {
        toast.error(
          /bucket/i.test(error.message || '')
            ? fr ? 'Le stockage des logos n’est pas encore activé (supabase/012).' : 'Logo storage is not enabled yet (supabase/012).'
            : fr ? 'Envoi du logo impossible.' : 'Could not upload the logo.'
        );
        return;
      }
      const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      if (await persist(url))
        toast.success(mode === 'self' ? (fr ? 'Logo enregistré' : 'Logo saved') : fr ? 'Logo envoyé : enregistrez le partenaire.' : 'Logo uploaded: save the partner.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-paper ring-1 ring-border">
        {value ? <img src={value} alt="" className="h-full w-full object-contain p-1" /> : <ImageUp className="h-5 w-5 text-muted-foreground" />}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
        />
        <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
          {value ? (fr ? 'Changer le logo' : 'Change logo') : fr ? 'Ajouter un logo' : 'Add a logo'}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              if ((await persist(null)) && mode === 'self') toast.success(fr ? 'Logo retiré' : 'Logo removed');
              setBusy(false);
            }}
          >
            <Trash2 className="h-4 w-4" />
            {fr ? 'Retirer' : 'Remove'}
          </Button>
        )}
        <p className="w-full text-[11px] text-muted-foreground">{fr ? 'PNG, JPG ou WebP, 1 Mo maximum. Fond transparent conseillé.' : 'PNG, JPG or WebP, 1 MB max. Transparent background recommended.'}</p>
      </div>
    </div>
  );
};
