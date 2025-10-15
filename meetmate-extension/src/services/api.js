import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL || 'http://localhost:8787';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// AUTH SERVICES
// ============================================================================

export const authService = {
  // For authorization code flow (if needed)
  exchangeGoogleToken: async (code) => {
    try {
      const response = await api.post('/api/auth/google', { code });
      return response.data;
    } catch (error) {
      console.error('Google token exchange failed:', error);
      throw error;
    }
  },

  // For Chrome Identity implicit flow (NEW - Required!)
  verifyGoogleUser: async (googleId, email, name) => {
    try {
      const response = await api.post('/api/auth/google/verify', {
        googleId,
        email,
        name,
      });
      return response.data;
    } catch (error) {
      console.error('Google user verification failed:', error);
      throw error;
    }
  },

  saveAuthData: (userData, accessToken) => {
    try {
      localStorage.setItem('user', JSON.stringify(userData));
      if (accessToken) {
        localStorage.setItem('accessToken', accessToken);
      }
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  },

  getAuthData: () => {
    try {
      const user = localStorage.getItem('user');
      const accessToken = localStorage.getItem('accessToken');
      return {
        user: user ? JSON.parse(user) : null,
        accessToken,
      };
    } catch (error) {
      console.error('Error reading auth data:', error);
      return { user: null, accessToken: null };
    }
  },

  clearAuthData: () => {
    try {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('guestUser');
      localStorage.removeItem('meetingConfig');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  },

  // Deprecated - use clearAuthData instead
  logout: () => {
    authService.clearAuthData();
  },
};

// ============================================================================
// RECORDING SERVICES
// ============================================================================

export const recordingService = {
  startRecording: async (meetingName, userId, realtimeProcessing) => {
    try {
      const response = await api.post('/api/recordings/start', {
        meetingName,
        userId,
        realtimeProcessing,
      });
      return response.data;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  },

  uploadChunk: async (meetingId, audioChunk) => {
    try {
      const response = await api.post(
        `/api/recordings/${meetingId}/upload-chunk`,
        audioChunk,
        {
          headers: { 'Content-Type': 'audio/webm' },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to upload chunk:', error);
      throw error;
    }
  },

  completeRecording: async (meetingId, audioBlob, userId) => {
    try {
      const response = await api.post(
        `/api/recordings/${meetingId}/complete`,
        {
          audioBlob,
          userId,
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to complete recording:', error);
      throw error;
    }
  },

  cancelRecording: async (meetingId) => {
    try {
      const response = await api.post(
        `/api/recordings/${meetingId}/cancel`
      );
      return response.data;
    } catch (error) {
      console.error('Failed to cancel recording:', error);
      throw error;
    }
  },
};

// ============================================================================
// MEETINGS SERVICES
// ============================================================================

export const meetingService = {
  getAllMeetings: async (userId) => {
    try {
      const response = await api.get('/api/meetings', {
        params: { userId },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      throw error;
    }
  },

  getMeeting: async (meetingId) => {
    try {
      const response = await api.get(`/api/meetings/${meetingId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch meeting:', error);
      throw error;
    }
  },
};

export default api;