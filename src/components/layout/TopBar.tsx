import { useState, useEffect, useRef } from "react";
import { LayoutGrid, Search, X, Loader2, ChevronDown, Check } from "lucide-react";
import { useNavigate, useLocation, useSearchParams } from "react-router";
import { useMediaType, MediaType } from "../../context/MediaTypeContext";
import { cn } from "../../utils/cn";

const MEDIA_TYPE_PLACEHOLDERS: Record<MediaType, string> = {
  anime: "Anime",
  movie: "Movies",
  tv: "TV Series",
};

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeMediaType, setActiveMediaType } = useMediaType();

  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Sync local input value when URL query parameter changes
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  const handleTabClick = (type: MediaType) => {
    setActiveMediaType(type);
    if (location.pathname !== "/" && location.pathname !== "/search") {
      navigate("/");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (location.pathname !== "/search") {
      navigate(`/search?q=${encodeURIComponent(val)}`, { replace: true });
    } else {
      if (val.trim()) {
        setSearchParams({ q: val }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    }
  };

  const handleFocus = () => {
    if (location.pathname !== "/search") {
      navigate(`/search${query.trim() ? `?q=${encodeURIComponent(query)}` : ""}`);
    }
  };

  const handleClear = () => {
    setQuery("");
    if (location.pathname === "/search") {
      setSearchParams({}, { replace: true });
    } else {
      navigate("/search");
    }
    inputRef.current?.focus();
  };

  const placeholderText = `Search ${MEDIA_TYPE_PLACEHOLDERS[activeMediaType]}...`;

  return (
    <header className="h-16 shrink-0 sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-xl border-b border-white/5 px-4 sm:px-8 flex items-center justify-between gap-4 select-none">
      {/* Top Navigation Tabs: Anime, Movies, TV Series + Gateway Switcher */}
      <nav className="flex items-center gap-1 sm:gap-2 shrink-0 relative">
        {/* Category Switcher Button (Opens dropdown on mobile, Link on desktop) */}
        <button
          ref={buttonRef}
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className="h-9 px-3 rounded-xl text-muted-foreground hover:text-white hover:bg-[#27272a] hover:border-white/20 transition-all cursor-pointer flex items-center gap-1.5 border border-white/10 bg-[#18181b] md:bg-transparent md:border-none md:p-2 md:h-auto"
          title="Switch Category"
        >
          <LayoutGrid className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs font-bold capitalize text-white md:hidden">
            {MEDIA_TYPE_PLACEHOLDERS[activeMediaType]}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground md:hidden shrink-0" />
        </button>

        {/* Dropdown Menu (Mobile Only) */}
        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute top-11 left-0 z-50 min-w-[160px] bg-[#121216] border border-white/10 rounded-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 md:hidden"
          >
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-white/5 mb-1">
              Select Category
            </div>
            {(["anime", "movie", "tv"] as MediaType[]).map((type) => {
              const isCurrent = activeMediaType === type;
              return (
                <button
                  key={type}
                  onClick={() => {
                    handleTabClick(type);
                    setIsDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all mb-0.5 last:mb-0 cursor-pointer",
                    isCurrent
                      ? "text-primary bg-primary/10 font-extrabold"
                      : "text-foreground hover:bg-white/10"
                  )}
                >
                  <span>{MEDIA_TYPE_PLACEHOLDERS[type]}</span>
                  {isCurrent && <Check className="w-3 h-3 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        <div className="hidden md:flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => handleTabClick("anime")}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeMediaType === "anime"
                ? "text-primary bg-primary/10 font-semibold"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            Anime
          </button>

          <button
            onClick={() => handleTabClick("movie")}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeMediaType === "movie"
                ? "text-primary bg-primary/10 font-semibold"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            Movies
          </button>

          <button
            onClick={() => handleTabClick("tv")}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeMediaType === "tv"
                ? "text-primary bg-primary/10 font-semibold"
                : "text-muted-foreground hover:text-white hover:bg-white/5"
            }`}
          >
            TV Series
          </button>
        </div>
      </nav>

      {/* Header Search Input */}
      <div className="relative flex items-center flex-1 max-w-xs sm:max-w-sm md:max-w-md ml-auto">
        <div className="absolute left-3 pointer-events-none text-muted-foreground">
          <Search className="w-4 h-4" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholderText}
          className="w-full h-9 pl-9 pr-9 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary/30 transition-all"
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
    </header>
  );
}
