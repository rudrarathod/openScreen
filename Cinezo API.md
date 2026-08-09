# Cinezo API & Embed Player Documentation

Cinezo provides an embeddable media player for **movies, TV shows, and anime**. Content is identified using TMDB IDs for movies/TV and AniList IDs for anime.

The player supports customization, server selection, subtitles, playback controls, and anime dub preferences.

---

## 1. Base Player URL

```text
https://player.cinezo.live
```

---

# 2. Movie Player

Embed a movie using its **TMDB ID**.

### Endpoint

```text
https://player.cinezo.live/embed/movie/{tmdbId}
```

### Example

```text
https://player.cinezo.live/embed/movie/1064213
```

### iframe

```html
<iframe
  src="https://player.cinezo.live/embed/movie/1064213"
  frameborder="0"
  allowfullscreen>
</iframe>
```

Replace `{tmdbId}` with the TMDB movie ID.

---

# 3. TV Show Player

Embed a specific TV episode using its TMDB ID, season, and episode number.

### Endpoint

```text
https://player.cinezo.live/embed/tv/{tmdbId}/{season}/{episode}
```

### Example

```text
https://player.cinezo.live/embed/tv/1399/1/1
```

Where:

* `1399` → TMDB ID
* `1` → Season 1
* `1` → Episode 1

### iframe

```html
<iframe
  src="https://player.cinezo.live/embed/tv/1399/1/1"
  frameborder="0"
  allowfullscreen>
</iframe>
```

---

# 4. Anime Player

Anime content uses an **AniList ID**.

### Endpoint

```text
https://player.cinezo.live/embed/anime/{anilistId}/{episode}?dub=true
```

### Subbed

```text
https://player.cinezo.live/embed/anime/21/1?dub=false
```

### Dubbed

```text
https://player.cinezo.live/embed/anime/21/1?dub=true
```

### Parameters

| Parameter | Value   | Description                  |
| --------- | ------- | ---------------------------- |
| `dub`     | `true`  | Prefer dubbed audio          |
| `dub`     | `false` | Prefer subbed/original audio |

---

# 5. Player Configuration

Cinezo supports query parameters for customizing the player.

## Appearance

### Primary Color

```text
primarycolor=e8b86d
```

Sets the main player accent color.

### Secondary Color

```text
secondarycolor=c49de8
```

Sets the secondary player color.

### Icon Color

```text
iconcolor=ffffff
```

Sets the player icon color.

---

# 6. Playback Settings

### Autoplay

```text
autoplay=true
```

Automatically starts playback when the player loads.

Example:

```text
https://player.cinezo.live/embed/movie/1064213?autoplay=true
```

---

### Poster

```text
poster=true
```

Displays the movie/show poster in the player.

---

### Picture-in-Picture

```text
pip=true
```

Enables Picture-in-Picture mode.

---

### Chromecast

```text
chromecast=true
```

Enables Chromecast support.

---

# 7. Player Controls

### Server Selection

```text
servericon=true
```

Displays the server selection button.

### Settings

```text
setting=true
```

Displays the player settings button.

---

# 8. Server Selection

Cinezo supports server selection through the `server` parameter.

### Parameter

```text
server={serverName}
```

### Example

```text
https://player.cinezo.live/embed/movie/1064213?server=hindi
```

The exact available server names depend on the content and Cinezo's available sources.

The player can also expose a server selector:

```text
servericon=true
```

---

# 9. Subtitle Customization

Cinezo provides several parameters for customizing subtitle appearance.

### Font

```text
font=Roboto
```

Sets the subtitle font family.

### Font Color

```text
fontcolor=e8b86d
```

Sets the subtitle text color.

### Font Size

```text
fontsize=20
```

Sets the subtitle font size in pixels.

### Opacity

```text
opacity=0.8
```

Sets subtitle opacity.

The accepted opacity range is:

```text
0 - 1
```

---

# 10. Custom Logo

You can add a custom logo using:

```text
logourl=https://example.com/logo.png
```

Example:

```text
https://player.cinezo.live/embed/movie/1064213?logourl=https://example.com/logo.png
```

---

# 11. Complete Configuration Example

Multiple parameters can be combined.

```text
https://player.cinezo.live/embed/movie/12345?primarycolor=e8b86d&secondarycolor=c49de8&iconcolor=ffffff&autoplay=true&poster=true&chromecast=true&servericon=true&setting=true&pip=true
```

### iframe

```html
<iframe
  src="https://player.cinezo.live/embed/movie/12345?primarycolor=e8b86d&secondarycolor=c49de8&iconcolor=ffffff&autoplay=true&poster=true&chromecast=true&servericon=true&setting=true&pip=true"
  frameborder="0"
  allowfullscreen>
</iframe>
```

