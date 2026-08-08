import { useParams, Link } from "react-router";
import { Play, Share2, Star, Clock, Calendar, Bookmark, Check, ChevronDown, Trash2, Film } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import {
  fetchMovieDetails,
  fetchMovieCredits,
  fetchPopularMovies,
  getTmdbImageUrl,
  mapTmdbMovieToProp,
  TmdbMovieDetails,
  TmdbCredit,
} from "../api/tmdb";
import { AnimeProp } from "../components/ui/AnimeCard";
import Carousel from "../components/ui/Carousel";
import { cn } from "../utils/cn";
import { useWatchlist, WatchlistStatus } from "../context/WatchlistContext";
import { WATCHLIST_STATUS_CONFIG } from "../utils/watchlistStatus";
import { AnimeDetailsSkeleton } from "../components/ui/Skeletons";

const STATUS_OPTIONS: WatchlistStatus[] = ["Watching", "Plan to Watch", "Completed", "On Hold", "Dropped"];

export default function MovieDetails() {
  const { id } = useParams();
  const [movie, setMovie] = useState<TmdbMovieDetails | null>(null);
  const [cast, setCast] = useState<TmdbCredit[]>([]);
  const [recommendations, setRecommendations] = useState<AnimeProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { addToWatchlist, removeFromWatchlist, getWatchlistItem, updateWatchlistStatus } = useWatchlist();

  const savedItem = id ? getWatchlistItem(id) : undefined;
  const isSaved = !!savedItem;

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);
      setError(null);
      setMovie(null);
      setCast([]);
      setRecommendations([]);
      window.scrollTo(0, 0);

      try {
        const [resDetails, resCredits, resPopular] = await Promise.all([
          fetchMovieDetails(id),
          fetchMovieCredits(id).catch(() => []),
          fetchPopularMovies(1).catch(() => []),
        ]);

        setMovie(resDetails);
        setCast(resCredits.slice(0, 12));
        const recProps = resPopular
          .filter((m) => String(m.id) !== String(id))
          .slice(0, 15)
          .map(mapTmdbMovieToProp);
        setRecommendations(recProps);
      } catch (err: any) {
        console.error("Failed to load movie details:", err);
        setError("Failed to load movie details. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectStatus = (status: WatchlistStatus) => {
    if (!movie) return;
    if (isSaved) {
      updateWatchlistStatus(movie.id, status);
    } else {
      addToWatchlist({
        id: movie.id,
        title: movie.title,
        subtitle: movie.tagline || movie.release_date?.substring(0, 4) || "Movie",
        image: getTmdbImageUrl(movie.poster_path, "w500"),
        score: movie.vote_average ? movie.vote_average.toFixed(1) : undefined,
        type: "Movie",
        mediaType: "movie",
        status,
        totalEps: 1,
        genres: movie.genres.map((g) => g.name),
      });
    }
    setShowStatusMenu(false);
  };

  const handleRemove = () => {
    if (!movie) return;
    removeFromWatchlist(movie.id);
    setShowStatusMenu(false);
  };

  const handleShare = () => {
    if (!movie) return;
    if (navigator.share) {
      navigator.share({ title: movie.title, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <AnimeDetailsSkeleton />;
  }

  if (error || !movie) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[60vh] gap-4">
        <Film className="w-12 h-12 text-muted-foreground opacity-50" />
        <p className="text-destructive font-medium">{error || "Movie not found"}</p>
        <Link to="/" className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold">
          Return Home
        </Link>
      </div>
    );
  }

  const releaseYear = movie.release_date ? movie.release_date.substring(0, 4) : "";
  const runtimeFormatted = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : "";

  const savedStatus = savedItem?.status || "Plan to Watch";
  const statusCfg = WATCHLIST_STATUS_CONFIG[savedStatus];

  return (
    <div className="flex flex-col pb-20 min-h-screen bg-[#09090b]">
      {/* Content */}
      <div className="px-4 sm:px-6 md:px-12 pt-6 md:pt-10 flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto w-full">
        {/* Header row: poster + primary info side by side */}
        <div className="flex items-end gap-4 md:gap-8">
          {/* Poster */}
          <div className="w-24 sm:w-32 md:w-[240px] shrink-0">
            <div className="aspect-[2/3] rounded-xl md:rounded-2xl overflow-hidden shadow-2xl shadow-primary/20 md:shadow-primary/10 border border-white/10 relative group bg-secondary">
              <img
                src={getTmdbImageUrl(movie.poster_path, "w500")}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Primary info */}
          <div className="flex flex-col gap-1 md:gap-2 flex-1 min-w-0 pb-1 md:pb-6 text-left">
            <span className="px-2.5 py-1 rounded-md bg-primary/20 text-primary text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 inline-block w-fit">
              Movie
            </span>
            <h1 className="text-xl sm:text-3xl md:text-5xl font-display font-bold tracking-tight text-white text-balance leading-tight">
              {movie.title}
            </h1>
            {movie.tagline && (
              <p className="text-xs sm:text-base md:text-xl text-muted-foreground font-medium italic">
                "{movie.tagline}"
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs md:text-sm font-medium mt-1 text-white/80">
              {movie.vote_average > 0 && (
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" />
                  <span>{movie.vote_average.toFixed(1)}</span>
                </div>
              )}
              {runtimeFormatted && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span>{runtimeFormatted}</span>
                </div>
              )}
              {releaseYear && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span>{releaseYear}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Genres */}
        {movie.genres && movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {movie.genres.map((g) => (
              <span
                key={g.id}
                className="px-3 py-1 rounded-full glass text-xs md:text-sm text-white/90 border border-white/10"
              >
                {g.name}
              </span>
            ))}
          </div>
        )}

        {/* Synopsis */}
        {movie.overview && (
          <div className="flex flex-col items-start gap-1">
            <p
              className={cn(
                "text-sm md:text-base text-foreground/80 leading-relaxed max-w-3xl transition-all",
                !isDescExpanded && "line-clamp-3 md:line-clamp-4"
              )}
            >
              {movie.overview}
            </p>
            {movie.overview.length > 180 && (
              <button
                onClick={() => setIsDescExpanded(!isDescExpanded)}
                className="text-primary font-medium text-sm lg:hover:text-primary/80 transition-colors focus:outline-none cursor-pointer"
              >
                {isDescExpanded ? "Show Less" : "Read More"}
              </button>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 relative">
          <Link
            to={`/watch/movie/${movie.id}`}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 md:px-8 py-3.5 rounded-xl bg-primary lg:hover:bg-primary/90 active:scale-95 text-primary-foreground font-semibold transition-all shadow-lg shadow-primary/25 touch-manipulation min-h-[48px]"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Watch Movie</span>
          </Link>

          {/* Watchlist button with dropdown menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowStatusMenu((prev) => !prev)}
              className={cn(
                "h-12 md:h-[50px] px-4 md:px-6 rounded-xl flex items-center justify-center gap-2 transition-all font-semibold border active:scale-95 touch-manipulation min-h-[48px] shadow-lg cursor-pointer",
                isSaved
                  ? statusCfg.bgClass + " border-transparent"
                  : "glass border-white/10 lg:hover:bg-secondary text-foreground"
              )}
            >
              <Bookmark className="w-5 h-5" />
              <span>{isSaved ? savedStatus : "Add to List"}</span>
              <ChevronDown className="w-4 h-4 opacity-70" />
            </button>

            {showStatusMenu && (
              <div className="absolute top-full left-0 mt-2 min-w-[180px] glass-panel border border-white/10 rounded-xl p-1.5 shadow-2xl z-50 backdrop-blur-xl animate-in fade-in duration-150">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-white/5 mb-1">
                  Set Watchlist Status
                </div>
                {STATUS_OPTIONS.map((st) => {
                  const cfg = WATCHLIST_STATUS_CONFIG[st];
                  const StIcon = cfg.icon;
                  const isCurrent = savedStatus === st && isSaved;
                  return (
                    <button
                      key={st}
                      onClick={() => handleSelectStatus(st)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all mb-0.5 last:mb-0 cursor-pointer",
                        isCurrent ? cfg.badgeClass + " font-extrabold" : "text-foreground hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <StIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{st}</span>
                      </div>
                      {isCurrent && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}

                {isSaved && (
                  <button
                    onClick={handleRemove}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-all border-t border-white/5 mt-1 pt-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Remove From List</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="p-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 active:scale-95 transition-all cursor-pointer h-12 md:h-[50px] w-12 md:w-[50px] flex items-center justify-center shadow-lg"
            title="Share Movie"
          >
            <Share2 className="w-5 h-5" />
          </button>
          {copied && <span className="text-xs text-emerald-400 font-semibold animate-pulse ml-2">Link Copied!</span>}
        </div>

        {/* Cast Members */}
        {cast.length > 0 && (
          <div className="flex flex-col gap-4 mt-4">
            <h2 className="text-xl font-bold text-white tracking-tight">Top Cast</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {cast.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl glass border border-white/5 hover:bg-white/10 transition-colors"
                >
                  <img
                    src={getTmdbImageUrl(c.profile_path, "w300")}
                    alt={c.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0 bg-secondary"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{c.name}</p>
                    {c.character && <p className="text-[11px] text-muted-foreground truncate">{c.character}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-4 border-t border-white/5 pt-6">
            <Carousel title="Popular Movies You Might Like" items={recommendations} layout="portrait" />
          </div>
        )}
      </div>
    </div>
  );
}
