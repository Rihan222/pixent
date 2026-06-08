import { API_CONFIG, PAGE_SIZE } from "@/config/api";
import { SoundItem, PaginatedResult } from "@/types/media";
import { logger } from "@/utils/logger";

function mapSound(s: FreesoundSound): SoundItem {
  const previewHq = s.previews?.["preview-hq-mp3"] ?? "";
  const previewLq = s.previews?.["preview-lq-mp3"] ?? "";
  return {
    id: `freesound_${s.id}`,
    type: "sound",
    provider: "freesound",
    title: s.name,
    thumbnailUrl: s.images?.waveform_m ?? s.images?.spectral_m ?? "",
    previewUrl: previewHq || previewLq,
    previewUrlLq: previewLq,
    duration: Math.round(s.duration ?? 0),
    creator: {
      name: s.username,
      url: `https://freesound.org/people/${s.username}/`,
    },
    tags: Array.isArray(s.tags) ? s.tags : [],
    description: s.description ?? "",
    license: s.license ?? "",
    pageUrl: s.url ?? `https://freesound.org/s/${s.id}/`,
  };
}

function buildUrl(path: string, params: Record<string, string>): string {
  const p = new URLSearchParams({
    ...params,
    token: API_CONFIG.freesound.apiKey,
    fields: "id,name,tags,description,url,duration,username,previews,images,license",
    page_size: String(PAGE_SIZE),
  });
  return `${API_CONFIG.freesound.baseUrl}${path}?${p.toString()}`;
}

async function freesoundFetch(url: string): Promise<FreesoundResponse> {
  logger.info("Freesound", `GET ${url.replace(/token=[^&]+/, "token=***")}`);
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error("Freesound", `HTTP ${res.status}`, text.slice(0, 200));
    throw new Error(`Freesound API error: ${res.status} — ${text.slice(0, 100)}`);
  }
  const json: FreesoundResponse = await res.json();
  logger.info("Freesound", `→ count=${json.count} results=${json.results?.length ?? 0}`);
  return json;
}

export async function searchFreesound(
  query: string,
  page = 1,
): Promise<PaginatedResult<SoundItem>> {
  const url = buildUrl("/search/text/", { query, page: String(page) });
  const data = await freesoundFetch(url);
  return {
    items: (data.results ?? []).map(mapSound),
    page,
    totalResults: data.count ?? 0,
    hasMore: !!data.next,
  };
}

export async function getTrendingSounds(
  page = 1,
): Promise<PaginatedResult<SoundItem>> {
  // Use broad, reliable query with popular sort
  const url = buildUrl("/search/text/", {
    query: "music",
    sort: "downloads_desc",
    page: String(page),
    filter: "duration:[1 TO 300]",
  });
  const data = await freesoundFetch(url);
  return {
    items: (data.results ?? []).map(mapSound),
    page,
    totalResults: data.count ?? 0,
    hasMore: !!data.next,
  };
}

export async function getSoundsByCategory(
  category: string,
  page = 1,
): Promise<PaginatedResult<SoundItem>> {
  const categoryQueryMap: Record<string, string> = {
    Music: "music melody",
    Ambient: "ambient atmosphere",
    Nature: "nature birds water forest",
    Urban: "city street urban",
    Effects: "effect sound design",
    Instruments: "guitar piano violin instrument",
    Voice: "voice speech vocal",
  };
  const query = categoryQueryMap[category] ?? category.toLowerCase();
  const url = buildUrl("/search/text/", {
    query,
    sort: "downloads_desc",
    page: String(page),
  });
  const data = await freesoundFetch(url);
  return {
    items: (data.results ?? []).map(mapSound),
    page,
    totalResults: data.count ?? 0,
    hasMore: !!data.next,
  };
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface FreesoundSound {
  id: number;
  name: string;
  tags: string[];
  description: string;
  url: string;
  duration: number;
  username: string;
  license: string;
  previews: {
    "preview-hq-mp3"?: string;
    "preview-lq-mp3"?: string;
    "preview-hq-ogg"?: string;
    "preview-lq-ogg"?: string;
  };
  images: {
    spectral_m: string;
    spectral_l: string;
    waveform_m: string;
    waveform_l: string;
  };
}
interface FreesoundResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FreesoundSound[];
}
