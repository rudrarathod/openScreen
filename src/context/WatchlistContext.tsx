import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type WatchlistStatus = "Watching" | "Plan to Watch" | "Completed" | "On Hold" | "Dropped";

export type MediaTypeCategory = "anime" | "movie" | "tv";

export interface WatchlistItem {
  id: string | number;
  title: string;
  subtitle?: string;
  image: string;
  score?: number | string;
  type?: string;
  mediaType?: MediaTypeCategory;
  status: WatchlistStatus;
  addedAt: number;
  progressEp?: number;
  totalEps?: number;
  genres?: string[];
}

export function inferMediaType(id: string | number, type?: string, explicitMediaType?: string): MediaTypeCategory {
  if (explicitMediaType === "anime" || explicitMediaType === "movie" || explicitMediaType === "tv") {
    return explicitMediaType;
  }
  const idStr = String(id);
  if (idStr.startsWith("movie-")) return "movie";
  if (idStr.startsWith("tv-")) return "tv";
  if (type === "Movie" && !/^\d+$/.test(idStr)) return "movie";
  if (type === "TV" && !/^\d+$/.test(idStr)) return "tv";
  return "anime";
}

interface WatchlistContextType {
  watchlist: WatchlistItem[];
  addToWatchlist: (item: {
    id: string | number;
    title: string;
    subtitle?: string;
    image: string;
    score?: number | string;
    type?: string;
    mediaType?: MediaTypeCategory;
    status?: WatchlistStatus;
    totalEps?: number;
    progressEp?: number;
    genres?: string[];
  }) => void;
  removeFromWatchlist: (id: string | number) => void;
  updateWatchlistStatus: (id: string | number, status: WatchlistStatus) => void;
  updateWatchlistProgress: (id: string | number, progressEp: number) => void;
  syncWatchlistProgress: (item: {
    id: string | number;
    title: string;
    subtitle?: string;
    image: string;
    score?: number | string;
    type?: string;
    mediaType?: MediaTypeCategory;
    epNumber: number;
    totalEps?: number;
  }) => void;
  syncAiredTotal: (id: string | number, totalEps: number) => void;
  isInWatchlist: (id: string | number) => boolean;
  getWatchlistItem: (id: string | number) => WatchlistItem | undefined;
  clearWatchlist: () => void;
}

