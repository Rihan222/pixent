import { API_CONFIG, PAGE_SIZE } from "@/config/api";
import { PhotoItem, VideoItem, VideoFile, PaginatedResult } from "@/types/media";
import { logger } from "@/utils/logger";

const headers = () => ({
  Authorization: API_CONFIG.pexels.apiKey,
});

function mapPhoto(p: PexelsPhoto): PhotoItem {
  return {
    id: `pexels_photo_${p.id}`,
    type: "photo",
    provider: "pexels",
    title: p.alt || `Photo by ${p.photographer}`,
    thumbnailUrl: p.src.medium,
    fullUrl: p.src.large2x,
    downloadUrl: p.src.original,
    width: p.width,
    height: p.height,
    avgColor: p.avg_color,
    creator: { name: p.photographer, url: p.photographer_url },
    pageUrl: p.url,
  };
}

function mapVideo(v: PexelsVideo): VideoItem {
  // Sort all available files: prefer hd/uhd, then sd, ordered by width desc
  const qualityRank: Record<string, number> = { uhd: 0, hd: 1, sd: 2 };
  const sortedFiles = [...v.video_files]
    .filter((f) => f.link && f.file_type === "video/mp4")
    .sort((a, b) => {
      const ra = qualityRank[a.quality] ?? 3;
      const rb = qualityRank[b.quality] ?? 3;
      if (ra !== rb) return ra - rb;
      return (b.width ?? 0) - (a.width ?? 0);
    });

  // Fallback: any mp4 link
  const allFiles = sortedFiles.length > 0 ? sortedFiles : v.video_files.filter((f) => f.link);

  const getQualityLabel = (f: any) => {
    if (f.quality) return f.quality;
    // Guess based on width
    if (f.width >= 2160) return "4K";
    if (f.width >= 1440) return "2K";
    if (f.width >= 1080) return "HD";
    if (f.width >= 720) return "SD";
    return "LQ";
  };

  const videoFiles: VideoFile[] = allFiles.map((f) => ({
    quality: getQualityLabel(f),
    url: f.link,
    width: f.width,
    height: f.height,
  }));

  logger.debug("Pexels", `mapVideo id=${v.id} files=${videoFiles.length}`, videoFiles.map((f) => f.quality));

  return {
    id: `pexels_video_${v.id}`,
    type: "video",
    provider: "pexels",
    title: `Video by ${v.user.name}`,
    thumbnailUrl: v.image,
    videoUrl: videoFiles[0]?.url ?? "",
    videoFiles,
    width: v.width,
    height: v.height,
    duration: v.duration,
    creator: { name: v.user.name, url: v.user.url },
    pageUrl: v.url,
  };
}

async function pexelsFetch<T>(url: string): Promise<T> {
  logger.info("Pexels", `GET ${url}`);
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    logger.error("Pexels", `HTTP ${res.status}`, text);
    throw new Error(`Pexels API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function searchPexelsPhotos(
  query: string,
  page = 1,
): Promise<PaginatedResult<PhotoItem>> {
  const url = `${API_CONFIG.pexels.baseUrl}/v1/search?query=${encodeURIComponent(query)}&per_page=${PAGE_SIZE}&page=${page}`;
  const data = await pexelsFetch<PexelsPhotoResponse>(url);
  return {
    items: (data.photos ?? []).map(mapPhoto),
    page,
    totalResults: data.total_results ?? 0,
    hasMore: !!data.next_page,
  };
}

export async function getCuratedPhotos(
  page = 1,
): Promise<PaginatedResult<PhotoItem>> {
  const url = `${API_CONFIG.pexels.baseUrl}/v1/curated?per_page=${PAGE_SIZE}&page=${page}`;
  const data = await pexelsFetch<PexelsPhotoResponse>(url);
  return {
    items: (data.photos ?? []).map(mapPhoto),
    page,
    totalResults: data.total_results ?? 0,
    hasMore: !!data.next_page,
  };
}

export async function searchPexelsVideos(
  query: string,
  page = 1,
): Promise<PaginatedResult<VideoItem>> {
  const url = `${API_CONFIG.pexels.baseUrl}/videos/search?query=${encodeURIComponent(query)}&per_page=${PAGE_SIZE}&page=${page}`;
  const data = await pexelsFetch<PexelsVideoResponse>(url);
  logger.info("Pexels", `searchVideos "${query}" p=${page} → ${data.videos?.length ?? 0} results`);
  return {
    items: (data.videos ?? []).map(mapVideo),
    page,
    totalResults: data.total_results ?? 0,
    hasMore: !!data.next_page,
  };
}

export async function getPopularVideos(
  page = 1,
): Promise<PaginatedResult<VideoItem>> {
  const url = `${API_CONFIG.pexels.baseUrl}/videos/popular?per_page=${PAGE_SIZE}&page=${page}`;
  const data = await pexelsFetch<PexelsVideoResponse>(url);
  logger.info("Pexels", `popularVideos p=${page} → ${data.videos?.length ?? 0} results`);
  return {
    items: (data.videos ?? []).map(mapVideo),
    page,
    totalResults: data.total_results ?? 0,
    hasMore: !!data.next_page,
  };
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface PexelsPhoto {
  id: number; width: number; height: number; url: string;
  photographer: string; photographer_url: string; photographer_id: number;
  avg_color: string;
  src: { original: string; large2x: string; large: string; medium: string; small: string; portrait: string; landscape: string; tiny: string };
  liked: boolean; alt: string;
}
interface PexelsPhotoResponse {
  total_results: number; page: number; per_page: number;
  photos: PexelsPhoto[]; next_page?: string;
}
interface PexelsVideoFile {
  id: number; quality: string; file_type: string;
  width?: number; height?: number; fps?: number; link: string;
}
interface PexelsVideo {
  id: number; width: number; height: number; url: string;
  image: string; duration: number;
  user: { id: number; name: string; url: string };
  video_files: PexelsVideoFile[];
  video_pictures: { id: number; picture: string; nr: number }[];
}
interface PexelsVideoResponse {
  total_results: number; page: number; per_page: number;
  videos: PexelsVideo[]; next_page?: string;
}
