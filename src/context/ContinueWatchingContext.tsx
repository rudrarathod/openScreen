import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface ContinueWatchingItem {
  animeId: string | number;
  title: string;
  subtitle?: string;
  image: string;
  epNumber: number;
  epTitle?: string;
  streamType?: "sub" | "dub";
  updatedAt: number;
  totalEps?: number;
}

// Structure for tracking per-episode watch progress
// Map of animeId -> { [epNumber]: progressPercentage (0-100) }
export type WatchedEpisodesMap = Record<string, Record<number, number>>;

interface ContinueWatchingContextType {
  history: ContinueWatchingItem[];
  watchedMap: WatchedEpisodesMap;
  saveContinueWatching: (item: {
    animeId: string | number;
    title: string;
    subtitle?: string;
    image: string;
    epNumber: number;
    epTitle?: string;
    streamType?: "sub" | "dub";
    totalEps?: number;
    progress?: number;
  }) => void;
  removeFromHistory: (animeId: string | number) => void;
  clearHistory: () => void;
  isEpisodeWatched: (animeId: string | number, epNumber: number) => boolean;
  getEpisodeProgress: (animeId: string | number, epNumber: number) => number;
  markEpisodeWatched: (animeId: string | number, epNumber: number, progress?: number) => void;
  toggleEpisodeWatched: (animeId: string | number, epNumber: number) => void;
  getWatchedEpisodes: (animeId: string | number) => number[];
}

const STORAGE_KEY = "openScreen_continue_watching_v1";
const WATCHED_KEY = "openScreen_watched_episodes_v1";

const ContinueWatchingContext = createContext<ContinueWatchingContextType | undefined>(undefined);

export function ContinueWatchingProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<ContinueWatchingItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load continue watching history from localStorage", e);
    }
    return [];
  });

  const [watchedMap, setWatchedMap] = useState<WatchedEpisodesMap>(() => {
    try {
      const saved = localStorage.getItem(WATCHED_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load watched episodes from localStorage", e);
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save continue watching history to localStorage", e);
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(WATCHED_KEY, JSON.stringify(watchedMap));
    } catch (e) {
      console.error("Failed to save watched episodes to localStorage", e);
    }
  }, [watchedMap]);

  const markEpisodeWatched = useCallback((animeId: string | number, epNumber: number, progress: number = 100) => {
    const key = String(animeId);
    setWatchedMap((prev) => {
      const animeData = prev[key] || {};
      if (animeData[epNumber] === progress) return prev;
      return {
        ...prev,
        [key]: {
          ...animeData,
          [epNumber]: progress,
        },
      };
    });
  }, []);

  const toggleEpisodeWatched = useCallback((animeId: string | number, epNumber: number) => {
    const key = String(animeId);
    setWatchedMap((prev) => {
      const animeData = prev[key] || {};
      const currentProgress = animeData[epNumber] || (
        history.some((item) => String(item.animeId) === key && item.epNumber === epNumber) ? 100 : 0
      );
      const newProgress = currentProgress > 0 ? 0 : 100;
      return {
        ...prev,
        [key]: {
          ...animeData,
          [epNumber]: newProgress,
        },
      };
    });
  }, [history]);

  const isEpisodeWatched = useCallback((animeId: string | number, epNumber: number): boolean => {
    const key = String(animeId);
    const progress = watchedMap[key]?.[epNumber];
    if (typeof progress === "number" && progress > 0) return true;
    return history.some((item) => String(item.animeId) === key && item.epNumber === epNumber);
  }, [watchedMap, history]);

  const getEpisodeProgress = useCallback((animeId: string | number, epNumber: number): number => {
    const key = String(animeId);
    const progress = watchedMap[key]?.[epNumber];
    if (typeof progress === "number" && progress > 0) return progress;
    const inHistory = history.some((item) => String(item.animeId) === key && item.epNumber === epNumber);
    return inHistory ? 100 : 0;
  }, [watchedMap, history]);

  const getWatchedEpisodes = useCallback((animeId: string | number): number[] => {
    const key = String(animeId);
    const animeData = watchedMap[key] || {};
    return Object.keys(animeData)
      .map(Number)
      .filter((ep) => animeData[ep] > 0);
  }, [watchedMap]);

  const saveContinueWatching = useCallback((item: {
    animeId: string | number;
    title: string;
    subtitle?: string;
    image: string;
    epNumber: number;
    epTitle?: string;
    streamType?: "sub" | "dub";
    totalEps?: number;
    progress?: number;
  }) => {
    const progressVal = item.progress !== undefined ? item.progress : 100;
    markEpisodeWatched(item.animeId, item.epNumber, progressVal);

    setHistory((prev) => {
      const first = prev[0];
      if (
        first &&
        String(first.animeId) === String(item.animeId) &&
        first.epNumber === item.epNumber &&
        (first.streamType || "sub") === (item.streamType || "sub") &&
        first.epTitle === item.epTitle &&
        first.title === item.title &&
        first.subtitle === item.subtitle &&
        first.image === item.image
      ) {
        return prev;
      }

      const filtered = prev.filter((i) => String(i.animeId) !== String(item.animeId));
      const newItem: ContinueWatchingItem = {
        animeId: item.animeId,
        title: item.title,
        subtitle: item.subtitle,
        image: item.image,
        epNumber: item.epNumber,
        epTitle: item.epTitle,
        streamType: item.streamType || "sub",
        updatedAt: Date.now(),
        totalEps: item.totalEps,
      };
      return [newItem, ...filtered].slice(0, 20);
    });
  }, [markEpisodeWatched]);

  const removeFromHistory = useCallback((animeId: string | number) => {
    setHistory((prev) => prev.filter((i) => String(i.animeId) !== String(animeId)));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setWatchedMap({});
  }, []);

  return (
    <ContinueWatchingContext.Provider
      value={{
        history,
        watchedMap,
        saveContinueWatching,
        removeFromHistory,
        clearHistory,
        isEpisodeWatched,
        getEpisodeProgress,
        markEpisodeWatched,
        toggleEpisodeWatched,
        getWatchedEpisodes,
      }}
    >
      {children}
    </ContinueWatchingContext.Provider>
  );
}

export function useContinueWatching() {
  const context = useContext(ContinueWatchingContext);
  if (!context) {
    throw new Error("useContinueWatching must be used within a ContinueWatchingProvider");
  }
  return context;
}
