import { useState, useEffect } from "react";
import { Compass, Loader2, Sparkles, Filter } from "lucide-react";
import { ANIME_GENRES, fetchAnimeByGenre, Genre } from "../api/mal";
import AnimeCard, { AnimeProp } from "../components/ui/AnimeCard";
import { AnimeCardSkeleton } from "../components/ui/Skeletons";
import { useMediaType } from "../context/MediaTypeContext";
import {
  fetchMovieGenres,
  fetchTvGenres,
  fetchMoviesByGenre,
  fetchTvByGenre,
  mapTmdbMovieToProp,
  mapTmdbTvToProp,
  TmdbGenre,
} from "../api/tmdb";

export default function Discover() {
  const { activeMediaType } = useMediaType();

  // Anime Genre State
  const [selectedAnimeGenre, setSelectedAnimeGenre] = useState<Genre>(ANIME_GENRES[0]);

  // TMDB Genre Lists & Selection
  const [tmdbGenres, setTmdbGenres] = useState<TmdbGenre[]>([]);
  const [selectedTmdbGenre, setSelectedTmdbGenre] = useState<TmdbGenre | null>(null);

  // Content List State
  const [itemList, setItemList] = useState<AnimeProp[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Load TMDB Genres when activeMediaType changes to 'movie' or 'tv'
  useEffect(() => {
    if (activeMediaType === "anime") return;
    let isMounted = true;

    async function loadGenres() {
      try {
        const genres = activeMediaType === "movie" ? await fetchMovieGenres() : await fetchTvGenres();
        if (!isMounted) return;
        setTmdbGenres(genres);
        if (genres.length > 0) {
          setSelectedTmdbGenre(genres[0]);
        }
      } catch (err) {
        console.error("Failed to load TMDB genres:", err);
      }
    }

    loadGenres();
    return () => {
      isMounted = false;
    };
  }, [activeMediaType]);

  // Load items when activeMediaType or selected genre changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setPage(1);
    setHasMore(true);

    async function loadGenreItems() {
      try {
        if (activeMediaType === "anime") {
          const res = await fetchAnimeByGenre(selectedAnimeGenre.id, 1, 24);
          if (!isMounted) return;

          const mapped: AnimeProp[] = res.map((item) => ({
            id: item.id.toString(),
            title: item.title,
            subtitle: item.alternative_titles?.ja || item.alternative_titles?.en || "",
            image: item.main_picture?.large || item.main_picture?.medium || "",
            score: item.mean || "N/A",
            type: item.media_type?.toUpperCase() || "TV",
            rating: item.rating,
            genres: item.genres?.map((g) => g.name) || [],
          }));

          setItemList(mapped);
          if (mapped.length < 20) setHasMore(false);
        } else if (activeMediaType === "movie" && selectedTmdbGenre) {
          const movies = await fetchMoviesByGenre(selectedTmdbGenre.id, 1);
          if (!isMounted) return;
          const mapped = movies.map(mapTmdbMovieToProp);
          setItemList(mapped);
          if (mapped.length < 20) setHasMore(false);
        } else if (activeMediaType === "tv" && selectedTmdbGenre) {
          const tvShows = await fetchTvByGenre(selectedTmdbGenre.id, 1);
          if (!isMounted) return;
          const mapped = tvShows.map(mapTmdbTvToProp);
          setItemList(mapped);
          if (mapped.length < 20) setHasMore(false);
        }
      } catch (err) {
        console.error("Failed to fetch genre items:", err);
        if (isMounted) setItemList([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadGenreItems();

    return () => {
      isMounted = false;
    };
  }, [selectedAnimeGenre, selectedTmdbGenre, activeMediaType]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      let mapped: AnimeProp[] = [];
      if (activeMediaType === "anime") {
        const res = await fetchAnimeByGenre(selectedAnimeGenre.id, nextPage, 24);
        mapped = res.map((item) => ({
          id: item.id.toString(),
          title: item.title,
          subtitle: item.alternative_titles?.ja || item.alternative_titles?.en || "",
          image: item.main_picture?.large || item.main_picture?.medium || "",
          score: item.mean || "N/A",
          type: item.media_type?.toUpperCase() || "TV",
          rating: item.rating,
          genres: item.genres?.map((g) => g.name) || [],
        }));
      } else if (activeMediaType === "movie" && selectedTmdbGenre) {
        const movies = await fetchMoviesByGenre(selectedTmdbGenre.id, nextPage);
        mapped = movies.map(mapTmdbMovieToProp);
      } else if (activeMediaType === "tv" && selectedTmdbGenre) {
        const tvShows = await fetchTvByGenre(selectedTmdbGenre.id, nextPage);
        mapped = tvShows.map(mapTmdbTvToProp);
      }

      if (mapped.length === 0) {
        setHasMore(false);
      } else {
        setItemList((prev) => {
          const existingIds = new Set(prev.map((a) => a.id));
          const newItems = mapped.filter((a) => !existingIds.has(a.id));
          return [...prev, ...newItems];
        });
        setPage(nextPage);
        if (mapped.length < 20) setHasMore(false);
      }
    } catch (err) {
      console.error("Failed to load more items:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const currentGenreName =
    activeMediaType === "anime"
      ? selectedAnimeGenre.name
      : selectedTmdbGenre?.name || "Genre";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full min-h-screen pb-16 bg-[#09090b]">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Compass className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white capitalize">
            Discover {activeMediaType === "anime" ? "Anime" : activeMediaType === "movie" ? "Movies" : "TV Series"}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground pl-0.5">
          Browse top rated {activeMediaType} releases by genre
        </p>
      </div>

      {/* Genre Filter Container */}
      <div className="flex flex-col gap-2 bg-[#121216] p-3 sm:p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span>Select Genre</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {activeMediaType === "anime"
            ? ANIME_GENRES.map((genre) => {
                const isSelected = selectedAnimeGenre.id === genre.id;
                return (
                  <button
                    key={genre.id}
                    onClick={() => setSelectedAnimeGenre(genre)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-primary text-white font-bold shadow-md shadow-primary/20"
                        : "bg-[#18181b] text-muted-foreground hover:text-white border border-white/5"
                    }`}
                  >
                    {genre.name}
                  </button>
                );
              })
            : tmdbGenres.map((genre) => {
                const isSelected = selectedTmdbGenre?.id === genre.id;
                return (
                  <button
                    key={genre.id}
                    onClick={() => setSelectedTmdbGenre(genre)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "bg-primary text-white font-bold shadow-md shadow-primary/20"
                        : "bg-[#18181b] text-muted-foreground hover:text-white border border-white/5"
                    }`}
                  >
                    {genre.name}
                  </button>
                );
              })}
        </div>
      </div>

      {/* Header Indicator */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-lg sm:text-xl font-bold font-display text-white">
            {currentGenreName} <span className="capitalize">{activeMediaType}</span>
          </h2>
          {!loading && (
            <span className="text-xs text-muted-foreground bg-[#18181b] px-2.5 py-0.5 rounded-full border border-white/5">
              {itemList.length} items
            </span>
          )}
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5">
          {Array.from({ length: 18 }).map((_, i) => (
            <AnimeCardSkeleton key={i} />
          ))}
        </div>
      ) : itemList.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4 md:gap-5">
            {itemList.map((item) => (
              <AnimeCard key={item.id} anime={item} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#18181b] hover:bg-white/10 border border-white/10 text-sm font-medium transition-all cursor-pointer disabled:opacity-50 text-white"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <span>Load More {currentGenreName} Items</span>
                )}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
          <Compass className="w-12 h-12 opacity-40" />
          <p className="text-base font-medium">No items found for this genre</p>
        </div>
      )}
    </div>
  );
}