const STORAGE_KEY = "openScreen_watchlist_v2";

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load watchlist from localStorage", e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
    } catch (e) {
      console.error("Failed to save watchlist to localStorage", e);
    }
  }, [watchlist]);

  const addToWatchlist = useCallback((item: {
    id: string | number;
    title: string;
    subtitle?: string;
    image: string;
    score?: number | string;
    type?: string;
    mediaType?: MediaTypeCategory;
    status?: WatchlistStatus;
    totalEps?: number;
    progressEp?: number;
    genres?: string[];
  }) => {
    setWatchlist((prev) => {
      const existing = prev.find((i) => String(i.id) === String(item.id));
      const targetStatus = item.status || "Plan to Watch";
      const totalEps = Math.max(item.totalEps || 0, existing?.totalEps || 0);
      let initialProgress = item.progressEp !== undefined ? item.progressEp : (existing?.progressEp || 0);

      if (targetStatus === "Completed" && totalEps > 0) {
        initialProgress = totalEps;
      } else if (targetStatus === "Watching" && initialProgress === 0) {
        initialProgress = 1;
      }

      let finalStatus = targetStatus;
      // If marked Completed but there are un-watched aired episodes, move to Watching
      if (finalStatus === "Completed" && totalEps > 0 && initialProgress < totalEps) {
        finalStatus = "Watching";
      }

      const mediaType = inferMediaType(item.id, item.type, item.mediaType);

      if (existing) {
        return prev.map((i) =>
          String(i.id) === String(item.id)
            ? {
                ...i,
                title: item.title || i.title,
                subtitle: item.subtitle || i.subtitle,
                mediaType: mediaType || i.mediaType,
                status: finalStatus,
                progressEp: initialProgress,
                totalEps: totalEps || i.totalEps,
                genres: (item.genres && item.genres.length > 0) ? item.genres : i.genres,
              }
            : i
        );
      }

      const newItem: WatchlistItem = {
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        image: item.image,
        score: item.score,
        type: item.type,
        mediaType: mediaType,
        status: finalStatus,
        addedAt: Date.now(),
        progressEp: initialProgress,
        totalEps: totalEps || undefined,
        genres: item.genres || [],
      };
      return [newItem, ...prev];
    });
  }, []);

  const removeFromWatchlist = useCallback((id: string | number) => {
    setWatchlist((prev) => prev.filter((item) => String(item.id) !== String(id)));
  }, []);

  const updateWatchlistStatus = useCallback((id: string | number, status: WatchlistStatus) => {
    setWatchlist((prev) =>
      prev.map((item) => {
        if (String(item.id) !== String(id)) return item;

        let progressEp = item.progressEp || 0;
        if (status === "Completed" && item.totalEps && item.totalEps > 0) {
          progressEp = item.totalEps;
        } else if (status === "Watching" && progressEp === 0) {
          progressEp = 1;
        } else if (status === "Plan to Watch" && item.totalEps && progressEp >= item.totalEps) {
          progressEp = 0;
        }

        return { ...item, status, progressEp };
      })
    );
  }, []);

  const updateWatchlistProgress = useCallback((id: string | number, progressEp: number) => {
    setWatchlist((prev) =>
      prev.map((item) => {
        if (String(item.id) !== String(id)) return item;

        const maxEps = item.totalEps && item.totalEps > 0 ? item.totalEps : Infinity;
        const newProgress = Math.min(maxEps, Math.max(0, progressEp));
        let newStatus = item.status;

        if (item.totalEps && item.totalEps > 0 && newProgress >= item.totalEps) {
          newStatus = "Completed";
        } else if (newProgress < (item.totalEps || Infinity) && item.status === "Completed") {
          // If newProgress is less than totalEps, transition back to Watching
          newStatus = "Watching";
        } else if (newProgress > 0 && item.status === "Plan to Watch") {
          newStatus = "Watching";
        }

        return { ...item, progressEp: newProgress, status: newStatus };
      })
    );
  }, []);

  const syncWatchlistProgress = useCallback((item: {
    id: string | number;
    title: string;
    subtitle?: string;
    image: string;
    score?: number | string;
    type?: string;
    mediaType?: MediaTypeCategory;
    epNumber: number;
    totalEps?: number;
  }) => {
    setWatchlist((prev) => {
      const existing = prev.find((i) => String(i.id) === String(item.id));
      const totalEps = Math.max(item.totalEps || 0, existing?.totalEps || 0);
      const epNumber = Math.max(1, item.epNumber);
      const mediaType = inferMediaType(item.id, item.type, item.mediaType);

      if (existing) {
        const newProgress = Math.max(existing.progressEp || 0, epNumber);
        let newStatus = existing.status;

        if (totalEps > 0 && newProgress >= totalEps) {
          newStatus = "Completed";
        } else if (existing.status === "Completed" && totalEps > newProgress) {
          // New episode aired and user is currently watching
          newStatus = "Watching";
        } else if (existing.status === "Plan to Watch" || existing.status === "Dropped" || existing.status === "On Hold") {
          newStatus = "Watching";
        }

        return prev.map((i) =>
          String(i.id) === String(item.id)
            ? {
                ...i,
                title: item.title || i.title,
                subtitle: item.subtitle || i.subtitle,
                mediaType: mediaType || i.mediaType,
                progressEp: newProgress,
                status: newStatus,
                totalEps: totalEps || i.totalEps,
              }
            : i
        );
      }

      // Auto add to watchlist if watching
      const initialStatus: WatchlistStatus = (totalEps > 0 && epNumber >= totalEps) ? "Completed" : "Watching";
      const newItem: WatchlistItem = {
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        image: item.image,
        score: item.score,
        type: item.type,
        mediaType: mediaType,
        status: initialStatus,
        addedAt: Date.now(),
        progressEp: epNumber,
        totalEps: totalEps || undefined,
      };
      return [newItem, ...prev];
    });
  }, []);

  const syncAiredTotal = useCallback((id: string | number, totalEps: number) => {
    if (!totalEps || totalEps <= 0) return;
    setWatchlist((prev) =>
      prev.map((item) => {
        if (String(item.id) !== String(id)) return item;
        const newTotal = Math.max(item.totalEps || 0, totalEps);
        let newStatus = item.status;

        // If anime was marked Completed but new episodes aired (progress < newTotal)
        if (item.status === "Completed" && (item.progressEp || 0) < newTotal) {
          newStatus = "Watching";
        }

        return {
          ...item,
          totalEps: newTotal,
          status: newStatus,
        };
      })
    );
  }, []);

  const isInWatchlist = useCallback((id: string | number) => {
    return watchlist.some((item) => String(item.id) === String(id));
  }, [watchlist]);

  const getWatchlistItem = useCallback((id: string | number) => {
    return watchlist.find((item) => String(item.id) === String(id));
  }, [watchlist]);

  const clearWatchlist = useCallback(() => {
    setWatchlist([]);
  }, []);

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        updateWatchlistStatus,
        updateWatchlistProgress,
        syncWatchlistProgress,
        syncAiredTotal,
        isInWatchlist,
        getWatchlistItem,
        clearWatchlist,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error("useWatchlist must be used within a WatchlistProvider");
  }
  return context;
}
