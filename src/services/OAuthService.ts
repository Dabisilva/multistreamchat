// OAuth Service for Twitch and Kick authentication

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
  platform: 'twitch' | 'kick';
  broadcasterId?: string; // For Twitch, this is the same as id
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
    localStorage.setItem('twitch_oauth_state', state);
    
    // Generate PKCE challenge
    const { codeVerifier, codeChallenge } = await this.generateCodeChallenge();
    localStorage.setItem('twitch_code_verifier', codeVerifier);
    
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


  /**
   * Handle Twitch OAuth callback and exchange code for token
   */
  async handleOAuthCallback(_platform: 'twitch', code: string, state: string): Promise<TokenResponse> {
    const stateKey = 'twitch_oauth_state';
    const verifierKey = 'twitch_code_verifier';
    
    const storedState = localStorage.getItem(stateKey);
    const codeVerifier = localStorage.getItem(verifierKey);
    
    if (!storedState || storedState !== state) {
      throw new Error('Invalid state parameter');
    }
    
    if (!codeVerifier) {
      throw new Error('Missing code verifier');
    }
    
    const config = this.getTwitchConfig();
    
    const tokenUrl = 'https://id.twitch.tv/oauth2/token';
    
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code: code,
      code_verifier: codeVerifier
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
      let errorMessage = `Token exchange failed (${response.status}): ${errorText}`;
      
      if (response.status === 401) {
        errorMessage = 'Twitch OAuth: Credenciais inválidas';
      } else if (response.status === 400) {
        errorMessage = 'OAuth: Código inválido ou expirado. Tente fazer login novamente.';
      }
      
      throw new Error(errorMessage);
    }
    
    const tokenData: TokenResponse = await response.json();
    
    // Clean up localStorage
    localStorage.removeItem(stateKey);
    localStorage.removeItem(verifierKey);
    return tokenData;
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

}

export default OAuthService.getInstance();
