import { Link, useLocation } from "react-router";
import { Home, Search, Compass, Bookmark, LayoutGrid, Download } from "lucide-react";
import { cn } from "../../utils/cn";
import { usePwaInstall } from "../../hooks/usePwaInstall";

const NAV_ITEMS = [
  { name: "Home", path: "/", icon: Home },
  { name: "Search", path: "/search", icon: Search },
  { name: "Discover", path: "/discover", icon: Compass },
  { name: "Watchlist", path: "/watchlist", icon: Bookmark },
  { name: "Switch Category", path: "/select", icon: LayoutGrid },
];

export default function Sidebar({ className }: { className?: string }) {
  const location = useLocation();
  const { canInstall, installPwa } = usePwaInstall();

  return (
    <aside
      className={cn(
        "w-[240px] lg:w-[240px] md:w-[72px] flex flex-col justify-between border-r border-white/5 bg-[#09090b] z-30 transition-all duration-300 shrink-0 select-none",
        className
      )}
    >
      <div>
        {/* Single openScreen Logo */}
        <div className="p-6 flex items-center justify-center md:justify-start">
          <Link to="/select" className="flex items-center gap-3 group" title="Select Category Screen">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
              <span className="font-display font-black text-lg text-white">O</span>
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-white hidden lg:block md:hidden group-hover:text-primary/90 transition-colors">
              openScreen
            </span>
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="px-3 py-2 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all relative group",
                  isActive
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
                title={item.name}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                )}
                <Icon
                  className={cn(
                    "w-5 h-5 shrink-0 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-white"
                  )}
                />
                <span className="hidden lg:block md:hidden">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {canInstall && (
        <div className="p-3 border-t border-white/5">
          <button
            onClick={installPwa}
            className="w-full flex items-center justify-center md:justify-start gap-3.5 px-3.5 py-3 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 transition-all text-sm font-bold cursor-pointer"
            title="Install openScreen PWA App"
          >
            <Download className="w-5 h-5 shrink-0 text-primary" />
            <span className="hidden lg:block md:hidden">Install App</span>
          </button>
        </div>
      )}
    </aside>
  );
}

