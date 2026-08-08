import { useParams, useNavigate } from "react-router";
import { ArrowLeft, SkipForward, SkipBack, Star, Calendar, RefreshCw, AlertCircle, Play, Sparkles } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  fetchTvDetails,
  fetchTvSeason,
  getTmdbImageUrl,
  TmdbTvDetails,
  TmdbSeasonDetails,
} from "../api/tmdb";
import { Skeleton, EpisodeListSkeleton } from "../components/ui/Skeletons";
import { useWatchlist } from "../context/WatchlistContext";
import { useContinueWatching } from "../context/ContinueWatchingContext";
import { cn } from "../utils/cn";
import { ServerSelector, ServerId, getTvEmbedUrl } from "../components/ui/ServerSelector";

export default function TvPlayer() {
  const { id, season, episode } = useParams();
  const navigate = useNavigate();
  const [tv, setTv] = useState<TmdbTvDetails | null>(null);
  const [seasonData, setSeasonData] = useState<TmdbSeasonDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [synopsisTab, setSynopsisTab] = useState<"episode" | "series">("episode");

  // Auto-play next episode state
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("openScreen_autoplay_next_tv");
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });

  const [countdown, setCountdown] = useState<number | null>(null);

  // Server selection state
  const [currentServer, setCurrentServer] = useState<ServerId>("vidsrc");
  const [failedServers, setFailedServers] = useState<ServerId[]>([]);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [bothFailed, setBothFailed] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  const { syncWatchlistProgress } = useWatchlist();
  const { saveContinueWatching } = useContinueWatching();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentSeason = parseInt(season || "1", 10) || 1;
  const currentEpisode = parseInt(episode || "1", 10) || 1;

  useEffect(() => {
    try {
      localStorage.setItem("openScreen_autoplay_next_tv", JSON.stringify(autoPlayNext));
    } catch (e) {
      console.error(e);
    }
  }, [autoPlayNext]);

  useEffect(() => {
    setCountdown(null);
  }, [season, episode]);

  // Reset failed servers state when episode or show changes
  useEffect(() => {
    setFailedServers([]);
    setBothFailed(false);
    setFallbackNotice(null);
  }, [id, currentSeason, currentEpisode]);

  useEffect(() => {
    async function loadTvData() {
      if (!id) return;
      setLoading(true);
      try {
        const details = await fetchTvDetails(id);
        setTv(details);
      } catch (err) {
        console.error("Failed to load TV details for player:", err);
      } finally {
        setLoading(false);
      }
    }
    loadTvData();
  }, [id]);

  useEffect(() => {
    async function loadSeasonData() {
      if (!id || !currentSeason) return;
      setSeasonLoading(true);
      try {
        const sData = await fetchTvSeason(id, currentSeason);
        setSeasonData(sData);
      } catch (err) {
        console.error("Failed to load season details for player:", err);
      } finally {
        setSeasonLoading(false);
      }
    }
    loadSeasonData();
  }, [id, currentSeason]);

  // Sync Watchlist Progress whenever episode changes
  useEffect(() => {
    if (tv && id) {
      syncWatchlistProgress({
        id: tv.id,
        title: tv.name,
        subtitle: `S${currentSeason} E${currentEpisode}`,
        image: getTmdbImageUrl(tv.poster_path, "w500"),
        score: tv.vote_average ? tv.vote_average.toFixed(1) : undefined,
        type: "TV",
        mediaType: "tv",
        epNumber: currentEpisode,
        totalEps: tv.number_of_episodes || 12,
      });

      const currentEpObj = seasonData?.episodes?.find((e) => e.episode_number === currentEpisode);
      saveContinueWatching({
        animeId: `tv-${tv.id}-s${currentSeason}`,
        title: tv.name,
        subtitle: `Season ${currentSeason}`,
        image: getTmdbImageUrl(tv.poster_path, "w500"),
        epNumber: currentEpisode,
        epTitle: currentEpObj?.name || `Episode ${currentEpisode}`,
        totalEps: tv.number_of_episodes || 12,
        progress: 100,
      });
    }
  }, [tv, id, currentSeason, currentEpisode, syncWatchlistProgress, saveContinueWatching, seasonData]);

  const episodes = seasonData?.episodes || [];
  const prevEp = episodes.find((e) => e.episode_number === currentEpisode - 1);
  const nextEp = episodes.find((e) => e.episode_number === currentEpisode + 1);
  const currentEpObj = episodes.find((e) => e.episode_number === currentEpisode);
  const validSeasons = (tv?.seasons || []).filter((s) => s.season_number > 0);

  // Auto-play timer countdown effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (countdown === 0) {
      setCountdown(null);
      if (nextEp) {
        navigate(`/watch/tv/${id}/${currentSeason}/${nextEp.episode_number}`);
      }
    }
    return () => clearTimeout(timer);
  }, [countdown, nextEp, id, currentSeason, navigate]);

  // VidLink & message listener for watch progress and auto-next
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        let eventData = event.data;
        if (!eventData) return;

        if (typeof eventData === "string") {
          try {
            eventData = JSON.parse(eventData);
          } catch (e) {
            return;
          }
        }

        if (
          eventData &&
          typeof eventData === "object" &&
          (eventData.event === "complete" ||
            eventData.event === "ended" ||
            eventData.event === "finish" ||
            (eventData.channel === "vidlink" && eventData.event === "ended"))
        ) {
          if (autoPlayNext && nextEp) {
            setCountdown(5);
          }
        }
      } catch (err) {
        // Silently ignore cross-origin postMessage structure errors
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [autoPlayNext, nextEp]);

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
        setFallbackNotice("Episode failed to stream on both VidSrc and VidLink servers.");
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
  }, [currentServer, id, currentSeason, currentEpisode, bothFailed, handleServerFailure]);

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
    return <div className="p-12 text-center text-muted-foreground">Invalid TV Series ID</div>;
  }

  const embedUrl = getTvEmbedUrl(currentServer, id, currentSeason, currentEpisode);

  // Episode Render Function for Sidebar and Mobile
  const renderEpisodesList = () => {
    if (seasonLoading) return <EpisodeListSkeleton />;
    if (episodes.length === 0) {
      return (
        <p className="text-xs text-muted-foreground text-center py-6">
          No episodes found for this season.
        </p>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        {episodes.map((ep) => {
          const isCurrent = ep.episode_number === currentEpisode;
          return (
            <button
              key={ep.id}
              onClick={() => navigate(`/watch/tv/${id}/${currentSeason}/${ep.episode_number}`)}
              className={cn(
                "flex items-center gap-3 p-2.5 rounded-xl text-left transition-all border cursor-pointer group",
                isCurrent
                  ? "bg-primary/20 border-primary/50 text-foreground font-bold shadow-sm"
                  : "bg-secondary/40 border-border/40 hover:bg-secondary text-foreground/80 hover:text-foreground"
              )}
            >
              <div className="relative w-20 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-white/10">
                <img
                  src={getTmdbImageUrl(ep.still_path || tv?.backdrop_path, "w300")}
                  alt={ep.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                {isCurrent && (
                  <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                    <Play className="w-4 h-4 fill-current text-white" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold line-clamp-1">
                  {ep.episode_number}. {ep.name}
                </p>
                {ep.runtime && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">{ep.runtime} min</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex w-full h-screen bg-background overflow-hidden text-foreground">
      {/* Main Player & Info Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Top Header Bar (Matching VideoPlayer) */}
        <div className="flex-shrink-0 h-16 flex items-center justify-between px-4 gap-4 bg-background/95 backdrop-blur border-b border-border/40 z-40">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate(`/tv/${id}`)}
              className="w-11 h-11 rounded-full lg:hover:bg-secondary active:scale-90 flex items-center justify-center transition-all shrink-0 touch-manipulation cursor-pointer"
              title="Back to Details"
              aria-label="Back to Details"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-base sm:text-lg truncate">
                {tv ? tv.name : "Loading..."}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                S{currentSeason} E{currentEpisode}: {currentEpObj?.name || `Episode ${currentEpisode}`}
              </p>
            </div>
          </div>

          {/* Quick Nav Prev/Next Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              disabled={!prevEp}
              onClick={() => prevEp && navigate(`/watch/tv/${id}/${currentSeason}/${prevEp.episode_number}`)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border min-h-[40px] touch-manipulation cursor-pointer",
                prevEp
                  ? "bg-secondary hover:bg-primary/20 active:bg-primary/30 active:scale-95 hover:text-primary border-border/50 text-foreground"
                  : "opacity-40 cursor-not-allowed border-transparent text-muted-foreground"
              )}
              title={prevEp ? `Previous: Ep ${prevEp.episode_number}` : "No previous episode"}
            >
              <SkipBack className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <button
              disabled={!nextEp}
              onClick={() => nextEp && navigate(`/watch/tv/${id}/${currentSeason}/${nextEp.episode_number}`)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border min-h-[40px] touch-manipulation cursor-pointer",
                nextEp
                  ? "bg-primary text-white border-primary/50 shadow-sm hover:bg-primary/90 active:bg-primary/80 active:scale-95"
                  : "opacity-40 cursor-not-allowed border-transparent text-muted-foreground"
              )}
              title={nextEp ? `Next: Ep ${nextEp.episode_number}` : "No next episode"}
            >
              <span className="hidden sm:inline">Next</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
          {/* Player Container */}
          <div className="w-full aspect-video bg-black shrink-0 sticky top-0 lg:static z-30 lg:z-10 border-b border-border/40 shadow-2xl overflow-hidden relative">
            {bothFailed ? (
              <div className="flex flex-col items-center justify-center text-center p-6 gap-4 z-20 h-full">
                <AlertCircle className="w-12 h-12 text-amber-500 animate-bounce" />
                <div className="max-w-md">
                  <h3 className="text-lg font-bold text-white mb-1">Streaming Unavailable</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Both VidSrc and VidLink servers failed to load stream for S{currentSeason} E{currentEpisode}. You can retry switching servers below.
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
                  key={`${id}-${currentSeason}-${currentEpisode}-${currentServer}`}
                  src={embedUrl}
                  title={tv?.name || "TV Player"}
                  className="w-full h-full border-0"
                  style={{ width: "100%", height: "100%", border: "none" }}
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                />
              </>
            )}

            {/* Auto-play Countdown Banner Overlay */}
            {countdown !== null && (
              <div className="absolute inset-x-0 bottom-0 z-30 p-4 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center font-bold text-primary text-sm animate-pulse">
                    {countdown}s
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      Up Next: Season {currentSeason} Episode {currentEpisode + 1}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Auto-playing next episode...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCountdown(null)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setCountdown(null);
                      if (nextEp) {
                        navigate(`/watch/tv/${id}/${currentSeason}/${nextEp.episode_number}`);
                      }
                    }}
                    className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-primary/30 cursor-pointer"
                  >
                    <SkipForward className="w-3.5 h-3.5 fill-current" />
                    Play Now
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Controls & Server Bar (Matching VideoPlayer) */}
          <div className="px-4 py-3 bg-secondary/30 border-b border-border/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
                Stream Quality: <strong className="text-foreground">HD 1080p</strong>
              </span>

              {/* Auto-Play Toggle Switch */}
              <button
                onClick={() => setAutoPlayNext(!autoPlayNext)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border touch-manipulation active:scale-95 cursor-pointer",
                  autoPlayNext
                    ? "bg-primary/15 border-primary/40 text-primary shadow-sm"
                    : "bg-black/30 border-white/10 text-muted-foreground hover:text-foreground"
                )}
                title="Toggle Auto-play Next Episode"
              >
                <span className="relative flex h-2 w-2">
                  {autoPlayNext && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", autoPlayNext ? "bg-primary" : "bg-muted-foreground")}></span>
                </span>
                <span>Auto-play Next</span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase", autoPlayNext ? "bg-primary text-white" : "bg-secondary/80 text-muted-foreground")}>
                  {autoPlayNext ? "ON" : "OFF"}
                </span>
              </button>

              {/* Server Selector */}
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

          {/* TV Info Section */}
          <div className="p-4 md:p-6 lg:p-8 flex flex-col gap-4 w-full shrink-0">
            {loading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-8 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ) : tv ? (
              <>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold font-display text-foreground">
                        S{currentSeason} E{currentEpisode}: {currentEpObj?.name || `Episode ${currentEpisode}`}
                      </h2>
                      <p className="text-sm font-semibold text-primary mt-0.5">{tv.name}</p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {tv.vote_average > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-sm">
                          <Star className="w-4 h-4 fill-current" />
                          <span>{tv.vote_average.toFixed(1)}</span>
                        </div>
                      )}
                      {tv.first_air_date && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2.5 py-1 rounded-lg bg-secondary border border-border/40">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{tv.first_air_date.substring(0, 4)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Synopsis Tabs */}
                <div className="flex flex-col items-start gap-2 mt-2 w-full">
                  <div className="flex items-center gap-2 border-b border-border/40 pb-2 w-full">
                    {currentEpObj?.overview && (
                      <button
                        onClick={() => setSynopsisTab("episode")}
                        className={cn(
                          "text-xs font-bold px-3 py-1.5 rounded-lg transition-all border touch-manipulation cursor-pointer",
                          synopsisTab === "episode"
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-secondary/60 text-muted-foreground border-border/40 hover:text-foreground hover:bg-secondary"
                        )}
                      >
                        Episode {currentEpisode} Overview
                      </button>
                    )}
                    <button
                      onClick={() => setSynopsisTab("series")}
                      className={cn(
                        "text-xs font-bold px-3 py-1.5 rounded-lg transition-all border touch-manipulation cursor-pointer",
                        synopsisTab === "series" || !currentEpObj?.overview
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-secondary/60 text-muted-foreground border-border/40 hover:text-foreground hover:bg-secondary"
                      )}
                    >
                      Series Overview
                    </button>
                  </div>

                  {(() => {
                    const hasEpOverview = !!currentEpObj?.overview;
                    const showEpOverview = hasEpOverview && synopsisTab === "episode";
                    const activeText = showEpOverview ? currentEpObj.overview : (tv.overview || "No overview available.");

                    return (
                      <>
                        <p
                          className={cn(
                            "text-foreground/80 leading-relaxed transition-all text-sm sm:text-base",
                            !isDescExpanded && "line-clamp-3"
                          )}
                        >
                          {activeText}
                        </p>
                        {activeText && activeText.length > 120 && (
                          <button
                            onClick={() => setIsDescExpanded(!isDescExpanded)}
                            className="text-primary font-semibold text-xs sm:text-sm hover:text-primary/80 transition-colors focus:outline-none cursor-pointer mt-1"
                          >
                            {isDescExpanded ? "Show Less" : "Read More"}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">TV series details unavailable.</p>
            )}
          </div>

          {/* Mobile-only Episodes List */}
          <div className="lg:hidden flex flex-col p-4 border-t border-border/40 shrink-0 gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg">Season Episodes</h3>

              {validSeasons.length > 0 && (
                <select
                  value={currentSeason}
                  onChange={(e) => navigate(`/watch/tv/${id}/${e.target.value}/1`)}
                  className="px-3 py-1 rounded-xl bg-secondary text-foreground text-xs font-semibold border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  {validSeasons.map((s) => (
                    <option key={s.id} value={s.season_number}>
                      Season {s.season_number}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {renderEpisodesList()}
          </div>
        </div>
      </div>

      {/* Desktop-only Episode Sidebar */}
      <div className="hidden lg:flex w-[380px] xl:w-[420px] flex-shrink-0 border-l border-border/40 flex-col h-full bg-card/30">
        <div className="p-4 border-b border-border/40 bg-background/95 backdrop-blur z-10 flex items-center justify-between gap-2">
          <h3 className="font-display font-bold text-lg">Season Episodes</h3>

          {validSeasons.length > 0 && (
            <select
              value={currentSeason}
              onChange={(e) => navigate(`/watch/tv/${id}/${e.target.value}/1`)}
              className="px-3 py-1.5 rounded-xl bg-secondary text-foreground text-xs font-semibold border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {validSeasons.map((s) => (
                <option key={s.id} value={s.season_number}>
                  Season {s.season_number}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          {renderEpisodesList()}
        </div>
      </div>
    </div>
  );
}
