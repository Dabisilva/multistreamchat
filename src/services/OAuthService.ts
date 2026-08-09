// OAuth Service for Twitch and YouTube authentication

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface UserInfo {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatar?: string;
  platform: 'twitch' | 'kick' | 'youtube';
  broadcasterId?: string; // For Twitch/YouTube, channel/user id
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}

export class OAuthService {
  private static instance: OAuthService;
  
  private constructor() {}

  static getInstance(): OAuthService {
    if (!OAuthService.instance) {
      OAuthService.instance = new OAuthService();
    }
    return OAuthService.instance;
  }

  /**
   * Generate PKCE code challenge for OAuth
   */
  private async generateCodeChallenge(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const codeVerifier = this.generateRandomString(128);
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    
    try {
      const hash = await crypto.subtle.digest('SHA-256', data);
      const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      return { codeVerifier, codeChallenge };
    } catch {
      // Fallback for browsers without crypto.subtle
      const codeChallenge = btoa(codeVerifier)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      return { codeVerifier, codeChallenge };
    }
  }

  private generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let text = '';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Initiate Twitch OAuth flow
   */
  async initiateTwitchOAuth(): Promise<void> {
    const config = this.getTwitchConfig();
    const state = this.generateRandomString(32);
    
    // Store state for verification
    this.writeOAuthStorage('twitch_oauth_state', state);
    
    // Generate PKCE challenge
    const { codeVerifier, codeChallenge } = await this.generateCodeChallenge();
    this.writeOAuthStorage('twitch_code_verifier', codeVerifier);
    
    // Include scopes for reading user info, email, chat, and moderator data
    const scopes = 'user:read:email chat:read moderator:read:chatters';
    const authUrl = `https://id.twitch.tv/oauth2/authorize?` +
      `client_id=${config.clientId}&` +
      `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256`;
    
    window.location.href = authUrl;
  }


  private readOAuthStorage(key: string): string | null {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  }

  private writeOAuthStorage(key: string, value: string): void {
    sessionStorage.setItem(key, value);
    localStorage.setItem(key, value);
  }

  private clearOAuthStorage(...keys: string[]): void {
    for (const key of keys) {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    }
  }

  /**
   * Detect which platform started the OAuth flow from stored PKCE state.
   */
  detectOAuthPlatform(state: string | null): 'twitch' | 'youtube' | null {
    if (!state) return null;

    const youtubeState = this.readOAuthStorage('youtube_oauth_state');
    const twitchState = this.readOAuthStorage('twitch_oauth_state');

    if (youtubeState && state === youtubeState) return 'youtube';
    if (twitchState && state === twitchState) return 'twitch';

    // Fallback when state key was lost but verifier remains (same-tab redirect)
    if (this.readOAuthStorage('youtube_code_verifier') && !twitchState) {
      return 'youtube';
    }
    if (this.readOAuthStorage('twitch_code_verifier') && !youtubeState) {
      return 'twitch';
    }

    return null;
  }

  /**
   * Handle OAuth callback and exchange code for token
   */
  async handleOAuthCallback(
    platform: 'twitch' | 'youtube',
    code: string,
    state: string
  ): Promise<TokenResponse> {
    const stateKey = platform === 'youtube' ? 'youtube_oauth_state' : 'twitch_oauth_state';
    const verifierKey =
      platform === 'youtube' ? 'youtube_code_verifier' : 'twitch_code_verifier';

    const storedState = this.readOAuthStorage(stateKey);
    const codeVerifier = this.readOAuthStorage(verifierKey);

    // Prefer exact state match; allow missing stored state only when verifier exists
    // (handles rare localStorage loss on redirect while sessionStorage/verifier remains).
    if (storedState && storedState !== state) {
      throw new Error(
        'Estado OAuth inválido. Feche a aba e faça login novamente.'
      );
    }

    if (!codeVerifier) {
      throw new Error(
        'Sessão OAuth expirada (code verifier ausente). Faça login novamente.'
      );
    }

    if (platform === 'youtube') {
      return this.exchangeYoutubeCode(code, codeVerifier, stateKey, verifierKey);
    }

    return this.exchangeTwitchCode(code, codeVerifier, stateKey, verifierKey);
  }

