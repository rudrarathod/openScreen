import { AnimeProp } from "../components/ui/AnimeCard";
import { cachedFetch } from "../utils/apiCache";

const TMDB_API_KEY = "4e44d9029b1270a757cddc766a1bcb63";
const TMDB_BASE_URL = "/api/tmdb";
const TMDB_DIRECT_URL = "https://api.themoviedb.org/3";

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMovie {
  id: number;
  title: string;
  original_title?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  vote_average: number;
  vote_count?: number;
  genre_ids?: number[];
  genres?: TmdbGenre[];
  adult?: boolean;
}

export interface TmdbMovieDetails extends TmdbMovie {
  tagline?: string;
  runtime?: number;
  budget?: number;
  revenue?: number;
  status?: string;
  genres: TmdbGenre[];
  production_companies?: { id: number; name: string; logo_path: string | null }[];
}

export interface TmdbTvShow {
  id: number;
  name: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date?: string;
  vote_average: number;
  vote_count?: number;
  genre_ids?: number[];
  genres?: TmdbGenre[];
}

export interface TmdbTvDetails extends TmdbTvShow {
  tagline?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  status?: string;
  genres: TmdbGenre[];
  seasons?: {
    id: number;
    name: string;
    overview: string;
    poster_path: string | null;
    season_number: number;
    episode_count: number;
    air_date?: string;
  }[];
  created_by?: { id: number; name: string; profile_path: string | null }[];
}

export interface TmdbCredit {
  id: number;
  name: string;
  character?: string;
  job?: string;
  profile_path: string | null;
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface TmdbEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date?: string;
  still_path: string | null;
  vote_average?: number;
  runtime?: number;
}

export interface TmdbSeasonDetails {
  id: number;
  _id?: string;
  name: string;
  overview: string;
  season_number: number;
  poster_path: string | null;
  episodes: TmdbEpisode[];
}

