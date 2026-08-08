# VidLink API

**Fast, simple streaming embeds for movies, TV shows, and anime.**

VidLink provides embeddable video players that can be integrated into websites using a simple URL. Media is identified using **TMDB IDs** for movies and TV shows and **MyAnimeList IDs** for anime.

> **Note:** Content availability and source quality may vary depending on the providers used by VidLink.

---

## Features

### Easy to Use

Copy the appropriate VidLink URL and embed it directly into your website.

### Huge Library

Movies and TV shows are sourced from multiple providers, providing a large content library.

### Customizable Player

Customize the embedded player using URL query parameters for colors, icons, controls, autoplay, subtitles, and more.

### Automatic Updates

Content is updated automatically as new media becomes available.

### High Quality

VidLink attempts to provide the highest available streaming quality from its available sources.

---

# API Documentation

## Movies

Embed movies using their **TMDB ID**.

### Endpoint

```text
https://vidlink.pro/movie/{tmdbId}
```

### Parameters

| Parameter | Required | Description |
|---|---|---|
| `tmdbId` | Yes | Movie ID from TMDB |

### Example

```text
https://vidlink.pro/movie/786892
```

### HTML Embed

```html
<iframe
  src="https://vidlink.pro/movie/786892"
  frameborder="0"
  allowfullscreen
></iframe>
```

---

# TV Shows

Embed TV show episodes using the show's **TMDB ID**, season number, and episode number.

### Endpoint

```text
https://vidlink.pro/tv/{tmdbId}/{season}/{episode}
```

### Parameters

| Parameter | Required | Description |
|---|---|---|
| `tmdbId` | Yes | TV show ID from TMDB |
| `season` | Yes | Season number |
| `episode` | Yes | Episode number |

### Example

```text
https://vidlink.pro/tv/94997/1/1
```

### HTML Embed

```html
<iframe
  src="https://vidlink.pro/tv/94997/1/1"
  frameborder="0"
  allowfullscreen
></iframe>
```

---

# Anime

Anime can be embedded using a **MyAnimeList (MAL) ID**, episode number, and subtitle/dub type.

### Endpoint

```text
https://vidlink.pro/anime/{malId}/{episode}/{subOrDub}
```

### Parameters

| Parameter | Required | Description |
|---|---|---|
| `malId` | Yes | MyAnimeList anime ID |
| `episode` | Yes | Episode number |
| `subOrDub` | Yes | `sub` or `dub` |

### Example

```text
https://vidlink.pro/anime/5/1/sub
```

### HTML Embed

```html
<iframe
  src="https://vidlink.pro/anime/5/1/sub"
  frameborder="0"
  allowfullscreen
></iframe>
```

## Anime Fallback

If the requested subtitle/dub version is unavailable, you can enable automatic fallback.

Add:

```text
?fallback=true
```

### Example

```text
https://vidlink.pro/anime/5/1/sub?fallback=true
```

If the requested type is unavailable, VidLink attempts to use the alternative type.

---

# Player Customization

Player options can be configured by adding query parameters to the embed URL.

For example:

```text
https://vidlink.pro/movie/786892?primaryColor=B20710&autoplay=false
```

When using hexadecimal colors, remove the `#` symbol.

For example:

```text
#B20710
```

becomes:

```text
B20710
```

---

## `primaryColor`

Sets the primary color of the player, including sliders and autoplay controls.

```text
primaryColor=B20710
```

---

## `secondaryColor`

Sets the secondary color used behind the progress slider.

```text
secondaryColor=170000
```

---

## `icons`

Changes the player icon style.

Supported values:

```text
vid
default
```

Example:

```text
icons=vid
```

---

## `iconColor`

Sets the color of player icons.

```text
iconColor=B20710
```

---

## `title`

Controls whether the media title is displayed.

### Show title

```text
title=true
```

### Hide title

```text
title=false
```

---

## `poster`

Controls whether the poster image is displayed.

```text
poster=true
```

or:

```text
poster=false
```

---

## `autoplay`

Controls whether playback starts automatically.

