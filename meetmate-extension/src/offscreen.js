// ============================================================================
// offscreen.js
// ============================================================================

let mediaRecorder = null;
let recordedChunks = [];
let audioContext = null;
let destination = null;
let tabStream = null;
let micStream = null;
let audioElement = null;

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'startOffscreenRecording') {
    startRecording(request.streamId);
  } else if (request.action === 'stopOffscreenRecording') {
    stopRecording();
  }
});

async function startRecording(streamId) {
  try {
    // Get tab audio stream
    tabStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
    });

    console.log('Tab audio captured successfully');

    // Play audio back so user can hear it
    audioElement = new Audio();
    audioElement.srcObject = tabStream;
    audioElement.play().catch((e) => {
      console.warn('Could not play audio:', e);
    });

    // Try to get microphone
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      console.log('Microphone captured - recording both tab + mic');
    } catch (e) {
      console.warn('Microphone not available:', e.message);
      micStream = null;
    }

    // Create audio context to mix streams
    audioContext = new AudioContext();
    destination = audioContext.createMediaStreamDestination();

    // Add tab audio
    const tabSource = audioContext.createMediaStreamSource(tabStream);
    const tabGain = audioContext.createGain();
    tabGain.gain.value = 1.5;
    tabSource.connect(tabGain);
    tabGain.connect(destination);

    // Add microphone audio if available
    if (micStream) {
      const micSource = audioContext.createMediaStreamSource(micStream);
      const micGain = audioContext.createGain();
      micGain.gain.value = 1.5;
      micSource.connect(micGain);
      micGain.connect(destination);
    }

    recordedChunks = [];

    // Create MediaRecorder
    mediaRecorder = new MediaRecorder(destination.stream, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000,
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      // Create blob and convert to data URL
      const blob = new Blob(recordedChunks, { type: 'audio/webm' });
      const reader = new FileReader();

      reader.onloadend = () => {
        // Send audio data to background script
        chrome.runtime.sendMessage({
          action: 'audioChunkReady',
          chunk: reader.result,
        });
      };

      reader.readAsDataURL(blob);

      // Clean up
      cleanup();
    };

    mediaRecorder.start();
    const mode = micStream ? 'tab audio + microphone' : 'tab audio only';
    console.log(`Recording started - capturing ${mode}`);
  } catch (error) {
    console.error('Error in offscreen recording:', error);
    cleanup();
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    console.log('Recording stopped');
  }
}

function cleanup() {
  if (audioElement) {
    audioElement.pause();
    audioElement.srcObject = null;
    audioElement = null;
  }

  if (tabStream) {
    tabStream.getTracks().forEach((track) => track.stop());
    tabStream = null;
  }

  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
    micStream = null;
  }

  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}