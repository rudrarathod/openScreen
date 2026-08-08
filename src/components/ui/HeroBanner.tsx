import React from "react";
import { Play, Plus, Check } from "lucide-react";
import { Link } from "react-router";
import { cn } from "../../utils/cn";
import { useWatchlist } from "../../context/WatchlistContext";

import { useMediaType } from "../../context/MediaTypeContext";

export interface HeroData {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  coverImage: string;
  genres: string[];
  rating: string;
  year: string;
  type?: string;
}

interface HeroBannerProps {
  anime: HeroData;
}

export default function HeroBanner({ anime }: HeroBannerProps) {
  const { activeMediaType } = useMediaType();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const saved = isInWatchlist(anime.id);

  const watchLink =
    activeMediaType === "movie" || anime.type === "Movie"
      ? `/movie/${anime.id}`
      : activeMediaType === "tv" || anime.type === "TV"
      ? `/tv/${anime.id}`
      : `/anime/${anime.id}`;

  const handleToggleList = (e: React.MouseEvent) => {
    e.preventDefault();
    if (saved) {
      removeFromWatchlist(anime.id);
    } else {
      addToWatchlist({
        id: anime.id,
        title: anime.title,
        subtitle: anime.subtitle,
        image: anime.coverImage,
        score: anime.rating,
        type: anime.type || "TV",
        status: "Plan to Watch",
        genres: anime.genres,
      });
    }
  };

  return (
    <div className="relative w-full h-[52vh] md:h-[62vh] min-h-[420px] max-h-[640px] flex items-end pb-10 md:pb-16 pt-20 px-6 md:px-12 group overflow-hidden bg-[#09090b]">
      {/* Cinematic Cover Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src={anime.coverImage || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&h=900&fit=crop"}
          alt={anime.title}
          className="w-full h-full object-cover object-center opacity-85 transition-transform duration-700 group-hover:scale-105"
        />
        {/* Minimal Dark Readability Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/40 to-transparent" />
      </div>

      {/* Hero Text Content */}
      <div className="relative z-10 max-w-2xl flex flex-col gap-3 md:gap-4">
        {/* Subtle Metadata Row */}
        <div className="flex items-center gap-2.5 text-xs font-medium text-white/70">
          {anime.type && (
            <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[11px] font-bold tracking-wide">
              {anime.type}
            </span>
          )}
          {anime.year && <span>{anime.year}</span>}
          {anime.rating && (
            <>
              <span className="w-1 h-1 rounded-full bg-white/40" />
              <span className="text-amber-400 font-bold">★ {anime.rating}</span>
            </>
          )}
          {anime.genres && anime.genres.length > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-white/40" />
              <span className="text-white/80 line-clamp-1">{anime.genres.slice(0, 3).join(" • ")}</span>
            </>
          )}
        </div>

        {/* Title */}
        <div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-bold tracking-tight text-white leading-tight">
            {anime.title}
          </h1>
          {anime.subtitle && (
            <p className="text-sm md:text-base font-normal text-white/70 mt-1 line-clamp-1">
              {anime.subtitle}
            </p>
          )}
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-white/80 line-clamp-2 md:line-clamp-3 max-w-xl font-normal leading-relaxed">
          {anime.description}
        </p>

        {/* Hero Actions */}
        <div className="flex items-center gap-3 mt-2">
          <Link
            to={watchLink}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 active:scale-95 transition-all cursor-pointer shadow-lg shadow-white/5"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Watch Now</span>
          </Link>

          <button
            onClick={handleToggleList}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border cursor-pointer active:scale-95",
              saved
                ? "bg-primary text-white border-primary"
                : "bg-white/10 hover:bg-white/15 text-white border-white/10"
            )}
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                <span>In My List</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>My List</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
