import React, { useEffect, useState } from 'react';
import OAuthService from '../services/OAuthService';

interface OAuthCallbackProps {
  platform: 'twitch' | 'kick';
  onSuccess: (userInfo: any, token: string) => void;
  onError: (error: string) => void;
}

export const OAuthCallback: React.FC<OAuthCallbackProps> = ({ platform, onSuccess, onError }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando autenticação...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
          throw new Error(`OAuth error: ${error}`);
        }

        if (!code || !state) {
          throw new Error('Missing authorization code or state');
        }

        setMessage('Trocando código por token...');

        // Exchange code for token
        const tokenResponse = await OAuthService.handleOAuthCallback(platform, code, state);

        setMessage('Obtendo informações do usuário...');

        // Get user info
        const userInfo = platform === 'twitch'
          ? await OAuthService.getTwitchUserInfo(tokenResponse.access_token)
          : await OAuthService.getKickUserInfo(tokenResponse.access_token);

        // Store in localStorage
        localStorage.setItem(`${platform}Token`, tokenResponse.access_token);
        localStorage.setItem(`${platform}UserInfo`, JSON.stringify(userInfo));

        if (tokenResponse.refresh_token) {
          localStorage.setItem(`${platform}RefreshToken`, tokenResponse.refresh_token);
        }

        setStatus('success');
        setMessage('Autenticação bem-sucedida!');

        // Redirect back to main app
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);

        onSuccess(userInfo, tokenResponse.access_token);

      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Erro na autenticação');
        onError(message);
      }
    };

    handleCallback();
  }, [platform, onSuccess, onError, message]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '40px',
        borderRadius: '20px',
        textAlign: 'center',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{ margin: '0 0 20px 0', fontSize: '2rem' }}>
          {platform === 'twitch' ? '🎮' : '⚡'} {platform === 'twitch' ? 'Twitch' : 'Kick'}
        </h1>

        {status === 'loading' && (
          <div>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(255,255,255,0.3)',
              borderTop: '4px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <p style={{ margin: '0', fontSize: '1.1rem' }}>{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div style={{ fontSize: '3rem', margin: '0 0 20px 0' }}>✅</div>
            <p style={{ margin: '0', fontSize: '1.1rem' }}>{message}</p>
            <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
              Redirecionando...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{ fontSize: '3rem', margin: '0 0 20px 0' }}>❌</div>
            <p style={{ margin: '0', fontSize: '1.1rem' }}>{message}</p>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              Voltar ao Login
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
