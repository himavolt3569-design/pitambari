import { describe, expect, it } from "vitest";
import { normalizeVideoSource, normalizeVideoPoster, videoSettingsSchema } from "./video";

describe("video sources", () => {
  it.each([
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share",
    "https://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?si=shared",
    "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  ])("normalizes %s to a privacy-enhanced embed", (input) => {
    expect(normalizeVideoSource(input)).toEqual({
      kind: "youtube", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    });
  });

  it.each(["https://cdn.example.com/demo.mp4?token=abc", "https://cdn.example.com/demo.webm", "/videos/product/demo.mp4"])("accepts direct video %s", (src) => {
    expect(normalizeVideoSource(src)).toEqual({ kind: "native", src });
  });

  it.each([
    "", "javascript:alert(1)", "data:video/mp4;base64,abc", "http://example.com/demo.mp4",
    "//example.com/demo.mp4", "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
    "https://evilyoutube.com/watch?v=dQw4w9WgXcQ", "https://youtube.com@evil.test/watch?v=dQw4w9WgXcQ",
    "https://user:pass@cdn.example.com/demo.mp4", "https://www.youtube.com:444/watch?v=dQw4w9WgXcQ",
    "https://youtube.com/watch?v=bad", "https://youtu.be/dQw4w9WgXcQ/extra",
    "https://youtube.com/playlist?list=abc", "https://example.com/player.html",
    "/videos/../private/demo.mp4", "/videos/%2e%2e/demo.mp4", "/uploads/demo.mp4",
    "https://you\ntube.com/watch?v=dQw4w9WgXcQ", "/videos/\\evil.test/demo.mp4",
  ])("rejects unsafe or unsupported source %s", (input) => {
    expect(normalizeVideoSource(input)).toBeNull();
  });
});

describe("video settings", () => {
  it("allows empty disabled settings and optional copy", () => {
    expect(videoSettingsSchema.safeParse({ enabled: false, sourceUrl: "" }).success).toBe(true);
    expect(videoSettingsSchema.safeParse({ enabled: true, sourceUrl: "/videos/demo.mp4" }).success).toBe(true);
  });
  it("requires a valid source when enabled and rejects invalid saved sources even when disabled", () => {
    expect(videoSettingsSchema.safeParse({ enabled: true, sourceUrl: "" }).success).toBe(false);
    expect(videoSettingsSchema.safeParse({ enabled: false, sourceUrl: "javascript:alert(1)" }).success).toBe(false);
  });
  it("limits copy and validates poster paths", () => {
    expect(videoSettingsSchema.safeParse({ enabled: false, sourceUrl: "", title: "a".repeat(121) }).success).toBe(false);
    expect(videoSettingsSchema.safeParse({ enabled: false, sourceUrl: "", poster: "//evil.test/image.png" }).success).toBe(false);
    expect(normalizeVideoPoster("/shine/scene.png")).toBe("/shine/scene.png");
    expect(normalizeVideoPoster("https://firebasestorage.googleapis.com/v0/b/media/o/poster.png?alt=media")).not.toBeNull();
    expect(normalizeVideoPoster("javascript:alert(1)")).toBeNull();
    expect(normalizeVideoPoster("https://arbitrary.example.com/poster.png")).toBeNull();
  });
});
