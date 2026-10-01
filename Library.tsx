import { useRef, useState } from "react";
import { HardDrive, Link2, PlayCircle, Plus, Upload, X } from "lucide-react";
import type { MediaItem } from "./MediaPlayer";
import { cn } from "../utils/cn";

interface Props {
  items: MediaItem[];
  activeId: string | null;
  playing: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  onAddLink: (value: string) => string | null; // returns an error message if invalid
}

const kindIcon = {
  file: HardDrive,
  url: Link2,
  youtube: PlayCircle,
} as const;

export function Library({ items, activeId, playing, onSelect, onRemove, onAddFiles, onAddLink }: Props) {
  const [value, setValue] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    const msg = onAddLink(value);
    setErr(msg);
    if (!msg) setValue("");
  };

  return (
    <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-white">Library</h2>
        <span className="font-mono text-xs text-white/35">{items.length} items</span>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <form onSubmit={submit} className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setErr(null);
              }}
              placeholder="Paste a YouTube link or a direct .mp4 URL"
              className="w-full rounded-xl border border-white/10 bg-black/30 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/30 focus:border-lime-300/50 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm font-medium text-white/90 transition hover:bg-white/10"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </form>

        <button
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("video/") || f.type.startsWith("audio/"));
            if (files.length) onAddFiles(files);
          }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border border-dashed px-5 py-2.5 text-sm transition",
            drag ? "border-lime-300 bg-lime-300/10 text-lime-200" : "border-white/15 text-white/60 hover:border-white/30 hover:text-white",
          )}
        >
          <Upload className="h-4 w-4" /> Local files
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="video/*,audio/*"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) onAddFiles(files);
            e.target.value = "";
          }}
        />
      </div>
      {err && <p className="mt-2 text-xs text-amber-300">{err}</p>}

      <ul className="mt-4 divide-y divide-white/[0.05]">
        {items.map((it) => {
          const Icon = kindIcon[it.kind];
          const active = it.id === activeId;
          return (
            <li key={it.id}>
              <div
                onClick={() => onSelect(it.id)}
                className={cn(
                  "group flex cursor-pointer items-center gap-4 rounded-xl px-3 py-3 transition",
                  active ? "bg-white/[0.05]" : "hover:bg-white/[0.03]",
                )}
              >
                <span
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl border",
                    active ? "border-lime-300/40 bg-lime-300/10 text-lime-300" : "border-white/10 bg-white/[0.03] text-white/50",
                  )}
                >
                  {active && playing ? (
                    <span className="flex h-4 items-end gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="eq-bar w-0.5 rounded-full bg-lime-300" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </span>
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm", active ? "font-medium text-white" : "text-white/80")}>{it.title}</p>
                  <p className="truncate text-xs text-white/35">{it.subtitle}</p>
                </div>
                {it.id.startsWith("sample-") ? null : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(it.id);
                    }}
                    className="rounded-lg p-1.5 text-white/30 opacity-0 transition hover:bg-white/10 hover:text-white group-hover:opacity-100"
                    aria-label="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
