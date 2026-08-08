import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { Play, Star, Bookmark, Check, Plus, Trash2 } from "lucide-react";
import { cn } from "../../utils/cn";
import { useWatchlist } from "../../context/WatchlistContext";
import { WATCHLIST_STATUS_CONFIG, ALL_WATCHLIST_STATUSES } from "../../utils/watchlistStatus";
import { formatAgeRating } from "../../utils/rating";

import { useMediaType } from "../../context/MediaTypeContext";

export interface AnimeProp {
  id: string | number;
  title: string;
  subtitle?: string;
  image: string;
  score?: number | string;
  type?: string;
  mediaType?: "anime" | "movie" | "tv";
  episode?: number;
  genres?: string[];
  status?: string;
  rating?: string;
}

interface AnimeCardProps {
  anime: AnimeProp;
  layout?: "portrait" | "landscape";
  className?: string;
}

export default function AnimeCard({ anime, layout = "portrait", className }: AnimeCardProps) {
  const { activeMediaType } = useMediaType();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist, getWatchlistItem, updateWatchlistStatus } = useWatchlist();
  const saved = isInWatchlist(anime.id);
  const watchlistItem = getWatchlistItem(anime.id);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const effectiveMediaType = anime.mediaType || (activeMediaType === "movie" ? "movie" : activeMediaType === "tv" ? "tv" : "anime");
  const targetPath = effectiveMediaType === "movie" ? `/movie/${anime.id}` : effectiveMediaType === "tv" ? `/tv/${anime.id}` : `/anime/${anime.id}`;

  // Current status config or fallback
  const currentStatus = watchlistItem?.status || "Plan to Watch";
  const statusConfig = WATCHLIST_STATUS_CONFIG[currentStatus];
  const StatusIcon = statusConfig?.icon || Bookmark;

  // Formatted age rating badge
  const effectiveRating = anime.rating || (() => {
    const genres = (anime.genres || []).map((g) => g.toLowerCase());
    if (genres.includes("hentai") || genres.includes("erotica")) return "18+";
    if (genres.includes("ecchi") || genres.includes("horror") || genres.includes("thriller")) return "R-17+";
    if (genres.includes("kids")) return "PG";
    return (anime.type || "").toUpperCase() === "MOVIE" ? "PG-13" : "TV-14";
  })();
  const ratingBadge = formatAgeRating(effectiveRating);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleIndicatorClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!saved) {
      // First click adds to watchlist as Plan to Watch
      addToWatchlist({
        id: anime.id,
        title: anime.title,
        subtitle: anime.subtitle,
        image: anime.image,
        score: anime.score,
        type: anime.type,
        status: "Plan to Watch",
        genres: anime.genres,
      });
    } else {
      // Toggle status dropdown menu
      setShowMenu((prev) => !prev);
    }
  };

  if (layout === "landscape") {
    return (
      <Link 
        to={targetPath} 
        className={cn(
          "group relative flex flex-col gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background active:scale-[0.98] transition-all touch-manipulation",
          className
        )}
      >
        <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary">
          <img 
            src={anime.image} 
            alt={anime.title} 
            className="w-full h-full object-cover transition-transform duration-500 lg:group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/20 lg:group-hover:bg-black/40 transition-colors" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-12 h-12 rounded-full bg-primary/90 text-white flex items-center justify-center backdrop-blur-md scale-90 lg:group-hover:scale-100 transition-transform duration-300 shadow-xl shadow-primary/20">
              <Play className="w-6 h-6 fill-current translate-x-0.5" />
            </div>
          </div>

          {/* Top right Indicator button */}
          <div className="absolute top-2 right-2 z-20">
            <button
              onClick={handleIndicatorClick}
              aria-label={saved ? `Watchlist: ${currentStatus}` : "Add to Watchlist"}
              title={saved ? `Watchlist: ${currentStatus} (Click to change)` : "Add to Watchlist"}
              className={cn(
                "w-9 h-9 rounded-full backdrop-blur-md transition-all flex items-center justify-center active:scale-90 touch-manipulation border shadow-md",
                saved
                  ? statusConfig.bgClass
                  : "bg-black/70 text-white/90 hover:text-white hover:bg-black/90 border-white/20 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
              )}
            >
              {saved ? <StatusIcon className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>

            {/* Quick Status Menu */}
            {showMenu && (
              <div
                ref={menuRef}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                className="absolute top-11 right-0 z-30 min-w-[160px] glass-panel border border-white/10 rounded-xl p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-white/5 mb-1">
                  Watchlist Status
                </div>
                {ALL_WATCHLIST_STATUSES.map((st) => {
                  const cfg = WATCHLIST_STATUS_CONFIG[st];
                  const StIcon = cfg.icon;
                  const isCurrent = watchlistItem?.status === st;
                  return (
                    <button
                      key={st}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        updateWatchlistStatus(anime.id, st);
                        setShowMenu(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all mb-0.5 last:mb-0 cursor-pointer",
                        isCurrent
                          ? cfg.badgeClass + " font-extrabold"
                          : "text-foreground hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <StIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{st}</span>
                      </div>
                      {isCurrent && <Check className="w-3 h-3 text-current shrink-0" />}
                    </button>
                  );
                })}

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeFromWatchlist(anime.id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-all border-t border-white/5 mt-1 pt-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>
          
          <div className="absolute bottom-2 left-2 flex gap-2">
            {anime.episode && (
              <span className="px-2 py-1 rounded-md bg-black/70 backdrop-blur-md text-white text-[10px] font-bold border border-white/10 shadow-sm">
                EP {anime.episode}
              </span>
            )}
          </div>
        </div>
        <div className="px-1 min-w-0">
          <h3 className="font-medium text-sm line-clamp-1 lg:group-hover:text-primary transition-colors">{anime.title}</h3>
          {anime.subtitle ? (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 font-normal">{anime.subtitle}</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              Continue Watching
            </p>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link 
      to={targetPath} 
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background active:scale-[0.98] transition-all touch-manipulation",
        className
      )}
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-secondary shadow-lg">
        <img 
          src={anime.image} 
          alt={anime.title} 
          className="w-full h-full object-cover transition-transform duration-500 lg:group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-80 lg:group-hover:opacity-100 transition-opacity" />
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-primary/90 text-white flex items-center justify-center backdrop-blur-md scale-90 lg:group-hover:scale-100 transition-transform duration-300 shadow-xl shadow-primary/20">
            <Play className="w-6 h-6 fill-current translate-x-0.5" />
          </div>
        </div>

        {/* Top left Watchlist Status Indicator button */}
        <div className="absolute top-2.5 left-2.5 z-20">
          <button
            onClick={handleIndicatorClick}
            aria-label={saved ? `Watchlist: ${currentStatus}` : "Add to Watchlist"}
            title={saved ? `Watchlist: ${currentStatus} (Click to change)` : "Add to Watchlist"}
            className={cn(
              "w-9 h-9 rounded-full backdrop-blur-md transition-all flex items-center justify-center active:scale-90 touch-manipulation border shadow-md",
              saved
                ? statusConfig.bgClass
                : "bg-black/70 text-white/90 hover:text-white hover:bg-black/90 border-white/20 opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
            )}
          >
            {saved ? <StatusIcon className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>

          {/* Quick Status Dropdown Menu */}
          {showMenu && (
            <div
              ref={menuRef}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="absolute top-11 left-0 z-30 min-w-[160px] glass-panel border border-white/10 rounded-xl p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-white/5 mb-1">
                Watchlist Status
              </div>
              {ALL_WATCHLIST_STATUSES.map((st) => {
                const cfg = WATCHLIST_STATUS_CONFIG[st];
                const StIcon = cfg.icon;
                const isCurrent = watchlistItem?.status === st;
                return (
                  <button
                    key={st}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      updateWatchlistStatus(anime.id, st);
                      setShowMenu(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all mb-0.5 last:mb-0 cursor-pointer",
                      isCurrent
                        ? cfg.badgeClass + " font-extrabold"
                        : "text-foreground hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <StIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>{st}</span>
                    </div>
                    {isCurrent && <Check className="w-3 h-3 text-current shrink-0" />}
                  </button>
                );
              })}

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeFromWatchlist(anime.id);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-all border-t border-white/5 mt-1 pt-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Remove</span>
              </button>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end z-10 pointer-events-none">
          {anime.score && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-amber-400 text-[10px] font-bold border border-white/10 shadow-sm">
              <Star className="w-3 h-3 fill-current" />
              <span>{anime.score}</span>
            </div>
          )}
        </div>
        
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 flex-wrap max-w-[85%] pointer-events-none z-10">
          {anime.type && (
            <span className="px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider shadow-md">
              {anime.type}
            </span>
          )}
          {ratingBadge && (
            <span
              title={ratingBadge.full}
              className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider shadow-md border backdrop-blur-md",
                ratingBadge.badgeClass
              )}
            >
              {ratingBadge.short}
            </span>
          )}
        </div>
      </div>
      <div className="px-1 min-w-0">
        <h3 className="font-medium text-sm md:text-base leading-tight line-clamp-1 lg:group-hover:text-primary transition-colors">
          {anime.title}
        </h3>
        {anime.subtitle && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 font-normal">
            {anime.subtitle}
          </p>
        )}
      </div>
    </Link>
  );
}
