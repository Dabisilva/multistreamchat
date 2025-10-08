# Multistream Chat

A real-time chat overlay that combines messages from both Twitch and Kick platforms with their respective user colors, badges, and emotes. Built with React, TypeScript, and Vite for modern web development with excellent developer experience.

## Features

- **OAuth Authentication**: Secure Twitch OAuth 2.0 login flow
- **Dual Platform Support**: Connects to both Twitch and Kick simultaneously
- **Real Twitch Badges**: Uses Twitch API to fetch actual badge data with OAuth tokens
- **Channel-Specific Badges**: Displays custom subscriber badges and channel-specific emotes
- **User Colors**: Displays messages with actual user colors from both platforms
- **Emote Support**: Full support for Twitch, BTTV, and Kick emotes
- **Real-time Updates**: Live message updates from both platforms
- **OBS Ready**: Transparent background perfect for streaming overlays
- **Message Limit**: Automatically manages message history (50 messages max)
- **Persistent Login**: OAuth tokens are saved locally for seamless reconnection
- **Modern UI**: Beautiful login screen with gradient design
- **React**: Modern React 18 with hooks and functional components
- **TypeScript**: Full type safety and better developer experience

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Twitch OAuth (Optional)

The application includes a default Twitch Client ID for basic functionality. For production use or custom branding, you can register your own application:

1. **Go to [Twitch Developer Console](https://dev.twitch.tv/console)**
2. **Log in with your Twitch account**
3. **Click "Register Your Application"**
4. **Fill in the form:**
   - Name: `Multistream Chat`
   - OAuth Redirect URLs: `http://localhost:5173` (Vite default) or your production URL
   - Category: `Application Integration`
5. **Click "Create"**
6. **Copy your Client ID**
7. **Update `TWITCH_CLIENT_ID` in `src/components/Login.tsx`**

### 3. Run the application

```bash
npm run dev
```

The application will start at `http://localhost:5173` (Vite default port).

## Usage

### First Time Setup

1. **Open the application** in your browser
2. **Enter your channel names**:
   - Twitch channel name (e.g., `shroud`)
   - Kick channel name (optional, e.g., `xqc`)
3. **Click "Login with Twitch OAuth"** to authenticate
4. **Authorize the application** on Twitch's OAuth page
5. **You're connected!** The chat will start showing messages

### Manual Token Entry (Alternative)

If you prefer to use a manually generated token:

1. Click "► Use manual token" on the login screen
2. Get your OAuth token from [Twitch TMI Token Generator](https://twitchapps.com/tmi/)
3. Enter the token (format: `oauth:your_token_here`)
4. Click "Connect with Manual Token"

### OBS Integration

1. **Add a Browser Source** in OBS
2. **Enter the URL**: `http://localhost:5173` (or your production URL)
3. **Set dimensions**: 1920x1080 (or your stream resolution)
4. **Enable**: "Shutdown source when not visible" for better performance
5. **Optional**: Add custom CSS for positioning in OBS

### Logout

Click the "Logout" button in the top-right corner to disconnect and return to the login screen.

## Features Explained

### OAuth Authentication

- **Secure Login**: Uses Twitch's OAuth 2.0 for secure authentication
- **Automatic Token Storage**: Tokens are saved in localStorage for persistent login
- **Session Management**: Handles OAuth redirects and token validation
- **Badge Access**: OAuth tokens enable fetching channel-specific badges

### Multi-Platform Support

- **Twitch**: Full IRC connection with TMI.js
- **Kick**: WebSocket connection via Pusher
- **Concurrent Streaming**: Both platforms can be used simultaneously

## Project Structure

```
src/
├── main.tsx                    # React entry point
├── App.tsx                     # Main component with chat logic and auth state
├── types.ts                    # TypeScript type definitions
├── style.css                   # Styles for the chat overlay
├── components/
│   ├── Login.tsx              # OAuth login screen component
│   ├── Login.css              # Login screen styles
│   └── MessageRow.tsx         # Chat message component
├── services/
│   ├── AuthService.ts         # Authentication and token management
│   ├── TwitchChat.ts          # Twitch IRC connection and message handling
│   └── KickChat.ts            # Kick WebSocket connection
└── utils/
    └── messageUtils.ts        # Message filtering and processing utilities
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

### OAuth Issues

- **OAuth Redirect Failed**: Verify the redirect URI matches your Twitch app configuration
- **Token Invalid**: Re-login to get a fresh OAuth token
- **Authorization Denied**: Check the scopes requested match your app settings

### Badge Issues

- **No Badges Showing**: Ensure you're logged in with OAuth (badges require authentication)
- **Channel Badges Missing**: OAuth token must have proper permissions
- **API Errors**: Check browser console for detailed error messages

### Connection Issues

- **Twitch Not Connecting**: Verify channel name is correct (lowercase, no special characters)
- **Kick Not Connecting**: Check channel name and ensure the channel exists
- **No Messages**: Ensure channels have active chat (test with a popular live channel)
- **Disconnecting Frequently**: Check your internet connection and firewall settings

### General Issues

- **Type Errors**: Run `npm run type-check` to identify type issues
- **Build Errors**: Check console for dependency issues and run `npm install` again
- **Performance**: Monitor message count and adjust `messagesLimit` in App.tsx
- **LocalStorage Full**: Clear browser localStorage if experiencing storage issues

## Security Notes

- **OAuth Tokens**: Tokens are stored in localStorage - never share your browser profile
- **Client ID**: The default Client ID is public and safe for frontend use
- **Token Rotation**: Twitch OAuth tokens expire - re-login when needed
- **Rate Limiting**: Be aware of Twitch API rate limits (800 requests/minute)
- **Production Deployment**: Use environment variables for sensitive configuration
- **HTTPS**: Always use HTTPS in production for secure OAuth flows

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