```text
autoplay=false
```

---

## `nextbutton`

Enables the **Next Episode** button for TV shows.

The button appears when approximately 90% of the current episode has been watched.

```text
nextbutton=true
```

Disabled by default:

```text
nextbutton=false
```

---

## `player`

Selects the player implementation.

Supported values:

| Value | Player |
|---|---|
| `default` | VidLink player |
| `jw` | JW Player |

Example:

```text
player=jw
```

---

## `startAt`

Starts playback at a specific timestamp.

The value is specified in seconds.

```text
startAt=60
```

This starts playback at approximately **60 seconds**.

> `startAt` does not override saved watch progress. It can be useful for cross-device progress or manually setting an initial playback position.

---

## `sub_file`

Adds an external subtitle track.

The value must be a **direct URL to a VTT subtitle file**.

```text
sub_file=https://example.com/subtitles.vtt
```

---

## `sub_label`

Sets the display name for an external subtitle track.

```text
sub_label=English
```

If omitted, the default label is:

```text
External Subtitle
```

---

## `fallback_url`

Specifies a URL to redirect to if the stream fails to load.

```text
fallback_url=https://example.com/fallback
```

---

# Complete Customization Example

The following example combines multiple player options:

```text
https://vidlink.pro/tv/94605/2/1?primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&player=default&title=true&poster=true&autoplay=false&nextbutton=false
```

The resulting player can be configured with:

- Custom primary color
- Custom secondary color
- Custom icon color
- Default icon style
- VidLink player
- Title enabled
- Poster enabled
- Autoplay disabled
- Next Episode button disabled

---

# Player Types

## VidLink Player

The default VidLink player provides:

- Full player customization
- Custom colors
- Custom icons
- Title overlay
- Next Episode button
- Playback controls

Use:

```text
player=default
```

---

## JW Player

VidLink also supports JW Player.

Use:

```text
player=jw
```

JW Player provides:

- Professional video player UI
- Fast loading
- Basic playback controls
- Player customization

---

# Watch Progress

VidLink supports watch-progress tracking, allowing websites to implement a **Continue Watching** feature.

Progress can be tracked across:

- Movies
- TV shows
- Individual episodes
- Last watched season
- Last watched episode

---

## Continue Watching Integration

Add the following event listener to the page containing your VidLink iframe:

```javascript
window.addEventListener("message", (event) => {
  if (event.origin !== "https://vidlink.pro") return;

  if (event.data?.type === "MEDIA_DATA") {
    const mediaData = event.data.data;

    localStorage.setItem(
      "vidLinkProgress",
      JSON.stringify(mediaData)
    );
  }
});
```

### React / Next.js

For React or Next.js applications, place the event listener inside a `useEffect` hook.

```javascript
useEffect(() => {
  const handleMessage = (event) => {
    if (event.origin !== "https://vidlink.pro") return;

    if (event.data?.type === "MEDIA_DATA") {
      const mediaData = event.data.data;

      localStorage.setItem(
        "vidLinkProgress",
        JSON.stringify(mediaData)
      );
    }
  };

  window.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener("message", handleMessage);
  };
}, []);
```

---

# Stored Progress Data

Progress data is stored in `localStorage` under:

```text
vidLinkProgress
```

The stored object can contain:

- Media ID
- Media type
- Title
- Poster
- Backdrop
- Current playback position
- Video duration
- Last watched episode
- Last watched season
- Episode-specific progress

### Example

```json
{
  "76479": {
    "id": 76479,
    "type": "tv",
    "title": "The Boys",
    "poster_path": "/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg",
    "progress": {
      "watched": 31.435372,
      "duration": 3609.867
    },
    "last_season_watched": "1",
    "last_episode_watched": "1",
    "show_progress": {
      "s1e1": {
        "season": "1",
        "episode": "1",
        "progress": {
          "watched": 31.435372,
          "duration": 3609.867
        }
      }
    }
  },
  "786892": {
    "id": 786892,
    "type": "movie",
    "title": "Furiosa: A Mad Max Saga",
    "poster_path": "/iADOJ8Zymht2JPMoy3R7xceZprc.jpg",
    "backdrop_path": "/wNAhuOZ3Zf84jCIlrcI6JhgmY5q.jpg",
    "progress": {
      "watched": 8726.904767,
      "duration": 8891.763
    },
    "last_updated": 1725723972695
  }
}
```

