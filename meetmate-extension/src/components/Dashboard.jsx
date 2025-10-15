import { useState, useEffect } from 'react';
import useStore from '../hooks/useStore';
import { recordingService, meetingService } from '../services/api';

function Dashboard() {
  const { 
    user, 
    setRecording, 
    setCurrentView, 
    setMeetings, 
    meetings,
    isRecording 
  } = useStore();

  const [meetingName, setMeetingName] = useState('');
  const [realtimeProcessing, setRealtimeProcessing] = useState(false);
  const [isOnMeetPage, setIsOnMeetPage] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(true);

  useEffect(() => {
    // TODO: Check if on Google Meet
    // chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    //   if (tabs[0]) {
    //     const url = tabs[0].url || '';
    //     setIsOnMeetPage(url.includes('meet.google.com'));
    //   }
    // });

    // Load meetings
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      setLoadingMeetings(true);
      const result = await meetingService.getAllMeetings(user.id);
      if (result.success) {
        setMeetings(result.meetings);
      }
    } catch (error) {
      console.error('Failed to load meetings:', error);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const handleStartRecording = async () => {
    if (!meetingName.trim()) {
      alert('Please enter a meeting name');
      return;
    }

    if (isStarting || isRecording) {
      console.log('Already starting or recording');
      return;
    }

    setIsStarting(true);

    try {
      // Get current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (!currentTab) {
        throw new Error('No active tab found');
      }

      // Start recording on backend
      const result = await recordingService.startRecording(
        meetingName,
        user.id,
        realtimeProcessing
      );

      if (!result.success) {
        throw new Error('Failed to start recording on backend');
      }

      const meetingId = result.meetingId;

      // Start recording in background script
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            action: 'startRecording',
            tabId: currentTab.id,
            meetingName: meetingName,
            meetingId: meetingId,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          }
        );
      });

      console.log('Background recording started:', response);

      if (!response.success) {
        throw new Error(response.error || 'Failed to start recording');
      }

      // Update store
      setRecording(true, meetingName, meetingId, realtimeProcessing);
      
      // Switch to recording view
      setCurrentView('recording');
      
      // Reset form
      setMeetingName('');
    } catch (error) {
      console.error('Error starting recording:', error);
      alert(`Failed to start recording: ${error.message}`);
    } finally {
      setIsStarting(false);
    }
  };

  const viewMeetingSummary = (meeting) => {
    useStore.getState().setCurrentMeetingSummary({
      meetingId: meeting.id,
      meetingName: meeting.meeting_name,
      transcript: meeting.transcript,
      summaryJSON: meeting.summary?.json,
      summaryMarkdown: meeting.summary?.markdown,
      createdAt: meeting.created_at,
    });
    setCurrentView('summary');
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions Card */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Start New Recording</h2>
        
        {!isOnMeetPage && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Please navigate to a Google Meet tab to start recording
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Name
            </label>
            <input
              type="text"
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              placeholder="e.g., Team Standup, Client Call"
              disabled={isStarting || isRecording}
              className="bg-[#f8f8f8] text-black w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div className="flex items-center">
              <input
                type="checkbox"
                id="realtime"
                checked={realtimeProcessing}
                onChange={(e) => setRealtimeProcessing(e.target.checked)}
                disabled={isStarting || isRecording}
                className="w-4 h-4 appearance-none rounded border border-[#FF6633] bg-white checked:bg-[#FF6633] checked:border-[#FF6633] focus:ring-2 focus:ring-offset-1 focus:ring-[#FF6633] disabled:cursor-not-allowed transition-colors relative
                  before:content-[''] before:absolute before:inset-0 before:flex before:items-center before:justify-center before:text-white before:font-bold before:opacity-0 checked:before:opacity-100 checked:before:content-['✓']"
              />
              <label htmlFor="realtime" className="ml-2 text-sm text-gray-700">
                Enable real-time processing (experimental)
              </label>
            </div>



          <button
            onClick={handleStartRecording}
            disabled={!isOnMeetPage || !meetingName.trim() || isStarting || isRecording}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
          >
            {isStarting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Starting...
              </span>
            ) : isRecording ? (
              'Recording in Progress'
            ) : (
              'Start Recording'
            )}
          </button>
        </div>
      </div>

      {/* Recent Meetings */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Recent Meetings</h2>
          <button
            onClick={() => setCurrentView('history')}
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
          >
            View All →
          </button>
        </div>

        {loadingMeetings ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : meetings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="font-semibold">No meetings yet</p>
            <p className="text-sm">Start recording to see your meetings here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meetings.slice(0, 5).map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => meeting.status === 'completed' && viewMeetingSummary(meeting)}
                className={`p-4 border rounded-lg transition-all duration-200 ${
                  meeting.status === 'completed'
                    ? 'hover:border-blue-500 hover:shadow-md cursor-pointer'
                    : 'opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">
                      {meeting.meeting_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(meeting.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {meeting.status === 'completed' && meeting.processingTimeSeconds && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {meeting.processingTimeSeconds}s
                      </span>
                    )}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        meeting.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : meeting.status === 'processing'
                          ? 'bg-blue-100 text-blue-700'
                          : meeting.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-3xl font-bold text-blue-600">{meetings.length}</div>
          <div className="text-sm text-gray-600">Total Meetings</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-3xl font-bold text-green-600">
            {meetings.filter(m => m.status === 'completed').length}
          </div>
          <div className="text-sm text-gray-600">Completed</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-3xl font-bold text-purple-600">
            {meetings.filter(m => m.status === 'processing').length}
          </div>
          <div className="text-sm text-gray-600">Processing</div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;