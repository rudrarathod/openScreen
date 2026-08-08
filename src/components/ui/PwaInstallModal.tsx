import React from "react";
import { X, Download, Share, PlusSquare, MoreVertical, Smartphone, Laptop, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNativeInstall?: () => void;
  hasNativePrompt?: boolean;
}

export default function PwaInstallModal({
  isOpen,
  onClose,
  onNativeInstall,
  hasNativePrompt,
}: PwaInstallModalProps) {
  if (!isOpen) return null;

  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-[#121216] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden select-none"
        >
          {/* Background Ambient Glow */}
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-5 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
                <img src="/pwa-icon.svg" alt="openScreen" className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Install openScreen</h3>
                <p className="text-xs text-muted-foreground">Fast, offline-ready streaming app</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Native Install Button if Available */}
          {hasNativePrompt && onNativeInstall ? (
            <div className="mb-6">
              <button
                onClick={() => {
                  onNativeInstall();
                  onClose();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-primary text-white font-extrabold text-sm shadow-xl shadow-primary/25 hover:bg-primary/90 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4 fill-current" />
                <span>Install Application Now</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              {isIOS ? (
                /* iOS Instructions */
                <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Safari / iOS Instructions</span>
                  </div>
                  <ol className="text-xs space-y-2.5 text-muted-foreground">
                    <li className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                      <span>Tap the <strong className="text-white">Share button</strong> <Share className="w-3.5 h-3.5 inline text-primary mx-0.5" /> in Safari menu.</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                      <span>Scroll down and select <strong className="text-white">Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-primary mx-0.5" />.</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                      <span>Tap <strong className="text-white">Add</strong> to complete installation.</span>
                    </li>
                  </ol>
                </div>
              ) : (
                /* Android / Desktop Instructions */
                <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Browser Instructions</span>
                  </div>
                  <ol className="text-xs space-y-2.5 text-muted-foreground">
                    <li className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                      <span>Click the browser menu <strong className="text-white"><MoreVertical className="w-3.5 h-3.5 inline text-primary" /></strong> icon.</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                      <span>Select <strong className="text-white">Install openScreen</strong> or <strong className="text-white">Add to Home Screen</strong>.</span>
                    </li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Features Highlights */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground border-t border-white/5 pt-4">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Offline Host Fallback</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Full Screen Player</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Zero Installation Cost</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Instant Launch</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
