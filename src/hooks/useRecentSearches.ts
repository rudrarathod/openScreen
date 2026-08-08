import { useState, useEffect } from "react";

export function useRecentSearches(key: string = "openscreen_recent_searches") {
  const [searches, setSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setSearches(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to load recent searches", e);
    }
  }, [key]);

  const addSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save recent searches", e);
      }
      return updated;
    });
  };

  const removeSearch = (query: string) => {
    setSearches((prev) => {
      const updated = prev.filter((s) => s !== query);
      try {
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to remove search", e);
      }
      return updated;
    });
  };

  const clearSearches = () => {
    setSearches([]);
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error("Failed to clear searches", e);
    }
  };

  return {
    searches,
    addSearch,
    removeSearch,
    clearSearches,
  };
}
