import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { motion } from "framer-motion";
import { Check, Sparkles, Film, Tv } from "lucide-react";
import { useMediaType, MediaType } from "../context/MediaTypeContext";
import { cn } from "../utils/cn";

interface CategoryOption {
  id: MediaType;
  name: string;
  icon: typeof Sparkles;
  description: string;
}

const CATEGORIES: CategoryOption[] = [
  {
    id: "anime",
    name: "Anime",
    icon: Sparkles,
    description: "Trending Series & Anime",
  },
  {
    id: "movie",
    name: "Movies",
    icon: Film,
    description: "Films & Features",
  },
  {
    id: "tv",
    name: "TV Series",
    icon: Tv,
    description: "Shows & Seasons",
  },
];

export default function SelectCategory() {
  const navigate = useNavigate();
  const { activeMediaType, setActiveMediaType, setHasChosenCategory } = useMediaType();
  const [selected, setSelected] = useState<MediaType>(activeMediaType || "anime");

  const handleConfirm = (id: MediaType) => {
    setSelected(id);
    setActiveMediaType(id);
    setHasChosenCategory(true);
    navigate("/", { replace: true });
  };

  return (
    <div className="h-[100dvh] w-full bg-[#08080a] text-white flex flex-col justify-between p-4 sm:p-8 md:p-10 select-none overflow-hidden relative">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header with openScreen Logo */}
      <header className="w-full max-w-6xl mx-auto z-10 shrink-0">
        <Link
          to="/"
          onClick={() => handleConfirm(selected)}
          className="flex items-center gap-2.5 group w-fit"
        >
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/30 group-hover:scale-105 transition-transform duration-200">
            <span className="font-display font-black text-base text-white">O</span>
          </div>
          <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-white group-hover:text-primary transition-colors">
            openScreen
          </span>
        </Link>
      </header>

      {/* Center Netflix-Style Gateway */}
      <main className="flex-1 flex flex-col items-center justify-center text-center z-10 max-w-3xl mx-auto w-full my-auto py-2">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-2xl sm:text-4xl md:text-5xl font-display font-extrabold tracking-tight text-white mb-6 sm:mb-10"
        >
          What do you want to watch?
        </motion.h1>

        {/* 3 Minimal Icon & Name Category Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 lg:gap-8 w-full max-w-2xl mx-auto px-1">
          {CATEGORIES.map((cat, idx) => {
            const isSelected = selected === cat.id;
            const Icon = cat.icon;

            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: idx * 0.08 }}
                onClick={() => handleConfirm(cat.id)}
                className="group flex flex-col items-center cursor-pointer"
              >
                {/* Large Clean Icon Card */}
                <div
                  className={cn(
                    "relative w-full aspect-square rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center p-3 sm:p-6 transition-all duration-300 transform-gpu border-2",
                    isSelected
                      ? "border-primary bg-primary/15 text-primary shadow-[0_0_30px_rgba(139,92,246,0.35)] scale-105"
                      : "border-white/10 bg-white/[0.03] text-white/70 group-hover:border-primary/50 group-hover:bg-white/[0.06] group-hover:text-white group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-8 h-8 sm:w-12 sm:h-12 md:w-14 md:h-14 transition-transform duration-300 group-hover:scale-110",
                      isSelected ? "text-primary" : "text-white/80 group-hover:text-primary"
                    )}
                  />

                  {/* Selected Indicator Checkmark */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 sm:top-3 sm:right-3 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-md animate-in fade-in zoom-in duration-150">
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Category Name Underneath */}
                <span
                  className={cn(
                    "mt-3 text-xs sm:text-base font-bold font-display transition-colors duration-200",
                    isSelected ? "text-primary" : "text-white/80 group-hover:text-white"
                  )}
                >
                  {cat.name}
                </span>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full text-center text-[10px] sm:text-xs text-muted-foreground/30 z-10 shrink-0">
        openScreen
      </footer>
    </div>
  );
}


