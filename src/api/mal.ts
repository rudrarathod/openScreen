import { cachedFetch } from "../utils/apiCache";

const BASE_URL = "/api/mal";

export interface RelatedAnimeItem {
  id: number;
  title: string;
  subtitle?: string;
  image: string;
  score?: number | string;
  type?: string;
  relationType: string;
  relationLabel: string;
  year?: number;
  releaseTimestamp?: number;
}

export interface MalAnime {
  id: number;
  title: string;
  main_picture: {
    medium: string;
    large: string;
  };
  alternative_titles?: {
    synonyms?: string[];
    en?: string;
    ja?: string;
  };
  synopsis?: string;
  mean?: number;
  num_episodes?: number;
  start_season?: {
    year: number;
    season: string;
  };
  genres?: Array<{ id: number; name: string }>;
  media_type?: string;
  status?: string;
  average_episode_duration?: number;
  rank?: number;
  popularity?: number;
  rating?: string;
  relations?: RelatedAnimeItem[];
}

export function mapJikanToMal(item: any): MalAnime {
  if (!item) return null as any;
  const englishTitle = item.title_english || item.titles?.find((t: any) => t.type === "English")?.title;
  const japaneseTitle = item.title_japanese || item.titles?.find((t: any) => t.type === "Japanese")?.title;
  const synonyms = item.titles?.filter((t: any) => t.type === "Synonym")?.map((t: any) => t.title) || [];

  let mappedRelations: RelatedAnimeItem[] = [];
  if (item.relations && Array.isArray(item.relations)) {
    for (const relGroup of item.relations) {
      const relType = (relGroup.relation || "").toUpperCase();
      let relationLabel = "Related";
      switch (relType) {
        case "PREQUEL": relationLabel = "Prequel"; break;
        case "SEQUEL": relationLabel = "Sequel"; break;
        case "PARENT STORY":
        case "PARENT": relationLabel = "Main Series"; break;
        case "SIDE STORY": relationLabel = "Side Story"; break;
        case "SPIN-OFF": relationLabel = "Spin-Off"; break;
        case "ALTERNATIVE VERSION":
        case "ALTERNATIVE": relationLabel = "Alt. Version"; break;
        case "SUMMARY": relationLabel = "Movie Summary"; break;
        default: relationLabel = "Related"; break;
      }
      if (Array.isArray(relGroup.entry)) {
        for (const entry of relGroup.entry) {
          if (entry.type === "anime" && entry.mal_id) {
            mappedRelations.push({
              id: entry.mal_id,
              title: entry.name || "",
              image: "",
              relationType: relType.replace(/\s+/g, "_"),
              relationLabel,
            });
          }
        }
      }
    }
  }

  return {
    id: item.mal_id,
    title: item.title || englishTitle || "",
    main_picture: {
      medium: item.images?.jpg?.image_url || item.images?.webp?.image_url || "",
      large: item.images?.jpg?.large_image_url || item.images?.webp?.large_image_url || item.images?.jpg?.image_url || "",
    },
    alternative_titles: {
      en: englishTitle || item.title || "",
      ja: japaneseTitle || "",
      synonyms: synonyms,
    },
    synopsis: item.synopsis || "",
    mean: item.score || undefined,
    num_episodes: item.episodes || undefined,
    start_season: (item.year || item.season) ? { year: item.year || new Date().getFullYear(), season: item.season || "" } : undefined,
    genres: item.genres?.map((g: any) => ({ id: g.mal_id, name: g.name })) || [],
    media_type: item.type ? item.type.toLowerCase() : "tv",
    status: item.status || "",
    average_episode_duration: item.duration ? (parseInt(item.duration) || undefined) : undefined,
    rank: item.rank || undefined,
    popularity: item.popularity || undefined,
    rating: item.rating || undefined,
    relations: mappedRelations.length > 0 ? mappedRelations : undefined,
  };
}

