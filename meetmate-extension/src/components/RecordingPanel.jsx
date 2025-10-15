import { useState, useEffect, useRef } from 'react';
import useStore from '../hooks/useStore';
import { recordingService } from '../services/api';

function RecordingPanel() {
  const {
    meetingName,
    meetingId,
    isRecording,
    setCurrentView,
    setProcessingStatus,
    setCurrentMeetingSummary,
    resetRecording,
    user,
  } = useStore();

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const isStopping = useRef(false);

  // Sync with background script state
  useEffect(() => {
    chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting state:', chrome.runtime.lastError);
        return;
      }

      if (response && response.isRecording && response.startTime) {
        startTimeRef.current = response.startTime;
        const elapsed = Math.floor((Date.now() - response.startTime) / 1000);
        setElapsedTime(elapsed);
      }
    });
  }, []);

  // Timer effect
  useEffect(() => {
    if (isRecording && !isProcessing) {
      // Start or continue timer
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          if (startTimeRef.current) {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            setElapsedTime(elapsed);
          }
        }, 1000);
      }
    } else {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording, isProcessing]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStopRecording = async () => {
    if (isStopping.current || !isRecording) {
      console.log('Already stopping or not recording');
      return;
    }

    isStopping.current = true;
    setIsProcessing(true);
    setProcessingStep('Stopping recording...');

    try {
      // Stop the recording in background
      const stopResponse = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'stopRecording' },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          }
        );
      });

      console.log('Stop recording response:', stopResponse);

      if (!stopResponse.success) {
        throw new Error(stopResponse.error || 'Failed to stop recording');
      }

      // Wait a moment for the audio to be fully processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the recorded audio
      setProcessingStep('Retrieving audio...');
      const audioResponse = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'getRecordedAudio' },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          }
        );
      });

      console.log('Audio data retrieved:', audioResponse.audioData ? 'yes' : 'no');

      if (!audioResponse.audioData) {
        throw new Error('No audio data available');
      }

      // Process the recording
      setProcessingStep('Transcribing audio...');
      setProcessingStatus('transcribing', 'Processing audio');

      const result = await recordingService.completeRecording(
        meetingId,
        audioResponse.audioData,
        user.id
      );

      console.log('Processing complete:', result);

      if (!result.success) {
        throw new Error(result.error || 'Processing failed');
      }

      // Clear the audio data from background
      chrome.runtime.sendMessage({ action: 'clearRecordedAudio' });

      // Save summary and navigate
      setCurrentMeetingSummary({
        meetingId: result.meetingId,
        meetingName: meetingName,
        transcript: result.transcript,
        summaryJSON: result.summaryJSON,
        summaryMarkdown: result.summaryMarkdown,
        timing: result.timing,
      });

      setProcessingStatus('complete', 'Processing complete');
      setCurrentView('summary');
      resetRecording();
    } catch (error) {
      console.error('Error stopping recording:', error);
      setProcessingStatus('error', error.message);
      alert(`Error: ${error.message}`);
      setIsProcessing(false);
      isStopping.current = false;
    }
  };

  const handleCancel = async () => {
    if (confirm('Are you sure you want to cancel this recording? All data will be lost.')) {
      try {
        // Call cancel API
        await recordingService.cancelRecording(meetingId);

        // Stop recording in background
        await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { action: 'stopRecording' },
            () => resolve()
          );
        });

        // Clear audio data
        chrome.runtime.sendMessage({ action: 'clearRecordedAudio' });

        // Reset state and go back to dashboard
        resetRecording();
        setCurrentView('dashboard');
      } catch (error) {
        console.error('Error canceling recording:', error);
        alert('Failed to cancel recording. Please try again.');
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          {isProcessing ? 'Processing Recording' : 'Recording in Progress'}
        </h2>
        <p className="text-gray-600">
          {isProcessing ? processingStep : meetingName || 'Untitled Meeting'}
        </p>
      </div>

      {!isProcessing && (
        <>
          {/* Recording Animation */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
              <div className="absolute inset-0 w-32 h-32 bg-red-500 rounded-full animate-ping opacity-25"></div>
            </div>
          </div>

          {/* Timer */}
          <div className="text-center mb-8">
            <div className="text-6xl font-mono font-bold text-gray-800 mb-2">
              {formatTime(elapsedTime)}
            </div>
            <p className="text-gray-600">Recording Time</p>
          </div>

          {/* Recording Info */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-800 mb-3">Recording Status</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Audio capture active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Tab audio being recorded</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleStopRecording}
              disabled={isStopping.current}
              className="flex-1 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-bold text-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStopping.current ? 'Stopping...' : 'Stop & Process Recording'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isStopping.current}
              className="px-6 py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {isProcessing && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
          <p className="text-lg font-semibold text-gray-700 mb-2">{processingStep}</p>
          <p className="text-sm text-gray-500">This may take a moment...</p>
        </div>
      )}
    </div>
  );
}

export default RecordingPanel;