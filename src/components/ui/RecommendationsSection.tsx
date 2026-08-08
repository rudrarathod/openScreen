import React, { useMemo } from "react";
import { Sparkles } from "lucide-react";
import Carousel from "./Carousel";
import { AnimeProp } from "./AnimeCard";
import { useWatchlist, inferMediaType } from "../../context/WatchlistContext";
import { useMediaType } from "../../context/MediaTypeContext";

interface RecommendationsSectionProps {
  candidatePool: AnimeProp[];
}

export default function RecommendationsSection({ candidatePool }: RecommendationsSectionProps) {
  const { watchlist, isInWatchlist } = useWatchlist();
  const { activeMediaType } = useMediaType();

  // 1. Calculate genre and tag weights from watchlist items matching activeMediaType
  const { genreWeights, topGenres, totalItems } = useMemo(() => {
    const weights: Record<string, number> = {};
    let itemsCount = 0;

    const filteredWatchlist = watchlist.filter((item) => {
      const type = item.mediaType || inferMediaType(item.id, item.type);
      return type === activeMediaType;
    });

    filteredWatchlist.forEach((item) => {
      itemsCount++;

      // Weight multiplier based on watchlist status
      let statusWeight = 1.5;
      if (item.status === "Completed") statusWeight = 3.0;
      else if (item.status === "Watching") statusWeight = 2.5;
      else if (item.status === "Plan to Watch") statusWeight = 1.5;
      else if (item.status === "On Hold") statusWeight = 1.0;
      else if (item.status === "Dropped") statusWeight = 0.2;

      // Score weight (e.g. 8.5/10)
      const numScore = typeof item.score === "number" ? item.score : parseFloat(String(item.score || "7"));
      const scoreMultiplier = !isNaN(numScore) && numScore > 0 ? numScore / 7 : 1;

      // Progress bonus
      const progressBonus = item.progressEp && item.progressEp > 2 ? 1.2 : 1.0;
      const totalItemWeight = statusWeight * scoreMultiplier * progressBonus;

      if (item.genres && Array.isArray(item.genres) && item.genres.length > 0) {
        item.genres.forEach((g) => {
          const norm = g.trim().toLowerCase();
          weights[norm] = (weights[norm] || 0) + totalItemWeight;
        });
      }
    });

    // Extract top 3 genres formatted for display
    const sorted = Object.entries(weights)
      .sort((a, b) => b[1] - a[1])
      .map(([g]) => g.charAt(0).toUpperCase() + g.slice(1));

    return {
      genreWeights: weights,
      topGenres: sorted.slice(0, 3),
      totalItems: itemsCount,
    };
  }, [watchlist]);

  // 2. Score candidate anime items based on genre matches
  const recommendedItems = useMemo(() => {
    if (!candidatePool || candidatePool.length === 0) return [];

    // Filter out items already in the user's watchlist
    const available = candidatePool.filter((anime) => !isInWatchlist(anime.id));

    // Deduplicate candidate items by ID
    const uniqueMap = new Map<string, AnimeProp>();
    available.forEach((a) => {
      if (!uniqueMap.has(String(a.id))) {
        uniqueMap.set(String(a.id), a);
      }
    });

    const candidates = Array.from(uniqueMap.values());
    const hasWatchlistGenres = Object.keys(genreWeights).length > 0;

    if (!hasWatchlistGenres) {
      // If user has no genres in watchlist yet, fallback to top-rated items
      return candidates
        .sort((a, b) => {
          const scoreA = parseFloat(String(a.score || "0")) || 0;
          const scoreB = parseFloat(String(b.score || "0")) || 0;
          return scoreB - scoreA;
        })
        .slice(0, 15);
    }

    // Score candidates based on matching genres & MAL score
    const scored = candidates.map((anime) => {
      let matchScore = 0;

      if (anime.genres && Array.isArray(anime.genres)) {
        anime.genres.forEach((g) => {
          const norm = g.trim().toLowerCase();
          if (genreWeights[norm]) {
            matchScore += genreWeights[norm] * 3;
          }
        });
      }

      // Rating quality score multiplier
      const meanScore = parseFloat(String(anime.score || "7.0")) || 7.0;
      matchScore += meanScore * 0.5;

      return { anime, matchScore };
    });

    // Sort descending by calculated match score
    return scored
      .sort((a, b) => b.matchScore - a.matchScore)
      .map((item) => item.anime)
      .slice(0, 18);
  }, [candidatePool, genreWeights, isInWatchlist]);

  if (recommendedItems.length === 0) return null;

  const isPersonalized = totalItems > 0 && topGenres.length > 0;

  const mediaTypeName = activeMediaType === "anime" ? "Anime" : activeMediaType === "movie" ? "Movies" : "TV Series";

  return (
    <Carousel
      title={`${mediaTypeName} You Might Like`}
      subtitle={
        <div className="flex items-center gap-1.5 flex-wrap">
          <Sparkles className="w-3.5 h-3.5 text-accent animate-pulse shrink-0" />
          {isPersonalized ? (
            <span>
              Matched for you based on your interest in{" "}
              <span className="font-semibold text-foreground">
                {topGenres.join(", ")}
              </span>
            </span>
          ) : (
            <span>Top recommendations — add {activeMediaType} to your watchlist for tailored picks!</span>
          )}
        </div>
      }
      items={recommendedItems}
      layout="portrait"
    />
  );
}