---

# 12. Hiding Player Controls

Cinezo allows individual player controls to be hidden.

## Appearance Controls

| Control         | Description                 |
| --------------- | --------------------------- |
| Primary Color   | Hide primary color picker   |
| Secondary Color | Hide secondary color picker |
| Icon Color      | Hide icon color picker      |
| Progress        | Hide progress control       |
| Icon Set        | Hide icon set control       |
| Auto Next       | Hide auto-next toggle       |

## Player Controls

| Control      | Description                    |
| ------------ | ------------------------------ |
| Next Button  | Hide next episode button       |
| Poster       | Hide poster display            |
| Chromecast   | Hide Chromecast button         |
| Episode List | Hide episode list button       |
| Server Icon  | Hide server selector           |
| PiP Mode     | Hide Picture-in-Picture button |

---

# 13. Advanced Player Features

The Cinezo player supports:

* Autoplay
* Auto Next
* Episode navigation
* Episode list
* Poster display
* Server selection
* Player settings
* Picture-in-Picture
* Chromecast
* Download option
* Subtitle customization
* Custom branding/logo
* Multiple playback sources

---

# 14. Progress Tracking

Cinezo provides a lightweight watch-progress system.

It is designed to support:

* Continue Watching
* Resume playback
* Episode-specific progress
* Playback event tracking
* Persistent progress
* Local storage

### Tracked Events

The system can monitor playback events such as:

```text
play
pause
seeked
```

Progress data is stored locally, allowing playback to resume without requiring a separate backend.

---

# 15. Integration Examples

## React

```jsx
function VideoPlayer({ tmdbId }) {
  return (
    <iframe
      src={`https://player.cinezo.live/embed/movie/${tmdbId}`}
      width="100%"
      height="600"
      frameBorder="0"
      allowFullScreen
    />
  );
}
```

---

## React TV Episode

```jsx
function TVPlayer({ tmdbId, season, episode }) {
  const url =
    `https://player.cinezo.live/embed/tv/${tmdbId}/${season}/${episode}`;

  return (
    <iframe
      src={url}
      width="100%"
      height="600"
      frameBorder="0"
      allowFullScreen
    />
  );
}
```

---

## React Anime Player

```jsx
function AnimePlayer({ anilistId, episode, dub = false }) {
  const url =
    `https://player.cinezo.live/embed/anime/${anilistId}/${episode}?dub=${dub}`;

  return (
    <iframe
      src={url}
      width="100%"
      height="600"
      frameBorder="0"
      allowFullScreen
    />
  );
}
```

---

# 16. Endpoint Summary

| Content | Endpoint                                      |
| ------- | --------------------------------------------- |
| Movie   | `/embed/movie/{tmdbId}`                       |
| TV      | `/embed/tv/{tmdbId}/{season}/{episode}`       |
| Anime   | `/embed/anime/{anilistId}/{episode}?dub=true` |

Base URL:

```text
https://player.cinezo.live
```

---

# 17. Parameter Reference

| Parameter        | Example  | Purpose                |
| ---------------- | -------- | ---------------------- |
| `primarycolor`   | `e8b86d` | Primary player color   |
| `secondarycolor` | `c49de8` | Secondary player color |
| `iconcolor`      | `ffffff` | Icon color             |
| `autoplay`       | `true`   | Enable autoplay        |
| `poster`         | `true`   | Show poster            |
| `chromecast`     | `true`   | Enable Chromecast      |
| `servericon`     | `true`   | Show server selector   |
| `setting`        | `true`   | Show settings          |
| `pip`            | `true`   | Enable PiP             |
| `font`           | `Roboto` | Subtitle font          |
| `fontcolor`      | `e8b86d` | Subtitle color         |
| `fontsize`       | `20`     | Subtitle size          |
| `opacity`        | `0.8`    | Subtitle opacity       |
| `logourl`        | URL      | Custom logo            |
| `server`         | `hindi`  | Select server          |
| `dub`            | `true`   | Anime dub preference   |

---

# 18. Recommended Integration

For a movie/TV application, use:

```text
TMDB
  │
  ├── Movie metadata
  ├── TV metadata
  └── IDs
        │
        ▼
Cinezo Player
        │
        ├── Movie
        ├── TV Episode
        └── Server Selection
```

For anime:

```text
AniList
  │
  ▼
Cinezo Anime Player
  │
  ├── Sub
  └── Dub
```

This keeps your metadata layer separate from your playback layer and makes it easier to replace Cinezo with another provider later.
