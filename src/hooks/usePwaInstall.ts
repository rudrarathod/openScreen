import { useState, useEffect } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    (typeof window !== "undefined" && (window as any).deferredPwaPrompt) || null
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (PWA installed)
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as any).standalone === true);

    if (isStandalone) {
      setIsInstalled(true);
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      (window as any).deferredPwaPrompt = e;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setDeferredPrompt(null);
      (window as any).deferredPwaPrompt = null;
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const triggerNativePrompt = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredPwaPrompt;
    if (!promptEvent) return false;
    try {
      await promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      (window as any).deferredPwaPrompt = null;
      return true;
    } catch (err) {
      console.error("PWA native install prompt error:", err);
      return false;
    }
  };

  const installPwa = async () => {
    const promptEvent = deferredPrompt || (window as any).deferredPwaPrompt;
    if (promptEvent) {
      const success = await triggerNativePrompt();
      if (!success) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return {
    canInstall: !isInstalled,
    isInstalled,
    installPwa,
    triggerNativePrompt,
    showGuideModal,
    setShowGuideModal,
    hasNativePrompt: !!(deferredPrompt || (typeof window !== "undefined" && (window as any).deferredPwaPrompt)),
  };
}
