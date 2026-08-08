import { cachedFetch } from "../utils/apiCache";

export interface JikanEpisode {
  mal_id: number;
  title: string;
  title_japanese?: string;
  title_romanji?: string;
  filler?: boolean;
  recap?: boolean;
  aired?: string | null;
  hasAired?: boolean;
  synopsis?: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJsonWithRetry(url: string, maxRetries = 2): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.status === 429) {
        await delay(400 * (attempt + 1));
        continue;
      }
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      clearTimeout(timeoutId);
      if (attempt === maxRetries - 1) return null;
      await delay(300);
    }
  }
  return null;
}

async function fetchAniListEpisodeCount(malId: string | number): Promise<number | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const query = `
      query ($idMal: Int) {
        Media(idMal: $idMal, type: ANIME) {
          episodes
          nextAiringEpisode {
            episode
          }
        }
      }
    `;
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { idMal: Number(malId) } }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const json = await res.json();
    const media = json.data?.Media;
    if (media?.nextAiringEpisode?.episode) {
      return media.nextAiringEpisode.episode - 1;
    }
    if (media?.episodes) {
      return media.episodes;
    }
  } catch (err) {
    console.error("Failed to fetch AniList episode count:", err);
  }
  return null;
}

export async function fetchAnimeEpisodes(
  malId: string | number,
  onUpdate?: (updatedMap: Record<number, JikanEpisode>) => void
): Promise<Record<number, JikanEpisode>> {
  const key = `jikan_episodes_v2_${malId}`;
  return cachedFetch(key, async () => {
    try {
      const map: Record<number, JikanEpisode> = {};
      const now = Date.now();

      const parseEp = (ep: any) => {
        if (!ep || !ep.mal_id) return;
        let hasAired = true;
        if (ep.aired) {
          const airedTime = new Date(ep.aired).getTime();
          if (!isNaN(airedTime) && airedTime > now) {
            hasAired = false;
          }
        }
        map[ep.mal_id] = {
          mal_id: ep.mal_id,
          title: ep.title || `Episode ${ep.mal_id}`,
          title_japanese: ep.title_japanese,
          title_romanji: ep.title_romanji,
          filler: ep.filler,
          recap: ep.recap,
          aired: ep.aired || null,
          hasAired,
          synopsis: ep.synopsis || undefined,
        };
      };

      const [page1Data, aniListTotalEps] = await Promise.all([
        fetchJsonWithRetry(`https://api.jikan.moe/v4/anime/${malId}/episodes?page=1`),
        fetchAniListEpisodeCount(malId),
      ]);

      if (aniListTotalEps && aniListTotalEps > 0) {
        for (let i = 1; i <= aniListTotalEps; i++) {
          map[i] = {
            mal_id: i,
            title: `Episode ${i}`,
            hasAired: true,
          };
        }
      }

      if (page1Data && Array.isArray(page1Data.data)) {
        page1Data.data.forEach(parseEp);
      }

      const lastPage = page1Data?.pagination?.last_visible_page || (page1Data?.pagination?.has_next_page ? 2 : 1);

      if (lastPage > 1) {
        // Kick off background fetching for remaining pages without awaiting, so UI gets initial episodes instantly
        (async () => {
          const lastPageData = await fetchJsonWithRetry(`https://api.jikan.moe/v4/anime/${malId}/episodes?page=${lastPage}`);
          if (lastPageData && Array.isArray(lastPageData.data)) {
            lastPageData.data.forEach(parseEp);
            if (onUpdate) onUpdate({ ...map });
          }

          const maxPages = Math.min(lastPage - 1, 40);
          const remainingPages: number[] = [];
          for (let p = 2; p <= maxPages; p++) {
            remainingPages.push(p);
          }

          const BATCH_SIZE = 3;
          for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
            const batch = remainingPages.slice(i, i + BATCH_SIZE);
            const results = await Promise.allSettled(
              batch.map((p) => fetchJsonWithRetry(`https://api.jikan.moe/v4/anime/${malId}/episodes?page=${p}`))
            );

            results.forEach((res) => {
              if (res.status === "fulfilled" && res.value && Array.isArray(res.value.data)) {
                res.value.data.forEach(parseEp);
              }
            });

            if (onUpdate) onUpdate({ ...map });

            if (i + BATCH_SIZE < remainingPages.length) {
              await delay(200);
            }
          }
        })();
      }

      return map;
    } catch (err) {
      console.error("Failed to fetch episodes from Jikan API:", err);
      return {};
    }
  }, 2 * 60 * 60 * 1000); // 2 hour cache
}
