import { useState, useEffect } from "react";
import { Search as SearchIcon, X, Loader2, Sparkles, Film, Tv, Clock, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { useMediaType, MediaType } from "../context/MediaTypeContext";
import { useDebounce } from "../hooks/useDebounce";
import { useRecentSearches } from "../hooks/useRecentSearches";
import { fetchMalSearch, MalAnime } from "../api/mal";
import {
  searchMovies,
  searchTv,
  mapTmdbMovieToProp,
  mapTmdbTvToProp,
  TmdbMovie,
  TmdbTvShow,
} from "../api/tmdb";
import AnimeCard, { AnimeProp } from "../components/ui/AnimeCard";

const MEDIA_TYPE_LABELS: Record<MediaType, { label: string; icon: typeof Film; color: string }> = {
  anime: { label: "Anime", icon: Sparkles, color: "text-primary" },
  movie: { label: "Movies", icon: Film, color: "text-accent" },
  tv: { label: "TV Series", icon: Tv, color: "text-sky-400" },
};

export default function Search() {
  const { activeMediaType } = useMediaType();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState<AnimeProp[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedQuery = useDebounce(query, 400);
  const { searches, addSearch, removeSearch, clearSearches } = useRecentSearches(
    `openscreen_recent_${activeMediaType}`
  );

  // Sync state if URL query changes directly
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  // Handle Search Execution
  useEffect(() => {
    const trimmed = debouncedQuery.trim();

    if (!trimmed) {
      setResults([]);
      setHasSearched(false);
      setSearchParams({}, { replace: true });
      return;
    }

    // Set URL parameter
    setSearchParams({ q: trimmed }, { replace: true });

    let isMounted = true;
    async function executeSearch() {
      setLoading(true);
      setHasSearched(true);
      try {
        let mapped: AnimeProp[] = [];

        if (activeMediaType === "anime") {
          const data = await fetchMalSearch(trimmed, 30);
          if (isMounted) {
            mapped = data.map((item) => ({
              id: item.id.toString(),
              title: item.title,
              subtitle: item.alternative_titles?.ja || item.alternative_titles?.en || "",
              image: item.main_picture?.large || item.main_picture?.medium || "",
              score: item.mean || "N/A",
              type: item.media_type?.toUpperCase() || "TV",
              mediaType: "anime" as const,
              rating: item.rating,
              genres: item.genres?.map((g) => g.name) || [],
            }));
          }
        } else if (activeMediaType === "movie") {
          const data = await searchMovies(trimmed, 1);
          if (isMounted) {
            mapped = data.map(mapTmdbMovieToProp);
          }
        } else if (activeMediaType === "tv") {
          const data = await searchTv(trimmed, 1);
          if (isMounted) {
            mapped = data.map(mapTmdbTvToProp);
          }
        }

        if (isMounted) {
          setResults(mapped);
          // Only add to recent searches if search actually completed with queries
          addSearch(trimmed);
        }
      } catch (err) {
        console.error("Search API Error:", err);
        if (isMounted) setResults([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    executeSearch();

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, activeMediaType]);

  const handleRecentClick = (searchQuery: string) => {
    setQuery(searchQuery);
    setSearchParams({ q: searchQuery }, { replace: true });
  };

  const mediaInfo = MEDIA_TYPE_LABELS[activeMediaType];
  const MediaIcon = mediaInfo.icon;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full min-h-screen pb-24 bg-[#09090b]">
      {/* Mobile Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl bg-primary/10 ${mediaInfo.color}`}>
              <MediaIcon className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
              Search <span className="capitalize">{mediaInfo.label}</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Search across our entire database of {activeMediaType === "tv" ? "TV series" : activeMediaType}
          </p>
        </div>
      </div>

      {/* Recent Searches Section (Only visible when query is empty) */}
      {!query.trim() && (
        <div className="flex flex-col gap-4 max-w-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              <span>Recent Searches</span>
            </div>
            {searches.length > 0 && (
              <button
                onClick={clearSearches}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {searches.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {searches.map((searchQuery, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 bg-[#18181b] hover:bg-[#27272a] border border-white/5 hover:border-white/10 rounded-xl pl-3.5 pr-2 py-1.5 transition-all text-sm text-foreground hover:text-white group"
                >
                  <button
                    onClick={() => handleRecentClick(searchQuery)}
                    className="font-medium text-left cursor-pointer"
                  >
                    {searchQuery}
                  </button>
                  <button
                    onClick={() => removeSearch(searchQuery)}
                    className="p-0.5 rounded-md hover:bg-white/10 text-muted-foreground/60 hover:text-white transition-all cursor-pointer ml-1"
                    title="Remove item"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground/50 py-2">
              Your search history is empty. Try looking for something!
            </p>
          )}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Searching for "{query}"...
          </p>
        </div>
      )}

      {/* Search Results Grid */}
      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
          <h2 className="text-lg font-bold font-display text-white border-b border-white/5 pb-2.5">
            Results for "{query}"
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5">
            {results.map((item) => (
              <AnimeCard key={item.id} anime={item} />
            ))}
          </div>
        </div>
      )}

      {/* No Results State */}
      {!loading && hasSearched && results.length === 0 && query.trim() && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3 animate-in fade-in duration-200">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-muted-foreground/40">
            <SearchIcon className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-white">No results found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            We couldn't find any {mediaInfo.label.toLowerCase()} matching "{query}". Please check the spelling or try a different term.
          </p>
        </div>
      )}
    </div>
  );
}