  private async exchangeTwitchCode(
    code: string,
    codeVerifier: string,
    stateKey: string,
    verifierKey: string
  ): Promise<TokenResponse> {
    const config = this.getTwitchConfig();

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code: code,
      code_verifier: codeVerifier,
    });

    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Token exchange failed (${response.status}): ${errorText}`;

      if (response.status === 401) {
        errorMessage = 'Twitch OAuth: Credenciais inválidas';
      } else if (response.status === 400) {
        errorMessage =
          'OAuth: Código inválido ou expirado. Tente fazer login novamente.';
      }

      throw new Error(errorMessage);
    }

    const tokenData: TokenResponse = await response.json();

    this.clearOAuthStorage(stateKey, verifierKey);
    return tokenData;
  }

  private async exchangeYoutubeCode(
    code: string,
    codeVerifier: string,
    stateKey: string,
    verifierKey: string
  ): Promise<TokenResponse> {
    const config = this.getYoutubeConfig();

    if (!config.clientId || !config.clientSecret) {
      throw new Error(
        'YouTube OAuth incompleto. Defina VITE_YOUTUBE_CLIENT_ID e VITE_YOUTUBE_CLIENT_SECRET.'
      );
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code: code,
      code_verifier: codeVerifier,
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `YouTube token exchange failed (${response.status}): ${errorText}`;

      if (response.status === 401) {
        errorMessage = 'YouTube OAuth: Credenciais inválidas';
      } else if (response.status === 400) {
        errorMessage =
          'YouTube OAuth: Código inválido, redirect URI diferente, ou PKCE inválido. Confira VITE_YOUTUBE_REDIRECT_URI (deve ser idêntico ao Google Console).';
      }

      throw new Error(errorMessage);
    }

    const tokenData: TokenResponse = await response.json();

    this.clearOAuthStorage(stateKey, verifierKey);
    return tokenData;
  }

  /**
   * Initiate YouTube (Google) OAuth flow
   */
  async initiateYoutubeOAuth(): Promise<void> {
    const config = this.getYoutubeConfig();

    if (!config.clientId) {
      throw new Error(
        'YouTube OAuth não configurado. Defina VITE_YOUTUBE_CLIENT_ID.'
      );
    }

    const state = this.generateRandomString(32);
    this.writeOAuthStorage('youtube_oauth_state', state);

    const { codeVerifier, codeChallenge } = await this.generateCodeChallenge();
    this.writeOAuthStorage('youtube_code_verifier', codeVerifier);

    const scopes = "https://www.googleapis.com/auth/youtube.readonly";

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(config.clientId)}&` +
      `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${encodeURIComponent(state)}&` +
      `code_challenge=${encodeURIComponent(codeChallenge)}&` +
      `code_challenge_method=S256&` +
      `access_type=offline&` +
      `prompt=consent`;

    window.location.href = authUrl;
  }

  /**
   * Refresh an expired access token using the refresh token
   */
  async refreshTwitchToken(refreshToken: string): Promise<TokenResponse> {
    const config = this.getTwitchConfig();
    
    const tokenUrl = 'https://id.twitch.tv/oauth2/token';
    
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed (${response.status}): ${errorText}`);
    }
    
    const tokenData: TokenResponse = await response.json();
    return tokenData;
  }

  /**
   * Validate a Twitch access token and check if it's still valid
   */
  async validateTwitchToken(accessToken: string): Promise<{ valid: boolean; expiresIn?: number }> {
    try {
      const cleanToken = accessToken.replace(/^Bearer\s+/i, '').trim();
      
      const response = await fetch('https://id.twitch.tv/oauth2/validate', {
        headers: {
          'Authorization': `Bearer ${cleanToken}`
        }
      });

      if (!response.ok) {
        return { valid: false };
      }

      const data = await response.json();
      return {
        valid: true,
        expiresIn: data.expires_in // Time in seconds until token expires
      };
    } catch (error) {
      return { valid: false };
    }
  }

  /**
   * Get user information from Twitch API
   */
  async getTwitchUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': this.getTwitchConfig().clientId
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get Twitch user info');
    }
    
    const data = await response.json();
    const user = data.data[0];
    
    // For Twitch, the user ID is the broadcaster ID (when the user authenticates their own channel)
    return {
      id: user.id,
      username: user.login,
      displayName: user.display_name,
      email: user.email,
      avatar: user.profile_image_url,
      platform: 'twitch',
      broadcasterId: user.id // Store broadcaster ID (same as user ID for authenticated user)
    };
  }


  /**
   * Refresh an expired YouTube access token
   */
  async refreshYoutubeToken(refreshToken: string): Promise<TokenResponse> {
    const config = this.getYoutubeConfig();

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Get authenticated YouTube channel info
   */
  async getYoutubeUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 403) {
        throw new Error(
          'YouTube Data API v3 não está ativada no Google Cloud, ou a conta não tem permissão.'
        );
      }
      throw new Error(
        `Falha ao obter canal do YouTube (${response.status}): ${errorText}`
      );
    }

    const data = await response.json();
    const channel = data.items?.[0];

    if (!channel) {
      throw new Error('Nenhum canal do YouTube encontrado para esta conta');
    }

    const snippet = channel.snippet || {};
    const customUrl = (snippet.customUrl || '').replace(/^@/, '');

    return {
      id: channel.id,
      username: customUrl || snippet.title || channel.id,
      displayName: snippet.title || customUrl || channel.id,
      avatar: snippet.thumbnails?.default?.url,
      platform: 'youtube',
      broadcasterId: channel.id,
    };
  }

  /**
   * Get Twitch OAuth configuration
   */
  private getTwitchConfig(): OAuthConfig {
    const defaultRedirectUri = `${window.location.origin}/`;
    return {
      clientId: (import.meta as any).env?.VITE_TWITCH_CLIENT_ID || 'kimne78kx3ncx6brgo4mv6wki5h1ko', // Public Twitch client ID
      clientSecret: (import.meta as any).env?.VITE_TWITCH_CLIENT_SECRET || '',
      redirectUri: (import.meta as any).env?.VITE_TWITCH_REDIRECT_URI || defaultRedirectUri
    };
  }

  /**
   * Get YouTube OAuth configuration.
   * Google requires an exact redirect_uri match — do not alter trailing slashes.
   */
  private getYoutubeConfig(): OAuthConfig {
    const envRedirect = ((import.meta as any).env?.VITE_YOUTUBE_REDIRECT_URI ||
      '') as string;

    return {
      clientId: (import.meta as any).env?.VITE_YOUTUBE_CLIENT_ID || '',
      clientSecret: (import.meta as any).env?.VITE_YOUTUBE_CLIENT_SECRET || '',
      // Prefer explicit env; default to origin without forcing a trailing slash
      redirectUri: envRedirect || window.location.origin,
    };
  }

}

export default OAuthService.getInstance();
