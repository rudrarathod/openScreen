import { Link, useLocation } from "react-router";
import { Home, Compass, Bookmark } from "lucide-react";
import { cn } from "../../utils/cn";

const NAV_ITEMS = [
  { name: "Home", path: "/", icon: Home },
  { name: "Discover", path: "/discover", icon: Compass },
  { name: "Watchlist", path: "/watchlist", icon: Bookmark },
];

export default function BottomNav({ className }: { className?: string }) {
  const location = useLocation();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 h-16 bg-[#09090b]/95 backdrop-blur-xl border-t border-white/5 z-50 pb-safe transition-all",
        className
      )}
    >
      <div className="grid grid-cols-3 items-center h-full px-2 max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.path}
              className="flex flex-col items-center justify-center h-full gap-1 active:scale-95 transition-transform touch-manipulation cursor-pointer"
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-6 rounded-full transition-all duration-200",
                  isActive
                    ? "bg-primary/20 text-primary font-bold"
                    : "text-muted-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    isActive ? "scale-110 text-primary" : "text-muted-foreground"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium tracking-tight transition-colors",
                  isActive ? "text-primary font-semibold" : "text-muted-foreground"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
