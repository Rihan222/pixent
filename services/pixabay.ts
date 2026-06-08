import { API_CONFIG, PAGE_SIZE } from "@/config/api";
import { PhotoItem, PaginatedResult } from "@/types/media";

function mapImage(img: PixabayImage): PhotoItem {
  return {
    id: `pixabay_photo_${img.id}`,
    type: "photo",
    provider: "pixabay",
    title: img.tags || `Photo by ${img.user}`,
    thumbnailUrl: img.webformatURL,
    fullUrl: img.largeImageURL,
    downloadUrl: img.largeImageURL,
    width: img.imageWidth,
    height: img.imageHeight,
    creator: { name: img.user, url: `https://pixabay.com/users/${img.user}-${img.user_id}/` },
    tags: img.tags.split(", "),
    pageUrl: img.pageURL,
  };
}

export async function searchPixabayImages(
  query: string,
  page = 1,
): Promise<PaginatedResult<PhotoItem>> {
  const params = new URLSearchParams({
    key: API_CONFIG.pixabay.apiKey,
    q: query,
    per_page: String(PAGE_SIZE),
    page: String(page),
    image_type: "photo",
    safesearch: "true",
  });
  const res = await fetch(`${API_CONFIG.pixabay.baseUrl}/?${params}`);
  
  if (!res.ok) {
    const text = await res.text();
    console.error(`[Pixabay] API error: ${res.status} ${res.statusText}`, text);
    throw new Error(`Pixabay API error: ${res.status} ${res.statusText}`);
  }
  
  const data: PixabayResponse = await res.json();
  return {
    items: (data.hits ?? []).map(mapImage),
    page,
    totalResults: data.totalHits ?? 0,
    hasMore: page * PAGE_SIZE < (data.totalHits ?? 0),
  };
}

export async function getTrendingPixabayImages(
  page = 1,
): Promise<PaginatedResult<PhotoItem>> {
  const params = new URLSearchParams({
    key: API_CONFIG.pixabay.apiKey,
    order: "popular",
    per_page: String(PAGE_SIZE),
    page: String(page),
    image_type: "photo",
    safesearch: "true",
  });
  const res = await fetch(`${API_CONFIG.pixabay.baseUrl}/?${params}`);
  
  if (!res.ok) {
    const text = await res.text();
    console.error(`[Pixabay] API error: ${res.status} ${res.statusText}`, text);
    throw new Error(`Pixabay API error: ${res.status} ${res.statusText}`);
  }
  
  const data: PixabayResponse = await res.json();
  return {
    items: (data.hits ?? []).map(mapImage),
    page,
    totalResults: data.totalHits ?? 0,
    hasMore: page * PAGE_SIZE < (data.totalHits ?? 0),
  };
}

interface PixabayImage {
  id: number;
  pageURL: string;
  tags: string;
  previewURL: string;
  webformatURL: string;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  views: number;
  downloads: number;
  likes: number;
  user_id: number;
  user: string;
  userImageURL: string;
}
interface PixabayResponse {
  total: number;
  totalHits: number;
  hits: PixabayImage[];
}
