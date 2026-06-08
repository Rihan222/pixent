export type MediaProvider = "pexels" | "pixabay" | "freesound" | "unsplash";
export type MediaType = "photo" | "video" | "sound";

export interface MediaCreator {
  name: string;
  url?: string;
  avatarUrl?: string;
}

export interface PhotoItem {
  id: string;
  type: "photo";
  provider: MediaProvider;
  title: string;
  thumbnailUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  avgColor?: string;
  creator: MediaCreator;
  tags?: string[];
  downloadUrl: string;
  pageUrl: string;
}

export interface VideoFile {
  quality: string;
  url: string;
  width?: number;
  height?: number;
}

export interface VideoItem {
  id: string;
  type: "video";
  provider: MediaProvider;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
  videoFiles: VideoFile[];
  width: number;
  height: number;
  duration: number;
  creator: MediaCreator;
  tags?: string[];
  pageUrl: string;
}

export interface SoundItem {
  id: string;
  type: "sound";
  provider: "freesound";
  title: string;
  thumbnailUrl: string;
  previewUrl: string;
  previewUrlLq?: string;
  duration: number;
  creator: MediaCreator;
  tags?: string[];
  description?: string;
  license?: string;
  pageUrl: string;
}

export type MediaItem = PhotoItem | VideoItem | SoundItem;

export interface FavoriteItem {
  id: string;
  type: MediaType;
  savedAt: number;
  data: MediaItem;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  totalResults: number;
  hasMore: boolean;
}
