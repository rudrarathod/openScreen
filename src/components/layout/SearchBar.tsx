import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2, Film, Tv, Sparkles } from "lucide-react";
import { useNavigate } from "react-router";
import { useMediaType, MediaType } from "../../context/MediaTypeContext";
import { useDebounce } from "../../hooks/useDebounce";
import { fetchMalSearch, MalAnime } from "../../api/mal";
import {
  searchMovies,
  searchTv,
  mapTmdbMovieToProp,
  mapTmdbTvToProp,
  TmdbMovie,
  TmdbTvShow,
} from "../../api/tmdb";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  score?: string | number;
  type: string;
  mediaType: "anime" | "movie" | "tv";
}

function mapAnimeToSearchResult(anime: MalAnime): SearchResult {
  return {
    id: anime.id.toString(),
    title: anime.title,
    subtitle:
      anime.alternative_titles?.ja ||
      anime.alternative_titles?.en ||
      "",
    image: anime.main_picture?.large || anime.main_picture?.medium || "",
    score: anime.mean || "N/A",
    type: anime.media_type?.toUpperCase() || "TV",
    mediaType: "anime",
  };
}

function mapMovieToSearchResult(movie: TmdbMovie): SearchResult {
  const prop = mapTmdbMovieToProp(movie);
  return {
    id: prop.id,
    title: prop.title,
    subtitle: prop.subtitle,
    image: prop.image,
    score: prop.score,
    type: "Movie",
    mediaType: "movie",
  };
}

function mapTvToSearchResult(tv: TmdbTvShow): SearchResult {
  const prop = mapTmdbTvToProp(tv);
  return {
    id: prop.id,
    title: prop.title,
    subtitle: prop.subtitle,
    image: prop.image,
    score: prop.score,
    type: "TV",
    mediaType: "tv",
  };
}

const MEDIA_TYPE_LABELS: Record<MediaType, { label: string; icon: typeof Film }> = {
  anime: { label: "Anime", icon: Sparkles },
  movie: { label: "Movies", icon: Film },
  tv: { label: "TV Series", icon: Tv },
};

export default function SearchBar() {
  const { activeMediaType } = useMediaType();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedQuery = useDebounce(query, 400);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Track the active media type at the time of search to avoid stale results
  const searchMediaTypeRef = useRef<MediaType>(activeMediaType);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset search when media type changes
  useEffect(() => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setIsOpen(false);
  }, [activeMediaType]);

  // Perform search when debounced query changes
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    let cancelled = false;
    searchMediaTypeRef.current = activeMediaType;

    async function doSearch() {
      setLoading(true);
      setHasSearched(true);

      try {
        let mapped: SearchResult[] = [];

        if (activeMediaType === "anime") {
          const data = await fetchMalSearch(trimmed, 12);
          if (!cancelled) {
            mapped = data.map(mapAnimeToSearchResult);
          }
        } else if (activeMediaType === "movie") {
          const data = await searchMovies(trimmed, 1);
          if (!cancelled) {
            mapped = data.slice(0, 12).map(mapMovieToSearchResult);
          }
        } else if (activeMediaType === "tv") {
          const data = await searchTv(trimmed, 1);
          if (!cancelled) {
            mapped = data.slice(0, 12).map(mapTvToSearchResult);
          }
        }

        if (!cancelled && searchMediaTypeRef.current === activeMediaType) {
          setResults(mapped);
        }
      } catch (err) {
        console.error("Search failed:", err);
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    doSearch();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, activeMediaType]);

  const handleResultClick = useCallback(
    (result: SearchResult) => {
      setIsOpen(false);
      setQuery("");
      setResults([]);
      setHasSearched(false);

      if (result.mediaType === "movie") {
        navigate(`/movie/${result.id}`);
      } else if (result.mediaType === "tv") {
        navigate(`/tv/${result.id}`);
      } else {
        navigate(`/anime/${result.id}`);
      }
    },
    [navigate]
  );

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const mediaInfo = MEDIA_TYPE_LABELS[activeMediaType];
  const MediaIcon = mediaInfo.icon;

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative flex items-center">
        <div className="absolute left-3 pointer-events-none text-muted-foreground">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen && e.target.value.trim().length > 0) {
              setIsOpen(true);
            }
          }}
          onFocus={() => {
            if (query.trim().length > 0 || results.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Search ${mediaInfo.label}...`}
          className="w-full h-9 pl-9 pr-9 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/30 transition-all"
          autoComplete="off"
          spellCheck={false}
        />
        {query.length > 0 && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 p-0.5 rounded-full text-muted-foreground hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (query.trim().length > 0 || results.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 z-[100] max-h-[70vh] overflow-y-auto rounded-2xl glass-panel border border-white/10 shadow-2xl shadow-black/50">
          {/* Section Header */}
          <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-[#121216]/95 backdrop-blur-xl rounded-t-2xl">
            <MediaIcon className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Searching {mediaInfo.label}
            </span>
            {hasSearched && !loading && (
              <span className="ml-auto text-[10px] text-muted-foreground/60 tabular-nums">
                {results.length} result{results.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Searching {mediaInfo.label.toLowerCase()}...
              </span>
            </div>
          )}

          {/* Results List */}
          {!loading && results.length > 0 && (
            <div className="p-1.5">
              {results.map((result) => (
                <button
                  key={`${result.mediaType}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 active:bg-white/10 transition-all cursor-pointer text-left group"
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-secondary shrink-0 shadow-md">
                    <img
                      src={result.image}
                      alt={result.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white line-clamp-1 group-hover:text-primary transition-colors">
                      {result.title}
                    </h4>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {result.subtitle}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                        {result.type}
                      </span>
                      {result.score && result.score !== "N/A" && (
                        <span className="text-[10px] font-semibold text-amber-400">
                          ★ {result.score}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results */}
          {!loading && hasSearched && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Search className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No {mediaInfo.label.toLowerCase()} found for "{debouncedQuery}"
              </p>
              <p className="text-xs text-muted-foreground/50">
                Try a different search term
              </p>
            </div>
          )}

          {/* Min length hint */}
          {!loading && !hasSearched && query.trim().length > 0 && query.trim().length < 2 && (
            <div className="flex items-center justify-center py-6">
              <p className="text-xs text-muted-foreground/60">
                Type at least 2 characters to search
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
