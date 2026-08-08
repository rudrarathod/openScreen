import React, { useState } from "react";
import { X, Share, PlusSquare, Download, Monitor, Smartphone, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNativeInstall?: () => void;
  isNativePromptAvailable?: boolean;
}

export default function PwaInstallModal({
  isOpen,
  onClose,
  onNativeInstall,
  isNativePromptAvailable,
}: PwaInstallModalProps) {
  const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const [activePlatform, setActivePlatform] = useState<"ios" | "android" | "desktop">(
    isIos ? "ios" : "android"
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-md bg-[#121216] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header info */}
          <div className="flex items-center gap-3.5 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
              <img src="/pwa-icon.svg" alt="openScreen logo" className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-display font-extrabold text-white">Install openScreen</h3>
              <p className="text-xs text-muted-foreground">Fast, offline-ready streaming app</p>
            </div>
          </div>

          {/* If native prompt available, highlight instant install button */}
          {isNativePromptAvailable && (
            <div className="mb-5 p-3.5 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs font-bold text-white">Instant One-Click Install</span>
              </div>
              <button
                onClick={() => {
                  onNativeInstall?.();
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-extrabold hover:bg-primary/90 transition-all cursor-pointer shadow-md shadow-primary/20"
              >
                Install Now
              </button>
            </div>
          )}

          {/* Platform tabs */}
          <div className="flex items-center p-1 rounded-xl bg-secondary/40 border border-white/5 gap-1 mb-4">
            <button
              onClick={() => setActivePlatform("ios")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activePlatform === "ios"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>iOS / Safari</span>
            </button>
            <button
              onClick={() => setActivePlatform("android")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activePlatform === "android"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android</span>
            </button>
            <button
              onClick={() => setActivePlatform("desktop")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activePlatform === "desktop"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
          </div>

          {/* Platform Step-by-Step Instructions */}
          <div className="space-y-3 mb-6 text-xs text-foreground/90">
            {activePlatform === "ios" && (
              <>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="p-1.5 rounded-lg bg-primary/20 text-primary shrink-0 mt-0.5">
                    <Share className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block mb-0.5">1. Tap the Share icon</span>
                    <span className="text-muted-foreground text-[11px]">
                      Open in Safari and tap the Share button in the bottom navigation bar.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block mb-0.5">2. Tap "Add to Home Screen"</span>
                    <span className="text-muted-foreground text-[11px]">
                      Scroll down the share options list and select "Add to Home Screen".
                    </span>
                  </div>
                </div>
              </>
            )}

            {activePlatform === "android" && (
              <>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="p-1.5 rounded-lg bg-primary/20 text-primary shrink-0 mt-0.5">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block mb-0.5">1. Open Chrome Menu</span>
                    <span className="text-muted-foreground text-[11px]">
                      Tap the three-dot menu (⋮) in the top-right corner of your browser.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block mb-0.5">2. Select "Install app"</span>
                    <span className="text-muted-foreground text-[11px]">
                      Tap "Install app" or "Add to Home Screen" to save openScreen to your device.
                    </span>
                  </div>
                </div>
              </>
            )}

            {activePlatform === "desktop" && (
              <>
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="p-1.5 rounded-lg bg-primary/20 text-primary shrink-0 mt-0.5">
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block mb-0.5">1. Check Address Bar</span>
                    <span className="text-muted-foreground text-[11px]">
                      Click the Install icon (⊕ or computer screen icon) on the right side of your address bar.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white block mb-0.5">2. Click "Install"</span>
                    <span className="text-muted-foreground text-[11px]">
                      Confirm installation to launch openScreen as a standalone desktop app.
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-secondary/80 hover:bg-secondary text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Got it
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
