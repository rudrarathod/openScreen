import { Play, X, Clock, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useContinueWatching, ContinueWatchingItem } from "../../context/ContinueWatchingContext";
import { useMediaType } from "../../context/MediaTypeContext";
import { inferMediaType } from "../../context/WatchlistContext";
import { cn } from "../../utils/cn";
import { useMemo } from "react";

export default function ContinueWatchingSection() {
  const { history, removeFromHistory } = useContinueWatching();
  const { activeMediaType } = useMediaType();
  const navigate = useNavigate();

  const filteredHistory = useMemo(() => {
    if (!history) return [];
    return history.filter((item) => {
      const type = inferMediaType(item.animeId);
      return type === activeMediaType;
    });
  }, [history, activeMediaType]);

  const getRoutes = (item: ContinueWatchingItem) => {
    const idStr = String(item.animeId);
    if (idStr.startsWith("movie-")) {
      const actualId = idStr.replace("movie-", "");
      return {
        watchPath: `/watch/movie/${actualId}`,
        detailsPath: `/movie/${actualId}`,
        isMovie: true,
      };
    }

    const tvMatch = idStr.match(/^tv-(\d+)-s(\d+)$/);
    if (tvMatch) {
      const tvId = tvMatch[1];
      const season = tvMatch[2];
      return {
        watchPath: `/watch/tv/${tvId}/${season}/${item.epNumber}`,
        detailsPath: `/tv/${tvId}`,
        isMovie: false,
      };
    }

    return {
      watchPath: `/watch/${item.animeId}/${item.epNumber}`,
      detailsPath: `/anime/${item.animeId}`,
      isMovie: false,
    };
  };

  if (!filteredHistory || filteredHistory.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3 py-1 px-4 sm:px-6 md:px-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
            <Clock className="w-5 h-5" />
          </div>
          <h2 className="text-xl md:text-2xl font-display font-bold tracking-tight text-foreground">
            Continue Watching
          </h2>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-3.5 sm:gap-4 pb-3 pt-1 no-scrollbar scroll-smooth -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-12 md:px-12 scroll-pl-4 sm:scroll-pl-6 md:scroll-pl-12 snap-x snap-mandatory">
        {filteredHistory.map((item) => {
          const { watchPath, detailsPath, isMovie } = getRoutes(item);

          return (
            <div
              key={`${item.animeId}-${item.epNumber}`}
              className="group relative shrink-0 w-[240px] sm:w-[280px] md:w-[320px] bg-secondary/40 border border-border/40 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 flex flex-col"
            >
              {/* Image Container with aspect ratio */}
              <div 
                onClick={() => navigate(watchPath, { state: { streamType: item.streamType } })}
                className="relative aspect-video w-full overflow-hidden bg-black/60 cursor-pointer"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* Play Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 lg:group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 transform group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-current ml-0.5" />
                  </div>
                </div>

                {/* Episode & Stream Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                  {isMovie ? (
                    <span className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-white text-xs font-bold border border-white/10 shadow-sm">
                      Movie
                    </span>
                  ) : (
                    <>
                      <span className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-white text-xs font-bold border border-white/10 shadow-sm">
                        EP {item.epNumber}
                      </span>
                      {activeMediaType === "anime" && (
                        <span className="px-2 py-0.5 rounded-md bg-primary/90 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                          {item.streamType || "SUB"}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Remove button - visible on mobile/tablet, hover on desktop */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromHistory(item.animeId);
                  }}
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/70 hover:bg-destructive text-white/90 hover:text-white backdrop-blur-md flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all z-20 active:scale-90 touch-manipulation"
                  title="Remove from history"
                  aria-label="Remove from continue watching history"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Episode Progress Indicator */}
                {!isMovie && item.totalEps && item.totalEps > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                    <div
                      className="h-full bg-primary shadow-sm shadow-primary"
                      style={{ width: `${Math.min(100, Math.max(10, (item.epNumber / item.totalEps) * 100))}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Content Details */}
              <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
                <div className="flex flex-col gap-1 min-w-0">
                  <Link
                    to={detailsPath}
                    className="font-bold text-sm text-foreground line-clamp-1 hover:text-primary transition-colors"
                    title={item.subtitle ? `${item.title} (${item.subtitle})` : item.title}
                  >
                    {item.title}
                  </Link>
                  {item.subtitle && (
                    <p className="text-[11px] text-muted-foreground/80 line-clamp-1 font-normal">
                      {item.subtitle}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {isMovie ? "Full Movie" : (item.epTitle || `Episode ${item.epNumber}`)}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/30">
                  <button
                    onClick={() => navigate(watchPath, { state: { streamType: item.streamType } })}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isMovie ? "Resume Movie" : `Resume EP ${item.epNumber}`}</span>
                  </button>

                  <Link
                    to={detailsPath}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                  >
                    Details <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
