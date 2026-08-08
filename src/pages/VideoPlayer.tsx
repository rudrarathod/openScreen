import { useParams, useNavigate, useLocation, Link } from "react-router";
import { ArrowLeft, Play, SkipForward, SkipBack, Sparkles, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchMalDetails, MalAnime } from "../api/mal";
import { fetchAnimeEpisodes, JikanEpisode } from "../api/jikan";
import { fetchSubDubInfo, isSubAvailable, isDubAvailable, SubDubAvailability } from "../api/subdub";
import { cn } from "../utils/cn";
import { EpisodeListSkeleton, Skeleton } from "../components/ui/Skeletons";
import { useContinueWatching } from "../context/ContinueWatchingContext";
import { useWatchlist } from "../context/WatchlistContext";
import { getFormattedAnimeTitles } from "../utils/title";

export default function VideoPlayer() {
  const { animeId, epId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<MalAnime | null>(null);
  const [episodeMap, setEpisodeMap] = useState<Record<number, JikanEpisode>>({});
  const [subDubInfo, setSubDubInfo] = useState<SubDubAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [synopsisTab, setSynopsisTab] = useState<"episode" | "series">("episode");

  // Auto-play next episode toggle state
  const [autoPlayNext, setAutoPlayNext] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("openScreen_autoplay_next");
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });

  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedChunk, setSelectedChunk] = useState<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("openScreen_autoplay_next", JSON.stringify(autoPlayNext));
    } catch (e) {
      console.error(e);
    }
  }, [autoPlayNext]);

  useEffect(() => {
    setCountdown(null);
  }, [epId]);

  useEffect(() => {
    async function loadData() {
      if (!animeId) return;
      setLoading(true);
      const [resData, epData, subDubData] = await Promise.all([
        fetchMalDetails(animeId),
        fetchAnimeEpisodes(animeId),
        fetchSubDubInfo(animeId),
      ]);
      setData(resData);
      setEpisodeMap(epData || {});
      setSubDubInfo(subDubData);
      setLoading(false);
    }
    loadData();
  }, [animeId]);

  const [streamType, setStreamType] = useState<"sub" | "dub">(
    (location.state as { streamType?: "sub" | "dub" })?.streamType || "sub"
  );

  useEffect(() => {
    if ((location.state as { streamType?: "sub" | "dub" })?.streamType) {
      setStreamType((location.state as { streamType: "sub" | "dub" }).streamType);
    }
  }, [location.state]);

  const currentEpNum = parseInt(epId || "1", 10) || 1;

  // Automatically validate and correct streamType if selected type is unavailable for current ep
  useEffect(() => {
    if (!subDubInfo) return;
    const currentHasSub = isSubAvailable(subDubInfo, currentEpNum);
    const currentHasDub = isDubAvailable(subDubInfo, currentEpNum);

    if (streamType === "dub" && !currentHasDub && currentHasSub) {
      setStreamType("sub");
    } else if (streamType === "sub" && !currentHasSub && currentHasDub) {
      setStreamType("dub");
    }
  }, [subDubInfo, currentEpNum, streamType]);

  if (!epId) return <div className="p-12 text-center">Invalid Episode ID</div>;

  // Stream embed URL
  const getEmbedUrl = () => {
    return `https://megaplay.buzz/stream/mal/${animeId}/${currentEpNum}/${streamType}`;
  };

  // Generate episodes array based on aired status
  const airedEpEntries = Object.values(episodeMap).filter((ep) => ep.hasAired !== false);
  const maxAiredEpNum = airedEpEntries.reduce((max, ep) => Math.max(max, ep.mal_id), 0);

  let numEps = 0;
  if (data?.status === "not_yet_aired") {
    numEps = 0;
  } else if (data?.status === "currently_airing") {
    numEps = maxAiredEpNum > 0 ? maxAiredEpNum : (airedEpEntries.length > 0 ? airedEpEntries.length : 1);
  } else {
    const totalMAL = data?.num_episodes && data.num_episodes > 0 ? data.num_episodes : 0;
    numEps = Math.max(totalMAL, maxAiredEpNum, 1);
  }

  const episodes = Array.from({ length: numEps })
    .map((_, i) => {
      const epNum = i + 1;
      const realEp = episodeMap[epNum];
      if (realEp && realEp.hasAired === false) {
        return null;
      }
      return {
        id: epNum,
        number: epNum,
        title: realEp?.title || `Episode ${epNum}`,
        filler: realEp?.filler,
        recap: realEp?.recap,
      };
    })
    .filter((ep): ep is NonNullable<typeof ep> => ep !== null);

  const prevEp = episodes.find((e) => e.number === currentEpNum - 1);
  const nextEp = episodes.find((e) => e.number === currentEpNum + 1);

  // Auto-play timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (countdown === 0) {
      setCountdown(null);
      if (nextEp) {
        navigate(`/watch/${animeId}/${nextEp.number}`, { state: { streamType } });
      }
    }
    return () => clearTimeout(timer);
  }, [countdown, nextEp, animeId, navigate, streamType]);

  // Handle iframe message events (player finished)
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
            (eventData.channel === "megacloud" && eventData.event === "ended"))
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

  const { saveContinueWatching, isEpisodeWatched, getEpisodeProgress } = useContinueWatching();
  const { syncWatchlistProgress } = useWatchlist();

  const currentEpObj = episodeMap[currentEpNum];
  const currentEpTitle = currentEpObj?.title || `Episode ${currentEpNum}`;

  useEffect(() => {
    if (data && animeId && currentEpNum) {
      const formattedTitles = getFormattedAnimeTitles(data);
      saveContinueWatching({
        animeId,
        title: formattedTitles.title,
        subtitle: formattedTitles.subtitle,
        image: data.main_picture?.large || data.main_picture?.medium || "",
        epNumber: currentEpNum,
        epTitle: currentEpTitle,
        streamType,
        totalEps: data.num_episodes || 0,
      });

      const airedEpEntries = Object.values(episodeMap).filter((ep) => ep.hasAired !== false);
      const maxAiredEpNum = airedEpEntries.reduce((max, ep) => Math.max(max, ep.mal_id), 0);
      const effectiveTotalEps = data.status === "currently_airing"
        ? Math.max(maxAiredEpNum, currentEpNum)
        : (data.num_episodes || maxAiredEpNum || currentEpNum);

      syncWatchlistProgress({
        id: animeId,
        title: formattedTitles.title,
        subtitle: formattedTitles.subtitle,
        image: data.main_picture?.large || data.main_picture?.medium || "",
        score: data.mean ? data.mean.toFixed(1) : undefined,
        type: data.media_type,
        epNumber: currentEpNum,
        totalEps: effectiveTotalEps,
      });
    }
  }, [data, animeId, currentEpNum, currentEpTitle, streamType, saveContinueWatching, syncWatchlistProgress]);

  const handlePlayEpisode = (epNum: number, type: "sub" | "dub", e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setStreamType(type);
    if (currentEpNum !== epNum) {
      navigate(`/watch/${animeId}/${epNum}`);
    }
  };

  const activeChunk = selectedChunk !== null
    ? selectedChunk
    : Math.floor(Math.max(0, currentEpNum - 1) / 100);

  const renderEpisodes = () => {
    const totalChunks = Math.ceil(episodes.length / 100);
    const displayedEpisodes = episodes.length > 100
      ? episodes.filter((ep) => ep.number >= activeChunk * 100 + 1 && ep.number <= (activeChunk + 1) * 100)
      : episodes;

    return (
      <div className="flex flex-col gap-2">
        {episodes.length > 100 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar max-w-full border-b border-border/30">
            {Array.from({ length: totalChunks }, (_, idx) => {
              const start = idx * 100 + 1;
              const end = Math.min((idx + 1) * 100, episodes.length);
              const isSelected = activeChunk === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedChunk(idx)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border shrink-0 touch-manipulation min-h-[32px]",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border-border/50"
                  )}
                >
                  {start} - {end}
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <EpisodeListSkeleton count={8} />
        ) : displayedEpisodes.length > 0 ? (
          displayedEpisodes.map((ep) => {
            const isActive = currentEpNum === ep.number;
            const epHasSub = isSubAvailable(subDubInfo, ep.number);
            const epHasDub = isDubAvailable(subDubInfo, ep.number);
            const isWatched = isEpisodeWatched(animeId || "", ep.number);
            const progress = getEpisodeProgress(animeId || "", ep.number);

            return (
              <div
                key={ep.id}
                onClick={() => handlePlayEpisode(ep.number, epHasSub ? (streamType === "dub" && epHasDub ? "dub" : "sub") : "dub")}
                className={cn(
                  "flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl transition-all border cursor-pointer group",
                  isActive
                    ? "bg-primary/10 border-primary shadow-sm"
                    : isWatched
                    ? "glass border-primary/20 bg-primary/5 hover:border-primary/40"
                    : "glass border-transparent hover:border-border/60 hover:bg-secondary/50"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-20 sm:w-24 aspect-video rounded-lg overflow-hidden shrink-0 bg-secondary flex items-center justify-center">
                    <img
                      src={data?.main_picture?.large || data?.main_picture?.medium}
                      alt={`EP ${ep.number}`}
                      className={cn(
                        "w-full h-full object-cover blur-sm transition-opacity",
                        isActive ? "opacity-75" : isWatched ? "opacity-65" : "opacity-40 grayscale"
                      )}
                    />
                    <span className="absolute font-bold text-white text-xs sm:text-sm z-10">EP {ep.number}</span>
                    {isActive ? (
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center z-10">
                        <Play className="w-5 h-5 text-white fill-current" />
                      </div>
                    ) : isWatched ? (
                      <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-md z-20">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    ) : null}

                    {/* Progress bar at bottom of thumbnail */}
                    {(isWatched || progress > 0 || isActive) && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 z-20">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${isActive ? 100 : progress > 0 ? progress : 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn("text-xs font-semibold", isActive ? "text-primary font-bold" : isWatched ? "text-primary/90" : "text-muted-foreground")}>
                        Episode {ep.number}
                      </span>
                      {ep.filler && <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase">Filler</span>}
                      {ep.recap && <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase">Recap</span>}
                    </div>
                    <h3 className={cn("text-xs sm:text-sm font-medium line-clamp-2 mt-0.5", isActive ? "text-foreground font-semibold" : "text-foreground/80")} title={ep.title}>
                      {ep.title}
                    </h3>
                  </div>
                </div>

                {/* Explicit SUB / DUB buttons for each episode (only rendered if available) */}
                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {epHasSub && (
                    <button
                      onClick={(e) => handlePlayEpisode(ep.number, "sub", e)}
                      title={`Play Episode ${ep.number} SUB`}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase transition-all border min-h-[36px] flex items-center justify-center active:scale-95 touch-manipulation",
                        isActive && streamType === "sub"
                          ? "bg-primary text-white border-primary shadow-md shadow-primary/30"
                          : "bg-secondary/80 hover:bg-primary/20 hover:text-primary active:bg-primary/30 border-border/50 text-muted-foreground"
                      )}
                    >
                      SUB
                    </button>
                  )}
                  {epHasDub && (
                    <button
                      onClick={(e) => handlePlayEpisode(ep.number, "dub", e)}
                      title={`Play Episode ${ep.number} DUB`}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase transition-all border min-h-[36px] flex items-center justify-center active:scale-95 touch-manipulation",
                        isActive && streamType === "dub"
                          ? "bg-primary text-white border-primary shadow-md shadow-primary/30"
                          : "bg-secondary/80 hover:bg-primary/20 hover:text-primary active:bg-primary/30 border-border/50 text-muted-foreground"
                      )}
                    >
                      DUB
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-6 text-center text-muted-foreground bg-secondary/30 rounded-xl text-xs font-medium border border-border/40">
            No aired episodes available yet.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex w-full h-screen bg-background overflow-hidden text-foreground">
      
      {/* Main Content Area (Player + Info) */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* Top bar */}
        <div className="flex-shrink-0 h-16 flex items-center justify-between px-4 gap-4 bg-background/95 backdrop-blur border-b border-border/40 z-40">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => navigate(-1)}
              className="w-11 h-11 rounded-full lg:hover:bg-secondary active:scale-90 flex items-center justify-center transition-all shrink-0 touch-manipulation"
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-base sm:text-lg truncate">
                {data ? getFormattedAnimeTitles(data).title : "Loading..."}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {data && getFormattedAnimeTitles(data).subtitle ? `${getFormattedAnimeTitles(data).subtitle} • ` : ""}Episode {currentEpNum}: {currentEpTitle}
              </p>
            </div>
          </div>

          {/* Quick Nav Prev/Next Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              disabled={!prevEp}
              onClick={() => prevEp && navigate(`/watch/${animeId}/${prevEp.number}`, { state: { streamType } })}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border min-h-[40px] touch-manipulation",
                prevEp
                  ? "bg-secondary hover:bg-primary/20 active:bg-primary/30 active:scale-95 hover:text-primary border-border/50 text-foreground"
                  : "opacity-40 cursor-not-allowed border-transparent text-muted-foreground"
              )}
              title={prevEp ? `Previous: Episode ${prevEp.number}` : "No previous episode"}
            >
              <SkipBack className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>
            <button
              disabled={!nextEp}
              onClick={() => nextEp && navigate(`/watch/${animeId}/${nextEp.number}`, { state: { streamType } })}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border min-h-[40px] touch-manipulation",
                nextEp
                  ? "bg-primary text-white border-primary/50 shadow-sm hover:bg-primary/90 active:bg-primary/80 active:scale-95"
                  : "opacity-40 cursor-not-allowed border-transparent text-muted-foreground"
              )}
              title={nextEp ? `Next: Episode ${nextEp.number}` : "No next episode"}
            >
              <span className="hidden sm:inline">Next</span>
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content (Mobile: Details + Episodes, Desktop: Details) */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
          {/* Player Container (Sticky on Mobile/Tablet, Static on Desktop) */}
          <div className="w-full aspect-video bg-black shrink-0 sticky top-0 lg:static z-30 lg:z-10 border-b border-border/40 shadow-2xl overflow-hidden">
            <iframe 
              key={`${epId}-${streamType}`} // Forces iframe reload when episode or audio type changes
              src={getEmbedUrl()} 
              className="w-full h-full border-0"
              style={{ width: "100%", height: "100%", border: "none" }}
              allowFullScreen 
              allow="autoplay; fullscreen; picture-in-picture"
              referrerPolicy="origin"
            />

            {/* Auto-play Countdown Banner Overlay */}
            {countdown !== null && (
              <div className="absolute inset-x-0 bottom-0 z-30 p-4 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center font-bold text-primary text-sm animate-pulse">
                    {countdown}s
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      Up Next: Episode {currentEpNum + 1}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Auto-playing next episode...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCountdown(null)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setCountdown(null);
                      if (nextEp) {
                        navigate(`/watch/${animeId}/${nextEp.number}`, { state: { streamType } });
                      }
                    }}
                    className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-primary/30"
                  >
                    <SkipForward className="w-3.5 h-3.5 fill-current" />
                    Play Now
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Audio & Controls Selection Bar */}
          <div className="px-4 py-3 bg-secondary/30 border-b border-border/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
                Stream Quality: <strong className="text-foreground">HD 1080p</strong>
              </span>

              {/* Auto-Play Toggle Switch */}
              <button
                onClick={() => setAutoPlayNext(!autoPlayNext)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border min-h-[40px] touch-manipulation active:scale-95",
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
            </div>

            {/* Audio Language Switcher */}
            {(() => {
              const currentHasSub = isSubAvailable(subDubInfo, currentEpNum);
              const currentHasDub = isDubAvailable(subDubInfo, currentEpNum);
              if (!currentHasSub && !currentHasDub) return null;
              return (
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase px-2">Audio:</span>
                  {currentHasSub && (
                    <button
                      onClick={() => setStreamType("sub")}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] active:scale-95 touch-manipulation",
                        streamType === "sub"
                          ? "bg-primary text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      SUB
                    </button>
                  )}
                  {currentHasDub && (
                    <button
                      onClick={() => setStreamType("dub")}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] active:scale-95 touch-manipulation",
                        streamType === "dub"
                          ? "bg-primary text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      DUB
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Info Section */}
          <div className="p-4 md:p-6 lg:p-8 flex flex-col gap-4 w-full shrink-0">
            {loading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-8 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl md:text-2xl font-bold flex flex-wrap items-center gap-2">
                  <span>Episode {currentEpNum}: {currentEpTitle}</span>
                  {currentEpObj?.filler && <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-bold uppercase">Filler</span>}
                  {currentEpObj?.recap && <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 text-xs font-bold uppercase">Recap</span>}
                </h2>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground mt-2">
                  <span className="px-2.5 py-1 rounded-md bg-secondary text-foreground font-semibold text-xs uppercase">
                    {streamType}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-secondary text-foreground font-semibold text-xs">
                    1080p HD
                  </span>
                </div>
                {/* Synopsis Section with Episode vs Series tabs */}
                <div className="flex flex-col items-start gap-2 mt-4 w-full">
                  <div className="flex items-center gap-2 border-b border-border/40 pb-2 w-full">
                    {currentEpObj?.synopsis && (
                      <button
                        onClick={() => setSynopsisTab("episode")}
                        className={cn(
                          "text-xs font-bold px-3 py-1.5 rounded-lg transition-all border touch-manipulation cursor-pointer",
                          synopsisTab === "episode"
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-secondary/60 text-muted-foreground border-border/40 hover:text-foreground hover:bg-secondary"
                        )}
                      >
                        Episode {currentEpNum} Summary
                      </button>
                    )}
                    <button
                      onClick={() => setSynopsisTab("series")}
                      className={cn(
                        "text-xs font-bold px-3 py-1.5 rounded-lg transition-all border touch-manipulation cursor-pointer",
                        synopsisTab === "series" || !currentEpObj?.synopsis
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-secondary/60 text-muted-foreground border-border/40 hover:text-foreground hover:bg-secondary"
                      )}
                    >
                      Series Overview
                    </button>
                  </div>

                  {(() => {
                    const hasEpSynopsis = !!currentEpObj?.synopsis;
                    const showEpSynopsis = hasEpSynopsis && synopsisTab === "episode";
                    const activeText = showEpSynopsis ? currentEpObj.synopsis : (data?.synopsis || "No description available.");

                    return (
                      <>
                        <p className={cn("text-foreground/80 leading-relaxed transition-all text-sm sm:text-base", !isDescExpanded && "line-clamp-3")}>
                          {activeText}
                        </p>
                        {activeText && activeText.length > 120 && (
                          <button
                            onClick={() => setIsDescExpanded(!isDescExpanded)}
                            className="text-primary font-semibold text-xs sm:text-sm lg:hover:text-primary/80 transition-colors focus:outline-none cursor-pointer mt-1"
                          >
                            {isDescExpanded ? "Show Less" : "Read More"}
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>

          {/* Mobile-only Episodes List */}
          <div className="lg:hidden flex flex-col p-4 border-t border-border/40 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">All Episodes</h3>
              <span className="text-sm text-muted-foreground">{numEps} eps</span>
            </div>
            {renderEpisodes()}
          </div>
        </div>
      </div>

      {/* Desktop-only Episode Sidebar */}
      <div className="hidden lg:flex w-[400px] flex-shrink-0 border-l border-border/40 flex-col h-full bg-card/30">
        <div className="p-4 border-b border-border/40 bg-background/95 backdrop-blur z-10 flex items-center justify-between">
          <h3 className="font-display font-bold text-lg">All Episodes</h3>
          <span className="text-sm text-muted-foreground">{numEps} eps</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          {renderEpisodes()}
        </div>
      </div>
    </div>
  );
}
