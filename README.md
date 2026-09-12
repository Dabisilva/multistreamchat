# MultiStreamChat

OBS-ready overlays that unify **chat** and **viewer counts** from Twitch, Kick, and YouTube. Built with React, TypeScript, and Vite.

Connect the platforms you stream on, customize the look, then paste a widget URL into OBS as a Browser Source.

## Features

- **Three platforms**: Twitch, Kick, and YouTube in the same overlays
- **Chat overlay**: Combined live messages with platform colors, badges, and emotes
- **Viewer count overlay**: Live viewer totals per platform, or a single summed count
- **Dashboard**: Sign in, pick Chat or Viewer Count, customize, and copy the OBS URL
- **OAuth login**: Twitch and YouTube via OAuth 2.0/2.1; Kick uses the channel name (no login)
- **Persistent sessions**: Tokens and Kick channel are saved locally; access tokens refresh automatically
- **Real badges**: Twitch/Kick badges from the platforms; YouTube owner, moderator, member, and verified badges
- **Emotes**: Twitch, BTTV, FFZ, Kick, plus Twitch GIF Keyboard (GIPHY) GIFs
- **Live detection**: YouTube chat and viewer counts follow the current live stream
- **OBS ready**: Transparent widgets for Browser Sources
- **Message delay**: Configurable delay for non-privileged users (mods, VIPs, and owners appear immediately)
- **Moderation**: Deleted messages and banned users are removed, including while still delayed
- **Message limit**: Keeps the latest 50 messages
- **Legal pages**: Privacy Policy and Terms of Service

## Getting started

1. Open the app and go to the home dashboard.
2. Connect Twitch and/or YouTube with OAuth, and optionally enter a Kick channel.
3. Choose **Chat** or **Viewer Count**.
4. Customize the overlay (optional).
5. Copy the widget URL and add it as an OBS Browser Source (transparent background).

You can connect any combination of platforms. The overlays only show the ones you have connected.

### Example URL

```
http://localhost:5173/chat?twitchChannel=channelname&messageDelay=3&messageBg=%238b5cf6&fullWidthMessages=true&messagePadding=4
```

## Viewer count overlay

Shows current concurrent viewers. Offline platforms report `0` (and look dimmed when shown separately). Counts refresh about every 45 seconds.

### Example URL

```
http://localhost:5173/viewers?twitchChannel=channelname&sumViews=true&viewerFontSize=40&viewerTextColor=%23ffffff
```
