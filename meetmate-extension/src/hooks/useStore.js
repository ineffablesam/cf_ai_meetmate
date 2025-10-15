import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
  persist(
    (set, get) => ({
  // Auth state
  user: null,
  isAuthenticated: false,
  accessToken: null,

  // Recording state
  isRecording: false,
  meetingId: null,
  meetingName: null,
  recordingStartTime: null,
  recordingDuration: null,
  realtimeProcessing: false,

  // Processing state
  processingStatus: null, // 'idle', 'transcribing', 'summarizing', 'complete', 'error'
  currentStep: null,
  errorMessage: null,
  processedChunks: 0,

  // Meetings state
  meetings: [],
  currentMeetingSummary: null,
  loadingMeetings: false,

  // UI state
  currentView: 'dashboard', // 'login', 'dashboard', 'recording', 'summary', 'history'

  // Actions
  setUser: (user, accessToken) => set({ 
    user, 
    isAuthenticated: !!user,
    accessToken 
  }),

  logout: () => {
    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('guestUser');
    localStorage.removeItem('meetingConfig');
    
    // Clear Zustand state
    set({ 
      user: null, 
      isAuthenticated: false,
      accessToken: null,
      meetings: [],
      currentMeetingSummary: null,
      currentView: 'dashboard',
      isRecording: false,
      meetingId: null,
      meetingName: null,
      recordingStartTime: null,
      recordingDuration: null,
      realtimeProcessing: false,
      processingStatus: null,
      currentStep: null,
      errorMessage: null,
      processedChunks: 0,
    });
  },

  setRecording: (isRecording, meetingName, meetingId, realtimeProcessing) => set({ 
    isRecording, 
    meetingName,
    meetingId,
    realtimeProcessing,
    recordingStartTime: isRecording ? Date.now() : null,
    processingStatus: isRecording ? 'recording' : 'idle',
    errorMessage: null
  }),

  updateRecordingDuration: () => {
    const state = get();
    if (state.recordingStartTime) {
      const duration = Math.floor((Date.now() - state.recordingStartTime) / 1000);
      set({ recordingDuration: duration });
    }
  },

  setProcessingStatus: (status, step, error = null) => set({ 
    processingStatus: status,
    currentStep: step,
    errorMessage: error
  }),

  incrementProcessedChunks: () => {
    const current = get().processedChunks;
    set({ processedChunks: current + 1 });
  },

  setMeetings: (meetings) => set({ 
    meetings,
    loadingMeetings: false 
  }),

  setLoadingMeetings: (loading) => set({ loadingMeetings: loading }),

  setCurrentMeetingSummary: (summary) => set({ 
    currentMeetingSummary: summary 
  }),

  setCurrentView: (view) => set({ currentView: view }),

  resetRecording: () => set({
    isRecording: false,
    meetingId: null,
    meetingName: null,
    recordingStartTime: null,
    recordingDuration: null,
    realtimeProcessing: false,
    processingStatus: 'idle',
    currentStep: null,
    errorMessage: null,
    processedChunks: 0
  }),

  clearError: () => set({ errorMessage: null }),
}),
    {
      name: 'meetmate-storage',
      storage: {
        getItem: async (name) => {
          const result = await chrome.storage.local.get([name]);
          return result[name] || null;
        },
        setItem: async (name, value) => {
          await chrome.storage.local.set({ [name]: value });
        },
        removeItem: async (name) => {
          await chrome.storage.local.remove([name]);
        },
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        meetings: state.meetings,
        currentMeetingSummary: state.currentMeetingSummary,
      }),
    }
  )
);

export default useStore;