async function safeFetchJson(url: string, retries = 2, delayMs = 350): Promise<any> {
  const isLocalProxy = url.startsWith(BASE_URL) || url.startsWith("/api/mal");
  const maxAttempts = isLocalProxy ? 1 : retries + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const headers: Record<string, string> = {};
      if (isLocalProxy || url.includes("api.myanimelist.net")) {
        headers["X-MAL-CLIENT-ID"] = "6114d00ca681b7701d1e15fe11a4987e";
      }

      const res = await fetch(url, {
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 429 && attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 800));
        continue;
      }
      if (!res.ok) {
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        return null;
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        if (attempt < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        return null;
      }
      return await res.json();
    } catch {
      clearTimeout(timeoutId);
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      return null;
    }
  }
  return null;
}

// Queue Jikan API calls to ensure max 1 request per 350ms to strictly comply with Jikan rate limits (3 req/sec)
let jikanQueue: Promise<any> = Promise.resolve();
async function queuedJikanFetch(url: string, retries = 2, delayMs = 500): Promise<any> {
  const currentTask = jikanQueue.then(async () => {
    await new Promise((r) => setTimeout(r, 350));
    return safeFetchJson(url, retries, delayMs);
  });
  jikanQueue = currentTask.catch(() => {});
  return currentTask;
}

export function inferAnimeRating(item: { rating?: string; isAdult?: boolean; genres?: any[]; format?: string; media_type?: string }): string {
  if (item.rating && typeof item.rating === "string" && item.rating.trim()) {
    return item.rating;
  }
  if (item.isAdult) {
    return "18+";
  }
  const genres = (item.genres || []).map((g) => (typeof g === "string" ? g : g?.name || "").toLowerCase());
  if (genres.includes("hentai") || genres.includes("erotica")) {
    return "18+";
  }
  if (genres.includes("ecchi") || genres.includes("horror") || genres.includes("thriller")) {
    return "R-17+";
  }
  if (genres.includes("kids")) {
    return "PG";
  }
  const fmt = (item.format || item.media_type || "").toUpperCase();
  if (fmt === "MOVIE") {
    return "PG-13";
  }
  return "TV-14";
}

export async function fetchAniListRanking(type: string, page = 1, perPage = 20): Promise<MalAnime[]> {
  let sort = ["SCORE_DESC", "POPULARITY_DESC"];
  let status: string | undefined = undefined;
  let format: string | undefined = undefined;

  switch (type) {
    case "airing":
      status = "RELEASING";
      sort = ["POPULARITY_DESC", "SCORE_DESC"];
      break;
    case "bypopularity":
      sort = ["POPULARITY_DESC"];
      break;
    case "upcoming":
      status = "NOT_YET_RELEASED";
      sort = ["POPULARITY_DESC"];
      break;
    case "favorite":
      sort = ["FAVOURITES_DESC"];
      break;
    case "tv":
      format = "TV";
      sort = ["SCORE_DESC", "POPULARITY_DESC"];
      break;
    case "movie":
      format = "MOVIE";
      sort = ["SCORE_DESC", "POPULARITY_DESC"];
      break;
    case "ova":
      format = "OVA";
      sort = ["SCORE_DESC", "POPULARITY_DESC"];
      break;
    case "special":
      format = "SPECIAL";
      sort = ["SCORE_DESC", "POPULARITY_DESC"];
      break;
    case "all":
    default:
      sort = ["SCORE_DESC", "POPULARITY_DESC"];
      break;
  }

  const query = `
    query ($page: Int, $perPage: Int, $sort: [MediaSort], $status: MediaStatus, $format: MediaFormat) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: $sort, status: $status, format: $format) {
          id
          idMal
          title {
            romaji
            english
            native
          }
          coverImage {
            extraLarge
            large
            medium
          }
          meanScore
          format
          episodes
          genres
          status
          isAdult
        }
      }
    }
  `;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { page, perPage, sort, status, format } }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return [];
    const json = await res.json();
    const media = json?.data?.Page?.media;
    if (!media || !Array.isArray(media)) return [];

    return media.map((item: any) => {
      const genres = item.genres?.map((g: string, idx: number) => ({ id: idx + 1, name: g })) || [];
      const rating = inferAnimeRating({ isAdult: item.isAdult, genres, format: item.format });
      return {
        id: item.idMal || item.id,
        title: item.title?.english || item.title?.romaji || item.title?.native || "",
        main_picture: {
          medium: item.coverImage?.medium || item.coverImage?.large || "",
          large: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || "",
        },
        alternative_titles: {
          en: item.title?.english || "",
          ja: item.title?.romaji || item.title?.native || "",
        },
        mean: item.meanScore ? Number((item.meanScore / 10).toFixed(2)) : undefined,
        num_episodes: item.episodes || undefined,
        genres,
        media_type: item.format ? item.format.toLowerCase() : "tv",
        status: item.status || "",
        rating,
      };
    });
  } catch (err) {
    console.error("AniList ranking fetch error:", err);
    return [];
  }
}

