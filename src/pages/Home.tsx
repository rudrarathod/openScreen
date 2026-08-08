import { useEffect, useState, useMemo } from "react";
import HeroBanner, { HeroData } from "../components/ui/HeroBanner";
import Carousel from "../components/ui/Carousel";
import ContinueWatchingSection from "../components/ui/ContinueWatchingSection";
import RecommendationsSection from "../components/ui/RecommendationsSection";
import { fetchMalRanking, MalAnime } from "../api/mal";
import { AnimeProp } from "../components/ui/AnimeCard";
import { HeroBannerSkeleton, CarouselSkeleton } from "../components/ui/Skeletons";
import { getFormattedAnimeTitles } from "../utils/title";
import { useMediaType } from "../context/MediaTypeContext";
import {
  fetchPopularMovies,
  fetchTopRatedMovies,
  fetchNowPlayingMovies,
  fetchTrendingMovies,
  fetchPopularTv,
  fetchTopRatedTv,
  fetchAiringTv,
  fetchTrendingTv,
  mapTmdbMovieToProp,
  mapTmdbTvToProp,
  getTmdbImageUrl,
  TmdbMovie,
  TmdbTvShow,
} from "../api/tmdb";

const ANIME_RANKING_CATEGORIES = [
  { id: "airing", title: "Top Airing Anime", type: "airing" },
  { id: "bypopularity", title: "Top Anime by Popularity", type: "bypopularity" },
  { id: "upcoming", title: "Top Upcoming Anime", type: "upcoming" },
  { id: "favorite", title: "Top Favorited Anime", type: "favorite" },
  { id: "tv", title: "Top Anime TV Series", type: "tv" },
  { id: "movie", title: "Top Anime Movies", type: "movie" },
];

