import { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { authService } from '../services/api';
import useStore from '../hooks/useStore';

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { setUser } = useStore();

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const CLOUDFLARE_WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use Chrome Identity with the correct redirect URI
      const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'token'); // Use implicit flow for extensions
      authUrl.searchParams.set('scope', 'openid email profile');

      // Launch auth flow
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl.toString(),
        interactive: true,
      });

      // Parse the response URL
      const url = new URL(responseUrl);
      // For implicit flow, token is in the hash
      const hash = url.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');

      if (!accessToken) {
        throw new Error('No access token received');
      }

      // Get user info from Google
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const googleUser = await userResponse.json();

      // Create or get user from your backend
      const data = await authService.verifyGoogleUser(
        googleUser.id,
        googleUser.email,
        googleUser.name
      );

      if (data.success) {
        authService.saveAuthData(data.user, accessToken);
        setUser(data.user, accessToken);
      } else {
        throw new Error(data.error || 'Authentication failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err?.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = () => {
    try {
      setLoading(true);
      setError(null);
      
      const existingGuest = JSON.parse(localStorage.getItem('guestUser') || 'null');
      const guestUser = existingGuest || {
        id: `guest_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
        name: 'Guest',
        email: null,
        avatar: null,
        role: 'guest',
      };
      
      localStorage.setItem('user', JSON.stringify(guestUser));
      localStorage.removeItem('accessToken');
      localStorage.setItem('guestUser', JSON.stringify(guestUser));
      setUser(guestUser, null);
    } catch (err) {
      console.error('Guest entry error:', err);
      setError('Unable to continue as guest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF6633] to-[#FF6633] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#85361b] to-[#ff6733] px-8 py-12 text-center">
          <img
            src="/logo-white.svg"
            alt="MeetMate logo"
            className="w-32 rounded-lg"
          />
          </div>

          {/* Content */}
          <div className="px-8 py-12">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-lg">✨</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Smart Summaries</h3>
                    <p className="text-gray-600 text-sm">
                      Get instant, AI-powered summaries of your meetings
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-lg">⚡</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Real-time Processing</h3>
                    <p className="text-gray-600 text-sm">
                      Choose between real-time or post-meeting analysis
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-lg">📊</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">Organized History</h3>
                    <p className="text-gray-600 text-sm">
                      Access all past meeting summaries in one place
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FcGoogle className="text-2xl" />
                <span>{loading ? 'Signing in...' : 'Sign in with Google'}</span>
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-400">or</span>
                </div>
              </div>

              <button
                onClick={handleContinueAsGuest}
                disabled={loading}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Continuing...' : 'Continue as Guest'}
              </button>

              <p className="text-center text-xs text-gray-500 mt-6">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-white text-sm">
          <p>Secure • Professional • Easy to Use</p>
        </div>
      </div>
    </div>
  );
}

export default Login;