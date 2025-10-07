# Multistream Chat

A real-time chat overlay that combines messages from both Twitch and Kick platforms with their respective user colors, badges, and emotes. Built with React, TypeScript, and Vite for modern web development with excellent developer experience.

## Features

- **Dual Platform Support**: Connects to both Twitch and Kick simultaneously
- **Real Twitch Badges**: Uses Twitch API to fetch actual badge data
- **User Colors**: Displays messages with actual user colors from both platforms
- **Emote Support**: Displays Twitch emotes inline with messages
- **Real-time Updates**: Live message updates from both platforms
- **OBS Ready**: Transparent background perfect for streaming overlays
- **Message Limit**: Automatically manages message history (100 messages max)
- **React**: Modern React 18 with hooks and functional components
- **TypeScript**: Full type safety and better developer experience

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Get Twitch API Credentials

To display real Twitch badges, you need to get API credentials from Twitch:

1. **Go to [Twitch Developer Console](https://dev.twitch.tv/console)**
2. **Log in with your Twitch account**
3. **Click "Register Your Application"**
4. **Fill in the form:**
   - Name: `Multistream Chat`
   - OAuth Redirect URLs: `http://localhost:3000`
   - Category: `Application Integration`
5. **Click "Create"**
6. **Copy your Client ID**

### 3. Get OAuth Token

You need an OAuth token with the `chat:read` scope:

1. **Go to [Twitch OAuth Generator](https://twitchtokengenerator.com/)**
2. **Select "Custom Scope Token"**
3. **Add the scope: `chat:read`**
4. **Click "Generate Token"**
5. **Copy your Access Token**

### 4. Configure the Application

Edit `src/App.tsx` and update these values:

```typescript
// Replace with your actual credentials
const TWITCH_CLIENT_ID = "your_client_id_here";
const TWITCH_OAUTH_TOKEN = "your_oauth_token_here";

// Update channel names
const TWITCH_CHANNEL_NAME = "your_twitch_channel";
const KICK_CHANNEL_NAME = "your_kick_channel";
```

### 5. Run the application

```bash
npm run dev
```

## Usage

- **Development**: Run `npm run dev` and open `http://localhost:3000`
- **OBS Integration**: Add as Browser Source with the URL from your dev server
- **Production**: Build with `npm run build` and serve the `dist` folder

## Project Structure

```
src/
├── main.tsx          # React entry point
├── App.tsx           # Main React component with chat logic
├── types.ts          # TypeScript type definitions
└── style.css         # Styles for the chat overlay
```

## Technical Details

### Twitch Badge System

The application now uses the official Twitch API to fetch real badge data:

- **Global Badges**: Fetched from `/helix/chat/badges/global`
- **Channel Badges**: Fetched from `/helix/chat/badges?broadcaster_id={id}`
- **Real-time Updates**: Badges are loaded when connecting to a channel
- **Fallback System**: Falls back to static URLs if API fails

### Badge Types Supported

- **Admin**: Twitch administrators
- **Bits**: Bit donors
- **Broadcaster**: Channel owner
- **Global Mod**: Global moderators
- **Moderator**: Channel moderators
- **Subscriber**: Channel subscribers
- **Staff**: Twitch staff
- **Turbo**: Turbo users
- **VIP**: VIP users
- **Premium**: Premium users
- **Partner**: Partnered streamers
- **Founder**: Channel founders
- **Verified**: Verified users

### Emote Support

The application supports popular Twitch emotes:

- Kappa, PogChamp, LUL, monkaS, PepeHands
- FeelsBadMan, FeelsGoodMan, TriHard, BibleThump, 4Head

## Troubleshooting

### Badge Issues

- **No Badges Showing**: Check your Twitch API credentials
- **API Errors**: Verify your Client ID and OAuth token are correct
- **CORS Issues**: Make sure you're running from a proper web server

### Connection Issues

- **Twitch Not Connecting**: Check channel name and API credentials
- **Kick Not Connecting**: Verify channel name and WebSocket connection
- **No Messages**: Ensure channels are live and have active chat

### General Issues

- **Type Errors**: Run `npm run type-check` to identify type issues
- **Build Errors**: Check console for dependency issues
- **Performance**: Monitor message count and cleanup

## Security Notes

- **Never commit API credentials**: Use environment variables in production
- **OAuth Token Security**: Keep your OAuth token secure and rotate regularly
- **Rate Limiting**: Be aware of Twitch API rate limits

## React Benefits

- **Component-Based**: Modular and reusable components
- **State Management**: React hooks for clean state management
- **Performance**: Optimized rendering with React's virtual DOM
- **Developer Experience**: Hot reload and excellent debugging tools
- **Ecosystem**: Rich ecosystem of libraries and tools

## TypeScript Benefits

- **Type Safety**: Catch errors at compile time
- **Better IntelliSense**: Enhanced autocomplete and documentation
- **Refactoring**: Safe refactoring with confidence
- **Documentation**: Types serve as inline documentation

## License

This project is open source and available under the MIT License.
