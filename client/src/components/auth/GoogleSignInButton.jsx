import { useEffect, useRef, useState } from 'react';

/**
 * Official Google Sign-In Button using Google Identity Services (GSI).
 * Automatically initializes and renders Google's official branded button,
 * while providing accessible loading and configuration fallbacks.
 */
const GoogleSignInButton = ({
  onSuccess,
  onError,
  isLoading = false,
  disabled = false,
  text = 'continue_with'
}) => {
  const buttonContainerRef = useRef(null);
  const [gsiLoaded, setGsiLoaded] = useState(() => {
    return typeof window !== 'undefined' && !!window.google?.accounts?.id;
  });
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Poll for window.google.accounts.id availability (since script loads async)
  useEffect(() => {
    if (gsiLoaded) return;

    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        setGsiLoaded(true);
        clearInterval(interval);
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [gsiLoaded]);

  // Initialize and render Google Identity Services button
  useEffect(() => {
    if (!gsiLoaded || !clientId || !buttonContainerRef.current || !window.google?.accounts?.id) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response?.credential) {
            onSuccess(response.credential);
          } else {
            onError?.('Google authentication did not return a valid credential.');
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Render official Google button
      buttonContainerRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(buttonContainerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: text, // 'continue_with' | 'signin_with' | 'signup_with'
        shape: 'rectangular',
        logo_alignment: 'left',
        width: buttonContainerRef.current.offsetWidth || 380
      });
    } catch (err) {
      console.error('[Google Sign-In Render Error]:', err);
    }
  }, [gsiLoaded, clientId, onSuccess, onError, text]);

  const handleFallbackClick = () => {
    if (!clientId) {
      onError?.(
        'Google Sign-In is not configured yet. Please configure VITE_GOOGLE_CLIENT_ID in your environment.'
      );
      return;
    }
    // If GSI script failed to load or is blocked by an ad-blocker
    onError?.(
      'Unable to connect to Google Identity Services. Please check your browser privacy extensions or try again.'
    );
  };

  return (
    <div className="cf-google-auth-wrapper">
      {isLoading ? (
        <button
          type="button"
          className="cf-google-btn-loading"
          disabled
          aria-live="polite"
        >
          <span className="cf-auth-spinner" aria-hidden="true" />
          <span>Signing in with Google...</span>
        </button>
      ) : clientId && gsiLoaded ? (
        <div
          ref={buttonContainerRef}
          className={`cf-google-gsi-container${disabled ? ' is-disabled' : ''}`}
          aria-label="Continue with Google"
        />
      ) : (
        <button
          type="button"
          className="cf-google-native-btn"
          onClick={handleFallbackClick}
          disabled={disabled || isLoading}
          aria-label="Continue with Google"
        >
          <svg className="cf-google-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
      )}
    </div>
  );
};

export default GoogleSignInButton;
