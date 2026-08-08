import React, { createContext, useContext, useState, useEffect } from "react";

export type MediaType = "anime" | "movie" | "tv";

interface MediaTypeContextType {
  activeMediaType: MediaType;
  setActiveMediaType: (type: MediaType) => void;
  hasChosenCategory: boolean;
  setHasChosenCategory: (chosen: boolean) => void;
}

const MediaTypeContext = createContext<MediaTypeContextType | undefined>(undefined);

export function MediaTypeProvider({ children }: { children: React.ReactNode }) {
  const [activeMediaType, setActiveMediaTypeState] = useState<MediaType>(() => {
    try {
      const saved = localStorage.getItem("openscreen_media_type");
      if (saved === "anime" || saved === "movie" || saved === "tv") {
        return saved;
      }
    } catch (e) {}
    return "anime";
  });

  const [hasChosenCategory, setHasChosenCategoryState] = useState<boolean>(false);

  const setActiveMediaType = (type: MediaType) => {
    setActiveMediaTypeState(type);
    try {
      localStorage.setItem("openscreen_media_type", type);
    } catch (e) {}
  };

  const setHasChosenCategory = (chosen: boolean) => {
    setHasChosenCategoryState(chosen);
    try {
      localStorage.setItem("openscreen_category_chosen", chosen ? "true" : "false");
    } catch (e) {}
  };

  return (
    <MediaTypeContext.Provider
      value={{
        activeMediaType,
        setActiveMediaType,
        hasChosenCategory,
        setHasChosenCategory,
      }}
    >
      {children}
    </MediaTypeContext.Provider>
  );
}

export function useMediaType() {
  const context = useContext(MediaTypeContext);
  if (!context) {
    throw new Error("useMediaType must be used within a MediaTypeProvider");
  }
  return context;
}

