import { useEffect, useState } from 'react';
import useStore from '../hooks/useStore';
import { meetingService } from '../services/api';
import { FiArrowLeft, FiLoader, FiEye, FiDownload, FiClock } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';

function PreviousSummaries() {
  const { user, setCurrentView, meetings, setMeetings, loadingMeetings, setLoadingMeetings } =
    useStore();
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [displayedMeetings, setDisplayedMeetings] = useState([]);
  const [viewMode, setViewMode] = useState('structured'); // 'structured' or 'markdown'

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoadingMeetings(true);
      const data = await meetingService.getAllMeetings(user.id);
      setMeetings(data.meetings);
      setDisplayedMeetings(data.meetings);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    } finally {
      setLoadingMeetings(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: '✓ Completed' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', label: '⏳ Processing' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: '✗ Failed' },
      recording: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '🔴 Recording' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: '⊘ Cancelled' },
    };

    const config = statusConfig[status] || statusConfig.completed;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const downloadSummary = (meeting) => {
    if (!meeting.summary) {
      alert('No summary available for this meeting');
      return;
    }

    const summary = typeof meeting.summary === 'string' ? JSON.parse(meeting.summary) : meeting.summary;
    const summaryJSON = summary.json || summary;
    const summaryMarkdown = summary.markdown || '';

    const summaryText = `
MEETING SUMMARY: ${summaryJSON?.title || meeting.meeting_name}
Date: ${new Date(meeting.created_at).toLocaleString()}
Status: ${meeting.status}
${meeting.processingTimeSeconds ? `Processing Time: ${meeting.processingTimeSeconds}s` : ''}

═══════════════════════════════════════════════════════════════

${summaryMarkdown || 'No summary available'}

═══════════════════════════════════════════════════════════════

FULL TRANSCRIPT:
${meeting.transcript || 'No transcript available'}
    `;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(summaryText));
    element.setAttribute('download', `summary-${meeting.meeting_name}-${Date.now()}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadMarkdown = (meeting) => {
    if (!meeting.summary) {
      alert('No summary available for this meeting');
      return;
    }

    const summary = typeof meeting.summary === 'string' ? JSON.parse(meeting.summary) : meeting.summary;
    const summaryJSON = summary.json || summary;
    const summaryMarkdown = summary.markdown || '';

    const markdownContent = `# ${summaryJSON?.title || meeting.meeting_name}

**Date:** ${new Date(meeting.created_at).toLocaleString()}  
**Status:** ${meeting.status}  
${meeting.processingTimeSeconds ? `**Processing Time:** ${meeting.processingTimeSeconds}s` : ''}

---

${summaryMarkdown || 'No summary available'}

---

## Full Transcript

${meeting.transcript || 'No transcript available'}
`;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdownContent));
    element.setAttribute('download', `summary-${meeting.meeting_name}-${Date.now()}.md`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const renderArraySection = (title, items, icon) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span>{icon}</span> {title}
        </h3>
        <ul className="space-y-2 ml-8">
          {items.map((item, index) => (
            <li key={index} className="text-gray-700 text-sm flex items-start gap-2">
              <span className="text-blue-600 flex-shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderTopics = (topics) => {
    if (!topics || topics.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span>📌</span> Discussion Topics
        </h3>
        <div className="space-y-3">
          {topics.map((topic, index) => (
            <div key={index} className="bg-blue-50 rounded-lg p-4 ml-4">
              <h4 className="font-semibold text-gray-800 mb-2">{topic.title}</h4>
              <p className="text-gray-700 text-sm mb-2">{topic.summary}</p>
              {topic.action_items && topic.action_items.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-blue-800 mb-1">Action Items:</p>
                  <ul className="space-y-1">
                    {topic.action_items.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex items-start gap-2 ml-4">
                        <span className="text-blue-600">→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loadingMeetings) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <FiLoader className="text-4xl text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 font-semibold">Loading your meetings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Meeting History</h1>
          <p className="text-blue-100 text-sm mt-1">
            {displayedMeetings.length} meeting{displayedMeetings.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
        >
          <FiArrowLeft /> Back
        </button>
      </div>

      {displayedMeetings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">🔭</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No meetings yet</h2>
          <p className="text-gray-600 mb-6">
            Start recording your first meeting to see summaries here
          </p>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-200"
          >
            Create New Summary
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                        {meeting.meeting_name}
                      </h3>
                      {getStatusBadge(meeting.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{formatDate(meeting.created_at)}</span>
                      {meeting.processingTimeSeconds && (
                        <span className="flex items-center gap-1 text-blue-600">
                          <FiClock className="text-xs" />
                          {meeting.processingTimeSeconds}s
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {meeting.status === 'completed' && (
                      <>
                        <button
                          onClick={() => setSelectedMeeting(meeting)}
                          className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
                        >
                          <FiEye /> View
                        </button>
                        <button
                          onClick={() => downloadMarkdown(meeting)}
                          className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
                        >
                          <FiDownload /> MD
                        </button>
                        <button
                          onClick={() => downloadSummary(meeting)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 text-sm"
                        >
                          <FiDownload /> TXT
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Detail Modal */}
      {selectedMeeting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 flex items-center justify-between flex-shrink-0">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">{selectedMeeting.meeting_name}</h2>
                <div className="flex items-center gap-4 text-sm text-blue-100 mt-1">
                  <span>{formatDate(selectedMeeting.created_at)}</span>
                  {selectedMeeting.processingTimeSeconds && (
                    <span className="flex items-center gap-1">
                      <FiClock />
                      {selectedMeeting.processingTimeSeconds}s
                    </span>
                  )}
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-white bg-opacity-20 rounded-lg p-1 mr-4">
                <button
                  onClick={() => setViewMode('structured')}
                  className={`px-3 py-1 rounded-md text-sm font-semibold transition-all ${
                    viewMode === 'structured'
                      ? 'bg-white text-blue-600'
                      : 'text-white hover:bg-white hover:bg-opacity-10'
                  }`}
                >
                  Structured
                </button>
                <button
                  onClick={() => setViewMode('markdown')}
                  className={`px-3 py-1 rounded-md text-sm font-semibold transition-all ${
                    viewMode === 'markdown'
                      ? 'bg-white text-blue-600'
                      : 'text-white hover:bg-white hover:bg-opacity-10'
                  }`}
                >
                  Markdown
                </button>
              </div>

              <button
                onClick={() => setSelectedMeeting(null)}
                className="text-white text-2xl hover:opacity-80 transition-opacity"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {selectedMeeting.summary ? (
                (() => {
                  const summary =
                    typeof selectedMeeting.summary === 'string'
                      ? JSON.parse(selectedMeeting.summary)
                      : selectedMeeting.summary;
                  
                  const summaryJSON = summary.json || summary;
                  const summaryMarkdown = summary.markdown || '';

                  if (viewMode === 'markdown') {
                    return (
                      <div className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
                        <ReactMarkdown>{summaryMarkdown || 'No markdown summary available'}</ReactMarkdown>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {/* Overall Summary */}
                      {summaryJSON?.overall_summary && (
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-5">
                          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <span>📝</span> Overview
                          </h3>
                          <p className="text-gray-700 text-sm leading-relaxed">
                            {summaryJSON.overall_summary}
                          </p>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-2">
                        {summaryJSON?.tone && (
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                            Tone: {summaryJSON.tone}
                          </span>
                        )}
                        {summaryJSON?.participants && summaryJSON.participants.length > 0 && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                            👥 {summaryJSON.participants.join(', ')}
                          </span>
                        )}
                      </div>

                      {/* Topics */}
                      {renderTopics(summaryJSON?.topics)}

                      {/* Key Decisions */}
                      {renderArraySection('Key Decisions', summaryJSON?.key_decisions, '✅')}

                      {/* Next Steps */}
                      {renderArraySection('Next Steps', summaryJSON?.next_steps, '🚀')}

                      {/* Transcript */}
                      {selectedMeeting.transcript && (
                        <details className="bg-gray-50 rounded-lg p-4">
                          <summary className="font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors">
                            📄 Full Transcript
                          </summary>
                          <div className="mt-3 max-h-60 overflow-y-auto">
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {selectedMeeting.transcript}
                            </p>
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })()
              ) : (
                <p className="text-gray-600 text-center py-8">
                  Summary not available for this meeting
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-8 py-4 flex gap-3 border-t flex-shrink-0">
              <button
                onClick={() => setSelectedMeeting(null)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all duration-200"
              >
                Close
              </button>
              {selectedMeeting.status === 'completed' && (
                <>
                  <button
                    onClick={() => {
                      downloadMarkdown(selectedMeeting);
                    }}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <FiDownload /> Download MD
                  </button>
                  <button
                    onClick={() => {
                      downloadSummary(selectedMeeting);
                    }}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <FiDownload /> Download TXT
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PreviousSummaries;