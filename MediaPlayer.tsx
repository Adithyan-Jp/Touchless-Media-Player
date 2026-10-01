import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, Pause, Play, Volume1, Volume2, VolumeX, Waves } from "lucide-react";
import { loadYouTubeApi } from "../lib/youtube";
import { cn } from "../utils/cn";

export interface MediaItem {
  id: string;
  kind: "file" | "url" | "youtube";
  /** object URL, remote URL or YouTube video id */
  src: string;
  title: string;
  subtitle: string;
}

export interface PlayerHandle {
  play(): void;
  pause(): void;
  toggle(): void;
  volumeBy(delta: number): void;
  toggleMute(): void;
  seekBy(seconds: number): void;
}

export interface PlayerState {
  playing: boolean;
  volume: number;
  muted: boolean;
}

export interface PlayerToast {
  id: number;
  label: string;
  icon: ReactNode;
  detail?: string;
}

interface Props {
  media: MediaItem | null;
  toast: PlayerToast | null;
  autoPlay?: boolean;
  onState?: (s: PlayerState) => void;
}

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export const MediaPlayer = forwardRef<PlayerHandle, Props>(function MediaPlayer({ media, toast, autoPlay = true, onState }, ref) {
  const autoPlayRef = useRef(autoPlay);
  autoPlayRef.current = autoPlay;
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytHost = useRef<HTMLDivElement>(null);
  const yt = useRef<any>(null);
  const mediaRef = useRef<MediaItem | null>(media);
  mediaRef.current = media;

  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const applyAudio = useCallback(() => {
    if (mediaRef.current?.kind === "youtube") {
      const p = yt.current;
      if (p?.setVolume) {
        p.setVolume(Math.round(volume * 100));
        if (muted) p.mute();
        else p.unMute();
      }
    } else if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }, [volume, muted]);
  const applyAudioRef = useRef(applyAudio);
  applyAudioRef.current = applyAudio;

  useEffect(() => {
    applyAudio();
  }, [applyAudio, media?.id]);

  useEffect(() => {
    onState?.({ playing, volume, muted });
  }, [playing, volume, muted, onState]);

  // YouTube lifecycle
  useEffect(() => {
    setPlaying(false);
    setTime(0);
    setDuration(0);
    setError(null);
    if (!media || media.kind !== "youtube") return;

    let cancelled = false;
    let timer: number | undefined;
    const host = ytHost.current!;
    host.innerHTML = "";
    const el = document.createElement("div");
    host.appendChild(el);

    loadYouTubeApi().then(() => {
      if (cancelled) return;
      yt.current = new (window as any).YT.Player(el, {
        videoId: media.src,
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          disablekb: 1,
          iv_load_policy: 3,
          autoplay: autoPlayRef.current ? 1 : 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            applyAudioRef.current();
            const d = yt.current?.getDuration?.();
            if (d) setDuration(d);
          },
          onStateChange: (e: any) => {
            setPlaying(e.data === 1);
            if (e.data === 1) {
              const d = yt.current?.getDuration?.();
              if (d) setDuration(d);
            }
          },
          onError: () => setError("This video can't be embedded. Try another link."),
        },
      });
      timer = window.setInterval(() => {
        const p = yt.current;
        if (p?.getCurrentTime) {
          setTime(p.getCurrentTime());
          const d = p.getDuration?.();
          if (d) setDuration(d);
        }
      }, 250);
    });

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      try {
        yt.current?.destroy();
      } catch {
        /* ignore */
      }
      yt.current = null;
      host.innerHTML = "";
    };
  }, [media?.id, media?.kind, media?.src]);

  const isYt = () => mediaRef.current?.kind === "youtube";

  const api: PlayerHandle = {
    play() {
      if (isYt()) yt.current?.playVideo?.();
      else videoRef.current?.play().catch(() => {});
    },
    pause() {
      if (isYt()) yt.current?.pauseVideo?.();
      else videoRef.current?.pause();
    },
    toggle() {
      if (isYt()) {
        const s = yt.current?.getPlayerState?.();
        if (s === 1) yt.current.pauseVideo();
        else yt.current?.playVideo?.();
      } else {
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) v.play().catch(() => {});
        else v.pause();
      }
    },
    volumeBy(delta) {
      setMuted(false);
      setVolume((v) => Math.min(1, Math.max(0, Math.round((v + delta) * 100) / 100)));
    },
    toggleMute() {
      setMuted((m) => !m);
    },
    seekBy(sec) {
      if (isYt()) {
        const p = yt.current;
        if (p?.getCurrentTime) p.seekTo(Math.max(0, p.getCurrentTime() + sec), true);
      } else if (videoRef.current) {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + sec);
      }
    },
  };
  const apiRef = useRef(api);
  apiRef.current = api;
  useImperativeHandle(ref, () => ({
    play: () => apiRef.current.play(),
    pause: () => apiRef.current.pause(),
    toggle: () => apiRef.current.toggle(),
    volumeBy: (d) => apiRef.current.volumeBy(d),
    toggleMute: () => apiRef.current.toggleMute(),
    seekBy: (s) => apiRef.current.seekBy(s),
  }));

  const seekTo = (ratio: number) => {
    if (!duration) return;
    const t = ratio * duration;
    if (isYt()) yt.current?.seekTo?.(t, true);
    else if (videoRef.current) videoRef.current.currentTime = t;
    setTime(t);
  };

  const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const progress = duration ? (time / duration) * 100 : 0;
  const isVideoEl = media && media.kind !== "youtube";

  return (
    <div className="group relative aspect-video w-full overflow-hidden rounded-3xl border border-white/[0.07] bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
      {isVideoEl && (
        <video
          key={media.id}
          ref={videoRef}
          src={media.src}
          className="absolute inset-0 h-full w-full bg-black object-contain"
          autoPlay={autoPlay}
          preload="auto"
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onLoadedMetadata={(e) => {
            setDuration(e.currentTarget.duration);
            applyAudio();
          }}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onError={() => setError("Couldn't load this media file.")}
        />
      )}
      <div
        ref={ytHost}
        className={cn(
          "pointer-events-none absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full",
          media?.kind !== "youtube" && "hidden",
        )}
      />

      {/* click surface */}
      {media && !error && <button aria-label="Toggle playback" onClick={() => api.toggle()} className="absolute inset-0 cursor-pointer" />}

      {/* empty */}
      {!media && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.03]">
              <Waves className="h-6 w-6 text-lime-300" />
            </div>
            <p className="text-sm font-medium text-white/80">Nothing playing</p>
            <p className="mt-1 text-xs text-white/40">Pick a sample, add a local file or paste a YouTube link</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center">
          <div>
            <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-amber-300" />
            <p className="text-sm text-white/80">{error}</p>
          </div>
        </div>
      )}

      {/* gesture toast */}
      {toast && (
        <div key={toast.id} className="toast-pop pointer-events-none absolute left-1/2 top-6 -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/60 py-2 pl-3 pr-5 backdrop-blur-xl">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-lime-300 text-black">{toast.icon}</span>
            <span className="text-sm font-medium text-white">{toast.label}</span>
            {toast.detail && <span className="font-mono text-xs text-white/50">{toast.detail}</span>}
          </div>
        </div>
      )}

      {/* controls */}
      {media && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-5 pb-4 pt-12">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{media.title}</p>
              <p className="truncate text-xs text-white/45">{media.subtitle}</p>
            </div>
          </div>
          <div
            className="group/bar relative mb-3 h-1.5 cursor-pointer rounded-full bg-white/15"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              seekTo((e.clientX - r.left) / r.width);
            }}
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-lime-300" style={{ width: `${progress}%` }} />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition group-hover/bar:opacity-100"
              style={{ left: `${progress}%` }}
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => api.toggle()}
              className="grid h-10 w-10 place-items-center rounded-full bg-white text-black transition hover:scale-105"
            >
              {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
            </button>
            <span className="font-mono text-xs tabular-nums text-white/60">
              {fmt(time)} <span className="text-white/25">/</span> {fmt(duration)}
            </span>
            <div className="ml-auto flex items-center gap-3">
              <button onClick={() => api.toggleMute()} className="text-white/70 transition hover:text-white">
                <VolIcon className="h-5 w-5" />
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : Math.round(volume * 100)}
                onChange={(e) => {
                  setMuted(false);
                  setVolume(Number(e.target.value) / 100);
                }}
                className="range w-28"
                style={{ ["--p" as any]: `${muted ? 0 : volume * 100}%` }}
              />
              <span className="w-9 text-right font-mono text-xs tabular-nums text-white/60">
                {muted ? "mute" : `${Math.round(volume * 100)}%`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
