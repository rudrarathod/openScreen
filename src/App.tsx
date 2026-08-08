import { useState, useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { WatchlistProvider } from "./context/WatchlistContext";
import { ContinueWatchingProvider } from "./context/ContinueWatchingContext";
import { MediaTypeProvider } from "./context/MediaTypeContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import SplashScreen from "./components/ui/SplashScreen";
import { AnimatePresence, motion } from "framer-motion";

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <MediaTypeProvider>
        <WatchlistProvider>
          <ContinueWatchingProvider>
            <AnimatePresence mode="wait">
              {showSplash && (
                <motion.div
                  key="splash"
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="relative z-[9999]"
                >
                  <SplashScreen />
                </motion.div>
              )}
            </AnimatePresence>
            <RouterProvider router={router} />
          </ContinueWatchingProvider>
        </WatchlistProvider>
      </MediaTypeProvider>
    </ErrorBoundary>
  );
}

export default App;

