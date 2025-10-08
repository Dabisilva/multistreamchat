// Authentication Service for managing OAuth tokens and user state

export interface AuthState {
  twitchToken: string;
  twitchChannel: string;
  kickChannel?: string;
  isAuthenticated: boolean;
}

export class AuthService {
  private static instance: AuthService;
  
  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Save authentication credentials to localStorage
   */
  saveAuth(twitchToken: string, twitchChannel: string, kickChannel?: string): void {
    localStorage.setItem('twitchToken', twitchToken);
    localStorage.setItem('twitchChannel', twitchChannel);
    if (kickChannel) {
      localStorage.setItem('kickChannel', kickChannel);
    }
  }

  /**
   * Get saved authentication state
   */
  getAuthState(): AuthState {
    const twitchToken = localStorage.getItem('twitchToken') || '';
    const twitchChannel = localStorage.getItem('twitchChannel') || '';
    const kickChannel = localStorage.getItem('kickChannel') || undefined;

    return {
      twitchToken,
      twitchChannel,
      kickChannel,
      isAuthenticated: !!(twitchToken && twitchChannel) || !!kickChannel
    };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const state = this.getAuthState();
    return state.isAuthenticated;
  }

  /**
   * Clear authentication and logout
   */
  logout(): void {
    localStorage.removeItem('twitchToken');
    localStorage.removeItem('twitchChannel');
    localStorage.removeItem('kickChannel');
    
    // Also clear session storage
    sessionStorage.removeItem('twitchChannel');
    sessionStorage.removeItem('kickChannel');
  }

  /**
   * Parse OAuth token from URL hash (after Twitch redirect)
   */
  parseOAuthFromUrl(): { token: string | null; error: string | null } {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    
    const token = params.get('access_token');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
      return { token: null, error: errorDescription || error };
    }

    if (token) {
      // Clean up URL
      window.history.replaceState(null, '', window.location.pathname);
      return { token, error: null };
    }

    return { token: null, error: null };
  }

  /**
   * Validate Twitch token by making a test API call
   */
  async validateTwitchToken(token: string): Promise<boolean> {
    try {
      const response = await fetch('https://id.twitch.tv/oauth2/validate', {
        headers: {
          'Authorization': `OAuth ${token.replace('oauth:', '')}`
        }
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user info from Twitch API
   */
  async getTwitchUserInfo(token: string, clientId: string): Promise<any> {
    try {
      const response = await fetch('https://api.twitch.tv/helix/users', {
        headers: {
          'Authorization': `Bearer ${token.replace('oauth:', '')}`,
          'Client-Id': clientId
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.data[0];
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}

export default AuthService.getInstance();

