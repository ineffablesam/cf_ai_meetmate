import { useEffect, useState } from 'react';
import useStore from './hooks/useStore';
import { authService } from './services/api';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import RecordingPanel from './components/RecordingPanel';
import SummaryView from './components/SummaryView';
import PreviousSummaries from './components/PreviousSummaries';
import './styles/global.css';

function App() {
  const { 
    isAuthenticated, 
    currentView, 
    isRecording,
    setUser, 
    setRecording,
    setCurrentView,
    logout,
    user 
  } = useStore();

  const [loading, setLoading] = useState(true);

  // Listen for state changes from background script
  useEffect(() => {
    const handleStateChange = (message, sender, sendResponse) => {
      if (message.action === 'stateChanged') {
        console.log('State changed from background:', message.state);
        
        if (message.state.isRecording) {
          // Update store to reflect recording state
          setRecording(
            true, 
            message.state.meetingName, 
            message.state.meetingId, 
            false
          );
          // Only switch to recording view if not already there
          if (currentView !== 'recording') {
            setCurrentView('recording');
          }
        } else {
          // Recording stopped
          setRecording(false, null, null, false);
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleStateChange);

    return () => {
      chrome.runtime.onMessage.removeListener(handleStateChange);
    };
  }, [setRecording, setCurrentView, currentView]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check for existing auth
        const { user, accessToken } = authService.getAuthData();
        if (user) {
          setUser(user, accessToken || null);
        }

        // Sync with background script state
        chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
          console.log('Initial state from background:', response);
          
          if (chrome.runtime.lastError) {
            console.error('Error getting state:', chrome.runtime.lastError);
            setLoading(false);
            return;
          }

          if (response && response.isRecording) {
            // If recording is active in background, update our state
            setRecording(
              true, 
              response.meetingName, 
              response.meetingId, 
              false
            );
            setCurrentView('recording');
          }
          
          setLoading(false);
        });
      } catch (error) {
        console.error('Initialization error:', error);
        setLoading(false);
      }
    };

    initializeApp();
  }, [setUser, setRecording, setCurrentView]);

  useEffect(() => {
    // Handle OAuth callback
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code && !isAuthenticated) {
      handleGoogleAuth(code);
    }
  }, [isAuthenticated]);

  const handleGoogleAuth = async (code) => {
    try {
      setLoading(true);
      const { user, accessToken } = await authService.exchangeGoogleToken(code);
      authService.saveAuthData(user, accessToken);
      setUser(user, accessToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('Authentication failed:', error);
      alert('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-purple-700">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">🔹</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Meet Summarizer</h1>
          </div>
          <div className="flex items-center gap-4">
            {isRecording && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-700 text-sm font-semibold">Recording Active</span>
              </div>
            )}
            <span className="text-gray-600 text-sm">
              Welcome, <span className="font-semibold text-gray-800">{user?.name}</span>
            </span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'recording' && <RecordingPanel />}
        {currentView === 'summary' && <SummaryView />}
        {currentView === 'history' && <PreviousSummaries />}
      </main>
    </div>
  );
}

export default App;