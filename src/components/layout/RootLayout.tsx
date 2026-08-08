import { Outlet, useLocation, useNavigate } from "react-router";
import { useEffect, useRef } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import { useMediaType } from "../../context/MediaTypeContext";

export default function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const { hasChosenCategory } = useMediaType();
  const isVideoPlayer = location.pathname.startsWith('/watch/');

  useEffect(() => {
    if (!hasChosenCategory) {
      navigate("/select", { replace: true });
    }
  }, [hasChosenCategory, navigate]);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (!hasChosenCategory) {
    return <div className="min-h-screen bg-[#09090b]" />;
  }

  if (isVideoPlayer) {
    return <Outlet />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop & Tablet Sidebar */}
      <Sidebar className="hidden md:flex" />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <TopBar />
        
        {/* Main Content Area */}
        <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-0 scroll-smooth">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav className="md:hidden" />
    </div>
  );
}

