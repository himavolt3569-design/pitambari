import { z } from "zod";

export const DEFAULT_VIDEO_POSTER = "/shine/03_Website_Visuals/super-shine-warm-product-scene.png";

export type VideoSource = { kind: "youtube" | "native"; src: string };

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be", "www.youtu.be"]);
const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/;
const UNSAFE_CHARACTERS = /[\u0000-\u0020\u007f\\]/;

function httpsUrl(value: string): URL | null {
  if (UNSAFE_CHARACTERS.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port ? url : null;
  } catch {
    return null;
  }
}

/** Keep the original signed media query, but never embed an arbitrary page. */
export function normalizeVideoSource(input: unknown): VideoSource | null {
  if (typeof input !== "string" || input.length > 2000) return null;
  const value = input.trim();
  if (UNSAFE_CHARACTERS.test(value)) return null;
  if (/^\/videos\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:mp4|webm)$/i.test(value)) {
    return { kind: "native", src: value };
  }
  const url = httpsUrl(value);
  if (!url) return null;

  if (YOUTUBE_HOSTS.has(url.hostname)) {
    let id: string | null = null;
    if (url.hostname === "youtu.be" || url.hostname === "www.youtu.be") {
      id = /^\/([a-zA-Z0-9_-]{11})\/?$/.exec(url.pathname)?.[1] ?? null;
    } else if (url.pathname === "/watch" && !url.hostname.includes("nocookie")) {
      id = url.searchParams.get("v");
    } else {
      id = /^\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})\/?$/.exec(url.pathname)?.[1] ?? null;
    }
    return id && VIDEO_ID.test(id)
      ? { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` }
      : null;
  }

  return /\.(mp4|webm)$/i.test(url.pathname) ? { kind: "native", src: url.href } : null;
}

/** Local assets and Firebase uploads are already allowed by the image CSP. */
export function normalizeVideoPoster(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 2000) return null;
  const value = input.trim();
  if (!value || UNSAFE_CHARACTERS.test(value)) return null;
  if (/^\/(?!\/)/.test(value) && !value.includes("..") && !/%(?:2e|2f|5c)/i.test(value)) return value;
  const url = httpsUrl(value);
  return url?.hostname === "firebasestorage.googleapis.com" ? url.href : null;
}

export const videoSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  sourceUrl: z.string().trim().max(2000).default(""),
  title: z.string().trim().max(120).optional(),
  description: z.string().trim().max(600).optional(),
  poster: z.string().trim().max(2000).optional(),
}).superRefine((video, ctx) => {
  if ((video.enabled || video.sourceUrl) && !normalizeVideoSource(video.sourceUrl)) {
    ctx.addIssue({ code: "custom", path: ["sourceUrl"], message: "Enter a valid YouTube link, HTTPS MP4/WebM URL, or /videos/filename.mp4 path." });
  }
  if (video.poster && !normalizeVideoPoster(video.poster)) {
    ctx.addIssue({ code: "custom", path: ["poster"], message: "Use a local image path or an HTTPS Firebase Storage image URL for the video poster." });
  }
});
