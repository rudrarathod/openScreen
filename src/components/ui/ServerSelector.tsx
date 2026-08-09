import React from "react";
import { Server, Check, Zap } from "lucide-react";
import { cn } from "../../utils/cn";

export type ServerId = "vidsrc" | "vidlink";

export interface ServerOption {
  id: ServerId;
  name: string;
  baseUrl: string;
  isDefault?: boolean;
}

export const STREAMING_SERVERS: ServerOption[] = [
  { id: "vidsrc", name: "VidSrc", baseUrl: "https://vidsrc.fyi", isDefault: true },
  { id: "vidlink", name: "VidLink", baseUrl: "https://vidlink.pro" },
];

export function getMovieEmbedUrl(serverId: ServerId, tmdbId: string, startAt?: number): string {
  if (serverId === "vidsrc") {
    return `https://vidsrc.fyi/embed/movie/${tmdbId}`;
  }
  const baseUrl = `https://vidlink.pro/movie/${tmdbId}?primaryColor=8b5cf6&secondaryColor=18181b&iconColor=8b5cf6&autoplay=false&player=jw`;
  return startAt && startAt > 0 ? `${baseUrl}&startAt=${startAt}` : baseUrl;
}

export function getTvEmbedUrl(
  serverId: ServerId,
  tmdbId: string,
  season: number | string,
  episode: number | string,
  startAt?: number
): string {
  if (serverId === "vidsrc") {
    return `https://vidsrc.fyi/embed/tv/${tmdbId}/${season}/${episode}`;
  }
  const baseUrl = `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?primaryColor=8b5cf6&secondaryColor=18181b&iconColor=8b5cf6&autoplay=false&nextbutton=true&player=jw`;
  return startAt && startAt > 0 ? `${baseUrl}&startAt=${startAt}` : baseUrl;
}

interface ServerSelectorProps {
  currentServer: ServerId;
  onSelectServer: (serverId: ServerId) => void;
  failedServers?: ServerId[];
  fallbackNotice?: string | null;
  onClearNotice?: () => void;
  className?: string;
}

export const ServerSelector: React.FC<ServerSelectorProps> = ({
  currentServer,
  onSelectServer,
  failedServers = [],
  fallbackNotice,
  onClearNotice,
  className,
}) => {
  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-white/70">
          <Server className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium text-white/80">Server</span>
        </div>

        <div className="inline-flex items-center p-0.5 rounded-lg bg-black/40 border border-white/10 backdrop-blur-sm">
          {STREAMING_SERVERS.map((server) => {
            const isActive = currentServer === server.id;
            const hasFailed = failedServers.includes(server.id);

            return (
              <button
                key={server.id}
                type="button"
                onClick={() => onSelectServer(server.id)}
                className={cn(
                  "relative px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5",
                  isActive
                    ? "bg-primary text-white shadow-md font-semibold"
                    : "text-white/60 hover:text-white hover:bg-white/5",
                  hasFailed && !isActive && "text-amber-400 opacity-75"
                )}
              >
                {isActive && <Check className="w-3 h-3 text-white" />}
                <span>{server.name}</span>
                {server.isDefault && (
                  <span
                    className={cn(
                      "text-[9px] px-1 py-0.2 rounded font-normal uppercase tracking-tight",
                      isActive ? "bg-black/20 text-white/90" : "bg-white/10 text-white/50"
                    )}
                  >
                    Default
                  </span>
                )}
                {hasFailed && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Failed" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {fallbackNotice && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-3.5 h-3.5 shrink-0 text-amber-400 animate-pulse" />
            <span className="truncate">{fallbackNotice}</span>
          </div>
          {onClearNotice && (
            <button
              onClick={onClearNotice}
              className="text-amber-400/80 hover:text-amber-200 text-[11px] font-medium underline cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
};
