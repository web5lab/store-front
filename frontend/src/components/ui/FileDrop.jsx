import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Camera, FileText, Paperclip, X } from 'lucide-react';
import { fileUrl } from '@/lib/platform';

/**
 * Pick a file or take a photo. On phones, "Take photo" opens the rear camera
 * directly; on desktop it falls back to the file picker.
 */
export default function FileDrop({ label, value, onChange, existingUrl, existingName, onRemoveExisting, accept = 'image/*', camera = true, hint }) {
  const id = useId();
  const fileRef = useRef(null);
  const camRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const preview = useMemo(() => (value?.type?.startsWith('image/') ? URL.createObjectURL(value) : null), [value]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const shownUrl = preview || (!value && existingUrl);
  const isImage = preview || (existingUrl && /\.(png|jpe?g|webp|gif)$/i.test(existingUrl));
  const name = value?.name || existingName || (existingUrl ? existingUrl.split('/').pop() : '');

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onChange(file);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-[12.5px] font-semibold text-ink-2">
          {label}
        </label>
      )}
      {value || existingUrl ? (
        <div className="flex items-center gap-3 rounded-[12px] border border-rule bg-paper/60 p-2.5">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[9px] border border-rule bg-surface">
            {isImage && shownUrl ? <img src={preview || fileUrl(shownUrl)} alt="" className="h-full w-full object-cover" /> : <FileText className="h-5 w-5 text-quiet" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">{name}</p>
            <p className="text-[12px] text-faint">{value ? `${Math.ceil(value.size / 1024)} KB · ready to upload` : 'Saved'}</p>
          </div>
          <button
            type="button"
            aria-label="Remove file"
            onClick={() => (value ? onChange(null) : onRemoveExisting?.())}
            className="grid h-8 w-8 place-items-center rounded-lg text-quiet transition hover:bg-debit-soft hover:text-debit"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-wrap items-center gap-2 rounded-[12px] border border-dashed p-3 transition ${dragging ? 'border-stamp bg-stamp-soft' : 'border-rule-strong bg-paper/40'}`}
        >
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-[9px] border border-rule bg-surface px-3 py-1.5 text-[13px] font-semibold transition hover:border-ink/30"
          >
            <Paperclip className="h-3.5 w-3.5" /> Choose file
          </button>
          {camera && (
            <button
              type="button"
              onClick={() => camRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-rule bg-surface px-3 py-1.5 text-[13px] font-semibold transition hover:border-ink/30"
            >
              <Camera className="h-3.5 w-3.5" /> Take photo
            </button>
          )}
          <span className="text-[12px] text-faint">{hint || 'or drop it here'}</span>
        </div>
      )}
      <input id={id} ref={fileRef} type="file" accept={accept} className="sr-only" onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])} />
      {camera && <input ref={camRef} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])} />}
    </div>
  );
}