async function fetchJikanRanking(type: string, limit = 20, offset = 0): Promise<MalAnime[]> {
  try {
    const page = Math.floor(offset / 25) + 1;
    let url = `https://api.jikan.moe/v4/top/anime?page=${page}&limit=${Math.min(limit, 25)}&sfw=false`;
    
    if (type === "airing" || type === "upcoming" || type === "bypopularity" || type === "favorite") {
      url += `&filter=${type}`;
    } else if (type === "tv" || type === "movie" || type === "ova" || type === "special") {
      url += `&type=${type}`;
    }

    let json = await queuedJikanFetch(url, 2, 500);
    // Secondary fallback: if page > 1 or specific filter failed, retry top anime page 1
    if ((!json?.data || !Array.isArray(json.data) || json.data.length === 0) && page > 1) {
      json = await queuedJikanFetch(`https://api.jikan.moe/v4/top/anime?page=1&limit=25&sfw=false`, 2, 500);
    }

    if (!json?.data || !Array.isArray(json.data)) return [];

    return json.data.map(mapJikanToMal);
  } catch (err) {
    console.error("Failed to fetch ranking from Jikan:", err);
    return [];
  }
}

export async function fetchAniListSearch(queryStr: string, page = 1, perPage = 24): Promise<MalAnime[]> {
  const query = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(search: $search, type: ANIME, sort: [SEARCH_MATCH, POPULARITY_DESC]) {
          id
          idMal
          title {
            romaji
            english
            native
          }
          coverImage {
            extraLarge
            large
            medium
          }
          meanScore
          format
          episodes
          genres
          status
          isAdult
        }
      }
    }
  `;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { search: queryStr, page, perPage } }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const media = json?.data?.Page?.media;
    if (!media || !Array.isArray(media)) return [];

    return media.map((item: any) => {
      const genres = item.genres?.map((g: string, idx: number) => ({ id: idx + 1, name: g })) || [];
      const rating = inferAnimeRating({ isAdult: item.isAdult, genres, format: item.format });
      return {
        id: item.idMal || item.id,
        title: item.title?.english || item.title?.romaji || item.title?.native || "",
        main_picture: {
          medium: item.coverImage?.medium || item.coverImage?.large || "",
          large: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || "",
        },
        alternative_titles: {
          en: item.title?.english || "",
          ja: item.title?.romaji || item.title?.native || "",
        },
        mean: item.meanScore ? Number((item.meanScore / 10).toFixed(2)) : undefined,
        num_episodes: item.episodes || undefined,
        genres,
        media_type: item.format ? item.format.toLowerCase() : "tv",
        status: item.status || "",
        rating,
      };
    });
  } catch (err) {
    console.error("AniList search error:", err);
    return [];
  }
}

export async function fetchAniListDetails(id: string | number): Promise<MalAnime | null> {
  const isNumeric = !isNaN(Number(id));
  if (!isNumeric) return null;
  const numId = Number(id);

  const queryByMalId = `
    query ($idMal: Int) {
      Media(idMal: $idMal, type: ANIME) {
        id
        idMal
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
          large
          medium
        }
        bannerImage
        description(asHtml: false)
        meanScore
        averageScore
        popularity
        favourites
        format
        episodes
        duration
        status
        genres
        startDate {
          year
          month
          day
        }
        endDate {
          year
          month
          day
        }
        season
        seasonYear
        relations {
          edges {
            relationType(version: 2)
            node {
              id
              idMal
              title {
                romaji
                english
                native
              }
              coverImage {
                extraLarge
                large
                medium
              }
              format
              seasonYear
              startDate {
                year
                month
                day
              }
              meanScore
              episodes
              status
              type
            }
          }
        }
      }
    }
  `;

  const queryByAniListId = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        idMal
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
          large
          medium
        }
        bannerImage
        description(asHtml: false)
        meanScore
        averageScore
        popularity
        favourites
        format
        episodes
        duration
        status
        genres
        startDate {
          year
          month
          day
        }
        endDate {
          year
          month
          day
        }
        season
        seasonYear
        relations {
          edges {
            relationType(version: 2)
            node {
              id
              idMal
              title {
                romaji
                english
                native
              }
              coverImage {
                extraLarge
                large
                medium
              }
              format
              seasonYear
              startDate {
                year
                month
                day
              }
              meanScore
              episodes
              status
              type
            }
          }
        }
      }
    }
  `;

  try {
    let res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        query: queryByMalId,
        variables: { idMal: numId },
      }),
    });
    let json = await res.json();
    let item = json?.data?.Media;

    if (!item) {
      res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          query: queryByAniListId,
          variables: { id: numId },
        }),
      });
      json = await res.json();
      item = json?.data?.Media;
    }

    if (!item) return null;

    const relationsRaw = item.relations?.edges || [];
    const mappedRelations: RelatedAnimeItem[] = relationsRaw
      .filter((edge: any) => edge?.node && edge?.node?.type !== "MANGA")
      .map((edge: any) => {
        const node = edge.node;
        const relType = edge.relationType || "OTHER";

        let relationLabel = "Related";
        switch (relType) {
          case "PREQUEL": relationLabel = "Prequel"; break;
          case "SEQUEL": relationLabel = "Sequel"; break;
          case "PARENT": relationLabel = "Main Series"; break;
          case "SIDE_STORY": relationLabel = "Side Story"; break;
          case "SPIN_OFF": relationLabel = "Spin-Off"; break;
          case "ALTERNATIVE": relationLabel = "Alt. Version"; break;
          case "SUMMARY": relationLabel = "Movie Summary"; break;
          case "CHARACTER": relationLabel = "Character Story"; break;
          default: relationLabel = "Related"; break;
        }

        const releaseTimestamp = (node.startDate?.year || node.seasonYear || 9999) * 10000 +
          (node.startDate?.month || 1) * 100 +
          (node.startDate?.day || 1);

        return {
          id: node.idMal || node.id,
          title: node.title?.english || node.title?.romaji || node.title?.native || "",
          subtitle: node.title?.romaji || node.title?.native || "",
          image: node.coverImage?.large || node.coverImage?.medium || "",
          score: node.meanScore ? Number((node.meanScore / 10).toFixed(1)) : undefined,
          type: node.format ? node.format.toLowerCase() : "tv",
          relationType: relType,
          relationLabel: relationLabel,
          year: node.startDate?.year || node.seasonYear,
          releaseTimestamp,
        };
      });

    const relationOrder: Record<string, number> = {
      PREQUEL: 1,
      SEQUEL: 2,
      PARENT: 3,
      SIDE_STORY: 4,
      SUMMARY: 5,
      ALTERNATIVE: 6,
      SPIN_OFF: 7,
      OTHER: 8,
    };

    mappedRelations.sort((a, b) => {
      if (a.releaseTimestamp && b.releaseTimestamp && a.releaseTimestamp !== b.releaseTimestamp) {
        return a.releaseTimestamp - b.releaseTimestamp;
      }
      return (relationOrder[a.relationType] || 9) - (relationOrder[b.relationType] || 9);
    });

    return {
      id: item.idMal || item.id,
      title: item.title?.english || item.title?.romaji || item.title?.native || "",
      main_picture: {
        medium: item.coverImage?.medium || item.coverImage?.large || "",
        large: item.coverImage?.extraLarge || item.bannerImage || item.coverImage?.large || "",
      },
      alternative_titles: {
        en: item.title?.english || "",
        ja: item.title?.romaji || item.title?.native || "",
      },
      synopsis: item.description?.replace(/<[^>]*>?/gm, "") || "",
      mean: item.meanScore ? Number((item.meanScore / 10).toFixed(2)) : (item.averageScore ? Number((item.averageScore / 10).toFixed(2)) : undefined),
      num_episodes: item.episodes || undefined,
      start_season: (item.seasonYear || item.season) ? { year: item.seasonYear || item.startDate?.year || new Date().getFullYear(), season: item.season ? item.season.toLowerCase() : "" } : undefined,
      genres: item.genres?.map((g: string, idx: number) => ({ id: idx + 1, name: g })) || [],
      media_type: item.format ? item.format.toLowerCase() : "tv",
      status: item.status || "",
      average_episode_duration: item.duration ? item.duration * 60 : undefined,
      popularity: item.popularity || undefined,
      relations: mappedRelations,
    };
  } catch (err) {
    console.error("AniList details error:", err);
    return null;
  }
}