// Image helper
export function getTmdbImageUrl(
  path: string | null | undefined,
  size: "w300" | "w500" | "w780" | "w1280" | "original" = "w500"
): string {
  if (!path) {
    return "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&h=1200&fit=crop";
  }
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

// Genre maps for fallback naming when genre_ids are given
export const MOVIE_GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

export const TV_GENRE_MAP: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

// Generic fetcher with direct TMDB access, timeout & caching for maximum speed
async function fetchTmdb<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  const queryParams = new URLSearchParams({
    api_key: TMDB_API_KEY,
    include_adult: "true",
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });

  const cacheKey = `tmdb_v3_${endpoint}_${queryParams.toString()}`;

  return cachedFetch(
    cacheKey,
    async () => {
      // 1. Primary: Direct TMDB API with 5s timeout
      const directUrl = `${TMDB_DIRECT_URL}${endpoint}?${queryParams.toString()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const res = await fetch(directUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return (await res.json()) as T;
          }
        }
      } catch (e) {
        clearTimeout(timeoutId);
      }

      // 2. Fallback: Proxy with 3s timeout
      const proxyUrl = `${TMDB_BASE_URL}${endpoint}?${queryParams.toString()}`;
      const proxyController = new AbortController();
      const proxyTimeout = setTimeout(() => proxyController.abort(), 3000);

      try {
        const resProxy = await fetch(proxyUrl, { signal: proxyController.signal });
        clearTimeout(proxyTimeout);
        if (resProxy.ok) {
          const contentType = resProxy.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return (await resProxy.json()) as T;
          }
        }
      } catch (e) {
        clearTimeout(proxyTimeout);
      }

      throw new Error(`TMDB API request failed for ${endpoint}`);
    },
    60 * 60 * 1000 // 1 hour TTL
  );
}

// Convert TmdbMovie to AnimeProp
export function mapTmdbMovieToProp(movie: TmdbMovie): AnimeProp {
  const genres = movie.genres
    ? movie.genres.map((g) => g.name)
    : movie.genre_ids
    ? movie.genre_ids.map((id) => MOVIE_GENRE_MAP[id] || "Movie").filter(Boolean)
    : ["Movie"];

  const releaseYear = movie.release_date ? movie.release_date.substring(0, 4) : "";

  let rating = "PG-13";
  if (movie.adult) {
    rating = "18+";
  } else {
    const genreIds = movie.genre_ids || [];
    if (genreIds.includes(10751) || genreIds.includes(16)) {
      rating = "PG";
    } else if (genreIds.includes(27) || genreIds.includes(80)) {
      rating = "R";
    }
  }

  return {
    id: movie.id.toString(),
    title: movie.title,
    subtitle: releaseYear ? `${releaseYear} • Movie` : "Movie",
    image: getTmdbImageUrl(movie.poster_path, "w500"),
    score: movie.vote_average ? movie.vote_average.toFixed(1) : "N/A",
    type: "Movie",
    mediaType: "movie",
    genres,
    rating,
  };
}

// Convert TmdbTvShow to AnimeProp
export function mapTmdbTvToProp(tv: TmdbTvShow): AnimeProp {
  const genres = tv.genres
    ? tv.genres.map((g) => g.name)
    : tv.genre_ids
    ? tv.genre_ids.map((id) => TV_GENRE_MAP[id] || "TV").filter(Boolean)
    : ["TV"];

  const firstYear = tv.first_air_date ? tv.first_air_date.substring(0, 4) : "";

  let rating = "TV-14";
  const genreIds = tv.genre_ids || [];
  if (genreIds.includes(10762) || genreIds.includes(10751) || genreIds.includes(16)) {
    rating = "TV-PG";
  } else if (genreIds.includes(80) || genreIds.includes(9648)) {
    rating = "TV-MA";
  }

  return {
    id: tv.id.toString(),
    title: tv.name,
    subtitle: firstYear ? `${firstYear} • TV Series` : "TV Series",
    image: getTmdbImageUrl(tv.poster_path, "w500"),
    score: tv.vote_average ? tv.vote_average.toFixed(1) : "N/A",
    type: "TV",
    mediaType: "tv",
    genres,
    rating,
  };
}

// ==================== MOVIE API METHODS ====================

export async function fetchPopularMovies(page = 1): Promise<TmdbMovie[]> {
  const data = await fetchTmdb<{ results: TmdbMovie[] }>("/movie/popular", { page });
  return data.results || [];
}

export async function fetchTopRatedMovies(page = 1): Promise<TmdbMovie[]> {
  const data = await fetchTmdb<{ results: TmdbMovie[] }>("/movie/top_rated", { page });
  return data.results || [];
}

export async function fetchNowPlayingMovies(page = 1): Promise<TmdbMovie[]> {
  const data = await fetchTmdb<{ results: TmdbMovie[] }>("/movie/now_playing", { page });
  return data.results || [];
}

export async function fetchTrendingMovies(timeWindow: "day" | "week" = "day", page = 1): Promise<TmdbMovie[]> {
  const data = await fetchTmdb<{ results: TmdbMovie[] }>(`/trending/movie/${timeWindow}`, { page });
  return data.results || [];
}

export async function fetchMovieDetails(movieId: string | number): Promise<TmdbMovieDetails> {
  return fetchTmdb<TmdbMovieDetails>(`/movie/${movieId}`);
}

export async function fetchMovieCredits(movieId: string | number): Promise<TmdbCredit[]> {
  const data = await fetchTmdb<{ cast: TmdbCredit[] }>(`/movie/${movieId}/credits`);
  return data.cast || [];
}

export async function fetchMovieVideos(movieId: string | number): Promise<TmdbVideo[]> {
  const data = await fetchTmdb<{ results: TmdbVideo[] }>(`/movie/${movieId}/videos`);
  return data.results || [];
}

export async function fetchMoviesByGenre(genreId: number | string, page = 1): Promise<TmdbMovie[]> {
  const data = await fetchTmdb<{ results: TmdbMovie[] }>("/discover/movie", {
    with_genres: genreId,
    page,
    sort_by: "popularity.desc",
  });
  return data.results || [];
}

export async function searchMovies(query: string, page = 1): Promise<TmdbMovie[]> {
  if (!query.trim()) return [];
  const data = await fetchTmdb<{ results: TmdbMovie[] }>("/search/movie", {
    query,
    page,
  });
  return data.results || [];
}

export async function fetchMovieGenres(): Promise<TmdbGenre[]> {
  const data = await fetchTmdb<{ genres: TmdbGenre[] }>("/genre/movie/list");
  return data.genres || [];
}

// ==================== TV API METHODS ====================

export async function fetchPopularTv(page = 1): Promise<TmdbTvShow[]> {
  const data = await fetchTmdb<{ results: TmdbTvShow[] }>("/tv/popular", { page });
  return data.results || [];
}

export async function fetchTopRatedTv(page = 1): Promise<TmdbTvShow[]> {
  const data = await fetchTmdb<{ results: TmdbTvShow[] }>("/tv/top_rated", { page });
  return data.results || [];
}

export async function fetchAiringTv(page = 1): Promise<TmdbTvShow[]> {
  const data = await fetchTmdb<{ results: TmdbTvShow[] }>("/tv/on_the_air", { page });
  return data.results || [];
}

export async function fetchTrendingTv(timeWindow: "day" | "week" = "day", page = 1): Promise<TmdbTvShow[]> {
  const data = await fetchTmdb<{ results: TmdbTvShow[] }>(`/trending/tv/${timeWindow}`, { page });
  return data.results || [];
}

export async function fetchTvDetails(seriesId: string | number): Promise<TmdbTvDetails> {
  return fetchTmdb<TmdbTvDetails>(`/tv/${seriesId}`);
}

export async function fetchTvCredits(seriesId: string | number): Promise<TmdbCredit[]> {
  const data = await fetchTmdb<{ cast: TmdbCredit[] }>(`/tv/${seriesId}/credits`);
  return data.cast || [];
}

export async function fetchTvSeason(seriesId: string | number, seasonNumber: number): Promise<TmdbSeasonDetails> {
  return fetchTmdb<TmdbSeasonDetails>(`/tv/${seriesId}/season/${seasonNumber}`);
}

export async function fetchTvByGenre(genreId: number | string, page = 1): Promise<TmdbTvShow[]> {
  const data = await fetchTmdb<{ results: TmdbTvShow[] }>("/discover/tv", {
    with_genres: genreId,
    page,
    sort_by: "popularity.desc",
  });
  return data.results || [];
}

export async function searchTv(query: string, page = 1): Promise<TmdbTvShow[]> {
  if (!query.trim()) return [];
  const data = await fetchTmdb<{ results: TmdbTvShow[] }>("/search/tv", {
    query,
    page,
  });
  return data.results || [];
}

export async function fetchTvGenres(): Promise<TmdbGenre[]> {
  const data = await fetchTmdb<{ genres: TmdbGenre[] }>("/genre/tv/list");
  return data.genres || [];
}