export default function Home() {
  const { activeMediaType } = useMediaType();
  const [animeRankings, setAnimeRankings] = useState<Record<string, AnimeProp[]>>({});
  const [animeLoading, setAnimeLoading] = useState(true);

  // Movie state
  const [popularMovies, setPopularMovies] = useState<TmdbMovie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<TmdbMovie[]>([]);
  const [nowPlayingMovies, setNowPlayingMovies] = useState<TmdbMovie[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<TmdbMovie[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [moviesError, setMoviesError] = useState<string | null>(null);

  // TV Series state
  const [popularTv, setPopularTv] = useState<TmdbTvShow[]>([]);
  const [topRatedTv, setTopRatedTv] = useState<TmdbTvShow[]>([]);
  const [airingTv, setAiringTv] = useState<TmdbTvShow[]>([]);
  const [trendingTv, setTrendingTv] = useState<TmdbTvShow[]>([]);
  const [tvLoading, setTvLoading] = useState(false);
  const [tvError, setTvError] = useState<string | null>(null);

  // Fetch real Anime API data when viewing Anime mode
  useEffect(() => {
    let isMounted = true;

    async function loadAnimeData() {
      setAnimeLoading(true);

      const formatAnime = (items: MalAnime[]) =>
        items.map((item) => {
          const titles = getFormattedAnimeTitles(item);
          return {
            id: item.id.toString(),
            title: titles.title,
            subtitle: titles.subtitle,
            image: item.main_picture?.large || item.main_picture?.medium,
            score: item.mean || "N/A",
            type: item.media_type?.toUpperCase() || "TV",
            rating: item.rating,
            genres: item.genres?.map((g: any) => (typeof g === "string" ? g : g.name)) || [],
          };
        });

      try {
        const priorityCats = ANIME_RANKING_CATEGORIES.slice(0, 3);
        const remainingCats = ANIME_RANKING_CATEGORIES.slice(3);

        const priorityResults = await Promise.all(
          priorityCats.map((cat) => fetchMalRanking(cat.type, 15))
        );

        if (!isMounted) return;

        const initialRankings: Record<string, AnimeProp[]> = {};
        priorityCats.forEach((cat, index) => {
          initialRankings[cat.id] = formatAnime(priorityResults[index]);
        });

        setAnimeRankings(initialRankings);
        setAnimeLoading(false);

        const remainingResults = await Promise.all(
          remainingCats.map((cat) => fetchMalRanking(cat.type, 15))
        );

        if (!isMounted) return;

        const fullRankings: Record<string, AnimeProp[]> = { ...initialRankings };
        remainingCats.forEach((cat, index) => {
          fullRankings[cat.id] = formatAnime(remainingResults[index]);
        });

        setAnimeRankings(fullRankings);
      } catch (err) {
        console.error("Failed to load anime data:", err);
        if (isMounted) setAnimeLoading(false);
      }
    }

    loadAnimeData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch real Movies API data when switching to Movie mode
  useEffect(() => {
    if (activeMediaType !== "movie") return;
    let isMounted = true;

    async function loadMoviesData() {
      setMoviesLoading(true);
      setMoviesError(null);
      try {
        const [pop, top, now, trend] = await Promise.all([
          fetchPopularMovies(),
          fetchTopRatedMovies(),
          fetchNowPlayingMovies(),
          fetchTrendingMovies("day"),
        ]);
        if (!isMounted) return;

        setPopularMovies(pop);
        setTopRatedMovies(top);
        setNowPlayingMovies(now);
        setTrendingMovies(trend);
      } catch (err) {
        console.error("Failed to load Movies from TMDB API:", err);
        if (isMounted) setMoviesError("Failed to load movie lists.");
      } finally {
        if (isMounted) setMoviesLoading(false);
      }
    }

    loadMoviesData();
    return () => {
      isMounted = false;
    };
  }, [activeMediaType]);

  // Fetch real TV Series API data when switching to TV mode
  useEffect(() => {
    if (activeMediaType !== "tv") return;
    let isMounted = true;

    async function loadTvData() {
      setTvLoading(true);
      setTvError(null);
      try {
        const [pop, top, air, trend] = await Promise.all([
          fetchPopularTv(),
          fetchTopRatedTv(),
          fetchAiringTv(),
          fetchTrendingTv("day"),
        ]);
        if (!isMounted) return;

        setPopularTv(pop);
        setTopRatedTv(top);
        setAiringTv(air);
        setTrendingTv(trend);
      } catch (err) {
        console.error("Failed to load TV Series from TMDB API:", err);
        if (isMounted) setTvError("Failed to load TV series lists.");
      } finally {
        if (isMounted) setTvLoading(false);
      }
    }

    loadTvData();
    return () => {
      isMounted = false;
    };
  }, [activeMediaType]);

  const animePool = useMemo(() => {
    return Object.values(animeRankings).flat();
  }, [animeRankings]);

  // Compute Hero Banner depending on active MediaType
  const heroData: HeroData = useMemo(() => {
    if (activeMediaType === "movie") {
      const topMovie = trendingMovies[0] || popularMovies[0];
      if (topMovie) {
        return {
          id: topMovie.id.toString(),
          title: topMovie.title,
          subtitle: topMovie.release_date?.substring(0, 4) || "Movie",
          description: topMovie.overview || "Explore blockbuster movies streaming in high quality.",
          coverImage: getTmdbImageUrl(topMovie.backdrop_path || topMovie.poster_path, "original"),
          genres: ["Movie", "Trending"],
          rating: topMovie.vote_average ? topMovie.vote_average.toFixed(1) : "N/A",
          year: topMovie.release_date?.substring(0, 4) || new Date().getFullYear().toString(),
          type: "Movie",
        };
      }
    }

    if (activeMediaType === "tv") {
      const topTV = trendingTv[0] || popularTv[0];
      if (topTV) {
        return {
          id: topTV.id.toString(),
          title: topTV.name,
          subtitle: topTV.first_air_date?.substring(0, 4) || "TV Series",
          description: topTV.overview || "Binge-watch trending TV series and top rated shows.",
          coverImage: getTmdbImageUrl(topTV.backdrop_path || topTV.poster_path, "original"),
          genres: ["TV Series", "Trending"],
          rating: topTV.vote_average ? topTV.vote_average.toFixed(1) : "N/A",
          year: topTV.first_air_date?.substring(0, 4) || new Date().getFullYear().toString(),
          type: "TV",
        };
      }
    }

    // Default: Anime (API data)
    const heroItems = animeRankings["airing"] || animeRankings["bypopularity"] || [];
    if (heroItems.length > 0) {
      const topAnime = heroItems[0];
      return {
        id: topAnime.id.toString(),
        title: topAnime.title,
        subtitle: topAnime.subtitle,
        description: "Explore top-rated seasonal anime series, trending releases and timeless classics streaming right now.",
        coverImage: topAnime.image || "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&h=900&fit=crop",
        genres: topAnime.genres || ["Trending", "Popular"],
        rating: String(topAnime.score || "N/A"),
        year: new Date().getFullYear().toString(),
        type: topAnime.type || "ANIME",
      };
    }

    return {
      id: "1",
      title: "Discover Anime",
      description: "Loading streaming highlights...",
      coverImage: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&h=900&fit=crop",
      genres: ["Anime"],
      rating: "N/A",
      year: new Date().getFullYear().toString(),
      type: "ANIME",
    };
  }, [activeMediaType, animeRankings, trendingMovies, popularMovies, trendingTv, popularTv]);

  if (
    (activeMediaType === "anime" && animeLoading) ||
    (activeMediaType === "movie" && moviesLoading) ||
    (activeMediaType === "tv" && tvLoading)
  ) {
    return (
      <div className="flex flex-col gap-6 pb-12 min-h-screen bg-[#09090b]">
        <HeroBannerSkeleton />
        <div className="flex flex-col gap-4 mt-[-40px] md:mt-[-60px] z-10 relative px-4 md:px-12">
          <CarouselSkeleton title="Loading Content..." />
          <CarouselSkeleton title="Popular Highlights..." />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-16 min-h-screen bg-[#09090b]">
      {/* Single Cinematic Hero Banner */}
      <HeroBanner anime={heroData} />

      {/* Content Sections directly below single hero */}
      <div className="flex flex-col gap-8 z-10 relative">
        {/* Active Content: ANIME (Real MAL API) */}
        {activeMediaType === "anime" && (
          <>
            <ContinueWatchingSection />
            <RecommendationsSection candidatePool={animePool} />

            {ANIME_RANKING_CATEGORIES.map((cat) => {
              const items = animeRankings[cat.id];
              if (!items || items.length === 0) return null;

              return (
                <Carousel
                  key={cat.id}
                  title={cat.title}
                  items={items}
                  layout="portrait"
                />
              );
            })}
          </>
        )}

        {/* Active Content: MOVIES (Real TMDB API) */}
        {activeMediaType === "movie" && (
          <>
            <ContinueWatchingSection />
            {moviesError ? (
              <p className="p-8 text-center text-rose-400 font-medium">{moviesError}</p>
            ) : (
              <>
                {popularMovies.length > 0 && (
                  <Carousel
                    title="Popular Blockbusters"
                    items={popularMovies.map(mapTmdbMovieToProp)}
                    layout="portrait"
                  />
                )}
                {nowPlayingMovies.length > 0 && (
                  <Carousel
                    title="Now Playing in Theaters"
                    items={nowPlayingMovies.map(mapTmdbMovieToProp)}
                    layout="portrait"
                  />
                )}
                {topRatedMovies.length > 0 && (
                  <Carousel
                    title="Top Rated Movies"
                    items={topRatedMovies.map(mapTmdbMovieToProp)}
                    layout="portrait"
                  />
                )}
                {trendingMovies.length > 0 && (
                  <Carousel
                    title="Trending Today"
                    items={trendingMovies.map(mapTmdbMovieToProp)}
                    layout="portrait"
                  />
                )}
              </>
            )}
          </>
        )}

        {/* Active Content: TV SERIES (Real TMDB API) */}
        {activeMediaType === "tv" && (
          <>
            <ContinueWatchingSection />
            {tvError ? (
              <p className="p-8 text-center text-rose-400 font-medium">{tvError}</p>
            ) : (
              <>
                {popularTv.length > 0 && (
                  <Carousel
                    title="Popular TV Series"
                    items={popularTv.map(mapTmdbTvToProp)}
                    layout="portrait"
                  />
                )}
                {airingTv.length > 0 && (
                  <Carousel
                    title="Currently Airing Shows"
                    items={airingTv.map(mapTmdbTvToProp)}
                    layout="portrait"
                  />
                )}
                {topRatedTv.length > 0 && (
                  <Carousel
                    title="Top Rated TV Series"
                    items={topRatedTv.map(mapTmdbTvToProp)}
                    layout="portrait"
                  />
                )}
                {trendingTv.length > 0 && (
                  <Carousel
                    title="Trending Series"
                    items={trendingTv.map(mapTmdbTvToProp)}
                    layout="portrait"
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

