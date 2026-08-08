import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Star, Calendar, RefreshCw, AlertCircle, Sparkles, Film, Clock } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { fetchMovieDetails, getTmdbImageUrl, TmdbMovieDetails } from "../api/tmdb";
import { Skeleton } from "../components/ui/Skeletons";
import { useWatchlist } from "../context/WatchlistContext";
import { useContinueWatching } from "../context/ContinueWatchingContext";
import { ServerSelector, ServerId, getMovieEmbedUrl } from "../components/ui/ServerSelector";
import { cn } from "../utils/cn";

export default function MoviePlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<TmdbMovieDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Server selection state
  const [currentServer, setCurrentServer] = useState<ServerId>("vidsrc");
  const [failedServers, setFailedServers] = useState<ServerId[]>([]);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [bothFailed, setBothFailed] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  const { syncWatchlistProgress } = useWatchlist();
  const { saveContinueWatching } = useContinueWatching();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadMovie() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const details = await fetchMovieDetails(id);
        setMovie(details);

        // Update Watchlist Progress
        syncWatchlistProgress({
          id: details.id,
          title: details.title,
          subtitle: details.release_date?.substring(0, 4) || "Movie",
          image: getTmdbImageUrl(details.poster_path, "w500"),
          score: details.vote_average ? details.vote_average.toFixed(1) : undefined,
          type: "Movie",
          mediaType: "movie",
          epNumber: 1,
          totalEps: 1,
        });

        saveContinueWatching({
          animeId: `movie-${details.id}`,
          title: details.title,
          subtitle: details.release_date?.substring(0, 4) || "Movie",
          image: getTmdbImageUrl(details.poster_path, "w500"),
          epNumber: 1,
          epTitle: "Full Movie",
          totalEps: 1,
          progress: 100,
        });
      } catch (err) {
        console.error("Failed to load movie for player:", err);
        setError("Failed to load movie player metadata.");
      } finally {
        setLoading(false);
      }
    }
    loadMovie();
  }, [id, syncWatchlistProgress, saveContinueWatching]);

  // VidLink message listener for watch progress
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://vidlink.pro") return;

      try {
        if (event.data?.type === "MEDIA_DATA" && id) {
          const mediaData = event.data.data;
          if (mediaData) {
            localStorage.setItem(`vidlink_movie_${id}`, JSON.stringify(mediaData));
          }
        }
      } catch (e) {
        // Ignore message errors
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [id]);

  const handleServerFailure = useCallback((serverToFail: ServerId) => {
    setFailedServers((prev) => {
      if (prev.includes(serverToFail)) return prev;
      const nextFailed = [...prev, serverToFail];
      const otherServer: ServerId = serverToFail === "vidsrc" ? "vidlink" : "vidsrc";

      if (!nextFailed.includes(otherServer)) {
        setCurrentServer(otherServer);
        const failedName = serverToFail === "vidsrc" ? "VidSrc" : "VidLink";
        const fallbackName = otherServer === "vidsrc" ? "VidSrc" : "VidLink";
        setFallbackNotice(`${failedName} server failed or timed out. Automatically switched to ${fallbackName}.`);
        setBothFailed(false);
      } else {
        setBothFailed(true);
        setFallbackNotice("Media failed to stream on both VidSrc and VidLink servers.");
      }
      return nextFailed;
    });
  }, []);

  // Handle iframe load & timeout monitoring
  useEffect(() => {
    setIframeLoading(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      if (!bothFailed) {
        handleServerFailure(currentServer);
      }
    }, 12000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentServer, id, bothFailed, handleServerFailure]);

  const handleIframeLoad = () => {
    setIframeLoading(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleIframeError = () => {
    setIframeLoading(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    handleServerFailure(currentServer);
  };

  const handleManualServerChange = (serverId: ServerId) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCurrentServer(serverId);
    setBothFailed(false);
    setIframeLoading(true);
    setFallbackNotice(null);
  };

  const handleManualSwitchFallback = () => {
    const otherServer: ServerId = currentServer === "vidsrc" ? "vidlink" : "vidsrc";
    handleManualServerChange(otherServer);
  };

  if (!id) {
    return <div className="p-12 text-center text-muted-foreground">Invalid Movie ID</div>;
  }

  const embedUrl = getMovieEmbedUrl(currentServer, id);

  return (
    <div className="flex w-full min-h-screen bg-background text-foreground flex-col">
      {/* Top Header Bar (Matching VideoPlayer) */}
      <div className="flex-shrink-0 h-16 flex items-center justify-between px-4 gap-4 bg-background/95 backdrop-blur border-b border-border/40 z-40 sticky top-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(`/movie/${id}`)}
            className="w-11 h-11 rounded-full lg:hover:bg-secondary active:scale-90 flex items-center justify-center transition-all shrink-0 touch-manipulation cursor-pointer"
            title="Back to Details"
            aria-label="Back to Details"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-base sm:text-lg truncate">
              {movie ? movie.title : "Loading Movie..."}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Movie Stream {movie?.release_date ? `• ${movie.release_date.substring(0, 4)}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate(`/movie/${id}`)}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 transition-all border border-border/50 cursor-pointer"
          >
            <span>Movie Details</span>
          </button>
          <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-primary/20 text-primary uppercase tracking-wider">
            Movie
          </span>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
        {/* Video Player Box */}
        <div className="w-full aspect-video bg-black shrink-0 relative border-b border-border/40 shadow-2xl overflow-hidden flex items-center justify-center">
          {bothFailed ? (
            <div className="flex flex-col items-center justify-center text-center p-6 gap-4 z-20">
              <AlertCircle className="w-12 h-12 text-amber-500 animate-bounce" />
              <div className="max-w-md">
                <h3 className="text-lg font-bold text-white mb-1">Streaming Unavailable</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Both VidSrc and VidLink servers failed to load stream for this movie. Try switching servers below or retrying.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-center mt-2">
                <button
                  onClick={() => handleManualServerChange("vidsrc")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry VidSrc
                </button>
                <button
                  onClick={() => handleManualServerChange("vidlink")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry VidLink
                </button>
              </div>
            </div>
          ) : (
            <>
              {iframeLoading && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-semibold text-white/80">
                    Loading stream via <span className="text-primary font-bold">{currentServer === "vidsrc" ? "VidSrc" : "VidLink"}</span>...
                  </p>
                </div>
              )}
              <iframe
                key={`${id}-${currentServer}`}
                src={embedUrl}
                title={movie?.title || "Movie Player"}
                className="w-full h-full border-0"
                style={{ width: "100%", height: "100%", border: "none" }}
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            </>
          )}
        </div>

        {/* Audio & Server Controls Bar (Matching VideoPlayer) */}
        <div className="px-4 py-3 bg-secondary/30 border-b border-border/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-secondary text-foreground font-semibold text-xs border border-border/40">
              1080p HD
            </span>

            {/* Server Selector Component */}
            <ServerSelector
              currentServer={currentServer}
              onSelectServer={handleManualServerChange}
              failedServers={failedServers}
              fallbackNotice={fallbackNotice}
              onClearNotice={() => setFallbackNotice(null)}
            />
          </div>

          {!bothFailed && (
            <button
              onClick={handleManualSwitchFallback}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-semibold cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Switch Server</span>
            </button>
          )}
        </div>

        {/* Movie Info Section */}
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl w-full mx-auto flex flex-col gap-6">
          {loading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : movie ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Poster Card */}
                {movie.poster_path && (
                  <div className="w-32 sm:w-40 aspect-[2/3] rounded-2xl overflow-hidden bg-secondary border border-border/40 shadow-xl shrink-0 hidden sm:block">
                    <img
                      src={getTmdbImageUrl(movie.poster_path, "w500")}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                        {movie.title}
                      </h2>
                      {movie.tagline && (
                        <p className="text-sm text-muted-foreground italic mt-0.5">{movie.tagline}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      {movie.vote_average > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-sm">
                          <Star className="w-4 h-4 fill-current" />
                          <span>{movie.vote_average.toFixed(1)}</span>
                        </div>
                      )}
                      {movie.release_date && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2.5 py-1 rounded-lg bg-secondary border border-border/40">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{movie.release_date.substring(0, 4)}</span>
                        </div>
                      )}
                      {movie.runtime && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2.5 py-1 rounded-lg bg-secondary border border-border/40">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{movie.runtime} min</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {movie.genres && movie.genres.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {movie.genres.map((g) => (
                        <span
                          key={g.id}
                          className="px-2.5 py-1 rounded-lg bg-secondary/80 text-foreground text-xs font-medium border border-border/40"
                        >
                          {g.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {movie.overview && (
                    <div className="flex flex-col items-start gap-1 mt-2">
                      <p
                        className={cn(
                          "text-foreground/80 leading-relaxed text-sm sm:text-base transition-all",
                          !isDescExpanded && "line-clamp-3"
                        )}
                      >
                        {movie.overview}
                      </p>
                      {movie.overview.length > 150 && (
                        <button
                          onClick={() => setIsDescExpanded(!isDescExpanded)}
                          className="text-primary font-semibold text-xs sm:text-sm hover:text-primary/80 transition-colors focus:outline-none cursor-pointer mt-1"
                        >
                          {isDescExpanded ? "Show Less" : "Read More"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Movie details unavailable.</p>
          )}
        </div>
      </div>
    </div>
  );
}

