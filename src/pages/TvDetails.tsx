import { useParams, Link, useNavigate } from "react-router";
import { Play, Share2, Star, Clock, Calendar, Bookmark, Check, ChevronDown, Trash2, Tv, Film } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import {
  fetchTvDetails,
  fetchTvCredits,
  fetchPopularTv,
  fetchTvSeason,
  getTmdbImageUrl,
  mapTmdbTvToProp,
  TmdbTvDetails,
  TmdbCredit,
  TmdbSeasonDetails,
} from "../api/tmdb";
import { AnimeProp } from "../components/ui/AnimeCard";
import Carousel from "../components/ui/Carousel";
import { cn } from "../utils/cn";
import { useWatchlist, WatchlistStatus } from "../context/WatchlistContext";
import { WATCHLIST_STATUS_CONFIG } from "../utils/watchlistStatus";
import { AnimeDetailsSkeleton, EpisodeGridSkeleton } from "../components/ui/Skeletons";
import { useContinueWatching } from "../context/ContinueWatchingContext";

const STATUS_OPTIONS: WatchlistStatus[] = ["Watching", "Plan to Watch", "Completed", "On Hold", "Dropped"];

export default function TvDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tv, setTv] = useState<TmdbTvDetails | null>(null);
  const [cast, setCast] = useState<TmdbCredit[]>([]);
  const [recommendations, setRecommendations] = useState<AnimeProp[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [seasonData, setSeasonData] = useState<TmdbSeasonDetails | null>(null);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const seasonMenuRef = useRef<HTMLDivElement>(null);
  const [showSeasonMenu, setShowSeasonMenu] = useState(false);

  const { addToWatchlist, removeFromWatchlist, getWatchlistItem, updateWatchlistStatus } = useWatchlist();
  const { isEpisodeWatched, getEpisodeProgress, toggleEpisodeWatched } = useContinueWatching();

  const savedItem = id ? getWatchlistItem(id) : undefined;
  const isSaved = !!savedItem;

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);
      setError(null);
      setTv(null);
      setCast([]);
      setRecommendations([]);
      setSelectedSeason(1);
      window.scrollTo(0, 0);

      try {
        const [resDetails, resCredits, resPopular] = await Promise.all([
          fetchTvDetails(id),
          fetchTvCredits(id).catch(() => []),
          fetchPopularTv(1).catch(() => []),
        ]);

        setTv(resDetails);
        setCast(resCredits.slice(0, 12));
        const recProps = resPopular
          .filter((t) => String(t.id) !== String(id))
          .slice(0, 15)
          .map(mapTmdbTvToProp);
        setRecommendations(recProps);

        // First available season number
        const validSeasons = (resDetails.seasons || []).filter((s) => s.season_number > 0);
        const initialSeasonNum = validSeasons.length > 0 ? validSeasons[0].season_number : 1;
        setSelectedSeason(initialSeasonNum);
      } catch (err: any) {
        console.error("Failed to load TV details:", err);
        setError("Failed to load TV series details. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  // Load Season episodes whenever selectedSeason changes
  useEffect(() => {
    async function loadSeason() {
      if (!id || !selectedSeason) return;
      setSeasonLoading(true);
      try {
        const data = await fetchTvSeason(id, selectedSeason);
        setSeasonData(data);
      } catch (err) {
        console.error("Failed to load season details:", err);
        setSeasonData(null);
      } finally {
        setSeasonLoading(false);
      }
    }
    loadSeason();
  }, [id, selectedSeason]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false);
      }
      if (seasonMenuRef.current && !seasonMenuRef.current.contains(e.target as Node)) {
        setShowSeasonMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectStatus = (status: WatchlistStatus) => {
    if (!tv) return;
    if (isSaved) {
      updateWatchlistStatus(tv.id, status);
    } else {
      addToWatchlist({
        id: tv.id,
        title: tv.name,
        subtitle: tv.tagline || tv.first_air_date?.substring(0, 4) || "TV Series",
        image: getTmdbImageUrl(tv.poster_path, "w500"),
        score: tv.vote_average ? tv.vote_average.toFixed(1) : undefined,
        type: "TV",
        mediaType: "tv",
        status,
        totalEps: tv.number_of_episodes || 12,
        genres: tv.genres.map((g) => g.name),
      });
    }
    setShowStatusMenu(false);
  };

  const handleRemove = () => {
    if (!tv) return;
    removeFromWatchlist(tv.id);
    setShowStatusMenu(false);
  };

  const handleShare = () => {
    if (!tv) return;
    if (navigator.share) {
      navigator.share({ title: tv.name, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <AnimeDetailsSkeleton />;
  }

  if (error || !tv) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center min-h-[60vh] gap-4">
        <Tv className="w-12 h-12 text-muted-foreground opacity-50" />
        <p className="text-destructive font-medium">{error || "TV series not found"}</p>
        <Link to="/" className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold">
          Return Home
        </Link>
      </div>
    );
  }

  const firstAirYear = tv.first_air_date ? tv.first_air_date.substring(0, 4) : "";
  const seasonsList = (tv.seasons || []).filter((s) => s.season_number > 0);

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
                src={getTmdbImageUrl(tv.poster_path, "w500")}
                alt={tv.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Primary info */}
          <div className="flex flex-col gap-1 md:gap-2 flex-1 min-w-0 pb-1 md:pb-6 text-left">
            <span className="px-2.5 py-1 rounded-md bg-primary/20 text-primary text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 inline-block w-fit">
              TV Series
            </span>
            <h1 className="text-xl sm:text-3xl md:text-5xl font-display font-bold tracking-tight text-white text-balance leading-tight">
              {tv.name}
            </h1>
            {tv.tagline && (
              <p className="text-xs sm:text-base md:text-xl text-muted-foreground font-medium italic">
                "{tv.tagline}"
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs md:text-sm font-medium mt-1 text-white/80">
              {tv.vote_average > 0 && (
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" />
                  <span>{tv.vote_average.toFixed(1)}</span>
                </div>
              )}
              {firstAirYear && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span>{firstAirYear}</span>
                </div>
              )}
              {tv.number_of_seasons && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Tv className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span>
                    {tv.number_of_seasons} {tv.number_of_seasons === 1 ? "Season" : "Seasons"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Genres */}
        {tv.genres && tv.genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tv.genres.map((g) => (
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
        {tv.overview && (
          <div className="flex flex-col items-start gap-1">
            <p
              className={cn(
                "text-sm md:text-base text-foreground/80 leading-relaxed max-w-3xl transition-all",
                !isDescExpanded && "line-clamp-3 md:line-clamp-4"
              )}
            >
              {tv.overview}
            </p>
            {tv.overview.length > 180 && (
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
            to={`/watch/tv/${tv.id}/${selectedSeason}/1`}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 md:px-8 py-3.5 rounded-xl bg-primary lg:hover:bg-primary/90 active:scale-95 text-primary-foreground font-semibold transition-all shadow-lg shadow-primary/25 touch-manipulation min-h-[48px]"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Start Watching</span>
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
            title="Share Series"
          >
            <Share2 className="w-5 h-5" />
          </button>
          {copied && <span className="text-xs text-emerald-400 font-semibold animate-pulse ml-2">Link Copied!</span>}
        </div>

        {/* Seasons & Episodes Section */}
        <div className="flex flex-col gap-6 border-t border-white/5 pt-6">
          <div className="flex items-center justify-between gap-4 flex-wrap border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white tracking-tight">Episodes</h2>

            {/* Custom Season Selector Dropdown */}
            {seasonsList.length > 0 && (
              <div className="relative flex items-center gap-2" ref={seasonMenuRef}>
                <span className="text-xs text-muted-foreground font-semibold">Season:</span>
                <button
                  onClick={() => setShowSeasonMenu((p) => !p)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer select-none h-[34px] shadow-sm"
                >
                  <span>Season {selectedSeason}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>

                {showSeasonMenu && (
                  <div className="absolute top-full right-0 mt-2 min-w-[200px] glass-panel border border-white/10 rounded-xl p-1.5 shadow-2xl z-50 backdrop-blur-xl animate-in fade-in duration-150 max-h-[250px] overflow-y-auto scrollbar-thin">
                    {seasonsList.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedSeason(s.season_number);
                          setShowSeasonMenu(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all mb-0.5 last:mb-0 cursor-pointer",
                          selectedSeason === s.season_number
                            ? "bg-primary text-white font-extrabold"
                            : "text-foreground hover:bg-white/10"
                        )}
                      >
                        <span>Season {s.season_number} ({s.episode_count} eps)</span>
                        {selectedSeason === s.season_number && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Episode List */}
          {seasonLoading ? (
            <EpisodeGridSkeleton />
          ) : seasonData && seasonData.episodes && seasonData.episodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {seasonData.episodes.map((ep) => {
                const trackingKey = `tv-${tv.id}-s${selectedSeason}`;
                const isWatched = isEpisodeWatched(trackingKey, ep.episode_number);
                const progress = getEpisodeProgress(trackingKey, ep.episode_number);

                return (
                  <div
                    key={ep.id}
                    className={cn(
                      "group flex items-center justify-between gap-3 p-3 rounded-xl glass border transition-all active:bg-secondary/40 touch-manipulation",
                      isWatched
                        ? "border-primary/30 bg-primary/5 hover:border-primary/50"
                        : "border-transparent hover:border-border/60 hover:bg-secondary/50"
                    )}
                  >
                    <Link
                      to={`/watch/tv/${tv.id}/${selectedSeason}/${ep.episode_number}`}
                      className="flex items-center gap-3 min-w-0 flex-1"
                    >
                      <div className="relative w-28 aspect-video rounded-lg overflow-hidden shrink-0 bg-secondary flex items-center justify-center">
                        {ep.still_path ? (
                          <img
                            src={getTmdbImageUrl(ep.still_path, "w300")}
                            alt={ep.name}
                            className={cn(
                              "w-full h-full object-cover transition-transform duration-500 lg:group-hover:scale-105",
                              isWatched ? "opacity-75" : "opacity-100"
                            )}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/35">
                            <Film className="w-6 h-6" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/25 lg:group-hover:bg-black/45 transition-colors flex items-center justify-center">
                          <Play className="w-5 h-5 text-white opacity-85 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity fill-current z-10" />
                        </div>
                        <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[9px] font-bold text-white uppercase tracking-wider z-10">
                          EP {ep.episode_number}
                        </span>

                        {/* Visual Progress Bar at bottom of thumbnail */}
                        {(isWatched || progress > 0) && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/70 z-20 overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300 shadow-sm"
                              style={{ width: `${progress > 0 ? progress : 100}%` }}
                            />
                          </div>
                        )}

                        {/* Top-Right Watched Check Badge */}
                        {isWatched && (
                          <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-md z-20 animate-in zoom-in-50 duration-200" title="Watched">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn("text-xs font-semibold", isWatched ? "text-primary" : "text-muted-foreground")}>
                            Episode {ep.episode_number}
                          </span>
                          {ep.runtime && (
                            <span className="text-[10px] text-muted-foreground/60 font-medium">
                              {ep.runtime}m
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-medium line-clamp-1 mt-0.5 lg:group-hover:text-primary transition-colors text-white" title={ep.name}>
                          {ep.name || `Episode ${ep.episode_number}`}
                        </h3>
                        {ep.overview && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 leading-relaxed">
                            {ep.overview}
                          </p>
                        )}
                      </div>
                    </Link>

                    {/* Mark Watched Toggle Button */}
                    <div className="flex items-center shrink-0 ml-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleEpisodeWatched(trackingKey, ep.episode_number);
                        }}
                        title={isWatched ? "Mark as unwatched" : "Mark as watched"}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all border touch-manipulation min-h-[36px] min-w-[36px] cursor-pointer",
                          isWatched
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30"
                            : "bg-secondary/60 text-muted-foreground border-border/40 hover:text-foreground hover:bg-secondary"
                        )}
                      >
                        <Check className={cn("w-4 h-4", isWatched ? "stroke-[3]" : "opacity-60")} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No episode details available for this season.
            </div>
          )}
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
            <Carousel title="Popular TV Shows You Might Like" items={recommendations} layout="portrait" />
          </div>
        )}
      </div>
    </div>
  );
}
