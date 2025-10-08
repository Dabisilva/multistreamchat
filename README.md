# Multistream Chat

A real-time chat overlay that combines messages from both Twitch and Kick platforms with their respective user colors, badges, and emotes. Built with React, TypeScript, and Vite for modern web development with excellent developer experience.

## Features

- **OAuth Authentication**: Secure OAuth 2.0/2.1 login flow for Twitch
- **Dual Platform Support**: Connects to both Twitch and Kick simultaneously
- **Real Platform Badges**: Uses platform APIs to fetch actual badge data with OAuth tokens
- **Channel-Specific Badges**: Displays custom subscriber badges and channel-specific emotes
- **User Colors**: Displays messages with actual user colors from both platforms
- **Emote Support**: Full support for Twitch, BTTV, FFZ, and Kick emotes
- **Real-time Updates**: Live message updates from both platforms
- **OBS Ready**: Transparent background perfect for streaming overlays
- **Message Limit**: Automatically manages message history (50 messages max)
- **Persistent Login**: OAuth tokens are saved locally for seamless reconnection
- **Modern UI**: Beautiful login screen with gradient design
- **Message Delay**: Configurable delay for non-privileged users (moderators, VIPs, and broadcasters show immediately)
- **React**: Modern React 18 with hooks and functional components
- **TypeScript**: Full type safety and better developer experience

## Customization Options

You can customize the chat overlay using the built-in customization panel or by adding URL parameters:

### Style Parameters

- `usernameBg` - Background color for username (default: #30034d)
- `usernameColor` - Text color for username (default: #ffffff)
- `messageBg` - Background color for message (default: #8b5cf6)
- `messageColor` - Text color for message (default: #ffffff)
- `borderRadius` - Border radius in pixels (default: 10)
- `usernameFontSize` - Font size for username in pixels (default: 16)
- `messageFontSize` - Font size for message in pixels (default: 20)

### Behavior Parameters

- `messageDelay` - Delay in seconds for messages from non-privileged users (default: 5, max: 6)
  - Moderators, VIPs, and channel owners are not affected by this delay
  - Messages deleted or from banned users during the delay will not appear
  - Can be set from 0 to 6 seconds in 0.5 second increments

### Example URL

```
http://localhost:5173/chat?twitchChannel=channelname&messageDelay=3&messageBg=%23ff00ff
```
