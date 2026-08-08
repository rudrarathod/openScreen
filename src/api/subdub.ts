import { cachedFetch } from "../utils/apiCache";

export interface SubDubAvailability {
  hasSub: boolean;
  hasDub: boolean;
  maxSubEp?: number;
  maxDubEp?: number;
  loading: boolean;
}

export async function fetchSubDubInfo(malId: string | number): Promise<SubDubAvailability> {
  const idStr = String(malId);
  if (!idStr || idStr === "undefined") {
    return { hasSub: true, hasDub: false, loading: false };
  }

  const cacheKey = `subdub_info_${idStr}`;
  return cachedFetch(cacheKey, async () => {
    let hasSub = true;
    let hasDub = false;
    let maxSubEp: number | undefined = undefined;
    let maxDubEp: number | undefined = undefined;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const [aniListRes, aniKotoRes] = await Promise.allSettled([
        fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `
              query ($idMal: Int) {
                Media(idMal: $idMal, type: ANIME) {
                  id
                  episodes
                  countryOfOrigin
                  characters(sort: [ROLE, RELEVANCE], perPage: 25) {
                    edges {
                      node { id }
                      voiceActors {
                        languageV2
                      }
                    }
                  }
                }
              }
            `,
            variables: { idMal: Number(malId) },
          }),
          signal: controller.signal,
        }).then((r) => (r.ok ? r.json() : null)),

        fetch(`/api/anikoto/recent-anime?per_page=100`, { signal: controller.signal }).then((r) =>
          r.ok ? r.json() : null
        ),
      ]);
      clearTimeout(timeoutId);

      if (aniListRes.status === "fulfilled" && aniListRes.value?.data?.Media) {
        const media = aniListRes.value.data.Media;
        const edges = media.characters?.edges || [];
        let foundEngVA = false;
        let foundJapVA = false;

        for (const edge of edges) {
          const vas = edge.voiceActors || [];
          for (const va of vas) {
            if (va.languageV2 === "English") foundEngVA = true;
            if (va.languageV2 === "Japanese") foundJapVA = true;
          }
        }

        if (foundEngVA) {
          hasDub = true;
        }
        if (foundJapVA || media.countryOfOrigin === "JP") {
          hasSub = true;
        }
      }

      if (aniKotoRes.status === "fulfilled" && aniKotoRes.value?.data) {
        const items = aniKotoRes.value.data;
        if (Array.isArray(items)) {
          const match = items.find((item: any) => String(item.mal_id) === idStr);
          if (match) {
            const subCount = typeof match.is_sub === "number" ? match.is_sub : (match.is_sub ? 1 : 0);
            const dubCount = typeof match.is_dub === "number" ? match.is_dub : (match.is_dub ? 1 : 0);
            if (subCount > 0) {
              hasSub = true;
              maxSubEp = subCount;
            }
            if (dubCount > 0) {
              hasDub = true;
              maxDubEp = dubCount;
            } else if (match.is_dub === 0 || match.is_dub === false) {
              hasDub = false;
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch sub/dub info for MAL ID:", malId, err);
    }

    return {
      hasSub,
      hasDub,
      maxSubEp,
      maxDubEp,
      loading: false,
    };
  }, 2 * 60 * 60 * 1000); // 2 hour cache
}

export function isSubAvailable(availability: SubDubAvailability | null, epNum: number): boolean {
  if (!availability) return true; // Default to true while loading
  if (!availability.hasSub) return false;
  if (availability.maxSubEp !== undefined && epNum > availability.maxSubEp) {
    return false;
  }
  return true;
}

export function isDubAvailable(availability: SubDubAvailability | null, epNum: number): boolean {
  if (!availability) return false; // Default to false while loading or if no dub
  if (!availability.hasDub) return false;
  if (availability.maxDubEp !== undefined && epNum > availability.maxDubEp) {
    return false;
  }
  return true;
}