export async function fetchMalRanking(type: string, limit = 20, offset = 0): Promise<MalAnime[]> {
  if (offset >= 1000) return [];
  const key = `v6_mal_ranking_${type}_${limit}_${offset}`;
  return cachedFetch(key, async () => {
    // 1. Primary: AniList GraphQL (Fast, reliable, keyless, zero CORS/403 issues)
    const aniListResults = await fetchAniListRanking(type, Math.floor(offset / limit) + 1, limit);
    if (aniListResults && aniListResults.length > 0) {
      return aniListResults;
    }

    // 2. Secondary fallback: MAL proxy
    const malUrl = `${BASE_URL}/anime/ranking?ranking_type=${type}&limit=${limit}&offset=${offset}&nsfw=true&fields=id,title,main_picture,alternative_titles,mean,media_type,num_episodes,genres,status,rating`;
    const malJson = await safeFetchJson(malUrl);
    if (malJson?.data && Array.isArray(malJson.data) && malJson.data.length > 0) {
      return malJson.data.map((item: any) => item.node);
    }

    // 3. Tertiary fallback: Jikan API (queued & throttled)
    return await fetchJikanRanking(type, limit, offset);
  }, 30 * 60 * 1000); // 30 min cache
}

async function fetchJikanSeasonal(year: number, season: string, limit = 20): Promise<MalAnime[]> {
  try {
    const url = `https://api.jikan.moe/v4/seasons/${year}/${season}?limit=${Math.min(limit, 25)}&sfw=false`;
    const json = await queuedJikanFetch(url);
    if (!json?.data || !Array.isArray(json.data)) return [];

    return json.data.map(mapJikanToMal);
  } catch (err) {
    console.error("Failed to fetch seasonal from Jikan:", err);
    return [];
  }
}

