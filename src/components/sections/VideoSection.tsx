"use client";

import { useState } from "react";
import { DEFAULT_VIDEO_POSTER, normalizeVideoPoster, normalizeVideoSource, type VideoSource } from "@/lib/content/video";
import { useLanguage } from "@/lib/store/language";
import type { VideoSettings } from "@/types";

const COPY = {
  en: { eyebrow: "See the shine", title: "A little care. A beautiful shine.", play: "Play product video", loading: "Loading video…", error: "This video could not load. Please try again.", retry: "Try again", fallback: "Your browser does not support this video." },
  ne: { eyebrow: "चमक हेर्नुहोस्", title: "थोरै हेरचाह। सुन्दर चमक।", play: "उत्पादनको भिडियो हेर्नुहोस्", loading: "भिडियो लोड हुँदैछ…", error: "भिडियो लोड हुन सकेन। फेरि प्रयास गर्नुहोस्।", retry: "फेरि प्रयास गर्नुहोस्", fallback: "तपाईंको ब्राउजरले यो भिडियो चलाउन सक्दैन।" },
};

export function VideoSection({ video }: { video?: VideoSettings }) {
  const { lang } = useLanguage();
  const source = normalizeVideoSource(video?.sourceUrl);
  if (!video?.enabled || !source) return null;
  const copy = COPY[lang];
  const title = video.title || copy.title;
  const poster = normalizeVideoPoster(video.poster) || DEFAULT_VIDEO_POSTER;

  return (
    <section id="video" className="shine-video px-5 py-20 sm:px-8 lg:py-28" aria-labelledby="shine-video-title">
      <div className="mx-auto max-w-6xl">
        <div className="shine-video-heading mb-9 max-w-2xl">
          <h2 id="shine-video-title" className="font-display text-4xl leading-tight sm:text-5xl">{title}</h2>
          {video.description && <p className="mt-5 text-base leading-relaxed text-muted">{video.description}</p>}
        </div>
        <VideoPlayer key={source.src} source={source} poster={poster} title={title} copy={copy} />
      </div>
    </section>
  );
}

function VideoPlayer({ source, poster, title, copy }: {
  source: VideoSource;
  poster: string;
  title: string;
  copy: typeof COPY.en;
}) {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const start = () => { setFailed(false); setLoading(true); setStarted(true); };

  return (
    <div className="shine-video-frame relative aspect-video overflow-hidden rounded-[1.5rem] bg-[#241b19] shadow-xl">
      {!started ? (
        <button type="button" onClick={start} aria-label={copy.play} className="group relative flex h-full w-full items-center justify-center focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-[#b48a36]">
          {/* Raw local/Firebase image preserves compatibility with admin uploads. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]" onError={(event) => { if (event.currentTarget.getAttribute("src") !== DEFAULT_VIDEO_POSTER) event.currentTarget.src = DEFAULT_VIDEO_POSTER; }} />
          <span className="absolute inset-0 bg-black/20" />
          <span className="relative flex flex-col items-center gap-4 text-white">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[#b48a36] bg-[#9b201f] shadow-lg sm:h-24 sm:w-24">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="ml-1 h-7 w-7 fill-current"><path d="M8 4v16l13-8z" /></svg>
            </span>
            <span className="text-sm font-semibold tracking-wide">{copy.play}</span>
          </span>
        </button>
      ) : failed ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-5 text-center text-white" role="alert">
          <p>{copy.error}</p>
          <button type="button" className="rounded-full border border-white/60 px-5 py-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white" onClick={() => { setAttempt((value) => value + 1); start(); }}>{copy.retry}</button>
        </div>
      ) : (
        <>
          {source.kind === "youtube" ? (
            <iframe src={`${source.src}?autoplay=1&rel=0`} title={title} className="absolute inset-0 h-full w-full border-0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onLoad={() => setLoading(false)} onError={() => { setLoading(false); setFailed(true); }} />
          ) : (
            <video key={attempt} src={source.src} poster={poster} controls playsInline autoPlay preload="metadata" aria-label={title} className="h-full w-full object-contain" onCanPlay={() => setLoading(false)} onPlaying={() => setLoading(false)} onWaiting={() => setLoading(true)} onError={() => { setLoading(false); setFailed(true); }}>
              {copy.fallback}
            </video>
          )}
          {loading && <p role="status" className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/75 px-4 py-2 text-sm text-white">{copy.loading}</p>}
        </>
      )}
    </div>
  );
}
