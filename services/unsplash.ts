const UNSPLASH_ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY ?? "";
const UNSPLASH_API_BASE = "https://api.unsplash.com";

import { PhotoItem, VideoItem, MediaProvider } from "@/types/media";

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    username: string;
    profile_image?: {
      small: string;
    };
  };
  description?: string;
  alt_description?: string;
  width: number;
  height: number;
  created_at: string;
  likes: number;
  tags?: Array<{
    title: string;
  }>;
}

interface UnsplashVideo {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    username: string;
  };
  description?: string;
  width: number;
  height: number;
  duration: number;
  created_at: string;
  likes: number;
  video_files?: Array<{
    quality: string;
    type: string;
    link: string;
    width: number;
    height: number;
    fps: number;
  }>;
}

interface UnsplashResponse<T> {
  results: T[];
  total: number;
  total_pages: number;
}


async function fetchFromUnsplash<T>(endpoint: string): Promise<T[]> {
  if (!UNSPLASH_ACCESS_KEY) {
    console.warn("[Unsplash] No access key configured");
    return [];
  }

  try {
    const response = await fetch(`${UNSPLASH_API_BASE}${endpoint}`, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    if (!response.ok) {
      console.error("[Unsplash] API error:", response.status, response.statusText);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.results || [];
  } catch (error) {
    console.error("[Unsplash] Fetch error:", error);
    return [];
  }
}

export async function getCuratedUnsplashPhotos(page: number = 1, perPage: number = 20): Promise<{ items: PhotoItem[] }> {
  const photos = await fetchFromUnsplash<UnsplashPhoto>(`/photos?page=${page}&per_page=${perPage}`);

  const items: PhotoItem[] = photos.map((photo) => ({
    id: `unsplash-${photo.id}`,
    type: "photo" as const,
    provider: "unsplash" as MediaProvider,
    title: photo.description || photo.alt_description || "Untitled",
    thumbnailUrl: photo.urls.small,
    fullUrl: photo.urls.regular,
    width: photo.width,
    height: photo.height,
    avgColor: undefined,
    creator: {
      name: photo.user.name,
      url: `https://unsplash.com/@${photo.user.username}`,
      avatarUrl: photo.user.profile_image?.small,
    },
    tags: photo.tags?.map((tag) => tag.title) || [],
    downloadUrl: photo.urls.raw,
    pageUrl: `https://unsplash.com/photos/${photo.id}`,
  }));

  return { items };
}

export async function searchUnsplashPhotos(query: string, page: number = 1, perPage: number = 20): Promise<{ items: PhotoItem[] }> {
  if (!query.trim()) return { items: [] };

  const photos = await fetchFromUnsplash<UnsplashPhoto>(`/search/photos?page=${page}&per_page=${perPage}&query=${encodeURIComponent(query)}&content_filter=high`);

  const items: PhotoItem[] = photos.map((photo) => ({
    id: `unsplash-${photo.id}`,
    type: "photo" as const,
    provider: "unsplash" as MediaProvider,
    title: photo.description || photo.alt_description || "Untitled",
    thumbnailUrl: photo.urls.small,
    fullUrl: photo.urls.regular,
    width: photo.width,
    height: photo.height,
    avgColor: undefined,
    creator: {
      name: photo.user.name,
      url: `https://unsplash.com/@${photo.user.username}`,
      avatarUrl: photo.user.profile_image?.small,
    },
    tags: photo.tags?.map((tag) => tag.title) || [],
    downloadUrl: photo.urls.raw,
    pageUrl: `https://unsplash.com/photos/${photo.id}`,
  }));

  return { items };
}

export async function getPopularUnsplashVideos(page: number = 1, perPage: number = 20): Promise<{ items: VideoItem[] }> {
  const videos = await fetchFromUnsplash<UnsplashVideo>(`/videos?page=${page}&per_page=${perPage}`);

  const items: VideoItem[] = videos.map((video) => ({
    id: `unsplash-${video.id}`,
    type: "video" as const,
    provider: "unsplash" as MediaProvider,
    title: video.description || "Untitled",
    thumbnailUrl: video.urls.thumb,
    videoUrl: video.urls.raw,
    videoFiles: video.video_files?.map((file) => ({
      quality: file.quality,
      url: file.link,
      width: file.width,
      height: file.height,
    })) || [],
    width: video.width,
    height: video.height,
    duration: video.duration,
    creator: {
      name: video.user.name,
      url: `https://unsplash.com/@${video.user.username}`,
      avatarUrl: undefined,
    },
    tags: [],
    pageUrl: `https://unsplash.com/videos/${video.id}`,
  }));

  return { items };
}

export async function searchUnsplashVideos(query: string, page: number = 1, perPage: number = 20): Promise<{ items: VideoItem[] }> {
  if (!query.trim()) return { items: [] };

  const videos = await fetchFromUnsplash<UnsplashVideo>(`/search/videos?page=${page}&per_page=${perPage}&query=${encodeURIComponent(query)}&content_filter=high`);

  const items: VideoItem[] = videos.map((video) => ({
    id: `unsplash-${video.id}`,
    type: "video" as const,
    provider: "unsplash" as MediaProvider,
    title: video.description || "Untitled",
    thumbnailUrl: video.urls.thumb,
    videoUrl: video.urls.raw,
    videoFiles: video.video_files?.map((file) => ({
      quality: file.quality,
      url: file.link,
      width: file.width,
      height: file.height,
    })) || [],
    width: video.width,
    height: video.height,
    duration: video.duration,
    creator: {
      name: video.user.name,
      url: `https://unsplash.com/@${video.user.username}`,
      avatarUrl: undefined,
    },
    tags: [],
    pageUrl: `https://unsplash.com/videos/${video.id}`,
  }));

  return { items };
}
