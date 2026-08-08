import { cachedFetch } from "../utils/apiCache";

const BASE_URL = "/api/anikoto";

export interface Anime {
  id: number;
  title: string;
  poster: string;
  description: string;
  score: string;
  episodes: string;
  status: string;
  year: number;
  terms_by_type: {
    genre?: string[];
    type?: string[];
    studios?: string[];
  };
}

export interface Episode {
  id: number;
  title: string;
  number: number;
  episode_embed_id: string;
  embed_url: {
    sub?: string;
    dub?: string;
  };
}

export interface SeriesResponse {
  anime: Anime;
  episodes: Episode[];
}

export async function fetchRecentAnime(page = 1, perPage = 20): Promise<{ data: Anime[], totalPages: number }> {
  const key = `anikoto_recent_${page}_${perPage}`;
  return cachedFetch(key, async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const res = await fetch(`${BASE_URL}/recent-anime?page=${page}&per_page=${perPage}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return { data: [], totalPages: 1 };
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) return { data: [], totalPages: 1 };
      const json = await res.json();
      return { data: json.data || [], totalPages: json.pagination?.total_pages || 1 };
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Failed to fetch recent anime:", error);
      return { data: [], totalPages: 1 };
    }
  }, 15 * 60 * 1000); // 15 min cache
}

export async function fetchSeriesDetails(id: string): Promise<SeriesResponse | null> {
  const key = `anikoto_series_${id}`;
  return cachedFetch(key, async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const res = await fetch(`${BASE_URL}/series/${id}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) return null;
      const json = await res.json();
      return json.data || null;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`Failed to fetch series ${id}:`, error);
      return null;
    }
  }, 60 * 60 * 1000); // 1 hour cache
}