export async function fetchMalSeasonal(year: number, season: string, limit = 20): Promise<MalAnime[]> {
  const key = `v5_mal_seasonal_${year}_${season}_${limit}`;
  return cachedFetch(key, async () => {
    const aniListResults = await fetchAniListRanking("airing", 1, limit);
    if (aniListResults && aniListResults.length > 0) {
      return aniListResults;
    }

    const malUrl = `${BASE_URL}/anime/season/${year}/${season}?limit=${limit}&nsfw=true&fields=id,title,main_picture,alternative_titles,mean,media_type,num_episodes,genres,status,rating`;
    const malJson = await safeFetchJson(malUrl);
    if (malJson?.data && Array.isArray(malJson.data)) {
      return malJson.data.map((item: any) => item.node);
    }

    return await fetchJikanSeasonal(year, season, limit);
  }, 60 * 60 * 1000); // 1 hour cache
}

export const MAL_MIN_QUERY_LENGTH = 3;

async function fetchJikanSearch(query: string, limit = 20): Promise<MalAnime[]> {
  try {
    const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&sfw=false&limit=${Math.min(limit, 25)}`;
    const json = await queuedJikanFetch(url);
    if (!json?.data || !Array.isArray(json.data)) return [];

    return json.data.map(mapJikanToMal);
  } catch (err) {
    console.error("Failed to search from Jikan:", err);
    return [];
  }
}

export async function fetchMalSearch(query: string, limit = 20): Promise<MalAnime[]> {
  const trimmed = query.trim();
  if (trimmed.length < MAL_MIN_QUERY_LENGTH) return [];
  const key = `v5_mal_search_${trimmed.toLowerCase()}_${limit}`;
  return cachedFetch(key, async () => {
    // 1. Primary: AniList GraphQL Search
    const aniListResults = await fetchAniListSearch(trimmed, 1, limit);
    if (aniListResults && aniListResults.length > 0) {
      return aniListResults;
    }

    // 2. Secondary fallback: MAL Proxy
    const malUrl = `${BASE_URL}/anime?q=${encodeURIComponent(trimmed)}&limit=${limit}&nsfw=true&fields=id,title,main_picture,alternative_titles,mean,media_type,num_episodes,genres,status,rating`;
    const malJson = await safeFetchJson(malUrl);
    if (malJson?.data && Array.isArray(malJson.data)) {
      return malJson.data.map((item: any) => item.node);
    }

    // 3. Tertiary fallback: Jikan API
    return await fetchJikanSearch(trimmed, limit);
  }, 15 * 60 * 1000); // 15 min cache
}

export interface Genre {
  id: number;
  name: string;
}

export const ANIME_GENRES: Genre[] = [
  { id: 1, name: "Action" },
  { id: 2, name: "Adventure" },
  { id: 4, name: "Comedy" },
  { id: 8, name: "Drama" },
  { id: 10, name: "Fantasy" },
  { id: 14, name: "Horror" },
  { id: 7, name: "Mystery" },
  { id: 22, name: "Romance" },
  { id: 24, name: "Sci-Fi" },
  { id: 36, name: "Slice of Life" },
  { id: 30, name: "Sports" },
  { id: 37, name: "Supernatural" },
  { id: 41, name: "Thriller" },
  { id: 27, name: "Shounen" },
  { id: 18, name: "Mecha" },
  { id: 19, name: "Music" },
];

export async function fetchAniListByGenre(genreName: string, page = 1, perPage = 24): Promise<MalAnime[]> {
  const query = `
    query ($genre: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(genre: $genre, type: ANIME, sort: [SCORE_DESC, POPULARITY_DESC]) {
          id
          idMal
          title {
            romaji
            english
            native
          }
          coverImage {
            extraLarge
            large
            medium
          }
          meanScore
          format
          episodes
          genres
          status
          isAdult
        }
      }
    }
  `;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, variables: { genre: genreName, page, perPage } })
    });
    if (!res.ok) return [];
    const json = await res.json();
    const media = json?.data?.Page?.media;
    if (!media || !Array.isArray(media)) return [];

    return media.map((item: any) => {
      const genres = item.genres?.map((g: string, idx: number) => ({ id: idx + 1, name: g })) || [];
      const rating = inferAnimeRating({ isAdult: item.isAdult, genres, format: item.format });
      return {
        id: item.idMal || item.id,
        title: item.title?.english || item.title?.romaji || item.title?.native || "",
        main_picture: {
          medium: item.coverImage?.medium || item.coverImage?.large || "",
          large: item.coverImage?.extraLarge || item.coverImage?.large || item.coverImage?.medium || "",
        },
        alternative_titles: {
          en: item.title?.english || "",
          ja: item.title?.romaji || item.title?.native || "",
        },
        mean: item.meanScore ? Number((item.meanScore / 10).toFixed(2)) : undefined,
        num_episodes: item.episodes || undefined,
        genres,
        media_type: item.format ? item.format.toLowerCase() : "tv",
        status: item.status || "",
        rating,
      };
    });
  } catch (err) {
    console.error("AniList fetch error:", err);
    return [];
  }
}

export async function fetchAnimeByGenre(genreId: number, page = 1, limit = 24): Promise<MalAnime[]> {
  const key = `v5_mal_genre_${genreId}_${page}_${limit}`;
  return cachedFetch(key, async () => {
    const genreObj = ANIME_GENRES.find((g) => g.id === genreId);
    const genreName = genreObj ? genreObj.name : "Action";

    // 1. Try AniList GraphQL (Fast, reliable, high quality data)
    const aniListResults = await fetchAniListByGenre(genreName, page, limit);
    if (aniListResults && aniListResults.length > 0) {
      return aniListResults;
    }

    // 2. Fallback to Jikan API
    const url = `https://api.jikan.moe/v4/anime?genres=${genreId}&order_by=score&sort=desc&page=${page}&limit=${Math.min(limit, 25)}&sfw=false`;
    const json = await queuedJikanFetch(url, 2, 500);
    if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
      return json.data.map(mapJikanToMal);
    }

    // 3. Last fallback: Top Anime filtered by genre
    const topAnime = await fetchJikanRanking("bypopularity", 25, (page - 1) * 25);
    if (topAnime && topAnime.length > 0) {
      const filtered = topAnime.filter((anime) =>
        anime.genres?.some((g) => g.name.toLowerCase().includes(genreName.toLowerCase()))
      );
      if (filtered.length > 0) return filtered;
      return topAnime;
    }

    return [];
  }, 30 * 60 * 1000);
}

