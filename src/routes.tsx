import { createBrowserRouter } from "react-router";
import RootLayout from "./components/layout/RootLayout";
import Home from "./pages/Home";
import Discover from "./pages/Discover";
import Watchlist from "./pages/Watchlist";
import AnimeDetails from "./pages/AnimeDetails";
import MovieDetails from "./pages/MovieDetails";
import TvDetails from "./pages/TvDetails";
import VideoPlayer from "./pages/VideoPlayer";
import MoviePlayer from "./pages/MoviePlayer";
import TvPlayer from "./pages/TvPlayer";
import SelectCategory from "./pages/SelectCategory";
import Search from "./pages/Search";

export const router = createBrowserRouter([
  {
    path: "/select",
    element: <SelectCategory />,
  },
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "discover", element: <Discover /> },
      { path: "watchlist", element: <Watchlist /> },
      { path: "search", element: <Search /> },
      { path: "anime/:id", element: <AnimeDetails /> },
      { path: "movie/:id", element: <MovieDetails /> },
      { path: "tv/:id", element: <TvDetails /> },
      { path: "*", element: <div className="p-12 text-center text-xl text-muted-foreground">Page Not Found</div>}
    ],
  },
  {
    path: "/watch/:animeId/:epId",
    element: <VideoPlayer />
  },
  {
    path: "/watch/movie/:id",
    element: <MoviePlayer />
  },
  {
    path: "/watch/tv/:id/:season/:episode",
    element: <TvPlayer />
  }
]);

