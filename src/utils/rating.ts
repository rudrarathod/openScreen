export interface AgeRatingInfo {
  short: string;
  full: string;
  badgeClass: string;
}

export function formatAgeRating(rating?: string): AgeRatingInfo | null {
  if (!rating || typeof rating !== "string") return null;
  const r = rating.toLowerCase().trim();

  // TV Ratings
  if (r.includes("tv-ma") || r === "tvma") {
    return {
      short: "TV-MA",
      full: "Mature Audience (TV-MA)",
      badgeClass: "bg-red-700/90 text-red-100 border-red-500/60 shadow-red-950/60",
    };
  }
  if (r.includes("tv-14") || r === "tv14") {
    return {
      short: "TV-14",
      full: "Parents Strongly Cautioned (TV-14)",
      badgeClass: "bg-amber-500/80 text-amber-100 border-amber-400/50 shadow-amber-900/40",
    };
  }
  if (r.includes("tv-pg") || r === "tvpg" || r.includes("tv-y7") || r === "tvy7") {
    const isY7 = r.includes("y7");
    return {
      short: isY7 ? "TV-Y7" : "TV-PG",
      full: isY7 ? "Directed to Older Children (TV-Y7)" : "Parental Guidance Suggested (TV-PG)",
      badgeClass: "bg-blue-500/80 text-blue-100 border-blue-400/50 shadow-blue-900/40",
    };
  }
  if (r.includes("tv-g") || r === "tvg" || r.includes("tv-y") || r === "tvy") {
    const isY = r.includes("y");
    return {
      short: isY ? "TV-Y" : "TV-G",
      full: isY ? "All Children (TV-Y)" : "General Audience (TV-G)",
      badgeClass: "bg-emerald-500/80 text-emerald-100 border-emerald-400/50 shadow-emerald-900/40",
    };
  }

  if (r.includes("pg-13") || r.includes("pg_13") || r === "pg13") {
    return {
      short: "PG-13",
      full: "Teens 13 or older",
      badgeClass: "bg-amber-500/80 text-amber-100 border-amber-400/50 shadow-amber-900/40",
    };
  }
  if (r.includes("r+") || r.includes("r_plus") || r.includes("nudity")) {
    return {
      short: "R+",
      full: "Mild Nudity / Severe Content",
      badgeClass: "bg-rose-600/90 text-rose-100 border-rose-400/50 shadow-rose-950/50",
    };
  }
  if (r.includes("r - 17") || r.includes("r_17") || r === "r" || r.includes("17+") || r === "r17") {
    return {
      short: "R-17+",
      full: "Restricted - 17+ (violence/profanity)",
      badgeClass: "bg-rose-500/80 text-rose-100 border-rose-400/50 shadow-rose-900/40",
    };
  }
  if (r.includes("rx") || r.includes("hentai") || r.includes("18+")) {
    return {
      short: "18+",
      full: "Adults Only (18+)",
      badgeClass: "bg-red-700/90 text-red-100 border-red-500/60 shadow-red-950/60",
    };
  }
  if (r.includes("pg")) {
    return {
      short: "PG",
      full: "Parental Guidance Suggested",
      badgeClass: "bg-blue-500/80 text-blue-100 border-blue-400/50 shadow-blue-900/40",
    };
  }
  if (r === "g" || r.startsWith("g ") || r.includes("all ages")) {
    return {
      short: "G",
      full: "All Ages",
      badgeClass: "bg-emerald-500/80 text-emerald-100 border-emerald-400/50 shadow-emerald-900/40",
    };
  }

  // Fallback for custom or unrecognized string
  const firstWord = rating.split(/[\s-]/)[0].toUpperCase();
  if (!firstWord) return null;
  return {
    short: firstWord.length <= 6 ? firstWord : "PG",
    full: rating,
    badgeClass: "bg-slate-700/80 text-slate-100 border-slate-500/40",
  };
}