async function fetchJikanDetails(id: string): Promise<MalAnime | null> {
  try {
    const url = `https://api.jikan.moe/v4/anime/${id}/full`;
    const json = await queuedJikanFetch(url);
    if (!json?.data) return null;

    return mapJikanToMal(json.data);
  } catch (err) {
    console.error(`Failed to fetch details from Jikan for ${id}:`, err);
    return null;
  }
}

export async function fetchMalDetails(id: string): Promise<MalAnime | null> {
  const key = `v9_mal_details_${id}`;
  return cachedFetch(key, async () => {
    // 1. Primary: AniList GraphQL Details
    const aniListDetails = await fetchAniListDetails(id);
    if (aniListDetails) {
      return aniListDetails;
    }

    // 2. Secondary fallback: MAL Proxy
    const fields = "id,title,main_picture,alternative_titles,start_date,end_date,synopsis,mean,rank,popularity,num_episodes,start_season,broadcast,source,average_episode_duration,rating,status,genres,media_type";
    const malUrl = `${BASE_URL}/anime/${id}?fields=${fields}&nsfw=true`;
    const malJson = await safeFetchJson(malUrl);
    if (malJson && !malJson.error && malJson.id) {
      return malJson;
    }

    // 3. Tertiary fallback: Jikan Details
    return await fetchJikanDetails(id);
  }, 2 * 60 * 60 * 1000); // 2 hour cache
}
