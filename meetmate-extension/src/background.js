let recordingState = {
  isRecording: false,
  startTime: null,
  tabId: null,
  meetingId: null,
  meetingName: null,
};

let currentAudioData = null;
let badgeTimer = null;

// Initialize state from storage on startup
async function initializeState() {
  try {
    const result = await chrome.storage.local.get(['recordingState']);
    if (result.recordingState) {
      recordingState = { ...recordingState, ...result.recordingState };
      if (recordingState.isRecording) {
        startBadgeTimer();
      }
    }
  } catch (error) {
    console.error('Failed to initialize state:', error);
  }
}

// Save state to storage and notify all listeners
async function saveState() {
  try {
    await chrome.storage.local.set({ recordingState });
    // Notify all extension contexts about state change
    chrome.runtime.sendMessage({ 
      action: 'stateChanged', 
      state: recordingState 
    }).catch(() => {
      // Ignore errors if no listeners
    });
  } catch (error) {
    console.error('Failed to save state:', error);
  }
}

// Update badge with timer
function updateBadge(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  let badgeText;
  if (hours > 0) {
    badgeText = `${hours}:${minutes.toString().padStart(2, '0')}`;
  } else {
    badgeText = `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
  
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: '#ff4444' });
}

// Start badge timer
function startBadgeTimer() {
  if (badgeTimer) clearInterval(badgeTimer);
  
  badgeTimer = setInterval(() => {
    if (recordingState.isRecording && recordingState.startTime) {
      const elapsed = Math.floor((Date.now() - recordingState.startTime) / 1000);
      updateBadge(elapsed);
    }
  }, 1000);
}

// Stop badge timer
function stopBadgeTimer() {
  if (badgeTimer) {
    clearInterval(badgeTimer);
    badgeTimer = null;
  }
  chrome.action.setBadgeText({ text: '' });
}

// Setup offscreen document
async function setupOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });

  if (existingContexts.length > 0) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: 'src/offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Recording audio from tab',
  });
}

// Initialize on startup
initializeState();

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startRecording') {
    startRecording(request.tabId, request.meetingName, request.meetingId, sendResponse);
    return true;
  } else if (request.action === 'stopRecording') {
    stopRecording(sendResponse);
    return true;
  } else if (request.action === 'getState') {
    sendResponse(recordingState);
    return true;
  } else if (request.action === 'getRecordedAudio') {
    sendResponse({ audioData: currentAudioData });
    return true;
  } else if (request.action === 'clearRecordedAudio') {
    currentAudioData = null;
    sendResponse({ success: true });
    return true;
  } else if (request.action === 'exchangeAuthCode') {
    exchangeAuthCode(request.code, sendResponse);
    return true;
  } else if (request.action === 'recordingComplete') {
    handleRecordingComplete(request, sendResponse);
    return true;
  } else if (request.action === 'audioChunkReady') {
    // Store the complete audio blob
    currentAudioData = request.chunk;
    console.log('Audio chunk received, size:', request.chunk?.length || 0);
    sendResponse({ success: true });
    return true;
  }
});

async function startRecording(tabId, meetingName, meetingId, sendResponse) {
  try {
    if (recordingState.isRecording) {
      console.log('Recording already in progress');
      sendResponse({ success: false, error: 'Recording already in progress' });
      return;
    }

    console.log('Starting recording...', { tabId, meetingName, meetingId });
    await setupOffscreenDocument();

    let streamId;
    try {
      streamId = await chrome.tabCapture.getMediaStreamId({
        targetTabId: tabId,
      });
    } catch (e) {
      // Attempt recovery if an active capture is lingering
      if (String(e?.message || e).toLowerCase().includes('active stream')) {
        try {
          chrome.runtime.sendMessage({ action: 'stopOffscreenRecording' });
        } catch (_) {}
        await new Promise((r) => setTimeout(r, 500));
        streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
      } else {
        throw e;
      }
    }

    // Send start message to offscreen
    chrome.runtime.sendMessage({
      action: 'startOffscreenRecording',
      streamId: streamId,
    });

    // Update state
    recordingState.isRecording = true;
    recordingState.startTime = Date.now();
    recordingState.tabId = tabId;
    recordingState.meetingId = meetingId;
    recordingState.meetingName = meetingName;

    // Save state and start badge timer
    await saveState();
    startBadgeTimer();

    console.log('Recording started successfully');
    sendResponse({ success: true, state: recordingState });
  } catch (error) {
    console.error('Error starting recording:', error);
    recordingState.isRecording = false;
    recordingState.startTime = null;
    recordingState.tabId = null;
    recordingState.meetingId = null;
    recordingState.meetingName = null;
    await saveState();
    sendResponse({ success: false, error: error.message });
  }
}

async function stopRecording(sendResponse) {
  try {
    console.log('Stopping recording...', { currentState: recordingState });

    if (!recordingState.isRecording) {
      console.log('No active recording to stop');
      sendResponse({ success: false, error: 'No active recording' });
      return;
    }

    // Send stop message to offscreen
    chrome.runtime.sendMessage({
      action: 'stopOffscreenRecording',
    });

    // Store meeting info before clearing state
    const meetingInfo = {
      meetingId: recordingState.meetingId,
      meetingName: recordingState.meetingName,
    };

    // Update state
    recordingState.isRecording = false;
    recordingState.startTime = null;
    recordingState.tabId = null;
    recordingState.meetingId = null;
    recordingState.meetingName = null;

    // Save state and stop badge timer
    await saveState();
    stopBadgeTimer();

    console.log('Recording stopped successfully');
    sendResponse({ 
      success: true, 
      state: recordingState,
      meetingInfo: meetingInfo 
    });
  } catch (error) {
    console.error('Error stopping recording:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleRecordingComplete(request, sendResponse) {
  try {
    const CLOUDFLARE_WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;
    
    // Send email notification to backend
    const response = await fetch(`${CLOUDFLARE_WORKER_URL}/api/notifications/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: request.userEmail,
        meetingName: request.meetingName,
        summary: request.summary,
        timestamp: new Date().toISOString()
      }),
    });

    const data = await response.json();
    console.log('Email notification sent:', data);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Email notification error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function exchangeAuthCode(code, sendResponse) {
  try {
    const CLOUDFLARE_WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL;

    const response = await fetch(`${CLOUDFLARE_WORKER_URL}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();

    if (data.success) {
      chrome.storage.local.set({
        user: data.user,
        accessToken: data.accessToken,
      });
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: data.error });
    }
  } catch (error) {
    console.error('Auth error:', error);
    sendResponse({ success: false, error: error.message });
  }
}