---

# Player Events

VidLink can send player events to the parent page using the browser's `postMessage` API.

This allows your application to track playback interactions.

## Available Events

| Event | Description |
|---|---|
| `play` | Video started playing |
| `pause` | Video was paused |
| `seeked` | User changed the playback position |
| `ended` | Video finished playing |
| `timeupdate` | Playback position was updated |

---

# Listening for Player Events

Add the following event listener to your website:

```javascript
window.addEventListener("message", (event) => {
  if (event.origin !== "https://vidlink.pro") return;

  if (event.data?.type === "PLAYER_EVENT") {
    const {
      event: eventType,
      currentTime,
      duration
    } = event.data.data;

    console.log(
      `Player ${eventType} at ${currentTime}s of ${duration}s`
    );
  }
});
```

---

# Player Event Data

A player event follows this structure:

```json
{
  "type": "PLAYER_EVENT",
  "data": {
    "event": "play",
    "currentTime": 120,
    "duration": 3600,
    "mtmdbId": 786892,
    "mediaType": "movie"
  }
}
```

For TV episodes, `season` and `episode` are also included:

```json
{
  "type": "PLAYER_EVENT",
  "data": {
    "event": "timeupdate",
    "currentTime": 120,
    "duration": 3600,
    "mtmdbId": 94997,
    "mediaType": "tv",
    "season": 1,
    "episode": 1
  }
}
```

---

# Security

When listening for messages from VidLink, always verify the message origin:

```javascript
if (event.origin !== "https://vidlink.pro") return;
```

Do not process messages from unknown origins.

---

# TMDB Integration

Movies and TV shows use IDs from **The Movie Database (TMDB)**.

TMDB API documentation:

https://developer.themoviedb.org/docs/getting-started

Example:

```text
TMDB ID: 786892

VidLink:
https://vidlink.pro/movie/786892
```

---

# MyAnimeList Integration

Anime embeds use IDs from **MyAnimeList (MAL)**.

MyAnimeList:

https://myanimelist.net/

Example:

```text
MAL ID: 5
Episode: 1
Type: sub

VidLink:
https://vidlink.pro/anime/5/1/sub
```

---

# Quick Reference

| Content | Endpoint |
|---|---|
| Movie | `/movie/{tmdbId}` |
| TV Episode | `/tv/{tmdbId}/{season}/{episode}` |
| Anime | `/anime/{malId}/{episode}/{subOrDub}` |

### Common Parameters

| Parameter | Purpose |
|---|---|
| `primaryColor` | Primary player color |
| `secondaryColor` | Secondary player color |
| `icons` | Icon style |
| `iconColor` | Icon color |
| `title` | Show/hide title |
| `poster` | Show/hide poster |
| `autoplay` | Enable/disable autoplay |
| `nextbutton` | Enable/disable next episode |
| `player` | Select player |
| `startAt` | Initial playback position |
| `sub_file` | External VTT subtitles |
| `sub_label` | Subtitle label |
| `fallback_url` | Stream failure redirect |

---

# Example Integration

A basic movie embed:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VidLink Player</title>
</head>

<body>
  <iframe
    src="https://vidlink.pro/movie/786892"
    width="100%"
    height="600"
    frameborder="0"
    allowfullscreen
  ></iframe>
</body>
</html>
```

A customized TV player:

```html
<iframe
  src="https://vidlink.pro/tv/94605/2/1?primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&player=default&title=true&poster=true&autoplay=false&nextbutton=true"
  width="100%"
  height="600"
  frameborder="0"
  allowfullscreen
></iframe>
```

---

# VidLink

**Movies · TV Shows · Anime**

Simple embeds. Customizable players. Watch-progress support.