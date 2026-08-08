# 🍿 openScreen (openAnime)

openScreen is a feature-rich, high-performance, and beautifully designed streaming and discovery web application. It allows users to seamlessly browse, search, and watch **Anime**, **Movies**, and **TV Series** in a unified, modern interface.

Developed using **React 19**, **Vite**, and **Tailwind CSS v4**, the app provides a smooth, native-like experience with premium UI aesthetics, fluid transitions, and responsive layout designs.

---

## 🌟 Key Features

- **🎭 Multi-Category Gateway:** Choose between **Anime**, **Movies**, or **TV Series** at launch with a sleek, Netflix-style selector.
- **🔍 Fast Search & History:** Instant search functionality with category filters and local search history memory.
- **📑 Detailed Media Pages:** In-depth information for every title, including ratings, synopses, genres, trailers, recommendations, and related media.
- **📺 Integrated Custom Players:** 
  - **Anime Player:** Multi-episode streaming with automatic sub/dub selections.
  - **TV Player:** Episode and season selector with automated continuity.
  - **Movie Player:** One-click instant streaming.
- **⏳ Continue Watching:** Remembers your viewing progress (history) and lets you pick up right where you left off.
- **❤️ Watchlist System:** Save your favorite titles to access them quickly from your personalized library.
- **✨ Fluid Animations:** Smooth micro-interactions, page transitions, and layouts powered by **Framer Motion**.
- **📱 Fully Responsive:** Adaptive design tailored for mobile devices, tablets, and desktops.

---

## 🛠️ Technology Stack

- **Framework:** React 19 (TypeScript)
- **Styling:** Tailwind CSS v4 (with `@tailwindcss/vite` plugin)
- **Build Tooling:** Vite 8 & oxfmt
- **Routing:** React Router v8
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Data APIs:**
  - **MyAnimeList (MAL) & Jikan API** (Anime data & details)
  - **The Movie Database (TMDB)** (Movies & TV Series metadata)
  - **Anikoto & SubDub API** (Anime streaming links)
  - **VidLink API** (Movie & TV Series streaming links)

---

## 🚀 Getting Started

### Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rudrarathod/openAnime.git
   cd openAnime
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Open your browser and navigate to `http://localhost:3000` (or the port specified in your console).

---

## 📦 Project Structure

```text
src/
├── api/             # API clients & mappings (MAL, Jikan, TMDB, Anikoto)
├── components/      # Reusable UI & Layout components
│   ├── layout/      # Sidebar, TopBar, BottomNav, SearchBar
│   └── ui/          # AnimeCard, ServerSelector, SplashScreen, etc.
├── context/         # React Contexts (Watchlist, ContinueWatching, MediaType)
├── hooks/           # Custom React hooks (useDebounce, useRecentSearches)
├── pages/           # Page views (Home, Discover, Search, Watchlist, Details, Players)
├── utils/           # Utility helpers (API cache, styling tailwind-merge, ratings)
├── App.tsx          # Primary application entry & provider setup
├── index.css        # Tailwind CSS imports & global design tokens
├── main.tsx         # React DOM mounting & entrypoint
└── routes.tsx       # Application routing definition (React Router)
```

---

## ⚙️ Development Scripts

In the project directory, you can run:

| Script | Command | Description |
|:---|:---|:---|
| `npm run dev` | `vite` | Runs the app in development mode with hot-reloading. |
| `npm run build` | `vite build` | Builds the app for production in the `dist` folder. |
| `npm run preview` | `vite preview` | Serves the production build locally for previewing. |
| `npm run lint` | `tsc --noEmit` | Runs the TypeScript compiler to check for type errors. |
| `npm run format` | `oxfmt` | Formats all code files using `oxfmt`. |

---

## 🔒 API Proxy Configuration

The application is pre-configured with a Vite server proxy (`vite.config.ts`) to avoid CORS issues when fetching data from **MyAnimeList** and other sources. No local environment keys are strictly required to run the development server as it uses pre-configured endpoints and proxies.
