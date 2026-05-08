import { buildApiUrl } from "../api/url";

const SOUND_REGEX = /\[sound:([^\]]+)\]/g;

const buildMediaUrl = (filename: string): string =>
  buildApiUrl(`/anki/media/${encodeURIComponent(filename)}`);

const isAbsoluteSrc = (src: string): boolean =>
  /^[a-z][a-z0-9+.-]*:/i.test(src) || src.startsWith("//") || src.startsWith("/");

const replaceSoundMarkers = (html: string): string =>
  html.replace(SOUND_REGEX, (_match, raw: string) => {
    const filename = raw.trim();
    if (!filename) return "";
    const url = buildMediaUrl(filename);
    return `<audio controls preload="none" src="${url}"></audio>`;
  });

const rewriteImageSources = (html: string): string => {
  if (typeof DOMParser === "undefined") return html;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;

  wrapper.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (!src) return;
    const trimmed = src.trim();
    if (!trimmed || isAbsoluteSrc(trimmed) || trimmed.startsWith("data:")) return;
    img.setAttribute("src", buildMediaUrl(trimmed));
  });

  return wrapper.innerHTML;
};

export function rewriteAnkiMedia(html: string): string {
  if (!html) return html;
  return rewriteImageSources(replaceSoundMarkers(html));
}
