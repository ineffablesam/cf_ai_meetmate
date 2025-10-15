import { useEffect, useState } from 'react';
import useStore from '../hooks/useStore';
import { FiDownload, FiArrowLeft, FiCheckCircle, FiClock } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';

function SummaryView() {
  const { currentMeetingSummary, setCurrentView, meetingName } = useStore();
  const [viewMode, setViewMode] = useState('structured'); // 'structured' or 'markdown'

  if (!currentMeetingSummary) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <p className="text-gray-600 mb-6">No summary available</p>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { summaryJSON, summaryMarkdown, transcript, timing } = currentMeetingSummary;

  const downloadSummary = () => {
    const summaryText = `
MEETING SUMMARY: ${summaryJSON?.title || meetingName || 'Untitled Meeting'}
Generated: ${new Date().toLocaleString()}
${timing ? `Processing Time: ${timing.totalSeconds}s (Transcription: ${timing.transcriptionSeconds}s, Summarization: ${timing.summarizationSeconds}s)` : ''}

═══════════════════════════════════════════════════════════════

${summaryMarkdown || 'No summary available'}

═══════════════════════════════════════════════════════════════

FULL TRANSCRIPT:
${transcript || 'No transcript available'}
    `;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(summaryText));
    element.setAttribute('download', `summary-${summaryJSON?.title || meetingName}-${Date.now()}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const downloadMarkdown = () => {
    const markdownContent = `# ${summaryJSON?.title || meetingName || 'Meeting Summary'}

**Generated:** ${new Date().toLocaleString()}  
${timing ? `**Processing Time:** ${timing.totalSeconds}s` : ''}

---

${summaryMarkdown || 'No summary available'}

---

## Full Transcript

${transcript || 'No transcript available'}
`;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/markdown;charset=utf-8,' + encodeURIComponent(markdownContent));
    element.setAttribute('download', `summary-${summaryJSON?.title || meetingName}-${Date.now()}.md`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const renderArraySection = (title, items, icon, emptyMessage = 'No items recorded') => {
    if (!items || items.length === 0) return null;

    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{icon}</span>
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        </div>
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-3 text-gray-700">
              <span className="text-blue-600 font-bold flex-shrink-0 mt-1">•</span>
              <span className="text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderTopics = () => {
    if (!summaryJSON?.topics || summaryJSON.topics.length === 0) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <span>📌</span> Discussion Topics
        </h3>
        {summaryJSON.topics.map((topic, index) => (
          <div key={index} className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">{topic.title}</h4>
            <p className="text-gray-700 text-sm mb-4">{topic.summary}</p>
            {topic.action_items && topic.action_items.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-800 mb-2">Action Items:</p>
                <ul className="space-y-1">
                  {topic.action_items.map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
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
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Success Banner */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-lg p-8 text-white">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <FiCheckCircle className="text-3xl" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">Summary Complete! ✨</h2>
            <p className="text-green-100 text-sm mt-1">
              Your meeting has been successfully processed and analyzed
            </p>
          </div>
          {timing && (
            <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2 text-center">
              <FiClock className="text-lg mx-auto mb-1" />
              <p className="text-xs font-semibold">{timing.totalSeconds}s</p>
            </div>
          )}
        </div>
      </div>

      {/* Meeting Header */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {summaryJSON?.title || meetingName || 'Meeting Summary'}
            </h1>
            <p className="text-gray-500 text-sm">
              📅 {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </p>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('structured')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                viewMode === 'structured'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Structured
            </button>
            <button
              onClick={() => setViewMode('markdown')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                viewMode === 'markdown'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Markdown
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-3">
          {summaryJSON?.tone && (
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
              Tone: {summaryJSON.tone}
            </span>
          )}
          {summaryJSON?.participants && summaryJSON.participants.length > 0 && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
              👥 {summaryJSON.participants.length} Participant{summaryJSON.participants.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Summary Content */}
      {viewMode === 'structured' ? (
        <div className="space-y-6">
          {/* Overall Summary */}
          {summaryJSON?.overall_summary && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>📝</span> Overview
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">{summaryJSON.overall_summary}</p>
            </div>
          )}

          {/* Participants */}
          {/* {summaryJSON?.participants && summaryJSON.participants.length > 0 && (
            <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span>👥</span> Participants
              </h3>
              <div className="flex flex-wrap gap-2">
                {summaryJSON.participants.map((participant, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {participant}
                  </span>
                ))}
              </div>
            </div>
          )} */}

          {/* Topics */}
          {renderTopics()}

          {/* Key Decisions */}
          {renderArraySection(
            'Key Decisions',
            summaryJSON?.key_decisions,
            '✅',
            'No decisions recorded'
          )}

          {/* Next Steps */}
          {renderArraySection(
            'Next Steps',
            summaryJSON?.next_steps,
            '🚀',
            'No next steps recorded'
          )}
        </div>
      ) : (
        /* Markdown View */
        <div className="bg-black rounded-2xl shadow-lg p-8">
        <div className="prose prose-gray max-w-none prose-headings:text-gray-800 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
          <ReactMarkdown>{summaryMarkdown || 'No markdown summary available'}</ReactMarkdown>
        </div>
      </div>
      
      )}

      {/* Transcript Section (Collapsible) */}
      {transcript && (
        <details className="bg-white rounded-2xl shadow-lg p-6">
          <summary className="text-lg font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors">
            📄 Full Transcript (Click to expand)
          </summary>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{transcript}</p>
          </div>
        </details>
      )}

      {/* Actions */}
      <div className="bg-white rounded-2xl shadow-lg p-6 flex gap-4">
        <button
          onClick={() => setCurrentView('history')}
          className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <FiArrowLeft className="text-lg" />
          View History
        </button>
        <button
          onClick={downloadMarkdown}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <FiDownload className="text-lg" />
          Download MD
        </button>
        <button
          onClick={downloadSummary}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
        >
          <FiDownload className="text-lg" />
          Download TXT
        </button>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
        >
          ✨ New Summary
        </button>
      </div>
    </div>
  );
}

export default SummaryView;