# Stillgram

**Stay connected. Cut the noise.**

A minimal Instagram client for Android: keeps DMs and Stories, removes the parts designed to
keep you scrolling. Built with Expo + React Native around a WebView of `instagram.com`, with
CSS and JavaScript injected to strip the distracting surfaces.

## What it does

| | |
|---|---|
| 🔒 **Feed locked** | Home shows your stories tray and a lock icon — no feed, no infinite scroll |
| 🚫 **Explore & Reels removed** | Both the nav entries and the routes themselves are blocked |
| 🎬 **Reels locked to one** | A reel a friend sends in a DM plays, but you can't swipe to the next one |
| 💬 **DMs & Stories intact** | Messages, stories, replies all work normally |

Reel blocking is the interesting part. Instagram's reel tray is driven by its own JavaScript
pointer handlers, not native scrolling, so CSS alone can't stop it — and a reel shared in a DM
opens as a fullscreen overlay at `/direct/t/<id>/` without the URL ever changing. The injected
script detects that overlay from the DOM and swallows vertically-dominant gestures at the
document capture phase, before Instagram's handlers see them. Stories are exempt, so
swipe-down-to-close still works.

## Install

Grab the APK from [Releases](../../releases) and install it (you'll need to allow installation
from unknown sources). Then sign in with your normal Instagram credentials — the session lives
in the app's WebView and nothing is sent anywhere else.

## Development

```bash
npm install
npx expo start          # run in Expo Go
```

Building a release APK locally needs the Android SDK and a JDK (with a compiler, not just a
JRE). `scripts/build-apk.sh` wraps the toolchain:

```bash
bash scripts/build-apk.sh
```

Note that `npx expo prebuild` regenerates `android/gradle.properties` and drops the heap,
worker-count and arm64-only settings that keep the build within memory limits.

## Layout

```
src/
  app/
    _layout.tsx              Stack with the header hidden
    index.tsx                Full-screen WebView
  components/
    instagram-web-view.tsx   WebView config, route blocking, reload button
  constants/
    instagram.ts             The injected CSS + JavaScript
```

## Caveats

Instagram's web DOM is obfuscated and changes without notice, so the selectors here are best
effort and may need updating. This is a personal project and is not affiliated with Instagram
or Meta.
