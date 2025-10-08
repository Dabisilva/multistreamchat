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
    console.log('=== Initiating Twitch OAuth ===');
    const config = this.getTwitchConfig();
    console.log('Twitch config:', { clientId: config.clientId, redirectUri: config.redirectUri });
    
    const state = this.generateRandomString(32);
    console.log('Generated state:', state);
    
    // Store state for verification
    localStorage.setItem('twitch_oauth_state', state);
    console.log('Stored twitch_oauth_state in localStorage');
    
    // Generate PKCE challenge
    const { codeVerifier, codeChallenge } = await this.generateCodeChallenge();
    localStorage.setItem('twitch_code_verifier', codeVerifier);
    console.log('Stored twitch_code_verifier in localStorage');
    console.log('Code challenge generated:', codeChallenge);
    
    const scopes = 'user:read:email chat:read';
    const authUrl = `https://id.twitch.tv/oauth2/authorize?` +
      `client_id=${config.clientId}&` +
      `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256`;
    
    console.log('Redirecting to Twitch OAuth URL:', authUrl);
    window.location.href = authUrl;
  }

  /**
   * Initiate Kick OAuth flow
   */
  async initiateKickOAuth(): Promise<void> {
    console.log('=== Initiating Kick OAuth ===');
    const config = this.getKickConfig();
    console.log('Kick config:', { clientId: config.clientId, redirectUri: config.redirectUri });
    
    const state = this.generateRandomString(32);
    console.log('Generated state:', state);
    
    // Store state for verification
    localStorage.setItem('kick_oauth_state', state);
    console.log('Stored kick_oauth_state in localStorage');
    
    // Generate PKCE challenge
    const { codeVerifier, codeChallenge } = await this.generateCodeChallenge();
    localStorage.setItem('kick_code_verifier', codeVerifier);
    console.log('Stored kick_code_verifier in localStorage');
    console.log('Code challenge generated:', codeChallenge);
    
    const scopes = 'user:read:email chat:read';
    const authUrl = `https://id.kick.com/oauth/authorize?` +
      `client_id=${config.clientId}&` +
      `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}&` +
      `code_challenge=${codeChallenge}&` +
      `code_challenge_method=S256`;
    
    console.log('Redirecting to Kick OAuth URL:', authUrl);
    window.location.href = authUrl;
  }

  /**
   * Handle OAuth callback and exchange code for token
   */
  async handleOAuthCallback(platform: 'twitch' | 'kick', code: string, state: string): Promise<TokenResponse> {
    console.log(`=== handleOAuthCallback (${platform}) ===`);
    const stateKey = `${platform}_oauth_state`;
    const verifierKey = `${platform}_code_verifier`;
    
    console.log('Looking for stored state with key:', stateKey);
    const storedState = localStorage.getItem(stateKey);
    console.log('Stored state:', storedState);
    console.log('Received state:', state);
    console.log('States match:', storedState === state);
    
    const codeVerifier = localStorage.getItem(verifierKey);
    console.log('Code verifier exists:', !!codeVerifier);
    
    if (!storedState || storedState !== state) {
      console.error('State validation failed!');
      throw new Error('Invalid state parameter');
    }
    
    if (!codeVerifier) {
      console.error('Code verifier missing!');
      throw new Error('Missing code verifier');
    }
    
    console.log('State and verifier validated successfully');
    
    const config = platform === 'twitch' ? this.getTwitchConfig() : this.getKickConfig();
    
    const tokenUrl = platform === 'twitch' 
      ? 'https://id.twitch.tv/oauth2/token'
      : 'https://id.kick.com/oauth/token';
    
    console.log('Token exchange URL:', tokenUrl);
    console.log('Client ID:', config.clientId);
    console.log('Redirect URI:', config.redirectUri);
    
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code: code,
      code_verifier: codeVerifier
    });
    
    console.log('Making token exchange request...');
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString()
    });
    
    console.log('Token exchange response status:', response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Token exchange failed with error:', error);
      throw new Error(`Token exchange failed: ${error}`);
    }
    
    const tokenData: TokenResponse = await response.json();
    console.log('Token exchange successful!');
    
    // Clean up localStorage
    console.log('Cleaning up OAuth state and verifier...');
    localStorage.removeItem(stateKey);
    localStorage.removeItem(verifierKey);
    console.log('Cleanup complete');
    
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
    
    return {
      id: user.id,
      username: user.login,
      displayName: user.display_name,
      email: user.email,
      avatar: user.profile_image_url,
      platform: 'twitch'
    };
  }

  /**
   * Get user information from Kick API
   */
  async getKickUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch('https://kick.com/api/v1/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to get Kick user info');
    }
    
    const user = await response.json();
    
    return {
      id: user.id.toString(),
      username: user.username,
      displayName: user.username,
      email: user.email,
      avatar: user.profile_pic,
      platform: 'kick'
    };
  }

  /**
   * Get Twitch OAuth configuration
   */
  private getTwitchConfig(): OAuthConfig {
    const defaultRedirectUri = `${window.location.origin}/login`;
    return {
      clientId: (import.meta as any).env?.VITE_TWITCH_CLIENT_ID || 'kimne78kx3ncx6brgo4mv6wki5h1ko', // Public Twitch client ID
      clientSecret: (import.meta as any).env?.VITE_TWITCH_CLIENT_SECRET || '',
      redirectUri: (import.meta as any).env?.VITE_TWITCH_REDIRECT_URI || defaultRedirectUri
    };
  }

  /**
   * Get Kick OAuth configuration
   */
  private getKickConfig(): OAuthConfig {
    const defaultRedirectUri = `${window.location.origin}/login`;
    return {
      clientId: (import.meta as any).env?.VITE_KICK_CLIENT_ID || '',
      clientSecret: (import.meta as any).env?.VITE_KICK_CLIENT_SECRET || '',
      redirectUri: (import.meta as any).env?.VITE_KICK_REDIRECT_URI || defaultRedirectUri
    };
  }

  /**
   * Validate access token
   */
  async validateToken(accessToken: string, platform: 'twitch' | 'kick'): Promise<boolean> {
    try {
      const validateUrl = platform === 'twitch' 
        ? 'https://id.twitch.tv/oauth2/validate'
        : 'https://kick.com/api/v1/user';
      
      const headers: HeadersInit = {
        'Authorization': `Bearer ${accessToken}`
      };
      
      if (platform === 'twitch') {
        headers['Client-Id'] = this.getTwitchConfig().clientId;
      }
      
      const response = await fetch(validateUrl, { headers });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export default OAuthService.getInstance();
